'use strict';
const md = require('./md');
const mapMod = require('./views_map.js');
const evMod = require('./views_events.js');
const E = md.escapeHtml;
const NL = String.fromCharCode(10);

function attr(s) { return E(s == null ? '' : String(s)); }

function nav(current) {
  const items = [
    ['/', '首页', 'home'],
    ['/browse', '资料检索', 'browse'],
    ['/events', '行业活动', 'events'],
    ['/guide', '研究导览', 'guide'],
    ['/map', '全球遗产', 'map'],
    ['/about', '关于本站', 'about']
  ];
  return items.map(function (it) {
    const cls = it[2] === current ? ' class="active"' : '';
    return '<a href="' + it[0] + '"' + cls + '>' + it[1] + '</a>';
  }).join('');
}

function layout(o) {
  const title = o.title || '遗产保护与城市更新观察平台';
  const desc = o.desc || '遗产保护与城市更新观察平台：收录法规、政策、案例与动态，标注发布机关、发布日期与官方原文链接，可按地区、层级、主题与效力状态组合检索。';
  return [
  '<!DOCTYPE html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>' + E(title) + '</title>',
  '<meta name="description" content="' + E(desc) + '">',
  '<meta name="keywords" content="遗产保护,城市更新,历史文化名城,历史文化街区,历史建筑,工业遗产,文物保护,传统村落,法规,政策">',
  '<meta property="og:type" content="website">',
  '<meta property="og:title" content="' + E(title) + '">',
  '<meta property="og:description" content="' + E(desc) + '">',
  '<link rel="stylesheet" href="/public/style.css">',
  o.head || '',
  '</head><body>',
  '<div class="topbar"><div class="wrap">',
  '<span class="en">HERITAGE &amp; URBAN RENEWAL OBSERVATORY</span>',
  '<span class="meta">已公开条目 ' + (o.total == null ? 0 : o.total) + ' 条 · 数据更新 ' + E(o.updated || '') + '</span>',
  '</div></div>',
  '<header class="site-header"><div class="wrap">',
  '<a class="brand" href="/"><span class="brand-mark">遗</span>',
  '<span class="brand-text"><b>遗产保护与城市更新</b><i>观察平台 · Heritage &amp; Urban Renewal Observatory</i></span></a>',
  '<nav class="nav">' + nav(o.current || '') + '</nav>',
  '<a class="admin-link" href="/admin">管理后台</a>',
  '</div></header>',
  '<main class="wrap">' + (o.body || '') + '</main>',
  '<footer class="site-footer"><div class="wrap">',
  '<div class="foot-grid">',
  '<div><h3>资料性质</h3>',
  '<p>本站资料均以各发布机关官方网站公开文本为准，仅作资料汇编与检索之用，不构成法律意见、规划审批依据或投资建议。</p>',
  '<p class="muted">引用请以条目页「原文链接」所载官方文本为准。</p></div>',
  '<div><h3>版权与转载</h3>',
  '<p>条目保留原始发布机关署名与来源链接；正文著作权归原发布机关或作者所有，本站仅作索引、摘要与检索。</p></div>',
  '<div><h3>网站信息</h3>',
  '<p class="muted">条目总数 ' + (o.total == null ? 0 : o.total) + ' · 数据更新时间 ' + E(o.updated || '') + '</p>',
  '<p class="muted"><a href="/about/index.html">收录范围与工作流程</a> · <a href="/guide/index.html">研究导览</a> · <a href="/sitemap.xml">站点地图</a></p>',
  '<p class="muted">运营主体与备案信息待确定后公示。</p></div>',
  '</div>',
  '</div></footer>',
  '<script src="/public/app.js" defer></script>',
  '</body></html>',
  ].join(NL);
}

function statusBadge(s) {
  if (!s) return '';
  const map = {
    '现行有效': 'st-valid',
    '失效': 'st-void', '已废止': 'st-void', '已失效': 'st-void', '废止': 'st-void',
    '实施中': 'st-running',
    '动态': 'st-dyn',
    '实践报道': 'st-report',
    '入选典型案例': 'st-case'
  };
  return '<span class="badge ' + (map[s] || 'st-other') + '">' + E(s) + '</span>';
}

function caseFigure(e, mode) {
  if (!e || e.type !== 'case' || !e.slug) return '';
  const photos = (Array.isArray(e.photos) ? e.photos : []).filter(function (p) { return p && p.src; });
  if (mode === 'card') {
    if (photos.length) {
      const p0 = photos[0];
      return '<figure class="card-fig card-fig-photo"><img src="' + E(p0.src) + '" alt="' + E(e.title) +
        ' 现场照片（来源发布方）" loading="lazy"><figcaption>现场照片 · 来源：' +
        E(e.source_name || '原发布方') + '</figcaption></figure>';
    }
  }
  let photoSec = '';
  if (photos.length) {
    const items = photos.map(function (p, i) {
      const cap = '现场照片 ' + (i + 1) + ' / ' + photos.length + ' · 来源：' + (e.source_name || '原发布方');
      const link = p.orig ? '<a href="' + E(p.orig) + '" target="_blank" rel="noopener">原图链接</a>' : '';
      return '<figure class="fig photo"><a href="' + E(p.orig || p.src) + '" target="_blank" rel="noopener">' +
        '<img src="' + E(p.src) + '" alt="' + E(e.title) + ' 现场照片 ' + (i + 1) +
        '" loading="lazy"></a><figcaption>' + E(cap) + (link ? ' · ' + link : '') + '</figcaption></figure>';
    }).join('');
    photoSec = '<section class="figs photos"><h2>现场照片</h2>' +
      '<p class="fig-note">以下为来源发布方发布的现场照片，版权归原发布方/摄影者所有，本站仅作索引展示；点击可跳转原始链接。</p>' +
      '<div class="photo-grid">' + items + '</div></section>';
  }
  return mode === 'card' ? '' : photoSec;
}

function card(e) {
  const meta = [E(e.issuer || ''), e.doc_no ? E(e.doc_no) : ''].filter(Boolean).join(' · ');
  const theme = (e.themes || []).slice(0, 3).map(function (t) { return '<span class="chip">' + E(t) + '</span>'; }).join('');
  const src = e.source_name ? '<p class="src">来源：' + E(e.source_name) + '</p>' : '';
  const fig = caseFigure(e, 'card');
  return [
  '<article class="card">',
  fig,
  '<div class="card-top"><span class="tag tag-' + E(e.type) + '">' + E(e.type_label) + '</span>',
  statusBadge(e.status),
  (e.publish_date ? '<time>' + E(e.publish_date) + '</time>' : ''), '</div>',
  '<h3><a href="/entry/' + E(e.slug) + '">' + E(e.title) + '</a></h3>',
  (meta ? '<p class="meta">' + meta + '</p>' : ''),
  '<p class="summary">' + E(e.summary || '') + '</p>',
  (theme ? '<p class="chips">' + theme + '</p>' : ''),
  src,
  '</article>',
  ].join('');
}

function optionList(list, cur, allLabel) {
  let s = allLabel ? '<option value="">' + E(allLabel) + '</option>' : '';
  s += (list || []).map(function (x) {
    const sel = String(x) === String(cur) ? ' selected' : '';
    return '<option value="' + E(x) + '"' + sel + '>' + E(x) + '</option>';
  }).join('');
  return s;
}
const MODULES = [
  { keys: ['regulation', 'policy'], href: '/browse',
    title: '中国法规与政策库',
    desc: '国家法律、行政法规、部门规章与地方政策，按行政层级、地区、主题、效力状态与发布时间区间检索。',
    live: 'live', stateLabel: '已上线' },
  { keys: ['case'], href: '/browse?type=case',
    title: '遗产与更新案例库',
    desc: '统一案例档案：原始功能、更新功能、遗产类型、保护策略、更新模式与实施成效，逐条核验后入库。',
    live: 'partial', stateLabel: '部分上线' },
  { keys: ['news'], href: '/browse?type=news',
    title: '行业动态',
    desc: '官方发布与实施进展的持续跟踪，标注来源机构、发布日期、所属地区与主题标签。',
    live: 'partial', stateLabel: '部分上线' },
  { keys: [], href: '/events', countKey: 'event',
    title: '行业活动与培训',
    desc: '学术会议、行业论坛与专题峰会、工作坊与现场调研、专业培训与继续教育、展览与行业交流的时间地点档案，标注主办机构、参与方式与官方来源链接。',
    live: 'live', stateLabel: '已上线' },
  { keys: [], href: '/guide',
    title: '专题研究与主题导航',
    desc: '以主题标签串联跨类型资料，形成可检索、可对比、可回溯原文的研究专题入口。',
    live: 'live', stateLabel: '已上线' },
  { keys: [], href: null,
    title: 'AI 智能研究助手',
    desc: '由独立后端统一完成身份校验、频率与额度控制后调用模型，只依据站内已核验资料作答，关键结论回溯到具体条目与官方原文链接。',
    live: 'plan', stateLabel: '建设中' },
  { keys: [], href: '/map',
    title: '全球遗产与更新地图',
    desc: '以联合国教科文组织《世界遗产名录》为底账，遗产地按名录坐标可视化，可按遗产类型、所属区域与国别筛选，并回溯站内案例档案与官方页面。',
    live: 'live', stateLabel: '已上线' }
];

const GUIDE_QUERIES = [
  ['城市更新', '城市更新相关法规与政策', '相关法规、政策与实施机制'],
  ['工业遗产', '工业遗产与老旧厂房再利用', '老厂房改造、保护利用与活化政策'],
  ['历史文化名城', '历史文化名城与街区保护', '名城、名镇、名村、历史文化街区保护政策'],
  ['历史建筑', '历史建筑保护修缮与活化', '保护修缮、适应性再利用与开放利用规定'],
  ['传统村落', '传统村落与非物质文化遗产保护', '传统村落名录、活态传承与非遗保护措施'],
  ['城中村改造', '城中村改造与完整社区建设', '改造实施机制、时序安排与资金保障']
];

function homePage(d) {
  const f = d.facets || { counts: {} };
  const c = f.counts || {};
  const bt = (d.stats.byType) || {};
  const cat = [
    ['regulation', '法规', '法律、行政法规与部门规章原文索引'],
    ['policy', '政策', '规划、通知、意见、批复等政策文件'],
    ['case', '案例', '城市更新与遗产保护实践案例'],
    ['news', '动态', '权威发布与实施进展动态'],
  ];
  const catHtml = cat.map(function (x) {
    return '<a class="cat-card cat-' + x[0] + '" href="/browse?type=' + x[0] + '">' +
      '<span class="cat-num">' + (c[x[0]] || 0) + '</span>' +
      '<span class="cat-name">' + x[1] + '</span>' +
      '<span class="cat-desc">' + x[2] + '</span></a>';
  }).join('');
  const hot = (d.hot || []).map(card).join('');
  const mods = MODULES.map(function (m, i) {
    const no = ('0' + (i + 1)).slice(-2);
    const cnt = m.countKey === 'event'
      ? (d.stats.events || 0)
      : (m.keys || []).reduce(function (s, k) { return s + (bt[k] || 0); }, 0);
    const inner =
      '<span class="module-no">' + no + '</span>' +
      '<h3>' + E(m.title) + '</h3>' +
      '<p class="module-desc">' + E(m.desc) + '</p>' +
      '<p class="module-foot"><span class="mstate mstate-' + m.live + '">' + E(m.stateLabel) + '</span>' +
      (cnt ? '<span class="mcount">' + cnt + ' 条</span>' : '') +
      (m.href ? '<span class="module-go">进入 →</span>' : '') + '</p>';
    return m.href
      ? '<a class="module module-link" href="' + E(m.href) + '">' + inner + '</a>'
      : '<div class="module module-static">' + inner + '</div>';
  }).join('');
  const guide = GUIDE_QUERIES.map(function (g) {
    return '<a class="guide-q" href="/browse?q=' + encodeURIComponent(g[0]) + '">' +
      '<span class="guide-q-k">' + E(g[0]) + '</span>' +
      '<span class="guide-q-t">' + E(g[1]) + '</span>' +
      '<span class="guide-q-d">' + E(g[2]) + '</span></a>';
  }).join('');
  const body = [
  '<section class="hero">',
  '<div class="hero-grid">',
  '<div class="hero-main">',
  '<p class="kicker">HERITAGE &amp; URBAN RENEWAL OBSERVATORY</p>',
  '<h1 class="display">遗产保护与城市更新<br><span>观察平台</span></h1>',
  '<p class="lede">一个面向公众开放的遗产保护与城市更新专业资料平台。收录中央与地方机关公开发布的官方文本，标注发布机关、发布日期、文号与原文链接；案例与动态按统一档案字段建档，可按地区、层级、主题、效力状态与时间区间组合检索。</p>',
  '<form class="searchbar" action="/browse" method="get">',
  '<input type="search" name="q" placeholder="输入关键词：城市更新 / 文物保护 / 历史建筑 / 工业遗产 / 传统村落…" value="' + E(d.q || '') + '">',
  '<button type="submit">检索</button></form>',
  '<p class="hero-hint">检索覆盖标题、文号、发布机关、层级、地区、效力状态、主题标签与正文全文；命中关键词在结果中高亮显示。</p>',
  '</div>',
  '<aside class="hero-side">',
  '<h2 class="side-title">平台概览</h2>',
  '<ul class="stat-list">',
  '<li><b>' + (d.stats.total || 0) + '</b><span>已公开条目</span></li>',
  '<li><b>' + (bt.regulation || 0) + '</b><span>法规</span></li>',
  '<li><b>' + (bt.policy || 0) + '</b><span>政策</span></li>',
  '<li><b>' + (bt.case || 0) + '</b><span>案例</span></li>',
  '<li><b>' + (bt.news || 0) + '</b><span>动态</span></li>',
  '</ul>',
  '<p class="side-note">全部条目经人工核验字段与原文链接后公开；本站不提供用户上传与公开评论。</p>',
  '</aside>',
  '</div>',
  '</section>',
  '<section>',
  '<h2 class="section-title"><span class="sec-no">01</span>平台模块</h2>',
  '<p class="section-lede">平台按六个模块推进建设。标注「已上线」「部分上线」的模块可直接点击进入对应内容，「建设中」的模块说明建设方向，暂不提供功能入口。</p>',
  '<div class="module-grid">' + mods + '</div>',
  '</section>',
  '<section>',
  '<h2 class="section-title"><span class="sec-no">02</span>资料板块</h2>',
  '<div class="cats">' + catHtml + '</div>',
  '</section>',
  '<section>',
  '<h2 class="section-title"><span class="sec-no">03</span>研究导览</h2>',
  '<p class="section-lede">从常见研究问题出发的检索入口。每一项都直接落到可核验的官方文本，而不是概括性结论。</p>',
  '<div class="guide-list">' + guide + '</div>',
  '<p class="more-wrap"><a class="btn btn-ghost" href="/guide/index.html">查看完整研究导览 →</a></p>',
  '</section>',
  '<section>',
  '<h2 class="section-title"><span class="sec-no">04</span>最新收录</h2>',
  '<div class="grid">' + hot + '</div>',
  '<p class="more-wrap"><a class="btn btn-ghost" href="/browse">查看全部条目 →</a></p>',
  '</section>',
  ].join(NL);
  return layout({ title: '遗产保护与城市更新观察平台 · 公开资料库', body: body, current: 'home', total: d.stats.total, updated: d.updated });
}
function qsOf(q) {
  const parts = [];
  Object.keys(q || {}).forEach(function (k) {
    if (!q[k] || k === 'page') return;
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(q[k]));
  });
  return parts.join('&');
}

function pager(q, total, page, per) {
  const pages = Math.max(1, Math.ceil((total || 0) / per));
  if (pages <= 1) return '';
  const base = '/browse?' + qsOf(q);
  const mk = function (p, label, cls) {
    const s = p === page ? ' current' : '';
    return '<a class="page' + s + (cls || '') + '" href="' + base + '&page=' + p + '">' + label + '</a>';
  };
  let out = '<nav class="pager">';
  out += page > 1 ? mk(page - 1, '上一页', ' prev') : '<span class="page disabled">上一页</span>';
  const from = Math.max(1, page - 2);
  const to = Math.min(pages, from + 4);
  for (let i = from; i <= to; i++) out += mk(i, String(i));
  out += page < pages ? mk(page + 1, '下一页', ' next') : '<span class="page disabled">下一页</span>';
  out += '</nav>';
  return out;
}

function browsePage(d) {
  const f = d.facets || {};
  const q = d.query || {};
  const tabs = [['regulation', '法规'], ['policy', '政策'], ['case', '案例'], ['news', '动态']];
  const tabHtml = tabs.map(function (t) {
    const on = q.type === t[0] ? ' active' : '';
    const href = '/browse?type=' + t[0] + (q.q ? '&q=' + encodeURIComponent(q.q) : '');
    return '<a class="tab' + on + '" href="' + href + '">' + t[1] + '</a>';
  }).join('');
  const sortOpts = [['date_desc', '最新发布'], ['date_asc', '最早发布'], ['title', '按标题'], ['updated', '按更新时间']].map(function (s) {
    const sel = q.sort === s[0] ? ' selected' : '';
    return '<option value="' + s[0] + '"' + sel + '>' + s[1] + '</option>';
  }).join('');
  const form = [
  '<form class="filters" action="/browse" method="get">',
  '<input type="hidden" name="type" value="' + E(q.type || '') + '">',
  '<input class="f-q" type="search" name="q" value="' + E(q.q || '') + '" placeholder="关键词">',
  '<select name="level">' + optionList(f.levels, q.level, '全部层级') + '</select>',
  '<select name="region">' + optionList(f.regions, q.region, '全部地区') + '</select>',
  '<select name="theme">' + optionList(f.themes, q.theme, '全部主题') + '</select>',
  '<select name="status">' + optionList(f.statuses, q.status, '全部状态') + '</select>',
  '<input type="date" name="from" value="' + E(q.from || '') + '" placeholder="起始日期">',
  '<input type="date" name="to" value="' + E(q.to || '') + '" placeholder="截止日期">',
  '<select name="sort">' + sortOpts + '</select>',
  '<button class="btn" type="submit">筛选</button>',
  '<a class="btn btn-ghost" href="/browse">重置</a>',
  '</form>',
  ].join(NL);
  const list = (d.entries || []).map(card).join('');
  const tc = d.themeCounts || {};
  const topThemes = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; }).slice(0, 18);
  const themeCloud = topThemes.map(function (t) {
    return '<a class="tcloud-i" href="/browse?theme=' + encodeURIComponent(t) + '">' +
      E(t) + '<span>' + tc[t] + '</span></a>';
  }).join('');
  const body = [
  '<div class="result-head"><p class="kicker">ARCHIVE / SEARCH</p>',
  '<h1>资料检索</h1>',
  '<p class="muted">共 ' + (d.total || 0) + ' 条' + (q.q ? '，关键词「' + E(q.q) + '」' : '') + '</p></div>',
  '<div class="tabs">' + tabHtml + '</div>',
  form,
  '<div class="grid grid-list">' + (list || '<p class="empty">没有符合条件的条目，请调整筛选条件。</p>') + '</div>',
  pager(q, d.total || 0, d.page || 1, d.per || 20),
  '<section class="cloud-sec">',
  '<h2 class="section-title"><span class="sec-no">·</span>热门主题</h2>',
  '<p class="section-lede">主题标签由入库时人工归类，同一条目可挂多个主题，便于跨板块横向检索。</p>',
  '<div class="tcloud">' + (themeCloud || '<span class="muted">暂无主题统计</span>') + '</div>',
  '</section>',
  '<section class="note-sec">',
  '<h2 class="section-title"><span class="sec-no">·</span>检索说明</h2>',
  '<ul class="plain-bullets">',
  '<li><b>关键词</b>：匹配标题、文号、发布机关、行政层级、地区、效力状态、摘要、主题标签与正文全文。</li>',
  '<li><b>组合筛选</b>：关键词可与板块、层级、地区、主题、效力状态、起止日期同时生效。</li>',
  '<li><b>效力状态</b>：区分现行有效、实施中、动态、实践报道等状态，用于判断文本是否仍然适用。</li>',
  '<li><b>原文可溯</b>：每条结果均保留发布机关、发布日期与官方原文链接，正文以官方发布版本为准。</li>',
  '</ul>',
  '</section>',
  ].join(NL);
  return layout({ title: '资料检索 · 遗产保护与城市更新观察平台', body: body, current: 'browse', total: d.total, updated: d.updated });
}

function detailPage(d) {
  const e = d.entry;
  const rows = [];
  const push = function (k, v) { if (v) rows.push('<div class="kv"><dt>' + k + '</dt><dd>' + E(v) + '</dd></div>'); };
  push('发布机关', e.issuer);
  push('文　号', e.doc_no);
  push('发布日期', e.publish_date);
  push('施行日期', e.effective_date);
  push('效力状态', e.status);
  push('行政层级', e.level);
  push('地　区', e.region);
  push('资料来源', e.source_name);
  const chips = (e.themes || []).map(function (t) { return '<a class="chip" href="/browse?theme=' + encodeURIComponent(t) + '">' + E(t) + '</a>'; }).join('');
  const files = (e.attachments || []).map(function (a) {
    return '<li><a href="' + E(a.path || a.url || '#') + '">' + E(a.name || '附件') + '</a></li>';
  }).join('');
  const related = (d.related || []).map(function (r) {
    return '<li><a href="/entry/' + E(r.slug) + '">' + E(r.title) + '</a><span>' + E(r.publish_date || '') + '</span></li>';
  }).join('');
  const verified = e.updated_at ? String(e.updated_at).slice(0, 10) : (e.publish_date || '');
  const citeUrl = e.source_url ? '<a href="' + E(e.source_url) + '" target="_blank" rel="noopener">' + E(e.source_url) + '</a>' : '（本站未附原文直链，请以发布机关官网为准）';
  const verify = [
  '<section class="verify">',
  '<h2>核验与引用</h2>',
  '<div class="verify-grid">',
  '<div><span>资料来源</span><b>' + E(e.source_name || '—') + '</b></div>',
  '<div><span>收录方式</span><b>官方公开发布文本 · 人工核验后收录</b></div>',
  '<div><span>最后核验</span><b>' + E(verified) + '</b></div>',
  '<div><span>效力状态</span><b>' + E(e.status || '—') + '</b></div>',
  '</div>',
  '<p class="cite">引用格式：〈发布机关〉〈文件名称〉〈文号〉，〈发布日期〉。来源：' + citeUrl + '</p>',
  '<p class="muted">本站为资料汇编与检索工具，条文以官方发布版本为准；如与原文不一致，以原文为准。</p>',
  '</section>',
  ].join('');
  const archive = (e.type === 'case') ? [
  '<section class="archive-fields">',
  '<h2>案例档案与对比维度</h2>',
  '<p class="muted">案例条目按统一档案字段（原始功能 / 更新功能 / 遗产类型 / 保护策略 / 更新模式 / 实施成效）建档。以下标签可用于跨案例检索与横向对比。</p>',
  (chips ? '<p class="chips">' + chips + '</p>' : ''),
  '<div class="verify-grid">',
  '<div><span>所在地区</span><b>' + E(e.region || '—') + '</b></div>',
  '<div><span>行政层级</span><b>' + E(e.level || '—') + '</b></div>',
  '<div><span>发布机构</span><b>' + E(e.issuer || e.source_name || '—') + '</b></div>',
  '<div><span>收录状态</span><b>' + E(e.status || '—') + '</b></div>',
  '</div>',
  '</section>',
  ].join('') : '';
  const body = [
  '<article class="detail">',
  '<div class="detail-top"><span class="tag tag-' + E(e.type) + '">' + E(e.type_label) + '</span>',
  statusBadge(e.status),
  (e.featured ? '<span class="tag tag-featured">推荐</span>' : ''), '</div>',
  '<h1>' + E(e.title) + '</h1>',
  '<dl class="kvs">' + rows.join('') + '</dl>',
  (chips && e.type !== 'case' ? '<p class="chips">' + chips + '</p>' : ''),
  (e.summary ? '<p class="lead">' + E(e.summary) + '</p>' : ''),
  caseFigure(e, 'detail'),
  '<div class="prose">' + md.render(e.body || '') + '</div>',
  (files ? '<section class="files"><h2>附件</h2><ul>' + files + '</ul></section>' : ''),
  (e.source_url ? '<p class="source">原文链接：<a href="' + E(e.source_url) + '" target="_blank" rel="noopener">' + E(e.source_url) + '</a></p>' : ''),
  '</article>',
  verify,
  archive,
  (related ? '<aside class="related"><h2>相关条目</h2><ul>' + related + '</ul></aside>' : ''),
  ].join(NL);
  return layout({ title: e.title + ' · 遗产保护与城市更新观察平台', desc: e.summary || '', body: body, current: 'browse', total: d.total, updated: d.updated });
}

function aboutPage(d) {
  const body = [
  '<div class="page-head"><p class="kicker">ABOUT / METHODOLOGY</p>',
  '<h1>关于本站</h1>',
  '<p class="lede">遗产保护与城市更新观察平台是一个面向公众开放的专业资料库。以下说明它的定位、收录范围、来源体系、审核流程、引用规则与合规边界。</p>',
  '</div>',
  '<section class="prose">',
  '<h2>一、平台定位</h2>',
  '<p>本站面向遗产保护与城市更新领域，设立 <b>法规</b>、<b>政策</b>、<b>案例</b>、<b>动态</b> 四个板块，目标是提供一套 <b>可信、可检索、可追溯原始出处</b> 的专业知识库，而不是一个以生成内容为主的问答工具。</p>',
  '<p>平台按六个模块推进建设，其中法规政策库、案例库、动态、专题导航四个模块已对外开放，可直接点击进入对应内容；AI 智能研究助手与全球遗产地图已进入建设阶段，本站不提供尚未建成的功能入口。</p>',
  '<p><b>面向公众的访问方式</b>（建设中）：公众访问由独立的网站后端承担，后端统一负责身份识别、请求频率、额度控制与安全校验；法规、政策、案例与动态均通过数据库直查检索，来源、效力与原文链接逐条人工核验后公开。</p>',
  '<p><b>智能问答的接入方式</b>：站内 AI 研究助手由后端通过专门的 AI 服务接口调用模型，访客不直接创建后台会话，也不直接调用后台网关或模型；模型仅依据站内已核验资料作答，关键结论回溯到具体条目与官方原文链接。</p>',
  '<h2>二、收录范围</h2>',
  '<p>收录对象以中央与地方机关公开发布的正式文本为主，每条记录均标注发布机关、发布日期、文号（如有）、行政层级、适用地区、效力状态与官方原文链接。案例与动态另按统一档案字段建档。</p>',
  '<h2>三、数据来源</h2>',
  '<h3>已接入</h3>',
  '<ul><li>中国政府网政策文件库（zhengcelibrary_gw 国务院文件 / zhengcelibrary_bm 部门文件）</li>',
  '<li>各省市人民政府门户网站公开发布的实施方案与批复文件</li>',
  '<li>国家及地方文物、住建、规划等主管部门公开发布文件</li>',
  '<li>新华社及地方官方媒体刊发的典型案例报道</li></ul>',
  '<h3>规划接入</h3>',
  '<ul><li>国际组织与专业机构：UNESCO 世界遗产中心与历史性城市景观（HUL）体系、ICOMOS、ICCROM、Europa Nostra</li>',
  '<li>各国官方遗产机构：Historic England、National Park Service、日本文化厅、新加坡 URA 与国家遗产委员会、澳大利亚 Heritage Council 等</li>',
  '<li>国际学术与行业报告、获奖项目与会议动态</li></ul>',
  '<p class="muted">规划中的来源尚未进入本站数据库，页面中不会以占位内容冒充已收录资料。</p>',
  '<h2>四、采集与审核流程</h2>',
  '<ol><li><b>发现</b>：按来源清单定期扫描新增与变更文件</li>',
  '<li><b>结构化</b>：提取标题、文号、发布机关、发布日期、层级、地区</li>',
  '<li><b>去重</b>：与既有条目比对，标记疑似修订、废止与替代关系</li>',
  '<li><b>归类</b>：按主题标签体系分类，支持一条目多标签</li>',
  '<li><b>待审</b>：全部发现结果进入待审队列，不直接公开</li>',
  '<li><b>人工核验</b>：核验标题、文号、日期、效力状态与原文链接</li>',
  '<li><b>发布</b>：审核通过后公开，保留来源署名与原文链接</li>',
  '<li><b>回溯</b>：条文以官方发布版本为准，必要时更新并标注</li></ol>',
  '<p>AI 仅用于辅助结构化与摘要，不代替人工核验，不自动发布法规与专业结论。</p>',
  '<h2>五、引用与追溯</h2>',
  '<p>每条条目均提供官方原文链接与标准引用格式建议。使用时请以原文为准，并注意区分<b>事实</b>、<b>发布机关观点</b>与<b>平台摘要</b>三者。</p>',
  '<h2>六、版权与转载</h2>',
  '<p>本站条目保留原始发布机关署名与来源链接，正文著作权归原发布机关或作者所有，本站仅作索引、摘要与检索。引用、转载与截图请遵循原发布渠道的版权要求；如权利人认为收录不当，可通过页面所留来源渠道联系处理。</p>',
  '<h2>七、免责声明</h2>',
  '<p>本站为资料汇编与检索工具，所有内容 <b>不构成法律意见、规划审批依据或投资建议</b>。使用者在实际项目中应自行核对最新有效文本与主管部门口径。</p>',
  '<h2>八、合规与备案</h2>',
  '<p>本站面向中国大陆公众提供非经营性资料服务。运营主体确定后，将按规定完成 ICP 备案、公安联网备案，并在页脚公示相关信息。AI 相关能力在正式开放前，将按《生成式人工智能服务管理暂行办法》等规定落实备案、登记、内容标识与安全要求。</p>',
  '<p>第一阶段本站为只读资料库，<b>不提供</b>用户上传文件、公开评论、用户发布内容与 AI 自动发布资讯等功能，以控制内容合规风险。</p>',
  '<h2>九、建设路线</h2>',
  '<ul><li><b>第一阶段</b>：法规政策库、案例库、动态、主题专题检索与公开访问（当前）</li>',
  '<li><b>第二阶段</b>：独立后端与数据库直查检索、AI 研究助手（后端直连模型服务）、全球遗产与更新地图、案例档案字段完善与动态国际化</li>',
  '<li><b>第三阶段</b>：条款级检索与专题对比研究、开放数据接口与多端入口（微信小程序、移动应用）</li></ul>',
  '</section>',
  ].join(NL);
  return layout({ title: '关于本站 · 遗产保护与城市更新观察平台', body: body, current: 'about', total: d.total, updated: d.updated });
}
const GUIDE_GROUPS = [
  { title: '遗产与历史保护', en: 'CONSERVATION', themes: ['文物保护', '文物保护利用示范区', '历史建筑', '历史文化名城', '历史文化街区', '传统村落', '非物质文化遗产', '文化遗产', '文化遗产保护传承', '文物开放', '修缮工程', '保护更新', '传统知识', '水下文物', '古树名木', '工业遗产', '老旧厂房改造'] },
  { title: '城市更新与空间', en: 'URBAN RENEWAL', themes: ['城市更新', '城中村改造', '完整社区', '城市体检', '国土空间规划', '土地管理', '地名管理', '城市运行', '城市交通', '建设工程'] },
  { title: '生态与市政', en: 'ECOLOGY & INFRA', themes: ['生态保护', '生态环境', '绿色低碳', '水环境', '水资源', '供水', '地下水', '水源保护', '节约用水', '防洪', '灾害防治', '森林草原', '自然保护区', '监测', '安全', '区域治理'] },
  { title: '实施与保障', en: 'IMPLEMENTATION', themes: ['十五五规划', '财政支持', '政策工具箱', '住房保障', '文创赋能', '文化传承', '工作动态', '档案', '补偿机制'] }
];

function guidePage(d) {
  const tc = d.themeCounts || {};
  const avail = {};
  (d.facets || {}).themes = (d.facets || {}).themes || [];
  const set = {};
  (d.facets || {}).themes.forEach(function (t) { set[t] = true; });
  const groups = GUIDE_GROUPS.map(function (g) {
    const items = g.themes.filter(function (t) { return set[t]; }).map(function (t) {
      return '<a class="tcloud-i" href="/browse?theme=' + encodeURIComponent(t) + '">' +
        E(t) + '<span>' + (tc[t] || 0) + '</span></a>';
    }).join('');
    return '<div class="guide-group"><p class="kicker">' + E(g.en) + '</p>' +
      '<h3>' + E(g.title) + '</h3>' +
      '<div class="tcloud">' + (items || '<span class="muted">该组主题暂无条目</span>') + '</div></div>';
  }).join('');
  const guide = GUIDE_QUERIES.map(function (g) {
    return '<a class="guide-q" href="/browse?q=' + encodeURIComponent(g[0]) + '">' +
      '<span class="guide-q-k">' + E(g[0]) + '</span>' +
      '<span class="guide-q-t">' + E(g[1]) + '</span>' +
      '<span class="guide-q-d">' + E(g[2]) + '</span></a>';
  }).join('');
  const body = [
  '<div class="page-head"><p class="kicker">RESEARCH GUIDE</p>',
  '<h1>研究导览</h1>',
  '<p class="lede">本站不提供概括性结论。这里给出的是从研究问题到官方文本的检索路径：每一个入口都落到可核验、可引用的原始发布文件。</p>',
  '</div>',
  '<section>',
  '<h2 class="section-title"><span class="sec-no">01</span>常见研究问题</h2>',
  '<p class="section-lede">按问题类型组织的检索入口。点击后进入资料检索页，命中条目会高亮关键词并显示条数。</p>',
  '<div class="guide-list">' + guide + '</div>',
  '</section>',
  '<section>',
  '<h2 class="section-title"><span class="sec-no">02</span>主题矩阵</h2>',
  '<p class="section-lede">主题标签由入库时人工归类，同一条目可挂多个主题。数字为该主题下的公开条目数，可用于跨板块横向检索与案例对比。</p>',
  '<div class="guide-groups">' + groups + '</div>',
  '</section>',
  '<section>',
  '<h2 class="section-title"><span class="sec-no">03</span>比较研究怎么做</h2>',
  '<ul class="plain-bullets">',
  '<li><b>同主题跨板块</b>：先用主题标签缩小范围，再按板块切换，观察政策、案例与动态如何互相印证。</li>',
  '<li><b>跨地区对比</b>：在检索页叠加「地区」筛选，比较不同层级与地域的做法差异。</li>',
  '<li><b>按时间切片</b>：设定起止日期，观察一项政策从发布、实施到动态跟进的时间线。</li>',
  '<li><b>追到原文</b>：每条结果都带原文链接，结论与引用以官方发布版本为准。</li>',
  '</ul>',
  '</section>',
  ].join(NL);
  return layout({ title: '研究导览 · 遗产保护与城市更新观察平台', body: body, current: 'guide', total: d.total, updated: d.updated });
}

function adminShell(o) {
  const nav2 = [['/admin', '概览', 'dash'], ['/admin/entries', '条目管理', 'entries'], ['/admin/inbox', '待审队列', 'inbox'], ['/admin/audit', '操作日志', 'audit']];
  const navHtml = nav2.map(function (it) {
    const cls = it[2] === o.active ? ' class="active"' : '';
    return '<a href="' + it[0] + '"' + cls + '>' + it[1] + '</a>';
  }).join('');
  const inner = ['<div class="admin-head"><h1>' + E(o.title) + '</h1>',
  '<div class="admin-actions">' + (o.actions || '') + '</div></div>', o.body || ''].join(NL);
  return layout({ title: o.title + ' · 后台管理', current: '',
    body: '<div class="admin"><nav class="admin-nav">' + navHtml + '</nav>' +
      '<div class="admin-main">' + inner + '</div></div>' });
}

function loginPage(err) {
  const body = [
  '<section class="login">',
  '<h1>后台管理登录</h1>',
  (err ? '<p class="err">' + E(err) + '</p>' : ''),
  '<form method="post" action="/admin/login">',
  '<label>管理密码<input type="password" name="password" required autofocus></label>',
  '<button class="btn" type="submit">登录</button>',
  '</form>',
  '<p class="muted">初始密码在服务首次启动时于控制台输出；可用环境变量 PORTAL_ADMIN_PASSWORD 指定。</p>',
  '</section>',
  ].join(NL);
  return layout({ title: '后台管理登录', body: body, current: '' });
}

function dashboardPage(d) {
  const s = d.stats || {};
  const bt = s.byType || {};
  const tiles = [
    ['公开条目', s.total || 0, '/admin/entries'],
    ['待审记录', s.inbox_pending || 0, '/admin/inbox'],
    ['法规', bt.regulation || 0, '/admin/entries?type=regulation'],
    ['政策', bt.policy || 0, '/admin/entries?type=policy'],
    ['案例', bt.case || 0, '/admin/entries?type=case'],
    ['动态', bt.news || 0, '/admin/entries?type=news'],
  ].map(function (t) {
    return '<a class="tile" href="' + t[2] + '"><b>' + t[1] + '</b><span>' + t[0] + '</span></a>';
  }).join('');
  const inbox = (d.inbox || []).map(function (r) {
    return '<li><b>' + E(r.title) + '</b><span>' + E(r.issuer || '') + ' · ' + E(r.publish_date || '') + '</span></li>';
  }).join('');
  const body = [
  '<div class="tiles">' + tiles + '</div>',
  '<section class="panel"><h2>最新待审记录</h2>',
  (inbox ? '<ul class="plain-list">' + inbox + '</ul>' : '<p class="muted">当前没有待审记录。</p>'),
  '</section>',
  '<section class="panel"><h2>最近操作</h2>',
  (d.audit || []).map(function (r) { return '<li><b>' + E(r.action) + '</b><span>' + E(r.target) + ' · ' + E(String(r.ts || '').slice(0, 19)) + '</span></li>'; }).join('') || '<p class="muted">暂无记录。</p>',
  '</section>',
  ].join(NL);
  return adminShell({ title: '概览', active: 'dash', body: body, actions: '<a class="btn" href="/admin/entries/new">新建条目</a>' });
}
function entriesPage(d) {
  const q = d.query || {};
  const rows = (d.entries || []).map(function (e) {
    const op = '<td class="ops"><a href="/admin/entries/' + E(e.slug) + '/edit">编辑</a>' +
      ' <a href="/entry/' + E(e.slug) + '" target="_blank">查看</a></td>';
    return ['<tr>',
    '<td><span class="tag tag-' + E(e.type) + '">' + E(e.type_label) + '</span></td>',
    '<td><a href="/admin/entries/' + E(e.slug) + '/edit">' + E(e.title) + '</a></td>',
    '<td>' + E(e.issuer || '') + '</td>',
    '<td>' + E(e.doc_no || '') + '</td>',
    '<td>' + E(e.publish_date || '') + '</td>',
    '<td>' + E(e.level || '') + '</td>',
    '<td>' + E(e.region || '') + '</td>',
    op, '</tr>'].join('');
  }).join('');
  const opts = [['regulation', '法规'], ['policy', '政策'], ['case', '案例'], ['news', '动态']].map(function (t) {
    const sel = q.type === t[0] ? ' selected' : '';
    return '<option value="' + t[0] + '"' + sel + '>' + t[1] + '</option>';
  }).join('');
  const body = [
  '<form class="filters" action="/admin/entries" method="get">',
  '<input class="f-q" type="search" name="q" value="' + E(q.q || '') + '" placeholder="关键词">',
  '<select name="type"><option value="">全部类型</option>' + opts + '</select>',
  '<button class="btn" type="submit">查询</button>',
  '<a class="btn btn-ghost" href="/admin/entries">重置</a>',
  '</form>',
  '<table class="table"><thead><tr><th>类型</th><th>标题</th><th>发布机关</th><th>文号</th><th>发布日期</th><th>层级</th><th>地区</th><th>操作</th></tr></thead>',
  '<tbody>' + (rows || '<tr><td colspan="8" class="muted">暂无条目</td></tr>') + '</tbody></table>',
  pager(q, d.total || 0, d.page || 1, d.per || 30),
  ].join(NL);
  return adminShell({ title: '条目管理', active: 'entries', body: body,
    actions: '<a class="btn" href="/admin/entries/new">新建条目</a> <a class="btn btn-ghost" href="/admin/export.csv">导出 CSV</a>' });
}

function field(label, name, val, opts) {
  const o = opts || {};
  const v = val == null ? '' : val;
  if (o.textarea) {
    const rows = o.rows || 12;
    return '<label class="fld"><span>' + label + '</span><textarea name="' + name + '" rows="' + rows + '">' + E(v) + '</textarea></label>';
  }
  const type = o.type || 'text';
  const ph = o.placeholder ? ' placeholder="' + E(o.placeholder) + '"' : '';
  return '<label class="fld"><span>' + label + '</span><input type="' + type + '" name="' + name + '" value="' + E(v) + '"' + ph + '></label>';
}
function entryForm(d) {
  const e = d.entry || {};
  const isNew = !e.slug;
  const types = [['regulation', '法规'], ['policy', '政策'], ['case', '案例'], ['news', '动态']];
  const typeOpts = types.map(function (t) {
    const sel = e.type === t[0] ? ' selected' : '';
    return '<option value="' + t[0] + '"' + sel + '>' + t[1] + '</option>';
  }).join('');
  const themes = (e.themes || []).join(', ');
  const feat = e.featured ? ' checked' : '';
  const visOpts = [['public', '公开'], ['draft', '草稿']].map(function (v) {
    const sel = (e.visibility || 'public') === v[0] ? ' selected' : '';
    return '<option value="' + v[0] + '"' + sel + '>' + v[1] + '</option>';
  }).join('');
  const action = isNew ? '/admin/entries' : '/admin/entries/' + E(e.slug) + '/edit';
  const delBtn = isNew ? '' : '<form method="post" action="/admin/entries/' + E(e.slug) + '/delete" class="inline"><button class="btn btn-danger" type="submit">删除</button></form>';
  const body = [
  '<form class="form" method="post" action="' + action + '">',
  '<div class="form-grid">',
  field('标题', 'title', e.title, { placeholder: '必填' }),
  field('URL 别名', 'slug', e.slug, { placeholder: '留空自动生成' }),
  '<label class="fld"><span>类型</span><select name="type">' + typeOpts + '</select></label>',
  field('发布机关', 'issuer', e.issuer),
  field('文号', 'doc_no', e.doc_no),
  field('发布日期', 'publish_date', e.publish_date, { type: 'date' }),
  field('施行日期', 'effective_date', e.effective_date, { type: 'date' }),
  field('行政层级', 'level', e.level, { placeholder: '如 国家级 / 省级 / 市级' }),
  field('地区', 'region', e.region, { placeholder: '如 江苏省 / 苏州市' }),
  field('效力状态', 'status', e.status, { placeholder: '如 现行有效' }),
  '<label class="fld"><span>发布状态</span><select name="visibility">' + visOpts + '</select></label>',
  field('责任作者', 'author', e.author, { placeholder: '如 管理员 / 种子导入' }),
  field('资料来源', 'source_name', e.source_name),
  field('原文链接', 'source_url', e.source_url, { placeholder: 'https://' }),
  field('主题标签', 'themes', themes, { placeholder: '多个用英文逗号分隔' }),
  field('摘要', 'summary', e.summary, { textarea: true, rows: 4 }),
  field('正文', 'body', e.body, { textarea: true, rows: 20 }),
  '</div>',
  '<label class="check"><input type="checkbox" name="featured" value="1"' + feat + '> 设为推荐条目</label>',
  '<div class="form-ops"><button class="btn" type="submit">' + (isNew ? '创建条目' : '保存修改') + '</button>',
  '<a class="btn btn-ghost" href="/admin/entries">返回列表</a>', delBtn, '</div>',
  '</form>'
  ].join(NL);
  return adminShell({ title: isNew ? '新建条目' : '编辑条目', active: 'entries', body: body });
}
function inboxPage(d) {
  const rows = (d.inbox || []).map(function (r) {
    const id = E(r.id);
    const approve = '<form method="post" action="/admin/inbox/' + id + '/approve" class="inline">' +
      '<button class="btn btn-sm" type="submit">通过并公开</button></form>';
    const reject = '<form method="post" action="/admin/inbox/' + id + '/reject" class="inline">' +
      '<button class="btn btn-sm btn-danger" type="submit">驳回</button></form>';
    const link = r.url ? '<a href="' + E(r.url) + '" target="_blank" rel="noopener">原文</a>' : '';
    return ['<tr>',
    '<td>' + E(r.title) + '</td>',
    '<td>' + E(r.issuer || '') + '</td>',
    '<td>' + E(r.doc_no || '') + '</td>',
    '<td>' + E(r.publish_date || '') + '</td>',
    '<td>' + E(r.source_name || '') + '</td>',
    '<td>' + link + '</td>',
    '<td class="ops">' + approve + reject + '</td>',
    '</tr>'].join('');
  }).join('');
  const body = [
  '<p class="muted">抓取记录先进入本队列，人工核验标题、日期与原文链接后再公开。共 ' + (d.total || 0) + ' 条待处理。</p>',
  '<table class="table"><thead><tr><th>标题</th><th>发布机关</th><th>文号</th><th>发布日期</th><th>来源</th><th>原文</th><th>操作</th></tr></thead>',
  '<tbody>' + (rows || '<tr><td colspan="7" class="muted">队列为空</td></tr>') + '</tbody></table>',
  '<form method="post" action="/admin/inbox/import" class="panel-form">',
  '<h2>导入 JSON 文件到待审队列</h2>',
  '<input type="file" name="file" accept="application/json" required>',
  '<button class="btn" type="submit">上传并入队</button>',
  '</form>',
  ].join(NL);
  return adminShell({ title: '待审队列', active: 'inbox', body: body });
}

function auditPage(d) {
  const rows = (d.audit || []).map(function (r) {
    return ['<tr>',
    '<td>' + E(String(r.ts || '').slice(0, 19).replace('T', ' ')) + '</td>',
    '<td>' + E(r.action || '') + '</td>',
    '<td>' + E(r.target || '') + '</td>',
    '<td>' + E(r.detail || '') + '</td>',
    '</tr>'].join('');
  }).join('');
  const body = [
  '<table class="table"><thead><tr><th>时间</th><th>操作</th><th>对象</th><th>说明</th></tr></thead>',
  '<tbody>' + (rows || '<tr><td colspan="4" class="muted">暂无记录</td></tr>') + '</tbody></table>',
  ].join(NL);
  return adminShell({ title: '操作日志', active: 'audit', body: body });
}

module.exports = {
  layout: layout,
  nav: nav,
  card: card,
  homePage: homePage,
  browsePage: browsePage,
  detailPage: detailPage,
  aboutPage: aboutPage,
  guidePage: guidePage,
  mapPage: function (d) { return mapMod.mapPage(d, layout); },
  eventsIndexPage: function (d) { return evMod.eventsIndexPage(d, layout); },
  eventDetailPage: function (d) { return evMod.eventDetailPage(d, layout); },
  adminShell: adminShell,
  loginPage: loginPage,
  dashboardPage: dashboardPage,
  entriesPage: entriesPage,
  entryForm: entryForm,
  inboxPage: inboxPage,
  auditPage: auditPage
};




