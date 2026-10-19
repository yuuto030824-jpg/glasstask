import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TASK_STATUSES, type Task, type TaskStatus } from "@shared/types";
import { STATUS_COLOR, STATUS_LABEL } from "../lib/status";
import { haptic } from "../lib/haptics";
import { Sheet } from "./Sheet";
import { SparkIcon, TrashIcon } from "./icons";

const COMMIT_DEBOUNCE_MS = 400;

export function TaskSheet({
  task,
  onClose,
  onUpdate,
  onDelete,
  onAi,
  aiBusy,
}: {
  task: Task | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Pick<Task, "title" | "note" | "status">>) => void;
  onDelete: (task: Task) => void;
  onAi: (task: Task) => void;
  aiBusy: boolean;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const draft = useRef({ title: "", note: "" });
  const timer = useRef<number | null>(null);

  // Local state is the source of truth while the sheet is open; reset only when another task opens.
  useEffect(() => {
    if (task) {
      draft.current = { title: task.title, note: task.note };
      setTitle(task.title);
      setNote(task.note);
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (!task) return;
    const t = draft.current.title.trim();
    const patch: Partial<Pick<Task, "title" | "note">> = {};
    if (t && t !== task.title) patch.title = t;
    if (draft.current.note !== task.note) patch.note = draft.current.note;
    if (Object.keys(patch).length) onUpdate(task.id, patch);
  }, [task, onUpdate]);

  const schedule = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, COMMIT_DEBOUNCE_MS);
  };

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const close = () => {
    flush();
    onClose();
  };

  const setStatus = (s: TaskStatus) => {
    if (!task || s === task.status) return;
    haptic(8);
    flush();
    onUpdate(task.id, { status: s });
  };

  return (
    <Sheet open={!!task} onClose={close} testId="task-sheet">
      {task && (
        <div className="flex flex-col gap-4">
          <input
            data-testid="sheet-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              draft.current.title = e.target.value;
              schedule();
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            className="w-full bg-transparent text-[18px] font-semibold leading-snug outline-none"
            aria-label="title"
          />
          <div className="flex gap-1.5" role="radiogroup" aria-label="status">
            {TASK_STATUSES.map((s) => {
              const active = s === task.status;
              return (
                <motion.button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`sheet-status-${s}`}
                  onClick={() => setStatus(s)}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium"
                  animate={{
                    backgroundColor: active ? STATUS_COLOR[s] : "rgba(0,0,0,0.045)",
                    color: active ? "#fff" : "#5a6072",
                  }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? "#fff" : STATUS_COLOR[s] }} />
                  {STATUS_LABEL[s]}
                </motion.button>
              );
            })}
          </div>
          <textarea
            data-testid="sheet-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              draft.current.note = e.target.value;
              schedule();
            }}
            rows={4}
            placeholder="ノート"
            aria-label="note"
            className="w-full resize-none rounded-2xl bg-black/[0.035] p-3 text-[14px] leading-relaxed outline-none"
          />
          <div className="flex items-center justify-between pt-1">
            <motion.button
              type="button"
              data-testid="sheet-delete"
              onClick={() => onDelete(task)}
              className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-danger"
              style={{ background: "color-mix(in srgb, var(--color-danger) 10%, transparent)" }}
              whileTap={{ scale: 0.94 }}
            >
              <TrashIcon width={16} height={16} /> 削除
            </motion.button>
            <motion.button
              type="button"
              data-testid="sheet-ai"
              disabled={aiBusy}
              onClick={() => {
                flush();
                onAi({ ...task, title: draft.current.title.trim() || task.title });
              }}
              className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #6d8cff, #a78bfa)" }}
              whileTap={{ scale: 0.94 }}
            >
              <motion.span animate={aiBusy ? { rotate: 360 } : { rotate: 0 }} transition={aiBusy ? { repeat: Infinity, duration: 1.2, ease: "linear" } : {}}>
                <SparkIcon width={16} height={16} />
              </motion.span>
              AI
            </motion.button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
