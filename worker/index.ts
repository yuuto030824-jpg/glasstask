import { Hono } from "hono";
import { authRoutes } from "./auth";
import { taskRoutes } from "./tasks";
import { aiRoutes } from "./ai";

export interface Env {
  DB: D1Database;
  AI: Ai;
  APP_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DEV_LOGIN?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api", authRoutes);
app.route("/api/tasks", taskRoutes);
app.route("/api/ai", aiRoutes);
app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || "internal_error" }, 500);
});

export default app;
