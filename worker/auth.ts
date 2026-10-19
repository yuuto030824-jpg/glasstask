import { Hono, type Context, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Google, decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import type { MeResponse, User } from "../shared/types";
import type { Env } from "./index";
import { toUser, upsertUser, type UserRow } from "./db";

export type Variables = { user: User };
export type AppEnv = { Bindings: Env; Variables: Variables };

const SESSION_COOKIE = "gt_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_COOKIE = "gt_oauth_state";
const OAUTH_VERIFIER_COOKIE = "gt_oauth_verifier";
const OAUTH_TTL_SEC = 10 * 60;

type AnyContext = Context<AppEnv>;

function isSecure(c: AnyContext): boolean {
  return new URL(c.req.url).protocol === "https:";
}

function cookieBase(c: AnyContext) {
  return { httpOnly: true, sameSite: "Lax" as const, path: "/", secure: isSecure(c) };
}

export async function createSession(c: AnyContext, userId: string): Promise<void> {
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)")
    .bind(id, userId, Date.now() + SESSION_TTL_MS)
    .run();
  setCookie(c, SESSION_COOKIE, id, { ...cookieBase(c), maxAge: SESSION_TTL_MS / 1000 });
}

export async function getSessionUser(c: AnyContext): Promise<User | null> {
  const sid = getCookie(c, SESSION_COOKIE);
  if (!sid) return null;
  const row = await c.env.DB.prepare(
    `SELECT u.*, s.expires_at AS session_expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ?1`,
  )
    .bind(sid)
    .first<UserRow & { session_expires_at: number }>();
  if (!row) return null;
  if (row.session_expires_at <= Date.now()) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?1").bind(sid).run();
    return null;
  }
  return toUser(row);
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  c.set("user", user);
  await next();
};

function googleClient(c: AnyContext): Google | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  const redirect = `${new URL(c.req.url).origin}/api/auth/google/callback`;
  return new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirect);
}

interface GoogleClaims {
  sub?: unknown;
  email?: unknown;
  name?: unknown;
  picture?: unknown;
}

export const authRoutes = new Hono<AppEnv>();

authRoutes.get("/me", async (c) => {
  const body: MeResponse = {
    user: await getSessionUser(c),
    devLogin: c.env.DEV_LOGIN === "true",
    googleEnabled: !!(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
  };
  return c.json(body);
});

authRoutes.get("/auth/google", (c) => {
  const google = googleClient(c);
  if (!google) return c.json({ error: "google_not_configured" }, 503);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const opts = { ...cookieBase(c), maxAge: OAUTH_TTL_SEC };
  setCookie(c, OAUTH_STATE_COOKIE, state, opts);
  setCookie(c, OAUTH_VERIFIER_COOKIE, codeVerifier, opts);
  return c.redirect(google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]).toString());
});

authRoutes.get("/auth/google/callback", async (c) => {
  const fail = () => c.redirect("/?auth_error=1", 302);
  const google = googleClient(c);
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, OAUTH_STATE_COOKIE);
  const codeVerifier = getCookie(c, OAUTH_VERIFIER_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });
  deleteCookie(c, OAUTH_VERIFIER_COOKIE, { path: "/" });
  if (!google || !code || !state || !storedState || !codeVerifier || state !== storedState) return fail();
  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
    if (typeof claims.sub !== "string" || typeof claims.email !== "string") return fail();
    const user = await upsertUser(c.env.DB, {
      googleSub: claims.sub,
      email: claims.email,
      name: typeof claims.name === "string" ? claims.name : "",
      picture: typeof claims.picture === "string" ? claims.picture : null,
    });
    await createSession(c, user.id);
    return c.redirect("/", 302);
  } catch (err) {
    console.error("google callback failed", err);
    return fail();
  }
});

authRoutes.post("/auth/dev", async (c) => {
  if (c.env.DEV_LOGIN !== "true") return c.json({ error: "not_found" }, 404);
  const user = await upsertUser(c.env.DB, {
    googleSub: "dev-user",
    email: "dev@example.com",
    name: "Dev User",
    picture: null,
  });
  await createSession(c, user.id);
  return c.json({ user });
});

authRoutes.post("/auth/logout", async (c) => {
  const sid = getCookie(c, SESSION_COOKIE);
  if (sid) await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?1").bind(sid).run();
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});
