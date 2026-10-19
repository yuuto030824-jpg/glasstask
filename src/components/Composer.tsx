import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { haptic } from "../lib/haptics";
import { PlusIcon, SparkIcon } from "./icons";

export function Composer({
  value,
  onChange,
  onSubmit,
  onAi,
  aiBusy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (title: string) => void;
  onAi: (text: string) => void;
  aiBusy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canSubmit = value.trim().length > 0;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const t = setTimeout(() => el.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, []);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(value);
    onChange("");
    haptic(8);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-30 px-3 safe-bottom"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.05 }}
    >
      <motion.form
        className="glass glass-strong flex items-center gap-2 p-2 pl-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        whileFocus={{ scale: 1.005 }}
        layout
      >
        <input
          ref={inputRef}
          data-testid="composer-input"
          autoFocus
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
          placeholder="メモ"
          aria-label="new task"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
        <motion.button
          type="button"
          aria-label="AI"
          data-testid="ai-button"
          disabled={!canSubmit || aiBusy}
          onClick={() => onAi(value)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 disabled:opacity-30"
          whileTap={{ scale: 0.85, rotate: -12 }}
          animate={aiBusy ? { rotate: 360 } : { rotate: 0 }}
          transition={aiBusy ? { repeat: Infinity, duration: 1.2, ease: "linear" } : { type: "spring", stiffness: 300 }}
        >
          <SparkIcon />
        </motion.button>
        <motion.button
          type="submit"
          aria-label="add"
          data-testid="composer-submit"
          disabled={!canSubmit}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #6d8cff, #a78bfa)", boxShadow: "0 6px 18px -6px rgba(109,140,255,.7)" }}
          animate={{ scale: canSubmit ? 1 : 0.86, opacity: canSubmit ? 1 : 0.55 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
        >
          <PlusIcon />
        </motion.button>
      </motion.form>
    </motion.div>
  );
}
