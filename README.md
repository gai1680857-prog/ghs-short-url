# GHS Short URL System

短網址 + 點擊追蹤系統，基於 Cloudflare Workers + KV。

## Features
- 301 重導向（SEO 友好）
- 每次點擊追蹤（IP、國家、城市、裝置、來源）
- 90 天點擊紀錄
- Admin 管理面板（建立/刪除/查看統計）
- API 支援（可程式化操作）

## Setup
```bash
npm install
# 建立 KV Namespace（在 wrangler.toml 填入 ID）
npx wrangler kv namespace create URLS
npx wrangler kv namespace create CLICKS
# 設定 Admin 密碼
npx wrangler secret put ADMIN_KEY
# 本地開發
npm run dev
# 部署
npm run deploy
```

## API
- `POST /api/create` — 建立短網址
- `GET /api/list` — 列出所有短網址
- `GET /api/stats/:slug` — 查看統計
- `DELETE /api/delete/:slug` — 刪除

All API calls require `Authorization: Bearer <ADMIN_KEY>` header.
