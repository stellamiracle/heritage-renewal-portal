/* 遗产保护与城市更新专题资料库 - 前端交互 */
(function () {
  'use strict';
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* 筛选表单：任一输入变化即提交 */
  function initFilters() {
    var form = $('#filter-form');
    if (!form) return;
    $$('input, select', form).forEach(function (el) {
      el.addEventListener('change', function () { form.submit(); });
    });
    var q = $('[name=q]', form);
    if (q) {
      q.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); form.submit(); }
      });
    }
  }

  /* 首页搜索跳转到检索页 */
  function initHeroSearch() {
    var form = $('#hero-search');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kw = $('[name=q]', form).value.trim();
      location.href = '/browse?q=' + encodeURIComponent(kw);
    });
  }

  /* 后台：删除确认 */
  function initConfirm() {
    $$('[data-confirm]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (!window.confirm(el.getAttribute('data-confirm'))) e.preventDefault();
      });
    });
  }

  /* 后台：附件上传 */
  function initUpload() {
    var box = $('#upload-box');
    if (!box) return;
    var input = $('input[type=file]', box);
    var nameEl = $('#upload-name', box);
    var btn = $('#upload-btn', box);
    var out = $('#upload-result', box);
    if (!input || !btn) return;
    input.addEventListener('change', function () {
      if (nameEl) nameEl.textContent = input.files.length ? input.files[0].name : '';
    });
    btn.addEventListener('click', function () {
      if (!input.files.length) {
        if (out) out.textContent = '请先选择文件';
        return;
      }
      var fd = new FormData();
      fd.append('file', input.files[0]);
      var slug = box.getAttribute('data-slug') || '';
      btn.disabled = true;
      fetch('/admin/upload?slug=' + encodeURIComponent(slug) + '&name=' + encodeURIComponent(input.files[0].name), {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: input.files[0]
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (out) {
          out.textContent = j.ok ? ('已上传：' + j.path + '（' + j.size + ' 字节）') : ('上传失败');
        }
        if (j.ok) {
          var list = $('#attach-list', box);
          if (list) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = j.path;
            a.textContent = input.files[0].name;
            li.appendChild(a);
            list.appendChild(li);
          }
        }
      }).catch(function (e) {
        if (out) out.textContent = '上传出错';
      }).then(function () { btn.disabled = false; });
    });
  }

  /* 后台：字符计数 */
  function initCounters() {
    $$('[data-counter]').forEach(function (el) {
      var target = $('#' + el.getAttribute('data-counter'));
      if (!target) return;
      var update = function () { el.textContent = String(target.value.length); };
      target.addEventListener('input', update);
      update();
    });
  }

  /* 复制链接 */
  function initCopy() {
    $$('[data-copy]').forEach(function (el) {
      el.addEventListener('click', function () {
        var v = el.getAttribute('data-copy');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(v).then(function () {
            var old = el.textContent;
            el.textContent = '已复制';
            setTimeout(function () { el.textContent = old; }, 1500);
          });
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeroSearch();
    initFilters();
    initConfirm();
    initUpload();
    initCounters();
    initCopy();
  });
})();