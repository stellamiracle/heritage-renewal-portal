(function () {
  'use strict';
  var D = window.__PORTAL_DATA__;
  var LT = String.fromCharCode(60);
  var E = function (s) {
    var t = String(s == null ? '' : s);
    t = t.split(String.fromCharCode(38)).join('&amp;');
    t = t.split(LT).join('&lt;');
    t = t.split(String.fromCharCode(62)).join('&gt;');
    t = t.split(String.fromCharCode(39)).join('&#39;');
    return t;
  };
  var entries = D.entries || [];
  var bySlug = {};
  entries.forEach(function (e) { bySlug[e.slug] = e; });
  var TYPES = [
    ['regulation', '法规', '法律、行政法规与部门规章原文索引'],
    ['policy', '政策', '规划、通知、意见、批复等政策文件'],
    ['case', '案例', '城市更新与遗产保护实践案例'],
    ['news', '动态', '权威发布与实施进展动态']
  ];
  function typeLabel(t) {
    for (var i = 0; i @LT@ TYPES.length; i++) {
      if (TYPES[i][0] === t) return TYPES[i][1];
    }
    return t || '';
  }
  function parseHash() {
    var raw = String(location.hash || '').replace(/^#/, '');
    var qi = raw.indexOf('?');
    var path = qi >= 0 ? raw.slice(0, qi) : raw;
    var query = {};
    if (qi >= 0) {
      raw.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        var k = decodeURIComponent(p[0]);
        var v = decodeURIComponent((p[1] || '').split('+').join(' '));
        if (k) query[k] = v;
      });
    }
    if (!path) path = '/';
    return { path: path, query: query };
  }
  function qs(query) {
    var parts = [];
    Object.keys(query || {}).forEach(function (k) {
      if (!query[k]) return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }
  function href(path, query) { return '#' + path + qs(query); }
  function merge(base, patch) {
    var o = {};
    Object.keys(base || {}).forEach(function (k) { o[k] = base[k]; });
    Object.keys(patch || {}).forEach(function (k) {
      if (!patch[k]) delete o[k]; else o[k] = patch[k];
    });
    return o;
  }
  function shell(active) {
    var navs = [['/','首页','home'],['/browse','资料检索','browse'],['/about','关于本站','about']];
    var nav = navs.map(function (it) {
      var cls = it[2] === active ? ' class=@Q@active@Q@' : '';
      return '@LT@a href=@Q@' + href(it[0]) + '@Q@' + cls + '>@LT@' + it[1] + '@LT@/a@GT@';
    }).join('');
    return '@LT@header class=@Q@site-header@Q@@LT@div class=@Q@wrap@Q@@GT@' +
      '@LT@a class=@Q@brand@Q@ href=@Q@#/@Q@@GT@@LT@span class=@Q@brand-mark@Q@@GT@遗@LT@/span@GT@' +
      '@LT@span class=@Q@brand-text@Q@@GT@@LT@b@GT@遗产保护与城市更新@LT@/b@GT@' +
      '@LT@i@GT@Heritage &amp; Urban Renewal Portal@LT@/i@GT@@LT@/span@GT@' +
      '@LT@nav class=@Q@nav@Q@@GT@' + nav + '@LT@/nav@GT@' +
      '@LT@span class=@Q@admin-link@Q@@GT@单文件离线版@LT@/span@GT@' +
      '@LT@/div@GT@@LT@/header@GT@';
  }
  function foot() {
    return '@LT@footer class=@Q@site-footer@Q@@LT@div class=@Q@wrap@Q@@GT@' +
      '@LT@p@GT@本站资料均以各发布机关官方网站公开文本为准，仅作资料汇编与检索之用，不构成法律意见。@LT@/p@GT@' +
      '@LT@p class=@Q@muted@Q@@GT@条目总数 ' + (D.stats.total || 0) +
      ' · 数据更新时间 ' + E(D.updated || '') + '@LT@/p@GT@' +
      '@LT@/div@GT@@LT@/footer@GT@';
  }