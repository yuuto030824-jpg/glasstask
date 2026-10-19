import { useCallback, useEffect, useRef, useState } from "react";
import type { Task, TaskStatus } from "@shared/types";
import { api } from "../lib/api";
import { clearGuestTasks, loadGuestTasks, saveGuestTasks } from "../lib/storage";

export type StoreMode = "guest" | "cloud";

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => b.position - a.position);
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => sortTasks(loadGuestTasks()));
  const [mode, setMode] = useState<StoreMode>("guest");
  const [syncing, setSyncing] = useState(false);
  const modeRef = useRef<StoreMode>("guest");
  const tasksRef = useRef<Task[]>(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
    if (modeRef.current === "guest") saveGuestTasks(tasks);
  }, [tasks]);

  const switchMode = (m: StoreMode) => {
    modeRef.current = m;
    setMode(m);
  };

  /** Called once the user is known to be signed in: upload guest tasks, then load cloud tasks. */
  const connectCloud = useCallback(async () => {
    setSyncing(true);
    try {
      const local = loadGuestTasks();
      if (local.length) {
        await api.importTasks(local);
        clearGuestTasks();
      }
      const { tasks: remote } = await api.listTasks();
      switchMode("cloud");
      setTasks(sortTasks(remote));
    } finally {
      setSyncing(false);
    }
  }, []);

  /** Called after logout: back to an empty guest workspace. */
  const disconnectCloud = useCallback(() => {
    switchMode("guest");
    setTasks([]);
    clearGuestTasks();
  }, []);

  const patchLocal = (id: string, patch: Partial<Task>) =>
    setTasks((prev) => sortTasks(prev.map((t) => (t.id === id ? { ...t, ...patch } : t))));

  const add = useCallback(async (title: string, status: TaskStatus = "todo"): Promise<Task | null> => {
    const clean = title.trim();
    if (!clean) return null;
    const now = Date.now();
    const task: Task = {
      id: crypto.randomUUID(),
      title: clean,
      note: "",
      status,
      position: now,
      createdAt: now,
      updatedAt: now,
      completedAt: status === "done" ? now : null,
    };
    setTasks((prev) => sortTasks([task, ...prev]));
    if (modeRef.current === "cloud") {
      try {
        const { task: saved } = await api.createTask({ id: task.id, title: task.title, status });
        patchLocal(task.id, saved);
      } catch {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        return null;
      }
    }
    return task;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Pick<Task, "title" | "note" | "status">>) => {
    const now = Date.now();
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;
    const next: Partial<Task> = { ...patch, updatedAt: now };
    if (patch.status && patch.status !== current.status) {
      next.completedAt = patch.status === "done" ? now : null;
    }
    patchLocal(id, next);
    if (modeRef.current === "cloud") {
      try {
        const { task: saved } = await api.updateTask(id, patch);
        patchLocal(id, saved);
      } catch {
        patchLocal(id, current);
      }
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<Task | null> => {
    const current = tasksRef.current.find((t) => t.id === id) ?? null;
    if (!current) return null;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (modeRef.current === "cloud") {
      try {
        await api.deleteTask(id);
      } catch {
        setTasks((prev) => sortTasks([current, ...prev]));
        return null;
      }
    }
    return current;
  }, []);

  const restore = useCallback(async (task: Task) => {
    setTasks((prev) => sortTasks([task, ...prev.filter((t) => t.id !== task.id)]));
    if (modeRef.current === "cloud") {
      try {
        await api.createTask({ id: task.id, title: task.title, note: task.note, status: task.status });
      } catch {
        /* keep optimistic copy */
      }
    }
  }, []);

  return { tasks, mode, syncing, add, update, remove, restore, connectCloud, disconnectCloud };
}
