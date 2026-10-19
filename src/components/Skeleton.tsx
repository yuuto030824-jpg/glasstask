import { motion } from "motion/react";

export function Skeleton() {
  return (
    <motion.div
      data-testid="skeleton"
      className="fixed inset-0 z-20 flex flex-col px-4 safe-top"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-busy="true"
      aria-label="loading"
    >
      <div className="flex items-center justify-between py-3">
        <div className="skel h-7 w-28" />
        <div className="skel h-10 w-10 !rounded-full" />
      </div>
      <div className="glass mt-2 flex gap-1 p-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skel h-9 flex-1 !rounded-2xl" />
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="glass p-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1 - i * 0.12, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="skel h-4" style={{ width: `${78 - (i % 3) * 18}%` }} />
            <div className="skel mt-3 h-3 w-24" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
