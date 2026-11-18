'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./db');
const views = require('./views');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = db.UPLOAD_DIR;
const MAX_BODY = 24 * 1024 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, code, body, headers) {
  const h = Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, headers || {});
  res.writeHead(code, h);
  res.end(body);
}
function sendHtml(res, code, html) {
  send(res, code, html, { 'Content-Type': 'text/html; charset=utf-8' });
}
function redirect(res, loc) {
  res.writeHead(302, { Location: loc, 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('redirect');
}
function json(res, code, obj) {
  send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(function (p) {
    const i = p.indexOf('=');
    if (i < 0) return;
    out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on('data', function (c) {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}
function parseForm(buf) {
  const s = buf.toString('utf8');
  const out = {};
  s.split('&').forEach(function (kv) {
    if (!kv) return;
    const i = kv.indexOf('=');
    const rawk = i < 0 ? kv : kv.slice(0, i);
    const rawv = i < 0 ? '' : kv.slice(i + 1);
    out[decodeURIComponent(rawk.replace(/\+/g, ' '))] = decodeURIComponent(rawv.replace(/\+/g, ' '));
  });
  return out;
}
function safeName(s) {
  const v = String(s || '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
  return v || 'file';
}
function isAuthed(req) {
  return !!db.getSession(parseCookies(req).sid);
}
function needAuth(req, res) {
  if (isAuthed(req)) return true;
  redirect(res, '/admin/login');
  return false;
}
function serveStatic(res, base, rel) {
  const target = path.resolve(base, '.' + rel);
  if (target.indexOf(base) !== 0) { send(res, 403, 'forbidden'); return; }
  fs.stat(target, function (err, st) {
    if (err || !st.isFile()) { send(res, 404, 'not found'); return; }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size });
    fs.createReadStream(target).pipe(res);
  });
}
function queryOf(url) {
  const out = {};
  url.searchParams.forEach(function (v, k) { out[k] = v; });
  return out;
}
function latestDate() {
  const st = db.stats();
  return (st.latest && st.latest.publish_date) || '';
}function publicHome(req, res) {
  const st = db.stats();
  const hot = db.listEntries({ limit: 8, sort: 'date_desc' });
  const html = views.homePage({
    stats: st, facets: db.facets(), hot: hot, q: '', updated: latestDate()
  });
  sendHtml(res, 200, html);
}

function publicBrowse(req, res, url) {
  const q = queryOf(url);
  const page = Math.max(1, Number(q.page) || 1);
  const per = 20;
  const f = {
    type: q.type || '', q: q.q || '', level: q.level || '', region: q.region || '',
    status: q.status || '', theme: q.theme || '', from: q.from || '', to: q.to || '',
    sort: q.sort || 'date_desc', limit: per, offset: (page - 1) * per
  };
  const entries = db.listEntries(f);
  const total = db.countEntries(Object.assign({}, f, { limit: 2000, offset: 0 }));
  const fct = db.facets();
  const html = views.browsePage({
    entries: entries, total: total, page: page, per: per, query: q,
    facets: fct, themeCounts: fct.themeCounts || {}, updated: latestDate()
  });
  sendHtml(res, 200, html);
}

function publicEntry(req, res, slug) {
  const e = db.getEntry(slug);
  if (!e || e.visibility !== 'public') {
    sendHtml(res, 404, views.layout({ title: '条目不存在', body: '<h1>条目不存在</h1><p>该条目可能已下线。</p>' }));
    return;
  }
  const related = db.listEntries({ type: e.type, limit: 8 }).filter(function (x) { return x.id !== e.id; }).slice(0, 5);
  sendHtml(res, 200, views.detailPage({ entry: e, related: related }));
}

function publicAbout(req, res) {
  const st = db.stats();
  sendHtml(res, 200, views.aboutPage({ total: st.total, updated: latestDate() }));
}

function publicGuide(req, res) {
  const st = db.stats();
  const f = db.facets();
  sendHtml(res, 200, views.guidePage({
    total: st.total, updated: latestDate(),
    facets: f, themeCounts: f.themeCounts || {}
  }));
}
function splitList(s) {
  return String(s || '').split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
}
function entryFromForm(form) {
  return {
    title: form.title || '', slug: (form.slug || '').trim(), type: form.type || 'policy',
    doc_no: form.doc_no || '', issuer: form.issuer || '', level: form.level || '',
    region: form.region || '', publish_date: form.publish_date || '',
    effective_date: form.effective_date || '', status: form.status || '现行有效',
    source_name: form.source_name || '', source_url: form.source_url || '',
    summary: form.summary || '', body: form.body || '',
    themes: splitList(form.themes), featured: form.featured === '1',
    visibility: form.visibility || '', author: form.author || ''
  };
}
function adminLogin(req, res) {
  const stored = db.getSetting('admin_password_hash');
  if (stored && db.verifyPassword(req.form.password || '', stored)) {
    const sid = db.createSession(24);
    db.audit('auth.login', 'admin', '');
    res.writeHead(302, { Location: '/admin', 'Set-Cookie': 'sid=' + sid + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400' });
    res.end('ok');
    return;
  }
  db.audit('auth.fail', 'admin', '');
  sendHtml(res, 401, views.loginPage('密码不正确'));
}
function adminLogout(req, res) {
  db.destroySession(parseCookies(req).sid);
  db.audit('auth.logout', 'admin', '');
  res.writeHead(302, { Location: '/', 'Set-Cookie': 'sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' });
  res.end('ok');
}
function adminDash(req, res) {
  const st = db.stats();
  const inbox = db.inboxList('pending').slice(0, 8);
  const rows = db.db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 10').all();
  sendHtml(res, 200, views.dashboardPage({ stats: st, inbox: inbox, audit: rows }));
}
function adminEntries(req, res, url) {
  const q = queryOf(url);
  const page = Math.max(1, Number(q.page) || 1);
  const per = 30;
  const f = { type: q.type || '', q: q.q || '', visibility: 'all', limit: per, offset: (page - 1) * per, sort: 'updated' };
  const entries = db.listEntries(f);
  const total = db.countEntries(Object.assign({}, f, { limit: 2000, offset: 0 }));
  sendHtml(res, 200, views.entriesPage({ entries: entries, total: total, page: page, per: per, query: q }));
}
function adminNewEntry(req, res) {
  sendHtml(res, 200, views.entryForm({ entry: {} }));
}
function adminEditEntry(req, res, slug) {
  const e = db.getEntry(slug);
  if (!e) { send(res, 404, 'not found'); return; }
  sendHtml(res, 200, views.entryForm({ entry: e }));
}
async function adminCreateEntry(req, res) {
  const form = parseForm(req.body);
  const data = entryFromForm(form);
  if (!data.title.trim()) { sendHtml(res, 400, views.entryForm({ entry: data })); return; }
  const payload = Object.assign({}, data, {
    visibility: data.visibility || 'public', author: data.author || '管理员'
  });
  const e = db.upsertEntry(payload);
  db.audit('entry.create', 'entry:' + e.id, e.title);
  redirect(res, '/admin/entries/' + e.slug + '/edit');
}
async function adminUpdateEntry(req, res, slug) {
  const form = parseForm(req.body);
  const data = entryFromForm(form);
  if (!data.title.trim()) { sendHtml(res, 400, views.entryForm({ entry: data })); return; }
  const old = db.getEntry(slug);
  if (!old) { send(res, 404, 'not found'); return; }
  const payload = Object.assign({}, data, {
    attachments: old.attachments,
    visibility: data.visibility || old.visibility,
    author: data.author || old.author
  });
  const e = db.upsertEntry(payload, old.id);
  db.audit('entry.update', 'entry:' + e.id, e.title);
  redirect(res, '/admin/entries/' + e.slug + '/edit');
}
function adminDeleteEntry(req, res, slug) {
  const e = db.getEntry(slug);
  if (e) { db.deleteEntry(e.id); db.audit('entry.delete', 'entry:' + e.id, e.title); }
  redirect(res, '/admin/entries');
}function adminInbox(req, res) {
  const list = db.inboxList('pending');
  sendHtml(res, 200, views.inboxPage({ inbox: list, total: list.length }));
}
function adminApprove(req, res, id) {
  const row = db.db.prepare('SELECT * FROM inbox WHERE id = ?').get(Number(id));
  if (!row) { redirect(res, '/admin/inbox'); return; }
  let raw = {};
  try { raw = JSON.parse(row.raw || '{}'); } catch (err) { raw = {}; }
  const data = {
    type: raw.type || 'policy', title: row.title, doc_no: row.doc_no, issuer: row.issuer,
    publish_date: row.publish_date, summary: raw.summary || row.summary || '',
    body: raw.body || '', source_name: raw.source_name || row.table_label || '',
    source_url: row.url || '', level: raw.level || '', region: raw.region || '',
    status: raw.status || '现行有效', themes: raw.themes || []
  };
  const e = db.upsertEntry(data);
  db.inboxSetStatus(Number(id), 'approved', '已公开: ' + e.slug);
  db.audit('inbox.approve', 'inbox:' + id, row.title);
  redirect(res, '/admin/inbox');
}
function adminReject(req, res, id) {
  db.inboxSetStatus(Number(id), 'rejected', '人工驳回');
  db.audit('inbox.reject', 'inbox:' + id, '');
  redirect(res, '/admin/inbox');
}
function adminImport(req, res) {
  let obj = null;
  try { obj = JSON.parse(req.body.toString('utf8')); } catch (err) { obj = null; }
  const list = Array.isArray(obj) ? obj : (obj && obj.records ? obj.records : []);
  let n = 0;
  list.forEach(function (rec) { if (db.inboxAdd(rec)) n = n + 1; });
  db.audit('inbox.import', 'json', String(n));
  redirect(res, '/admin/inbox');
}
function adminExport(req, res) {
  const rows = db.listEntries({ visibility: 'all', limit: 2000, sort: 'date_desc' });
  const head = ['slug', 'type', 'title', 'doc_no', 'issuer', 'level', 'region', 'publish_date', 'effective_date', 'status', 'themes', 'summary', 'source_name', 'source_url', 'visibility'];
  const lines = [head.join(',')];
  rows.forEach(function (r) {
    lines.push(head.map(function (k) {
      const v = r[k];
      const s = Array.isArray(v) ? v.join('|') : String(v == null ? '' : v);
      return '"' + s.replace(/"/g, '""') + '"';
    }).join(','));
  });
  send(res, 200, '\ufeff' + lines.join('\r\n'), {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="entries.csv"'
  });
}
function adminUpload(req, res, url) {
  const q = queryOf(url);
  const buf = req.body;
  const orig = q.name || 'file';
  const fname = Date.now() + '-' + safeName(orig);
  fs.writeFileSync(path.join(UPLOAD_DIR, fname), buf);
  const e = db.getEntry(q.slug || '');
  if (e) {
    const atts = (e.attachments || []).slice();
    atts.push({ name: orig, path: '/uploads/' + fname, size: buf.length, uploaded_at: db.nowISO() });
    db.upsertEntry(Object.assign({}, e, { attachments: atts }), e.id);
    db.audit('entry.upload', 'entry:' + e.id, fname);
  }
  json(res, 200, { ok: true, path: '/uploads/' + fname, size: buf.length });
}async function handle(req, res) {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const p = decodeURIComponent(url.pathname);
  const m = req.method || 'GET';
  const seg = p.split('/').filter(Boolean);
  if (m === 'POST' || m === 'PUT') {
    req.body = await readBody(req);
    req.form = parseForm(req.body);
  }
  if (p === '/' && m === 'GET') return publicHome(req, res);
  if (p === '/browse' && m === 'GET') return publicBrowse(req, res, url);
  if (p === '/about' && m === 'GET') return publicAbout(req, res);
  if (p === '/guide' && m === 'GET') return publicGuide(req, res);
  if (p === '/health') return json(res, 200, { ok: true, ts: db.nowISO(), stats: db.stats() });
  if (seg[0] === 'entry' && m === 'GET') return publicEntry(req, res, seg[1]);
  if (seg[0] === 'public' && m === 'GET') return serveStatic(res, PUBLIC_DIR, '/' + seg.slice(1).join('/'));
  if (seg[0] === 'uploads' && m === 'GET') return serveStatic(res, UPLOAD_DIR, '/' + seg.slice(1).join('/'));
  if (p === '/favicon.ico') return send(res, 204, '');
  if (p === '/robots.txt') return send(res, 200, 'User-agent: *\nAllow: /\n');
  if (seg[0] === 'admin') {
    if (seg[1] === 'login') {
      if (m === 'GET') return sendHtml(res, 200, views.loginPage(''));
      if (m === 'POST') return adminLogin(req, res);
    }
    if (seg[1] === 'logout' && m === 'POST') return adminLogout(req, res);
    if (!needAuth(req, res)) return;
    if (!seg[1]) return adminDash(req, res);
    if (seg[1] === 'entries') {
      if (!seg[2] && m === 'GET') return adminEntries(req, res, url);
      if (!seg[2] && m === 'POST') return adminCreateEntry(req, res);
      if (seg[2] === 'new' && m === 'GET') return adminNewEntry(req, res);
      if (seg[2] && seg[3] === 'edit') {
        if (m === 'GET') return adminEditEntry(req, res, seg[2]);
        if (m === 'POST') return adminUpdateEntry(req, res, seg[2]);
      }
      if (seg[2] && seg[3] === 'delete' && m === 'POST') return adminDeleteEntry(req, res, seg[2]);
    }
    if (seg[1] === 'inbox') {
      if (!seg[2] && m === 'GET') return adminInbox(req, res);
      if (seg[2] === 'import' && m === 'POST') return adminImport(req, res);
      if (seg[3] === 'approve' && m === 'POST') return adminApprove(req, res, seg[2]);
      if (seg[3] === 'reject' && m === 'POST') return adminReject(req, res, seg[2]);
    }
    if (seg[1] === 'audit' && m === 'GET') {
      const rows = db.db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 300').all();
      return sendHtml(res, 200, views.auditPage({ audit: rows }));
    }
    if (seg[1] === 'export.csv' && m === 'GET') return adminExport(req, res);
    if (seg[1] === 'upload' && m === 'POST') return adminUpload(req, res, url);
  }
  sendHtml(res, 404, views.layout({ title: '页面不存在', body: '<h1>404</h1><p>页面不存在或已下线。</p>' }));
}

db.ensureAdmin();

const server = http.createServer(function (req, res) {
  handle(req, res).catch(function (err) {
    console.error('[portal] ' + (err && err.stack ? err.stack : err));
    if (!res.headersSent) send(res, 500, 'internal error');
    else res.end();
  });
});

server.listen(PORT, HOST, function () {
  console.log('[portal] listening on http://' + HOST + ':' + PORT);
  console.log('[portal] data dir: ' + db.DATA_DIR);
});

module.exports = { server: server, handle: handle };
