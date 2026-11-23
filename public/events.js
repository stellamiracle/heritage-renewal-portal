(function () {
  'use strict';
  var listEl = document.getElementById('ev-list');
  var calEl = document.getElementById('ev-cal');
  if (!listEl || !calEl) { return; }
  var cards = Array.prototype.slice.call(listEl.querySelectorAll('.ev-card'));
  var countEl = document.getElementById('ev-count');
  var emptyEl = document.getElementById('ev-empty');
  var labelEl = document.getElementById('ev-cal-label');
  var events = [];
  var now = new Date();
  var view = { y: now.getFullYear(), m: now.getMonth() };

  function byId(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function norm(s) { return String(s == null ? '' : s).toLowerCase(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function state() {
    return {
      q: norm(byId('ev-q')),
      type: byId('ev-type'),
      topic: byId('ev-topic'),
      region: byId('ev-region'),
      format: byId('ev-format'),
      status: byId('ev-status')
    };
  }
  function matchCard(el, s) {
    if (s.type && el.getAttribute('data-type') !== s.type) { return false; }
    if (s.region && el.getAttribute('data-region') !== s.region) { return false; }
    if (s.format && el.getAttribute('data-format') !== s.format) { return false; }
    if (s.status && el.getAttribute('data-status') !== s.status) { return false; }
    if (s.topic) {
      var tp = (el.getAttribute('data-topics') || '').split('|');
      if (tp.indexOf(s.topic) < 0) { return false; }
    }
    if (s.q && norm(el.getAttribute('data-text')).indexOf(s.q) < 0) { return false; }
    return true;
  }
  function matchEvent(ev, s) {
    if (s.type && ev.type !== s.type) { return false; }
    if (s.region && ev.region !== s.region) { return false; }
    if (s.format && ev.format !== s.format) { return false; }
    if (s.status && ev.status !== s.status) { return false; }
    if (s.topic && (ev.topics || []).indexOf(s.topic) < 0) { return false; }
    if (s.q) {
      var hay = [ev.name, ev.name_en, ev.summary, ev.organizer, ev.co_organizer, ev.city, ev.country, ev.venue]
        .join(' ').toLowerCase();
      if (hay.indexOf(s.q) < 0) { return false; }
    }
    return true;
  }
  function apply() {
    var s = state();
    var n = 0;
    cards.forEach(function (el) {
      var ok = matchCard(el, s);
      el.classList.toggle('hidden', !ok);
      if (ok) { n++; }
    });
    if (countEl) { countEl.textContent = '共 ' + n + ' 场活动'; }
    if (emptyEl) { emptyEl.hidden = n !== 0; }
    renderCal();
  }
  function renderCal() {
    var s = state();
    var byDate = {};
    events.forEach(function (e) {
      if (!matchEvent(e, s) || !e.start_date) { return; }
      if (!byDate[e.start_date]) { byDate[e.start_date] = []; }
      byDate[e.start_date].push(e);
    });
    var y = view.y, m = view.m;
    var firstDow = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var prevDays = new Date(y, m, 0).getDate();
    var cells = [];
    var i;
    for (i = firstDow - 1; i >= 0; i--) { cells.push({ d: prevDays - i, other: true, date: '' }); }
    for (i = 1; i <= days; i++) { cells.push({ d: i, other: false, date: y + '-' + pad(m + 1) + '-' + pad(i) }); }
    while (cells.length % 7 !== 0) { cells.push({ d: cells.length % 7, other: true, date: '' }); }
    var html = [];
    ['日', '一', '二', '三', '四', '五', '六'].forEach(function (d) {
      html.push('<div class="ev-cal-dow">' + d + '</div>');
    });
    var t = new Date();
    var tKey = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
    cells.forEach(function (c) {
      var list = byDate[c.date] || [];
      var cls = 'ev-day' + (c.other ? ' other' : '') + (c.date === tKey ? ' today' : '');
      var inner = '<div class="ev-day-n">' + c.d + '</div>';
      list.slice(0, 2).forEach(function (e) {
        inner += '<a class="ev-chip" href="' + esc(e.slug) + '.html">' + esc(e.name) + '</a>';
      });
      if (list.length > 2) { inner += '<div class="ev-more">+' + (list.length - 2) + ' 场</div>'; }
      html.push('<div class="' + cls + '">' + inner + '</div>');
    });
    calEl.innerHTML = html.join('');
    if (labelEl) { labelEl.textContent = y + ' 年 ' + (m + 1) + ' 月'; }
  }
  ['ev-q', 'ev-type', 'ev-topic', 'ev-format', 'ev-region', 'ev-status'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) { return; }
    el.addEventListener('input', apply);
    el.addEventListener('change', apply);
  });
  var reset = document.getElementById('ev-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      ['ev-q', 'ev-type', 'ev-topic', 'ev-format', 'ev-region', 'ev-status'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.value = ''; }
      });
      apply();
    });
  }
  var prev = document.getElementById('ev-prev');
  var next = document.getElementById('ev-next');
  if (prev) {
    prev.addEventListener('click', function () {
      view.m--; if (view.m < 0) { view.m = 11; view.y--; } renderCal();
    });
  }
  if (next) {
    next.addEventListener('click', function () {
      view.m++; if (view.m > 11) { view.m = 0; view.y++; } renderCal();
    });
  }
  apply();
  fetch('../data/events.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (j) { events = (j && j.events) || []; renderCal(); })
    .catch(function () { renderCal(); });
})();
