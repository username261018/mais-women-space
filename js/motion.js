/* motion engine: entrance once, scroll-linked both ways, nothing hidden without it */
(function () {
  var d = document, h = d.documentElement, W = window;
  var on = h.classList.contains('m-on');
  var fine = W.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var wide = W.matchMedia('(min-width:900px)');

  /* top bar height */
  var top = d.getElementById('top');
  function setTop() { if (top) h.style.setProperty('--top-h', top.offsetHeight + 'px'); }
  setTop();
  if (top && 'ResizeObserver' in W) new ResizeObserver(setTop).observe(top);

  /* burger */
  var bt = d.querySelector('.burger'), menu = d.getElementById('menu');
  if (bt && menu) {
    var close = function () { bt.setAttribute('aria-expanded', 'false'); menu.classList.remove('open'); };
    bt.addEventListener('click', function () {
      var o = bt.getAttribute('aria-expanded') !== 'true';
      bt.setAttribute('aria-expanded', String(o)); menu.classList.toggle('open', o);
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });
  }

  /* map on click */
  d.querySelectorAll('[data-map]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('.map'), f = d.createElement('iframe');
      f.src = b.getAttribute('data-map'); f.title = b.getAttribute('data-title') || 'Карта';
      f.loading = 'lazy'; f.setAttribute('allowfullscreen', '');
      box.innerHTML = ''; box.appendChild(f); box.classList.add('loaded');
    });
  });

  if (!on) return;

  /* split headings into words */
  d.querySelectorAll('[data-split]').forEach(function (el) {
    var i = 0;
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/([ \t\n\r]+)/), fr = d.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^[ \t\n\r]+$/.test(p)) { fr.appendChild(d.createTextNode(p)); return; }
            var w = d.createElement('span'), wi = d.createElement('span');
            w.className = 'w'; wi.className = 'wi'; wi.textContent = p; wi.style.setProperty('--wi', i++);
            w.appendChild(wi); fr.appendChild(w);
          });
          n.replaceChild(fr, c);
        } else if (c.nodeType === 1 && !c.classList.contains('w')) walk(c);
      });
    })(el);
  });

  /* stagger index from parent */
  d.querySelectorAll('[data-stagger]').forEach(function (p) {
    var k = 0; Array.prototype.forEach.call(p.querySelectorAll('[data-rv],[data-pin]'), function (c) { c.style.setProperty('--i', k++); });
  });

  /* glow paragraph */
  var glows = [];
  d.querySelectorAll('[data-glow]').forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/); p.textContent = '';
    words.forEach(function (w, j) { var s = d.createElement('span'); s.className = 'gw'; s.textContent = w; p.appendChild(s); if (j < words.length - 1) p.appendChild(d.createTextNode(' ')); });
    glows.push(p);
  });

  /* marks: caption assembles from noise (aria-hidden twin) */
  var NOISE = '+×·/|_:;=#~';
  function marks(host) {
    var el = host.querySelector('[aria-hidden]'), t = host.getAttribute('data-text'), n = 0, steps = 14;
    if (!el || !t) return;
    (function tick() {
      var out = '';
      for (var j = 0; j < t.length; j++) out += (t[j] === ' ' || j < (n / steps) * t.length) ? t[j] : NOISE[(Math.random() * NOISE.length) | 0];
      el.textContent = out;
      if (n++ < steps) setTimeout(tick, 45); else el.textContent = t;
    })();
  }

  var SEL = '[data-rv],[data-split],[data-pin],[data-curtain],[data-line],[data-tone],[data-marks]';
  function show(el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (el.hasAttribute('data-marks')) marks(el);
    if (el.hasAttribute('data-curtain')) {
      var end = function () { el.classList.add('done'); };
      el.addEventListener('transitionend', function f(e) { if (e.target === el) { el.removeEventListener('transitionend', f); end(); } });
      setTimeout(end, 1700);
    }
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });

  function sweep() {
    var vh = W.innerHeight;
    d.querySelectorAll(SEL).forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh && (r.bottom > 0 || r.top < 0)) show(el);
    });
  }
  function sweepAbove() { /* everything above the bottom of the screen */
    var vh = W.innerHeight;
    d.querySelectorAll(SEL).forEach(function (el) { if (!el.classList.contains('in') && el.getBoundingClientRect().top < vh) show(el); });
  }

  /* hero intro 300 ms after DOMContentLoaded */
  var hero = d.querySelector('[data-hero]');
  var heroEls = hero ? hero.querySelectorAll(SEL) : [];
  setTimeout(function () { Array.prototype.forEach.call(heroEls, show); }, 300);

  d.querySelectorAll(SEL).forEach(function (el) { if (!hero || !hero.contains(el)) io.observe(el); });

  /* lane: vertical scroll moves a horizontal track (>=900 only) */
  var lanes = [];
  d.querySelectorAll('[data-lane]').forEach(function (s) { lanes.push({ s: s, t: s.querySelector('.lane-track'), v: s.querySelector('.lane-view'), bar: s.querySelector('.lane-bar i') }); });
  function laneSetup() {
    lanes.forEach(function (L) {
      var useIt = wide.matches;
      L.s.classList.toggle('lane-on', useIt);
      if (!useIt) { L.s.style.height = ''; L.t.style.transform = ''; return; }
      L.full = Math.max(0, L.t.scrollWidth - L.v.clientWidth);
      var cap = parseFloat(L.s.getAttribute('data-lane')) || 0;
      L.dist = cap ? Math.min(L.full, cap * W.innerHeight) : L.full;
      L.s.style.height = (L.v.closest('.lane-pin').offsetHeight + L.dist) + 'px';
    });
  }

  /* panel clip, glow, lanes: scroll-linked both ways */
  var panels = d.querySelectorAll('[data-panel]');
  var ticking = false;
  function frame() {
    ticking = false;
    var vh = W.innerHeight;
    panels.forEach(function (p) {
      var t = p.getBoundingClientRect().top, k = (t - vh * 0.4) / (vh * 0.6);
      k = Math.max(0, Math.min(1, k)); p.style.setProperty('--fx', (48 * k).toFixed(1) + 'px');
    });
    glows.forEach(function (p) {
      var r = p.getBoundingClientRect(), ws = p.querySelectorAll('.gw');
      var k = (vh * 0.85 - r.top) / (vh * 0.5 + r.height * 0.5);
      k = Math.max(0, Math.min(1, k));
      var lit = k * ws.length;
      for (var j = 0; j < ws.length; j++) ws[j].style.opacity = (j < lit ? 1 : 0.25);
    });
    lanes.forEach(function (L) {
      if (!L.s.classList.contains('lane-on')) return;
      var r = L.s.getBoundingClientRect(), topH = parseFloat(getComputedStyle(h).getPropertyValue('--top-h')) || 0;
      var k = L.dist ? (topH - r.top) / L.dist : 0; k = Math.max(0, Math.min(1, k));
      L.t.style.transform = 'translate3d(' + (-k * L.full).toFixed(1) + 'px,0,0)';
      if (L.bar) L.bar.style.transform = 'scaleX(' + k.toFixed(3) + ')';
    });
  }
  function onScroll() { sweep(); if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  W.addEventListener('scroll', onScroll, { passive: true });
  W.addEventListener('resize', function () { laneSetup(); onScroll(); });
  W.addEventListener('load', function () { laneSetup(); sweepAbove(); frame(); });
  W.addEventListener('hashchange', function () { setTimeout(sweepAbove, 50); });
  W.addEventListener('beforeprint', function () { d.querySelectorAll(SEL).forEach(show); });
  if (wide.addEventListener) wide.addEventListener('change', function () { laneSetup(); frame(); });

  /* light spot + tilt (fine pointer only, transform only) */
  if (fine) {
    var spot = d.querySelector('.spot'), tilts = d.querySelectorAll('[data-tilt]'), mx = 0, my = 0, raf = 0;
    W.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0;
        if (spot) spot.style.transform = 'translate3d(' + (mx - 300) + 'px,' + (my - 300) + 'px,0)';
        tilts.forEach(function (t) {
          var r = t.getBoundingClientRect(); if (r.bottom < 0 || r.top > W.innerHeight) return;
          var x = (mx - (r.left + r.width / 2)) / W.innerWidth, y = (my - (r.top + r.height / 2)) / W.innerHeight;
          t.style.transform = 'perspective(900px) rotateY(' + (x * 8).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg)';
        });
      });
    }, { passive: true });
  }

  laneSetup(); frame();
  h.classList.add('m-ready');
  requestAnimationFrame(sweepAbove);
})();
