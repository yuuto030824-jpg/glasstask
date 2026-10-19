import { Hono } from "hono";
import {
  TASK_STATUSES,
  type CreateTaskRequest,
  type ImportTasksRequest,
  type ImportTasksResponse,
  type Task,
  type TaskStatus,
  type TasksResponse,
  type UpdateTaskRequest,
} from "../shared/types";
import { type AppEnv, requireAuth } from "./auth";
import { getTask, insertTaskStatement, listTasks, toTask, type TaskRow } from "./db";

const MAX_TITLE = 500;
const MAX_ID = 64;
const MAX_IMPORT = 500;

function cleanTitle(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 && t.length <= MAX_TITLE ? t : null;
}

function isStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && (TASK_STATUSES as readonly string[]).includes(v);
}

function isId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= MAX_ID;
}

function isNote(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function buildTask(input: CreateTaskRequest): Task | null {
  const title = cleanTitle(input.title);
  if (!title) return null;
  if (input.id !== undefined && !isId(input.id)) return null;
  if (input.status !== undefined && !isStatus(input.status)) return null;
  if (input.note !== undefined && !isNote(input.note)) return null;
  const now = Date.now();
  const status = input.status ?? "todo";
  return {
    id: input.id ?? crypto.randomUUID(),
    title,
    note: input.note ?? "",
    status,
    position: now,
    createdAt: now,
    updatedAt: now,
    completedAt: status === "done" ? now : null,
  };
}

function buildImportedTask(input: Partial<Task>): Task | null {
  const base = buildTask({ id: input.id, title: input.title ?? "", note: input.note, status: input.status });
  if (!base || !isId(input.id)) return null;
  const createdAt = isNumber(input.createdAt) ? input.createdAt : base.createdAt;
  const updatedAt = isNumber(input.updatedAt) ? input.updatedAt : createdAt;
  const completedAt =
    base.status !== "done" ? null : isNumber(input.completedAt) ? input.completedAt : updatedAt;
  return {
    ...base,
    position: isNumber(input.position) ? input.position : base.position,
    createdAt,
    updatedAt,
    completedAt,
  };
}

async function readJson<T>(req: Request): Promise<T | null> {
  try {
    const body = (await req.json()) as unknown;
    return body && typeof body === "object" ? (body as T) : null;
  } catch {
    return null;
  }
}

export const taskRoutes = new Hono<AppEnv>();
taskRoutes.use("*", requireAuth);

taskRoutes.get("/", async (c) => {
  const body: TasksResponse = { tasks: await listTasks(c.env.DB, c.get("user").id) };
  return c.json(body);
});

taskRoutes.post("/", async (c) => {
  const input = await readJson<CreateTaskRequest>(c.req.raw);
  if (!input) return c.json({ error: "invalid_body" }, 400);
  if (!cleanTitle(input.title)) return c.json({ error: "invalid_title" }, 400);
  if (input.id !== undefined && !isId(input.id)) return c.json({ error: "invalid_id" }, 400);
  if (input.status !== undefined && !isStatus(input.status)) return c.json({ error: "invalid_status" }, 400);
  if (input.note !== undefined && !isNote(input.note)) return c.json({ error: "invalid_note" }, 400);
  const task = buildTask(input)!;
  const userId = c.get("user").id;
  const existing = await c.env.DB.prepare("SELECT user_id FROM tasks WHERE id = ?1")
    .bind(task.id)
    .first<{ user_id: string }>();
  if (existing) return c.json({ error: "exists" }, 409);
  await insertTaskStatement(c.env.DB, userId, task).run();
  return c.json({ task }, 201);
});

taskRoutes.post("/import", async (c) => {
  const input = await readJson<ImportTasksRequest>(c.req.raw);
  if (!input || !Array.isArray(input.tasks)) return c.json({ error: "invalid_body" }, 400);
  if (input.tasks.length > MAX_IMPORT) return c.json({ error: "too_many" }, 400);
  const userId = c.get("user").id;
  const db = c.env.DB;
  const valid = input.tasks
    .map((t) => (t && typeof t === "object" ? buildImportedTask(t) : null))
    .filter((t): t is Task => t !== null);
  let imported = 0;
  if (valid.length > 0) {
    const results = await db.batch(valid.map((t) => insertTaskStatement(db, userId, t, true)));
    imported = results.reduce((n, r) => n + (r.meta.changes ?? 0), 0);
  }
  const body: ImportTasksResponse = { imported, tasks: await listTasks(db, userId) };
  return c.json(body);
});

taskRoutes.patch("/:id", async (c) => {
  const input = await readJson<UpdateTaskRequest>(c.req.raw);
  if (!input) return c.json({ error: "invalid_body" }, 400);
  const userId = c.get("user").id;
  const id = c.req.param("id");
  const current = await getTask(c.env.DB, userId, id);
  if (!current) return c.json({ error: "not_found" }, 404);

  const sets: string[] = [];
  const values: unknown[] = [];
  const add = (col: string, v: unknown) => {
    sets.push(`${col} = ?${values.length + 1}`);
    values.push(v);
  };

  if (input.title !== undefined) {
    const title = cleanTitle(input.title);
    if (!title) return c.json({ error: "invalid_title" }, 400);
    add("title", title);
  }
  if (input.note !== undefined) {
    if (!isNote(input.note)) return c.json({ error: "invalid_note" }, 400);
    add("note", input.note);
  }
  if (input.position !== undefined) {
    if (!isNumber(input.position)) return c.json({ error: "invalid_position" }, 400);
    add("position", input.position);
  }
  const now = Date.now();
  if (input.status !== undefined) {
    if (!isStatus(input.status)) return c.json({ error: "invalid_status" }, 400);
    add("status", input.status);
    if (input.status === "done" && current.status !== "done") add("completed_at", now);
    if (input.status !== "done" && current.status === "done") add("completed_at", null);
  }
  add("updated_at", now);
  values.push(id, userId);

  const row = await c.env.DB.prepare(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = ?${values.length - 1} AND user_id = ?${values.length} RETURNING *`,
  )
    .bind(...values)
    .first<TaskRow>();
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({ task: toTask(row) });
});

taskRoutes.delete("/:id", async (c) => {
  const result = await c.env.DB.prepare("DELETE FROM tasks WHERE id = ?1 AND user_id = ?2")
    .bind(c.req.param("id"), c.get("user").id)
    .run();
  if (!result.meta.changes) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});
