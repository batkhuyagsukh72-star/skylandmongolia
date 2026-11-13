/* Azure Skyland Mongolia — interactions & motion */
function skyBoot() {
  'use strict';
  var imgUrl = function (x) { return /^https?:\/\//.test(x) ? x : 'img/' + x + '.webp'; };
  var D = window.SKY, M = window.SKY_MAP;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = root.classList.contains('rm');
  /* light / dark: remember the visitor's choice */
  (function () {
    var btn = document.getElementById('themeBtn'); if (!btn) return;
    btn.addEventListener('click', function () {
      var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', t);
      var m = document.getElementById('themeColor'); if (m) m.content = t === 'dark' ? '#0F141D' : '#ECE3DA';
      try { localStorage.setItem('sky-theme', t); } catch (e) {}
      document.dispatchEvent(new CustomEvent('sky-theme', { detail: t }));
    });
  })();
  /* touch phones and tablets: lighter motion and rendering so the phone stays cool */
  var lite = !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
  document.documentElement.classList.toggle('lite', lite);
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
  /* eight languages; content typed in /admin has English and Mongolian, the others come from the translation table (i18n.js) and fall back to English */
  var LANGS = D.langs || [{ id: 'en', short: 'EN', name: 'English' }, { id: 'mn', short: 'МН', name: 'Монгол' }];
  function okLang(x) { return LANGS.some(function (l) { return l.id === x; }); }
  var lang = D.pickLang ? D.pickLang() : (store.get('sky-lang') || 'en');
  if (!okLang(lang) || (lang !== 'en' && lang !== 'mn' && !(D.tx && D.tx[lang]))) lang = 'en';
  function t(k) { return (D.t[lang] && D.t[lang][k]) || D.t.en[k] || k; }
  function tx(x) { var d = D.tx && D.tx[lang]; return (d && typeof x === 'string' && d[x.trim()]) || x; }
  function L(o) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    var v = o[lang]; if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) return v;
    var e = o.en; if (e == null || e === '') return o.mn || '';
    if (lang === 'en' || lang === 'mn') return e;
    return Array.isArray(e) ? e.map(tx) : tx(e);
  }

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
    var months = (D.months[lang] || D.months.en).map(function (m, i) { return '<option value="' + i + '">' + m + '</option>'; }).join('');
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
    s += '<g class="m-ub"><rect x="' + (M.ub[0] - 8) + '" y="' + (M.ub[1] - 8) + '" width="16" height="16" transform="rotate(45 ' + M.ub[0] + ' ' + M.ub[1] + ')"/><text x="' + (M.ub[0] + 18) + '" y="' + (M.ub[1] - 14) + '">' + esc(L(D.mapNames.ub || { en: 'Ulaanbaatar', mn: 'Улаанбаатар' })) + '</text></g>';
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
  function routeMap(tr, opts) {
    if (!tr || !tr.route) return '';
    opts = opts || {};
    var n = 0;
    return '<figure class="rmap' + (opts.others ? ' rmap-all' : '') + '" data-tour="' + tr.id + '"' + (opts.others ? ' data-others="1" style="--rc:' + jmCol(tr.id) + '"' : '') + '><figcaption class="rmap-h">' + esc(t('rm.title')) + '</figcaption>' +
      '<div class="rmap-stage"><svg class="rmap-svg" role="img" aria-label="' + esc(t('rm.title') + ': ' + tr.route.filter(function (r) { return r.d; }).map(function (r) { return L(D.mapNames[r.id] || { en: r.id }); }).join(', ')) + '"></svg>' +
      '<div class="rmap-card" aria-hidden="true"><img alt="" width="400" height="300"><p><small></small><b></b></p></div>' +
      '<div class="rmap-scale" aria-hidden="true"><i></i><span></span></div>' +
      '<div class="rmap-ctl"><button class="rmap-zoom" type="button" hidden><svg><use href="#i-zin"/></svg><span></span></button>' +
      '<button class="rmap-replay" type="button" hidden><svg><use href="#i-play"/></svg>' + esc(t('rm.replay')) + '</button></div></div>' +
      '<ol class="rmap-stops">' + tr.route.map(function (r, i) {
        if (r.id === 'ub') return '';
        n++;
        return '<li><button type="button" data-i="' + i + '" aria-pressed="false"><b>' + n + '</b><span class="st"><span>' + esc(L(D.mapNames[r.id] || { en: r.id })) + '</span><small>' + esc(dayLbl(r.d)) + '</small></span></button></li>';
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
  function dayLbl(d) { return d ? t(/[–-]/.test(d) ? 'rm.days' : 'rm.day') + ' ' + d : ''; }
  function f1(v) { return Math.round(v * 10) / 10; }
  function f3(v) { return Math.round(v * 1000) / 1000; }
  var LBL_OFF = { r: [15, -2, 'start'], l: [-15, -2, 'end'], t: [0, -30, 'middle'], b: [0, 27, 'middle'] };
  /* every tour that can be drawn, and one colour per tour (same colour on the tabs and on the map) */
  function jmTours() { return D.tours.filter(function (x) { return x.route && x.route.length > 1 && x.route.every(function (r) { return r.id === 'ub' || M.pins[r.id]; }); }); }
  var JM_PAL = ['#2C6CA6', '#D9822B', '#2E8B57', '#C0392B', '#7B4FA3', '#B8860B', '#1F8A9E', '#D35D8F', '#5D6D2F', '#8C5A3C'];
  function jmCol(id) { var i = 0; jmTours().forEach(function (x, k) { if (x.id === id) i = k; }); return JM_PAL[i % JM_PAL.length]; }
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
    var cid = 'rmc-' + tr.id + (fig.dataset.others ? '-a' : ''), rl = M.relief, cx = M.ctx;
    var h = '<defs><clipPath id="' + cid + '"><path d="' + M.border + '"/></clipPath></defs>' +
      '<rect class="rm-sea" x="-3000" y="-3000" width="7000" height="7000"/>' +
      '<image href="img/map/mn-ctx.webp" x="' + cx[0] + '" y="' + cx[1] + '" width="' + cx[2] + '" height="' + cx[3] + '" preserveAspectRatio="none"/>' +
      '<g clip-path="url(#' + cid + ')"><image href="img/map/mn-relief.webp" x="' + rl[0] + '" y="' + rl[1] + '" width="' + rl[2] + '" height="' + rl[3] + '" preserveAspectRatio="none"/>' +
      '<path class="rm-riv" d="' + M.rivers + '"/><path class="rm-lake" d="' + M.lakes + '"/><path class="rm-aimag" d="' + M.aimag + '"/></g>' +
      '<path class="rm-border" d="' + M.border + '"/><g class="rm-rgs" aria-hidden="true">' + (D.mapLabels || []).map(function (l) {
        var p = pj(l.ll[0], l.ll[1]);
        return '<g class="rm-rg rm-' + l.c + '" data-x="' + f1(p[0]) + '" data-y="' + f1(p[1]) + '" data-r="' + (l.r || 0) + '"><text text-anchor="' + (l.a || 'middle') + '" dy=".35em">' + esc(L(l.t)) + '</text></g>';
      }).join('') + '</g>';
    /* the other tours, each in its own colour, shown when the whole country is in view */
    if (fig.dataset.others) {
      h += '<g class="rm-oths">' + jmTours().filter(function (o) { return o.id !== tr.id; }).map(function (o) {
        var op = o.route.map(function (r) { return r.id === 'ub' ? M.ub : M.pins[r.id]; });
        return '<path class="rm-oth" data-tour="' + o.id + '" d="' + cr(op).join('') + '" style="stroke:' + jmCol(o.id) + '"><title>' + esc(L(o.name)) + '</title></path>';
      }).join('') + '</g>';
    }
    var segs = cr(pts);
    h += '<path class="rm-track" d="' + segs.join('') + '"/>';
    segs.forEach(function (d) { h += '<path class="rm-seg" d="' + d + '"/>'; });
    h += '<g class="rm-car"><circle r="6"/></g>';
    var n = 0;
    stops.forEach(function (r, i) {
      if (r.id === 'ub' && i > 0) return;
      var name = L(D.mapNames[r.id] || { en: r.id });
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
    var segEls = $$('.rm-seg', svg), track = $('.rm-track', svg), car = $('.rm-car', svg), pins = $$('.rm-pin', svg), rgs = $$('.rm-rg', svg), oths = $$('.rm-oth', svg);
    var carPt = M.ub, curCard = -1, sel = -1, flying = false, pinByIdx = {};
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
      oths.forEach(function (el) { el.style.strokeWidth = f3(2.6 * k); });
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
      chips.forEach(function (b) { var on = +b.dataset.i === i; b.classList.toggle('cur', on); b.setAttribute('aria-pressed', String(on && sel === i)); });
    }
    /* the card works with or without a photo, so every stop answers a tap */
    function showCard(i) {
      var r = stops[i]; if (!r || r.id === 'ub') { hideCard(); return; }
      var im = $('img', card);
      if (r.img) { im.hidden = false; im.src = imgUrl(r.img); card.classList.remove('noimg'); } else { im.hidden = true; im.removeAttribute('src'); card.classList.add('noimg'); }
      $('small', card).textContent = dayLbl(r.d); $('b', card).textContent = L(D.mapNames[r.id] || { en: r.id });
      curCard = i; posCard(i); card.classList.add('on'); mark(i);
    }
    function hideCard() { curCard = -1; card.classList.remove('on'); mark(sel); }
    var lr = layout(route, false), le = mob ? lr : layout(full, true);
    function startState() {
      cam.x = full.x; cam.y = full.y; cam.s = full.s; carPt = M.ub; sel = -1;
      applyLayout(lr); svg.classList.remove('lbl-off'); svg.classList.remove('oth-on');
      segEls.forEach(function (el) { el.style.strokeDashoffset = el.dataset.len; });
      pins.forEach(function (g) { g.classList.remove('on'); }); car.style.opacity = 0; hideCard();
      chips.forEach(function (b) { b.classList.add('dim'); }); replay.hidden = true; zb.hidden = true;
      applyCam();
    }
    var atEnd = true;
    function setZoomBtn() {
      zb.hidden = false;
      if (sel >= 0) { $('use', zb).setAttribute('href', '#i-zout'); $('span', zb).textContent = t('jm.route'); return; }
      var zin = (atEnd ? end : (end === full ? route : full)) === full;
      $('use', zb).setAttribute('href', zin ? '#i-zin' : '#i-zout'); $('span', zb).textContent = t(zin ? 'rm.zin' : 'rm.zout');
    }
    function finalState() {
      cam.x = end.x; cam.y = end.y; cam.s = end.s; atEnd = true; sel = -1; flying = false; setZoomBtn();
      applyLayout(le); svg.classList.remove('lbl-off'); svg.classList.add('oth-on');
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
    /* camera moves after the first drawing: a stop, the route, or the whole country */
    function flyTo(to, after) {
      if (fig._tl) { fig._tl.kill(); fig._tl = null; }
      var done = function () { applyLayout(layout(cam, true)); svg.classList.remove('lbl-off'); flying = false; if (after) after(); };
      if (!window.gsap || reduce) { cam.x = to.x; cam.y = to.y; cam.s = to.s; applyCam(); done(); return; }
      flying = true; svg.classList.add('lbl-off');
      var zt = gsap.timeline({ onComplete: done });
      fig._tl = zt; fly(zt, to, 0.95, 0);
    }
    function stopView(i) { var p = pts[i]; return { x: p[0], y: p[1], s: Math.min(Math.max(route.s * 1.6, sFull * 2.3), sFull * 5) }; }
    function idle() { return fig.dataset.playing !== '1'; }
    function finishIntro() { if (!idle()) { if (fig._tl) { fig._tl.kill(); fig._tl = null; } finalState(); } }
    function selectStop(i) {
      finishIntro();
      if (sel === i) { sel = -1; hideCard(); atEnd = true; setZoomBtn(); flyTo(end); return; }
      sel = i; mark(i); setZoomBtn(); card.classList.remove('on');
      flyTo(stopView(i), function () { if (sel === i) showCard(i); });
    }
    var hoverOK = finePtr.matches;
    function preview(i) { if (hoverOK && idle() && !flying && sel < 0) showCard(i); }
    function unpreview() { if (hoverOK && idle() && !flying && sel < 0) hideCard(); }
    pins.forEach(function (g) {
      var i = +g.dataset.i; if (!i) return;
      g.addEventListener('mouseenter', function () { preview(i); });
      g.addEventListener('mouseleave', unpreview);
      g.addEventListener('click', function () { selectStop(i); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectStop(i); } });
    });
    chips.forEach(function (b) {
      var i = +b.dataset.i;
      b.onmouseenter = function () { preview(i); };
      b.onmouseleave = unpreview;
      b.onclick = function () { selectStop(i); };
    });
    oths.forEach(function (el) { el.addEventListener('click', function () { fig.dispatchEvent(new CustomEvent('rm-tour', { detail: el.dataset.tour, bubbles: true })); }); });
    zb.onclick = function () {
      finishIntro();
      if (sel >= 0) { selectStop(sel); return; }
      var cur = atEnd ? end : (end === full ? route : full), to = cur === full ? route : full;
      atEnd = to === end; setZoomBtn(); flyTo(to);
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
      tl.add(function () { applyLayout(le); svg.classList.remove('lbl-off'); svg.classList.add('oth-on'); });
      tl.to({}, { duration: 0.4 });
    }
  }
  var rmObs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting && !e.target.dataset.played) { e.target.dataset.played = '1'; drawRouteMap(e.target, 'play'); } });
  }, { threshold: 0.45 }) : null;
  function initRouteMap(fig, playNow) {
    if (!fig) return;
    if (playNow && !reduce) { fig.dataset.played = '1'; drawRouteMap(fig, 'play'); }
    else {
      var wait = rmObs && !reduce;
      drawRouteMap(fig, wait ? 'wait' : 'final');
      if (wait) rmObs.observe(fig);
    }
    $('.rmap-replay', fig).addEventListener('click', function () { drawRouteMap(fig, 'play'); });
  }
  var rmW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - rmW) < 40) return; rmW = window.innerWidth;
    $$('.rmap').forEach(function (fig) { fig.dataset.playing = '0'; drawRouteMap(fig, rmObs && !reduce && !fig.dataset.played ? 'wait' : 'final'); });
  });
  /* ---------- route map under the hero: one tab per tour; the other tours appear in their colours when the whole country is in view ---------- */
  var jm = { sec: $('#journey-map') };
  function jmShort(tr) {
    var en = String(tr.name.en || '').replace(/^\d+-Day\s*/, '').trim();
    if (lang === 'en') return en || L(tr.name);
    if (lang === 'mn') return L(tr.name).replace(/\s*\d+\s*хоногийн\s*/i, ' ').replace(/,?\s*\d+\s*хоног\s*$/i, '').trim();
    var t2 = tx(en); return t2 !== en ? t2 : L(tr.name);
  }
  function jmTabs() {
    jm.tabs.innerHTML = jmTours().map(function (tr) {
      return '<button class="jm-tab" type="button" role="tab" data-tour="' + tr.id + '" aria-selected="' + (tr.id === jm.cur) + '" style="--tc:' + jmCol(tr.id) + '"><i class="jm-dot" aria-hidden="true"></i><b>' + tr.days + '</b><small>' + esc(t('tr.days')) + '</small>' + esc(jmShort(tr)) + '</button>';
    }).join('');
  }
  function jmRender(play) {
    var tr = D.tours.filter(function (x) { return x.id === jm.cur; })[0];
    jm.box.innerHTML = routeMap(tr, { others: true });
    initRouteMap($('.rmap', jm.box), play);
  }
  function jmSetTour(id) {
    if (!id || id === jm.cur) return;
    jm.cur = id; $$('.jm-tab', jm.tabs).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tour === id); });
    jmRender(true);
  }
  function jmInit() {
    if (!jm.sec) return;
    jm.tabs = $('.jm-tabs', jm.sec); jm.box = $('.jm-box', jm.sec);
    var ts = jmTours(); if (!ts.length) { jm.sec.hidden = true; return; }
    jm.cur = ts[0].id;
    jm.tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-tour]'); if (b) jmSetTour(b.dataset.tour); });
    jm.box.addEventListener('rm-tour', function (e) { jmSetTour(e.detail); });
  }
  function jmLang() { if (!jm.box) return; jmTabs(); jmRender(false); }
  jmInit();

  /* ---------- full-screen viewer: photos, videos and reviews ---------- */
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|embed\/|live\/|watch\?(?:[^#]*&)?v=))([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(String(u || '')) ? u : ''); }
  function mediaUrl(x) { return !x ? '' : (/^(https?:)?\/\//.test(x) || /^(video|img)\//.test(x)) ? x : imgUrl(x); }
  var lbx = $('#lbx'), lbxItems = [], lbxAt = 0, lbxFocus = null;
  function lockPage(on) { document.body.style.overflow = on ? 'hidden' : ''; if (lenis) { if (on) lenis.stop(); else lenis.start(); } }
  function lbxShow(i) {
    var n = lbxItems.length; if (!n) return;
    lbxAt = (i + n) % n;
    var it = lbxItems[lbxAt], box = $('#lbxMedia'), yt = it.yt ? ytId(it.yt) : ytId(it.video);
    $$('video', box).forEach(function (v) { try { v.pause(); } catch (e) {} });
    if (yt) box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + yt + '?autoplay=1&rel=0&playsinline=1" title="' + esc(it.title || 'YouTube') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    else if (it.video) box.innerHTML = '<video src="' + esc(it.video) + '"' + (it.poster ? ' poster="' + esc(it.poster) + '"' : '') + ' controls autoplay playsinline></video>';
    else box.innerHTML = '<img src="' + esc(it.img) + '" alt="' + esc(it.alt || it.title || it.cap || '') + '">';
    box.className = 'lbx-media' + (yt ? ' is-yt' : it.video ? ' is-vid' : '');
    var cap = [it.cap, n > 1 ? (lbxAt + 1) + ' / ' + n : ''].filter(Boolean).join('  ·  ');
    $('#lbxCap').textContent = cap;
    var side = $('#lbxSide'), r = it.rev, h = '';
    if (r) h = '<div class="lbx-rh">' + (r.avatar ? '<img class="lbx-av" src="' + esc(r.avatar) + '" alt="">' : '') + '<p class="lbx-who">' + esc(r.who) + (r.tour ? '<small>' + esc(r.tour) + '</small>' : '') + '</p></div>' + stars(r.r) + (r.q ? '<blockquote>“' + esc(r.q) + '”</blockquote>' : '');
    else if (it.title || it.text) h = (it.title ? '<h3>' + esc(it.title) + '</h3>' : '') + (it.text ? String(it.text).split(/\n+/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') : '');
    side.innerHTML = h; side.hidden = !h; side.scrollTop = 0; lbx.classList.toggle('has-side', !!h);
    $('#lbxPrev').hidden = $('#lbxNext').hidden = n < 2;
    var nx = lbxItems[(lbxAt + 1) % n]; if (nx && nx.img && n > 1) { var pre = new Image(); pre.src = nx.img; }
  }
  function openLbx(items, i) {
    if (!items || !items.length) return;
    $$('#reels video').forEach(function (v) { v.pause(); });
    lbxItems = items; lbxFocus = document.activeElement; lbx.hidden = false; lbxShow(i || 0); lockPage(true);
    $('#lbxClose').focus({ preventScroll: true });
  }
  function closeLbx() { $('#lbxMedia').innerHTML = ''; lbx.hidden = true; lockPage(false); if (lbxFocus && lbxFocus.focus) lbxFocus.focus({ preventScroll: true }); }
  $('#lbxClose').addEventListener('click', closeLbx);
  $('#lbxPrev').addEventListener('click', function () { lbxShow(lbxAt - 1); });
  $('#lbxNext').addEventListener('click', function () { lbxShow(lbxAt + 1); });
  lbx.addEventListener('click', function (e) { if (e.target === lbx || e.target.classList.contains('lbx-in') || e.target.classList.contains('lbx-fig')) closeLbx(); });
  document.addEventListener('keydown', function (e) {
    if (lbx.hidden) return;
    if (e.key === 'Escape') closeLbx(); else if (e.key === 'ArrowLeft') lbxShow(lbxAt - 1); else if (e.key === 'ArrowRight') lbxShow(lbxAt + 1);
    else if (e.key === 'Tab') { var f = [$('#lbxClose'), $('#lbxPrev'), $('#lbxNext')].concat($$('#lbxMedia video, #lbxMedia iframe')).filter(function (x) { return x && !x.hidden; }), k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? f.length - 1 : 1) + f.length) % f.length].focus(); }
  });
  (function () {
    var sx = null, sy = 0, fig = $('.lbx-fig', lbx);
    fig.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    fig.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) lbxShow(lbxAt + (dx < 0 ? 1 : -1)); sx = null; });
  })();

  /* ---------- hero slideshow: a new photo every 3 seconds, paused when the hero is off screen ---------- */
  var heroS = { items: [], at: 0, timer: 0, on: true };
  function renderHero() {
    var hero = $('.hero'), stage = $('.hero-stage'), first = $('.hero-bg', stage), title = $('.hero-title', stage), dots = $('#heroDots');
    var sl = (D.hero || []).filter(function (h) { return h && h.img; });
    if (!heroS.items.length) {
      heroS.items = sl.map(function (h, i) {
        if (i === 0 && h.img === 'hero') return first;
        var im = document.createElement('img'); im.className = 'hero-bg hero-sl'; im.decoding = 'async'; im.dataset.src = imgUrl(h.img);
        if (i === 0) { im.src = im.dataset.src; im.classList.add('on'); }
        stage.insertBefore(im, title); return im;
      });
      hero.classList.toggle('no-orig', !(sl[0] && sl[0].img === 'hero'));
      hero.classList.toggle('alt', !(sl[0] && sl[0].img === 'hero'));
      if (sl.length > 1) heroLoop();
    }
    heroS.items.forEach(function (im, i) { if (sl[i] && (im !== first || sl[0].img === 'hero')) im.alt = L(sl[i]); });
    dots.hidden = sl.length < 2;
    dots.innerHTML = sl.length < 2 ? '' : sl.map(function (h, i) { return '<button type="button" data-hs="' + i + '" aria-label="' + esc(L(h) || (i + 1)) + '" aria-pressed="' + (i === heroS.at) + '"></button>'; }).join('');
  }
  function heroLoad(i) {
    var im = heroS.items[i]; if (!im) return Promise.resolve();
    if (!im.getAttribute('src') && im.dataset.src) im.src = im.dataset.src;
    if (im.complete && im.naturalWidth) return Promise.resolve();
    return new Promise(function (res) { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); setTimeout(res, 4000); });
  }
  function heroGo(i) {
    var n = heroS.items.length; if (n < 2) return;
    i = (i + n) % n;
    heroLoad(i).then(function () {
      heroS.at = i;
      var sl = D.hero.filter(function (h) { return h && h.img; }), orig = sl[i] && sl[i].img === 'hero';
      heroS.items.forEach(function (im, k) { if (im.classList.contains('hero-sl')) im.classList.toggle('on', k === i); });
      $('.hero').classList.toggle('alt', !orig);
      $$('#heroDots button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.hs === i)); });
      heroLoad((i + 1) % n);
    });
  }
  function heroLoop() {
    clearInterval(heroS.timer);
    heroS.timer = setInterval(function () { if (heroS.on && !document.hidden) heroGo(heroS.at + 1); }, reduce ? 6000 : 3000);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { heroS.on = es[0].isIntersecting; }).observe($('.hero'));
    setTimeout(function () { heroLoad(1); }, 2500);
  }
  $('#heroDots').addEventListener('click', function (e) { var b = e.target.closest('[data-hs]'); if (b) { heroGo(+b.dataset.hs); heroLoop(); } });

  /* ---------- section photos chosen in /admin ---------- */
  function applySiteImages() {
    var im = (D.site && D.site.img) || {};
    $$('[data-img]').forEach(function (el) {
      var v = im[el.dataset.img]; if (!v) return;
      var u = imgUrl(v); if (el.getAttribute('src') === u) return;
      el.removeAttribute('srcset'); el.removeAttribute('sizes'); el.src = u;
    });
    var cp = $('#carPrice'); if (cp && D.site && D.site.carPrice) cp.textContent = D.site.carPrice;
  }
  applySiteImages();

  /* ---------- short films: play muted while on screen, one sound at a time, tap to watch full screen ---------- */
  var reelIO = null;
  function reelList() {
    return ((D.site && D.site.reels) || []).filter(function (r) { return r && !r.hidden && (r.video || r.yt); }).map(function (r) {
      var yt = r.yt ? ytId(r.yt) : '';
      return { video: yt ? '' : mediaUrl(r.video), yt: yt, poster: r.poster ? mediaUrl(r.poster) : (yt ? 'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg' : ''), title: L(r), text: r.d ? L(r.d) : '' };
    });
  }
  var SND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path class="snd-on" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="snd-off" d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  function renderReels() {
    var box = $('#reels'), items = reelList();
    box.hidden = !items.length;
    box.innerHTML = items.map(function (r, i) {
      return '<figure class="reel">' + (r.video ? '<video muted loop playsinline preload="' + (r.poster ? 'none' : 'metadata') + '"' + (r.poster ? ' poster="' + esc(r.poster) + '"' : '') + ' data-src="' + esc(r.video) + '" aria-label="' + esc(r.title) + '"></video>' : '<img src="' + esc(r.poster) + '" alt="" loading="lazy" decoding="async">') +
        '<button class="reel-open" type="button" data-ri="' + i + '" aria-label="' + esc(t('lb.open') + (r.title ? ': ' + r.title : '')) + '"><span class="reel-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span></button>' +
        (r.title ? '<figcaption class="reel-cap">' + esc(r.title) + '</figcaption>' : '') +
        (r.video ? '<button class="reel-snd" type="button" aria-pressed="false" aria-label="' + esc(t('gl.sound')) + '">' + SND + '</button>' : '') + '</figure>';
    }).join('');
    initReels();
  }
  function initReels() {
    var vids = $$('#reels video'); if (reelIO) { reelIO.disconnect(); reelIO = null; }
    function load(v) { if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src; }
    function play(v) { load(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    if ('IntersectionObserver' in window && !reduce && vids.length) {
      var vis = new Map();
      reelIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) { vis.set(e.target, e.intersectionRatio); });
        if (!lbx.hidden) return;
        /* desktop: every reel that is fully in view may play; phones: only the single most visible one */
        var best = null, bestR = 0.6;
        vids.forEach(function (v) { var r = vis.get(v) || 0; if (r >= bestR) { best = v; bestR = r; } });
        vids.forEach(function (v) { var r = vis.get(v) || 0; if (lite ? v === best : r >= 0.6) play(v); else v.pause(); });
      }, { threshold: [0, 0.6, 0.8, 1] });
      vids.forEach(function (v) { reelIO.observe(v); });
    }
    $$('#reels .reel-snd').forEach(function (b) {
      var v = $('video', b.parentNode);
      b.addEventListener('click', function () {
        var on = v.muted;
        vids.forEach(function (o) { o.muted = true; var ob = $('.reel-snd', o.parentNode); if (ob) ob.setAttribute('aria-pressed', 'false'); });
        if (on) { v.muted = false; play(v); }
        b.setAttribute('aria-pressed', String(on));
      });
    });
  }
  $('#reels').addEventListener('click', function (e) { var b = e.target.closest('[data-ri]'); if (b) openLbx(reelList(), +b.dataset.ri); });

  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function tourInfo(tr) {
    var h = '<div class="tour-info">';
    if (tr.price) {
      h += '<div class="ti-price"><h3>' + esc(t('tr.price')) + '</h3><details class="pbox"><summary><span>' + esc(t('tr.showp')) + '</span><svg aria-hidden="true"><use href="#i-plus"/></svg></summary><table class="ptable"><tbody>' + tr.price.map(function (r) {
        return '<tr><th scope="row">' + (r[0] === 1 ? esc(t('tr.solo')) : esc(t('tr.group')) + ' ' + r[0]) + '</th><td><b>' + money(r[1] * tr.days) + '</b><small>' + esc(t('tr.total')) + '</small></td><td class="pd">' + money(r[1]) + ' ' + esc(t('tr.perday')) + '</td></tr>';
      }).join('') + '</tbody></table><p class="ti-dep">' + esc(t('tr.deposit')) + '</p></details></div>';
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
  function tvList(tr) {
    return (tr.videos || []).filter(function (x) { return x && (x.video || x.yt); }).map(function (x) {
      var yt = x.yt ? ytId(x.yt) : '';
      return { video: yt ? '' : mediaUrl(x.video), yt: yt, poster: x.poster ? mediaUrl(x.poster) : (yt ? 'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg' : ''), title: L(x.t || {}), text: L(x.d || {}) };
    });
  }
  function tourVids(tr) {
    var v = tvList(tr); if (!v.length) return '';
    return '<section class="tvids" aria-label="' + esc(t('tv.title')) + '"><h3 class="tvids-h">' + esc(t('tv.title')) + '</h3><div class="tv-strip">' + v.map(function (x, i) {
      return '<button type="button" class="tv" data-tv="' + i + '" aria-label="' + esc(t('gl.play') + (x.title ? ': ' + x.title : '')) + '">' +
        (x.poster ? '<img src="' + esc(x.poster) + '" alt="" loading="lazy" decoding="async">' : '<video src="' + esc(x.video) + '#t=0.5" muted playsinline preload="metadata" tabindex="-1"></video>') +
        '<span class="tv-play" aria-hidden="true"><svg><use href="#i-play"/></svg></span>' + (x.title ? '<span class="tv-t">' + esc(x.title) + '</span>' : '') + '</button>';
    }).join('') + '</div></section>';
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
    $('#tourPanel').innerHTML = '<p class="tour-lead">' + esc(L(tr.lead)) + '</p>' + routeMap(tr) + '<ol class="tour-days">' + tr.plan.map(function (d, i) {
      return '<li class="tday"><span class="tday-n"><small>' + esc(t('tr.day')) + '</small><b>' + (i + 1) + '</b></span><div class="tday-b"><h3>' + esc(L(d.t)) + '</h3><p>' + esc(L(d.d)) + '</p>' +
        (d.img ? '<figure class="tday-img"><img src="' + imgUrl(d.img) + '" alt="' + esc(L(d.t)) + '" width="1600" height="720" loading="lazy" decoding="async"></figure>' : '') +
        ((d.s || d.m) ? '<p class="tday-s"><svg><use href="#i-toono"/></svg><span>' + (d.s ? esc(t('tr.stay')) + ': ' + esc(L(d.s)) : '') + (d.s && d.m ? ' · ' : '') + (d.m ? esc(t('tr.meals')) + ': ' + d.m.split(' ').map(function (k) { return esc(t('tr.' + k)); }).join(', ') : '') + '</span></p>' : '') + '</div></li>';
    }).join('') + '</ol>' + tourInfo(tr) + tourVids(tr) + '<div class="tour-actions"><button class="btn btn-ink tour-book" type="button" data-book="' + tr.id + '">' + esc(t('tr.book')) + ' <svg><use href="#i-arrow"/></svg></button>' +
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
    /* keep people oriented: if the new tour's map is out of view, bring the top of the panel (lead + map) into view */
    var pr = $('#tourPanel').getBoundingClientRect(), hh = ($('#hdr') || { offsetHeight: 70 }).offsetHeight || 70;
    if (pr.top < hh - 4 || pr.top > innerHeight * 0.6) {
      var y = pr.top + scrollY - hh - 16;
      if (lenis) lenis.scrollTo(y, { duration: reduce ? 0 : 0.9 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  });
  $('#tourTabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); var i = D.tours.findIndex(function (x) { return x.id === tourSel; });
    i = (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + D.tours.length) % D.tours.length;
    tourSel = D.tours[i].id; renderTours(); $('#tt-' + tourSel).focus();
  });
  $('#tourPanel').addEventListener('click', function (e) {
    var tv = e.target.closest('[data-tv]'); if (tv) { openLbx(tvList(D.tours.filter(function (x) { return x.id === tourSel; })[0]), +tv.dataset.tv); return; }
    var b = e.target.closest('[data-book]'); if (!b) return;
    var tr = D.tours.filter(function (x) { return x.id === b.dataset.book; })[0], f = $('#pform');
    f.msg.value = 'Tour: ' + tr.name.en + (f.msg.value && f.msg.value.indexOf('Tour: ') !== 0 ? '\n' + f.msg.value : '');
    toast(L(tr.name) + ' · ' + t('toast.tour'));
    setTimeout(function () { goTo('#plan'); setTimeout(function () { f.name.focus({ preventScroll: true }); }, 900); }, 300);
  });

  /* ---------- gallery: tap a photo to see it full screen ---------- */
  var glOpen = false, GL_FIRST = 11;
  function glItems() { return D.gallery.map(function (g) { return { img: imgUrl(g.img), cap: L(g) }; }); }
  function renderGallery() {
    $('#glGrid').innerHTML = D.gallery.map(function (g, i) {
      return '<figure class="gl' + (g.w ? ' gl-w' : '') + (g.tall ? ' gl-t' : '') + '"' + (!glOpen && i >= GL_FIRST ? ' hidden' : '') + '><button class="gl-open" type="button" data-gi="' + i + '" aria-label="' + esc(t('lb.open') + (L(g) ? ': ' + L(g) : '')) + '"><img src="' + imgUrl(g.img) + '" alt="' + esc(L(g)) + '" loading="lazy" decoding="async"></button><figcaption>' + esc(L(g)) + '</figcaption></figure>';
    }).join('');
    var b = $('#glMore'); b.hidden = D.gallery.length <= GL_FIRST; b.textContent = (glOpen ? t('gl.less') : t('gl.more') + ' (' + D.gallery.length + ')'); b.setAttribute('aria-expanded', glOpen);
  }
  $('#glGrid').addEventListener('click', function (e) { var b = e.target.closest('[data-gi]'); if (b) openLbx(glItems(), +b.dataset.gi); });
  $('#glMore').addEventListener('click', function () {
    glOpen = !glOpen; renderGallery();
    if (!glOpen) goTo('#gallery');
    if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 100);
  });

  /* ---------- reviews: traveller photos with the rating on them; the review opens with the photos ---------- */
  function stars(r) { var h = ''; for (var i = 1; i <= 5; i++) h += '<i class="' + (r >= i ? 'on' : r >= i - .5 ? 'half' : '') + '"></i>'; return '<span class="stars" role="img" aria-label="' + r + ' / 5">' + h + '</span>'; }
  var wallLb = [];
  function renderReviews() {
    var tiles = [], lb = [];
    (D.reviews || []).forEach(function (v) {
      var ph = (v.photos || []).filter(Boolean); if (!ph.length) return;
      tiles.push({ i: lb.length, v: v, img: ph[0], n: ph.length });
      ph.forEach(function (p) { lb.push({ img: mediaUrl(p), rev: { r: v.r, q: v.q, who: v.who, tour: v.tour, avatar: v.avatar ? mediaUrl(v.avatar) : '' }, alt: v.who }); });
    });
    (D.travellers || []).forEach(function (g) { tiles.push({ i: lb.length, img: imgUrl(g.img), cap: L(g), n: 1 }); lb.push({ img: imgUrl(g.img), cap: L(g) }); });
    wallLb = lb;
    $('#rvWall').innerHTML = tiles.map(function (x) {
      var v = x.v;
      return '<button type="button" class="rvw' + (v ? ' has-rev' : '') + '" data-wi="' + x.i + '" aria-label="' + esc(t('lb.open') + ': ' + (v ? v.who : x.cap)) + '">' +
        '<img src="' + esc(mediaUrl(x.img)) + '" alt="" loading="lazy" decoding="async">' +
        (v ? '<span class="rvw-rate">' + stars(v.r) + '</span>' : '') + (x.n > 1 ? '<span class="rvw-n">+' + (x.n - 1) + '</span>' : '') +
        '<span class="rvw-meta">' + (v ? '<span class="rvw-who">' + (v.avatar ? '<img class="rvw-av" src="' + esc(mediaUrl(v.avatar)) + '" alt="">' : '') + '<b>' + esc(v.who) + '</b></span>' + (v.q ? '<q>' + esc(v.q) + '</q>' : '') : '<b class="rvw-cap">' + esc(x.cap) + '</b>') + '</span></button>';
    }).join('');
    $('#rvList').innerHTML = (D.reviews || []).filter(function (v) { return !(v.photos || []).filter(Boolean).length; }).map(function (v) {
      return '<figure class="rv">' + stars(v.r) + '<blockquote>“' + esc(v.q) + '”</blockquote><figcaption>' + (v.avatar ? '<img class="rv-av" src="' + esc(mediaUrl(v.avatar)) + '" alt="">' : '') + '<span>' + esc(v.who) + (v.tour ? '<small>' + esc(v.tour) + '</small>' : '') + '</span></figcaption></figure>';
    }).join('');
    var sel = $('#rvForm select[name=tour]');
    if (sel) { var keep = sel.value; sel.innerHTML = '<option value="">' + esc(t('rvf.tour0')) + '</option>' + D.tours.map(function (x) { return '<option>' + esc(L(x.name)) + '</option>'; }).join(''); sel.value = keep; }
  }
  $('#rvWall').addEventListener('click', function (e) { var b = e.target.closest('[data-wi]'); if (b) openLbx(wallLb, +b.dataset.wi); });

  /* leave a review: goes to the owners for approval; photos are made smaller here before they are sent */
  function shrinkImg(file, max, q) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); var d = c.toDataURL('image/jpeg', q); res({ url: d, b64: d.split(',')[1] });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(); };
      img.src = url;
    });
  }
  (function () {
    var f = $('#rvForm'), open = $('#rvOpen'); if (!f || !open) return;
    var av = null, phs = [], MAXP = 6, msg = $('#rvMsg');
    function drawThumbs() {
      $$('.rvf-th', f).forEach(function (x) { x.remove(); });
      var add = $('#rvAddPh');
      phs.forEach(function (p, i) {
        var s = document.createElement('span'); s.className = 'rvf-th';
        s.innerHTML = '<img src="' + p.url + '" alt=""><button type="button" data-x="' + i + '" aria-label="' + esc(t('rvf.remove')) + '"><svg><use href="#i-close"/></svg></button>';
        add.parentNode.insertBefore(s, add);
      });
      add.hidden = phs.length >= MAXP;
    }
    function setAv(p) { av = p; var pv = $('#rvAvPv'); pv.hidden = !p; if (p) pv.src = p.url; else pv.removeAttribute('src'); $('#rvAvX').hidden = !p; }
    $('#rvAv').addEventListener('change', function () { var file = this.files[0]; this.value = ''; if (!file) return; shrinkImg(file, 480, 0.85).then(setAv, function () { msg.textContent = t('rvf.phbad'); }); });
    $('#rvAvX').addEventListener('click', function () { setAv(null); });
    $('#rvPh').addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files); this.value = '';
      if (phs.length + files.length > MAXP) msg.textContent = t('rvf.phmax');
      files.slice(0, MAXP - phs.length).reduce(function (pr, file) {
        return pr.then(function () { return shrinkImg(file, 1400, 0.82).then(function (p) { if (phs.length < MAXP) phs.push(p); drawThumbs(); }, function () { msg.textContent = t('rvf.phbad'); }); });
      }, Promise.resolve());
    });
    $('#rvThumbs').addEventListener('click', function (e) { var b = e.target.closest('[data-x]'); if (b) { phs.splice(+b.dataset.x, 1); drawThumbs(); } });
    open.addEventListener('click', function () { var on = f.hidden; f.hidden = !on; open.setAttribute('aria-expanded', String(on)); if (on) setTimeout(function () { f.name.focus(); }, 50); });
    $$('.rvf-stars button', f).forEach(function (b) {
      b.addEventListener('click', function () { var v = +b.dataset.v; f.rating.value = v; $$('.rvf-stars button', f).forEach(function (x) { x.setAttribute('aria-pressed', String(+x.dataset.v <= v)); }); });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type=submit]', f);
      if (!+f.rating.value) { msg.textContent = t('rvf.needStars'); return; }
      btn.disabled = true; msg.textContent = t('rvf.sending');
      fetch(D.contact.api.replace(/contact$/, 'admin'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + D.contact.apiKey, apikey: D.contact.apiKey },
        body: JSON.stringify({ action: 'review-submit', name: f.name.value, country: f.country.value, rating: +f.rating.value, tour: f.tour.value, body: f.body.value, website: f.website.value, lang: lang,
          avatar: av ? av.b64 : '', photos: phs.map(function (p) { return p.b64; }) }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
        .then(function (x) {
          btn.disabled = false;
          if (x.ok) { f.reset(); setAv(null); phs = []; drawThumbs(); $$('.rvf-stars button', f).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); msg.textContent = t('rvf.thanks'); }
          else msg.textContent = t('rvf.err');
        }).catch(function () { btn.disabled = false; msg.textContent = t('rvf.err'); });
    });
  })();

  /* ---------- about us, team and contact details (edited in /admin) ---------- */
  function paras(s) { return String(s || '').split(/\n+/).filter(function (p) { return p.trim(); }).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); }
  function renderAbout() {
    var ab = (D.site && D.site.about) || {}, team = ((D.site && D.site.team) || []).filter(function (m) { return m && m.name && !m.hidden; });
    var txt = L(ab.text || {});
    $('#ab-h').textContent = L(ab.title || {}) || t('nav.about');
    $('#abText').innerHTML = paras(txt);
    $('#team').innerHTML = team.length ? '<h3 class="team-h">' + esc(t('team.title')) + '</h3><div class="team-grid">' + team.map(function (m) {
      return '<figure class="tm">' + (m.photo ? '<img src="' + esc(imgUrl(m.photo)) + '" alt="' + esc(m.name) + '" loading="lazy" decoding="async">' : '<span class="tm-ph" aria-hidden="true"><svg><use href="#i-user"/></svg></span>') +
        '<figcaption><b>' + esc(m.name) + '</b>' + (L(m.role || {}) ? '<small>' + esc(L(m.role)) + '</small>' : '') + (L(m.bio || {}) ? paras(L(m.bio)) : '') + '</figcaption></figure>';
    }).join('') + '</div>' : '';
    $('#about').hidden = !txt && !team.length;
  }
  function mapLink(c, addr) {
    var m = String(c.map || '').trim(), ll = m.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (ll) return { url: 'https://www.google.com/maps?q=' + ll[1] + ',' + ll[2], embed: 'https://maps.google.com/maps?q=' + ll[1] + ',' + ll[2] + '&z=15&output=embed' };
    if (/^https?:\/\//.test(m)) return { url: m, embed: '' };
    return { url: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addr || 'Ulaanbaatar'), embed: '' };
  }
  function renderContact() {
    var c = (D.site && D.site.contact) || {}, phone = c.phone || D.contact.phone, wa = c.whatsapp || phone, email = c.email || D.contact.email, addr = L(c.address || {}), ml = mapLink(c, addr);
    var tel = phone.replace(/[^\d+]/g, ''), waN = wa.replace(/\D/g, ''), copy = function (v) { return '<button class="copy" type="button" data-copy="' + esc(v) + '">' + esc(t('dc.copy')) + '</button>'; };
    D.contact.phoneRaw = '+' + waN;
    $('#directList').innerHTML =
      '<li><svg><use href="#i-phone"/></svg><span class="dl"><small>' + esc(t('dc.phone')) + '</small><a href="tel:' + esc(tel) + '">' + esc(phone) + '</a></span>' + copy(tel) + '</li>' +
      '<li><svg><use href="#i-wa"/></svg><span class="dl"><small>' + esc(t('dc.wa')) + '</small><a href="https://wa.me/' + waN + '" target="_blank" rel="noopener">' + esc(wa) + '</a></span>' + copy('+' + waN) + '</li>' +
      '<li><svg><use href="#i-mail"/></svg><span class="dl"><small>' + esc(t('dc.email')) + '</small><a href="mailto:' + esc(email) + '">' + esc(email) + '</a></span>' + copy(email) + '</li>' +
      (addr ? '<li><svg><use href="#i-pin"/></svg><span class="dl"><small>' + esc(t('dc.office')) + '</small><b>' + esc(addr) + '</b><a class="dl-map" href="' + esc(ml.url) + '" target="_blank" rel="noopener">' + esc(t('dc.map')) + ' ↗</a></span></li>' : '') +
      (c.hours ? '<li><svg><use href="#i-calendar"/></svg><span class="dl"><small>' + esc(t('dc.hours')) + '</small><b>' + esc(c.hours) + '</b></span></li>' : '');
    var dm = $('#directMap');
    if (ml.embed) { if (dm.dataset.src !== ml.embed) { dm.dataset.src = ml.embed; dm.innerHTML = '<iframe src="' + esc(ml.embed) + '" title="' + esc(t('dc.office')) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'; } dm.hidden = false; }
    else { dm.hidden = true; dm.innerHTML = ''; dm.dataset.src = ''; }
    $$('.foot-mail').forEach(function (a) { a.href = 'mailto:' + email; a.textContent = email; });
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
  function langUI() {
    var cur = LANGS.filter(function (l) { return l.id === lang; })[0] || LANGS[0];
    $('#langCur').textContent = cur.short;
    var btns = LANGS.map(function (l) { return '<button type="button" data-lang="' + l.id + '" lang="' + l.id + '" aria-pressed="' + (l.id === lang) + '"><b>' + esc(l.short) + '</b><span>' + esc(l.name) + '</span></button>'; }).join('');
    $('#langList').innerHTML = btns; $('#mLangs').innerHTML = btns;
  }
  function langOpen(on) { $('#langList').hidden = !on; $('#langBtn').setAttribute('aria-expanded', String(on)); }
  $('#langBtn').addEventListener('click', function (e) { e.stopPropagation(); langOpen($('#langList').hidden); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]');
    if (b) {
      langOpen(false); if (b.closest('#mLangs')) setMenu(false);
      var nl = b.dataset.lang; if (lang === nl) return;
      root.classList.add('lang-loading');
      (D.loadLang || function (x, cb) { cb(); })(nl, function () { root.classList.remove('lang-loading'); lang = (nl === 'en' || nl === 'mn' || (D.tx && D.tx[nl])) ? nl : 'en'; store.set('sky-lang', lang); applyLang(false); });
      return;
    }
    if (!e.target.closest('#lang')) langOpen(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#langList').hidden) { langOpen(false); $('#langBtn').focus(); } });
  function applyLang(first) {
    root.lang = lang === 'zh' ? 'zh-Hans' : lang;
    $$('[data-i18n]').forEach(function (el) { if (el.classList.contains('hero-word')) return; el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-alt]').forEach(function (el) { el.alt = t(el.getAttribute('data-i18n-alt')); });
    renderContact();
    var wa = $('#chatWa'); if (wa) wa.href = 'https://wa.me/' + D.contact.phoneRaw.replace(/\D/g, '') + '?text=' + encodeURIComponent(t('chat.waText'));
    var ms = $('#chatMs'); if (ms && D.links.messenger) ms.href = D.links.messenger;
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    var cc = $('#carCta'); if (cc && !cc._b) { cc._b = 1; cc.addEventListener('click', function () { var ps = $('#p-style'); if (ps) ps.value = t('car.style'); }); }
    langUI();
    renderHero(); renderTabs(); renderCards(); renderJourneys(); renderTours(); jmLang(); renderReels(); renderGallery(); renderReviews(); renderAbout(); renderTiles(); fillSelects(); syncTrip();
    if (!lbx.hidden) lbxShow(lbxAt);
    if (!first) { splitWord(); if (window.ScrollTrigger) { ScrollTrigger.refresh(); } }
  }

  /* ---------- header, nav, mobile menu ---------- */
  var hdr = $('#hdr'), burger = $('.burger'), mnav = $('#mnav');
  function onScroll() { hdr.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open); mnav.hidden = !open; document.body.style.overflow = open ? 'hidden' : '';
    root.classList.toggle('menu-open', !!open);
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
    var jobs = [$('.hero.no-orig') ? $('.hero-sl.on') : $('.hero-bg'), $('.hero-fg')].map(function (img) {
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
    /* phones scroll natively; Lenis would keep a 60 fps loop running all the time and warm the phone up */
    if (window.Lenis && !lite) {
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
    if (!lite) gsap.to('.brand-mark .rays', { rotation: 180, svgOrigin: '60 60', ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 1 } });
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
    if (!lite) gsap.fromTo('.why-bg', { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.why', start: 'top bottom', end: 'bottom top', scrub: true } });
    if (!lite) $$('.float').forEach(function (f) {
      var s = parseFloat(f.dataset.speed || 0);
      gsap.fromTo(f, { y: -s * 500 }, { y: s * 500, ease: 'none', scrollTrigger: { trigger: '.why', start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* steps: the line draws, the rings turn */
    var sl = $('.steplist'); sl.style.setProperty('--p', 0);
    ScrollTrigger.create({ trigger: sl, start: 'top 75%', end: 'bottom 65%', scrub: true, onUpdate: function (st) { sl.style.setProperty('--p', st.progress.toFixed(3)); } });
    $$('.num .orn').forEach(function (o) { gsap.from(o, { rotation: -120, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: o, start: 'top 85%' } }); });

    /* social + plan */
    if (!lite) gsap.fromTo('.social-bg', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.social-card', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.plan-card', { y: 80, opacity: 0, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '.plan-card', start: 'top 85%' } });
    if (!lite) gsap.fromTo('.plan-bg', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.plan', start: 'top bottom', end: 'bottom top', scrub: true } });
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
  var D = window.SKY, M = window.SKY_MAP, booted = false, CK = 'sky-content-v2';
  function boot() { if (booted) return; booted = true; if (D.loadLang && D.pickLang) D.loadLang(D.pickLang(), skyBoot); else skyBoot(); }
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
    (rows || []).forEach(function (r) {
      var d = r.data;
      if (r.key === 'site' && d && typeof d === 'object' && !Array.isArray(d)) Object.keys(d).forEach(function (k) { if (k === 'img' && d.img && typeof d.img === 'object') D.site.img = Object.assign({}, D.site.img, d.img); else if (d[k] != null) D.site[k] = d[k]; });
      if (r.key === 'hero' && Array.isArray(d)) { var h = d.filter(function (x) { return x && x.img && !x.hidden; }); if (h.length) D.hero = h; }
      if (r.key === 'destinations' && Array.isArray(d)) { var ps = d.filter(function (x) { return x && x.id && x.img && x.name && !x.hidden; }); if (ps.length) D.places = ps; }
      if (r.key === 'styles' && Array.isArray(d)) { var st = d.filter(function (x) { return x && x.img && !x.hidden; }); if (st.length) D.styles = st; }
    });
    (rows || []).forEach(function (r) {
      if (r.key === 'journeys' && Array.isArray(r.data)) {
        var ids = {}; D.places.forEach(function (p) { ids[p.id] = 1; });
        var js = r.data.filter(function (j) { return j && j.id && j.img && j.name && !j.hidden; }).map(function (j) { j.places = (j.places || []).filter(function (id) { return ids[id]; }); return j; }).filter(function (j) { return j.places.length; });
        if (js.length) D.journeys = js;
      }
      if (r.key === 'gallery' && Array.isArray(r.data) && r.data.length) D.gallery = r.data.filter(function (g) { return g && g.img && !g.hidden; });
      /* approved traveller reviews first, then the ones carried over from the old site */
      if (r.key === 'reviews' && Array.isArray(r.data)) {
        D.reviewsBase = D.reviewsBase || D.reviews;
        /* the old-site reviews now live in the table too; keep the bundled copies only while the table has none of them */
        if (r.data.some(function (v) { return v.name === 'John Cummins' || v.name === 'Veronica Jean'; })) D.reviewsBase = [];
        D.reviews = r.data.map(function (v) { return { r: v.rating, q: v.body, who: v.name + (v.country ? ', ' + v.country : ''), tour: v.tour || '', photos: Array.isArray(v.photos) ? v.photos : [], avatar: v.avatar || '', fresh: 1 }; }).concat(D.reviewsBase);
      }
    });
  }
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) {}
  if (cached) { try { apply(cached); } catch (e) {} }
  var c = D.contact || {}, base = (c.api || '').split('/functions/')[0];
  if (!base || !window.fetch || !M.proj) { boot(); return; }
  var timer = setTimeout(boot, cached ? 900 : 2500);
  var get = function (path) { return fetch(base + '/rest/v1/' + path, { headers: { apikey: c.apiKey } }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
  Promise.all([get('content?select=key,data,updated_at'), get('reviews?select=name,country,rating,body,tour,photos,avatar&order=created_at.desc&limit=60').then(function (x) { return x || get('reviews?select=name,country,rating,body&order=created_at.desc&limit=60'); })])
    .then(function (res) {
      var rows = res[0]; if (!rows && !res[1]) return;
      rows = (rows || []).concat(res[1] ? [{ key: 'reviews', data: res[1] }] : []);
      try { localStorage.setItem(CK, JSON.stringify(rows)); } catch (e) {}
      if (!booted) { try { apply(rows); } catch (e) {} }
    })
    .catch(function () {})
    .then(function () { clearTimeout(timer); boot(); });
})();
