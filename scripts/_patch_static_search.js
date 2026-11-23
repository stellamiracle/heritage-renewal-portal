/* 构建后补丁：静态站补客户端检索层 + 修正表单绝对路径 + 生成 sitemap.xml
   用法：node scripts/_patch_static_search.js   （需在 build_static.js 之后执行） */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PUB = path.join(ROOT, "publish");
const SITE = "https://stellamiracle.github.io/heritage-renewal-portal";
const Q = String.fromCharCode(39);
const NL = String.fromCharCode(10);

function read(p) { return fs.readFileSync(p, "utf8"); }
function write(p, s) { fs.writeFileSync(p, s, "utf8"); }

/* 1. canonical 检索脚本 -> publish/public/search.js */
const dst = path.join(PUB, "public", "search.js");
fs.mkdirSync(path.dirname(dst), { recursive: true });
write(dst, read(path.join(__dirname, "static_search.js")));

/* 2. 静态页：表单 action 由绝对路径改相对路径；注入检索脚本 */
const pages = ["index.html", "browse/index.html", "browse/page-2.html", "browse/page-3.html"];
const changed = [];
pages.forEach(function (rel) {
  const p = path.join(PUB, rel);
  if (!fs.existsSync(p)) { console.log("SKIP missing " + rel); return; }
  const inBrowse = rel.indexOf("browse/") === 0;
  let s = read(p);
  const before = s;
  s = s.split("action=\"/browse\"").join("action=\"" + (inBrowse ? "index.html" : "browse/index.html") + "\"");
  const tag = "<script src=\"" + (inBrowse ? "../public/search.js" : "public/search.js") + "\"></script>";
  if (s.indexOf("public/search.js") < 0) {
    s = s.indexOf("</body>") >= 0 ? s.replace("</body>", tag + NL + "</body>") : s + NL + tag;
  }
  if (s !== before) { write(p, s); changed.push(rel); }
});

/* 3. 首页 app.js：/browse?q= 绝对路径在项目子路径下会跳到域名根 */
const appJs = path.join(PUB, "public", "app.js");
if (fs.existsSync(appJs)) {
  let s = read(appJs);
  const before = s;
  s = s.split(Q + "/browse?q=" + Q).join(Q + "browse/index.html?q=" + Q);
  if (s !== before) { write(appJs, s); changed.push("public/app.js"); }
}

/* 4. sitemap.xml + robots.txt */
let entries = [];
try {
  entries = JSON.parse(read(path.join(PUB, "data", "entries.json"))).entries || [];
} catch (e) { console.log("WARN entries.json 解析失败: " + e.message); }
let events = [];
try {
  events = JSON.parse(read(path.join(PUB, "data", "events.json"))).events || [];
} catch (e) { console.log("WARN events.json 解析失败: " + e.message); }
const urls = ["/", "/browse/index.html", "/guide/index.html", "/about/index.html", "/map/index.html", "/events/index.html"].concat(
  entries.map(function (e) { return "/entry/" + (e.slug || e.id) + ".html"; }),
  events.map(function (e) { return "/events/" + e.slug + ".html"; }));
const today = new Date().toISOString().slice(0, 10);
const xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + NL
  + "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">" + NL
  + urls.map(function (u) { return "  <url><loc>" + SITE + u + "</loc><lastmod>" + today + "</lastmod></url>"; }).join(NL)
  + NL + "</urlset>" + NL;
write(path.join(PUB, "sitemap.xml"), xml);

const robotsPath = path.join(PUB, "robots.txt");
if (fs.existsSync(robotsPath)) {
  let s = read(robotsPath);
  if (s.indexOf("Sitemap:") < 0) {
    write(robotsPath, s.replace(/\s+$/, "") + NL + "Sitemap: " + SITE + "/sitemap.xml" + NL);
    changed.push("robots.txt");
  }
}

console.log("PATCHED: " + (changed.length ? changed.join(", ") : "(无变更)"));
console.log("SITEMAP_URLS: " + urls.length);
