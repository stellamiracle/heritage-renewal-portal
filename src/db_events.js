'use strict';
/* 行业活动与培训模块数据层：独立表 events，不与资料库条目混算
   复用 src/db.js 已打开的同一数据库（node:sqlite，零外部依赖） */
const { db } = require('./db.js');
const crypto = require('node:crypto');

const DDL = [
  'CREATE TABLE IF NOT EXISTS events (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
  '  slug TEXT UNIQUE NOT NULL,',
  '  name TEXT NOT NULL,',
  '  name_en TEXT DEFAULT "",',
  '  type TEXT DEFAULT "",',
  '  topics TEXT DEFAULT "[]",',
  '  format TEXT DEFAULT "",',
  '  status TEXT DEFAULT "",',
  '  start_date TEXT DEFAULT "",',
  '  end_date TEXT DEFAULT "",',
  '  deadline TEXT DEFAULT "",',
  '  country TEXT DEFAULT "",',
  '  city TEXT DEFAULT "",',
  '  region TEXT DEFAULT "",',
  '  venue TEXT DEFAULT "",',
  '  organizer TEXT DEFAULT "",',
  '  co_organizer TEXT DEFAULT "",',
  '  audience TEXT DEFAULT "",',
  '  fee TEXT DEFAULT "",',
  '  series TEXT DEFAULT "",',
  '  summary TEXT DEFAULT "",',
  '  evidence TEXT DEFAULT "",',
  '  source_name TEXT DEFAULT "",',
  '  source_url TEXT DEFAULT "",',
  '  registration_url TEXT DEFAULT "",',
  '  visibility TEXT DEFAULT "public",',
  '  created_at TEXT DEFAULT "",',
  '  updated_at TEXT DEFAULT ""',
  ');',
  'CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_date);'
].join(String.fromCharCode(10));
db.exec(DDL);

const j = (v) => { try { return JSON.stringify(v || []); } catch { return '[]'; } };
const pj = (v) => { try { const x = JSON.parse(v || '[]'); return Array.isArray(x) ? x : []; } catch { return []; } };
const nowISO = () => new Date().toISOString();

function rowToEvent(r) {
  if (!r) return null;
  return Object.assign({}, r, { topics: pj(r.topics) });
}

function listEvents(f = {}) {
  const where = [];
  const params = [];
  if (!f.visibility || f.visibility !== 'all') { where.push('visibility = ?'); params.push(f.visibility || 'public'); }
  if (f.type) { where.push('type = ?'); params.push(f.type); }
  if (f.region) { where.push('region = ?'); params.push(f.region); }
  if (f.format) { where.push('format = ?'); params.push(f.format); }
  if (f.status) { where.push('status = ?'); params.push(f.status); }
  if (f.topic) { where.push('topics LIKE ?'); params.push('%' + f.topic + '%'); }
  let sql = 'SELECT * FROM events' + (where.length ? ' WHERE ' + where.join(' AND ') : '');
  sql += " ORDER BY (start_date = ''), start_date ASC, id ASC";
  return db.prepare(sql).all(...params).map(rowToEvent);
}

function getEvent(slug) {
  if (!slug) return null;
  return rowToEvent(db.prepare('SELECT * FROM events WHERE slug = ?').get(String(slug)));
}

function countEvents() {
  return db.prepare("SELECT COUNT(*) c FROM events WHERE visibility='public'").get().c;
}

function liveStatus(ev, todayStr) {
  const s = ev.start_date || '';
  const e = ev.end_date || ev.start_date || '';
  if (!s) return ev.status || '日期待定';
  const T = todayStr || new Date().toISOString().slice(0, 10);
  if (e < T) return '已结束';
  if (s <= T && e >= T) return '进行中';
  return '即将开始';
}

function eventFacets(list) {
  const rows = list || db.prepare("SELECT type, topics, format, region, status FROM events WHERE visibility='public'").all();
  const type = {}, topic = {}, format = {}, region = {}, status = {};
  for (const r of rows) {
    if (r.type) type[r.type] = (type[r.type] || 0) + 1;
    if (r.format) format[r.format] = (format[r.format] || 0) + 1;
    if (r.region) region[r.region] = (region[r.region] || 0) + 1;
    if (r.status) status[r.status] = (status[r.status] || 0) + 1;
    const tp = Array.isArray(r.topics) ? r.topics : pj(r.topics);
    for (const t of tp) topic[t] = (topic[t] || 0) + 1;
  }
  return { type: type, topic: topic, format: format, region: region, status: status };
}

function slugFor(name, startDate) {
  const h = crypto.createHash('sha1').update(String(name) + String(startDate || '')).digest('hex').slice(0, 8);
  const d = String(startDate || '').replace(/-/g, '') || 'nodate';
  return 'ev-' + d + '-' + h;
}

function upsertEvent(data) {
  const ts = nowISO();
  const name = (data.name || '').trim();
  if (!name) throw new Error('活动名称不能为空');
  const slug = data.slug || slugFor(name, data.start_date);
  const p = {
    slug: slug, name: name, name_en: data.name_en || '', type: data.type || '',
    topics: j(data.topics), format: data.format || '', status: data.status || '',
    start_date: data.start_date || '', end_date: data.end_date || '', deadline: data.deadline || '',
    country: data.country || '', city: data.city || '', region: data.region || '',
    venue: data.venue || '', organizer: data.organizer || '', co_organizer: data.co_organizer || '',
    audience: data.audience || '', fee: data.fee || '', series: data.series || '',
    summary: data.summary || '', evidence: data.evidence || '',
    source_name: data.source_name || '', source_url: data.source_url || '',
    registration_url: data.registration_url || '', visibility: data.visibility || 'public'
  };
  const ex = db.prepare('SELECT id FROM events WHERE slug = ?').get(slug);
  if (ex) {
    db.prepare('UPDATE events SET name=?,name_en=?,type=?,topics=?,format=?,status=?,start_date=?,end_date=?,deadline=?,country=?,city=?,region=?,venue=?,organizer=?,co_organizer=?,audience=?,fee=?,series=?,summary=?,evidence=?,source_name=?,source_url=?,registration_url=?,visibility=?,updated_at=? WHERE id=?')
      .run(p.name, p.name_en, p.type, p.topics, p.format, p.status, p.start_date, p.end_date,
        p.deadline, p.country, p.city, p.region, p.venue, p.organizer, p.co_organizer,
        p.audience, p.fee, p.series, p.summary, p.evidence, p.source_name, p.source_url,
        p.registration_url, p.visibility, ts, ex.id);
    return getEvent(slug);
  }
  const info = db.prepare('INSERT INTO events (slug,name,name_en,type,topics,format,status,start_date,end_date,deadline,country,city,region,venue,organizer,co_organizer,audience,fee,series,summary,evidence,source_name,source_url,registration_url,visibility,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(p.slug, p.name, p.name_en, p.type, p.topics, p.format, p.status, p.start_date, p.end_date,
      p.deadline, p.country, p.city, p.region, p.venue, p.organizer, p.co_organizer,
      p.audience, p.fee, p.series, p.summary, p.evidence, p.source_name, p.source_url,
      p.registration_url, p.visibility, ts, ts);
  return getEvent(slug);
}

module.exports = {
  listEvents: listEvents, getEvent: getEvent, countEvents: countEvents,
  eventFacets: eventFacets, upsertEvent: upsertEvent, slugFor: slugFor,
  liveStatus: liveStatus
};
