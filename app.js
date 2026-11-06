/* Azure Skyland Mongolia — interactions & motion */
function skyBoot() {
  'use strict';
  var imgUrl = function (x) { return /^https?:\/\//.test(x) ? x : 'img/' + x + '.webp'; };
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

  /* mouse-follow: on desktop the row glides sideways with the pointer; photos drift inside their cards for depth */
  var finePtr = window.matchMedia('(hover: hover) and (pointer: fine)'), panTo = null, panRaf = 0, pxRaf = 0;
  function gridOn() { return $('#destinations').classList.contains('grid-mode'); }
  function cardParallax() {
    pxRaf = 0; if (reduce || gridOn()) return;
    var vw = window.innerWidth;
    $$('.card:not([hidden])', track).forEach(function (c) {
      var r = c.getBoundingClientRect(); if (r.right < -60 || r.left > vw + 60) return;
      c.style.setProperty('--px', (((r.left + r.width / 2) - vw / 2) / vw * -10).toFixed(2) + '%');
    });
  }
  function panLoop() {
    panRaf = 0; if (panTo === null) return;
    var d = panTo - track.scrollLeft;
    if (Math.abs(d) < 0.6) { track.scrollLeft = panTo; return; }
    track.scrollLeft += d * 0.07; panRaf = requestAnimationFrame(panLoop);
  }
  $('#trackWrap').addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !finePtr.matches || dragging || reduce || gridOn() || e.target.closest('.track-arrow')) return;
    var r = track.getBoundingClientRect(), f = Math.min(Math.max(((e.clientX - r.left) / r.width - 0.1) / 0.8, 0), 1);
    panTo = Math.round(f * (track.scrollWidth - track.clientWidth));
    if (!panRaf) panRaf = requestAnimationFrame(panLoop);
  });
  $('#trackWrap').addEventListener('pointerleave', function () { panTo = null; });
  track.addEventListener('pointerdown', function () { panTo = null; });
  track.addEventListener('scroll', function () { if (!pxRaf) pxRaf = requestAnimationFrame(cardParallax); }, { passive: true });
  window.addEventListener('resize', function () { if (!pxRaf) pxRaf = requestAnimationFrame(cardParallax); });
  setTimeout(cardParallax, 300);

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
  /* ---------- tour route map: a real map of Mongolia; the camera flies in to the route and back out ---------- */
  var MK = M.proj[0] * 180 / Math.PI;
  function pj(lon, lat) { return [M.proj[0] * lon + M.proj[1], M.proj[2] - MK * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))]; }
  function latAt(y) { return (2 * Math.atan(Math.exp((M.proj[2] - y) / MK)) - Math.PI / 2) * 180 / Math.PI; }
  function routeMap(tr) {
    if (!tr.route) return '';
    var n = 0;
    return '<figure class="rmap" data-tour="' + tr.id + '"><figcaption class="rmap-h">' + esc(t('rm.title')) + '</figcaption>' +
      '<div class="rmap-stage"><svg class="rmap-svg" role="img" aria-label="' + esc(t('rm.title') + ': ' + tr.route.filter(function (r) { return r.d; }).map(function (r) { return L(D.mapNames[r.id]); }).join(', ')) + '"></svg>' +
      '<div class="rmap-card" aria-hidden="true"><img alt="" width="400" height="300"><p><small></small><b></b></p></div>' +
      '<div class="rmap-scale" aria-hidden="true"><i></i><span></span></div>' +
      '<div class="rmap-ctl"><button class="rmap-zoom" type="button" hidden><svg><use href="#i-zin"/></svg><span></span></button>' +
      '<button class="rmap-replay" type="button" hidden><svg><use href="#i-play"/></svg>' + esc(t('rm.replay')) + '</button></div></div>' +
      '<ol class="rmap-stops">' + tr.route.map(function (r, i) {
        if (r.id === 'ub') return '';
        n++;
        return '<li><button type="button" data-i="' + i + '"><b>' + n + '</b><span class="st"><span>' + esc(L(D.mapNames[r.id])) + '</span><small>' + esc(dayLbl(r.d)) + '</small></span></button></li>';
      }).join('') + '</ol></figure>';
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
  function f3(v) { return Math.round(v * 1000) / 1000; }
  var LBL_OFF = { r: [15, -2, 'start'], l: [-15, -2, 'end'], t: [0, -30, 'middle'], b: [0, 27, 'middle'] };
  /* mode: 'final' (everything drawn), 'wait' (map only, before it scrolls into view), 'play' */
  function drawRouteMap(fig, mode) {
    var tr = D.tours.filter(function (x) { return x.id === fig.dataset.tour; })[0]; if (!tr) return;
    if (fig._tl) { fig._tl.kill(); fig._tl = null; }
    var stage = $('.rmap-stage', fig), svg = $('.rmap-svg', fig), card = $('.rmap-card', fig), replay = $('.rmap-replay', fig);
    var scI = $('.rmap-scale i', fig), scS = $('.rmap-scale span', fig), chips = $$('.rmap-stops button', fig), zb = $('.rmap-zoom', fig);
    var W = stage.clientWidth || 800, mob = W < 620, ar = mob ? 1 : 16 / 9, H = W / ar;
    stage.style.aspectRatio = mob ? '1 / 1' : '16 / 9';
    var stops = tr.route, pts = stops.map(function (r) { return r.id === 'ub' ? M.ub : M.pins[r.id]; });
    /* camera views: the whole country, and the route */
    var sFull = Math.min(W / (960 * 1.06), H / (462 * 1.1)), full = { x: 500, y: 262, s: sFull };
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var minX = Math.min.apply(0, xs), maxX = Math.max.apply(0, xs), minY = Math.min.apply(0, ys), maxY = Math.max.apply(0, ys);
    var sw = maxX - minX, sh = maxY - minY, padX = mob ? 2.75 : 1.75, padY = mob ? 1.6 : 1.65;
    var sR = Math.min(Math.max(W / Math.max(sw * padX, sh * padY * ar, 150), sFull * 1.2), sFull * (mob ? 3.4 : 2.6));
    var route = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 + (mob ? (H / sR) * 0.04 : 0), s: sR }, end = mob ? route : full;
    var cam = { x: end.x, y: end.y, s: end.s };
    function q(s) { var a = Math.log(s / sFull) / Math.log(sR / sFull); return 0.86 + 0.14 * Math.min(Math.max(a || 0, 0), 1); }
    /* base map */
    var cid = 'rmc-' + tr.id, rl = M.relief, cx = M.ctx;
    var h = '<defs><clipPath id="' + cid + '"><path d="' + M.border + '"/></clipPath></defs>' +
      '<rect class="rm-sea" x="-3000" y="-3000" width="7000" height="7000"/>' +
      '<image href="img/map/mn-ctx.webp" x="' + cx[0] + '" y="' + cx[1] + '" width="' + cx[2] + '" height="' + cx[3] + '" preserveAspectRatio="none"/>' +
      '<g clip-path="url(#' + cid + ')"><image href="img/map/mn-relief.webp" x="' + rl[0] + '" y="' + rl[1] + '" width="' + rl[2] + '" height="' + rl[3] + '" preserveAspectRatio="none"/>' +
      '<path class="rm-riv" d="' + M.rivers + '"/><path class="rm-lake" d="' + M.lakes + '"/><path class="rm-aimag" d="' + M.aimag + '"/></g>' +
      '<path class="rm-border" d="' + M.border + '"/><g class="rm-rgs" aria-hidden="true">' + (D.mapLabels || []).map(function (l) {
        var p = pj(l.ll[0], l.ll[1]);
        return '<g class="rm-rg rm-' + l.c + '" data-x="' + f1(p[0]) + '" data-y="' + f1(p[1]) + '" data-r="' + (l.r || 0) + '"><text text-anchor="' + (l.a || 'middle') + '" dy=".35em">' + esc(L(l.t)) + '</text></g>';
      }).join('') + '</g>';
    var segs = cr(pts);
    h += '<path class="rm-track" d="' + segs.join('') + '"/>';
    segs.forEach(function (d) { h += '<path class="rm-seg" d="' + d + '"/>'; });
    h += '<g class="rm-car"><circle r="6"/></g>';
    var n = 0;
    stops.forEach(function (r, i) {
      if (r.id === 'ub' && i > 0) return;
      var name = L(D.mapNames[r.id]);
      if (r.id === 'ub') {
        h += '<g class="rm-pin rm-ub" data-i="0"><g class="rm-pop"><rect x="-7" y="-7" width="14" height="14" transform="rotate(45)"/>' +
          '<text class="rm-lbl"><tspan class="rm-n">' + esc(name) + '</tspan><tspan class="rm-d" dy="14">' + esc(t('rm.start')) + '</tspan></text></g></g>';
        return;
      }
      n++;
      h += '<g class="rm-pin" data-i="' + i + '" tabindex="0" role="button" aria-label="' + esc(dayLbl(r.d) + ': ' + name) + '"><g class="rm-pop">' +
        '<circle class="rm-halo" r="15"/><circle class="rm-core" r="10"/><text class="rm-num" y="4" text-anchor="middle">' + n + '</text>' +
        '<text class="rm-lbl"><tspan class="rm-n">' + esc(name) + '</tspan><tspan class="rm-d" dy="14">' + esc(dayLbl(r.d)) + '</tspan></text></g></g>';
    });
    svg.innerHTML = h;
    var segEls = $$('.rm-seg', svg), track = $('.rm-track', svg), car = $('.rm-car', svg), pins = $$('.rm-pin', svg), rgs = $$('.rm-rg', svg);
    var carPt = M.ub, curCard = -1, pinByIdx = {};
    pins.forEach(function (g) { pinByIdx[g.dataset.i] = g; });
    rgs.forEach(function (g) { var bb = $('text', g).getBBox(); g.dataset.hw = f1(bb.width / 2); });
    segEls.forEach(function (el) { var L0 = el.getTotalLength(); el.dataset.len = L0; el.style.strokeDasharray = L0 + ' ' + L0; el.style.strokeDashoffset = L0; });
    /* labels: try the preferred side, then the others; keep them inside the frame and off each other */
    function placeLbl(g, pos) {
      var tx = $('.rm-lbl', g), o = LBL_OFF[pos]; g.dataset.pos = pos;
      tx.setAttribute('x', o[0]); tx.setAttribute('y', o[1]); tx.setAttribute('text-anchor', o[2]);
      $('.rm-d', tx).setAttribute('x', o[0]);
    }
    function layout(v, canHide) {
      var vw = W / v.s, vh = H / v.s, vx = v.x - vw / 2, vy = v.y - vh / 2, qq = q(v.s), res = [];
      var scr = pins.map(function (g) { var p = pts[+g.dataset.i]; return [(p[0] - vx) * v.s, (p[1] - vy) * v.s]; });
      var taken = scr.map(function (c) { var r = 12 * qq; return [c[0] - r, c[1] - r, c[0] + r, c[1] + r]; });
      taken.push([W - (mob ? 250 : 320), H - 60, W, H], mob ? [0, 0, 110, 36] : [0, H - 40, 120, H]);
      pins.forEach(function (g, gi) {
        var i = +g.dataset.i, pref = stops[i].pos || 'r', c = scr[gi], pick = null;
        var cands = [pref].concat(['r', 'l', 't', 'b'].filter(function (x) { return x !== pref; }));
        for (var k = 0; k < cands.length && !pick; k++) {
          placeLbl(g, cands[k]);
          var bb = $('.rm-lbl', g).getBBox(), rc = [c[0] + bb.x * qq - 3, c[1] + bb.y * qq - 2, c[0] + (bb.x + bb.width) * qq + 3, c[1] + (bb.y + bb.height) * qq + 2];
          var inside = rc[0] >= 6 && rc[1] >= 6 && rc[2] <= W - 6 && rc[3] <= H - 6;
          var hit = taken.some(function (o, oi) { return oi !== gi && rc[0] < o[2] && rc[2] > o[0] && rc[1] < o[3] && rc[3] > o[1]; });
          if (inside && !hit) { pick = cands[k]; taken.push(rc); }
        }
        res.push({ pos: pick || pref, hide: !pick && canHide });
      });
      return res;
    }
    function applyLayout(res) { res.forEach(function (o, gi) { placeLbl(pins[gi], o.pos); pins[gi].classList.toggle('nolbl', o.hide); }); }
    function placeCar(k) { car.setAttribute('transform', 'translate(' + f1(carPt[0]) + ' ' + f1(carPt[1]) + ') scale(' + f3(k) + ')'); }
    function applyCam() {
      var s = cam.s, k = 1 / s, vw = W / s, vh = H / s, vx = cam.x - vw / 2, vy = cam.y - vh / 2, qq = q(s), zoom = s / sFull;
      svg.setAttribute('viewBox', [vx, vy, vw, vh].map(function (v) { return v.toFixed(2); }).join(' '));
      pins.forEach(function (g) { var p = pts[+g.dataset.i]; g.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ') scale(' + f3(k * qq) + ')'); });
      placeCar(k * qq);
      segEls.forEach(function (el) { el.style.strokeWidth = f3(3.2 * k * qq); });
      track.style.strokeWidth = f3(2 * k); track.style.strokeDasharray = f3(1.5 * k) + ' ' + f3(6.5 * k);
      rgs.forEach(function (g) {
        var x = +g.dataset.x, y = +g.dataset.y, sx = (x - vx) * s, sy = (y - vy) * s, hw = +g.dataset.hw, big = g.classList.contains('rm-big');
        var lf = g.querySelector('text').getAttribute('text-anchor') === 'start';
        var m = Math.min(lf ? sx - 8 : sx - hw, W - sx - (lf ? hw * 2 : hw), sy - 12, H - sy - 12);
        var o = Math.max(0, Math.min(1, m / 24));
        if (big) o *= Math.max(0, Math.min(1, 1 - (zoom - 1) / 0.45));
        else if (zoom > 1.25) o *= 0.75;
        g.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + g.dataset.r + ') scale(' + f3(k) + ')');
        g.style.opacity = f3(o);
      });
      var kmPerUnit = 111.32 * Math.cos(latAt(cam.y) * Math.PI / 180) / M.proj[0], pxKm = s / kmPerUnit;
      var dist = [10, 20, 50, 100, 200, 300, 500, 1000].filter(function (d) { return d * pxKm <= 100; }).pop() || 10;
      scI.style.width = Math.round(dist * pxKm) + 'px'; scS.textContent = dist + ' ' + t('rm.km');
      if (curCard >= 0) posCard(curCard);
    }
    function posCard(i) {
      var vw = W / cam.s, vh = H / cam.s, p = pts[i], left = (p[0] - (cam.x - vw / 2)) * cam.s, top = (p[1] - (cam.y - vh / 2)) * cam.s;
      var cw = card.offsetWidth || 170, ch = card.offsetHeight || 150, gap = 24;
      var x = left > W / 2 ? left - gap - cw : left + gap, y = Math.min(Math.max(top - ch / 2, 10), H - ch - 10);
      card.style.left = Math.round(Math.max(8, Math.min(x, W - cw - 8))) + 'px'; card.style.top = Math.round(y) + 'px';
    }
    function mark(i) {
      pins.forEach(function (g) { g.classList.toggle('hl', +g.dataset.i === i); });
      chips.forEach(function (b) { b.classList.toggle('cur', +b.dataset.i === i); });
    }
    function showCard(i) {
      var r = stops[i]; if (!r || !r.img) { hideCard(); return; }
      $('img', card).src = imgUrl(r.img); $('small', card).textContent = dayLbl(r.d); $('b', card).textContent = L(D.mapNames[r.id]);
      curCard = i; posCard(i); card.classList.add('on'); mark(i);
    }
    function hideCard() { curCard = -1; card.classList.remove('on'); mark(-1); }
    var lr = layout(route, false), le = mob ? lr : layout(full, true);
    function startState() {
      cam.x = full.x; cam.y = full.y; cam.s = full.s; carPt = M.ub;
      applyLayout(lr); svg.classList.remove('lbl-off');
      segEls.forEach(function (el) { el.style.strokeDashoffset = el.dataset.len; });
      pins.forEach(function (g) { g.classList.remove('on'); }); car.style.opacity = 0; hideCard();
      chips.forEach(function (b) { b.classList.add('dim'); }); replay.hidden = true; zb.hidden = true;
      applyCam();
    }
    var atEnd = true;
    function setZoomBtn() {
      var zin = (atEnd ? end : (end === full ? route : full)) === full;
      zb.hidden = false; $('use', zb).setAttribute('href', zin ? '#i-zin' : '#i-zout'); $('span', zb).textContent = t(zin ? 'rm.zin' : 'rm.zout');
    }
    function finalState() {
      cam.x = end.x; cam.y = end.y; cam.s = end.s; atEnd = true; setZoomBtn();
      applyLayout(le); svg.classList.remove('lbl-off');
      segEls.forEach(function (el) { el.style.strokeDashoffset = 0; });
      pins.forEach(function (g) { g.classList.add('on'); }); car.style.opacity = 0; hideCard();
      chips.forEach(function (b) { b.classList.remove('dim'); }); replay.hidden = false; fig.dataset.playing = '0';
      applyCam();
    }
    function fly(tl, to, dur, pos) {
      var st = { p: 0 }, fr;
      tl.to(st, { p: 1, duration: dur, ease: 'power2.inOut', onStart: function () { fr = { x: cam.x, y: cam.y, s: cam.s }; }, onUpdate: function () {
        if (!fr) fr = { x: cam.x, y: cam.y, s: cam.s };
        var p = st.p, s = Math.exp(Math.log(fr.s) + (Math.log(to.s) - Math.log(fr.s)) * p);
        if (Math.abs(to.s - fr.s) / fr.s > 0.05) { /* zoom about the point that stays put, like a camera dolly */
          var fx = (to.x * to.s - fr.x * fr.s) / (to.s - fr.s), fy = (to.y * to.s - fr.y * fr.s) / (to.s - fr.s);
          cam.x = fx + (fr.x - fx) * fr.s / s; cam.y = fy + (fr.y - fy) * fr.s / s;
        } else { cam.x = fr.x + (to.x - fr.x) * p; cam.y = fr.y + (to.y - fr.y) * p; }
        cam.s = s; applyCam();
      } }, pos);
    }
    var idle = function () { return fig.dataset.playing !== '1'; };
    pins.forEach(function (g) {
      var i = +g.dataset.i; if (!i) return;
      g.addEventListener('mouseenter', function () { if (idle()) showCard(i); });
      g.addEventListener('focus', function () { if (idle()) showCard(i); });
      g.addEventListener('mouseleave', function () { if (idle()) hideCard(); });
      g.addEventListener('blur', function () { if (idle()) hideCard(); });
      g.addEventListener('click', function () { if (idle()) { curCard === i ? hideCard() : showCard(i); } });
    });
    chips.forEach(function (b) {
      var i = +b.dataset.i;
      b.onmouseenter = b.onfocus = function () { if (idle()) showCard(i); };
      b.onmouseleave = b.onblur = function () { if (idle()) hideCard(); };
      b.onclick = function () { if (idle()) { curCard === i ? hideCard() : showCard(i); } };
    });
    zb.onclick = function () {
      if (!idle() || !window.gsap) return;
      var cur = atEnd ? end : (end === full ? route : full), to = cur === full ? route : full, lay = to === full ? (mob ? layout(full, true) : le) : lr;
      if (fig._tl) fig._tl.kill();
      hideCard(); svg.classList.add('lbl-off'); fig.dataset.playing = '1';
      var zt = gsap.timeline({ onComplete: function () { applyLayout(lay); svg.classList.remove('lbl-off'); fig.dataset.playing = '0'; atEnd = to === end; setZoomBtn(); } });
      fig._tl = zt; fly(zt, to, reduce ? 0.01 : 1.2, 0);
    };
    if (mode === 'wait') { startState(); fig.dataset.playing = '0'; return; }
    if (mode !== 'play' || reduce || !window.gsap) { finalState(); return; }
    startState(); fig.dataset.playing = '1';
    var tl = gsap.timeline({ onComplete: finalState });
    fig._tl = tl;
    tl.add(function () { pins[0].classList.add('on'); }, 0.15);
    fly(tl, route, mob ? 1.1 : 1.3, 0.45);
    tl.set(car, { opacity: 1 });
    segEls.forEach(function (el, si) {
      var len = +el.dataset.len, dur = Math.min(Math.max(len / 95, 0.55), 1.2), st = { v: 0 };
      tl.to(st, { v: 1, duration: dur, ease: 'power1.inOut', onUpdate: function () {
        el.style.strokeDashoffset = len * (1 - st.v);
        var pt = el.getPointAtLength(len * st.v); carPt = [pt.x, pt.y]; placeCar(q(cam.s) / cam.s);
      } }, '+=0.12');
      var to = si + 1;
      tl.add(function () {
        if (pinByIdx[to]) pinByIdx[to].classList.add('on');
        chips.forEach(function (b) { if (+b.dataset.i === to) b.classList.remove('dim'); });
        if (stops[to] && stops[to].img) showCard(to); else hideCard();
      });
      if (stops[to] && stops[to].img) tl.to({}, { duration: 0.75 });
    });
    tl.add(function () { hideCard(); gsap.to(car, { opacity: 0, duration: 0.3 }); if (!mob) svg.classList.add('lbl-off'); }, '+=0.15');
    if (!mob) {
      fly(tl, full, 1.2, '+=0.1');
      tl.add(function () { applyLayout(le); svg.classList.remove('lbl-off'); });
      tl.to({}, { duration: 0.4 });
    }
  }
  var rmObs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting && !e.target.dataset.played) { e.target.dataset.played = '1'; drawRouteMap(e.target, 'play'); } });
  }, { threshold: 0.45 }) : null;
  function initRouteMap(fig) {
    if (!fig) return;
    var wait = rmObs && !reduce;
    drawRouteMap(fig, wait ? 'wait' : 'final');
    if (wait) rmObs.observe(fig);
    $('.rmap-replay', fig).addEventListener('click', function () { drawRouteMap(fig, 'play'); });
  }
  var rmW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - rmW) < 40) return; rmW = window.innerWidth;
    $$('.rmap').forEach(function (fig) { fig.dataset.playing = '0'; drawRouteMap(fig, rmObs && !reduce && !fig.dataset.played ? 'wait' : 'final'); });
  });
  /* ---------- 3D journey map under the hero: MapLibre over real terrain; the camera drives the route and stops at each place ---------- */
  var jm = { sec: $('#journey-map') };
  var GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
  var DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  var MN_B = [[87.7, 41.55], [119.95, 52.2]];
  function f5(v) { return Math.round(v * 1e5) / 1e5; }
  function lonlat(p) { return [f5((p[0] - M.proj[1]) / M.proj[0]), f5(latAt(p[1]))]; }
  function rings(d) { var out = [], re = /M([^MZ]+)(Z?)/g, m; while ((m = re.exec(d))) out.push(m[1].split('L').map(function (s) { return lonlat(s.split(',').map(Number)); })); return out; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function smooth(k) { k = Math.min(Math.max(k, 0), 1); return k * k * (3 - 2 * k); }
  function angd(to, from) { return ((to - from + 540) % 360) - 180; }
  function hasGL() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  function jmTours() { return D.tours.filter(function (x) { return x.route; }); }
  var JM_PAL = ['#2C6CA6', '#D9822B', '#2E8B57', '#C0392B', '#7B4FA3', '#B8860B', '#1F8A9E', '#D35D8F', '#5D6D2F', '#8C5A3C'];
  function jmCol(id) { var ts = jmTours(), i = 0; ts.forEach(function (x, k) { if (x.id === id) i = k; }); return JM_PAL[i % JM_PAL.length]; }
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  /* the other tours, drawn at once in their own colours when the map shows the whole country */
  function jmOthers(show) {
    var map = jm.map; if (!map || !map.getSource('others')) return;
    if (show) {
      map.getSource('others').setData({ type: 'FeatureCollection', features: jmTours().filter(function (x) { return x.id !== jm.cur; }).map(function (x) {
        return { type: 'Feature', properties: { id: x.id, c: jmCol(x.id), n: L(x.name) }, geometry: { type: 'LineString', coordinates: jmRoute(x).line } };
      }) });
    }
    ['others-case', 'others'].forEach(function (l) { map.setPaintProperty(l, 'line-opacity', show ? (l === 'others' ? 0.9 : 0.85) : 0); });
    jm.othersOn = !!show; jm.stage.classList.toggle('jm-all', !!show);
  }
  function dayTitle(tr, d) { var p = tr.plan && tr.plan[parseInt(d, 10) - 1]; return p ? L(p.t) : ''; }
  function jmRoute(tr) {
    var stops = tr.route, pts = stops.map(function (r) { return r.id === 'ub' ? M.ub : M.pins[r.id]; }), n = pts.length, N = 44;
    var xy = [], F = [0], segKm = [];
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[(i - 1 + n - 1) % (n - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[(i + 2) % (n - 1)];
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      for (var k = i ? 1 : 0; k <= N; k++) {
        var u = k / N, v = 1 - u;
        xy.push([v * v * v * p1[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p2[0], v * v * v * p1[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p2[1]]);
      }
      F.push(xy.length - 1);
    }
    var cum = [0];
    for (var j = 1; j < xy.length; j++) cum.push(cum[j - 1] + Math.hypot(xy[j][0] - xy[j - 1][0], xy[j][1] - xy[j - 1][1]));
    var tot = cum[cum.length - 1];
    var ll = xy.map(lonlat), lat0 = latAt(xy[0][1]);
    var segs = F.slice(0, -1).map(function (a, i) {
      var km = (cum[F[i + 1]] - cum[a]) * 111.32 * Math.cos(latAt((xy[a][1] + xy[F[i + 1]][1]) / 2) * Math.PI / 180) / M.proj[0];
      return { g0: cum[a] / tot, g1: cum[F[i + 1]] / tot, km: km };
    });
    var lons = ll.map(function (p) { return p[0]; }), lats = ll.map(function (p) { return p[1]; });
    return { tr: tr, stops: stops, ll: pts.map(lonlat), line: ll, cum: cum, tot: tot, segs: segs, lat0: lat0,
      bounds: [[Math.min.apply(0, lons), Math.min.apply(0, lats)], [Math.max.apply(0, lons), Math.max.apply(0, lats)]] };
  }
  function posAt(R, g) {
    var d = g * R.tot, a = 0, b = R.cum.length - 1;
    while (b - a > 1) { var m = (a + b) >> 1; if (R.cum[m] <= d) a = m; else b = m; }
    var k = (d - R.cum[a]) / ((R.cum[b] - R.cum[a]) || 1);
    return [lerp(R.line[a][0], R.line[b][0], k), lerp(R.line[a][1], R.line[b][1], k)];
  }
  function jmStyle() {
    function corners(r) { var x0 = r[0], y0 = r[1], x1 = r[0] + r[2], y1 = r[1] + r[3]; return [lonlat([x0, y0]), lonlat([x1, y0]), lonlat([x1, y1]), lonlat([x0, y1])]; }
    var mn = rings(M.border);
    function fc(type, coords) { return { type: 'Feature', properties: {}, geometry: { type: type, coordinates: coords } }; }
    return {
      version: 8,
      sources: {
        ctx: { type: 'image', url: 'img/map/mn-ctx.webp', coordinates: corners(M.ctx) },
        rel: { type: 'image', url: 'img/map/mn-relief.webp', coordinates: corners(M.relief) },
        bm: { type: 'raster', tiles: [GIBS], tileSize: 256, maxzoom: 8, attribution: '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA GIBS</a>' },
        dem: { type: 'raster-dem', tiles: [DEM], tileSize: 256, maxzoom: 11, encoding: 'terrarium', attribution: '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain: Mapzen, AWS</a>' },
        hs: { type: 'raster-dem', tiles: [DEM], tileSize: 256, maxzoom: 12, encoding: 'terrarium' },
        lakes: { type: 'geojson', data: fc('MultiPolygon', rings(M.lakes).map(function (r) { return [r]; })) },
        rivers: { type: 'geojson', data: fc('MultiLineString', rings(M.rivers)) },
        aimag: { type: 'geojson', data: fc('MultiLineString', rings(M.aimag)) },
        border: { type: 'geojson', data: fc('MultiLineString', mn), attribution: 'Natural Earth' },
        mask: { type: 'geojson', data: fc('Polygon', [[[55, 15], [155, 15], [155, 70], [55, 70], [55, 15]]].concat(mn)) },
        route: { type: 'geojson', lineMetrics: true, data: fc('LineString', [[106.9, 47.9], [106.91, 47.91]]) },
        others: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#EEE6DC' } },
        { id: 'ctx', type: 'raster', source: 'ctx', paint: { 'raster-fade-duration': 0 } },
        { id: 'rel', type: 'raster', source: 'rel', paint: { 'raster-fade-duration': 0 } },
        { id: 'bm', type: 'raster', source: 'bm', paint: { 'raster-saturation': 0.4, 'raster-contrast': 0.16, 'raster-brightness-min': 0.05, 'raster-brightness-max': 1, 'raster-fade-duration': 250 } },
        { id: 'hs', type: 'hillshade', source: 'hs', paint: { 'hillshade-exaggeration': 0.75, 'hillshade-shadow-color': '#3B2A1C', 'hillshade-highlight-color': '#FFF3DC', 'hillshade-accent-color': '#6B4E33', 'hillshade-illumination-direction': 315 } },
        { id: 'lakes', type: 'fill', source: 'lakes', paint: { 'fill-color': '#7FAFD6', 'fill-outline-color': '#5C8FBF' } },
        { id: 'rivers', type: 'line', source: 'rivers', paint: { 'line-color': '#5C8FBF', 'line-width': 1.1, 'line-opacity': 0.75 } },
        { id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#EEE6DC', 'fill-opacity': 0.6 } },
        { id: 'aimag', type: 'line', source: 'aimag', paint: { 'line-color': '#FFFFFF', 'line-width': 0.9, 'line-opacity': 0.6 } },
        { id: 'border', type: 'line', source: 'border', layout: { 'line-join': 'round' }, paint: { 'line-color': '#131A27', 'line-width': 1.6, 'line-opacity': 0.7 } },
        { id: 'others-case', type: 'line', source: 'others', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 5.5, 'line-opacity': 0, 'line-opacity-transition': { duration: 700, delay: 0 } } },
        { id: 'others', type: 'line', source: 'others', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': 3, 'line-opacity': 0, 'line-opacity-transition': { duration: 700, delay: 0 } } },
        { id: 'plan', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': 'rgba(19,26,39,.55)', 'line-width': 2, 'line-dasharray': [0.6, 2.4] } },
        { id: 'drawn-case', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 8, 'line-gradient': 'rgba(255,255,255,0)' } },
        { id: 'drawn', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 4, 'line-gradient': 'rgba(44,108,166,0)' } }
      ]
    };
  }
  function jmInit() {
    var sec = jm.sec; if (!sec) return;
    jm.stage = $('.jm-stage', sec); jm.box = $('.jm-map', sec); jm.card = $('.jm-card', sec); jm.tabs = $('.jm-tabs', sec); jm.chips = $('.jm-stops', sec);
    jm.replay = $('.jm-replay', sec); jm.view = $('.jm-view', sec);
    jm.cur = jmTours()[0].id; jm.tok = 0; jm.playing = false; jm.atRoute = true;
    jmTabs(); jmChips();
    jm.tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-tour]'); if (b && b.dataset.tour !== jm.cur) jmSetTour(b.dataset.tour, true); });
    jm.replay.addEventListener('click', function () { jmPlay(); });
    jm.view.addEventListener('click', function () { jmToggleView(); });
    jm.chips.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) jmGoStop(+b.dataset.i); });
    if (!hasGL()) { jmFallback(); return; }
    /* load the map library a little before the section, but start the flight only when most of the map is on screen */
    var pre = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && !jm.loading) { jm.loading = true; jmLoad(); pre.disconnect(); } });
    }, { rootMargin: '700px 0px' });
    pre.observe(jm.stage);
    var see = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var r = e.intersectionRatio;
        if (r >= 0.6) { jm.visible = true; if (jm.ready && !jm.played) jmStart(); }
        else if (r < 0.2) { jm.visible = false; if (jm.playing) { jmStop(false); jm.played = false; } }
      });
    }, { threshold: [0, 0.2, 0.6] });
    see.observe(jm.stage);
  }
  function jmFallback() {
    jm.fallback = true; jm.stage.classList.add('jm-flat');
    var tr = D.tours.filter(function (x) { return x.id === jm.cur; })[0];
    jm.box.innerHTML = routeMap(tr); var fig = $('.rmap', jm.box); if (fig) initRouteMap(fig);
    jm.chips.hidden = true;
  }
  function jmLoad() {
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'vendor/maplibre/maplibre-gl.css'; document.head.appendChild(css);
    var s = document.createElement('script'); s.src = 'vendor/maplibre/maplibre-gl.js'; s.async = true;
    s.onload = jmCreate; s.onerror = jmFallback; document.head.appendChild(s);
  }
  function jmLocale() {
    return {
      'CooperativeGesturesHandler.WindowsHelpText': t('jm.coop.win'), 'CooperativeGesturesHandler.MacHelpText': t('jm.coop.mac'), 'CooperativeGesturesHandler.MobileHelpText': t('jm.coop.mob'),
      'NavigationControl.ZoomIn': t('jm.zin'), 'NavigationControl.ZoomOut': t('jm.zout'), 'NavigationControl.ResetBearing': t('jm.north')
    };
  }
  function jmCreate() {
    var ml = window.maplibregl; if (!ml) { jmFallback(); return; }
    try {
      jm.map = new ml.Map({ container: jm.box, style: jmStyle(), bounds: MN_B, fitBoundsOptions: { padding: 16 }, maxPitch: 70, maxBounds: [[66, 26], [141, 63]],
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2), cooperativeGestures: true, attributionControl: { compact: true }, locale: jmLocale(), fadeDuration: 120 });
    } catch (e) { jmFallback(); return; }
    var map = jm.map;
    map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right');
    map.on('error', function (e) { if (window.console) console.warn('map:', e && e.error && e.error.message); });
    map.on('load', function () {
      try { map.setTerrain({ source: 'dem', exaggeration: 2 }); } catch (e) {}
      jm.carEl = document.createElement('div'); jm.carEl.className = 'jm-car';
      jm.car = new ml.Marker({ element: jm.carEl }).setLngLat(lonlat(M.ub)).addTo(map);
      jm.rg = (D.mapLabels || []).map(function (l) {
        var el = document.createElement('div'); el.className = 'jm-rg jm-' + l.c; el.textContent = L(l.t); el.setAttribute('aria-hidden', 'true');
        return { l: l, el: el, m: new ml.Marker({ element: el, anchor: l.a === 'start' ? 'left' : 'center' }).setLngLat(l.ll).addTo(map) };
      });
      map.on('zoom', jmZoomClass); jmZoomClass();
      map.on('move', function () { if (!jm.flipRaf) jm.flipRaf = requestAnimationFrame(jmFlip); });
      ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'].forEach(function (ev) { map.on(ev, function (e) { if (e.originalEvent && jm.playing) jmStop(true); }); });
      map.on('mousemove', 'others', function (e) { var f = e.features && e.features[0]; map.getCanvas().style.cursor = 'pointer'; jmTip(f ? f.properties.n : '', e.point); });
      map.on('mouseleave', 'others', function () { map.getCanvas().style.cursor = ''; jmTip('', null); });
      map.on('click', 'others', function (e) { var f = e.features && e.features[0]; if (f) { jmTip('', null); jmSetTour(f.properties.id, true); } });
      jmSetTour(jm.cur, false);
      jm.ready = true;
      if (jm.visible && !jm.played) jmStart();
    });
  }
  function jmFlip() {
    jm.flipRaf = 0; if (!jm.map || !jm.pins) return;
    var W = jm.stage.clientWidth;
    jm.pins.forEach(function (p) { var l = $('.jm-l', p.el), x = jm.map.project(p.ll).x; p.el.classList.toggle('flip', x + 24 + (l ? l.offsetWidth : 0) > W - 10); });
  }
  function jmZoomClass() { if (jm.map) jm.stage.classList.toggle('jm-far', jm.map.getZoom() < 6.6); }
  function jmTabs() {
    jm.tabs.innerHTML = jmTours().map(function (tr) {
      return '<button class="jm-tab" type="button" role="tab" data-tour="' + tr.id + '" aria-selected="' + (tr.id === jm.cur) + '" style="--tc:' + jmCol(tr.id) + '"><i class="jm-dot" aria-hidden="true"></i><b>' + tr.days + '</b><small>' + esc(t('tr.days')) + '</small>' + esc(L(tr.name).replace(/^\d+-Day\s*/, '').replace(/\s*\d+\s*хоногийн\s*/i, ' ').replace(/,?\s*\d+\s*хоног\s*$/i, '').trim()) + '</button>';
    }).join('');
  }
  function jmChips() {
    var tr = D.tours.filter(function (x) { return x.id === jm.cur; })[0], n = 0;
    jm.chips.innerHTML = tr.route.map(function (r, i) {
      if (r.id === 'ub') return '';
      n++;
      return '<li><button type="button" data-i="' + i + '"><b>' + n + '</b><span class="st"><span>' + esc(L(D.mapNames[r.id])) + '</span><small>' + esc(dayLbl(r.d)) + '</small></span></button></li>';
    }).join('');
  }
  function jmSetTour(id, play) {
    jm.cur = id; jmStop(false);
    $$('.jm-tab', jm.tabs).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tour === id); });
    jmChips();
    if (jm.fallback) { jmFallback(); return; }
    if (!jm.map || !jm.carEl || !jm.map.getSource('route')) return;
    var ml = window.maplibregl, map = jm.map, R = jm.R = jmRoute(D.tours.filter(function (x) { return x.id === id; })[0]);
    map.getSource('route').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: R.line } });
    (jm.pins || []).forEach(function (p) { p.m.remove(); });
    var n = 0;
    jm.pins = R.stops.map(function (r, i) {
      if (r.id === 'ub' && i > 0) return null;
      var wrap = document.createElement('div'), ub = r.id === 'ub';
      if (!ub) n++;
      wrap.className = 'jm-mk';
      wrap.innerHTML = '<div class="jm-pin' + (ub ? ' jm-ub' : '') + '"><i>' + (ub ? '' : n) + '</i><span class="jm-l"><b>' + esc(L(D.mapNames[r.id])) + '</b><small>' + esc(ub ? t('rm.start') : dayLbl(r.d)) + '</small></span></div>';
      if (!ub) {
        wrap.tabIndex = 0; wrap.setAttribute('role', 'button'); wrap.setAttribute('aria-label', dayLbl(r.d) + ': ' + L(D.mapNames[r.id]));
        wrap.addEventListener('click', function () { jmGoStop(i); });
        wrap.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jmGoStop(i); } });
      }
      return { i: i, el: $('.jm-pin', wrap), ll: R.ll[i], m: new ml.Marker({ element: wrap, anchor: 'center' }).setLngLat(R.ll[i]).addTo(map) };
    }).filter(Boolean);
    R.stops.forEach(function (r) { if (r.img) { var im = new Image(); im.decoding = 'async'; im.src = imgUrl(r.img); } });
    if (play && jm.visible && !reduce) jmPlay(); else jmShowAll(true);
    jmFlip();
  }
  function jmProgress(g) {
    if (!jm.map) return;
    var col = jmCol(jm.cur), a = rgba(col, 1), a0 = rgba(col, 0), w = 'rgba(255,255,255,.95)', w0 = 'rgba(255,255,255,0)';
    var gg = Math.min(Math.max(g, 0), 1);
    jm.map.setPaintProperty('drawn', 'line-gradient', gg >= 1 ? a : gg <= 0 ? a0 : ['step', ['line-progress'], a, gg, a0]);
    jm.map.setPaintProperty('drawn-case', 'line-gradient', gg >= 1 ? w : gg <= 0 ? w0 : ['step', ['line-progress'], w, gg, w0]);
  }
  function jmPinOn(i, on) { (jm.pins || []).forEach(function (p) { if (p.i === i) p.el.classList.toggle('on', on); }); }
  function jmMark(i) {
    (jm.pins || []).forEach(function (p) { p.el.classList.toggle('act', p.i === i); });
    $$('button', jm.chips).forEach(function (b) { b.classList.toggle('cur', +b.dataset.i === i); });
  }
  function jmCard(i) {
    var R = jm.R, r = R && R.stops[i], c = jm.card;
    if (!r || !r.img) { c.classList.remove('on'); jmMark(-1); return; }
    var img = $('img', c); img.src = imgUrl(r.img);
    $('small', c).textContent = dayLbl(r.d); $('b', c).textContent = L(D.mapNames[r.id]); $('p', c).textContent = dayTitle(R.tr, r.d);
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); jmMark(i);
  }
  function jmHideCard() { jm.card.classList.remove('on'); jmMark(-1); }
  function zOff() { return Math.log2(Math.max(jm.stage.clientWidth, 300) / 1150); }
  function jmCloseZoom() { return 9.9 + 0.45 * zOff(); }
  function jmDriveZoom(km, lat) { var W = jm.stage.clientWidth || 800; return Math.min(Math.max(Math.log2(156543 * Math.cos(lat * Math.PI / 180) * 0.55 * W / (km * 1000)), 5.6), 8.6); }
  function jmHeading(a, b) { var h = Math.atan2(b[0] - a[0], (b[1] - a[1]) / Math.cos(a[1] * Math.PI / 180)) * 180 / Math.PI; if (h > 90) h -= 180; else if (h < -90) h += 180; return Math.max(-35, Math.min(35, h * 0.5)); }
  function jmCam(o, dur, my) {
    return new Promise(function (res) {
      if (my !== jm.tok) return res();
      var done = false, fin = function () { if (!done) { done = true; res(); } };
      jm.map.once('moveend', fin); setTimeout(fin, dur + 500);
      if (o.ease) { delete o.ease; jm.map.easeTo(Object.assign({ duration: dur, essential: true, easing: function (k) { return k; } }, o)); }
      else jm.map.flyTo(Object.assign({ duration: dur, essential: true, curve: 1.3 }, o));
    });
  }
  function jmWait(ms, my) { return new Promise(function (res) { var t0 = Date.now(); (function w() { if (my !== jm.tok || Date.now() - t0 >= ms) return res(); setTimeout(w, 60); })(); }); }
  function jmDrive(i, my) {
    var R = jm.R, s = R.segs[i], map = jm.map;
    return new Promise(function (res) {
      if (my !== jm.tok) return res();
      var dur = Math.min(Math.max(s.km / 260, 1.2), 2) * 1000, c0 = { z: map.getZoom(), p: map.getPitch(), b: map.getBearing() };
      var a = posAt(R, s.g0), b = posAt(R, s.g1), lat = (a[1] + b[1]) / 2, zD = jmDriveZoom(s.km, lat), zA = jmCloseZoom(), hb = jmHeading(a, b), t0 = performance.now();
      if (jm.car) { jm.carEl.classList.add('on'); }
      (function fr(now) {
        if (my !== jm.tok) return res();
        var p = Math.min((now - t0) / dur, 1), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var g = lerp(s.g0, s.g1, e), pos = posAt(R, g);
        jmProgress(g); jm.car.setLngLat(pos);
        var z = p < 0.68 ? lerp(c0.z, zD, smooth(p / 0.32)) : lerp(zD, zA, smooth((p - 0.68) / 0.32));
        var pt = p < 0.68 ? lerp(c0.p, 50, smooth(p / 0.32)) : lerp(50, 60, smooth((p - 0.68) / 0.32));
        var br = c0.b + angd(hb, c0.b) * smooth(p / 0.7);
        map.jumpTo({ center: pos, zoom: z, pitch: pt, bearing: br });
        if (p < 1) requestAnimationFrame(fr); else res();
      })(t0);
    });
  }
  function jmOverview(dur, my) {
    var cam = jm.map.cameraForBounds(jm.R.bounds, { padding: 70, bearing: -6 }) || {};
    return jmCam({ center: cam.center, zoom: (cam.zoom || 6) - 0.25, pitch: 45, bearing: -6 }, dur, my);
  }
  function jmTip(txt, pt) {
    var tip = jm.tip; if (!tip) { tip = jm.tip = document.createElement('div'); tip.className = 'jm-tip'; tip.setAttribute('aria-hidden', 'true'); jm.stage.appendChild(tip); }
    if (!txt || !pt) { tip.classList.remove('on'); return; }
    tip.textContent = txt; tip.style.transform = 'translate(' + Math.round(pt.x + 14) + 'px,' + Math.round(pt.y - 12) + 'px)'; tip.classList.add('on');
  }
  function jmWhole(dur, my) { var cam = jm.map.cameraForBounds(MN_B, { padding: 16, bearing: 0 }) || {}; return jmCam({ center: cam.center, zoom: cam.zoom, pitch: reduce ? 0 : 20, bearing: 0 }, dur, my); }
  function jmStart() { if (jm.played || jm.playing || !jm.R) return; jm.played = true; if (reduce) { jmShowAll(true); return; } jmPlay(); }
  async function jmPlay() {
    if (!jm.map || !jm.R) return;
    var my = ++jm.tok, R = jm.R, map = jm.map;
    jm.playing = true; jm.replay.hidden = true; jm.view.hidden = true; jm.played = true;
    map.stop(); jmHideCard(); jmOthers(false); jmProgress(0); jm.carEl.classList.remove('on'); jm.car.setLngLat(R.ll[0]);
    (jm.pins || []).forEach(function (p) { p.el.classList.remove('on'); });
    $$('button', jm.chips).forEach(function (b) { b.classList.add('dim'); });
    map.jumpTo(Object.assign(map.cameraForBounds(MN_B, { padding: 16, bearing: 0 }) || {}, { pitch: 0, bearing: 0 }));
    await jmWait(250, my); if (my !== jm.tok) return;
    jmPinOn(0, true);
    await jmCam({ center: R.ll[0], zoom: jmCloseZoom() - 1.3, pitch: 52, bearing: -10 }, 1500, my);
    for (var i = 0; i < R.segs.length; i++) {
      await jmDrive(i, my); if (my !== jm.tok) return;
      var to = i + 1, st = R.stops[to];
      if (st.id !== 'ub') jmPinOn(to, true);
      $$('button', jm.chips).forEach(function (b) { if (+b.dataset.i === to) b.classList.remove('dim'); });
      if (st.img) {
        jmCard(to);
        await jmCam({ ease: true, bearing: map.getBearing() + 9, pitch: 62 }, 1300, my); if (my !== jm.tok) return;
        jmHideCard();
      }
    }
    jm.carEl.classList.remove('on');
    await jmWhole(2000, my); if (my !== jm.tok) return;
    jmOthers(true);
    jm.playing = false; jm.atRoute = false; jmCtl();
  }
  function jmStop(showAll) {
    jm.tok++; var was = jm.playing; jm.playing = false;
    if (jm.map) jm.map.stop();
    if (showAll && was) jmShowAll(false);
  }
  function jmShowAll(moveCam) {
    if (!jm.map || !jm.R) return;
    jmProgress(1); if (jm.carEl) jm.carEl.classList.remove('on'); jmHideCard();
    (jm.pins || []).forEach(function (p) { p.el.classList.add('on'); });
    $$('button', jm.chips).forEach(function (b) { b.classList.remove('dim'); });
    if (moveCam) { var cam = jm.map.cameraForBounds(MN_B, { padding: 16, bearing: 0 }) || {}; jm.map.jumpTo({ center: cam.center, zoom: cam.zoom, pitch: 0, bearing: 0 }); jm.atRoute = false; jmOthers(true); jmCtl(); return; }
    jm.atRoute = true; jmCtl();
  }
  function jmCtl() {
    jm.replay.hidden = !!jm.playing; jm.view.hidden = !!jm.playing;
    $('use', jm.view).setAttribute('href', jm.atRoute ? '#i-zout' : '#i-zin'); $('span', jm.view).textContent = t(jm.atRoute ? 'rm.zout' : 'jm.route');
  }
  function jmToggleView() {
    if (!jm.map) return;
    jmStop(true); var my = jm.tok, d = reduce ? 0 : 2000;
    jmHideCard();
    if (jm.atRoute) { jmWhole(d, my).then(function () { if (my === jm.tok) jmOthers(true); }); jm.atRoute = false; }
    else { jmOverview(d, my); jm.atRoute = true; }
    jmCtl();
  }
  function jmGoStop(i) {
    if (jm.fallback || !jm.map || !jm.R) return;
    if (jm.playing) jmStop(true); else jmShowAll(false);
    var my = jm.tok, R = jm.R;
    jmCard(i);
    jmCam({ center: R.ll[i], zoom: jmCloseZoom(), pitch: reduce ? 40 : 60, bearing: jm.map.getBearing() }, reduce ? 0 : 2200, my);
    jm.atRoute = false; jmCtl();
  }
  function jmLang() {
    if (!jm.sec || !jm.stage) return;
    jm.box.setAttribute('aria-label', t('jm.aria')); jmTabs(); jmChips();
    if (jm.fallback) { jmFallback(); return; }
    if (jm.map) {
      (jm.rg || []).forEach(function (o) { o.el.textContent = L(o.l.t); });
      if (jm.R) { var playing = jm.playing; jmSetTour(jm.cur, false); if (!playing) jmCtl(); }
    }
  }
  jmInit();

  /* ---------- short videos: play muted while on screen, one sound at a time ---------- */
  (function () {
    var vids = $$('#reels video'); if (!vids.length) return;
    function load(v) { if (!v.src && v.dataset.src) v.src = v.dataset.src; }
    function play(v) { load(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.intersectionRatio >= 0.6) play(e.target); else e.target.pause(); }); }, { threshold: [0, 0.6] });
      vids.forEach(function (v) { io.observe(v); });
    }
    vids.forEach(function (v) {
      v.addEventListener('click', function () { if (v.paused) play(v); else v.pause(); });
      var b = v.parentNode.querySelector('.reel-snd');
      b.addEventListener('click', function () {
        var on = v.muted;
        vids.forEach(function (o) { o.muted = true; var ob = o.parentNode.querySelector('.reel-snd'); ob.setAttribute('aria-pressed', 'false'); });
        if (on) { v.muted = false; play(v); }
        b.setAttribute('aria-pressed', String(on));
      });
    });
  })();
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
        (d.img ? '<figure class="tday-img"><img src="' + imgUrl(d.img) + '" alt="' + esc(L(d.t)) + '" width="1600" height="720" loading="lazy" decoding="async"></figure>' : '') +
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
    var msg = f.msg.value.trim(), tourM = msg.match(/^Tour: (.+)$/m);
    function sent() { note.textContent = t('p.sent'); f.reset(); fillSelects(); }
    /* backup route: FormSubmit straight to the team's Gmail */
    function viaFormSubmit(stored) {
      return fetch('https://formsubmit.co/ajax/' + D.contact.email, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ _subject: 'Trip request — ' + f.name.value.trim(), _template: 'box', _captcha: 'false', name: f.name.value.trim(), contact: f.contact.value.trim(), request: lines })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && (j.success === 'true' || j.success === true)) sent(); else if (stored) sent(); else fallback();
      }).catch(function () { if (stored) sent(); else fallback(); });
    }
    /* main route: our Supabase function stores the request and emails the team and the traveller (Resend) */
    fetch(D.contact.api, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.contact.apiKey },
      body: JSON.stringify({ name: f.name.value.trim(), contact: f.contact.value.trim(), month: D.months.en[+f.month.value], travellers: f.who.value, style: f.tstyle.value,
        places: order.map(function (id) { return byId[id].name.en; }).join(', '), tour: tourM ? tourM[1] : '', note: msg, lang: lang })
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.ok && j.mailed) sent(); else return viaFormSubmit(!!(j && j.ok));
    }).catch(function () { return viaFormSubmit(false); }).then(function () { btn.disabled = false; label.textContent = old; });
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
    $$('[data-i18n-alt]').forEach(function (el) { el.alt = t(el.getAttribute('data-i18n-alt')); });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    var cc = $('#carCta'); if (cc && !cc._b) { cc._b = 1; cc.addEventListener('click', function () { var ps = $('#p-style'); if (ps) ps.value = t('car.style'); }); }
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === lang); });
    renderTabs(); renderCards(); renderJourneys(); renderTours(); jmLang(); renderGallery(); renderReviews(); renderTiles(); fillSelects(); syncTrip();
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
}

/* ---------- content edited in /admin (Supabase "content" table), with the bundled data as fallback ---------- */
(function () {
  var D = window.SKY, M = window.SKY_MAP, booted = false, CK = 'sky-content-v1';
  function boot() { if (booted) return; booted = true; skyBoot(); }
  function proj(lat, lon) {
    var p = M.proj, A = p[0], B = p[1], C = p[2], K = A * 180 / Math.PI;
    return [A * lon + B, C - K * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
  }
  function apply(rows) {
    (rows || []).forEach(function (r) {
      if (r.key === 'places' && Array.isArray(r.data)) r.data.forEach(function (p) {
        if (!p || !p.id || !isFinite(p.lat) || !isFinite(p.lon)) return;
        M.pins[p.id] = proj(+p.lat, +p.lon); D.mapNames[p.id] = { en: p.en || p.id, mn: p.mn || p.en || p.id };
      });
    });
    (rows || []).forEach(function (r) {
      if (r.key !== 'tours' || !Array.isArray(r.data)) return;
      var ok = r.data.filter(function (t) {
        return t && t.id && !t.hidden && t.name && Array.isArray(t.plan) && Array.isArray(t.route) && t.route.length > 1 &&
          t.route.every(function (s) { return s.id === 'ub' || M.pins[s.id]; });
      });
      if (ok.length) D.tours = ok;
    });
  }
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) {}
  if (cached) { try { apply(cached); } catch (e) {} }
  var c = D.contact || {}, base = (c.api || '').split('/functions/')[0];
  if (!base || !window.fetch || !M.proj) { boot(); return; }
  var timer = setTimeout(boot, cached ? 900 : 2500);
  fetch(base + '/rest/v1/content?select=key,data,updated_at', { headers: { apikey: c.apiKey } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rows) {
      if (!rows) return;
      try { localStorage.setItem(CK, JSON.stringify(rows)); } catch (e) {}
      if (!booted) { try { apply(rows); } catch (e) {} }
    })
    .catch(function () {})
    .then(function () { clearTimeout(timer); boot(); });
})();
