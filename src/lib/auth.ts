import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

export const requireAdmin = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${c.env.ADMIN_KEY}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});
