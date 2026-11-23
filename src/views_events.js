'use strict';
/* 行业活动与培训模块视图层：独立依赖，layout 由 views.js 注入（与 views_map.js 同构） */
const md = require('./md');
const E = md.escapeHtml;
const NL = String.fromCharCode(10);

const STATUS_CLASS = {
  '报名中': 'st-valid', '征集中': 'st-valid', '即将开始': 'st-running',
  '进行中': 'st-running', '已结束': 'st-void', '已取消': 'st-void'
};

function pad(n) { return (n < 10 ? '0' : '') + n; }
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function fmtRange(ev) {
  const s = ev.start_date || '';
  const e = ev.end_date || '';
  if (!s) return '日期待定';
  if (!e || e === s) return s;
  return s + ' 至 ' + e;
}
function fmtPlace(ev) {
  return [ev.country, ev.city, ev.venue].filter(Boolean).join(' · ');
}
function opts(map, allLabel) {
  const keys = Object.keys(map || {});
  let s = '<option value="">' + E(allLabel) + '</option>';
  keys.sort().forEach(function (k) {
    s += '<option value="' + E(k) + '">' + E(k) + '（' + (map[k] || 0) + '）</option>';
  });
  return s;
}
function evCard(ev) {
  const topics = (ev.topics || []).map(function (t) {
    return '<span class="tag">' + E(t) + '</span>';
  }).join('');
  const st = ev.status || '';
  const text = [ev.name, ev.name_en, ev.summary, ev.organizer, ev.co_organizer, ev.city, ev.country, ev.venue].join(' ');
  return '<a class="ev-card" href="/events/' + E(ev.slug) + '"' +
    ' data-type="' + E(ev.type || '') + '"' +
    ' data-region="' + E(ev.region || '') + '"' +
    ' data-format="' + E(ev.format || '') + '"' +
    ' data-status="' + E(st) + '"' +
    ' data-topics="' + E((ev.topics || []).join('|')) + '"' +
    ' data-start="' + E(ev.start_date || '') + '"' +
    ' data-text="' + E(text) + '">' +
    '<div class="ev-card-top">' +
      '<span class="badge ev-type">' + E(ev.type || '') + '</span>' +
      '<span class="badge ' + (STATUS_CLASS[st] || 'st-other') + '">' + E(st) + '</span>' +
    '</div>' +
    '<h3 class="ev-name">' + E(ev.name) + '</h3>' +
    (ev.name_en ? '<p class="ev-name-en">' + E(ev.name_en) + '</p>' : '') +
    '<p class="ev-meta">' + E(fmtRange(ev)) + (fmtPlace(ev) ? ' · ' + E(fmtPlace(ev)) : '') +
      (ev.format ? ' · ' + E(ev.format) : '') + '</p>' +
    (ev.organizer ? '<p class="ev-org">主办：' + E(ev.organizer) + '</p>' : '') +
    (topics ? '<p class="chips">' + topics + '</p>' : '') +
    '</a>';
}

function eventsIndexPage(d, layout) {
  const events = d.events || [];
  const f = d.facets || {};
  const T = today();
  const upcoming = events.filter(function (e) { return (e.start_date || '') >= T; });
  const ongoing = events.filter(function (e) {
    const s = e.start_date || '', en = e.end_date || e.start_date || '';
    return s && s <= T && en >= T;
  });
  const sorted = events.slice().sort(function (a, b) {
    const sa = a.start_date || '9999-99-99', sb = b.start_date || '9999-99-99';
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
  const cards = sorted.map(evCard).join('');
  const body = [
  '<section class="page-head">',
    '<p class="kicker">INDUSTRY EVENTS &amp; TRAINING</p>',
    '<h1 class="display">行业活动与培训</h1>',
    '<p class="lede">面向遗产保护与城市更新领域的行业活动档案：学术会议、行业论坛与专题峰会、工作坊与现场调研、线上讲座、专业培训与继续教育、展览与行业交流。每条记录标注时间、地点、主办机构、参与方式与官方来源链接；活动结束后保留历史档案，不做删除。</p>',
    '<ul class="stat-list">',
      '<li><b>' + events.length + '</b><span>收录活动</span></li>',
      '<li><b>' + upcoming.length + '</b><span>即将举行</span></li>',
      '<li><b>' + ongoing.length + '</b><span>进行中</span></li>',
      '<li><b>' + Object.keys(f.region || {}).length + '</b><span>覆盖地域</span></li>',
    '</ul>',
  '</section>',
  '<section class="ev-filters panel">',
    '<h2 class="side-title">筛选条件</h2>',
    '<div class="form-grid">',
      '<label class="fld"><span>关键词</span><input type="search" id="ev-q" placeholder="活动名称、主办机构、城市"></label>',
      '<label class="fld"><span>活动类型</span><select id="ev-type">' + opts(f.type, '全部类型') + '</select></label>',
      '<label class="fld"><span>专业领域</span><select id="ev-topic">' + opts(f.topic, '全部领域') + '</select></label>',
      '<label class="fld"><span>活动形式</span><select id="ev-format">' + opts(f.format, '全部形式') + '</select></label>',
      '<label class="fld"><span>地域</span><select id="ev-region">' + opts(f.region, '全部地域') + '</select></label>',
      '<label class="fld"><span>时间状态</span><select id="ev-status">' + opts(f.status, '全部状态') + '</select></label>',
    '</div>',
    '<div class="ops"><button type="button" class="btn btn-sm" id="ev-reset">重置筛选</button>' +
      '<span class="muted" id="ev-count">共 ' + events.length + ' 场活动</span></div>',
  '</section>',
  '<section>',
    '<h2 class="section-title"><span class="sec-no">01</span>活动列表</h2>',
    '<div class="ev-list" id="ev-list">' + cards + '</div>',
    '<p class="empty" id="ev-empty" hidden>当前筛选条件下没有活动记录。</p>',
  '</section>',
  '<section>',
    '<h2 class="section-title"><span class="sec-no">02</span>活动日历</h2>',
    '<div class="ev-cal-wrap">',
      '<div class="ev-cal-bar"><button type="button" class="btn btn-sm" id="ev-prev">上一月</button>' +
        '<span id="ev-cal-label"></span>' +
        '<button type="button" class="btn btn-sm" id="ev-next">下一月</button></div>',
      '<div class="ev-cal" id="ev-cal"></div>',
      '<p class="muted">日历按活动开始日标注；多日活动以开始日计入所在月份。灰底为非本月日期。筛选条件同时作用于列表与日历。</p>',
    '</div>',
  '</section>',
  '<script src="../public/events.js" defer></script>',
  ].join(NL);
  return layout({
    title: '行业活动与培训 · 遗产保护与城市更新观察平台',
    desc: '遗产保护与城市更新领域的学术会议、行业论坛、工作坊、专业培训与展览交流档案，含时间、地点、主办机构、报名方式与官方来源链接。',
    body: body, current: 'events', total: d.total, updated: d.updated
  });
}

function eventDetailPage(d, layout) {
  const ev = d.event || {};
  const related = d.related || [];
  const st = ev.status || '';
  const rows = [];
  function row(k, v) {
    if (v === undefined || v === null || v === '') return;
    rows.push('<tr><th>' + E(k) + '</th><td>' + E(v) + '</td></tr>');
  }
  row('活动类型', ev.type);
  row('时间', fmtRange(ev));
  row('报名截止', ev.deadline);
  row('地点', fmtPlace(ev));
  row('活动形式', ev.format);
  row('所属地域', ev.region);
  row('主办机构', ev.organizer);
  row('承办与协办', ev.co_organizer);
  row('参与对象', ev.audience);
  row('参与费用', ev.fee);
  row('系列活动', ev.series);
  row('活动状态', st);
  row('专业领域', (ev.topics || []).join('、'));
  const relHtml = related.map(function (r) {
    return '<li><a href="/events/' + E(r.slug) + '">' + E(r.name) + '</a>' +
      '<span class="muted"> · ' + E(fmtRange(r)) + '</span></li>';
  }).join('');
  const body = [
  '<section class="ev-detail-head">',
    '<p class="kicker">EVENT RECORD</p>',
    '<h1 class="display" style="font-size:30px">' + E(ev.name) + '</h1>',
    (ev.name_en ? '<p class="ev-name-en">' + E(ev.name_en) + '</p>' : ''),
    '<p class="ev-meta">' + E(fmtRange(ev)) + (fmtPlace(ev) ? ' · ' + E(fmtPlace(ev)) : '') + '</p>',
    '<p><span class="badge ev-type">' + E(ev.type || '') + '</span> ' +
      '<span class="badge ' + (STATUS_CLASS[st] || 'st-other') + '">' + E(st) + '</span></p>',
    (ev.registration_url ? '<p class="more-wrap"><a class="btn" href="' + E(ev.registration_url) + '" rel="noopener nofollow" target="_blank">前往官方页面 / 报名入口 →</a></p>' : ''),
    '<p class="muted"><a href="/events">← 返回活动列表</a></p>',
  '</section>',
  '<section class="panel">',
    '<h2 class="side-title">活动信息</h2>',
    '<table class="ev-kv">' + rows.join('') + '</table>',
  '</section>',
  (ev.summary ? '<section><h2 class="section-title"><span class="sec-no">01</span>活动介绍</h2><div class="prose">' + E(ev.summary) + '</div></section>' : ''),
  (ev.evidence ? '<section><h2 class="section-title"><span class="sec-no">02</span>核验依据</h2>' +
    '<div class="ev-evidence">' + E(ev.evidence) + '</div>' +
    '<p class="muted">以上为官方来源页面原文片段，用于核对时间与主办信息。</p></section>' : ''),
  '<section><h2 class="section-title"><span class="sec-no">03</span>来源与核验</h2>' +
    '<ul class="plain-list">' +
      '<li><b>原始来源：</b>' + E(ev.source_name || '') +
      (ev.source_url ? ' <a href="' + E(ev.source_url) + '" rel="noopener nofollow" target="_blank">官方页面 ↗</a>' : '') + '</li>' +
      '<li><b>核验方式：</b>活动名称、时间、地点与主办机构均以官方来源页面为准；本页不做二次加工解读。</li>' +
    '</ul></section>',
  (relHtml ? '<section><h2 class="section-title"><span class="sec-no">04</span>同类活动</h2><ul class="plain-list">' + relHtml + '</ul></section>' : ''),
  ].join(NL);
  return layout({
    title: ev.name + ' · 行业活动与培训',
    desc: (ev.summary || ev.name).slice(0, 140),
    body: body, current: 'events', total: d.total, updated: d.updated
  });
}

module.exports = { eventsIndexPage: eventsIndexPage, eventDetailPage: eventDetailPage };
