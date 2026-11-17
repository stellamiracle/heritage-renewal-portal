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
    var k = norm(kw), low = plain.toLowerCase(), out = '', i = 0;
    while (i < plain.length) {
      var idx = low.indexOf(k, i);
      if (idx < 0) { out += esc(plain.slice(i)); break; }
      out += esc(plain.slice(i, idx)) + '<mark>' + esc(plain.slice(idx, idx + k.length)) + '</mark>';
      i = idx + k.length;
    }
    return out;
  }
  function card(e, kw) {
    var label = TYPE_LABEL[e.type] || e.type;
    var url = '../entry/' + (e.slug || e.id) + '.html';
    var chips = (e.themes || []).slice(0, 4).map(function (t) {
      return '<span class="chip">' + esc(t) + '</span>';
    }).join('');
    var meta = (e.issuer || '') + (e.doc_no ? ' · ' + e.doc_no : '');
    return '<article class="card"><div class="card-top"><span class="tag tag-' + esc(e.type) + '">' + esc(label) +
      '</span><time>' + esc(e.publish_date || '') + '</time></div>' +
      '<h3><a href="' + url + '">' + hl(e.title, kw) + '</a></h3>' +
      '<p class="meta">' + hl(meta, kw) + '</p>' +
      '<p class="summary">' + hl(e.summary || '', kw) + '</p>' +
      (chips ? '<p class="chips">' + chips + '</p>' : '') + '</article>';
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
      if (head) head.textContent = '共 ' + out.length + ' 条' + (kw ? '（关键词：' + kw + '）' : '（客户端检索）');
      var q = form.querySelector("[name=q]");
      if (q && kw && !q.value) q.value = kw;
      var ty = form.querySelector("[name=type]");
      if (ty) ty.value = p.type || '';
      ['level', 'region', 'theme', 'status', 'from', 'to', 'sort'].forEach(function (n) {
        var el = form.querySelector('[name=' + n + ']');
        if (el && p[n] && !el.value) el.value = p[n];
      });
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
