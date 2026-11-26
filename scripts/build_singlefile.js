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

/* 案例现场照片：单文件版必须自包含，照片以 data URI 内嵌，不依赖外部 public/photos */
const PHOTODIR = path.join(B, 'public', 'photos');
const OPTDIR = path.join(B, 'dist-single', '.photo_opt');
let FFMPEG = null;
function ffmpegBin() {
  if (FFMPEG !== null) return FFMPEG;
  FFMPEG = '';
  const cands = ['ffmpeg'];
  const local = process.env.LOCALAPPDATA || '';
  if (local) {
    const pk = path.join(local, 'Microsoft', 'WinGet', 'Packages');
    try {
      fs.readdirSync(pk).forEach(function (d) {
        if (/ffmpeg/i.test(d)) {
          const b1 = path.join(pk, d, 'bin', 'ffmpeg.exe');
          if (fs.existsSync(b1)) cands.push(b1);
          const b2 = path.join(pk, d, 'ffmpeg-9.0.2-full_build', 'bin', 'ffmpeg.exe');
          if (fs.existsSync(b2)) cands.push(b2);
        }
      });
    } catch (e) { /* 忽略：找不到就用原图 */ }
  }
  for (let i = 0; i < cands.length; i++) {
    try {
      require('child_process').execFileSync(cands[i], ['-version'], { stdio: 'ignore' });
      FFMPEG = cands[i];
      break;
    } catch (e) { /* 试下一个 */ }
  }
  return FFMPEG;
}
/* 单文件版压缩副本：宽度上限 1200px、q:v 5；ffmpeg 不可用时直接用原图 */
function photoBytes(slug, file, srcFile) {
  const bin = ffmpegBin();
  if (!bin) return fs.readFileSync(srcFile);
  const outDir = path.join(OPTDIR, slug);
  const out = path.join(outDir, file);
  try {
    if (fs.existsSync(out) &&
        fs.statSync(out).mtimeMs >= fs.statSync(srcFile).mtimeMs) {
      return fs.readFileSync(out);
    }
    fs.mkdirSync(outDir, { recursive: true });
    require('child_process').execFileSync(bin, ['-hide_banner', '-loglevel', 'error', '-y',
      '-i', srcFile, '-vf', "scale='min(1200,iw)':-2", '-q:v', '5', '-frames:v', '1', out]);
    return fs.readFileSync(out);
  } catch (e) {
    try { return fs.readFileSync(out); } catch (e2) { return fs.readFileSync(srcFile); }
  }
}
function photoList(e) {
  const ps = (Array.isArray(e.photos) ? e.photos : []).filter(function (p) { return p && p.src; });
  if (!ps.length) return [];
  const out = [];
  ps.forEach(function (p) {
    const file = p.file || String(p.src).split('/').pop();
    const srcFile = path.join(PHOTODIR, e.slug, file);
    if (!fs.existsSync(srcFile)) return;
    const buf = photoBytes(e.slug, file, srcFile);
    out.push({
      src: 'data:image/jpeg;base64,' + buf.toString('base64'),
      orig: p.orig || '', w: p.w || 0, h: p.h || 0
    });
  });
  return out;
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
    photos: photoList(e),
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
  'photo_entries=' + entries.filter(function (e) { return e.photos && e.photos.length; }).length,
  'photo_count=' + entries.reduce(function (n, e) { return n + (e.photos ? e.photos.length : 0); }, 0),
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


