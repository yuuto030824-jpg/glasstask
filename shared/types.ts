/** Shared API contract between the Worker (backend) and the React app (frontend). */

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  note: string;
  status: TaskStatus;
  /** Sort key within a status column. Higher = shown first. */
  position: number;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  completedAt: number | null; // epoch ms
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

// ---- Requests / responses -------------------------------------------------

export interface MeResponse {
  user: User | null;
  /** true when the server allows POST /api/auth/dev (local/testing only) */
  devLogin: boolean;
  /** true when Google OAuth is configured on the server */
  googleEnabled: boolean;
}

export interface TasksResponse {
  tasks: Task[];
}

export interface CreateTaskRequest {
  /** Client-generated id (UUID) so optimistic UI and server agree. Optional. */
  id?: string;
  title: string;
  note?: string;
  status?: TaskStatus;
}

export interface UpdateTaskRequest {
  title?: string;
  note?: string;
  status?: TaskStatus;
  position?: number;
}

export interface ImportTasksRequest {
  tasks: Task[];
}

export interface ImportTasksResponse {
  imported: number;
  tasks: Task[];
}

export interface AiSuggestRequest {
  /** Raw memo text typed by the user */
  text: string;
}

export interface AiSuggestResponse {
  /** A cleaned-up, actionable task title */
  title: string;
  /** 0-4 concrete next steps */
  steps: string[];
  /** "ai" when Workers AI produced it, "fallback" when heuristics were used */
  source: "ai" | "fallback";
}

export interface ApiError {
  error: string;
}
