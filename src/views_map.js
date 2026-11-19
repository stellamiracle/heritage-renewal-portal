'use strict';
const md = require('./md');
const E = md.escapeHtml;
const NL = String.fromCharCode(10);

function mapPage(d, layout) {
  const bm = d.basemap || { w: 1000, h: 500, paths: [] };
  const s = d.stats || {};
  const CATCN = { Cultural: '文化遗产', Natural: '自然遗产', Mixed: '混合遗产' };
  const lands = (bm.paths || []).map(function (p) {
    return '<path class="land" d="' + p.d + '"><title>' + E(p.n) + '</title></path>';
  }).join('');
  const grat = [];
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = ((lon + 180) / 360 * bm.w).toFixed(1);
    grat.push('<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + bm.h + '"></line>');
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180 * bm.h).toFixed(1);
    grat.push('<line x1="0" y1="' + y + '" x2="' + bm.w + '" y2="' + y + '"></line>');
  }
  const cn = d.cnSites || [];
  const cnHtml = cn.map(function (x) {
    return '<li><div class="wh-site" data-wh="' + E(x.id) + '" role="button" tabindex="0">' +
      '<b>' + E(x.n) + '</b>' +
      (x.en && x.en !== x.n ? '<span class="wh-site-en">' + E(x.en) + '</span>' : '') +
      '<span class="wh-site-meta">' + E(x.state || '') +
      (x.y ? ' · ' + E(x.y) + ' 年列入' : '') + ' · ' + E(CATCN[x.cat] || x.cat || '') + '</span>' +
      (x.s ? '<a class="wh-site-link" href="/entry/' + E(x.s) + '">站内案例档案 →</a>' : '') +
      '</div></li>';
  }).join('');
  const body = [
    '<section class="map-head">',
      '<p class="kicker">GLOBAL HERITAGE ATLAS</p>',
      '<h1 class="display">全球遗产地图</h1>',
      '<p class="lede">以联合国教科文组织《世界遗产名录》为底账，' + (s.total || 0) + ' 处遗产地按名录公布坐标绘制成图。底图为 Natural Earth 1:110m 国界图层；点位表示名录公布的位置，不代表保护地范围、管理权或所有权。可按遗产类型、所属区域、国别与关键词筛选，并回溯站内案例档案与联合国教科文组织官方页面。</p>',
      '<ul class="stat-list stat-map">',
        '<li><b>' + (s.total || 0) + '</b><span>名录遗产地</span></li>',
        '<li><b>' + (s.cn || 0) + '</b><span>中国相关遗产地</span></li>',
        '<li><b>' + (s.cultural || 0) + '</b><span>文化遗产</span></li>',
        '<li><b>' + (s.natural || 0) + '</b><span>自然遗产</span></li>',
        '<li><b>' + (s.mixed || 0) + '</b><span>混合遗产</span></li>',
      '</ul>',
      '<p class="section-lede">「中国相关遗产地」指以中国为缔约国的名录条目，含跨国联合申报遗产；坐标为名录公布的参考点，不是遗产地边界。</p>',
    '</section>',
    '<section class="map-section">',
      '<h2 class="section-title"><span class="sec-no">01</span>名录分布</h2>',
      '<div class="map-controls">',
        '<input type="search" id="wh-q" placeholder="搜索遗产地：中文名 / 英文名 / 国家">',
        '<select id="wh-cat"><option value="">全部遗产类型</option><option value="Cultural">文化遗产</option><option value="Natural">自然遗产</option><option value="Mixed">混合遗产</option></select>',
        '<select id="wh-region"><option value="">全部所属区域</option></select>',
        '<label class="wh-check"><input type="checkbox" id="wh-cn"> 仅看中国</label>',
        '<span class="wh-count" id="wh-count"></span>',
      '</div>',
      '<div class="map-frame">',
        '<svg id="wh-svg" viewBox="0 0 ' + bm.w + ' ' + bm.h + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="世界遗产地分布图">',
          '<g class="grat">' + grat.join('') + '</g>',
          '<g class="lands">' + lands + '</g>',
          '<g id="wh-points"></g>',
        '</svg>',
        '<div class="wh-tip" id="wh-tip" hidden></div>',
      '</div>',
      '<p class="wh-legend"><span class="lg lg-c">文化遗产</span><span class="lg lg-n">自然遗产</span><span class="lg lg-m">混合遗产</span><span class="lg-note">悬停查看遗产地名称、国家、列入年份与官方链接</span></p>',
      '<p class="wh-src">数据来源：UNESCO 世界遗产中心《世界遗产名录》XML（whc.unesco.org/en/list/xml）；底图：Natural Earth 1:110m 国界图层。本页是资料平台的可视化索引，遗产地的认定、保护与管理以联合国教科文组织及各缔约国官方公告为准。</p>',
    '</section>',
    '<section>',
      '<h2 class="section-title"><span class="sec-no">02</span>中国相关遗产地索引</h2>',
      '<p class="section-lede">共 ' + (s.cn || 0) + ' 处，点击可在图上定位；带「站内案例档案」的条目可进一步阅读本平台整理的案例档案与官方来源。</p>',
      '<ul class="wh-list">' + cnHtml + '</ul>',
    '</section>'
  ].join(NL);
  return layout({
    title: '全球遗产地图 · 遗产保护与城市更新观察平台',
    desc: '联合国教科文组织《世界遗产名录》遗产地坐标可视化，可按遗产类型、所属区域与国别筛选，并回溯官方页面与站内案例档案。',
    body: body, current: 'map', total: (d.total == null ? 0 : d.total), updated: d.updated,
    head: '<link rel="stylesheet" href="/public/map.css"><script src="/public/map.js" defer></script>'
  });
}

module.exports = { mapPage: mapPage };
