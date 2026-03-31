// GHS Short URL System
// Worker: redirect + API + click tracking

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for API
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // === API Routes ===
    if (path.startsWith('/api/')) {
      return handleAPI(request, env, url, corsHeaders);
    }

    // === Admin Dashboard ===
    if (path === '/admin' || path === '/admin/') {
      return new Response(ADMIN_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // === Redirect ===
    const slug = path.slice(1); // remove leading /
    if (!slug || slug === '') {
      return new Response('GHS Short URL Service', { status: 200 });
    }

    // Look up the short URL
    const target = await env.URLS.get(slug);
    if (!target) {
      return new Response('404 - Link not found', { status: 404 });
    }

    // Track the click (non-blocking)
    const clickData = {
      ts: Date.now(),
      ip: request.headers.get('cf-connecting-ip') || 'unknown',
      country: request.cf?.country || 'unknown',
      city: request.cf?.city || 'unknown',
      device: request.headers.get('user-agent') || 'unknown',
      referer: request.headers.get('referer') || 'direct',
    };

    // Store click asynchronously (don't block redirect)
    const clickKey = `${slug}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await env.CLICKS.put(clickKey, JSON.stringify(clickData), {
      expirationTtl: 60 * 60 * 24 * 90 // Keep 90 days
    });

    // Update click counter
    const countKey = `count:${slug}`;
    const currentCount = parseInt(await env.CLICKS.get(countKey) || '0');
    await env.CLICKS.put(countKey, String(currentCount + 1));

    // 301 Redirect
    return Response.redirect(target, 301);
  }
};

// === API Handler ===
async function handleAPI(request, env, url, corsHeaders) {
  const path = url.pathname;
  const json = (data, status = 200) => new Response(
    JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );

  // Auth check for write operations
  const authCheck = (request) => {
    const auth = request.headers.get('Authorization');
    return auth === `Bearer ${env.ADMIN_KEY}`;
  };

  // POST /api/create — Create short URL
  if (path === '/api/create' && request.method === 'POST') {
    if (!authCheck(request)) return json({ error: 'Unauthorized' }, 401);
    const body = await request.json();
    const { slug, target } = body;
    if (!slug || !target) return json({ error: 'slug and target required' }, 400);

    // Check if slug exists
    const existing = await env.URLS.get(slug);
    if (existing) return json({ error: 'Slug already exists' }, 409);

    await env.URLS.put(slug, target);
    return json({ success: true, short: `${env.DOMAIN}/${slug}`, target });
  }

  // GET /api/list — List all short URLs
  if (path === '/api/list' && request.method === 'GET') {
    if (!authCheck(request)) return json({ error: 'Unauthorized' }, 401);
    const list = await env.URLS.list();
    const urls = [];
    for (const key of list.keys) {
      const target = await env.URLS.get(key.name);
      const count = parseInt(await env.CLICKS.get(`count:${key.name}`) || '0');
      urls.push({ slug: key.name, target, clicks: count });
    }
    return json({ urls });
  }

  // GET /api/stats/:slug — Get click stats for a slug
  if (path.startsWith('/api/stats/') && request.method === 'GET') {
    if (!authCheck(request)) return json({ error: 'Unauthorized' }, 401);
    const slug = path.replace('/api/stats/', '');
    const target = await env.URLS.get(slug);
    if (!target) return json({ error: 'Slug not found' }, 404);

    const count = parseInt(await env.CLICKS.get(`count:${slug}`) || '0');

    // Get recent clicks
    const clickList = await env.CLICKS.list({ prefix: `${slug}:` });
    const recentClicks = [];
    for (const key of clickList.keys.slice(-20)) {
      const data = await env.CLICKS.get(key.name);
      if (data) recentClicks.push(JSON.parse(data));
    }

    return json({ slug, target, totalClicks: count, recentClicks });
  }

  // DELETE /api/delete/:slug — Delete a short URL
  if (path.startsWith('/api/delete/') && request.method === 'DELETE') {
    if (!authCheck(request)) return json({ error: 'Unauthorized' }, 401);
    const slug = path.replace('/api/delete/', '');
    await env.URLS.delete(slug);
    return json({ success: true, deleted: slug });
  }

  return json({ error: 'Not found' }, 404);
}

// === Admin Dashboard HTML ===
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GHS Short URL Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0e17;color:#e2e8f0;font-family:system-ui,sans-serif;padding:20px;max-width:800px;margin:0 auto}
h1{font-size:22px;font-weight:900;margin-bottom:16px;background:linear-gradient(135deg,#FF6B35,#00D4AA);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.card{background:rgba(17,24,39,0.7);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;margin:12px 0}
input,button{font-size:14px;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e2e8f0;width:100%;margin:4px 0}
button{background:linear-gradient(135deg,#FF6B35,#00D4AA);color:#0a0e17;font-weight:700;cursor:pointer;border:none}
button:hover{opacity:0.9}
.url-item{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
.url-item:last-child{border:none}
.slug{color:#00D4AA;font-weight:700;font-family:monospace}
.clicks{color:#FF6B35;font-family:monospace;font-size:13px}
.del{background:#ef4444;padding:4px 10px;width:auto;font-size:11px;border-radius:6px}
.row{display:grid;grid-template-columns:1fr 2fr;gap:8px}
#status{font-size:13px;color:#94a3b8;margin-top:8px}
.login-wrap{text-align:center;padding:60px 20px}
</style>
</head>
<body>
<div id="app">
<div class="login-wrap" id="login-section">
  <h1>GHS Short URL</h1>
  <div class="card" style="max-width:360px;margin:20px auto">
    <input type="password" id="key-input" placeholder="Admin Key">
    <button onclick="login()">Login</button>
  </div>
</div>
<div id="main-section" style="display:none">
  <h1>GHS Short URL Admin</h1>
  <div class="card">
    <h3 style="margin-bottom:10px;font-size:15px">Create New</h3>
    <div class="row">
      <input id="slug" placeholder="slug (e.g. apr-promo)">
      <input id="target" placeholder="https://destination-url.com">
    </div>
    <button onclick="create()" style="margin-top:8px">Create Short URL</button>
    <div id="status"></div>
  </div>
  <div class="card">
    <h3 style="margin-bottom:10px;font-size:15px">All URLs</h3>
    <div id="url-list">Loading...</div>
  </div>
</div>
</div>
<script>
let KEY = '';
const API = '';

function login() {
  KEY = document.getElementById('key-input').value;
  fetch(API + '/api/list', { headers: { Authorization: 'Bearer ' + KEY }})
    .then(r => { if (r.ok) { document.getElementById('login-section').style.display='none'; document.getElementById('main-section').style.display='block'; loadList(); } else { alert('Wrong key'); }})
    .catch(e => alert('Error: ' + e.message));
}

async function create() {
  const slug = document.getElementById('slug').value.trim();
  const target = document.getElementById('target').value.trim();
  if (!slug || !target) return;
  const res = await fetch(API + '/api/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
    body: JSON.stringify({ slug, target })
  });
  const data = await res.json();
  document.getElementById('status').textContent = data.success ? 'Created: ' + data.short : 'Error: ' + data.error;
  if (data.success) { document.getElementById('slug').value = ''; document.getElementById('target').value = ''; loadList(); }
}
async function loadList() {
  const res = await fetch(API + '/api/list', { headers: { Authorization: 'Bearer ' + KEY }});
  const data = await res.json();
  const el = document.getElementById('url-list');
  if (!data.urls || data.urls.length === 0) { el.innerHTML = '<p style="color:#94a3b8">No URLs yet</p>'; return; }
  el.innerHTML = data.urls.sort((a,b) => b.clicks - a.clicks).map(u =>
    '<div class="url-item"><div><span class="slug">/' + u.slug + '</span><br><span style="font-size:12px;color:#94a3b8">' + u.target.substring(0,50) + (u.target.length > 50 ? '...' : '') + '</span></div><div style="text-align:right"><span class="clicks">' + u.clicks + ' clicks</span><br><button class="del" onclick="del(\\''+u.slug+'\\')">Delete</button></div></div>'
  ).join('');
}

async function del(slug) {
  if (!confirm('Delete /' + slug + '?')) return;
  await fetch(API + '/api/delete/' + slug, { method: 'DELETE', headers: { Authorization: 'Bearer ' + KEY }});
  loadList();
}
</script>
</body></html>`;
