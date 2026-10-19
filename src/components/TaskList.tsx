import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import type { Task, TaskStatus } from "@shared/types";
import { STATUS_COLOR } from "../lib/status";
import { TaskCard } from "./TaskCard";

export function TaskList({
  tasks,
  status,
  onSwipeRight,
  onSwipeLeft,
  onOpen,
}: {
  tasks: Task[];
  status: TaskStatus;
  onSwipeRight: (task: Task) => void;
  onSwipeLeft: (task: Task) => void;
  onOpen: (task: Task) => void;
}) {
  const exitDir = useRef<Record<string, number>>({});

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-40" data-testid="task-list" data-status={status}>
      <AnimatePresence mode="popLayout" initial={false}>
        {tasks.length === 0 && (
          <motion.div
            key="empty"
            data-testid="empty-state"
            className="mt-16 flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              className="glass flex h-20 w-20 items-center justify-center !rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
            >
              <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLOR[status], opacity: 0.6 }} />
            </motion.div>
          </motion.div>
        )}
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              x: (exitDir.current[task.id] ?? 0) * 140,
              scale: 0.92,
              transition: { duration: 0.22 },
            }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <TaskCard
              task={task}
              onSwipeRight={() => {
                exitDir.current[task.id] = 1;
                onSwipeRight(task);
              }}
              onSwipeLeft={() => {
                exitDir.current[task.id] = -1;
                onSwipeLeft(task);
              }}
              onTap={() => onOpen(task)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
