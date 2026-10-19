import { motion } from "motion/react";
import type { User } from "@shared/types";
import { Sheet } from "./Sheet";
import { GoogleIcon, UserIcon } from "./icons";

export function AccountSheet({
  open,
  user,
  googleEnabled,
  devLogin,
  onClose,
  onGoogle,
  onDev,
  onLogout,
}: {
  open: boolean;
  user: User | null;
  googleEnabled: boolean;
  devLogin: boolean;
  onClose: () => void;
  onGoogle: () => void;
  onDev: () => void;
  onLogout: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} testId="account-sheet">
      {user ? (
        <div className="flex flex-col items-center gap-4 pb-2">
          <div className="glass flex h-16 w-16 items-center justify-center overflow-hidden !rounded-full text-ink-2">
            {user.picture ? <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <UserIcon width={28} height={28} />}
          </div>
          <div className="text-center">
            <p className="text-[16px] font-semibold" data-testid="account-name">{user.name}</p>
            <p className="text-[13px] text-ink-2" data-testid="account-email">{user.email}</p>
          </div>
          <motion.button
            type="button"
            data-testid="logout-button"
            onClick={onLogout}
            className="mt-2 h-12 w-full rounded-full bg-black/[0.05] text-[15px] font-medium text-ink"
            whileTap={{ scale: 0.97 }}
          >
            ログアウト
          </motion.button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-2">
          <motion.button
            type="button"
            data-testid="google-login"
            disabled={!googleEnabled}
            onClick={onGoogle}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-medium text-ink shadow-[0_2px_10px_rgba(20,30,60,.08)] disabled:opacity-50"
            whileTap={{ scale: 0.97 }}
          >
            <GoogleIcon /> Google でログイン
          </motion.button>
          {devLogin && (
            <motion.button
              type="button"
              data-testid="dev-login"
              onClick={onDev}
              className="h-12 w-full rounded-full bg-black/[0.05] text-[15px] font-medium text-ink-2"
              whileTap={{ scale: 0.97 }}
            >
              開発用ログイン
            </motion.button>
          )}
        </div>
      )}
    </Sheet>
  );
}
