import { Hono } from "hono";
import type { Env } from "../types";
import { insertClick } from "../lib/db";

export const redirect = new Hono<{ Bindings: Env }>();

redirect.get("/:slug{[^/]+}", async (c) => {
  const slug = c.req.param("slug");
  const target = await c.env.URLS.get(slug);
  if (!target) return c.text("404 - Link not found", 404);

  const req = c.req.raw;
  c.executionCtx.waitUntil(
    insertClick(c.env.DB, {
      slug,
      ts: Date.now(),
      ip: req.headers.get("cf-connecting-ip") ?? "unknown",
      country: (req as Request & { cf?: { country?: string; city?: string } }).cf?.country ?? "unknown",
      city: (req as Request & { cf?: { country?: string; city?: string } }).cf?.city ?? "unknown",
      ua: req.headers.get("user-agent") ?? "unknown",
      referer: req.headers.get("referer") ?? "direct",
    }).catch(() => {})
  );

  return c.redirect(target, 301);
});
