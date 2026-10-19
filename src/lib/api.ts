import type {
  AiSuggestRequest,
  AiSuggestResponse,
  CreateTaskRequest,
  ImportTasksResponse,
  MeResponse,
  Task,
  TasksResponse,
  UpdateTaskRequest,
  User,
} from "@shared/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) code = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

export const api = {
  me: () => request<MeResponse>("/api/me"),
  devLogin: () => request<{ user: User }>("/api/auth/dev", { method: "POST" }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  listTasks: () => request<TasksResponse>("/api/tasks"),
  createTask: (body: CreateTaskRequest) =>
    request<{ task: Task }>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
  updateTask: (id: string, body: UpdateTaskRequest) =>
    request<{ task: Task }>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteTask: (id: string) =>
    request<{ ok: true }>(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" }),
  importTasks: (tasks: Task[]) =>
    request<ImportTasksResponse>("/api/tasks/import", {
      method: "POST",
      body: JSON.stringify({ tasks }),
    }),
  aiSuggest: (body: AiSuggestRequest) =>
    request<AiSuggestResponse>("/api/ai/suggest", { method: "POST", body: JSON.stringify(body) }),
};
