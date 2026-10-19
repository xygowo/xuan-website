/* 璇 (Xuan) v3 — 捲動效果
   進度條、導覽收合、多層視差與逐項進場。
   全部以 rAF 節流，尊重 prefers-reduced-motion。 */

(function () {
  'use strict';

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var header = document.querySelector('.site-header');
  var isDocPage = !document.querySelector('.hero');
  var bar = document.querySelector('.scroll-progress');

  var ticking = false;

  /* --- 視差：每個 [data-parallax] 元素有自己的速率 --- */
  var layers = [];

  function measureLayers() {
    var sy = window.pageYOffset || doc.scrollTop || 0;
    layers.forEach(function (layer) {
      // 先清掉 transform 再量，避免量到已經位移過的位置
      layer.el.style.transform = '';
      var rect = layer.el.getBoundingClientRect();
      layer.center = rect.top + sy + rect.height / 2;
      layer.h = rect.height || 1;
    });
  }

  function updateLayers() {
    var sy = window.pageYOffset || doc.scrollTop || 0;
    var vc = sy + window.innerHeight / 2;

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var y = (vc - layer.center) * layer.speed;
      var limit = layer.max || Math.min(90, layer.h * 0.12);
      if (y > limit) y = limit;
      else if (y < -limit) y = -limit;
      layer.el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    }
  }

  function initLayers() {
    layers = Array.prototype.map.call(
      document.querySelectorAll('[data-parallax]'),
      function (el) {
        return {
          el: el,
          speed: parseFloat(el.getAttribute('data-parallax')) || 0,
          max: parseFloat(el.getAttribute('data-parallax-max')) || 0,
          center: 0,
          h: 1
        };
      }
    );
    if (layers.length) measureLayers();
  }

  /* --- 滾動速度：輸出給粒子層使用（px/s） --- */
  var velocity = 0;
  var lastY = 0;
  var lastT = 0;
  var decayRaf = 0;

  function decayStep() {
    decayRaf = 0;
    velocity *= 0.9;

    if (Math.abs(velocity) < 2) {
      velocity = 0;
      lastT = 0;
      window.__xuanScrollVelocity = 0;
      return;
    }

    window.__xuanScrollVelocity = velocity;
    decayRaf = window.requestAnimationFrame(decayStep);
  }

  function trackVelocity(y) {
    var now = window.performance && performance.now ? performance.now() : Date.now();

    if (!lastT) {
      lastT = now;
      lastY = y;
      return;
    }

    var dt = Math.max(8, now - lastT);
    var raw = (y - lastY) / dt * 1000;
    lastY = y;
    lastT = now;

    velocity += (raw - velocity) * 0.25;
    if (Math.abs(velocity) < 2) velocity = 0;

    window.__xuanScrollVelocity = velocity;

    if (!decayRaf) decayRaf = window.requestAnimationFrame(decayStep);
  }

  function update() {
    var y = window.pageYOffset || doc.scrollTop || 0;
    trackVelocity(y);
    var max = doc.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

    if (bar) bar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
    if (header && !isDocPage) header.classList.toggle('is-scrolled', y > 60);

    if (!reduceMotion && layers.length) updateLayers();

    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  function onResize() {
    if (layers.length) measureLayers();
    onScroll();
  }

  if (isDocPage && header) header.classList.add('is-scrolled');

  initLayers();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  update();

  /* --- 平滑滾動：把滾輪的一格變成一滑 --- */
  var smooth = {
    on: false,
    target: 0,
    current: 0,
    max: 0,
    raf: 0,
    running: false,
    last: 0
  };

  function smoothMax() {
    smooth.max = Math.max(0, doc.scrollHeight - window.innerHeight);
  }

  function smoothStep(ts) {
    var dt = smooth.last ? Math.min(50, ts - smooth.last) : 16.67;
    smooth.last = ts;

    // 與螢幕更新率無關的趨近係數
    var k = 1 - Math.pow(0.86, dt / 16.67);
    smooth.current += (smooth.target - smooth.current) * k;

    if (Math.abs(smooth.target - smooth.current) < 0.6) {
      smooth.current = smooth.target;
    }

    window.scrollTo(0, smooth.current);

    if (smooth.current !== smooth.target) {
      smooth.raf = window.requestAnimationFrame(smoothStep);
    } else {
      smooth.running = false;
      smooth.last = 0;
    }
  }

  function smoothTo(y) {
    smooth.target = Math.max(0, Math.min(smooth.max, y));

    if (smooth.running) return;

    smooth.current = window.pageYOffset || doc.scrollTop || 0;
    smooth.running = true;
    smooth.last = 0;

    var started = false;
    smooth.raf = window.requestAnimationFrame(function (ts) {
      started = true;
      smoothStep(ts);
    });

    // 若 rAF 被瀏覽器凍結，放棄接管，讓原生滾動接手
    window.setTimeout(function () {
      if (!started) {
        smooth.running = false;
        smooth.on = false;
      }
    }, 250);
  }

  function onWheel(event) {
    if (!smooth.on) return;
    if (event.ctrlKey || event.metaKey) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    var delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 18;
    else if (event.deltaMode === 2) delta *= window.innerHeight;
    if (!delta) return;

    smoothMax();

    var y = window.pageYOffset || doc.scrollTop || 0;
    if ((y <= 0 && delta < 0) || (y >= smooth.max - 1 && delta > 0)) return;

    event.preventDefault();
    smoothTo((smooth.running ? smooth.target : y) + delta);
  }

  function onAnchorClick(event) {
    if (!smooth.on) return;

    var link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
    if (!link) return;

    var hash = link.getAttribute('href');
    if (!hash || hash.length < 2) return;

    var target = document.getElementById(hash.slice(1));
    if (!target) return;

    event.preventDefault();
    smoothMax();

    var top = target.getBoundingClientRect().top + (window.pageYOffset || 0) - 96;
    smoothTo(top);

    try {
      window.history.pushState(null, '', hash);
    } catch (error) {
      /* file:// 下可能不允許，忽略 */
    }
  }

  function initSmooth() {
    if (reduceMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (typeof window.requestAnimationFrame !== 'function') return;

    smooth.on = true;
    doc.style.scrollBehavior = 'auto';
    smoothMax();
    smooth.target = smooth.current = window.pageYOffset || doc.scrollTop || 0;

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', smoothMax);
    window.addEventListener('load', smoothMax);
    document.addEventListener('click', onAnchorClick);

    // 滾動條、鍵盤造成的捲動：同步位置，避免下一次滾輪跳位
    window.addEventListener('scroll', function () {
      if (smooth.running) return;
      smooth.target = smooth.current = window.pageYOffset || doc.scrollTop || 0;
    }, { passive: true });

    window.addEventListener('blur', function () {
      smooth.running = false;
      window.cancelAnimationFrame(smooth.raf);
      smooth.target = smooth.current = window.pageYOffset || doc.scrollTop || 0;
    });
  }

  initSmooth();

  /* --- 逐項進場：容器加上 data-stagger，子元素依序出現 --- */
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-stagger]'));
  var items = [];

  groups.forEach(function (group) {
    Array.prototype.slice.call(group.children).forEach(function (el, index) {
      el.classList.add('stagger');
      el.style.setProperty('--d', Math.min(index, 9) * 70 + 'ms');
      items.push(el);
    });
  });

  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

  items.forEach(function (el) { observer.observe(el); });
})();
