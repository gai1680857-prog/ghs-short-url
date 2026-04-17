import type { Env, Click } from "../types";

export async function insertClick(db: D1Database, c: Click): Promise<void> {
  await db
    .prepare(
      "INSERT INTO clicks (slug, ts, ip, country, city, ua, referer) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(c.slug, c.ts, c.ip, c.country, c.city, c.ua, c.referer)
    .run();
}

export async function countClicks(db: D1Database, slug: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM clicks WHERE slug = ?")
    .bind(slug)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function recentClicks(
  db: D1Database,
  slug: string,
  limit = 20
): Promise<Click[]> {
  const { results } = await db
    .prepare(
      "SELECT slug, ts, ip, country, city, ua, referer FROM clicks WHERE slug = ? ORDER BY ts DESC LIMIT ?"
    )
    .bind(slug, limit)
    .all<Click>();
  return results;
}

export async function deleteClicks(db: D1Database, slug: string): Promise<void> {
  await db.prepare("DELETE FROM clicks WHERE slug = ?").bind(slug).run();
}

export async function countsForSlugs(
  db: D1Database,
  slugs: string[]
): Promise<Map<string, number>> {
  if (slugs.length === 0) return new Map();
  const placeholders = slugs.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT slug, COUNT(*) AS n FROM clicks WHERE slug IN (${placeholders}) GROUP BY slug`
    )
    .bind(...slugs)
    .all<{ slug: string; n: number }>();
  const map = new Map<string, number>();
  for (const r of results) map.set(r.slug, r.n);
  return map;
}
