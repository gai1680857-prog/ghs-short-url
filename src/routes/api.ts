import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types";
import { requireAdmin } from "../lib/auth";
import { rateLimit } from "../lib/ratelimit";
import { countClicks, countsForSlugs, deleteClicks, recentClicks } from "../lib/db";

export const api = new Hono<{ Bindings: Env }>();

api.use("*", requireAdmin);

const createSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "slug: alphanumerics, dash, underscore only"),
  target: z.string().url(),
});

api.post("/create", rateLimit({ max: 30, windowSec: 60 }), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "invalid input" }, 400);

  const { slug, target } = parsed.data;
  const existing = await c.env.URLS.get(slug);
  if (existing) return c.json({ error: "Slug already exists" }, 409);

  await c.env.URLS.put(slug, target);
  return c.json({ success: true, short: `${c.env.DOMAIN}/${slug}`, target });
});

api.get("/list", async (c) => {
  const list = await c.env.URLS.list();
  const slugs = list.keys.map((k) => k.name);
  const [targets, counts] = await Promise.all([
    Promise.all(slugs.map((s) => c.env.URLS.get(s))),
    countsForSlugs(c.env.DB, slugs),
  ]);
  const urls = slugs.map((slug, i) => ({
    slug,
    target: targets[i] ?? "",
    clicks: counts.get(slug) ?? 0,
  }));
  return c.json({ urls });
});

api.get("/stats/:slug", async (c) => {
  const slug = c.req.param("slug");
  const target = await c.env.URLS.get(slug);
  if (!target) return c.json({ error: "Slug not found" }, 404);
  const [totalClicks, recent] = await Promise.all([
    countClicks(c.env.DB, slug),
    recentClicks(c.env.DB, slug, 20),
  ]);
  return c.json({ slug, target, totalClicks, recentClicks: recent });
});

api.delete("/delete/:slug", async (c) => {
  const slug = c.req.param("slug");
  await Promise.all([c.env.URLS.delete(slug), deleteClicks(c.env.DB, slug)]);
  return c.json({ success: true, deleted: slug });
});
