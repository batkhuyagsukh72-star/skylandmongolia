/* Azure Skyland Mongolia — interactions & motion */
(function () {
  'use strict';
  var D = window.SKY, M = window.SKY_MAP;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = root.classList.contains('rm');
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var byId = {}; D.places.forEach(function (p) { byId[p.id] = p; });

  /* ---------- logo mark (toono ring + roof poles + Altai peaks) ---------- */
  function markSVG(uid) {
    var cx = 60, cy = 60, rays = '';
    for (var i = 0; i < 32; i++) {
      var a = (-90 + i * 360 / 32) * Math.PI / 180, r1 = 40, r2 = i % 2 ? 49 : 55;
      rays += '<line x1="' + (cx + r1 * Math.cos(a)).toFixed(2) + '" y1="' + (cy + r1 * Math.sin(a)).toFixed(2) + '" x2="' + (cx + r2 * Math.cos(a)).toFixed(2) + '" y2="' + (cy + r2 * Math.sin(a)).toFixed(2) + '"/>';
    }
    return '<svg viewBox="0 0 120 120" fill="none" aria-hidden="true"><defs><clipPath id="sk' + uid + '"><circle cx="60" cy="60" r="31"/></clipPath></defs>' +
      '<g class="rays" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' + rays + '</g>' +
      '<circle class="ring" cx="60" cy="60" r="35.5" stroke="currentColor" stroke-width="2"/><circle cx="60" cy="60" r="32.4" stroke="currentColor" stroke-width=".8"/>' +
      '<g clip-path="url(#sk' + uid + ')"><path class="peaks" fill="currentColor" d="M14 104 L14 78 L28 70 L38 60 L45 65 L58 42 L66 53 L72 48 L83 61 L94 67 L106 75 L106 104 Z"/>' +
      '<path fill="var(--logo-bg,#ECE3DA)" d="M51.22 54 L53.8 54.8 L56 50 L58.6 53.4 L61.2 49.6 L64.84 51.4 L63.53 49.6 L61.2 47.8 L58.6 51.6 L56 48.2 L53.8 53 L52.23 52.2 Z M67.68 51.6 L71.8 54.2 L73.6 52.2 L76.23 53 L74.88 51.4 L73.6 50.6 L71.8 52.6 L69.6 50 Z"/></g></svg>';
  }
  $$('[data-mark]').forEach(function (el, i) { el.innerHTML = markSVG(i); });

  /* ---------- language ---------- */
  var lang = (new URLSearchParams(location.search).get('lang') || store.get('sky-lang') || 'en');
  if (lang !== 'mn') lang = 'en';
  function t(k) { return (D.t[lang] && D.t[lang][k]) || D.t.en[k] || k; }
  function L(o) { return o[lang] || o.en; }

  /* ---------- trip state ---------- */
  var trip = [];
  try { trip = JSON.parse(store.get('sky-trip') || '[]').filter(function (id) { return byId[id]; }); } catch (e) { trip = []; }
  function inTrip(id) { return trip.indexOf(id) > -1; }
  function saveTrip() { store.set('sky-trip', JSON.stringify(trip)); }

  /* ---------- toast ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  /* ---------- render: tabs + cards ---------- */
  var region = 'all';
  var tabsEl = $('#tabs'), track = $('#track');
  function renderTabs() {
    tabsEl.innerHTML = D.regions.map(function (r) {
      return '<button class="tab" role="tab" type="button" data-region="' + r.id + '" aria-selected="' + (r.id === region) + '" aria-controls="track">' + L(r) + '</button>';
    }).join('');
  }
  function cardHTML(p) {
    var on = inTrip(p.id);
    return '<article class="card" role="listitem" data-id="' + p.id + '" data-region="' + p.region + '">' +
      '<img src="img/' + p.img + '.webp" alt="" width="800" height="1200" loading="lazy" decoding="async">' +
      '<span class="card-ring" aria-hidden="true"></span>' +
      '<button class="card-open" type="button" aria-label="' + L(p.name) + ' — ' + t('dest.more') + '"></button>' +
      '<button class="card-add" type="button" aria-pressed="' + on + '" aria-label="' + t('dest.add') + ': ' + L(p.name) + '"><svg><use href="#i-' + (on ? 'check' : 'plus') + '"/></svg></button>' +
      '<div class="card-body"><p class="card-where"><svg><use href="#i-pin"/></svg>' + L(p.where) + '</p>' +
      '<h3 class="card-name">' + L(p.name) + '</h3>' +
      '<p class="card-meta"><span>' + t('dest.best') + ': <b>' + L(p.best) + '</b></span><span>' + L(D.regions.filter(function (r) { return r.id === p.region; })[0]) + '</span></p></div></article>';
  }
  function renderCards() { track.innerHTML = D.places.map(cardHTML).join(''); filterCards(false); }
  function filterCards(scrollBack) {
    var n = 0;
    $$('.card', track).forEach(function (c) { var show = region === 'all' || c.dataset.region === region; c.hidden = !show; if (show) n++; });
    $('#placeCount').textContent = '(' + n + ')';
    if (scrollBack) track.scrollTo({ left: 0, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(updateArrows, 60);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.tab'); if (!b) return;
    region = b.dataset.region; $$('.tab', tabsEl).forEach(function (x) { x.setAttribute('aria-selected', x === b); });
    filterCards(true);
    if (window.gsap && !reduce) gsap.fromTo($$('.card:not([hidden])', track), { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: .8, stagger: .05, ease: 'power3.out' });
  });
  tabsEl.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tabs = $$('.tab', tabsEl), i = tabs.indexOf(document.activeElement);
    var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; n.focus(); n.click();
  });
  track.addEventListener('click', function (e) {
    var card = e.target.closest('.card'); if (!card) return;
    if (dragMoved) return;
    if (e.target.closest('.card-add')) { toggle(card.dataset.id); return; }
    openDetail(card.dataset.id);
  });

  /* arrows + drag */
  var prevB = $('.track-arrow.prev'), nextB = $('.track-arrow.next');
  function step() { var c = $('.card:not([hidden])', track); return c ? (c.offsetWidth + 20) * 2 : 600; }
  function updateArrows() {
    var max = track.scrollWidth - track.clientWidth - 4;
    prevB.disabled = track.scrollLeft < 4; nextB.disabled = track.scrollLeft >= max;
  }
  prevB.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
  nextB.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  var dragX = 0, dragStart = 0, dragging = false, dragMoved = false;
  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || $('#destinations').classList.contains('grid-mode')) return;
    dragging = true; dragMoved = false; dragX = e.clientX; dragStart = track.scrollLeft; track.style.scrollSnapType = 'none';
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return; var dx = e.clientX - dragX;
    if (Math.abs(dx) > 6) dragMoved = true; track.scrollLeft = dragStart - dx;
  });
  window.addEventListener('pointerup', function () {
    if (!dragging) return; dragging = false; track.style.scrollSnapType = '';
    setTimeout(function () { dragMoved = false; }, 0);
  });

  /* grid toggle */
  $('#toggleGrid').addEventListener('click', function () {
    var s = $('#destinations'), on = s.classList.toggle('grid-mode');
    this.firstElementChild.textContent = t(on ? 'dest.less' : 'dest.all');
    this.firstElementChild.setAttribute('data-i18n', on ? 'dest.less' : 'dest.all');
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    if (!on) goTo('#destinations');
  });

  /* ---------- journeys (masonry) ---------- */
  var narrow = window.matchMedia('(max-width: 820px)');
  function renderJourneys() {
    var n = narrow.matches ? 2 : 3, cols = [];
    for (var c = 0; c < n; c++) cols.push([]);
    D.journeys.forEach(function (j, i) { cols[i % n].push(j); });
    $('#masonry').innerHTML = cols.map(function (col) {
      return '<div class="mcol">' + col.map(function (j) {
        return '<button class="jcard" type="button" data-j="' + j.id + '"><img src="img/' + j.img + '.webp" alt="" width="800" height="1200" loading="lazy" decoding="async">' +
          '<span class="jname">' + L(j.name) + '</span><span class="jring"><b>' + j.places.length + '</b><span>' + t('j.places') + '</span></span>' +
          '<span class="jadd"><svg><use href="#i-plus"/></svg>' + t('j.add') + '</span></button>';
      }).join('') + '</div>';
    }).join('');
  }
  if (narrow.addEventListener) narrow.addEventListener('change', function () { renderJourneys(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  $('#masonry').addEventListener('click', function (e) {
    var b = e.target.closest('.jcard'); if (!b) return;
    var j = D.journeys.filter(function (x) { return x.id === b.dataset.j; })[0], added = 0;
    j.places.forEach(function (id) { if (!inTrip(id)) { trip.push(id); added++; } });
    saveTrip(); syncTrip();
    toast(L(j.name) + ' · ' + j.places.length + ' ' + t('toast.route'));
    setTimeout(function () { goTo('#plan'); }, 450);
  });

  /* ---------- styles tiles ---------- */
  function renderTiles() {
    $('#tiles').innerHTML = D.styles.map(function (s, i) {
      return '<a class="tile" href="#plan" data-style="' + i + '"><img src="img/' + s.img + '.webp" alt="" width="1400" height="788" loading="lazy" decoding="async"><span class="tile-label">' + L(s) + '</span></a>';
    }).join('');
  }
  $('#tiles').addEventListener('click', function (e) {
    var a = e.target.closest('.tile'); if (!a) return;
    $('#f-style').value = a.dataset.style; $('#p-style').value = L(D.styles[+a.dataset.style]);
  });

  /* ---------- selects ---------- */
  function fillSelects() {
    var keep = { r: $('#f-region').value, s: $('#f-style').value, m: $('#f-month').value, w: $('#f-who').value, pm: $('#p-month').value, pw: $('#p-who').value };
    $('#f-region').innerHTML = '<option value="all">' + t('f.anywhere') + '</option>' + D.regions.slice(1).map(function (r) { return '<option value="' + r.id + '">' + L(r) + '</option>'; }).join('');
    $('#f-style').innerHTML = '<option value="">' + t('f.anystyle') + '</option>' + D.styles.map(function (s, i) { return '<option value="' + i + '">' + L(s) + '</option>'; }).join('');
    var months = D.months[lang].map(function (m, i) { return '<option value="' + i + '">' + m + '</option>'; }).join('');
    $('#f-month').innerHTML = months; $('#p-month').innerHTML = months;
    var who = ''; for (var i = 1; i <= 12; i++) who += '<option value="' + i + '">' + i + ' ' + (i === 1 ? t('f.person') : t('f.persons')) + (i === 12 ? '+' : '') + '</option>';
    $('#f-who').innerHTML = who; $('#p-who').innerHTML = who;
    $('#f-region').value = keep.r || 'all'; $('#f-style').value = keep.s || ''; $('#f-month').value = keep.m || '0';
    $('#f-who').value = keep.w || '2'; $('#p-month').value = keep.pm || '0'; $('#p-who').value = keep.pw || '2';
  }
  $('#finder').addEventListener('submit', function (e) {
    e.preventDefault();
    var r = $('#f-region').value; region = r;
    $$('.tab', tabsEl).forEach(function (x) { x.setAttribute('aria-selected', x.dataset.region === r); });
    filterCards(true);
    $('#p-month').value = $('#f-month').value; $('#p-who').value = $('#f-who').value;
    var s = $('#f-style').value; $('#p-style').value = s === '' ? '' : L(D.styles[+s]);
    goTo('#destinations');
  });

  /* ---------- map ---------- */
  function routeOrder(ids) {
    var pts = ids.filter(function (id) { return M.pins[id]; }), order = [], cur = M.ub;
    while (pts.length) {
      var bi = 0, bd = 1e9;
      pts.forEach(function (id, i) { var p = M.pins[id], d = Math.hypot(p[0] - cur[0], p[1] - cur[1]); if (d < bd) { bd = d; bi = i; } });
      cur = M.pins[pts[bi]]; order.push(pts.splice(bi, 1)[0]);
    }
    return order;
  }
  function mapSVG(ids, opts) {
    opts = opts || {};
    var s = '<svg viewBox="-10 -10 1020 540" role="img" aria-label="Map of Mongolia"><path class="m-land" d="' + M.d + '"/>';
    if (!opts.single) Object.keys(M.pins).forEach(function (k) { var p = M.pins[k]; s += '<circle class="m-dot" cx="' + p[0] + '" cy="' + p[1] + '" r="6"/>'; });
    var order = opts.single ? ids : routeOrder(ids);
    if (!opts.single && order.length) {
      var d = 'M' + M.ub.join(' '); order.forEach(function (id) { d += ' L' + M.pins[id].join(' '); }); d += ' L' + M.ub.join(' ');
      s += '<path class="m-route" d="' + d + '"/>';
    }
    s += '<g class="m-ub"><rect x="' + (M.ub[0] - 8) + '" y="' + (M.ub[1] - 8) + '" width="16" height="16" transform="rotate(45 ' + M.ub[0] + ' ' + M.ub[1] + ')"/><text x="' + (M.ub[0] + 18) + '" y="' + (M.ub[1] - 14) + '">' + (lang === 'mn' ? 'Улаанбаатар' : 'Ulaanbaatar') + '</text></g>';
    order.forEach(function (id, i) {
      var p = M.pins[id]; if (!p) return;
      s += '<g class="m-pin on"><circle class="halo" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (opts.single ? 34 : 28) + '"/><circle class="core" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (opts.single ? 14 : 16) + '"/>' +
        (opts.single ? '' : '<text x="' + p[0] + '" y="' + (p[1] + 7) + '" text-anchor="middle" style="fill:#fff;stroke:none;font-size:20px">' + (i + 1) + '</text>') + '</g>';
    });
    return s + '</svg>';
  }

  /* ---------- sync trip UI ---------- */
  function syncTrip() {
    $$('.card').forEach(function (c) {
      var on = inTrip(c.dataset.id), b = $('.card-add', c);
      b.setAttribute('aria-pressed', on); b.innerHTML = '<svg><use href="#i-' + (on ? 'check' : 'plus') + '"/></svg>';
    });
    var badge = $('[data-trip-count]'); badge.hidden = !trip.length; badge.textContent = trip.length;
    var order = routeOrder(trip), loose = trip.filter(function (id) { return !M.pins[id]; });
    $('#map').innerHTML = mapSVG(trip);
    $('#routeEmpty').hidden = !!trip.length;
    $('#clearTrip').hidden = !trip.length;
    $('#routeCount').textContent = trip.length ? trip.length + ' ' + (trip.length === 1 ? t('plan.count1') : t('plan.countN')) + ' · ' + t('plan.from') : '';
    $('#chips').innerHTML = order.concat(loose).map(function (id, i) {
      return '<li>' + (i < order.length ? (i + 1) + '. ' : '') + L(byId[id].name) + '<button type="button" data-rm="' + id + '" aria-label="Remove ' + L(byId[id].name) + '"><svg><use href="#i-close"/></svg></button></li>';
    }).join('');
    if (dlg.open && dlg.dataset.id) setDetailBtn(dlg.dataset.id);
  }
  function toggle(id) {
    var on = inTrip(id);
    if (on) trip.splice(trip.indexOf(id), 1); else trip.push(id);
    saveTrip(); syncTrip();
    if (!on) toast(L(byId[id].name) + ' ' + t('toast.added'));
  }
  $('#chips').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) toggle(b.dataset.rm); });
  $('#clearTrip').addEventListener('click', function () { trip = []; saveTrip(); syncTrip(); });

  /* ---------- detail dialog ---------- */
  var dlg = $('#detail');
  function setDetailBtn(id) {
    var on = inTrip(id), b = $('#dt-add');
    b.innerHTML = '<svg><use href="#i-' + (on ? 'check' : 'plus') + '"/></svg><span>' + t(on ? 'dest.added' : 'dest.add') + '</span>';
  }
  function openDetail(id) {
    var p = byId[id]; dlg.dataset.id = id;
    $('#dt-img').src = 'img/' + p.img + '.webp'; $('#dt-img').alt = L(p.name);
    $('#dt-where').textContent = L(p.where); $('#dt-name').textContent = L(p.name);
    $('#dt-best').textContent = L(p.best); $('#dt-text').textContent = L(p.text);
    $('#dt-map').innerHTML = M.pins[id] ? mapSVG([id], { single: true }) : '';
    setDetailBtn(id);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    if (lenis) lenis.stop();
  }
  function closeDetail() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', function () { if (lenis) lenis.start(); });
  $('#dt-close').addEventListener('click', closeDetail);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDetail(); });
  $('#dt-add').addEventListener('click', function () { toggle(dlg.dataset.id); });
  $('#dt-plan').addEventListener('click', function (e) { e.preventDefault(); if (!inTrip(dlg.dataset.id)) toggle(dlg.dataset.id); closeDetail(); setTimeout(function () { goTo('#plan'); }, 80); });

  /* ---------- real tours, day by day ---------- */
  var tourSel = D.tours[0].id;
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* ---------- tour route map (animated) ---------- */
  function routeMap(tr) {
    if (!tr.route) return '';
    return '<figure class="rmap" data-tour="' + tr.id + '"><figcaption class="rmap-h">' + esc(t('rm.title')) + '</figcaption>' +
      '<div class="rmap-stage"><svg class="rmap-svg" role="img" aria-label="' + esc(t('rm.title') + ': ' + tr.route.filter(function (r) { return r.d; }).map(function (r) { return L(D.mapNames[r.id]); }).join(', ')) + '"></svg>' +
      '<svg class="rmap-inset" viewBox="-10 -10 1020 540" aria-hidden="true"><path d="' + M.d + '"/><rect class="rmap-box"/></svg>' +
      '<div class="rmap-card" aria-hidden="true"><img alt="" width="400" height="300"><p><small></small><b></b></p></div>' +
      '<button class="rmap-replay" type="button" hidden><svg><use href="#i-play"/></svg>' + esc(t('rm.replay')) + '</button></div></figure>';
  }
  function cr(pts) { /* closed Catmull-Rom → cubic segments */
    var n = pts.length, segs = [];
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[(i - 1 + n - 1) % (n - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[(i + 2) % (n - 1)];
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      segs.push('M' + p1.map(f1).join(' ') + 'C' + c1.map(f1).join(' ') + ',' + c2.map(f1).join(' ') + ',' + p2.map(f1).join(' '));
    }
    return segs;
  }
  function dayLbl(d) { return t(/[–-]/.test(d) ? 'rm.days' : 'rm.day') + ' ' + d; }
  function f1(v) { return Math.round(v * 10) / 10; }
  function drawRouteMap(fig, animate) {
    var tr = D.tours.filter(function (x) { return x.id === fig.dataset.tour; })[0]; if (!tr) return;
    var stage = $('.rmap-stage', fig), svg = $('.rmap-svg', fig), card = $('.rmap-card', fig), replay = $('.rmap-replay', fig);
    var W = stage.clientWidth || 800, ar = W < 620 ? 4 / 5 : 16 / 9, H = W / ar;
    stage.style.aspectRatio = W < 620 ? '4 / 5' : '16 / 9';
    var pts = tr.route.map(function (r) { return r.id === 'ub' ? M.ub : M.pins[r.id]; });
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var minX = Math.min.apply(0, xs), maxX = Math.max.apply(0, xs), minY = Math.min.apply(0, ys), maxY = Math.max.apply(0, ys);
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, sw = (maxX - minX), sh = (maxY - minY);
    var padX = W < 620 ? 2.75 : 1.75, padY = W < 620 ? 1.6 : 1.4;
    var vw = Math.max(sw * padX, sh * padY * ar, 150), vh = vw / ar;
    var vx = cx - vw / 2, vy = cy - vh / 2 + (W < 620 ? vh * 0.06 : 0);
    var k = W / vw, u = function (px) { return f1(px / k); };
    svg.setAttribute('viewBox', [vx, vy, vw, vh].map(f1).join(' '));
    var box = $('.rmap-box', fig); box.setAttribute('x', f1(vx)); box.setAttribute('y', f1(vy)); box.setAttribute('width', f1(vw)); box.setAttribute('height', f1(vh));
    var pid = 'rmd-' + tr.id, segs = cr(pts), stops = tr.route;
    var h = '<defs><pattern id="' + pid + '" width="' + u(9) + '" height="' + u(9) + '" patternUnits="userSpaceOnUse"><circle cx="' + u(1.5) + '" cy="' + u(1.5) + '" r="' + u(0.9) + '" class="rm-dot"/></pattern></defs>' +
      '<path class="rm-land" d="' + M.d + '" style="stroke-width:' + u(1.2) + '"/><path class="rm-tex" d="' + M.d + '" fill="url(#' + pid + ')"/>' +
      '<path class="rm-track" d="' + segs.join('') + '" style="stroke-width:' + u(2) + ';stroke-dasharray:' + u(2) + ' ' + u(7) + '"/>';
    segs.forEach(function (d) { h += '<path class="rm-seg" d="' + d + '" style="stroke-width:' + u(3.4) + '"/>'; });
    h += '<circle class="rm-car" r="' + u(6) + '" style="stroke-width:' + u(3) + '" cx="' + M.ub[0] + '" cy="' + M.ub[1] + '"/>';
    var n = 0;
    stops.forEach(function (r, i) {
      if (r.id === 'ub' && i > 0) return;
      var p = pts[i], name = L(D.mapNames[r.id]);
      if (r.id === 'ub') {
        h += '<g class="rm-pin rm-ub" data-i="0"><rect x="' + f1(p[0] - u(7)) + '" y="' + f1(p[1] - u(7)) + '" width="' + u(14) + '" height="' + u(14) + '" transform="rotate(45 ' + p[0] + ' ' + p[1] + ')" style="stroke-width:' + u(2.5) + '"/>' +
          '<text x="' + f1(p[0] + u(14)) + '" y="' + f1(p[1] - u(10)) + '" style="font-size:' + u(13) + 'px;stroke-width:' + u(4) + '"><tspan class="rm-n">' + esc(name) + '</tspan><tspan class="rm-d" x="' + f1(p[0] + u(14)) + '" dy="' + u(14) + '" style="font-size:' + u(10.5) + 'px">' + esc(t('rm.start')) + '</tspan></text></g>';
        return;
      }
      n++;
      var pos = r.pos || 'r', tx = p[0], ty = p[1], an = 'middle';
      if (pos === 'r') { tx += u(15); ty -= u(2); an = 'start'; } else if (pos === 'l') { tx -= u(15); ty -= u(2); an = 'end'; } else if (pos === 't') { ty -= u(30); } else { ty += u(26); }
      h += '<g class="rm-pin" data-i="' + i + '" tabindex="0" role="button" aria-label="' + esc(dayLbl(r.d) + ': ' + name) + '">' +
        '<circle class="rm-halo" cx="' + p[0] + '" cy="' + p[1] + '" r="' + u(15) + '"/><circle class="rm-core" cx="' + p[0] + '" cy="' + p[1] + '" r="' + u(10) + '" style="stroke-width:' + u(2.5) + '"/>' +
        '<text class="rm-num" x="' + p[0] + '" y="' + f1(p[1] + u(4)) + '" text-anchor="middle" style="font-size:' + u(11) + 'px">' + n + '</text>' +
        '<text class="rm-lbl" x="' + f1(tx) + '" y="' + f1(ty) + '" text-anchor="' + an + '" style="font-size:' + u(13) + 'px;stroke-width:' + u(4) + '"><tspan class="rm-n">' + esc(name) + '</tspan><tspan class="rm-d" x="' + f1(tx) + '" dy="' + u(14) + '" style="font-size:' + u(10.5) + 'px">' + esc(dayLbl(r.d)) + '</tspan></text></g>';
    });
    svg.innerHTML = h;
    /* keep labels inside the frame: flip to the other side of the pin when they would be cut off */
    $$('.rm-pin text:not(.rm-num)', svg).forEach(function (tx) {
      var bb = tx.getBBox(), m = u(8), g = tx.parentNode, i = +g.dataset.i, p = pts[i], off = u(i ? 15 : 14), nx = null, an = null;
      if (bb.x + bb.width > vx + vw - m) { nx = p[0] - off; an = 'end'; }
      else if (bb.x < vx + m) { nx = p[0] + off; an = 'start'; }
      if (nx === null) return;
      tx.setAttribute('x', f1(nx)); tx.setAttribute('text-anchor', an); $$('tspan[x]', tx).forEach(function (ts) { ts.setAttribute('x', f1(nx)); });
    });
    var segEls = $$('.rm-seg', svg), car = $('.rm-car', svg), pins = $$('.rm-pin', svg);
    segEls.forEach(function (el) { var L0 = el.getTotalLength(); el.dataset.len = L0; el.style.strokeDasharray = L0 + ' ' + L0; el.style.strokeDashoffset = L0; });
    function showCard(i) {
      var r = stops[i]; if (!r || !r.img) { card.classList.remove('on'); return; }
      var p = pts[i], left = (p[0] - vx) / vw, top = (p[1] - vy) / vh, img = $('img', card);
      img.src = 'img/' + r.img + '.webp'; $('small', card).textContent = dayLbl(r.d); $('b', card).textContent = L(D.mapNames[r.id]);
      var cw = card.offsetWidth || 170, ch = card.offsetHeight || 150, gap = 26;
      var x = left > 0.5 ? left * W - gap - cw : left * W + gap, y = Math.min(Math.max(top * H - ch / 2, 10), H - ch - 10);
      card.style.transform = ''; card.style.left = Math.round(Math.max(8, Math.min(x, W - cw - 8))) + 'px'; card.style.top = Math.round(y) + 'px';
      card.classList.add('on');
    }
    function finalState() {
      segEls.forEach(function (el) { el.style.strokeDashoffset = 0; });
      pins.forEach(function (g) { g.classList.add('on'); }); car.style.opacity = 0; card.classList.remove('on'); replay.hidden = false;
    }
    pins.forEach(function (g) {
      var i = +g.dataset.i; if (!i) return;
      var on = function () { if (fig.dataset.playing !== '1') showCard(i); }, off = function () { if (fig.dataset.playing !== '1') card.classList.remove('on'); };
      g.addEventListener('mouseenter', on); g.addEventListener('focus', on); g.addEventListener('mouseleave', off); g.addEventListener('blur', off);
      g.addEventListener('click', function () { if (fig.dataset.playing !== '1') { card.classList.contains('on') ? card.classList.remove('on') : showCard(i); } });
    });
    if (!animate || reduce || !window.gsap) { finalState(); return; }
    if (fig._tl) fig._tl.kill();
    fig.dataset.playing = '1'; replay.hidden = true; card.classList.remove('on');
    pins.forEach(function (g) { g.classList.remove('on'); });
    var tl = gsap.timeline({ onComplete: function () { fig.dataset.playing = '0'; card.classList.remove('on'); car.style.opacity = 0; replay.hidden = false; } });
    fig._tl = tl;
    tl.add(function () { pins[0].classList.add('on'); }, 0.1).set(car, { opacity: 1 }, 0.3);
    var pinByIdx = {}; pins.forEach(function (g) { pinByIdx[g.dataset.i] = g; });
    segEls.forEach(function (el, si) {
      var len = +el.dataset.len, dur = Math.min(Math.max(len / 70, 0.7), 1.8), st = { v: 0 };
      tl.to(st, { v: 1, duration: dur, ease: 'power1.inOut', onUpdate: function () {
        el.style.strokeDashoffset = len * (1 - st.v);
        var pt = el.getPointAtLength(len * st.v); car.setAttribute('cx', pt.x); car.setAttribute('cy', pt.y);
      } }, '+=0.15');
      var to = si + 1;
      tl.add(function () {
        if (pinByIdx[to]) pinByIdx[to].classList.add('on');
        if (stops[to] && stops[to].img) showCard(to); else card.classList.remove('on');
      });
      if (stops[to] && stops[to].img) tl.to({}, { duration: 1.1 });
    });
  }
  var rmObs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting && !e.target.dataset.played) { e.target.dataset.played = '1'; drawRouteMap(e.target, true); } });
  }, { threshold: 0.45 }) : null;
  function initRouteMap(fig) {
    if (!fig) return;
    drawRouteMap(fig, false);
    if (rmObs && !reduce) { $$('.rm-seg', fig).forEach(function (el) { el.style.strokeDashoffset = el.dataset.len; }); $$('.rm-pin', fig).forEach(function (g) { g.classList.remove('on'); }); $('.rmap-replay', fig).hidden = true; rmObs.observe(fig); }
    $('.rmap-replay', fig).addEventListener('click', function () { drawRouteMap(fig, true); });
  }
  var rmW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - rmW) < 40) return; rmW = window.innerWidth;
    $$('.rmap').forEach(function (fig) { if (fig._tl) fig._tl.kill(); fig.dataset.playing = '0'; drawRouteMap(fig, false); });
  });
  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function tourInfo(tr) {
    var h = '<div class="tour-info">';
    if (tr.price) {
      h += '<div class="ti-price"><h3>' + esc(t('tr.price')) + '</h3><table class="ptable"><tbody>' + tr.price.map(function (r) {
        return '<tr><th scope="row">' + (r[0] === 1 ? esc(t('tr.solo')) : esc(t('tr.group')) + ' ' + r[0]) + '</th><td><b>' + money(r[1] * tr.days) + '</b><small>' + esc(t('tr.total')) + '</small></td><td class="pd">' + money(r[1]) + ' ' + esc(t('tr.perday')) + '</td></tr>';
      }).join('') + '</tbody></table><p class="ti-dep">' + esc(t('tr.deposit')) + '</p></div>';
    } else {
      h += '<div class="ti-price"><h3>' + esc(t('tr.price')) + '</h3><p class="ti-q">' + esc(t('tr.priceq')) + '</p><p class="ti-dep">' + esc(t('tr.deposit')) + '</p></div>';
    }
    if (tr.inc) {
      h += '<div class="ti-inc"><h3>' + esc(t('tr.inc')) + '</h3><ul class="ilist">' + L(tr.inc).map(function (x) { return '<li><svg><use href="#i-check"/></svg>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        (tr.exc ? '<h3>' + esc(t('tr.exc')) + '</h3><ul class="ilist ex">' + L(tr.exc).map(function (x) { return '<li><svg><use href="#i-close"/></svg>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    }
    h += '</div>';
    if (D.packing) {
      h += '<details class="pack"><summary>' + esc(t('tr.pack')) + '<svg><use href="#i-plus"/></svg></summary><div class="pack-in">' + D.packing.map(function (g) {
        return '<div><h4>' + esc(L(g.t)) + '</h4><ul>' + L(g.i).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      }).join('') + '</div><p class="pack-note">' + esc(t('tr.packnote')) + '</p></details>';
    }
    return h;
  }
  function renderTours() {
    $('#tourTabs').innerHTML = D.tours.map(function (tr) {
      var on = tr.id === tourSel;
      return '<button class="tour-tab" type="button" role="tab" id="tt-' + tr.id + '" data-tour="' + tr.id + '" aria-selected="' + on + '" aria-controls="tourPanel" tabindex="' + (on ? 0 : -1) + '">' +
        '<span class="tt-days"><b>' + tr.days + '</b>' + esc(t('tr.days')) + '</span><span class="tt-name">' + esc(L(tr.name)) + '</span>' +
        (tr.popular ? '<span class="tt-pop">' + esc(t('tr.popular')) + '</span>' : '') + '</button>';
    }).join('');
    var tr = D.tours.filter(function (x) { return x.id === tourSel; })[0];
    $('#tourPanel').setAttribute('aria-labelledby', 'tt-' + tr.id);
    $('#tourPanel').innerHTML = '<p class="tour-lead">' + esc(L(tr.lead)) + '</p><ol class="tour-days">' + tr.plan.map(function (d, i) {
      return '<li class="tday"><span class="tday-n"><small>' + esc(t('tr.day')) + '</small><b>' + (i + 1) + '</b></span><div class="tday-b"><h3>' + esc(L(d.t)) + '</h3><p>' + esc(L(d.d)) + '</p>' +
        (d.img ? '<figure class="tday-img"><img src="img/' + d.img + '.webp" alt="' + esc(L(d.t)) + '" width="1600" height="720" loading="lazy" decoding="async"></figure>' : '') +
        ((d.s || d.m) ? '<p class="tday-s"><svg><use href="#i-toono"/></svg><span>' + (d.s ? esc(t('tr.stay')) + ': ' + esc(L(d.s)) : '') + (d.s && d.m ? ' · ' : '') + (d.m ? esc(t('tr.meals')) + ': ' + d.m.split(' ').map(function (k) { return esc(t('tr.' + k)); }).join(', ') : '') + '</span></p>' : '') + '</div></li>';
    }).join('') + '</ol>' + routeMap(tr) + tourInfo(tr) + '<div class="tour-actions"><button class="btn btn-ink tour-book" type="button" data-book="' + tr.id + '">' + esc(t('tr.book')) + ' <svg><use href="#i-arrow"/></svg></button>' +
      (tr.film ? '<a class="tour-film" href="' + tr.film + '" target="_blank" rel="noopener"><span class="play"><svg><use href="#i-play"/></svg></span>' + esc(t('tr.film')) + '</a>' : '') + '</div>';
    initRouteMap($('#tourPanel .rmap'));
    $('#moreTours').innerHTML = D.moreTours.map(function (m) {
      return '<li><h3>' + esc(L(m.name)) + '</h3><p>' + esc(L(m.d)) + '</p>' +
        (m.film ? '<a class="mt-film" href="' + m.film + '" target="_blank" rel="noopener" aria-label="' + esc(t('tr.watch') + ': ' + L(m.name)) + '"><svg><use href="#i-play"/></svg>' + esc(t('tr.watch')) + '</a>' : '') + '</li>';
    }).join('');
  }
  $('#tourTabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tour]'); if (!b || b.dataset.tour === tourSel) return;
    tourSel = b.dataset.tour; renderTours();
    if (window.gsap && !reduce) gsap.from('#tourPanel .tday', { y: 24, opacity: 0, duration: .7, stagger: .05, ease: 'power3.out' });
    $('#tt-' + tourSel).focus({ preventScroll: true });
  });
  $('#tourTabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); var i = D.tours.findIndex(function (x) { return x.id === tourSel; });
    i = (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + D.tours.length) % D.tours.length;
    tourSel = D.tours[i].id; renderTours(); $('#tt-' + tourSel).focus();
  });
  $('#tourPanel').addEventListener('click', function (e) {
    var b = e.target.closest('[data-book]'); if (!b) return;
    var tr = D.tours.filter(function (x) { return x.id === b.dataset.book; })[0], f = $('#pform');
    f.msg.value = 'Tour: ' + tr.name.en + (f.msg.value && f.msg.value.indexOf('Tour: ') !== 0 ? '\n' + f.msg.value : '');
    toast(L(tr.name) + ' · ' + t('toast.tour'));
    setTimeout(function () { goTo('#plan'); setTimeout(function () { f.name.focus({ preventScroll: true }); }, 900); }, 300);
  });

  /* ---------- gallery ---------- */
  var glOpen = false, GL_FIRST = 11;
  function renderGallery() {
    $('#glGrid').innerHTML = D.gallery.map(function (g, i) {
      return '<figure class="gl' + (g.w ? ' gl-w' : '') + (g.tall ? ' gl-t' : '') + '"' + (!glOpen && i >= GL_FIRST ? ' hidden' : '') + '><img src="img/' + g.img + '.webp" alt="' + esc(L(g)) + '" loading="lazy" decoding="async"><figcaption>' + esc(L(g)) + '</figcaption></figure>';
    }).join('');
    var b = $('#glMore'); b.textContent = (glOpen ? t('gl.less') : t('gl.more') + ' (' + D.gallery.length + ')'); b.setAttribute('aria-expanded', glOpen);
    $('#rvPhotos').innerHTML = D.travellers.map(function (g) {
      return '<figure class="rvp"><img src="img/' + g.img + '.webp" alt="' + esc(L(g)) + '" loading="lazy" decoding="async"><figcaption>' + esc(L(g)) + '</figcaption></figure>';
    }).join('');
  }
  $('#glMore').addEventListener('click', function () {
    glOpen = !glOpen; renderGallery();
    if (!glOpen) goTo('#gallery');
    if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 100);
  });

  /* ---------- reviews ---------- */
  function stars(r) { var h = ''; for (var i = 1; i <= 5; i++) h += '<i class="' + (r >= i ? 'on' : r >= i - .5 ? 'half' : '') + '"></i>'; return '<span class="stars" role="img" aria-label="' + r + ' / 5">' + h + '</span>'; }
  function renderReviews() {
    $('#rvList').innerHTML = D.reviews.map(function (v) {
      return '<figure class="rv">' + stars(v.r) + '<blockquote>“' + esc(v.q) + '”</blockquote><figcaption>' + esc(v.who) + '</figcaption></figure>';
    }).join('');
  }

  /* ---------- copy contact lines ---------- */
  document.addEventListener('click', function (e) {
    var c = e.target.closest('.copy[data-copy]'); if (!c) return;
    var v = c.getAttribute('data-copy');
    var ok = function () { c.textContent = t('dc.copied'); setTimeout(function () { c.textContent = t('dc.copy'); }, 1600); };
    try { navigator.clipboard.writeText(v).then(ok, function () { toast(v); }); } catch (x) { toast(v); }
  });

  /* ---------- plan form ---------- */
  $('#pform').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, note = $('#pnote');
    if (!f.name.value.trim() || !f.contact.value.trim()) { note.textContent = t('p.req'); note.classList.add('err'); (f.name.value.trim() ? f.contact : f.name).focus(); return; }
    note.classList.remove('err');
    var order = routeOrder(trip).concat(trip.filter(function (id) { return !M.pins[id]; }));
    var lines = [
      'Trip request — Azure Skyland Mongolia',
      'Name: ' + f.name.value.trim(),
      'Contact: ' + f.contact.value.trim(),
      'Month: ' + D.months.en[+f.month.value],
      'Travellers: ' + f.who.value,
      f.tstyle.value ? 'Style: ' + f.tstyle.value : '',
      order.length ? 'Places: ' + order.map(function (id) { return byId[id].name.en; }).join(', ') : '',
      f.msg.value.trim() ? 'Note: ' + f.msg.value.trim() : ''
    ].filter(Boolean).join('\n');
    var ml = $('#mailLink'); ml.href = 'mailto:' + D.contact.email + '?subject=' + encodeURIComponent('Trip request — ' + f.name.value.trim()) + '&body=' + encodeURIComponent(lines);
    function fallback() {
      var done = function () { note.textContent = t('p.fail'); ml.hidden = false; var dm = $('#dmLink'); dm.hidden = false; dm.focus({ preventScroll: true }); };
      try { navigator.clipboard.writeText(lines).then(done, copyOld); } catch (err) { copyOld(); }
      function copyOld() { var ta = document.createElement('textarea'); ta.value = lines; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (x) {} ta.remove(); done(); }
    }
    if (f._honey && f._honey.value) return;
    var btn = f.querySelector('button[type=submit]'), label = btn.querySelector('span'), old = label.textContent;
    btn.disabled = true; label.textContent = t('p.sending');
    fetch('https://formsubmit.co/ajax/' + D.contact.email, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ _subject: 'Trip request — ' + f.name.value.trim(), _template: 'box', _captcha: 'false', name: f.name.value.trim(), contact: f.contact.value.trim(), request: lines })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && (j.success === 'true' || j.success === true)) { note.textContent = t('p.sent'); f.reset(); fillSelects(); }
      else fallback();
    }).catch(fallback).then(function () { btn.disabled = false; label.textContent = old; });
  });

  /* ---------- i18n apply ---------- */
  function splitWord() {
    var w = $('.hero-word'); var txt = t('hero.word');
    w.innerHTML = txt.split('').map(function (c) { return '<span class="ch">' + c + '</span>'; }).join('');
    w.setAttribute('aria-label', txt);
    root.classList.add('split');
  }
  function applyLang(first) {
    root.lang = lang === 'mn' ? 'mn' : 'en';
    $$('[data-i18n]').forEach(function (el) { if (el.classList.contains('hero-word')) return; el.textContent = t(el.getAttribute('data-i18n')); });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === lang); });
    renderTabs(); renderCards(); renderJourneys(); renderTours(); renderGallery(); renderReviews(); renderTiles(); fillSelects(); syncTrip();
    if (!first) { splitWord(); if (window.ScrollTrigger) { ScrollTrigger.refresh(); } }
  }
  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { if (lang === b.dataset.lang) return; lang = b.dataset.lang; store.set('sky-lang', lang); applyLang(false); });
  });

  /* ---------- header, nav, mobile menu ---------- */
  var hdr = $('#hdr'), burger = $('.burger'), mnav = $('#mnav');
  function onScroll() { hdr.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open); mnav.hidden = !open; document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mnav.hidden) setMenu(false); });
  var lenis = null;
  function goTo(sel) {
    var el = typeof sel === 'string' ? $(sel) : sel; if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: sel === '#top' ? 0 : -60, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href'); if (id.length < 2 || !$(id)) return;
    e.preventDefault(); setMenu(false); goTo(id);
  });
  if ('IntersectionObserver' in window) {
    var links = $$('.nav a');
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) links.forEach(function (l) { l.classList.toggle('on', l.getAttribute('href') === '#' + en.target.id); }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['destinations', 'journeys', 'tours', 'why', 'plan'].forEach(function (id) { io.observe($('#' + id)); });
  }
  $('#yr').textContent = new Date().getFullYear();

  /* ---------- first render ---------- */
  applyLang(true);
  splitWord();
  updateArrows();

  /* ---------- loader: what the page waits for before it lifts ---------- */
  var loaderEl = $('#loader');
  function pageReady(onProgress) {
    var jobs = [$('.hero-bg'), $('.hero-fg')].map(function (img) {
      return new Promise(function (res) {
        if (!img || (img.complete && img.naturalWidth)) return res();
        img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true });
      });
    });
    if (document.fonts && document.fonts.ready) jobs.push(document.fonts.ready);
    var done = 0;
    jobs.forEach(function (j) { j.then(function () { done++; onProgress(done / jobs.length); }); });
    var timeout = new Promise(function (res) { setTimeout(res, 6000); });
    return Promise.race([Promise.all(jobs), timeout]);
  }
  function finishLoader() { root.classList.add('loaded'); if (loaderEl && loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl); document.body.style.overflow = ''; }
  function simpleLoader() {
    if (!loaderEl) return;
    var bar = $('.loader-bar', loaderEl); $('.loader-in', loaderEl).style.opacity = '1';
    pageReady(function (p) { bar.style.setProperty('--p', p); }).then(function () {
      setTimeout(function () {
        loaderEl.style.transition = 'opacity .5s'; loaderEl.style.opacity = '0';
        setTimeout(finishLoader, 520);
      }, reduce ? 500 : 900);
    });
  }

  /* ---------- motion ---------- */
  function motion() {
    if (reduce || !window.gsap || !window.ScrollTrigger) { simpleLoader(); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    /* intro (plays when the loader lifts) */
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.from('.hero-stage', { scale: 1.16, duration: 2.8, ease: 'power3.out' }, 0)
      .from(['.brand-word', '.nav a', '.hdr-right'], { y: -14, opacity: 0, duration: 1, stagger: .06 }, .5)
      .from('.hero-kicker', { y: 30, opacity: 0, duration: 1.4 }, .6)
      .from('.hero-word .ch', { yPercent: 80, opacity: 0, duration: 1.8, stagger: .07 }, .7)
      .from('.hero-sub', { y: 30, opacity: 0, duration: 1.2 }, 1.3)
      .from('.finder', { y: 50, opacity: 0, duration: 1.4 }, 1.4);

    /* hero parallax: sky slow, word sinks behind the ridge, ridge almost fixed */
    var hero = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    hero.to('.hero-bg', { yPercent: 16, ease: 'none' }, 0)
        .to('.hero-title', { y: function () { return window.innerHeight * 0.42; }, ease: 'none' }, 0)
        .to('.hero-fg', { yPercent: 3, ease: 'none' }, 0)
        .to('.hero-bottom', { y: -80, opacity: 0, ease: 'none' }, 0);

    /* toono rays turn as you scroll */
    gsap.to('.brand-mark .rays', { rotation: 180, svgOrigin: '60 60', ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 1 } });
    gsap.to('.foot-mark .rays', { rotation: 90, svgOrigin: '60 60', ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: 1 } });

    /* generic reveals */
    $$('[data-reveal]').forEach(function (el) {
      var sibs = $$('[data-reveal]', el.parentNode), i = sibs.indexOf(el);
      gsap.from(el, { y: 28, opacity: 0, duration: 1.1, delay: Math.max(0, i) * 0.08, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
    $$('.orn-lg').forEach(function (o) { gsap.from(o, { rotation: -90, opacity: 0, scale: .6, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: o, start: 'top 90%' } }); });

    /* destination cards slide in */
    gsap.from('#track .card', { x: 90, opacity: 0, duration: 1.2, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: '#track', start: 'top 85%' } });

    /* masonry columns drift at different speeds */
    var mm = gsap.matchMedia();
    mm.add('(min-width: 821px)', function () {
      [[60, -60], [-30, 50], [90, -90]].forEach(function (v, i) {
        gsap.fromTo('.mcol:nth-child(' + (i + 1) + ')', { y: v[0] }, { y: v[1], ease: 'none', scrollTrigger: { trigger: '#masonry', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
    gsap.from('.jcard', { opacity: 0, y: 60, duration: 1.2, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '#masonry', start: 'top 85%' } });

    gsap.from('.tour-tab', { y: 30, opacity: 0, duration: 1, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '#tourTabs', start: 'top 85%' } });
    gsap.from('#tourPanel .tday', { y: 40, opacity: 0, duration: 1, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: '#tourPanel', start: 'top 80%' } });
    gsap.from('.gl', { y: 50, opacity: 0, duration: 1.1, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: '#glGrid', start: 'top 85%' } });
    gsap.from('.rv', { y: 50, opacity: 0, duration: 1.1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '#rvList', start: 'top 85%' } });

    /* tiles open like a window */
    $$('.tile').forEach(function (tile, i) {
      gsap.from(tile, { clipPath: 'inset(22% 22% 22% 22% round 6px)', duration: 1.5, delay: (i % 2) * .1, ease: 'expo.out', scrollTrigger: { trigger: tile, start: 'top 88%' } });
      gsap.from($('img', tile), { scale: 1.35, duration: 2, delay: (i % 2) * .1, ease: 'expo.out', scrollTrigger: { trigger: tile, start: 'top 88%' } });
    });

    /* why: mountain breathes, photos float at different depths */
    gsap.fromTo('.why-bg', { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.why', start: 'top bottom', end: 'bottom top', scrub: true } });
    $$('.float').forEach(function (f) {
      var s = parseFloat(f.dataset.speed || 0);
      gsap.fromTo(f, { y: -s * 500 }, { y: s * 500, ease: 'none', scrollTrigger: { trigger: '.why', start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* steps: the line draws, the rings turn */
    var sl = $('.steplist'); sl.style.setProperty('--p', 0);
    ScrollTrigger.create({ trigger: sl, start: 'top 75%', end: 'bottom 65%', scrub: true, onUpdate: function (st) { sl.style.setProperty('--p', st.progress.toFixed(3)); } });
    $$('.num .orn').forEach(function (o) { gsap.from(o, { rotation: -120, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: o, start: 'top 85%' } }); });

    /* social + plan */
    gsap.fromTo('.social-bg', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.social-card', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.plan-card', { y: 80, opacity: 0, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '.plan-card', start: 'top 85%' } });
    gsap.fromTo('.plan-bg', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.plan', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(['.foot-brand', '.foot-nav', '.foot-social'], { y: 30, opacity: 0, duration: 1.2, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.foot', start: 'top 80%' } });

    /* loader: the toono rises, the peaks come up, the name settles, then the mark flies into the header */
    if (!loaderEl) { tl.play(); }
    else {
      window.scrollTo(0, 0); document.body.style.overflow = 'hidden'; if (lenis) lenis.stop();
      var lm = $('.loader-mark', loaderEl), word = $('.loader-word', loaderEl), sub = $('.loader-sub', loaderEl), bar = $('.loader-bar', loaderEl);
      word.innerHTML = word.textContent.split('').map(function (c) { return '<span class="lc">' + c + '</span>'; }).join('');
      var rings = $$('circle', lm), land = $$('g[clip-path] > path', lm);
      rings.forEach(function (c) { var L = 2 * Math.PI * parseFloat(c.getAttribute('r')); c.style.strokeDasharray = L; c.style.strokeDashoffset = L; });
      gsap.set('.brand-mark', { opacity: 0 });
      var prog = { v: 0 };
      function setBar(p) { gsap.to(prog, { v: p, duration: .6, ease: 'power2.out', overwrite: true, onUpdate: function () { bar.style.setProperty('--p', prog.v); } }); }
      gsap.set($('.loader-in', loaderEl), { opacity: 1 });
      var load = gsap.timeline();
      load.from($$('.rays line', lm), { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: .7, stagger: .022, ease: 'back.out(2)' }, 0)
          .from($('.rays', lm), { rotation: -40, svgOrigin: '60 60', duration: 1.6, ease: 'expo.out' }, 0)
          .to(rings, { strokeDashoffset: 0, duration: 1.2, stagger: .12, ease: 'power3.inOut' }, .25)
          .from(land, { y: 46, duration: 1.3, ease: 'expo.out' }, .7)
          .from($$('.lc', word), { yPercent: 110, opacity: 0, duration: 1, stagger: .055, ease: 'expo.out' }, .85)
          .from(sub, { opacity: 0, letterSpacing: '1.1em', duration: 1.1, ease: 'expo.out' }, 1.15)
          .from(bar, { opacity: 0, duration: .4 }, 1.2);
      var minTime = new Promise(function (res) { load.eventCallback('onComplete', res); });
      Promise.all([minTime, pageReady(setBar)]).then(function () {
        setBar(1);
        var a = lm.getBoundingClientRect(), b = $('.brand-mark').getBoundingClientRect();
        var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        var out = gsap.timeline({ delay: .2, onComplete: function () { finishLoader(); if (lenis) lenis.start(); ScrollTrigger.refresh(); } });
        out.to([word, sub, bar], { y: -18, opacity: 0, duration: .5, stagger: .05, ease: 'power2.in' }, 0)
           .to(lm, { x: dx, y: dy, scale: b.width / a.width, duration: 1.15, ease: 'expo.inOut' }, .25)
           .fromTo($('.loader-curtain', loaderEl), { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.15, ease: 'expo.inOut' }, .4)
           .add(function () { tl.play(); }, .75)
           .set('.brand-mark', { opacity: 1 }, 1.4)
           .to(lm, { opacity: 0, duration: .2 }, 1.4);
      });
    }

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') motion();
  else document.addEventListener('DOMContentLoaded', motion);
})();
