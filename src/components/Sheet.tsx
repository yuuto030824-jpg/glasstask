import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  children,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-[rgba(20,30,60,0.18)]"
            style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="sheet-backdrop"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            data-testid={testId}
            className="glass glass-strong fixed inset-x-2 bottom-2 z-50 !rounded-[28px] p-5 safe-bottom"
            initial={{ y: "110%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "110%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onClose();
            }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/10" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
