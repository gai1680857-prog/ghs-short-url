export type Env = {
  URLS: KVNamespace;
  CLICKS: KVNamespace;
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_KEY: string;
  DOMAIN: string;
};

export type Click = {
  slug: string;
  ts: number;
  ip: string;
  country: string;
  city: string;
  ua: string;
  referer: string;
};
