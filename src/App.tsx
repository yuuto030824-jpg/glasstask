import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Task, TaskStatus } from "@shared/types";
import { Ambient } from "./components/Ambient";
import { AccountSheet } from "./components/AccountSheet";
import { AiSheet, type AiResult } from "./components/AiSheet";
import { Composer } from "./components/Composer";
import { Header } from "./components/Header";
import { Skeleton } from "./components/Skeleton";
import { StatusTabs } from "./components/StatusTabs";
import { TaskList } from "./components/TaskList";
import { TaskSheet } from "./components/TaskSheet";
import { Toast, type ToastState } from "./components/Toast";
import { useAuth } from "./hooks/useAuth";
import { useTasks } from "./hooks/useTasks";
import { api } from "./lib/api";
import { nextStatus, prevStatus, STATUS_LABEL } from "./lib/status";

const MIN_SKELETON_MS = 650;

export default function App() {
  const auth = useAuth();
  const store = useTasks();
  const [tab, setTab] = useState<TaskStatus>("todo");
  const [minElapsed, setMinElapsed] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<number | null>(null);
  const connectedFor = useRef<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SKELETON_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (auth.status !== "ready") return;
    const uid = auth.user?.id ?? null;
    if (uid && connectedFor.current !== uid) {
      connectedFor.current = uid;
      store.connectCloud().catch(() => undefined).finally(() => setDataReady(true));
    } else if (!uid) {
      connectedFor.current = null;
      setDataReady(true);
    }
  }, [auth.status, auth.user?.id, store.connectCloud]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = minElapsed && dataReady;

  const showToast = useCallback((t: NonNullable<ToastState>) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const counts = useMemo(() => {
    const c: Record<TaskStatus, number> = { todo: 0, doing: 0, done: 0 };
    for (const t of store.tasks) c[t.status]++;
    return c;
  }, [store.tasks]);

  const visible = useMemo(() => store.tasks.filter((t) => t.status === tab), [store.tasks, tab]);

  const liveOpenTask = useMemo(
    () => (openTask ? store.tasks.find((t) => t.id === openTask.id) ?? null : null),
    [openTask, store.tasks],
  );

  const handleSwipeRight = (task: Task) => {
    const next = nextStatus(task.status);
    if (next) void store.update(task.id, { status: next });
  };

  const deleteWithUndo = async (task: Task) => {
    const removed = await store.remove(task.id);
    if (removed) {
      showToast({ id: Date.now(), message: "削除しました", actionLabel: "元に戻す", onAction: () => void store.restore(removed) });
    }
  };

  const handleSwipeLeft = (task: Task) => {
    const prev = prevStatus(task.status);
    if (prev) void store.update(task.id, { status: prev });
    else void deleteWithUndo(task);
  };

  const requireUser = () => {
    if (auth.user) return true;
    setAccountOpen(true);
    return false;
  };

  const runAi = async (text: string, taskId?: string) => {
    if (!requireUser()) return;
    setAiBusy(true);
    try {
      const r = await api.aiSuggest({ text });
      setAiResult({ ...r, sourceText: text, taskId });
    } catch {
      showToast({ id: Date.now(), message: "AI を利用できません" });
    } finally {
      setAiBusy(false);
    }
  };

  const applyAi = async (r: AiResult) => {
    const note = r.steps.map((s) => `• ${s}`).join("\n");
    if (r.taskId) {
      await store.update(r.taskId, { title: r.title, note });
    } else {
      const created = await store.add(r.title);
      if (created && note) await store.update(created.id, { note });
    }
    setAiResult(null);
    setOpenTask(null);
  };

  const handleLogout = async () => {
    await auth.logout();
    store.disconnectCloud();
    setAccountOpen(false);
    showToast({ id: Date.now(), message: "ログアウトしました" });
  };

  return (
    <LayoutGroup>
      <Ambient />
      <div className="relative z-10 flex min-h-full flex-col" data-testid="app" data-ready={ready}>
        <AnimatePresence>{!ready && <Skeleton key="skeleton" />}</AnimatePresence>

        <motion.main
          className="flex flex-1 flex-col"
          initial={false}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 8 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ pointerEvents: ready ? "auto" : "none" }}
          aria-hidden={!ready}
        >
          <Header user={auth.user} syncing={store.syncing} onAccount={() => setAccountOpen(true)} />
          <StatusTabs value={tab} counts={counts} onChange={setTab} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <TaskList
                tasks={visible}
                status={tab}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onOpen={setOpenTask}
              />
            </motion.div>
          </AnimatePresence>
        </motion.main>

        <Composer
          onSubmit={(title) => {
            void store.add(title, tab === "done" ? "todo" : tab);
            if (tab === "done") {
              setTab("todo");
              showToast({ id: Date.now(), message: `${STATUS_LABEL.todo} に追加` });
            }
          }}
          onAi={(text) => void runAi(text)}
          aiBusy={aiBusy}
        />

        <TaskSheet
          task={liveOpenTask}
          onClose={() => setOpenTask(null)}
          onUpdate={(id, patch) => void store.update(id, patch)}
          onDelete={(t) => {
            setOpenTask(null);
            void deleteWithUndo(t);
          }}
          onAi={(t) => void runAi(t.title, t.id)}
          aiBusy={aiBusy}
        />

        <AiSheet result={aiResult} onClose={() => setAiResult(null)} onApply={(r) => void applyAi(r)} />

        <AccountSheet
          open={accountOpen}
          user={auth.user}
          googleEnabled={auth.googleEnabled}
          devLogin={auth.devLogin}
          onClose={() => setAccountOpen(false)}
          onGoogle={auth.loginGoogle}
          onDev={() => {
            void auth.loginDev().then(() => setAccountOpen(false));
          }}
          onLogout={() => void handleLogout()}
        />

        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    </LayoutGroup>
  );
}
