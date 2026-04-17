import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { api } from "./routes/api";
import { redirect } from "./routes/redirect";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors({ origin: "*", allowMethods: ["GET", "POST", "DELETE", "OPTIONS"] }));

app.get("/health", (c) =>
  c.json({ status: "ok", service: "ghs-short-url", time: new Date().toISOString() })
);

app.route("/api", api);

app.get("/admin", (c) => c.env.ASSETS.fetch(new Request(new URL("/admin.html", c.req.url))));
app.get("/admin/", (c) => c.env.ASSETS.fetch(new Request(new URL("/admin.html", c.req.url))));

app.get("/", (c) => c.text("GHS Short URL Service"));

app.route("/", redirect);

export default app;
