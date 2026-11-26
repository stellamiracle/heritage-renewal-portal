  function browseHtml(q) {
    var f = D.facets || {};
    var list = filtered(q);
    var per = 20;
    var pages = Math.max(1, Math.ceil(list.length / per));
    var page = parseInt(q.page || '1', 10);
    if (!(page >= 1)) page = 1;
    if (page > pages) page = pages;
    var slice = list.slice((page - 1) * per, page * per);
    var cards = slice.map(cardHtml).join('');
    var tabs = TYPES.map(function (t) {
      var nt = merge(q, { page: '' });
      if (q.type === t[0]) nt.type = '';
      var on = q.type === t[0] ? ' active' : '';
      return '@LT@a class=@Q@tab' + on + '@Q@ href=@Q@' + href('/browse', nt) +
        '@Q@@GT@' + t[1] + '@LT@/a@GT@';
    }).join('');
    var sorts = [['date_desc','发布日期（新→旧）'],['date_asc','发布日期（旧→新）'],
      ['title','标题排序']];
    var sortOpts = sorts.map(function (s) {
      var sel = (q.sort || 'date_desc') === s[0] ? ' selected' : '';
      return '@LT@option value=@Q@' + s[0] + '@Q@' + sel + '@GT@' + s[1] +
        '@LT@/option@GT@';
    }).join('');
    var form = '@LT@form class=@Q@filters@Q@ onsubmit=@Q@return applyFilters(this)@Q@@GT@' +
      '@LT@input type=@Q@hidden@Q@ name=@Q@type@Q@ value=@Q@' + E(q.type || '') +
        '@Q@@GT@' +
      '@LT@input class=@Q@f-q@Q@ type=@Q@search@Q@ name=@Q@q@Q@ value=@Q@' +
        E(q.q || '') + '@Q@ placeholder=@Q@关键词（标题/正文/机关/文号）@Q@@GT@' +
      '@LT@select name=@Q@level@Q@@GT@' + optHtml(f.levels, q.level, '全部层级') +
        '@LT@/select@GT@' +
      '@LT@select name=@Q@region@Q@@GT@' + optHtml(f.regions, q.region, '全部地区') +
        '@LT@/select@GT@' +
      '@LT@select name=@Q@theme@Q@@GT@' + optHtml(f.themes, q.theme, '全部主题') +
        '@LT@/select@GT@' +
      '@LT@select name=@Q@status@Q@@GT@' + optHtml(f.statuses, q.status, '全部状态') +
        '@LT@/select@GT@' +
      '@LT@input type=@Q@date@Q@ name=@Q@from@Q@ value=@Q@' + E(q.from || '') +
        '@Q@ title=@Q@起始日期@Q@@GT@' +
      '@LT@input type=@Q@date@Q@ name=@Q@to@Q@ value=@Q@' + E(q.to || '') +
        '@Q@ title=@Q@截止日期@Q@@GT@' +
      '@LT@select name=@Q@sort@Q@@GT@' + sortOpts + '@LT@/select@GT@' +
      '@LT@button class=@Q@btn@Q@ type=@Q@submit@Q@@GT@筛选@LT@/button@GT@' +
      '@LT@a class=@Q@btn btn-ghost@Q@ href=@Q@' + href('/browse') + '@Q@@GT@重置@LT@/a@GT@' +
      '@LT@/form@GT@';
    var head = '@LT@div class=@Q@result-head@Q@@GT@' +
      '@LT@p@GT@共 ' + list.length + ' 条结果' +
      (q.type ? ' · 类别：' + E(typeLabel(q.type)) : '') +
      (q.region ? ' · 地区：' + E(q.region) : '') +
      (q.theme ? ' · 主题：' + E(q.theme) : '') +
      (q.level ? ' · 层级：' + E(q.level) : '') +
      (q.q ? ' · 关键词：' + E(q.q) : '') + '@LT@/p@GT@' +
      '@LT@p class=@Q@muted@Q@@GT@第 ' + page + ' / ' + pages + ' 页@LT@/p@GT@' +
      '@LT@/div@GT@';
    var body = cards ? '@LT@div class=@Q@grid@Q@@GT@' + cards + '@LT@/div@GT@'
      : '@LT@p class=@Q@empty@Q@@GT@没有符合条件的条目，请调整筛选条件。@LT@/p@GT@';
    return '@LT@section@GT@@LT@h1 class=@Q@page-title@Q@@GT@资料检索@LT@/h1@GT@' +
      '@LT@div class=@Q@tabs@Q@@GT@' + tabs + '@LT@/div@GT@' +
      form + head + body + pagerHtml(q, pages, page) + '@LT@/section@GT@';
  }
  function goSearch(form) {
    var q = form.q.value || '';
    location.hash = '#/browse' + (q ? '?q=' + encodeURIComponent(q) : '');
    return false;
  }
  function applyFilters(form) {
    var q = {};
    var els = form.elements;
    for (var i = 0; i @LT@ els.length; i++) {
      var el = els[i];
      if (!el.name || !el.value) continue;
      q[el.name] = el.value;
    }
    delete q.page;
    location.hash = '#/browse' + qs(q);
    return false;
  }
  function detailHtml(slug) {
    var e = bySlug[slug];
    if (!e) {
      return '@LT@p class=@Q@empty@Q@@GT@未找到该条目。@LT@/p@GT@';
    }
    var rows = [];
    function push(k, v) {
      if (!v) return;
      rows.push('@LT@div class=@Q@kv@Q@@GT@@LT@dt@GT@' + k + '@LT@/dt@GT@' +
        '@LT@dd@GT@' + E(v) + '@LT@/dd@GT@@LT@/div@GT@');
    }
    push('发布机关', e.issuer);
    push('文　号', e.doc_no);
    push('发布日期', e.publish_date);
    push('施行日期', e.effective_date);
    push('效力状态', e.status);
    push('行政层级', e.level);
    push('地　区', e.region);
    push('资料来源', e.source_name);
    var chips = (e.themes || []).map(function (t) {
      return '@LT@a class=@Q@chip@Q@ href=@Q@' + href('/browse', { theme: t }) +
        '@Q@@GT@' + E(t) + '@LT@/a@GT@';
    }).join('');
    var files = (e.attachments || []).map(function (a) {
      var p = a.path || a.url || '#';
      return '@LT@li@GT@@LT@a href=@Q@' + E(p) + '@Q@@GT@' +
        E(a.name || '附件') + '@LT@/a@GT@@LT@/li@GT@';
    }).join('');
    var rel = (e.related || []).map(function (r) {
      return '@LT@li@GT@@LT@a href=@Q@' + href('/entry/' + r.slug) + '@Q@@GT@' +
        E(r.title) + '@LT@/a@GT@@LT@span@GT@' + E(r.publish_date || '') +
        '@LT@/span@GT@@LT@/li@GT@';
    }).join('');
    var photoSec = '';
    var ps = (e.photos || []).filter(function (p) { return p && p.src; });
    if (ps.length) {
      var items = ps.map(function (p, i) {
        var cap = '现场照片 ' + (i + 1) + ' / ' + ps.length + ' · 来源：' + (e.source_name || '原发布方');
        var link = p.orig ? '@LT@a href=@Q@' + E(p.orig) +
          '@Q@ target=@Q@_blank@Q@ rel=@Q@noopener@Q@@GT@原图链接@LT@/a@GT@' : '';
        return '@LT@figure class=@Q@fig photo@Q@@GT@@LT@a href=@Q@' + E(p.orig || p.src) +
          '@Q@ target=@Q@_blank@Q@ rel=@Q@noopener@Q@@GT@@LT@img src=@Q@' + p.src +
          '@Q@ alt=@Q@' + E(e.title) + ' 现场照片 ' + (i + 1) +
          '@Q@ loading=@Q@lazy@Q@@GT@@LT@/img@GT@@LT@/a@GT@' +
          '@LT@figcaption@GT@' + cap + (link ? ' · ' + link : '') +
          '@LT@/figcaption@GT@@LT@/figure@GT@';
      }).join('');
      photoSec = '@LT@section class=@Q@figs photos@Q@@GT@@LT@h2@GT@现场照片@LT@/h2@GT@' +
        '@LT@p class=@Q@fig-note@Q@@GT@以下为来源发布方发布的现场照片，版权归原发布方/摄影者所有，本站仅作索引展示；点击可跳转原始链接。@LT@/p@GT@' +
        '@LT@div class=@Q@photo-grid@Q@@GT@' + items + '@LT@/div@GT@@LT@/section@GT@';
    }
    var figs = '';
    if (e.fig && e.fig.info) {
      figs = '@LT@section class=@Q@figs@Q@@GT@@LT@h2@GT@图示@LT@/h2@GT@';
      if (e.fig.loc) {
        figs += '@LT@figure class=@Q@fig@Q@@GT@@LT@img src=@Q@' + e.fig.loc +
          '@Q@ alt=@Q@' + E(e.title) + ' 自绘区位示意图（本站自绘示意资产，非现场照片）@Q@' +
          ' width=@Q@720@Q@ height=@Q@500@Q@@GT@' +
          '@LT@figcaption@GT@区位示意图 · 本站自绘示意资产，底图为 Natural Earth 1:110m 国界图层，标注点为《世界遗产名录》公布坐标，不代表保护地范围、管理权或所有权；非现场照片、非历史影像。@LT@/figcaption@GT@@LT@/figure@GT@';
      }
      figs += '@LT@figure class=@Q@fig@Q@@GT@@LT@img src=@Q@' + e.fig.info +
        '@Q@ alt=@Q@' + E(e.title) + ' 自绘档案信息图（本站自绘示意资产，非现场照片）@Q@' +
        ' width=@Q@720@Q@ height=@Q@500@Q@@GT@' +
        '@LT@figcaption@GT@档案信息图 · 本站自绘示意资产，全部字段取自本条目已核验记录；非现场照片、非历史影像。@LT@/figcaption@GT@@LT@/figure@GT@';
      if (!e.fig.loc) {
        figs += '@LT@p class=@Q@fig-note@Q@@GT@该案例未核验到《世界遗产名录》公布坐标，因此未生成区位示意图，也未在全球遗产地图上标注；本站不虚构坐标。@LT@/p@GT@';
      }
      figs += '@LT@/section@GT@';
    }
    return '@LT@article class=@Q@detail@Q@@GT@' +
      '@LT@div class=@Q@card-top@Q@@GT@@LT@span class=@Q@tag tag-' + E(e.type) +
        '@Q@@GT@' + E(e.type_label || typeLabel(e.type)) + '@LT@/span@GT@' +
        (e.featured ? '@LT@span class=@Q@tag tag-featured@Q@@GT@推荐@LT@/span@GT@' : '') +
        '@LT@/div@GT@' +
      '@LT@h1@GT@' + E(e.title) + '@LT@/h1@GT@' +
      (rows.length ? '@LT@dl class=@Q@kvs@Q@@GT@' + rows.join('') + '@LT@/dl@GT@' : '') +
      (chips ? '@LT@p class=@Q@chips@Q@@GT@' + chips + '@LT@/p@GT@' : '') +
      (e.summary ? '@LT@p class=@Q@lead@Q@@GT@' + E(e.summary) + '@LT@/p@GT@' : '') +
      photoSec +
      figs +
      '@LT@div class=@Q@prose@Q@@GT@' + (e.bodyHtml || '') + '@LT@/div@GT@' +
      (files ? '@LT@section class=@Q@files@Q@@GT@@LT@h2@GT@附件@LT@/h2@GT@@LT@ul@GT@' +
        files + '@LT@/ul@GT@@LT@/section@GT@' : '') +
      (e.source_url ? '@LT@p class=@Q@source@Q@@GT@原文链接：@LT@a href=@Q@' +
        E(e.source_url) + '@Q@ target=@Q@_blank@Q@ rel=@Q@noopener@Q@@GT@' +
        E(e.source_url) + '@LT@/a@GT@@LT@/p@GT@' : '') +
      '@LT@/article@GT@' +
      (rel ? '@LT@aside class=@Q@related@Q@@GT@@LT@h2@GT@相关条目@LT@/h2@GT@@LT@ul@GT@' +
        rel + '@LT@/ul@GT@@LT@/aside@GT@' : '') +
      '@LT@p class=@Q@more-wrap@Q@@GT@@LT@a class=@Q@btn btn-ghost@Q@ href=@Q@' +
        href('/browse') + '@Q@@GT@← 返回检索@LT@/a@GT@@LT@/p@GT@';
  }
  function aboutHtml() {
    var s = D.stats || {};
    var bt = s.byType || {};
    return '@LT@section@GT@@LT@h1 class=@Q@page-title@Q@@GT@关于本站@LT@/h1@GT@' +
      '@LT@div class=@Q@prose@GT@' +
      '@LT@h2@GT@资料范围@LT@/h2@GT@' +
      '@LT@p@GT@本站收录遗产保护与城市更新领域的法规、政策、案例与动态资料，共 ' +
        (s.total || 0) + ' 条已公开条目，其中法规 ' + (bt.regulation || 0) +
        ' 条、政策 ' + (bt.policy || 0) + ' 条、案例 ' + (bt.case || 0) +
        ' 条、动态 ' + (bt.news || 0) + ' 条。@LT@/p@GT@' +
      '@LT@h2@GT@来源说明@LT@/h2@GT@' +
      '@LT@p@GT@法规以中国政府网公布的行政法规与国务院文件为准，按文号识别；' +
        '政策以国务院各部委与地方政府官方网站公开文本为准；案例采用已核验的官方或权威媒体原文。' +
        '每条记录标注发布机关、发布日期、文号与原文链接。@LT@/p@GT@' +
      '@LT@h2@GT@使用方式@LT@/h2@GT@' +
      '@LT@p@GT@本页为单文件离线版，样式与数据已全部内嵌，双击即可在浏览器中打开。' +
        '可在“资料检索”中按类别、层级、地区、主题、效力状态与发布日期组合筛选，' +
        '关键词检索覆盖标题、摘要、正文、发布机关与文号。@LT@/p@GT@' +
      '@LT@h2@GT@免责声明@LT@/h2@GT@' +
      '@LT@p@GT@本站仅作资料汇编与检索之用，文本以各发布机关官网公布版本为准，不构成法律意见。' +
        '地方性研究材料条目已标注来源局限，正式公开引用前请回查官方原文。@LT@/p@GT@' +
      '@LT@/div@GT@@LT@/section@GT@';
  }
  function render() {
    var r = parseHash();
    var act = 'home';
    var html = '';
    if (r.path.indexOf('/entry/') === 0) {
      html = detailHtml(r.path.slice(7));
      act = 'browse';
    } else if (r.path.indexOf('/browse') === 0) {
      html = browseHtml(r.query);
      act = 'browse';
    } else if (r.path.indexOf('/about') === 0) {
      html = aboutHtml();
      act = 'about';
    } else {
      html = homeHtml();
    }
    var headEl = document.getElementById('site-head');
    if (headEl) headEl.innerHTML = shell(act);
    var mainEl = document.getElementById('app');
    if (mainEl) mainEl.innerHTML = html;
    var footEl = document.getElementById('site-foot');
    if (footEl) footEl.innerHTML = foot();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);
  function boot() { render(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();