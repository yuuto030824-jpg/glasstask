import { motion } from "motion/react";
import type { User } from "@shared/types";
import { UserIcon } from "./icons";

export function Header({ user, syncing, onAccount }: { user: User | null; syncing: boolean; onAccount: () => void }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 safe-top">
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="text-[17px] font-semibold tracking-tight text-ink">GlassTask</span>
        <motion.span
          className="block h-2 w-2 rounded-full"
          animate={{
            backgroundColor: user ? "#3ec28f" : "#c5c9d6",
            scale: syncing ? [1, 1.5, 1] : 1,
          }}
          transition={syncing ? { repeat: Infinity, duration: 0.9 } : { duration: 0.3 }}
          data-testid="sync-dot"
          data-mode={user ? "cloud" : "guest"}
        />
      </motion.div>
      <motion.button
        type="button"
        aria-label="account"
        data-testid="account-button"
        onClick={onAccount}
        className="glass glass-pill flex h-10 w-10 items-center justify-center overflow-hidden text-ink-2"
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {user?.picture ? (
          <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <UserIcon />
        )}
      </motion.button>
    </header>
  );
}
