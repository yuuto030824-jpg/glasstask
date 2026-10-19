import type { Task } from "@shared/types";

const KEY = "glasstask:guest-tasks:v1";

export function loadGuestTasks(): Task[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveGuestTasks(tasks: Task[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  } catch {
    /* storage unavailable */
  }
}

export function clearGuestTasks() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
