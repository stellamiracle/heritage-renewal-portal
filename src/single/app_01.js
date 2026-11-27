  function figHtml(e) {
    if (!e || e.type !== 'case') return '';
    var ps = (e.photos || []).filter(function (p) { return p && p.src; });
    if (ps.length) {
      var p0 = ps[0];
      return '@LT@figure class=@Q@card-fig card-fig-photo@Q@@GT@@LT@img src=@Q@' + p0.src +
        '@Q@ alt=@Q@' + E(e.title) + ' 现场照片（来源发布方）@Q@ loading=@Q@lazy@Q@@GT@' +
        '@LT@figcaption@GT@现场照片 · 来源：' + E(e.source_name || '原发布方') +
        '@LT@/figcaption@GT@@LT@/figure@GT@';
    }
    return '';
  }
  function cardHtml(e, compact) {
    var meta = [E(e.issuer || ''), E(e.doc_no || '')].filter(Boolean).join(' · ');
    var theme = (e.themes || []).slice(0, 3).map(function (t) {
      return '@LT@span class=@Q@chip@Q@@GT@' + E(t) + '@LT@/span@GT@';
    }).join('');
    if (compact && e.type === 'case') {
      var region = e.region ? '@LT@span class=@Q@cm-region@Q@@GT@' + E(e.region) + '@LT@/span@GT@' : '';
      var kind = (e.themes || [])[0] ? '@LT@span class=@Q@cm-kind@Q@@GT@' + E(e.themes[0]) + '@LT@/span@GT@' : '';
      var stc = { '现行有效': 'st-valid', '失效': 'st-void', '已废止': 'st-void', '已失效': 'st-void', '废止': 'st-void', '实施中': 'st-running', '动态': 'st-dyn', '实践报道': 'st-report', '入选典型案例': 'st-case' };
      var st = e.status ? '@LT@span class=@Q@badge ' + (stc[e.status] || 'st-other') + '@Q@@GT@' + E(e.status) + '@LT@/span@GT@' : '';
      var dt = e.publish_date ? '@LT@time@GT@' + E(e.publish_date) + '@LT@/time@GT@' : '';
      var sr = e.source_name ? '@LT@p class=@Q@src@Q@@GT@来源：' + E(e.source_name) + '@LT@/p@GT@' : '';
      var figC = figHtml(e) || '@LT@div class=@Q@card-nofig@Q@@GT@暂无现场照片@LT@/div@GT@';
      return '@LT@article class=@Q@card card-case@Q@@GT@' +
        figC +
        '@LT@div class=@Q@card-top@Q@@GT@@LT@span class=@Q@tag tag-' + E(e.type) +
        '@Q@@GT@' + E(e.type_label || typeLabel(e.type)) + '@LT@/span@GT@' +
        region + kind +
        '@LT@/div@GT@' +
        '@LT@div class=@Q@cm-meta@Q@@GT@' + st + dt + '@LT@/div@GT@' +
        '@LT@h3@GT@@LT@a href=@Q@' + href('/entry/' + e.slug) + '@Q@@GT@' +
        E(e.title) + '@LT@/a@GT@@LT@/h3@GT@' +
        '@LT@p class=@Q@summary@Q@@GT@' + E(e.summary || '') + '@LT@/p@GT@' +
        sr +
        '@LT@/article@GT@';
    }
    return '@LT@article class=@Q@card@Q@@GT@' +
      figHtml(e) +
      '@LT@div class=@Q@card-top@Q@@GT@@LT@span class=@Q@tag tag-' + E(e.type) +
      '@Q@@GT@' + E(e.type_label || typeLabel(e.type)) + '@LT@/span@GT@' +
      (e.publish_date ? '@LT@time@GT@' + E(e.publish_date) + '@LT@/time@GT@' : '') +
      '@LT@/div@GT@' +
      '@LT@h3@GT@@LT@a href=@Q@' + href('/entry/' + e.slug) + '@Q@@GT@' +
      E(e.title) + '@LT@/a@GT@@LT@/h3@GT@' +
      (meta ? '@LT@p class=@Q@meta@Q@@GT@' + meta + '@LT@/p@GT@' : '') +
      '@LT@p class=@Q@summary@Q@@GT@' + E(e.summary || '') + '@LT@/p@GT@' +
      (theme ? '@LT@p class=@Q@chips@Q@@GT@' + theme + '@LT@/p@GT@' : '') +
      '@LT@/article@GT@';
  }
  function homeHtml() {
    var s = D.stats || {};
    var bt = s.byType || {};
    var cats = TYPES.map(function (t) {
      return '@LT@a class=@Q@cat-card cat-' + t[0] + '@Q@ href=@Q@' +
        href('/browse', { type: t[0] }) + '@Q@@GT@' +
        '@LT@span class=@Q@cat-num@Q@@GT@' + (bt[t[0]] || 0) + '@LT@/span@GT@' +
        '@LT@span class=@Q@cat-name@Q@@GT@' + t[1] + '@LT@/span@GT@' +
        '@LT@span class=@Q@cat-desc@Q@@GT@' + t[2] + '@LT@/span@GT@' +
        '@LT@/a@GT@';
    }).join('');
    var hot = entries.slice(0, 8).map(function (x) { return cardHtml(x); }).join('');
    return '@LT@section class=@Q@hero@Q@@GT@' +
      '@LT@h1@GT@遗产保护与城市更新@LT@br@GT@@LT@span@GT@专题资料库@LT@/span@GT@@LT@/h1@GT@' +
      '@LT@p class=@Q@lede@Q@@GT@汇集法规、政策、案例与动态四大板块，收录中央与地方公开发布的官方文本，标注发布机关、发布日期与原文链接，可按地区、层级、主题与时间筛选检索。@LT@/p@GT@' +
      '@LT@form class=@Q@searchbar@Q@ onsubmit=@Q@return goSearch(this)@Q@@GT@' +
      '@LT@input type=@Q@search@Q@ name=@Q@q@Q@ placeholder=@Q@输入关键词：城市更新 / 文物保护 / 历史建筑 / 传统村落…@Q@@GT@' +
      '@LT@button type=@Q@submit@Q@@GT@检索@LT@/button@GT@@LT@/form@GT@' +
      '@LT@p class=@Q@hero-stats@Q@@GT@@LT@b@GT@' + (s.total || 0) +
      '@LT@/b@GT@ 条已公开条目 · @LT@b@GT@' + (bt.regulation || 0) +
      '@LT@/b@GT@ 法规 · @LT@b@GT@' + (bt.policy || 0) + '@LT@/b@GT@ 政策 · ' +
      '@LT@b@GT@' + (bt.case || 0) + '@LT@/b@GT@ 案例@LT@/p@GT@' +
      '@LT@/section@GT@' +
      '@LT@section class=@Q@cats@Q@@GT@' + cats + '@LT@/section@GT@' +
      '@LT@section@GT@@LT@h2 class=@Q@section-title@Q@@GT@最新收录@LT@/h2@GT@' +
      '@LT@div class=@Q@grid@Q@@GT@' + hot + '@LT@/div@GT@' +
      '@LT@p class=@Q@more-wrap@Q@@GT@@LT@a class=@Q@btn btn-ghost@Q@ href=@Q@' +
      href('/browse') + '@Q@@GT@查看全部条目 →@LT@/a@GT@@LT@/p@GT@' +
      '@LT@/section@GT@';
  }
  function plain(h) {
    var s = String(h == null ? '' : h);
    var o = '';
    var d = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === LT) { d++; continue; }
      if (c === String.fromCharCode(62)) { d--; continue; }
      if (d === 0) o += c;
    }
    return o;
  }
  function filtered(q) {
    var list = entries.slice();
    if (q.type) list = list.filter(function (e) { return e.type === q.type; });
    if (q.level) list = list.filter(function (e) { return e.level === q.level; });
    if (q.region) list = list.filter(function (e) { return e.region === q.region; });
    if (q.theme) {
      list = list.filter(function (e) {
        return (e.themes || []).indexOf(q.theme) @GT@ 0;
      });
    }
    if (q.status) list = list.filter(function (e) { return e.status === q.status; });
    if (q.from) {
      list = list.filter(function (e) { return (e.publish_date || '') @GT@= q.from; });
    }
    if (q.to) {
      list = list.filter(function (e) {
        return (e.publish_date || '') && (e.publish_date || '') @LT@= q.to;
      });
    }
    if (q.q) {
      var kw = String(q.q).toLowerCase();
      list = list.filter(function (e) {
        var hay = [e.title, e.summary, e.issuer, e.doc_no, e.region,
          e.source_name, plain(e.bodyHtml), (e.themes || []).join(' ')]
          .join(' ').toLowerCase();
        return hay.indexOf(kw) @GT@ 0;
      });
    }
    var sort = q.sort || 'date_desc';
    list.sort(function (a, b) {
      if (sort === 'title') return a.title.localeCompare(b.title, 'zh');
      var x = a.publish_date || '';
      var y = b.publish_date || '';
      if (sort === 'date_asc') return x @LT@ y ? -1 : (x @GT@ y ? 1 : 0);
      return x @GT@ y ? -1 : (x @LT@ y ? 1 : 0);
    });
    return list;
  }
  function optHtml(list, cur, label) {
    var s = '@LT@option value=@Q@@Q@@GT@' + E(label) + '@LT@/option@GT@';
    (list || []).forEach(function (x) {
      var sel = String(x) === String(cur) ? ' selected' : '';
      s += '@LT@option value=@Q@' + E(x) + '@Q@' + sel + '@GT@' + E(x) +
        '@LT@/option@GT@';
    });
    return s;
  }
  function pagerHtml(q, pages, page) {
    if (pages @LT@= 1) return '';
    function mk(p, label, cls) {
      var cur = p === page ? ' current' : '';
      var link = href('/browse', merge(q, { page: String(p) }));
      return '@LT@a class=@Q@page' + cur + (cls || '') + '@Q@ href=@Q@' + link +
        '@Q@@GT@' + label + '@LT@/a@GT@';
    }
    var out = '@LT@nav class=@Q@pager@Q@@GT@';
    if (page @GT@ 1) out += mk(page - 1, '上一页', ' prev');
    else out += '@LT@span class=@Q@page off@Q@@GT@上一页@LT@/span@GT@';
    var from = Math.max(1, page - 2);
    var to = Math.min(pages, from + 4);
    for (var i = from; i @LT@= to; i++) out += mk(i, String(i));
    if (page @LT@ pages) out += mk(page + 1, '下一页', ' next');
    else out += '@LT@span class=@Q@page off@Q@@GT@下一页@LT@/span@GT@';
    return out + '@LT@/nav@GT@';
  }
