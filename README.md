# GHS Short URL v2

短網址 + 點擊追蹤，跑在 Cloudflare Workers。

## Features
- 301 重導向（SEO 友好，非阻塞追蹤）
- 點擊紀錄存 D1（可 SQL 撈報表）
- Admin 管理面板（登入、建立/刪除、點擊統計）
- REST API（Zod 驗證輸入）
- 速率限制（admin API）
- 型別安全（TypeScript）
- 測試覆蓋（Vitest + Workers pool）

## Stack
- **Hono** — Workers framework
- **TypeScript** — 型別
- **KV (URLS)** — slug → target 快速查詢
- **D1 (DB)** — 點擊紀錄、統計
- **Zod** — 輸入驗證
- **Vitest** — 測試

## Setup

```bash
npm install

# 建立 D1 資料庫（拿到 id 填進 wrangler.toml）
npx wrangler d1 create ghs-short-url

# 跑 migration
npm run db:migrate:local    # 本機
npm run db:migrate:remote   # 線上

# 設定 Admin 密碼
npx wrangler secret put ADMIN_KEY

# 開發
npm run dev

# 部署
npm run deploy
```

## API

所有 `/api/*` 需要 `Authorization: Bearer <ADMIN_KEY>`。

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/create` | `{slug, target}` | `{success, short, target}` |
| GET | `/api/list` | — | `{urls: [{slug, target, clicks}]}` |
| GET | `/api/stats/:slug` | — | `{slug, target, totalClicks, recentClicks}` |
| DELETE | `/api/delete/:slug` | — | `{success, deleted}` |
| GET | `/health` | — | `{status, service, time}` |
| GET | `/admin` | — | Admin UI (HTML) |
| GET | `/:slug` | — | 301 → target |

## Project Layout

```
src/
├── index.ts              # Hono app entry
├── types.ts              # Env + shared types
├── routes/
│   ├── redirect.ts       # /:slug → 301
│   └── api.ts            # /api/* (Zod validated)
└── lib/
    ├── auth.ts           # Bearer token middleware
    ├── db.ts             # D1 click queries
    └── ratelimit.ts      # KV-based rate limiter
public/
└── admin.html            # Admin UI (static asset)
migrations/
└── 0001_init.sql         # D1 schema
tests/
└── api.test.ts           # Integration tests
```

## Changes from v1

| v1 | v2 | Why |
|---|---|---|
| 單檔 worker.js (JS) | 分層 TypeScript | 型別安全、好維護 |
| 手寫 fetch handler | Hono | 路由清晰、中介層 |
| KV 計數器（有 race） | D1 INSERT per click | 不漏計、可報表 |
| 阻塞寫 KV 才重導 | `ctx.waitUntil` 非阻塞 | 快 50-100ms |
| 無驗證 | Zod | 壞輸入擋在外面 |
| HTML 內嵌 JS 字串 | 獨立 `public/admin.html` | 好維護 |
| 無測試 | Vitest 整合測試 | 改動有保障 |
| 無速率限制 | KV 桶限流 | 防濫用 |

## Testing

```bash
npm run typecheck
npm test
```

## Data Migration

v1 的 URL 資料在 `URLS` KV，v2 繼續用（不動）。
v1 的點擊紀錄在 `CLICKS` KV，v2 改寫到 D1。舊資料會在 90 天內自動過期。
如需轉移歷史點擊：自行寫一次性腳本從 `CLICKS` KV 讀出塞進 D1。
