/* 璇 (Xuan) 官網 v3 — 語氣滑桿與捲動進場
   無外部依賴。JS 失效時五張語氣卡全部可見，滑桿隱藏。 */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 捲動進場 --- */
  var targets = document.querySelectorAll([
    '.intro__lead',
    '.intro__col',
    '.letter__col > *',
    '.does__title',
    '.cell',
    '.cmds__title',
    '.row',
    '.faq__title',
    '.q',
    '.cta__left > *',
    '.cta__right',
    '.foot__tile'
  ].join(','));

  if (targets.length && 'IntersectionObserver' in window && !reduce) {
    var list = Array.prototype.slice.call(targets);

    list.forEach(function (el) { el.classList.add('is-reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    list.forEach(function (el) { io.observe(el); });
  }

  /* --- 語氣滑桿 --- */
  var range = document.getElementById('voiceRange');
  if (!range) return;

  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-voice-panel]'));
  var clause = document.querySelector('[data-voice-clause]');
  var desc = document.querySelector('[data-voice-desc]');
  var fill = document.querySelector('[data-voice-fill]');
  var stops = Array.prototype.slice.call(document.querySelectorAll('.voice__stops span'));

  var voices = [
    { name: '經典活潑', line: '預設的璇', note: '輕快，偶爾天然呆。' },
    { name: '溫柔知性', line: '放慢的那種', note: '語氣放慢，先聽完再說。' },
    { name: '傲嬌微甜', line: '嘴硬心軟', note: '吐槽歸吐槽，關鍵時刻還是站在你這邊。' },
    { name: '慵懶隨興', line: '沙發上的貓', note: '回覆更短、更慢。' },
    { name: '認真俐落', line: '工作模式', note: '條列清楚，先講結論。' }
  ];

  function twoLines(name, line) {
    clause.textContent = '';
    clause.appendChild(document.createTextNode(name));
    clause.appendChild(document.createElement('br'));
    clause.appendChild(document.createTextNode(line));
  }

  function apply(index) {
    var voice = voices[index];
    if (!voice) return;

    twoLines(voice.name, voice.line);
    desc.textContent = voice.note;
    range.setAttribute('aria-valuetext', voice.name);

    panels.forEach(function (panel) {
      var on = Number(panel.getAttribute('data-voice-panel')) === index;
      if (on) {
        panel.setAttribute('data-active', '');
      } else {
        panel.removeAttribute('data-active');
      }
    });

    stops.forEach(function (stop, i) {
      if (i === index) {
        stop.setAttribute('data-current', '');
      } else {
        stop.removeAttribute('data-current');
      }
    });

    if (fill) {
      var p = index / (voices.length - 1);
      fill.style.width = 'calc((100% - 32px) * ' + p.toFixed(3) + ' + 16px)';
    }
  }

  range.addEventListener('input', function () {
    apply(Number(range.value));
  });

  apply(Number(range.value));
})();
