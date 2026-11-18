'use strict';
/** 数据库层：Node 内置 node:sqlite，零外部依赖 */
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'portal.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'policy',
  title TEXT NOT NULL,
  doc_no TEXT DEFAULT '',
  issuer TEXT DEFAULT '',
  level TEXT DEFAULT '',
  region TEXT DEFAULT '',
  publish_date TEXT DEFAULT '',
  effective_date TEXT DEFAULT '',
  status TEXT DEFAULT '现行有效',
  themes TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  summary TEXT DEFAULT '',
  body TEXT DEFAULT '',
  source_name TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  attachments TEXT DEFAULT '[]',
  featured INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'public',
  author TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT UNIQUE,
  title TEXT DEFAULT '', doc_no TEXT DEFAULT '', issuer TEXT DEFAULT '',
  publish_date TEXT DEFAULT '', summary TEXT DEFAULT '', url TEXT DEFAULT '',
  keyword TEXT DEFAULT '', table_label TEXT DEFAULT '',
  status TEXT DEFAULT 'pending', note TEXT DEFAULT '', raw TEXT DEFAULT '{}',
  created_at TEXT DEFAULT '', reviewed_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, action TEXT, target TEXT, detail TEXT);
CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, created_at TEXT, expires_at TEXT);
CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox(status);
`);

const nowISO = () => new Date().toISOString();
const j = (v) => { try { return JSON.stringify(v || []); } catch { return '[]'; } };
const pj = (v) => { try { const x = JSON.parse(v || '[]'); return Array.isArray(x) ? x : []; } catch { return []; } };
const b = (v) => (v ? 1 : 0);

function slugify(type, title, date) {
  const d = (date || '').replace(/-/g, '') || 'nodate';
  const h = crypto.createHash('sha1').update((title || '') + d).digest('hex').slice(0, 8);
  return [type || 'item', d, h].join('-');
}

const TYPES = ['regulation', 'policy', 'case', 'news'];
const TYPE_LABEL = { regulation: '法规', policy: '政策', case: '案例', news: '动态' };

function rowToEntry(r) {
  if (!r) return null;
  return {
    ...r,
    themes: pj(r.themes),
    tags: pj(r.tags),
    attachments: pj(r.attachments),
    featured: !!r.featured,
    type_label: TYPE_LABEL[r.type] || r.type,
  };
}

function getEntry(idOrSlug) {
  const isNum = /^\d+$/.test(String(idOrSlug));
  const sql = isNum ? 'SELECT * FROM entries WHERE id = ?' : 'SELECT * FROM entries WHERE slug = ?';
  return rowToEntry(db.prepare(sql).get(isNum ? Number(idOrSlug) : String(idOrSlug)));
}

function listEntries(f = {}) {
  const where = [];
  const params = [];
  if (!f.visibility || f.visibility !== 'all') {
    where.push('visibility = ?');
    params.push(f.visibility || 'public');
  }
  if (f.type && TYPES.includes(f.type)) { where.push('type = ?'); params.push(f.type); }
  if (f.level) { where.push('level = ?'); params.push(f.level); }
  if (f.region) { where.push('region = ?'); params.push(f.region); }
  if (f.status) { where.push('status = ?'); params.push(f.status); }
  if (f.theme) { where.push('themes LIKE ?'); params.push('%' + f.theme + '%'); }
  if (f.from) { where.push('publish_date >= ?'); params.push(f.from); }
  if (f.to) { where.push('publish_date <= ?'); params.push(f.to); }
  if (f.featured === '1') where.push('featured = 1');
  let sql = 'SELECT * FROM entries' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '');
  if (f.q) {
    const kw = '%' + f.q.trim() + '%';
    sql += (where.length ? ' AND ' : ' WHERE ') + '(title LIKE ? OR summary LIKE ? OR body LIKE ? OR doc_no LIKE ? OR issuer LIKE ? OR themes LIKE ? OR tags LIKE ? OR region LIKE ?)';
    params.push(kw, kw, kw, kw, kw, kw, kw, kw);
  }
  const sortMap = { date_desc: 'publish_date DESC, id DESC', date_asc: 'publish_date ASC, id ASC', title: 'title ASC', updated: 'updated_at DESC, id DESC' };
  sql += ' ORDER BY ' + (sortMap[f.sort] || sortMap.date_desc);
  const limit = Math.min(Number(f.limit) || 500, 2000);
  const offset = Number(f.offset) || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return db.prepare(sql).all(...params).map(rowToEntry);
}

function countEntries(f = {}) {
  const list = listEntries({ ...f, limit: 2000, offset: 0 });
  return list.length;
}

function upsertEntry(data, id = null) {
  const ts = nowISO();
  const type = TYPES.includes(data.type) ? data.type : 'policy';
  const title = (data.title || '').trim();
  if (!title) throw new Error('标题不能为空');
  const publish_date = data.publish_date || '';
  const slug = data.slug || slugify(type, title, publish_date);
  const payload = {
    slug, type, title,
    doc_no: data.doc_no || '', issuer: data.issuer || '', level: data.level || '',
    region: data.region || '', publish_date, effective_date: data.effective_date || '',
    status: data.status || '现行有效', themes: j(data.themes), tags: j(data.tags),
    summary: data.summary || '', body: data.body || '',
    source_name: data.source_name || '', source_url: data.source_url || '',
    attachments: j(data.attachments), featured: b(data.featured),
    visibility: data.visibility || 'public', author: data.author || '',
  };
  if (id) {
    db.prepare(`UPDATE entries SET slug=?, type=?, title=?, doc_no=?, issuer=?, level=?, region=?,
      publish_date=?, effective_date=?, status=?, themes=?, tags=?, summary=?, body=?,
      source_name=?, source_url=?, attachments=?, featured=?, visibility=?, author=?, updated_at=?
      WHERE id=?`).run(
      payload.slug, payload.type, payload.title, payload.doc_no, payload.issuer, payload.level,
      payload.region, payload.publish_date, payload.effective_date, payload.status, payload.themes,
      payload.tags, payload.summary, payload.body, payload.source_name, payload.source_url,
      payload.attachments, payload.featured, payload.visibility, payload.author, ts, id);
    return getEntry(id);
  }
  const st = db.prepare(`INSERT INTO entries (slug,type,title,doc_no,issuer,level,region,publish_date,
    effective_date,status,themes,tags,summary,body,source_name,source_url,attachments,featured,
    visibility,author,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const info = st.run(payload.slug, payload.type, payload.title, payload.doc_no, payload.issuer,
    payload.level, payload.region, payload.publish_date, payload.effective_date, payload.status,
    payload.themes, payload.tags, payload.summary, payload.body, payload.source_name, payload.source_url,
    payload.attachments, payload.featured, payload.visibility, payload.author, ts, ts);
  return getEntry(Number(info.lastInsertRowid));
}

function deleteEntry(id) {
  db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  audit('entry.delete', 'entry:' + id, '');
}

function facets() {
  const rows = db.prepare("SELECT type, level, region, status, themes FROM entries WHERE visibility='public'").all();
  const lv = new Set(), rg = new Set(), st = new Set(), th = new Set();
  const counts = { regulation: 0, policy: 0, case: 0, news: 0 };
  const themeCounts = {};
  for (const r of rows) {
    counts[r.type] = (counts[r.type] || 0) + 1;
    if (r.level) lv.add(r.level);
    if (r.region) rg.add(r.region);
    if (r.status) st.add(r.status);
    for (const t of pj(r.themes)) {
      th.add(t);
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    }
  }
  return {
    counts,
    levels: [...lv].sort(), regions: [...rg].sort(), statuses: [...st].sort(),
    themes: [...th].sort(),
    themeCounts,
  };
}

function stats() {
  const one = (sql) => db.prepare(sql).get();
  return {
    total: one("SELECT COUNT(*) c FROM entries WHERE visibility='public'").c,
    byType: Object.fromEntries(TYPES.map(t => [t, one(`SELECT COUNT(*) c FROM entries WHERE type='${t}' AND visibility='public'`).c])),
    inbox_pending: one("SELECT COUNT(*) c FROM inbox WHERE status='pending'").c,
    latest: db.prepare("SELECT publish_date FROM entries WHERE publish_date <> '' ORDER BY publish_date DESC LIMIT 1").get(),
  };
}

/* ---------- inbox 待审队列 ---------- */
function inboxAdd(rec) {
  const fp = rec.fingerprint || crypto.createHash('sha1').update((rec.title || '') + '|' + (rec.doc_no || '') + '|' + (rec.url || '')).digest('hex');
  const info = db.prepare(`INSERT OR IGNORE INTO inbox (fingerprint,title,doc_no,issuer,publish_date,summary,url,keyword,table_label,status,raw,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?)`).run(
    fp, rec.title || '', rec.doc_no || '', rec.issuer || '', rec.publish_date || '',
    rec.summary || '', rec.url || '', rec.keyword || '', rec.table_label || '',
    JSON.stringify(rec), nowISO());
  return info.changes > 0;
}
function inboxList(status = 'pending') {
  return db.prepare('SELECT * FROM inbox WHERE status = ? ORDER BY publish_date DESC, id DESC LIMIT 500').all(status);
}
function inboxSetStatus(id, status, note = '') {
  db.prepare('UPDATE inbox SET status=?, note=?, reviewed_at=? WHERE id=?').run(status, note, nowISO(), id);
}

/* ---------- settings / auth ---------- */
function getSetting(k, d = '') {
  const r = db.prepare('SELECT value FROM settings WHERE key=?').get(k);
  return r ? r.value : d;
}
function setSetting(k, v) {
  db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v));
}
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, salt, 64).toString('hex');
  return salt + ':' + h;
}
function verifyPassword(pw, stored) {
  try {
    const [salt, h] = String(stored).split(':');
    const cand = crypto.scryptSync(pw, salt, 64);
    const exp = Buffer.from(h, 'hex');
    return cand.length === exp.length && crypto.timingSafeEqual(cand, exp);
  } catch { return false; }
}
function ensureAdmin() {
  if (!getSetting('admin_password_hash')) {
    const pw = process.env.PORTAL_ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url');
    setSetting('admin_password_hash', hashPassword(pw));
    console.log('[portal] 初始后台密码（仅显示一次）: ' + pw);
  }
}
function createSession(ttlHours = 24) {
  const sid = crypto.randomBytes(24).toString('hex');
  const exp = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (sid,created_at,expires_at) VALUES (?,?,?)').run(sid, nowISO(), exp);
  return sid;
}
function getSession(sid) {
  if (!sid) return null;
  const r = db.prepare('SELECT * FROM sessions WHERE sid=?').get(sid);
  if (!r) return null;
  if (new Date(r.expires_at) < new Date()) { db.prepare('DELETE FROM sessions WHERE sid=?').run(sid); return null; }
  return r;
}
function destroySession(sid) { if (sid) db.prepare('DELETE FROM sessions WHERE sid=?').run(sid); }

function audit(action, target = '', detail = '') {
  db.prepare('INSERT INTO audit (ts,action,target,detail) VALUES (?,?,?,?)').run(nowISO(), action, target, String(detail).slice(0, 800));
}

module.exports = {
  db, dbPath: path.join(DATA_DIR, 'portal.db'), UPLOAD_DIR, DATA_DIR,
  nowISO, TYPES, TYPE_LABEL, slugify,
  getEntry, listEntries, countEntries, upsertEntry, deleteEntry, facets, stats,
  inboxAdd, inboxList, inboxSetStatus,
  getSetting, setSetting, hashPassword, verifyPassword, ensureAdmin,
  createSession, getSession, destroySession, audit,
};
