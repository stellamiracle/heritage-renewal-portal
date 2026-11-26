'use strict';
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..');
const PUB = path.join(B, 'publish');
function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.readdirSync(p, { withFileTypes: true }).forEach(function (d) {
    const f = path.join(p, d.name);
    if (d.isDirectory()) rmrf(f); else fs.unlinkSync(f);
  });
  fs.rmdirSync(p);
}
function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach(function (d) {
    const s = path.join(src, d.name);
    const t = path.join(dst, d.name);
    if (d.isDirectory()) copyTree(s, t);
    else fs.copyFileSync(s, t);
  });
}
function relativize(html, depth) {
  const up = depth === 0 ? '' : new Array(depth + 1).join('../');
  return html.split('href="/').join('href="' + up)
    .split('src="/').join('src="' + up)
    .split('action="/').join('action="' + up);
}
function walk(dir, depth) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    const f = path.join(dir, d.name);
    if (d.isDirectory()) walk(f, depth + 1);
    else if (/[.]html$/.test(d.name)) {
      const h = fs.readFileSync(f, 'utf8');
      fs.writeFileSync(f, relativize(h, depth), 'utf8');
    }
  });
}
rmrf(PUB);
copyTree(path.join(B, 'dist'), PUB);
// Pages 跳过 Jekyll 处理：每次重建后必须补回 .nojekyll（否则路径型资源 404）
fs.writeFileSync(path.join(PUB, '.nojekyll'), '', 'utf8');
walk(PUB, 0);
const singles = fs.readdirSync(path.join(B, 'dist-single'))
  .filter(function (n) { return /[.]html$/.test(n); }).sort();
const single = singles[singles.length - 1];
fs.mkdirSync(path.join(PUB, 'app'), { recursive: true });
fs.copyFileSync(path.join(B, 'dist-single', single),
  path.join(PUB, 'app', 'index.html'));
const idx = path.join(PUB, 'index.html');
let home = fs.readFileSync(idx, 'utf8');
const banner = '<div class="wrap" style="padding:12px 0 0">'
  + '<p style="margin:0 0 18px;font-weight:600">'
  + '<a href="app/index.html">打开完整检索版（支持全文搜索与组合筛选）→</a>'
  + '</p></div>';
if (home.indexOf('</body>') >= 0) {
  home = home.split('</body>').join(banner + '</body>');
  fs.writeFileSync(idx, home, 'utf8');
}
const SITE_HOME = 'https://stellamiracle.github.io/heritage-renewal-portal/';
fs.writeFileSync(path.join(PUB, '404.html'),
  '<!doctype html><html lang="zh-CN"><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<title>页面不存在 · 遗产保护与城市更新观察平台</title>'
  + '<body style="margin:0;background:#f7f5f0;color:#171614;'
  + 'font:15px/1.8 \'PingFang SC\',\'Microsoft YaHei\',sans-serif">'
  + '<div style="max-width:640px;margin:90px auto;padding:0 22px">'
  + '<p style="letter-spacing:.2em;font-size:11px;color:#9c3b28;font-weight:700">404 / NOT FOUND</p>'
  + '<h1 style="font-size:30px;margin:0 0 12px">页面不存在</h1>'
  + '<p style="color:#757066">该条目可能已下线、链接有误，或条目仍在待审队列中。</p>'
  + '<p style="margin-top:22px"><a href="' + SITE_HOME + '" '
  + 'style="display:inline-block;padding:10px 18px;background:#171614;color:#fff;'
  + 'text-decoration:none;border-radius:3px">返回首页</a></p>'
  + '</div></body></html>', 'utf8');
let files = 0;
let bytes = 0;
(function count(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    const f = path.join(dir, d.name);
    if (d.isDirectory()) count(f);
    else { files++; bytes += fs.statSync(f).size; }
  });
})(PUB);
const report = 'publish files=' + files + ' bytes=' + bytes
  + ' single=' + single + ' html=' + fs.readdirSync(PUB).join(',');
fs.writeFileSync(path.join(B, '_publish.txt'), report, 'utf8');
console.log(report);