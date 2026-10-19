import { motion } from "motion/react";
import { TASK_STATUSES, type TaskStatus } from "@shared/types";
import { STATUS_COLOR, STATUS_LABEL } from "../lib/status";
import { haptic } from "../lib/haptics";

export function StatusTabs({
  value,
  counts,
  onChange,
}: {
  value: TaskStatus;
  counts: Record<TaskStatus, number>;
  onChange: (s: TaskStatus) => void;
}) {
  return (
    <div className="glass mx-4 flex gap-1 p-1" role="tablist" data-testid="status-tabs">
      {TASK_STATUSES.map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            role="tab"
            aria-selected={active}
            data-testid={`tab-${s}`}
            onClick={() => {
              if (!active) haptic(6);
              onChange(s);
            }}
            className="relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[14px] font-medium"
            style={{ color: active ? "var(--color-ink)" : "var(--color-ink-2)" }}
          >
            {active && (
              <motion.span
                layoutId="tab-indicator"
                className="glass-strong absolute inset-0 rounded-2xl"
                style={{ boxShadow: "0 2px 10px rgba(20,30,60,.10), inset 0 1px 0 #fff" }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
              {STATUS_LABEL[s]}
              <motion.span
                key={counts[s]}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="min-w-5 rounded-full bg-black/5 px-1.5 text-[11px] tabular-nums text-ink-2"
                data-testid={`count-${s}`}
              >
                {counts[s]}
              </motion.span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
