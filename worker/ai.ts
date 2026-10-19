import { Hono } from "hono";
import type { AiSuggestRequest, AiSuggestResponse } from "../shared/types";
import { type AppEnv, requireAuth } from "./auth";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const TIMEOUT_MS = 8000;
const MAX_TEXT = 1000;
const MAX_TITLE = 40;
const MAX_STEP = 30;
const MAX_STEPS = 4;

const SYSTEM_PROMPT = [
  "You turn a user's rough memo into a task.",
  "Reply with JSON only: {\"title\": string, \"steps\": string[]}.",
  `"title": a concise, actionable task title, at most ${MAX_TITLE} characters, in the SAME language as the memo (Japanese memo -> Japanese title).`,
  `"steps": 0 to ${MAX_STEPS} concrete next steps, each at most ${MAX_STEP} characters, same language as the memo. Use [] if none are useful.`,
].join("\n");

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    steps: { type: "array", items: { type: "string" }, maxItems: MAX_STEPS },
  },
  required: ["title", "steps"],
};

function fallback(text: string): AiSuggestResponse {
  return { title: text.trim().replace(/\s+/g, " ").slice(0, 60), steps: [], source: "fallback" };
}

function stripFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

function parseSuggestion(raw: unknown): { title: string; steps: string[] } | null {
  let payload: unknown = raw;
  if (payload && typeof payload === "object" && "response" in payload) {
    payload = (payload as { response: unknown }).response;
  }
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(stripFences(payload));
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object") return null;
  const { title, steps } = payload as { title?: unknown; steps?: unknown };
  if (typeof title !== "string") return null;
  const cleanTitle = title.trim().replace(/\s+/g, " ").slice(0, MAX_TITLE);
  if (!cleanTitle) return null;
  const cleanSteps = Array.isArray(steps)
    ? steps
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim().replace(/\s+/g, " ").slice(0, MAX_STEP))
        .filter((s) => s.length > 0)
        .slice(0, MAX_STEPS)
    : [];
  return { title: cleanTitle, steps: cleanSteps };
}

async function suggest(ai: Ai, text: string): Promise<{ title: string; steps: string[] } | null> {
  const input = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
    max_tokens: 256,
  };
  const run = (ai as unknown as { run(model: string, input: Record<string, unknown>): Promise<unknown> }).run(
    MODEL,
    input,
  );
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("ai timeout")), TIMEOUT_MS),
  );
  return parseSuggestion(await Promise.race([run, timeout]));
}

export const aiRoutes = new Hono<AppEnv>();
aiRoutes.use("*", requireAuth);

aiRoutes.post("/suggest", async (c) => {
  let input: Partial<AiSuggestRequest> | null = null;
  try {
    input = (await c.req.json()) as Partial<AiSuggestRequest>;
  } catch {
    input = null;
  }
  const text = typeof input?.text === "string" ? input.text : "";
  if (!text.trim() || text.length > MAX_TEXT) return c.json({ error: "invalid_text" }, 400);

  if (!c.env.AI) return c.json(fallback(text));
  try {
    const result = await suggest(c.env.AI, text);
    if (!result) return c.json(fallback(text));
    const body: AiSuggestResponse = { ...result, source: "ai" };
    return c.json(body);
  } catch (err) {
    console.warn("ai suggest failed", err instanceof Error ? err.message : err);
    return c.json(fallback(text));
  }
});
