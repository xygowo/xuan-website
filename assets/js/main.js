/* 璇 (Xuan) 介紹網站 v2 — 互動腳本
   導覽收合、捲動進場、語氣切換（tabs）與指令複製，無外部依賴。 */

(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  /* --- 行動版導覽 --- */
  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', '開啟選單');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.setAttribute('aria-label', isOpen ? '關閉選單' : '開啟選單');
    });

    if (navLinks) {
      navLinks.addEventListener('click', function (event) {
        if (event.target.closest('a')) closeNav();
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNav();
    });

    document.addEventListener('click', function (event) {
      if (!nav.contains(event.target)) closeNav();
    });
  }

  /* --- 捲動進場 --- */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (revealItems.length) {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach(function (item) { item.classList.add('is-in'); });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });

      revealItems.forEach(function (item) { observer.observe(item); });
    }
  }

  /* --- 導覽列目前區塊 --- */
  var sectionLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
  var sections = sectionLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-46% 0px -50% 0px' });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* --- 語氣切換 --- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));

  function selectTab(tab, focus) {
    tabs.forEach(function (item) {
      var selected = item === tab;
      var panel = document.getElementById(item.getAttribute('aria-controls'));
      item.setAttribute('aria-selected', selected ? 'true' : 'false');
      item.tabIndex = selected ? 0 : -1;
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { selectTab(tab, false); });

    tab.addEventListener('keydown', function (event) {
      var next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });

  /* --- 複製指令 --- */
  var copyButtons = Array.prototype.slice.call(document.querySelectorAll('.cmd__copy'));
  var copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  var doneIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12.5 5 5L20 6.5"/></svg>';

  function fallbackCopy(text) {
    var helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    try {
      document.execCommand('copy');
    } catch (error) {
      /* 忽略：瀏覽器不支援時不阻斷操作 */
    }
    document.body.removeChild(helper);
  }

  copyButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy') || '';
      if (!text) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
      } else {
        fallbackCopy(text);
      }

      var label = button.getAttribute('aria-label') || '';
      button.classList.add('is-done');
      button.innerHTML = doneIcon;
      button.setAttribute('aria-label', '已複製');

      window.setTimeout(function () {
        button.classList.remove('is-done');
        button.innerHTML = copyIcon;
        button.setAttribute('aria-label', label);
      }, 1600);
    });
  });
})();
