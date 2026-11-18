(function () {
  'use strict';
  var svg = document.getElementById('wh-svg');
  var g = document.getElementById('wh-points');
  var tip = document.getElementById('wh-tip');
  var countEl = document.getElementById('wh-count');
  var qEl = document.getElementById('wh-q');
  var catEl = document.getElementById('wh-cat');
  var regEl = document.getElementById('wh-region');
  var cnEl = document.getElementById('wh-cn');
  if (!svg || !g) return;
  var pts = [];
  var NS = 'http://www.w3.org/2000/svg';
  var CLS = { Cultural: 'pt-c', Natural: 'pt-n', Mixed: 'pt-m' };
  var CATCN = { Cultural: '文化遗产', Natural: '自然遗产', Mixed: '混合遗产' };
  var REGCN = {
    'Europe and North America': '欧洲和北美',
    'Asia and the Pacific': '亚太地区',
    'Latin America and the Caribbean': '拉丁美洲和加勒比',
    'Africa': '非洲',
    'Arab States': '阿拉伯国家'
  };
  function regCn(r) {
    var parts = String(r || '').split(',');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (REGCN[parts[i]]) out.push(REGCN[parts[i]]);
    }
    return out.length ? out.join(' / ') : String(r || '');
  }
  function proj(la, lo) {
    return [(lo + 180) / 360 * 1000, (90 - la) / 180 * 500];
  }
  function norm(s) { return String(s == null ? '' : s).toLowerCase(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function render() {
    var q = norm(qEl && qEl.value).trim();
    var cat = catEl ? catEl.value : '';
    var reg = regEl ? regEl.value : '';
    var cnOnly = cnEl && cnEl.checked;
    var frag = document.createDocumentFragment();
    var shown = 0;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (cat && p.k !== cat) continue;
      if (reg && p.r !== reg) continue;
      if (cnOnly && p.cn !== 1) continue;
      if (q) {
        var hay = norm(p.n + ' ' + p.en + ' ' + p.c + ' ' + p.y);
        if (hay.indexOf(q) < 0) continue;
      }
      var xy = proj(p.la, p.lo);
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', xy[0].toFixed(2));
      c.setAttribute('cy', xy[1].toFixed(2));
      c.setAttribute('r', q ? 2.9 : 1.7);
      c.setAttribute('class', CLS[p.k] || 'pt-c');
      c.setAttribute('data-wh', p.id);
      frag.appendChild(c);
      shown++;
    }
    while (g.firstChild) g.removeChild(g.firstChild);
    g.appendChild(frag);
    if (countEl) countEl.textContent = '显示 ' + shown + ' / ' + pts.length + ' 处';
    return shown;
  }
  function showTip(p) {
    if (!tip) return;
    var box = svg.getBoundingClientRect();
    var pt = proj(p.la, p.lo);
    var sx = box.left + pt[0] / 1000 * box.width;
    var sy = box.top + pt[1] / 500 * box.height;
    var html = '<b>' + esc(p.n) + '</b>';
    if (p.en && p.en !== p.n) html += '<span class="tip-en">' + esc(p.en) + '</span>';
    html += '<span class="tip-line">' + esc(p.c || '') + '</span>';
    html += '<span class="tip-line">' + (p.y ? esc(p.y) + ' 年列入' : '') +
      (p.cr ? ' · 标准 ' + esc(p.cr) : '') + ' · ' + esc(CATCN[p.k] || p.k || '') + '</span>';
    html += '<a class="tip-link" href="' + esc(p.u) + '" target="_blank" rel="noopener">UNESCO 官方页面 →</a>';
    if (p.s) html += '<a class="tip-link" href="../entry/' + esc(p.s) + '.html">站内案例档案 →</a>';
    tip.innerHTML = html;
    tip.hidden = false;
    var w = tip.offsetWidth || 220;
    var left = sx + 12;
    if (left + w > window.innerWidth - 8) left = sx - w - 12;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, sy - 10) + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  function wire() {
    g.addEventListener('mouseover', function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'circle') return;
      var id = el.getAttribute('data-wh');
      for (var i = 0; i < pts.length; i++) {
        if (String(pts[i].id) === String(id)) { showTip(pts[i]); return; }
      }
    });
    g.addEventListener('mouseout', hideTip);
    if (qEl) qEl.addEventListener('input', render);
    if (catEl) catEl.addEventListener('change', render);
    if (regEl) regEl.addEventListener('change', render);
    if (cnEl) cnEl.addEventListener('change', render);
    var list = document.querySelectorAll('.wh-site');
    for (var j = 0; j < list.length; j++) {
      list[j].addEventListener('click', function (ev) {
        if (ev.target && ev.target.tagName === 'A') return;
        var id = this.getAttribute('data-wh');
        var c = g.querySelector('circle[data-wh="' + id + '"]');
        if (!c) return;
        for (var k = 0; k < list.length; k++) list[k].classList.remove('on');
        this.classList.add('on');
        for (var m = 0; m < g.childNodes.length; m++) {
          if (g.childNodes[m].classList) g.childNodes[m].classList.remove('pt-sel');
        }
        c.classList.add('pt-sel');
        c.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
    }
  }
  wire();
  fetch('../data/wh_map.json').then(function (r) { return r.json(); }).then(function (data) {
    pts = Array.isArray(data) ? data : [];
    var regions = {};
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].r) regions[pts[i].r] = (regions[pts[i].r] || 0) + 1;
    }
    if (regEl) {
      var keys = Object.keys(regions).sort();
      for (var j = 0; j < keys.length; j++) {
        var o = document.createElement('option');
        o.value = keys[j];
        o.textContent = regCn(keys[j]) + ' (' + regions[keys[j]] + ')';
        regEl.appendChild(o);
      }
    }
    render();
  }).catch(function () {
    if (countEl) countEl.textContent = '点位数据加载失败';
  });
})();
