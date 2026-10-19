import { motion } from "motion/react";
import type { AiSuggestResponse } from "@shared/types";
import { Sheet } from "./Sheet";
import { CheckIcon, SparkIcon } from "./icons";

export type AiResult = AiSuggestResponse & { sourceText: string; taskId?: string };

export function AiSheet({
  result,
  onClose,
  onApply,
}: {
  result: AiResult | null;
  onClose: () => void;
  onApply: (r: AiResult) => void;
}) {
  return (
    <Sheet open={!!result} onClose={onClose} testId="ai-sheet">
      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-ink-2">
            <SparkIcon width={14} height={14} />
            <span data-testid="ai-source">{result.source === "ai" ? "Workers AI" : "オフライン"}</span>
          </div>
          <motion.p
            data-testid="ai-title"
            className="text-[18px] font-semibold leading-snug"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {result.title}
          </motion.p>
          {result.steps.length > 0 && (
            <ul className="flex flex-col gap-2">
              {result.steps.map((s, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-2 text-[14px] text-ink-2"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.06 }}
                >
                  <span className="mt-[3px] block h-4 w-4 shrink-0 rounded-full border border-ink-3/60" />
                  {s}
                </motion.li>
              ))}
            </ul>
          )}
          <motion.button
            type="button"
            data-testid="ai-apply"
            onClick={() => onApply(result)}
            className="flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #6d8cff, #a78bfa)" }}
            whileTap={{ scale: 0.96 }}
          >
            <CheckIcon width={18} height={18} /> 適用
          </motion.button>
        </div>
      )}
    </Sheet>
  );
}
