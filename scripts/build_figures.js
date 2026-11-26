'use strict';
/* 案例自绘图示生成器
   输出：public/figures/<slug>.loc.svg   区位示意图（仅限有核验坐标的条目）
         public/figures/<slug>.info.svg  档案信息图（全部案例条目）
   数据来源：站内已核验条目字段 + Natural Earth 1:110m 国界图层 + UNESCO 名录公布坐标
   约束：全部本地自绘，不抓取、不再分发外部照片；无坐标条目不生成区位示意图、不标注到地图 */
const fs = require('fs');
const path = require('path');
const db = require('../src/db.js');

const B = path.join(__dirname, '..');
const OUT = path.join(B, 'public', 'figures');
const AMP = String.fromCharCode(38);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const QQ = String.fromCharCode(34);
const NL = String.fromCharCode(10);
let polys = [];

function xesc(s) {
  return String(s == null ? '' : s).split(AMP).join('&amp;').split(LT).join('&lt;')
    .split(GT).join('&gt;').split(QQ).join('&quot;');
}
function proj(la, lo) { return [(lo + 180) / 360 * 1000, (90 - la) / 180 * 500]; }
function r1(n) { return Math.round(n * 10) / 10; }

/* ---- SVG path 解析：M/L/H/V/Z，子路径独立成多边形 ---- */
function tokenizePaths(d) {
  const toks = String(d || '').match(/[A-Za-z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
  const subs = []; let cur = null; let cmd = 'M'; let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    if (/^[A-Za-z]$/.test(t)) {
      cmd = t.toUpperCase(); i++;
      if (cmd === 'Z') cur = null;
      continue;
    }
    if (cmd === 'M') {
      const x = parseFloat(toks[i++]); const y = parseFloat(toks[i++]);
      cur = [[x, y]]; subs.push(cur); cmd = 'L'; continue;
    }
    if (cmd === 'L') {
      const x = parseFloat(toks[i++]); const y = parseFloat(toks[i++]);
      if (cur) cur.push([x, y]); continue;
    }
    if (cmd === 'H') {
      const x = parseFloat(toks[i++]);
      if (cur) cur.push([x, cur[cur.length - 1][1]]); continue;
    }
    if (cmd === 'V') {
      const y = parseFloat(toks[i++]);
      if (cur) cur.push([cur[cur.length - 1][0], y]); continue;
    }
    i++;
  }
  return subs;
}

/* ---- Sutherland-Hodgman 矩形裁剪 ---- */
function clipPoly(poly, x0, y0, x1, y1) {
  const edges = [
    [function (p) { return p[0] >= x0; },
     function (a, b) { if (b[0] === a[0]) return [x0, a[1]]; return [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]; }],
    [function (p) { return p[0] <= x1; },
     function (a, b) { if (b[0] === a[0]) return [x1, a[1]]; return [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]; }],
    [function (p) { return p[1] >= y0; },
     function (a, b) { if (b[1] === a[1]) return [a[0], y0]; return [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]; }],
    [function (p) { return p[1] <= y1; },
     function (a, b) { if (b[1] === a[1]) return [a[0], y1]; return [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]; }]
  ];
  let out = poly;
  for (let e = 0; e < edges.length; e++) {
    const ins = edges[e][0]; const inter = edges[e][1];
    const input = out; out = [];
    if (!input.length) break;
    let prev = input[input.length - 1];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const ci = ins(cur); const pi = ins(prev);
      if (ci) { if (!pi) out.push(inter(prev, cur)); out.push(cur); }
      else if (pi) out.push(inter(prev, cur));
      prev = cur;
    }
  }
  return out;
}

function decimate(pts, minDist) {
  if (pts.length < 4) return pts;
  const out = [pts[0]]; let lx = pts[0][0]; let ly = pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]; const dx = p[0] - lx; const dy = p[1] - ly;
    if (dx * dx + dy * dy >= minDist * minDist) { out.push(p); lx = p[0]; ly = p[1]; }
  }
  const last = pts[pts.length - 1]; const lo = out[out.length - 1];
  if (lo[0] !== last[0] || lo[1] !== last[1]) out.push(last);
  return out;
}

/* ---- 文本折行（中文按字折行，避让行首标点） ---- */
const NO_HEAD = '，。、；：）」》！？·…';
function wrapText(s, max) {
  const arr = String(s == null ? '' : s).split('');
  const out = []; let cur = '';
  for (let i = 0; i < arr.length; i++) {
    cur += arr[i];
    if (cur.length >= max && NO_HEAD.indexOf(arr[i + 1] || '') < 0) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out;
}

const TYPE_WORDS = ['工业遗产', '工业遗址', '历史文化街区', '历史街区', '历史文化名城',
  '历史建筑', '传统村落', '古村落', '不可移动文物', '文物保护单位', '工业厂房',
  '老旧厂房', '滨水工业', '矿区', '厂房', '旧址', '纪念馆', '文化公园', '产业园'];

function main() {
  const basemap = JSON.parse(fs.readFileSync(path.join(B, 'data', 'world_paths.json'), 'utf8'));
  const whMap = JSON.parse(fs.readFileSync(path.join(B, 'data', 'wh_map.json'), 'utf8'));
  let zhNames = {};
  try { zhNames = JSON.parse(fs.readFileSync(path.join(B, 'data', 'wh_zh_names.json'), 'utf8')); } catch (e) { zhNames = {}; }
  const whById = {};
  whMap.forEach(function (p) { whById[String(p.id)] = p; });

  polys = [];
  (basemap.paths || []).forEach(function (p) {
    tokenizePaths(p.d).forEach(function (sub) {
      if (sub.length >= 3) polys.push(sub);
    });
  });

  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const cases = db.listEntries({ type: 'case', limit: 2000 }).filter(function (e) { return e.visibility === 'public'; });
  const manifest = {};
  let locCount = 0; let infoCount = 0; let totalBytes = 0;

  cases.forEach(function (e) {
    const slug = e.slug;
    const whInfo = e.wh_id ? whById[String(e.wh_id)] : null;
    const zhName = (e.wh_id && zhNames[String(e.wh_id)] && zhNames[String(e.wh_id)].n) ? zhNames[String(e.wh_id)].n : '';
    const siteName = zhName || (whInfo && whInfo.n) || e.title;

    /* ---------- 档案信息图 ---------- */
    const heritageType = (e.themes || []).filter(function (t) { return TYPE_WORDS.indexOf(t) >= 0; }).join('、');
    const info = buildInfo(e, heritageType, whInfo, slug);
    fs.writeFileSync(path.join(OUT, slug + '.info.svg'), info, 'utf8');
    infoCount++; totalBytes += Buffer.byteLength(info);
    manifest[slug] = { info: true, loc: false };

    /* ---------- 区位示意图 ---------- */
    if (e.lat != null && e.lon != null && e.lat !== '' && e.lon !== '') {
      const loc = buildLoc(e, siteName, whInfo, slug);
      if (loc) {
        fs.writeFileSync(path.join(OUT, slug + '.loc.svg'), loc, 'utf8');
        locCount++; totalBytes += Buffer.byteLength(loc);
        manifest[slug].loc = true;
      }
    }
  });

  fs.writeFileSync(path.join(B, 'data', 'figures.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), cases: cases.length, loc: locCount, info: infoCount, files: manifest }, null, 2), 'utf8');
  console.log('figures: cases=' + cases.length + ' info=' + infoCount + ' loc=' + locCount +
    ' bytes=' + totalBytes + ' out=' + OUT);
}

/* ================= 区位示意图 ================= */
function buildLoc(entry, siteName, whInfo, slug) {
  const la = Number(entry.lat); const lo = Number(entry.lon);
  if (!isFinite(la) || !isFinite(lo)) return null;
  const c = proj(la, lo);
  const UNIT = 1000 / 360;
  let winLon = 8; let winLat = 5; let chosen = null;
  for (let a = 0; a < 6; a++) {
    const x0 = c[0] - winLon * UNIT; const x1 = c[0] + winLon * UNIT;
    const y0 = c[1] - winLat * UNIT; const y1 = c[1] + winLat * UNIT;
    const paths = [];
    for (let i = 0; i < polys.length; i++) {
      const cl = clipPoly(polys[i], x0, y0, x1, y1);
      if (cl.length >= 3) paths.push(decimate(cl, 0.9));
    }
    if (paths.length) { chosen = { x0: x0, x1: x1, y0: y0, y1: y1, paths: paths, winLon: winLon, winLat: winLat }; break; }
    winLon *= 2; winLat *= 2;
  }
  if (!chosen) return null;

  const W = 720; const H = 500; const PL = 40; const PR = 40; const PT = 34; const PB = 76;
  const plotW = W - PL - PR; const plotH = H - PT - PB;
  const spanX = chosen.x1 - chosen.x0; const spanY = chosen.y1 - chosen.y0;
  const k = Math.min(plotW / spanX, plotH / spanY);
  const offX = PL + (plotW - spanX * k) / 2; const offY = PT + (plotH - spanY * k) / 2;
  const PX = function (x) { return r1(offX + (x - chosen.x0) * k); };
  const PY = function (y) { return r1(offY + (y - chosen.y0) * k); };
  const clipId = 'pl-' + slug;

  const land = chosen.paths.map(function (pts) {
    let d = 'M';
    for (let i = 0; i < pts.length; i++) {
      d += (i ? ' L' : '') + PX(pts[i][0]) + ' ' + PY(pts[i][1]);
    }
    return d + ' Z';
  }).join(' ');

  const grat = [];
  for (let lon = -180 + Math.ceil((chosen.x0 / UNIT) / 30) * 30; lon <= 180; lon += 30) {
    const x = PX((lon + 180) * UNIT);
    grat.push('<line x1="' + r1(x) + '" y1="' + PT + '" x2="' + r1(x) + '" y2="' + r1(PT + plotH) + '"/>');
  }
  for (let lat = 90 - Math.ceil((chosen.y0 / UNIT) / 30) * 30; lat >= -90; lat -= 30) {
    const y = PY((90 - lat) * UNIT);
    grat.push('<line x1="' + PL + '" y1="' + r1(y) + '" x2="' + r1(PL + plotW) + '" y2="' + r1(y) + '"/>');
  }

  const mx = PX(c[0]); const my = PY(c[1]);
  const label = String(siteName || entry.title).slice(0, 14);
  const boxW = 26 + label.length * 13;
  let boxX = mx + 16; if (boxX + boxW > PL + plotW) boxX = mx - 16 - boxW;
  let boxY = my - 44; if (boxY < PT + 4) boxY = my + 18;

  const scalePx = 5 * UNIT * k;
  const cap1 = xesc(entry.title) + (entry.region ? ' · ' + xesc(entry.region) : '') +
    ' · 名录坐标 ' + la.toFixed(4) + ', ' + lo.toFixed(4) +
    (whInfo && whInfo.y ? ' · ' + xesc(String(whInfo.y)) + ' 年列入' : '');
  const cap2 = '自绘区位示意图 · 底图 Natural Earth 1:110m 国界图层 · 标注点为《世界遗产名录》公布坐标，不代表保护地范围、管理权或所有权 · 非现场照片';

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + xesc(entry.title + ' 区位示意图') + '">'
    + '<defs><clipPath id="' + clipId + '"><rect x="' + PL + '" y="' + PT + '" width="' + plotW + '" height="' + plotH + '"/></clipPath></defs>'
    + '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#f6f2e9"/>'
    + '<g clip-path="url(#' + clipId + ')">'
    + '<g class="grat" stroke="#ddd4c2" stroke-width="1">' + grat.join('') + '</g>'
    + '<g class="land" fill="#eae2d1" stroke="#c2b699" stroke-width="1">' + land + '</g>'
    + '</g>'
    + '<rect x="' + PL + '" y="' + PT + '" width="' + plotW + '" height="' + plotH + '" fill="none" stroke="#d5cbb6" stroke-width="1"/>'
    + '<g class="marker">'
    + '<circle cx="' + mx + '" cy="' + my + '" r="17" fill="none" stroke="#9c3b2b" stroke-width="1.2" stroke-dasharray="3 3"/>'
    + '<circle cx="' + mx + '" cy="' + my + '" r="5.5" fill="#9c3b2b" stroke="#fffdf8" stroke-width="1.4"/>'
    + '<line x1="' + r1(mx - 26) + '" y1="' + my + '" x2="' + r1(mx - 19) + '" y2="' + my + '" stroke="#9c3b2b" stroke-width="1.2"/>'
    + '<line x1="' + r1(mx + 19) + '" y1="' + my + '" x2="' + r1(mx + 26) + '" y2="' + my + '" stroke="#9c3b2b" stroke-width="1.2"/>'
    + '<line x1="' + mx + '" y1="' + r1(my - 26) + '" x2="' + mx + '" y2="' + r1(my - 19) + '" stroke="#9c3b2b" stroke-width="1.2"/>'
    + '<line x1="' + mx + '" y1="' + r1(my + 19) + '" x2="' + mx + '" y2="' + r1(my + 26) + '" stroke="#9c3b2b" stroke-width="1.2"/>'
    + '<rect x="' + r1(boxX) + '" y="' + r1(boxY) + '" width="' + r1(boxW) + '" height="26" rx="2" fill="#fffdf8" stroke="#9c3b2b" stroke-width="1"/>'
    + '<text x="' + r1(boxX + 13) + '" y="' + r1(boxY + 18) + '" font-size="14" fill="#171614" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + xesc(label) + '</text>'
    + '</g>'
    + '<g class="scale">'
    + '<line x1="' + r1(PL + plotW - scalePx - 12) + '" y1="' + r1(PT + plotH - 16) + '" x2="' + r1(PL + plotW - 12) + '" y2="' + r1(PT + plotH - 16) + '" stroke="#171614" stroke-width="1.6"/>'
    + '<line x1="' + r1(PL + plotW - scalePx - 12) + '" y1="' + r1(PT + plotH - 20) + '" x2="' + r1(PL + plotW - scalePx - 12) + '" y2="' + r1(PT + plotH - 12) + '" stroke="#171614" stroke-width="1.6"/>'
    + '<line x1="' + r1(PL + plotW - 12) + '" y1="' + r1(PT + plotH - 20) + '" x2="' + r1(PL + plotW - 12) + '" y2="' + r1(PT + plotH - 12) + '" stroke="#171614" stroke-width="1.6"/>'
    + '<text x="' + r1(PL + plotW - scalePx / 2 - 12) + '" y="' + r1(PT + plotH - 24) + '" font-size="11" fill="#757066" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif">约 550 km</text>'
    + '</g>'
    + '<text x="' + PL + '" y="' + r1(PT + plotH + 24) + '" font-size="13" fill="#171614" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + cap1 + '</text>'
    + '<text x="' + PL + '" y="' + r1(PT + plotH + 44) + '" font-size="11" fill="#757066" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + cap2 + '</text>'
    + '<text x="' + PL + '" y="' + r1(PT + plotH + 62) + '" font-size="11" fill="#9c3b2b" font-family="PingFang SC, Microsoft YaHei, sans-serif">本站自绘示意资产（示意性区位，非现场照片 / 非历史影像）</text>'
    + '</svg>';
}

/* ================= 档案信息图 ================= */
function buildInfo(entry, heritageType, whInfo, slug) {
  const W = 720; const H = 500;
  const parts = [];
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + xesc(entry.title + ' 档案信息图') + '">');
  parts.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fffdf8"/>');
  parts.push('<rect x="0" y="0" width="' + W + '" height="6" fill="#171614"/>');
  parts.push('<rect x="0" y="0" width="6" height="' + H + '" fill="#9c3b2b"/>');

  const tx = 34;
  parts.push('<rect x="' + tx + '" y="34" width="46" height="22" rx="2" fill="#9c3b2b"/>');
  parts.push('<text x="' + (tx + 23) + '" y="50" font-size="13" fill="#fffdf8" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif">案例</text>');
  parts.push('<text x="' + (tx + 58) + '" y="50" font-size="12" fill="#757066" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + xesc(entry.status || '实践报道') + (entry.publish_date ? ' · ' + xesc(entry.publish_date) : '') + '</text>');

  const titleLines = wrapText(entry.title, 22).slice(0, 2);
  titleLines.forEach(function (ln, i) {
    parts.push('<text x="' + tx + '" y="' + (86 + i * 28) + '" font-size="22" fill="#171614" font-family="Songti SC, SimSun, serif">' + xesc(ln) + '</text>');
  });
  const topY = 86 + titleLines.length * 28;

  const cells = [
    ['所在地区', entry.region || '—'],
    ['行政层级', entry.level || '—'],
    ['遗产类型', heritageType || '正文未单列'],
    ['效力状态', entry.status || '—'],
    ['发布机构', entry.issuer || entry.source_name || '—'],
    ['资料来源', entry.source_name || '—']
  ];
  const cw = 218; const chh = 62; const gx = 20; const gy = 16;
  cells.forEach(function (cell, i) {
    const col = i % 3; const row = Math.floor(i / 3);
    const cx = tx + col * (cw + gx); const cy = topY + 6 + row * (chh + gy);
    parts.push('<rect x="' + cx + '" y="' + cy + '" width="' + cw + '" height="' + chh + '" fill="#f6f2e9" stroke="#e6dfd0" stroke-width="1"/>');
    parts.push('<text x="' + (cx + 14) + '" y="' + (cy + 22) + '" font-size="11" fill="#757066" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + xesc(cell[0]) + '</text>');
    const vs = wrapText(cell[1], 13).slice(0, 2);
    vs.forEach(function (ln, i) {
      parts.push('<text x="' + (cx + 14) + '" y="' + (cy + 44 + i * 17) + '" font-size="14" fill="#171614" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + xesc(ln) + '</text>');
    });
  });

  const gridY = topY + 6 + 2 * (chh + gy) + 4;
  const whTxt = entry.wh_id
    ? (whInfo ? (whInfo.n || '') + (whInfo.c ? ' · ' + whInfo.c : '') + (whInfo.y ? ' · ' + whInfo.y + ' 年列入' : '') : String(entry.wh_id))
    : '未核验名录编号（未纳入全球遗产地图标注）';
  parts.push('<rect x="' + tx + '" y="' + gridY + '" width="' + (cw * 3 + gx * 2) + '" height="46" fill="#fffdf8" stroke="#9c3b2b" stroke-width="1"/>');
  parts.push('<text x="' + (tx + 14) + '" y="' + (gridY + 19) + '" font-size="11" fill="#9c3b2b" font-family="PingFang SC, Microsoft YaHei, sans-serif">《世界遗产名录》对应编号</text>');
  const whLines = wrapText(whTxt, 40).slice(0, 1);
  parts.push('<text x="' + (tx + 14) + '" y="' + (gridY + 37) + '" font-size="13" fill="#171614" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + xesc(whLines[0] || '—') + '</text>');

  const chipY = gridY + 60;
  const themes = (entry.themes || []).slice(0, 6);
  let chipX = tx;
  parts.push('<text x="' + tx + '" y="' + (chipY + 13) + '" font-size="11" fill="#757066" font-family="PingFang SC, Microsoft YaHei, sans-serif">主题标签</text>');
  chipX = tx + 58;
  themes.forEach(function (t) {
    const w = 14 + String(t).length * 12;
    if (chipX + w > W - 30) return;
    parts.push('<rect x="' + chipX + '" y="' + chipY + '" width="' + w + '" height="22" rx="11" fill="#efe9dc" stroke="#ddd4c2" stroke-width="1"/>');
    parts.push('<text x="' + (chipX + w / 2) + '" y="' + (chipY + 15) + '" font-size="12" fill="#3c382f" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + xesc(t) + '</text>');
    chipX += w + 8;
  });

  const fy = H - 54;
  parts.push('<line x1="' + tx + '" y1="' + fy + '" x2="' + (W - 34) + '" y2="' + fy + '" stroke="#e6dfd0" stroke-width="1"/>');
  parts.push('<text x="' + tx + '" y="' + (fy + 20) + '" font-size="11" fill="#757066" font-family="PingFang SC, Microsoft YaHei, sans-serif">本站自绘档案信息图 · 依据站内已核验字段生成 · 非现场照片 / 非历史影像</text>');
  parts.push('<text x="' + tx + '" y="' + (fy + 38) + '" font-size="11" fill="#9c3b2b" font-family="PingFang SC, Microsoft YaHei, sans-serif">字段口径：发布机关、日期、层级、地区、主题标签与名录编号均取自站内条目记录</text>');
  parts.push('</svg>');
  return parts.join('');
}

main();
