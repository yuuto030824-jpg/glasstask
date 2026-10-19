import type { Task, TaskStatus, User } from "../shared/types";

export interface UserRow {
  id: string;
  google_sub: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: number;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  note: string;
  status: TaskStatus;
  position: number;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

export function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, picture: row.picture };
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    status: row.status,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export async function upsertUser(
  db: D1Database,
  input: { googleSub: string; email: string; name: string; picture: string | null },
): Promise<User> {
  const row = await db
    .prepare(
      `INSERT INTO users (id, google_sub, email, name, picture, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture
       RETURNING *`,
    )
    .bind(crypto.randomUUID(), input.googleSub, input.email, input.name, input.picture, Date.now())
    .first<UserRow>();
  if (!row) throw new Error("user upsert returned no row");
  return toUser(row);
}

export async function listTasks(db: D1Database, userId: string): Promise<Task[]> {
  const { results } = await db
    .prepare("SELECT * FROM tasks WHERE user_id = ?1 ORDER BY position DESC")
    .bind(userId)
    .all<TaskRow>();
  return results.map(toTask);
}

export async function getTask(db: D1Database, userId: string, id: string): Promise<Task | null> {
  const row = await db
    .prepare("SELECT * FROM tasks WHERE id = ?1 AND user_id = ?2")
    .bind(id, userId)
    .first<TaskRow>();
  return row ? toTask(row) : null;
}

export function insertTaskStatement(db: D1Database, userId: string, task: Task, orIgnore = false): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO tasks (id, user_id, title, note, status, position, created_at, updated_at, completed_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)${orIgnore ? " ON CONFLICT(id) DO NOTHING" : ""}`,
    )
    .bind(
      task.id,
      userId,
      task.title,
      task.note,
      task.status,
      task.position,
      task.createdAt,
      task.updatedAt,
      task.completedAt,
    );
}
