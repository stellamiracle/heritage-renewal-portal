/* 静态站客户端检索层（纯静态托管专用：GitHub Pages / COS / OSS）
   背景：静态托管没有服务端渲染，/browse?q=xxx 的查询参数不会生效；
   本脚本读取 URL 查询参数 -> 拉取 data/entries.json -> 浏览器端筛选并渲染结果卡片。 */
(function () {
  'use strict';
  var TYPE_LABEL = { regulation: '法规', policy: '政策', case: '案例', news: '动态' };
  var TYPE_BY_LABEL = { '法规': 'regulation', '政策': 'policy', '案例': 'case', '动态': 'news' };
  function parseQuery() {
    var out = {};
    var s = (location.search || '').replace(/^\?/, '');
    if (!s) return out;
    s.split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = decodeURIComponent((i < 0 ? kv : kv.slice(0, i)).replace(/\+/g, ' ')).trim();
      var v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
      if (k) out[k] = v;
    });
    return out;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ''); }
  function inRange(d, from, to) {
    if (!from && !to) return true;
    if (!d) return false;
    d = String(d).slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }
  function hit(e, kw) {
    if (!kw) return true;
    var hay = [e.title, e.doc_no, e.issuer, e.level, e.region, e.status, e.summary,
      (e.themes || []).join(' '), (e.tags || []).join(' '), e.body].join(' ');
    return norm(hay).indexOf(norm(kw)) >= 0;
  }
  function hl(text, kw) {
    var plain = String(text == null ? '' : text);
    if (!kw) return esc(plain);
    var raw = String(kw);
    var low = plain.toLowerCase();
    var k = low.indexOf(raw.toLowerCase()) >= 0 ? raw : norm(kw);
    var out = '', i = 0;
    while (i < plain.length) {
      var idx = low.indexOf(k, i);
      if (idx < 0) { out += esc(plain.slice(i)); break; }
      out += esc(plain.slice(i, idx)) + '<mark>' + esc(plain.slice(idx, idx + k.length)) + '</mark>';
      i = idx + k.length;
    }
    return out;
  }
  var STATUS_CLASS = {
    '现行有效': 'st-valid',
    '失效': 'st-void', '已废止': 'st-void', '已失效': 'st-void', '废止': 'st-void',
    '实施中': 'st-running', '动态': 'st-dyn',
    '实践报道': 'st-report', '入选典型案例': 'st-case'
  };
  /* 规范化字符串 + 原文索引映射，用于把正文命中位置换算回原文偏移 */
  function normMap(s) {
    var low = String(s == null ? '' : s).toLowerCase();
    var out = '', map = [];
    for (var i = 0; i < low.length; i++) {
      if (!/\s/.test(low[i])) { out += low[i]; map.push(i); }
    }
    return { s: out, map: map };
  }
  /* 关键词只命中正文（标题/摘要/主题里看不到）时，截一段正文并高亮，说明"为什么命中" */
  function bodySnippet(e, kw) {
    if (!kw) return '';
    var body = String(e.body == null ? '' : e.body);
    if (!body) return '';
    var visible = [e.title, e.doc_no, e.issuer, e.summary,
      (e.themes || []).join(' '), (e.tags || []).join(' ')].join(' ');
    if (norm(visible).indexOf(norm(kw)) >= 0) return '';
    var nm = normMap(body);
    var k = norm(kw);
    var idx = nm.s.indexOf(k);
    if (idx < 0 || idx + k.length > nm.map.length) return '';
    var start = nm.map[idx];
    var end = nm.map[idx + k.length - 1] + 1;
    var pad = 45;
    var s0 = Math.max(0, start - pad);
    var s1 = Math.min(body.length, end + pad);
    var frag = body.slice(s0, s1).replace(/\s+/g, ' ');
    return '<p class="snippet"><span class="snippet-label">正文命中</span>'
      + (s0 > 0 ? '…' : '') + hl(frag, kw) + (s1 < body.length ? '…' : '') + '</p>';
  }
  function caseFig(e) {
    if (!e || e.type !== 'case' || !e.slug) return '';
    var ps = (e.photos || []).filter(function (p) { return p && p.src; });
    if (ps.length) {
      var p0 = ps[0];
      return '<figure class="card-fig card-fig-photo"><img src="../' + String(p0.src).replace(/^\//, '') +
        '" alt="' + esc(e.title) + ' 现场照片（来源发布方）" loading="lazy"><figcaption>现场照片 · 来源：' +
        esc(e.source_name || '原发布方') + '</figcaption></figure>';
    }
    return '';
  }
  function card(e, kw) {
    var label = TYPE_LABEL[e.type] || e.type;
    var url = '../entry/' + (e.slug || e.id) + '.html';
    var chips = (e.themes || []).slice(0, 4).map(function (t) {
      return '<span class="chip">' + hl(t, kw) + '</span>';
    }).join('');
    var meta = (e.issuer || '') + (e.doc_no ? ' · ' + e.doc_no : '');
    var badge = e.status
      ? '<span class="badge ' + (STATUS_CLASS[e.status] || 'st-other') + '">' + esc(e.status) + '</span>'
      : '';
    var src = e.source_name ? '<p class="src">来源：' + esc(e.source_name) + '</p>' : '';
    return '<article class="card">' + caseFig(e) + '<div class="card-top"><span class="tag tag-' + esc(e.type) + '">' + esc(label) +
      '</span>' + badge + '<time>' + esc(e.publish_date || '') + '</time></div>' +
      '<h3><a href="' + url + '">' + hl(e.title, kw) + '</a></h3>' +
      '<p class="meta">' + hl(meta, kw) + '</p>' +
      '<p class="summary">' + hl(e.summary || '', kw) + '</p>' +
      (chips ? '<p class="chips">' + chips + '</p>' : '') + bodySnippet(e, kw) + src + '</article>';
  }
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function () {
    var form = document.querySelector('form.filters');
    var grid = document.querySelector('.grid.grid-list');
    if (!form || !grid) return;
    var p = parseQuery();
    var kw = (p.q || '').trim();
    var dataUrl = new URL('../data/entries.json', location.href).toString();
    fetch(dataUrl).then(function (r) { return r.json(); }).then(function (data) {
      var list = (data && data.entries) || [];
      var out = list.filter(function (e) {
        if (p.type && e.type !== p.type) return false;
        if (p.level && e.level !== p.level) return false;
        if (p.region && e.region !== p.region) return false;
        if (p.theme && norm((e.themes || []).join(' ')).indexOf(norm(p.theme)) < 0) return false;
        if (p.status && e.status !== p.status) return false;
        if (!inRange(e.publish_date, p.from || '', p.to || '')) return false;
        return hit(e, kw);
      });
      var sort = p.sort || 'date_desc';
      out.sort(function (a, b) {
        if (sort === 'title') return String(a.title).localeCompare(String(b.title), 'zh-Hans-CN');
        if (sort === 'date_asc') return String(a.publish_date || '').localeCompare(String(b.publish_date || ''));
        if (sort === 'updated') return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
        return String(b.publish_date || '').localeCompare(String(a.publish_date || ''));
      });
      grid.innerHTML = out.length ? out.map(function (e) { return card(e, kw); }).join('')
        : '<p class="muted">没有符合条件的条目。可减少筛选条件，或换用关键词检索。</p>';
      var head = document.querySelector('.result-head p.muted');
      if (head) {
        var cond = [];
        if (kw) cond.push('关键词：' + kw);
        if (p.type) cond.push('类型：' + (TYPE_LABEL[p.type] || p.type));
        if (p.level) cond.push('层级：' + p.level);
        if (p.region) cond.push('地区：' + p.region);
        if (p.theme) cond.push('主题：' + p.theme);
        if (p.status) cond.push('效力状态：' + p.status);
        if (p.from || p.to) cond.push('发布日期：' + (p.from || '不限') + ' 至 ' + (p.to || '不限'));
        head.textContent = '共 ' + out.length + ' 条' + (cond.length ? '（' + cond.join(' · ') + '）' : '（客户端检索）');
      }
      var q = form.querySelector("[name=q]");
      if (q && kw && !q.value) q.value = kw;
      var ty = form.querySelector("[name=type]");
      if (ty) ty.value = p.type || '';
      ['level', 'region', 'theme', 'status', 'from', 'to', 'sort'].forEach(function (n) {
        var el = form.querySelector('[name=' + n + ']');
        if (el && p[n] && !el.value) el.value = p[n];
      });
      /* 客户端检索一次性给出全部命中，静态分页器不再适用 */
      var pager = document.querySelector('.pager');
      if (pager && pager.parentNode) pager.parentNode.removeChild(pager);
      var tabs = document.querySelectorAll('.tabs .tab');
      Array.prototype.forEach.call(tabs, function (a) {
        var type = TYPE_BY_LABEL[(a.textContent || '').trim()];
        if (!type) return;
        a.setAttribute('href', 'index.html?type=' + type + (kw ? '&q=' + encodeURIComponent(kw) : ''));
        if (p.type === type) a.className = a.className.replace(/\s*active/, '') + ' active';
      });
    }).catch(function () {
      /* 数据拉取失败时保留静态列表，不做破坏 */
    });
  });
})();

