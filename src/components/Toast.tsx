import { AnimatePresence, motion } from "motion/react";

export type ToastState = { id: number; message: string; actionLabel?: string; onAction?: () => void } | null;

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 safe-bottom">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            data-testid="toast"
            className="glass glass-strong pointer-events-auto flex items-center gap-3 !rounded-full py-2.5 pl-4 pr-2 text-[14px]"
            initial={{ y: 24, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <motion.button
                type="button"
                data-testid="toast-action"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss();
                }}
                className="rounded-full bg-black/[0.06] px-3 py-1 text-[13px] font-semibold text-todo"
                whileTap={{ scale: 0.92 }}
              >
                {toast.actionLabel}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
