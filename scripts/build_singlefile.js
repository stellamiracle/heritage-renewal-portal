'use strict';
const fs = require('fs');
const path = require('path');
const db = require('../src/db.js');
const md = require('../src/md.js');
const B = path.join(__dirname, '..');
const WS = path.dirname(B);
const OUT = path.join(B, 'dist-single');
const NL = String.fromCharCode(10);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const BS = String.fromCharCode(92);
const Q = String.fromCharCode(34);
function readApp() {
  const dir = path.join(B, 'src', 'single');
  const files = fs.readdirSync(dir).filter(function (f) {
    return f.slice(-3) === '.js';
  }).sort();
  return files.map(function (f) {
    return fs.readFileSync(path.join(dir, f), 'utf8');
  }).join(NL);
}
function expand(src) {
  return src.split('@LT@').join(LT).split('@GT@').join(GT).split('@Q@').join(Q);
}
function flat(t) {
  var s = String(t == null ? '' : t).split(NL).join(' ');
  var bad = '#>*_~|`';
  for (var i = 0; i < bad.length; i++) {
    s = s.split(bad.charAt(i)).join(' ');
  }
  while (s.indexOf('  ') >= 0) s = s.split('  ').join(' ');
  return s.trim();
}
function pad(n) { return n < 10 ? '0' + n : String(n); }
function stamp(d) {
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' +
    pad(d.getHours()) + pad(d.getMinutes());
}
const all = db.listEntries({ visibility: 'all', limit: 2000 });
const pub = all.filter(function (e) { return e.visibility === 'public'; });
const entries = pub.map(function (e) {
  const related = db.listEntries({ type: e.type, limit: 12 })
    .filter(function (x) { return x.id !== e.id && x.visibility === 'public'; })
    .slice(0, 5)
    .map(function (x) {
      return { slug: x.slug, title: x.title, publish_date: x.publish_date };
    });
  return {
    slug: e.slug, title: e.title, type: e.type,
    type_label: e.type_label || '', issuer: e.issuer || '',
    doc_no: e.doc_no || '', publish_date: e.publish_date || '',
    effective_date: e.effective_date || '', status: e.status || '',
    level: e.level || '', region: e.region || '',
    source_name: e.source_name || '', source_url: e.source_url || '',
    summary: e.summary || '', themes: e.themes || [],
    featured: e.featured ? 1 : 0, attachments: e.attachments || [],
    bodyHtml: md.render(e.body || ''),
    related: related, updated_at: e.updated_at || ''
  };
});
const counts = { regulation: 0, policy: 0, case: 0, news: 0 };
entries.forEach(function (e) { counts[e.type] = (counts[e.type] || 0) + 1; });
let latest = '';
entries.forEach(function (e) {
  if (e.publish_date && e.publish_date > latest) latest = e.publish_date;
});
const facets = db.facets();
const stats = { total: entries.length, byType: counts, latest: latest };
const payload = { entries: entries, facets: facets, stats: stats, updated: latest };
const json = JSON.stringify(payload).split(LT).join(BS + 'u003c');
const css = fs.readFileSync(path.join(B, 'public', 'style.css'), 'utf8');
const app = readApp();
const page = [
  '@LT@!DOCTYPE html@GT@',
  '@LT@html lang=@Q@zh-CN@Q@@GT@',
  '@LT@head@GT@',
  '@LT@meta charset=@Q@utf-8@Q@@GT@',
  '@LT@meta name=@Q@viewport@Q@ content=@Q@width=device-width, initial-scale=1@Q@@GT@',
  '@LT@title@GT@遗产保护与城市更新 · 专题资料库（单文件离线版）@LT@/title@GT@',
  '@LT@style@GT@' + css + '@LT@/style@GT@',
  '@LT@/head@GT@',
  '@LT@body@GT@',
  '@LT@div id=@Q@site-head@Q@@GT@@LT@/div@GT@',
  '@LT@main class=@Q@wrap@Q@ id=@Q@app@Q@@GT@@LT@/main@GT@',
  '@LT@div id=@Q@site-foot@Q@@GT@@LT@/div@GT@',
  '@LT@script@GT@window.__PORTAL_DATA__ = ' + json + ';@LT@/script@GT@',
  '@LT@script@GT@' + app + '@LT@/script@GT@',
  '@LT@/body@GT@',
  '@LT@/html@GT@'
].join(NL);
const html = expand(page);
const name = 'heritage-portal-single_' + stamp(new Date()) + '.html';
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, name), html, 'utf8');
fs.writeFileSync(path.join(WS, name), html, 'utf8');
const report = [
  'entries=' + entries.length,
  'bytes=' + Buffer.byteLength(html),
  'css_bytes=' + Buffer.byteLength(css),
  'app_bytes=' + Buffer.byteLength(app),
  'lt_left=' + (html.split('@LT@').length - 1),
  'gt_left=' + (html.split('@GT@').length - 1),
  'q_left=' + (html.split('@Q@').length - 1),
  'facets=' + JSON.stringify(facets).slice(0, 300),
  'out=' + path.join(OUT, name)
].join(' | ');
fs.writeFileSync(path.join(B, '_single_build.txt'), report, 'utf8');
console.log(report);