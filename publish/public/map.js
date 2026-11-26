(function () {
  'use strict';
  var svg = document.getElementById('wh-svg');
  var g = document.getElementById('wh-points');
  var gCase = document.getElementById('wh-cases');
  var tip = document.getElementById('wh-tip');
  var countEl = document.getElementById('wh-count');
  var qEl = document.getElementById('wh-q');
  var catEl = document.getElementById('wh-cat');
  var regEl = document.getElementById('wh-region');
  var cnEl = document.getElementById('wh-cn');
  var resEl = document.getElementById('wh-results');
  var resCountEl = document.getElementById('wh-res-count');
  var detEl = document.getElementById('wh-detail');
  var zinEl = document.getElementById('wh-zoom-in');
  var zoutEl = document.getElementById('wh-zoom-out');
  var rstEl = document.getElementById('wh-reset');
  var statEl = document.getElementById('wh-status');
  if (!svg || !g) return;

  var NS = 'http://www.w3.org/2000/svg';
  var W0 = 1000, H0 = 500, RATIO = 0.5;
  var MINW = 12, MAXW = W0;
  var view = { x: 0, y: 0, w: W0, h: H0 };
  var pts = [], cases = [], matched = [];
  var selId = '', selCase = '';
  var CLS = { Cultural: 'pt-c', Natural: 'pt-n', Mixed: 'pt-m' };
  var CATCN = { Cultural: '文化遗产', Natural: '自然遗产', Mixed: '混合遗产' };
  var REGCN = {
    'Europe and North America': '欧洲和北美',
    'Asia and the Pacific': '亚太地区',
    'Latin America and the Caribbean': '拉丁美洲和加勒比',
    'Africa': '非洲',
    'Arab States': '阿拉伯国家'
  };
  var AMP = String.fromCharCode(38), LT = String.fromCharCode(60);
  var GT = String.fromCharCode(62), QQ = String.fromCharCode(34);

  function esc(s) {
    return String(s == null ? '' : s).split(AMP).join('&amp;').split(LT).join('&lt;')
      .split(GT).join('&gt;').split(QQ).join('&quot;');
  }
  function norm(s) { return String(s == null ? '' : s).toLowerCase(); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function proj(la, lo) { return [(lo + 180) / 360 * W0, (90 - la) / 180 * H0]; }
  function regCn(r) {
    var parts = String(r || '').split(',');
    var out = [];
    for (var i = 0; i < parts.length; i++) { if (REGCN[parts[i]]) out.push(REGCN[parts[i]]); }
    return out.length ? out.join(' / ') : String(r || '');
  }
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  function mapToScreen(x, y) {
    var box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return [0, 0];
    return [box.left + (x - view.x) / view.w * box.width,
            box.top + (y - view.y) / view.h * box.height];
  }
  function screenToMap(sx, sy) {
    var box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return [view.x, view.y];
    return [view.x + (sx - box.left) / box.width * view.w,
            view.y + (sy - box.top) / box.height * view.h];
  }
  function clampView() {
    if (view.w >= W0) { view.x = 0; view.y = 0; view.h = H0; return; }
    view.x = clamp(view.x, 0, W0 - view.w);
    view.y = clamp(view.y, 0, H0 - view.h);
  }
  function applyView() {
    svg.setAttribute('viewBox', view.x.toFixed(2) + ' ' + view.y.toFixed(2) + ' ' +
      view.w.toFixed(2) + ' ' + view.h.toFixed(2));
    var k = view.w / W0;
    var list = g.childNodes;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c.getAttribute) continue;
      var base = parseFloat(c.getAttribute('data-r') || '1.7');
      var isSel = c.getAttribute('data-sel') === '1';
      c.setAttribute('r', (base * k * (isSel ? 1.9 : 1)).toFixed(3));
    }
    if (gCase) {
      var cl = gCase.childNodes;
      for (var j = 0; j < cl.length; j++) {
        var m = cl[j];
        if (!m.getAttribute) continue;
        var s = (parseFloat(m.getAttribute('data-s') || '2.6') * k);
        m.setAttribute('width', s.toFixed(3));
        m.setAttribute('height', s.toFixed(3));
        m.setAttribute('x', (parseFloat(m.getAttribute('data-x')) - s / 2).toFixed(3));
        m.setAttribute('y', (parseFloat(m.getAttribute('data-y')) - s / 2).toFixed(3));
      }
    }
    if (statEl) {
      statEl.textContent = '缩放 ' + (W0 / view.w).toFixed(1) + '×';
    }
  }
  var raf = null;
  function animateTo(target, dur, done) {
    if (raf) cancelAnimationFrame(raf);
    var s = { x: view.x, y: view.y, w: view.w };
    var t0 = nowMs();
    function step() {
      var t = Math.min(1, (nowMs() - t0) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      view.w = s.w + (target.w - s.w) * e;
      view.h = view.w * RATIO;
      view.x = s.x + (target.x - s.x) * e;
      view.y = s.y + (target.y - s.y) * e;
      clampView();
      applyView();
      if (t < 1) { raf = requestAnimationFrame(step); }
      else { raf = null; if (done) done(); }
    }
    raf = requestAnimationFrame(step);
  }
  function zoomAt(sx, sy, factor) {
    var p = screenToMap(sx, sy);
    var nw = clamp(view.w / factor, MINW, MAXW);
    var k = nw / view.w;
    var nx = p[0] - (p[0] - view.x) * k;
    var ny = p[1] - (p[1] - view.y) * k;
    view.w = nw; view.h = nw * RATIO; view.x = nx; view.y = ny;
    clampView();
    applyView();
  }
  function zoomCenter(factor) {
    var box = svg.getBoundingClientRect();
    zoomAt(box.left + box.width / 2, box.top + box.height / 2, factor);
  }
  function resetView() {
    animateTo({ x: 0, y: 0, w: W0 }, 420);
  }
  function findPt(id) {
    for (var i = 0; i < pts.length; i++) { if (String(pts[i].id) === String(id)) return pts[i]; }
    return null;
  }
  function findCase(slug) {
    for (var i = 0; i < cases.length; i++) { if (String(cases[i].slug) === String(slug)) return cases[i]; }
    return null;
  }

  function focusPt(id, opts) {
    var p = findPt(id);
    if (!p) return false;
    var xy = proj(p.la, p.lo);
    var tw = view.w > 80 ? 60 : 34;
    selId = String(p.id);
    selCase = '';
    animateTo({ x: xy[0] - tw / 2, y: xy[1] - tw * RATIO / 2, w: tw }, 520, function () {
      markSel();
      showTip(p);
      fillDetail(p);
    });
    markSel();
    fillDetail(p);
    if (opts && opts.scroll) {
      var frame = svg.parentNode;
      if (frame && frame.scrollIntoView) frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return true;
  }
  function focusCase(slug, opts) {
    var c = findCase(slug);
    if (!c) return false;
    var xy = proj(c.la, c.lo);
    var tw = view.w > 80 ? 60 : 34;
    selCase = String(c.slug);
    selId = c.w ? String(c.w) : '';
    animateTo({ x: xy[0] - tw / 2, y: xy[1] - tw * RATIO / 2, w: tw }, 520, function () {
      markSel();
      fillDetail(null, c);
    });
    markSel();
    fillDetail(null, c);
    if (opts && opts.scroll) {
      var frame = svg.parentNode;
      if (frame && frame.scrollIntoView) frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return true;
  }
  function markSel() {
    var list = g.childNodes;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c.getAttribute) continue;
      var on = selId && c.getAttribute('data-wh') === selId;
      c.setAttribute('data-sel', on ? '1' : '0');
      if (on) c.classList.add('pt-sel'); else c.classList.remove('pt-sel');
    }
    if (gCase) {
      var cl = gCase.childNodes;
      for (var j = 0; j < cl.length; j++) {
        var m = cl[j];
        if (!m.getAttribute) continue;
        var on2 = selCase && m.getAttribute('data-case') === selCase;
        m.classList.toggle('cp-sel', !!on2);
      }
    }
    applyView();
  }
  function fillDetail(p, c) {
    if (!detEl) return;
    if (c) {
      detEl.innerHTML = '<div class="wh-d-k">站内案例档案</div>' +
        '<b>' + esc(c.t) + '</b>' +
        (c.r ? '<span class="wh-d-line">' + esc(c.r) + '</span>' : '') +
        (c.w ? '<span class="wh-d-line">《世界遗产名录》编号 ' + esc(c.w) + '</span>' : '') +
        '<span class="wh-d-line">名录公布坐标 ' + Number(c.la).toFixed(4) + ', ' +
          Number(c.lo).toFixed(4) + '</span>' +
        '<a class="wh-d-link" href="../entry/' + esc(c.slug) + '.html">阅读案例档案 →</a>';
      detEl.hidden = false;
      return;
    }
    if (!p) { detEl.hidden = true; detEl.innerHTML = ''; return; }
    var html = '<div class="wh-d-k">名录遗产地</div>' +
      '<b>' + esc(p.n) + '</b>';
    if (p.en && p.en !== p.n) html += '<span class="wh-d-en">' + esc(p.en) + '</span>';
    html += '<span class="wh-d-line">' + esc(p.c || '') + '</span>';
    html += '<span class="wh-d-line">' + (p.y ? esc(p.y) + ' 年列入' : '') +
      (p.cr ? ' · 标准 ' + esc(p.cr) : '') + ' · ' + esc(CATCN[p.k] || p.k || '') + '</span>';
    html += '<span class="wh-d-line">名录公布坐标 ' + Number(p.la).toFixed(4) + ', ' +
      Number(p.lo).toFixed(4) + '（不代表保护地范围）</span>';
    html += '<a class="wh-d-link" href="' + esc(p.u) + '" target="_blank" rel="noopener">UNESCO 官方页面 →</a>';
    if (p.s) html += '<a class="wh-d-link" href="../entry/' + esc(p.s) + '.html">站内案例档案 →</a>';
    detEl.innerHTML = html;
    detEl.hidden = false;
  }

  function render() {
    var q = norm(qEl && qEl.value).trim();
    var cat = catEl ? catEl.value : '';
    var reg = regEl ? regEl.value : '';
    var cnOnly = cnEl && cnEl.checked;
    var frag = document.createDocumentFragment();
    var res = [];
    var big = q ? 2.9 : 1.7;
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
      c.setAttribute('r', big.toFixed(2));
      c.setAttribute('data-r', big.toFixed(2));
      c.setAttribute('data-sel', '0');
      c.setAttribute('class', CLS[p.k] || 'pt-c');
      c.setAttribute('data-wh', p.id);
      var t = document.createElementNS(NS, 'title');
      t.textContent = p.n + '（' + (p.c || '') + '）';
      c.appendChild(t);
      frag.appendChild(c);
      res.push(p);
    }
    while (g.firstChild) g.removeChild(g.firstChild);
    g.appendChild(frag);
    matched = res;
    if (countEl) countEl.textContent = '显示 ' + res.length + ' / ' + pts.length + ' 处';
    renderResults(res);
    markSel();
  }
  function renderResults(res) {
    if (!resEl) return;
    var cap = Math.min(res.length, 80);
    var html = '';
    for (var i = 0; i < cap; i++) {
      var p = res[i];
      html += '<li><button type="button" class="wh-res" data-wh="' + esc(p.id) + '">' +
        '<b>' + esc(p.n) + '</b>' +
        '<span>' + esc(p.c || '') + (p.y ? ' · ' + esc(p.y) : '') + '</span></button></li>';
    }
    resEl.innerHTML = html;
    if (resCountEl) {
      resCountEl.textContent = res.length > cap
        ? '命中 ' + res.length + ' 处，列出前 ' + cap + ' 处（点条目名可在图上定位）'
        : '命中 ' + res.length + ' 处（点条目名可在图上定位）';
    }
  }
  function renderCases() {
    if (!gCase) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < cases.length; i++) {
      var c = cases[i];
      var xy = proj(c.la, c.lo);
      var m = document.createElementNS(NS, 'rect');
      m.setAttribute('x', (xy[0] - 1.3).toFixed(2));
      m.setAttribute('y', (xy[1] - 1.3).toFixed(2));
      m.setAttribute('width', '2.6');
      m.setAttribute('height', '2.6');
      m.setAttribute('data-x', xy[0].toFixed(2));
      m.setAttribute('data-y', xy[1].toFixed(2));
      m.setAttribute('data-s', '2.6');
      m.setAttribute('data-case', c.slug);
      m.setAttribute('class', 'cp-mark');
      var t = document.createElementNS(NS, 'title');
      t.textContent = '站内案例：' + c.t;
      m.appendChild(t);
      frag.appendChild(m);
    }
    while (gCase.firstChild) gCase.removeChild(gCase.firstChild);
    gCase.appendChild(frag);
  }
  function showTip(p) {
    if (!tip) return;
    var sc = mapToScreen(proj(p.la, p.lo)[0], proj(p.la, p.lo)[1]);
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
    var left = sc[0] + 14;
    if (left + w > window.innerWidth - 8) left = sc[0] - w - 14;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, sc[1] - 12) + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }

  function wire() {
    g.addEventListener('mouseover', function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'circle') return;
      var id = el.getAttribute('data-wh');
      var p = findPt(id);
      if (p) showTip(p);
    });
    g.addEventListener('mouseout', hideTip);
    g.addEventListener('click', function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'circle') return;
      focusPt(el.getAttribute('data-wh'));
    });
    if (gCase) {
      gCase.addEventListener('click', function (e) {
        var el = e.target;
        if (!el || el.tagName !== 'rect') return;
        focusCase(el.getAttribute('data-case'));
      });
      gCase.addEventListener('mouseover', function (e) {
        var el = e.target;
        if (!el || el.tagName !== 'rect') return;
        var c = findCase(el.getAttribute('data-case'));
        if (!c) return;
        showCaseTip(c);
      });
      gCase.addEventListener('mouseout', hideTip);
    }
    if (qEl) qEl.addEventListener('input', render);
    if (catEl) catEl.addEventListener('change', render);
    if (regEl) regEl.addEventListener('change', render);
    if (cnEl) cnEl.addEventListener('change', render);
    if (zinEl) zinEl.addEventListener('click', function () { zoomCenter(1.6); });
    if (zoutEl) zoutEl.addEventListener('click', function () { zoomCenter(1 / 1.6); });
    if (rstEl) rstEl.addEventListener('click', function () { resetView(); selId = ''; selCase = ''; markSel(); fillDetail(null); });
    if (resEl) {
      resEl.addEventListener('click', function (e) {
        var b = e.target;
        while (b && b.tagName !== 'BUTTON') b = b.parentNode;
        if (!b || !b.getAttribute) return;
        focusPt(b.getAttribute('data-wh'), { scroll: true });
      });
    }
    var list = document.querySelectorAll('.wh-site');
    for (var j = 0; j < list.length; j++) {
      list[j].addEventListener('click', function (ev) {
        if (ev.target && ev.target.tagName === 'A') return;
        var id = this.getAttribute('data-wh');
        for (var k = 0; k < list.length; k++) list[k].classList.remove('on');
        this.classList.add('on');
        focusPt(id, { scroll: true });
      });
      list[j].addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          focusPt(this.getAttribute('data-wh'), { scroll: true });
        }
      });
    }
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });
    var drag = null;
    svg.addEventListener('pointerdown', function (e) {
      if (e.target && e.target.tagName === 'circle') return;
      if (e.target && e.target.tagName === 'rect') return;
      drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
      svg.setPointerCapture && svg.setPointerCapture(e.pointerId);
      svg.classList.add('dragging');
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var box = svg.getBoundingClientRect();
      var dx = (e.clientX - drag.x) / box.width * view.w;
      var dy = (e.clientY - drag.y) / box.height * view.h;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
      view.x = drag.vx - dx;
      view.y = drag.vy - dy;
      clampView();
      applyView();
    });
    function endDrag(e) {
      if (!drag) return;
      drag = null;
      svg.classList.remove('dragging');
      if (svg.releasePointerCapture && e && e.pointerId != null) {
        try { svg.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('pointerleave', endDrag);
    window.addEventListener('resize', function () { applyView(); });
  }
  function showCaseTip(c) {
    if (!tip) return;
    var xy = proj(c.la, c.lo);
    var sc = mapToScreen(xy[0], xy[1]);
    tip.innerHTML = '<b>站内案例</b><span class="tip-line">' + esc(c.t) + '</span>' +
      (c.r ? '<span class="tip-line">' + esc(c.r) + '</span>' : '') +
      '<span class="tip-line">名录公布坐标 ' + Number(c.la).toFixed(4) + ', ' +
      Number(c.lo).toFixed(4) + '</span>' +
      '<a class="tip-link" href="../entry/' + esc(c.slug) + '.html">阅读案例档案 →</a>';
    tip.hidden = false;
    var w = tip.offsetWidth || 220;
    var left = sc[0] + 14;
    if (left + w > window.innerWidth - 8) left = sc[0] - w - 14;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, sc[1] - 12) + 'px';
  }

  wire();
  applyView();
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
  fetch('../data/case_points.json').then(function (r) { return r.json(); }).then(function (data) {
    cases = Array.isArray(data) ? data : [];
    renderCases();
    applyView();
  }).catch(function () {
    cases = [];
  });

  window.__whMap = {
    focus: function (id) { return focusPt(id); },
    focusCase: function (slug) { return focusCase(slug); },
    view: function () { return { x: view.x, y: view.y, w: view.w, h: view.h }; },
    matched: function () { return matched.length; },
    points: function () { return pts.length; },
    cases: function () { return cases.length; }
  };
})();
