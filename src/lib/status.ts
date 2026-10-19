import { TASK_STATUSES, type TaskStatus } from "@shared/types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  doing: "Doing",
  done: "Done",
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "var(--color-todo)",
  doing: "var(--color-doing)",
  done: "var(--color-done)",
};

export function nextStatus(s: TaskStatus): TaskStatus | null {
  const i = TASK_STATUSES.indexOf(s);
  return i < TASK_STATUSES.length - 1 ? TASK_STATUSES[i + 1] : null;
}

export function prevStatus(s: TaskStatus): TaskStatus | null {
  const i = TASK_STATUSES.indexOf(s);
  return i > 0 ? TASK_STATUSES[i - 1] : null;
}
