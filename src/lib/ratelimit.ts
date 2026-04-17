import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

// Simple token-bucket style limiter using KV. Good enough for admin API.
// For redirect path, skip — we don't want latency there.
export function rateLimit(opts: { max: number; windowSec: number; key?: (req: Request) => string }) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const ident = opts.key
      ? opts.key(c.req.raw)
      : c.req.header("cf-connecting-ip") ?? "anon";
    const bucket = `rl:${ident}:${Math.floor(Date.now() / 1000 / opts.windowSec)}`;
    const current = parseInt((await c.env.CLICKS.get(bucket)) ?? "0");
    if (current >= opts.max) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
    c.executionCtx.waitUntil(
      c.env.CLICKS.put(bucket, String(current + 1), { expirationTtl: opts.windowSec * 2 })
    );
    await next();
  });
}
