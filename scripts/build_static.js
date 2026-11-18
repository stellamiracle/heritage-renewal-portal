const fs = require('fs');
const path = require('path');
const db = require('../src/db.js');
const views = require('../src/views.js');
const BASE = path.resolve(__dirname, '..');
const DIST = path.join(BASE, 'dist');

function mkdirp(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
function write(rel, content) {
  const p = path.join(DIST, rel);
  mkdirp(path.dirname(p));
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

function rewrite(html) {
  let s = html;
  /* 带查询串的 /browse 链接：拆出 page，其余参数必须保留
     （主题链接 ?theme=xxx 若被丢弃，落地页就丢失筛选条件） */
  s = s.replace(/href="\/browse\?[^"]*"/g, function (m) {
    const q = m.slice(m.indexOf('?') + 1, m.length - 1);
    const params = q.split('&').filter(Boolean);
    let page = '';
    const rest = [];
    params.forEach(function (p) {
      const kv = p.split('=');
      if (kv[0] === 'page') page = kv[1];
      else rest.push(p);
    });
    const tail = rest.length ? '?' + rest.join('&') : '';
    if (!page || page === '1') {
      return 'href="/browse/index.html' + tail + '"';
    }
    return 'href="/browse/page-' + page + '.html' + tail + '"';
  });
  s = s.replace(/href="\/browse"/g, 'href="/browse/index.html"');
  s = s.replace(/href="\/about"/g, 'href="/about/index.html"');
  s = s.replace(/href="\/guide"/g, 'href="/guide/index.html"');
  s = s.replace(/href="\/entry\/([^"?#]+)"/g,
    function (m, slug) { return 'href="/entry/' + slug + '.html"'; });
  s = s.replace(/href="\/"/g, 'href="/index.html"');
  /* 表单 action：静态站没有服务端，统一指向静态检索页 */
  s = s.replace(/action="\/browse"/g, 'action="/browse/index.html"');
  /* 静态站不发布后台，移除后台入口，避免公开站出现 404 链接 */
  s = s.replace(/<a class="admin-link"[^>]*>管理后台<\/a>/g, '');
  return s;
}

function latestDate() {
  const st = db.stats();
  return (st.latest && st.latest.publish_date) || '';
}

function main() {
  mkdirp(DIST);
  const st = db.stats();
  const facets = db.facets();
  const hot = db.listEntries({ limit: 8, sort: 'date_desc' });
  write('index.html', rewrite(views.homePage({
    stats: st, facets: facets, hot: hot, q: '', updated: latestDate()
  })));
  write('about/index.html', rewrite(views.aboutPage({
    total: st.total, updated: latestDate()
  })));
  write('guide/index.html', rewrite(views.guidePage({
    total: st.total, updated: latestDate(),
    facets: facets, themeCounts: facets.themeCounts || {}
  })));
  const per = 20;
  const total = db.countEntries({ limit: 2000 });
  const pages = Math.max(1, Math.ceil(total / per));
  for (let p = 1; p <= pages; p++) {
    const q = p === 1 ? {} : { page: String(p) };
    const f = {
      type: '', q: '', level: '', region: '', status: '', theme: '',
      from: '', to: '', sort: 'date_desc', limit: per, offset: (p - 1) * per
    };
    const entries = db.listEntries(f);
    const html = views.browsePage({
      entries: entries, total: total, page: p, per: per, query: q,
      facets: facets, themeCounts: facets.themeCounts || {},
      updated: latestDate()
    });
    const name = p === 1 ? 'browse/index.html' : 'browse/page-' + p + '.html';
    write(name, rewrite(html));
  }
  const all = db.listEntries({ limit: 2000, sort: 'date_desc' });
  all.forEach(function (e) {
    if (e.visibility !== 'public') return;
    const related = db.listEntries({ type: e.type, limit: 8 })
      .filter(function (x) { return x.id !== e.id; }).slice(0, 5);
    write('entry/' + e.slug + '.html', rewrite(views.detailPage({
      entry: e, related: related, total: st.total, updated: latestDate()
    })));
  });
  write('data/entries.json', JSON.stringify({
    generated_at: new Date().toISOString(), count: all.length, entries: all
  }, null, 2));
  mkdirp(path.join(DIST, 'public'));
  fs.copyFileSync(path.join(BASE, 'public', 'style.css'),
    path.join(DIST, 'public', 'style.css'));
  fs.copyFileSync(path.join(BASE, 'public', 'app.js'),
    path.join(DIST, 'public', 'app.js'));
  write('robots.txt', 'User-agent: *' + String.fromCharCode(10) +
    'Allow: /' + String.fromCharCode(10));
  console.log('static build done: pages=' + pages +
    ' entries=' + all.length +
    ' dist=' + DIST);
}

main();