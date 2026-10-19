import { motion, useMotionValue, useTransform } from "motion/react";
import type { Task } from "@shared/types";
import { STATUS_COLOR, STATUS_LABEL, nextStatus, prevStatus } from "../lib/status";
import { haptic } from "../lib/haptics";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, TrashIcon } from "./icons";

const THRESHOLD = 88;
const VELOCITY = 650;

export function TaskCard({
  task,
  onSwipeRight,
  onSwipeLeft,
  onTap,
}: {
  task: Task;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onTap: () => void;
}) {
  const x = useMotionValue(0);
  const rightOpacity = useTransform(x, [0, THRESHOLD], [0, 1]);
  const leftOpacity = useTransform(x, [-THRESHOLD, 0], [1, 0]);
  const rightScale = useTransform(x, [0, THRESHOLD], [0.6, 1]);
  const leftScale = useTransform(x, [-THRESHOLD, 0], [1, 0.6]);
  const rotate = useTransform(x, [-200, 200], [-2, 2]);

  const next = nextStatus(task.status);
  const prev = prevStatus(task.status);
  const rightColor = next ? STATUS_COLOR[next] : "var(--color-ink-3)";
  const leftColor = prev ? STATUS_COLOR[prev] : "var(--color-danger)";

  return (
    <div className="relative" data-testid="task-card" data-task-id={task.id} data-status={task.status}>
      <div className="absolute inset-0 flex items-center justify-between rounded-[22px] px-5">
        <motion.div
          className="flex items-center gap-2 text-[13px] font-semibold"
          style={{ opacity: rightOpacity, scale: rightScale, color: rightColor }}
        >
          {next ? <ArrowRightIcon width={18} height={18} /> : <CheckIcon width={18} height={18} />}
          {next ? STATUS_LABEL[next] : STATUS_LABEL.done}
        </motion.div>
        <motion.div
          className="flex items-center gap-2 text-[13px] font-semibold"
          style={{ opacity: leftOpacity, scale: leftScale, color: leftColor }}
        >
          {prev ? STATUS_LABEL[prev] : "削除"}
          {prev ? <ArrowLeftIcon width={18} height={18} /> : <TrashIcon width={18} height={18} />}
        </motion.div>
      </div>

      <motion.div
        className="glass relative flex cursor-grab items-start gap-3 p-4 active:cursor-grabbing"
        style={{ x, rotate, touchAction: "pan-y" }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        dragSnapToOrigin
        dragTransition={{ bounceStiffness: 500, bounceDamping: 32 }}
        whileTap={{ scale: 0.985 }}
        onDragStart={() => haptic(4)}
        onDragEnd={(_, info) => {
          const dx = info.offset.x;
          const vx = info.velocity.x;
          if (dx > THRESHOLD || vx > VELOCITY) {
            haptic([8, 30, 12]);
            onSwipeRight();
          } else if (dx < -THRESHOLD || vx < -VELOCITY) {
            haptic([8, 30, 12]);
            onSwipeLeft();
          }
        }}
        onClick={() => {
          if (Math.abs(x.get()) < 4) onTap();
        }}
      >
        <span
          className="mt-[7px] block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: STATUS_COLOR[task.status], boxShadow: `0 0 0 4px color-mix(in srgb, ${STATUS_COLOR[task.status]} 18%, transparent)` }}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-[15px] leading-snug break-words ${task.status === "done" ? "text-ink-3 line-through decoration-ink-3/60" : "text-ink"}`}
            data-testid="task-title"
          >
            {task.title}
          </p>
          {task.note && (
            <p className="mt-1 line-clamp-2 whitespace-pre-line text-[12.5px] leading-snug text-ink-2">{task.note}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
