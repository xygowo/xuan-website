/* 璇 (Xuan) v3 — Hero 日月粒子
   用圓點排成的太陽與月亮（童趣風），載入時粒子從外圍聚攏。
   位置由 CSS 變數控制，尊重 prefers-reduced-motion 與頁面可見性。 */

(function () {
  'use strict';

  var TAU = Math.PI * 2;

  var canvas = document.getElementById('celestial');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var hero = canvas.parentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 1;
  var H = 1;
  var sun = { x: 0, y: 0, r: 1 };
  var moon = { x: 0, y: 0, r: 1 };
  var sunDots = [];
  var moonDots = [];
  var bubbles = [];
  var field = [];
  var sprites = {};
  var running = false;
  var rafId = 0;
  var lastTs = 0;
  var elapsed = 0;
  var frameDt = 1 / 60;
  var lag = 0;

  var pointer = {
    x: -9999, y: -9999,
    vx: 0, vy: 0,
    active: false,
    has: false
  };

  var WARM = [
    { key: 'sun-a', core: 'rgba(255, 226, 168, 1)', mid: 'rgba(242, 178, 90, 0.55)' },
    { key: 'sun-b', core: 'rgba(255, 206, 140, 1)', mid: 'rgba(232, 147, 92, 0.50)' }
  ];
  var COOL = [
    { key: 'moon-a', core: 'rgba(232, 224, 255, 1)', mid: 'rgba(160, 148, 220, 0.50)' },
    { key: 'moon-b', core: 'rgba(214, 226, 252, 1)', mid: 'rgba(143, 168, 214, 0.45)' }
  ];

  function getSprite(tint) {
    if (sprites[tint.key]) return sprites[tint.key];
    var size = 40;
    var sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    var g = sprite.getContext('2d');
    var rg = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    rg.addColorStop(0, tint.core);
    rg.addColorStop(0.22, tint.mid);
    rg.addColorStop(0.58, 'rgba(255, 255, 255, 0.06)');
    rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, size, size);
    sprites[tint.key] = sprite;
    return sprite;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function makeDot(extra) {
    var dot = {
      size: 1.4 + Math.random() * 1.6,
      alpha: 0.5 + Math.random() * 0.45,
      tint: pick(WARM),
      tw: Math.random() * TAU,
      tws: 0.5 + Math.random() * 1.5,
      delay: Math.random() * 420,
      from: 1.9 + Math.random() * 1.1,
      ox: 0, oy: 0, vx: 0, vy: 0, age: 9,
      lag: 0.6 + Math.random() * 0.55
    };
    for (var k in extra) dot[k] = extra[k];
    return dot;
  }

  function buildSun() {
    var r = sun.r;
    var dots = [];
    var rings = [0.18, 0.30, 0.42, 0.54, 0.65, 0.76, 0.86, 0.95];

    // 同心圓點陣：像用圓點貼出來的太陽
    for (var ri = 0; ri < rings.length; ri++) {
      var rr = r * rings[ri];
      var n = Math.max(9, Math.round((TAU * rr) / (r * 0.098)));
      for (var i = 0; i < n; i++) {
        var a = (i / n) * TAU + ri * 0.35;
        dots.push(makeDot({
          x: Math.cos(a) * rr,
          y: Math.sin(a) * rr,
          size: 1.7 + Math.random() * 1.1,
          alpha: 0.66 + Math.random() * 0.28,
          tint: ri % 2 === 0 ? WARM[0] : WARM[1],
          delay: 120 + ri * 70 + Math.random() * 320,
          from: 2.5
        }));
      }
    }

    // 外緣一圈大點，把太陽的邊界收乾淨
    var edgeN = W < 760 ? 40 : 58;
    for (var e = 0; e < edgeN; e++) {
      var ea = (e / edgeN) * TAU;
      dots.push(makeDot({
        x: Math.cos(ea) * r * 0.98,
        y: Math.sin(ea) * r * 0.98,
        size: 2.2 + Math.random() * 0.9,
        alpha: 0.62 + Math.random() * 0.28,
        tint: WARM[0],
        delay: 300 + Math.random() * 300,
        from: 2.6
      }));
    }

    // 光芒：短而圓
    var rays = W < 760 ? 12 : 16;
    for (var j = 0; j < rays; j++) {
      var base = (j / rays) * TAU + (Math.random() - 0.5) * 0.06;
      for (var k = 0; k < 3; k++) {
        var t = k / 2;
        dots.push(makeDot({
          x: Math.cos(base) * r * (1.06 + t * 0.16),
          y: Math.sin(base) * r * (1.06 + t * 0.16),
          size: 1.8 - t * 0.7,
          alpha: 0.48 - t * 0.18,
          tint: WARM[0],
          delay: 260 + Math.random() * 380,
          from: 2.7
        }));
      }
    }

    return dots;
  }

  function buildMoon() {
    var R = moon.r;
    var dots = [];
    var C = { x: R * 0.60, y: -R * 0.06 };
    var r2 = R * 0.92;
    var C2 = C.x * C.x + C.y * C.y - r2 * r2;
    var steps = W < 760 ? 150 : 230;

    // 沿著彎月的內外緣各排一圈點，中間稀疏填充
    for (var i = 0; i < steps; i++) {
      var th = (i / steps) * TAU;
      var ux = Math.cos(th);
      var uy = Math.sin(th);
      var uc = ux * C.x + uy * C.y;
      var disc = uc * uc - C2;
      if (disc < 0) continue;
      var inner = uc + Math.sqrt(disc);
      if (inner >= R) continue;

      var width = R - inner;
      if (width < R * 0.03) continue;

      dots.push(makeDot({
        x: ux * (R - R * 0.012),
        y: uy * (R - R * 0.012),
        size: 1.45 + Math.random() * 0.7,
        alpha: 0.55 + Math.random() * 0.3,
        tint: COOL[0],
        delay: 180 + Math.random() * 380,
        from: 2.2
      }));

      dots.push(makeDot({
        x: ux * (inner + R * 0.02),
        y: uy * (inner + R * 0.02),
        size: 1.2 + Math.random() * 0.55,
        alpha: 0.4 + Math.random() * 0.26,
        tint: COOL[1],
        delay: 220 + Math.random() * 380,
        from: 2.2
      }));

      if (Math.random() < 0.45 && width > R * 0.12) {
        var f = 0.2 + Math.random() * 0.6;
        dots.push(makeDot({
          x: ux * (inner + width * f),
          y: uy * (inner + width * f),
          size: 0.95 + Math.random() * 0.55,
          alpha: 0.26 + Math.random() * 0.2,
          tint: COOL[0],
          delay: 280 + Math.random() * 380,
          from: 2.1
        }));
      }
    }

    // 彎月外側的幾顆亮星
    var sparkCount = W < 760 ? 3 : 5;
    for (var s = 0; s < sparkCount; s++) {
      var ang = -2.6 + Math.random() * 1.2;
      var dist = R * (1.35 + Math.random() * 0.5);
      dots.push(makeDot({
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist,
        size: 1.5 + Math.random() * 0.8,
        alpha: 0.38 + Math.random() * 0.26,
        tint: COOL[0],
        delay: 420 + Math.random() * 340,
        from: 2.4
      }));
    }

    return dots;
  }

  function build() {
    sunDots = buildSun();
    moonDots = buildMoon();

    // 漂浮光泡，增加童趣
    var bubbleCount = W < 760 ? 8 : 14;
    bubbles = [];
    for (var i = 0; i < bubbleCount; i++) {
      bubbles.push({
        x: Math.random(),
        y: Math.random(),
        r: 6 + Math.random() * 22,
        alpha: 0.05 + Math.random() * 0.12,
        speed: 0.006 + Math.random() * 0.012,
        drift: 0.3 + Math.random() * 0.8,
        phase: Math.random() * TAU,
        tint: Math.random() < 0.55 ? WARM[0] : COOL[1]
      });
    }

    var nField = W < 760 ? 45 : 80;
    field = [];
    for (var j = 0; j < nField; j++) {
      field.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.random() * 0.9,
        alpha: 0.10 + Math.random() * 0.32,
        tw: Math.random() * TAU,
        tws: 0.4 + Math.random() * 1.1
      });
    }
  }

  function disturb(d, x, y, dt) {
    var pushed = false;

    if (pointer.active) {
      // 只有「正在移動」的游標才會擾動，停住就不推
      var speed = Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy);
      var sp = Math.min(1.15, speed / 520);

      if (sp > 0.01) {
        var dx = x - pointer.x;
        var dy = y - pointer.y;
        var d2 = dx * dx + dy * dy;
        var R = 240;
        if (d2 < R * R) {
          var dist = Math.sqrt(d2) || 1;
          var fall = 1 - dist / R;
          d.vx += (dx / dist) * 112 * fall * fall * sp * dt;
          d.vy += (dy / dist) * 112 * fall * fall * sp * dt;
          d.vx += pointer.vx * 0.19 * fall * sp * dt;
          d.vy += pointer.vy * 0.19 * fall * sp * dt;
          pushed = true;
        }
      }
    }

    if (!pushed && d.ox === 0 && d.oy === 0) return;

    d.age = pushed ? 0 : d.age + dt;

    // 1.1 秒內只滑行；之後才慢慢拉回原位
    if (d.age > 1.1) {
      d.vx += -4.2 * d.ox * dt;
      d.vy += -4.2 * d.oy * dt;
      var damp = Math.exp(-3.2 * dt);
    } else {
      var damp = Math.exp(-1.5 * dt);
    }

    d.vx *= damp;
    d.vy *= damp;

    d.ox += d.vx * dt;
    d.oy += d.vy * dt;

    var m2 = d.ox * d.ox + d.oy * d.oy;
    if (m2 > 3600) {
      var m = Math.sqrt(m2);
      d.ox = d.ox / m * 60;
      d.oy = d.oy / m * 60;
      d.vx *= 0.4;
      d.vy *= 0.4;
    }

    if (Math.abs(d.ox) < 0.04 && Math.abs(d.oy) < 0.04 &&
        Math.abs(d.vx) < 0.4 && Math.abs(d.vy) < 0.4) {
      d.ox = 0; d.oy = 0; d.vx = 0; d.vy = 0;
    }
  }

  function easeOut(p) {
    return 1 - Math.pow(1 - p, 3);
  }

  function entry(delay, duration) {
    if (reduceMotion) return 1;
    var p = (elapsed - delay) / duration;
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    return easeOut(p);
  }

  function drawBubbles() {
    var t = reduceMotion ? 0 : elapsed * 0.001;
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      var by = (b.y - t * b.speed) % 1;
      if (by < 0) by += 1;
      var bx = b.x + Math.sin(t * b.drift + b.phase) * 0.012;
      var x = bx * W;
      var y = by * H;
      var size = b.r * 2;
      ctx.globalAlpha = b.alpha * entry(200, 1200);
      ctx.drawImage(getSprite(b.tint), x - size / 2, y - size / 2, size, size);
    }
  }

  function drawSun() {
    var float = reduceMotion ? 0 : Math.sin(elapsed * 0.00055) * 5;
    var cx = sun.x;
    var cy = sun.y + float;
    var rot = reduceMotion ? 0 : elapsed * 0.000018;

    // 核心柔光
    var glowR = sun.r * 1.9;
    var glow = ctx.createRadialGradient(cx, cy, sun.r * 0.1, cx, cy, glowR);
    glow.addColorStop(0, 'rgba(255, 240, 205, 0.46)');
    glow.addColorStop(0.45, 'rgba(242, 178, 90, 0.20)');
    glow.addColorStop(1, 'rgba(242, 178, 90, 0)');
    ctx.globalAlpha = entry(0, 900);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, TAU);
    ctx.fill();

    var body = ctx.createRadialGradient(cx, cy, sun.r * 0.05, cx, cy, sun.r * 0.98);
    body.addColorStop(0, 'rgba(255, 236, 202, 0.34)');
    body.addColorStop(0.62, 'rgba(242, 178, 90, 0.18)');
    body.addColorStop(1, 'rgba(242, 178, 90, 0.05)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, sun.r * 0.98, 0, TAU);
    ctx.fill();

    for (var i = 0; i < sunDots.length; i++) {
      var d = sunDots[i];
      var p = Math.max(0.15, entry(d.delay, 1250));

      var scale = d.from + (1 - d.from) * p;
      var cos = Math.cos(rot);
      var sin = Math.sin(rot);
      var x = cx + (d.x * cos - d.y * sin) * scale;
      var y = cy + (d.x * sin + d.y * cos) * scale;

      disturb(d, x, y, frameDt);
      x += d.ox;
      y += d.oy + lag * d.lag;

      var twinkle = reduceMotion ? 1 : 0.74 + 0.26 * Math.sin(d.tw + elapsed * 0.0012 * d.tws);
      var size = d.size * 5.4 * (0.6 + 0.4 * p);
      ctx.globalAlpha = d.alpha * twinkle * p;
      ctx.drawImage(getSprite(d.tint), x - size / 2, y - size / 2, size, size);
    }
  }

  function drawMoon() {
    var float = reduceMotion ? 0 : Math.sin(elapsed * 0.00048 + 1.4) * 4;
    var cx = moon.x;
    var cy = moon.y + float;

    var glowR = moon.r * 2.2;
    var glow = ctx.createRadialGradient(cx, cy, moon.r * 0.1, cx, cy, glowR);
    glow.addColorStop(0, 'rgba(214, 205, 248, 0.22)');
    glow.addColorStop(1, 'rgba(143, 184, 224, 0)');
    ctx.globalAlpha = entry(150, 1000);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, TAU);
    ctx.fill();

    for (var i = 0; i < moonDots.length; i++) {
      var d = moonDots[i];
      var p = Math.max(0.15, entry(d.delay, 1250));

      var scale = d.from + (1 - d.from) * p;
      var x = cx + d.x * scale;
      var y = cy + d.y * scale;

      disturb(d, x, y, frameDt);
      x += d.ox;
      y += d.oy + lag * d.lag;

      var twinkle = reduceMotion ? 1 : 0.72 + 0.28 * Math.sin(d.tw + elapsed * 0.0013 * d.tws);
      var size = d.size * 5.2 * (0.55 + 0.45 * p);
      ctx.globalAlpha = d.alpha * twinkle * p;
      ctx.drawImage(getSprite(d.tint), x - size / 2, y - size / 2, size, size);
    }
  }

  function render() {
    // 滾動越快，粒子被拖得越多（速度由 scroll.js 輸出）
    var scrollV = window.__xuanScrollVelocity || 0;
    var targetLag = Math.max(-24, Math.min(24, scrollV * 0.016));
    lag += (targetLag - lag) * 0.12;
    if (Math.abs(lag) < 0.05) lag = 0;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;

    for (var f = 0; f < field.length; f++) {
      var fs = field[f];
      var ftw = reduceMotion ? 1 : 0.65 + 0.35 * Math.sin(fs.tw + elapsed * 0.001 * fs.tws);
      var fsize = fs.size * 5;
      ctx.globalAlpha = fs.alpha * ftw * entry(0, 800);
      ctx.drawImage(getSprite(COOL[1]), fs.x * W - fsize / 2, fs.y * H - fsize / 2, fsize, fsize);
    }

    drawBubbles();
    drawMoon();
    drawSun();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));

    var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cs = window.getComputedStyle(hero);
    var cx = parseFloat(cs.getPropertyValue('--celestial-x')) || 49.5;
    var cy = parseFloat(cs.getPropertyValue('--celestial-y')) || 43;
    var dx = parseFloat(cs.getPropertyValue('--moon-dx')) || -8.5;
    var dy = parseFloat(cs.getPropertyValue('--moon-dy')) || -6.5;
    var scale = parseFloat(cs.getPropertyValue('--celestial-scale')) || 1;

    sun.x = W * cx / 100;
    sun.y = H * cy / 100;
    sun.r = Math.min(W, H) * 0.115 * scale;

    moon.x = sun.x + W * dx / 100;
    moon.y = sun.y + H * dy / 100;
    moon.r = sun.r * 0.72;

    build();
    render();
  }

  function loop(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    var dt = Math.min(50, ts - lastTs);
    elapsed += dt;
    frameDt = dt / 1000;
    var pdecay = Math.exp(-8 * frameDt);
    pointer.vx *= pdecay;
    pointer.vy *= pdecay;
    lastTs = ts;
    render();
    rafId = window.requestAnimationFrame(loop);
  }

  function start() {
    if (reduceMotion || running) return;
    running = true;
    lastTs = 0;
    rafId = window.requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(rafId);
  }

  resize();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0.01 }).observe(hero);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  var lastPointerT = 0;

  function onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    var rect = hero.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

    pointer.active = inside;
    if (!inside) return;

    var now = event.timeStamp || performance.now();
    if (pointer.has && now > lastPointerT) {
      var dtp = Math.max(8, now - lastPointerT);
      var vx = (x - pointer.x) / dtp * 1000 * 0.5;
      var vy = (y - pointer.y) / dtp * 1000 * 0.5;
      pointer.vx = Math.max(-2200, Math.min(2200, vx));
      pointer.vy = Math.max(-2200, Math.min(2200, vy));
    }

    pointer.x = x;
    pointer.y = y;
    pointer.has = true;
    lastPointerT = now;

    if (!running) start();
  }

  function onPointerLeave() {
    pointer.active = false;
    pointer.has = false;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('blur', onPointerLeave);

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 160);
  });

  window.addEventListener('load', resize);



})();
