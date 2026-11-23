const fs = require('fs');
const path = require('path');
const db = require('../src/db.js');
const views = require('../src/views.js');
const evdb = require('../src/db_events.js');
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
  s = s.replace(/href="\/map"/g, 'href="/map/index.html"');
  s = s.replace(/href="\/events\/([^"?#]+)"/g, function (m, slug) {
    return slug === 'index.html' ? m : 'href="/events/' + slug + '.html"';
  });
  s = s.replace(/href="\/events"/g, 'href="/events/index.html"');
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
  st.events = evdb.countEvents();
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
  /* 全球遗产地图：底图路径静态内嵌，点位数据单独输出供客户端筛选 */
  const whRaw = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'wh_map.json'), 'utf8'));
  /* 中文名叠加：wh_zh_names.json 为经核验的权威中文名，缺失时回退原名 */
  let zhNames = {};
  try { zhNames = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'wh_zh_names.json'), 'utf8')); } catch (e) { zhNames = {}; }
  let zhApplied = 0;
  const whById = new Map();
  db.listEntries({ type: 'case', limit: 2000 }).forEach(function (e) {
    if (e.wh_id) whById.set(String(e.wh_id), e.slug);
  });
  const whPts = whRaw.map(function (p) {
    const c = String(p.c || '');
    return {
      id: p.id, n: (zhNames[p.id] && zhNames[p.id].n) ? zhNames[p.id].n : p.n, en: p.en, c: c, y: p.y, k: p.k, r: p.r, cr: p.cr, u: p.u,
      la: p.la, lo: p.lo,
      cn: c.indexOf('中国') >= 0 ? 1 : 0,
      s: whById.get(String(p.id)) || ''
    };
  });
  const mapStat = { total: whPts.length, cn: 0, cultural: 0, natural: 0, mixed: 0, linked: whById.size };
  whPts.forEach(function (p) {
    if (p.cn === 1) mapStat.cn += 1;
    if (p.k === 'Cultural') mapStat.cultural += 1;
    else if (p.k === 'Natural') mapStat.natural += 1;
    else if (p.k === 'Mixed') mapStat.mixed += 1;
  });
  const cnSites = whPts.filter(function (p) { return p.cn === 1; })
    .sort(function (a, b) { return String(b.y || '').localeCompare(String(a.y || '')) || String(a.n).localeCompare(String(b.n)); })
    .map(function (p) { return { id: p.id, n: p.n, en: p.en, state: p.c, y: p.y, cat: p.k, s: p.s }; });
  const basemap = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'world_paths.json'), 'utf8'));
  write('map/index.html', rewrite(views.mapPage({ basemap: basemap, stats: mapStat, cnSites: cnSites, updated: latestDate(), total: st.total })));
  write('data/wh_map.json', JSON.stringify(whPts));
  whPts.forEach(function (p) { if (zhNames[p.id] && zhNames[p.id].n === p.n) zhApplied++; });
  mapStat.zh = zhApplied;
  console.log('map build: points=' + whPts.length + ' cn=' + mapStat.cn + ' linked_cases=' + mapStat.linked + ' zh_names=' + zhApplied);
  /* 行业活动与培训：列表页 + 详情页 + 客户端日历数据 */
  const evAll = evdb.listEvents({});
  evAll.forEach(function (ev) { ev.status = evdb.liveStatus(ev); });
  const evFacets = evdb.eventFacets(evAll);
  write('events/index.html', rewrite(views.eventsIndexPage({
    events: evAll, facets: evFacets, total: st.total, updated: latestDate()
  })));
  evAll.forEach(function (ev) {
    const related = evAll.filter(function (x) {
      return x.slug !== ev.slug && (x.type === ev.type || x.region === ev.region);
    }).slice(0, 5);
    write('events/' + ev.slug + '.html', rewrite(views.eventDetailPage({
      event: ev, related: related, total: st.total, updated: latestDate()
    })));
  });
  write('data/events.json', JSON.stringify({
    generated_at: new Date().toISOString(), count: evAll.length, events: evAll
  }, null, 2));
  console.log('events build: count=' + evAll.length);
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
  fs.copyFileSync(path.join(BASE, 'public', 'map.js'),
    path.join(DIST, 'public', 'map.js'));
  fs.copyFileSync(path.join(BASE, 'public', 'map.css'),
    path.join(DIST, 'public', 'map.css'));
  fs.copyFileSync(path.join(BASE, 'public', 'events.js'),
    path.join(DIST, 'public', 'events.js'));
  write('robots.txt', 'User-agent: *' + String.fromCharCode(10) +
    'Allow: /' + String.fromCharCode(10));
  console.log('static build done: pages=' + pages +
    ' entries=' + all.length +
    ' events=' + evAll.length +
    ' dist=' + DIST);
}

main();