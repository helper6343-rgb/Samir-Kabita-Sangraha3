/* ===== home-update.js =====
   1. लोकप्रिय रचनाहरू lai sabai bhanda talo pathaune
   2. सबै रचनाहरू ko card book jasto banaune
   3. Book ko lagi alag cover photo (data/book-covers.json). Lekh ma bhayeko asli photo badalindaina.
   4. Login gareko admin le 📷 thichera app bata book cover badalna sakchha */
(function () {
  var VIDHA = { kavita:'कविता', kabita:'कविता', lekh:'लेख', gazal:'गजल', ghazal:'गजल', muktak:'मुक्तक', geet:'गीत', story:'कथा', katha:'कथा' };
  var CAT_RE = /^(kavita|kabita|lekh|gazal|ghazal|muktak|geet|story|katha|कविता|लेख|गजल|मुक्तक|गीत|कथा)$/i;
  var READ_RE = /^(पढ्नुस्|पढ्नुहोस्|पढ्नुस|read)/i;
  var TIME_RE = /(मिनेट|min)/i;
  var MAP_URL = 'data/book-covers.json';
  var COVER_W = 900, COVER_H = 1200;   /* 3:4 */
  var MAP = {};

  function toast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
  }

  function movePopularToEnd() {
    var pop = document.getElementById('popularCards');
    var all = document.getElementById('allCards');
    if (!pop || !all) return;
    var popSec = pop.closest('section') || pop.parentElement;
    var allSec = all.closest('section') || all.parentElement;
    if (allSec.nextElementSibling !== popSec) allSec.after(popSec);
  }

  /* ---------- card bata jaankari ---------- */
  function coverSrc(card) {
    var img = card.querySelector('img:not(.bk-bg):not(.bk-img):not(.bk-full)');
    if (img) return img.currentSrc || img.src || img.getAttribute('data-src') || '';
    var els = card.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var m = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(els[i]).backgroundImage || '');
      if (m) return m[1];
    }
    return '';
  }

  function leaves(card) {
    return Array.prototype.filter.call(card.querySelectorAll('*'), function (e) {
      return !e.children.length && e.textContent.trim() && !e.closest('.bk-book');
    });
  }

  function catText(card) {
    var ls = leaves(card);
    for (var i = 0; i < ls.length; i++) {
      var t = ls[i].textContent.trim();
      if (CAT_RE.test(t)) return VIDHA[t.toLowerCase()] || t;
    }
    var g = card.querySelector('[class*="cat"],[class*="type"],[class*="genre"],[class*="badge"]');
    if (g && !g.closest('.bk-book')) {
      var s = g.textContent.trim();
      return VIDHA[s.toLowerCase()] || s;
    }
    return '';
  }

  function cardTitle(card) {
    var h = card.querySelector('h1,h2,h3,h4,h5,[class*="title"]');
    if (h && !h.closest('.bk-book') && h.textContent.trim()) return h.textContent.trim();
    var ls = leaves(card);
    for (var i = 0; i < ls.length; i++) {
      var t = ls[i].textContent.trim();
      if (CAT_RE.test(t) || READ_RE.test(t) || TIME_RE.test(t) || t.length < 2) continue;
      return t;
    }
    return '';
  }

  function readButton(card) {
    var ls = leaves(card);
    for (var i = 0; i < ls.length; i++) {
      if (READ_RE.test(ls[i].textContent.trim())) return ls[i].closest('button,a,[onclick]') || ls[i];
    }
    return null;
  }

  /* ---------- book banaune ---------- */
  function bookify(card) {
    if (card.querySelector(':scope > .bk-book')) return;
    if (!card.dataset.title) card.dataset.title = cardTitle(card);
    if (card.dataset.label === undefined) card.dataset.label = catText(card);
    if (!card.dataset.orig) card.dataset.orig = coverSrc(card);

    var title = card.dataset.title, label = card.dataset.label;
    var ov = window.SPG_OV && window.SPG_OV.get(title);
    if (ov && ov.genre) label = ov.genre;
    var shownTitle = (ov && ov.title) || title;
    var custom = MAP[title];
    var orig = card.dataset.orig;
    if (!custom && !orig) return;

    var wrap = document.createElement('div');
    wrap.className = 'bk-book';
    var box = document.createElement('div');
    box.className = 'bk-cover-box';

    if (custom) {
      var f = document.createElement('img');
      f.className = 'bk-full'; f.src = custom; f.alt = shownTitle;
      box.appendChild(f);
    } else {
      var bg = document.createElement('img');
      bg.className = 'bk-bg'; bg.src = orig; bg.alt = ''; bg.setAttribute('aria-hidden', 'true');
      var im = document.createElement('img');
      im.className = 'bk-img'; im.src = orig; im.alt = shownTitle;
      box.appendChild(bg); box.appendChild(im);
    }

    var cam = document.createElement('button');
    cam.className = 'bk-cam'; cam.type = 'button';
    cam.setAttribute('aria-label', 'Book cover फोटो बदल्नुस्');
    cam.textContent = '📷';
    cam.addEventListener('click', function (e) {
      e.stopPropagation(); e.preventDefault();
      changeCover(card);
    });
    box.appendChild(cam);

    var lb = document.createElement('div');
    lb.className = 'bk-label'; lb.textContent = label;
    wrap.appendChild(box); wrap.appendChild(lb);
    if (shownTitle) {
      var tt = document.createElement('div');
      tt.className = 'bk-title'; tt.textContent = shownTitle; tt.title = shownTitle;
      wrap.appendChild(tt);
    }

    wrap.addEventListener('click', function (e) {
      var btn = readButton(card);
      if (btn) { e.stopPropagation(); e.preventDefault(); btn.click(); }
    });
    card.appendChild(wrap);
    fitTitle(wrap.querySelector('.bk-title'));
  }

  /* Title ek line ma: thau napugda akshar aafai sano hunchha (sabai bhanda sano 10px) */
  function fitTitle(el) {
    if (!el) return;
    requestAnimationFrame(function () {
      if (!el.clientWidth) return;
      var size = 13;
      el.style.fontSize = size + 'px';
      while (el.scrollWidth > el.clientWidth && size > 10) {
        size -= 0.5;
        el.style.fontSize = size + 'px';
      }
    });
  }
  function fitAllTitles() {
    document.querySelectorAll('#allCards .bk-title').forEach(fitTitle);
  }
  window.addEventListener('resize', fitAllTitles);
  window.addEventListener('load', fitAllTitles);

  function rebuild(card) {
    var w = card.querySelector(':scope > .bk-book');
    if (w) w.remove();
    bookify(card);
  }

  function apply() {
    movePopularToEnd();
    var grid = document.getElementById('allCards');
    if (!grid) return;
    Array.prototype.forEach.call(grid.children, bookify);
  }

  function rebuildAll() {
    var grid = document.getElementById('allCards');
    if (!grid) return;
    Array.prototype.forEach.call(grid.children, rebuild);
  }

  /* ---------- Book cover badlane (admin) ---------- */
  function admin() { return window.SPG_ADMIN; }
  function syncAdmin() {
    var a = admin();
    document.body.classList.toggle('spg-admin', !!(a && a.isLoggedIn()));
  }

  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'b' + (h >>> 0).toString(36);
  }
  function enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function dec(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, '')))); }

  function ghHeaders() {
    return { Authorization: 'Bearer ' + admin().token(), Accept: 'application/vnd.github+json' };
  }
  function ghUrl(path) { return 'https://api.github.com/repos/' + admin().repo + '/contents/' + path; }

  async function getFile(path) {
    var r = await fetch(ghUrl(path) + '?ref=' + admin().branch, { headers: ghHeaders(), cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('GitHub ' + r.status);
    return r.json();
  }
  function putFile(path, b64, message, sha) {
    var body = { message: message, content: b64, branch: admin().branch };
    if (sha) body.sha = sha;
    return fetch(ghUrl(path), {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
      body: JSON.stringify(body)
    });
  }

  function processImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas');
        c.width = COVER_W; c.height = COVER_H;
        var ctx = c.getContext('2d');
        var r = Math.max(COVER_W / im.width, COVER_H / im.height);
        var dw = im.width * r, dh = im.height * r;
        ctx.drawImage(im, (COVER_W - dw) / 2, (COVER_H - dh) / 2, dw, dh);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          var fr = new FileReader();
          fr.onload = function () { res(fr.result.split(',')[1]); };
          fr.readAsDataURL(b);
        }, 'image/jpeg', 0.85);
      };
      im.onerror = function () { rej(new Error('फोटो खुलेन')); };
      im.src = url;
    });
  }

  /* Photo (File) lai 900x1200 banaera GitHub ma halne; MAP update garne */
  async function saveCover(title, file) {
    var a = admin();
    if (!a || !a.isLoggedIn()) throw new Error('पहिले लगइन गर्नुस्');
    toast('फोटो तयार हुँदैछ…', 8000);
    var b64 = await processImage(file);
    var path = 'covers/book/' + hash(title) + '.jpg';

    toast('अपलोड हुँदैछ…', 15000);
    var ex = await getFile(path);
    var r1 = await putFile(path, b64, 'Book cover: ' + title, ex && ex.sha);
    if (!r1.ok) throw new Error(r1.status === 401 || r1.status === 403 ? 'अनुमति छैन। फेरि लगइन गर्नुस्।' : 'फोटो अपलोड भएन (' + r1.status + ')');

    var value = path + '?v=' + Date.now();
    var ok = false;
    for (var i = 0; i < 3 && !ok; i++) {
      var jf = await getFile(MAP_URL);
      var cur = {};
      if (jf) { try { cur = JSON.parse(dec(jf.content)); } catch (e) { cur = {}; } }
      cur[title] = value;
      var r2 = await putFile(MAP_URL, enc(JSON.stringify(cur, null, 2)), 'Update book covers', jf && jf.sha);
      if (r2.ok) ok = true;
      else if (r2.status !== 409 && r2.status !== 422) throw new Error('सूची अपडेट भएन (' + r2.status + ')');
    }
    if (!ok) throw new Error('सूची अपडेट भएन');
    MAP[title] = value;
    rebuildAll();
    toast('Book cover बदलियो ✓ (१-२ मिनेटमा सबैले देख्छन्)', 3500);
  }

  function changeCover(card) {
    var a = admin();
    if (!a || !a.isLoggedIn()) { toast('पहिले लगइन गर्नुस्'); return; }
    var title = card.dataset.title;
    if (!title) { toast('रचनाको शीर्षक भेटिएन'); return; }
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      try { await saveCover(title, file); }
      catch (e) { toast((e && e.message) || 'फोटो बदल्न सकिएन', 4000); }
    };
    inp.click();
  }
  window.SPG_BOOK = { saveCover: saveCover, refresh: function () { rebuildAll(); } };


  /* ---------- Kabita ko ek line lai ek nai line ma rakhne ----------
     Line lamo bhayo bhane akshar aafai sano hunchha, dui line ma bhaachindaina. */
  var _measure = document.createElement('canvas').getContext('2d');
  var POEM_MIN = 11;
  function fitPoem() {
    var pc = document.querySelector('#modalBody .poem-content');
    if (!pc || !pc.clientWidth) return;
    var us = pc.dataset.userSize;                 // admin le rakheko size (bhaye)
    pc.style.fontSize = us ? us + 'px' : '';      // natra asli size
    var cs = getComputedStyle(pc);
    var base = parseFloat(cs.fontSize);
    var avail = pc.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (!base || avail <= 0) return;
    _measure.font = (cs.fontStyle || 'normal') + ' ' + (cs.fontWeight || 400) + ' ' + base + 'px ' + cs.fontFamily;
    var widest = 0;
    (pc.innerText || pc.textContent || '').split('\n').forEach(function (l) {
      var w = _measure.measureText(l.trim()).width;
      if (w > widest) widest = w;
    });
    if (widest > avail * 0.98) {
      var size = Math.max(POEM_MIN, Math.floor(base * (avail * 0.97 / widest) * 10) / 10);
      pc.style.fontSize = size + 'px';
    }
  }
  window.SPG_fitPoem = fitPoem;
  var _fitT;
  function schedulePoemFit() {
    cancelAnimationFrame(_fitT);
    _fitT = requestAnimationFrame(function () {
      fitPoem();
      setTimeout(fitPoem, 150);                   // modal khulne animation pachhi pheri
    });
  }
  function initPoemFit() {
    var body = document.getElementById('modalBody');
    var modal = document.getElementById('poemModal');
    if (body) new MutationObserver(schedulePoemFit).observe(body, { childList: true, subtree: true });
    if (modal) new MutationObserver(schedulePoemFit).observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
    window.addEventListener('resize', schedulePoemFit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedulePoemFit);
  }

  /* ---------- सुरु ---------- */
  function loadMap() {
    return fetch(MAP_URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (j) { MAP = j || {}; });
  }

  function init() {
    apply();
    syncAdmin();
    var grid = document.getElementById('allCards');
    if (grid) new MutationObserver(apply).observe(grid, { childList: true, subtree: true });
    loadMap().then(rebuildAll);
    initPoemFit();
    setTimeout(apply, 500);
    setTimeout(syncAdmin, 800);
  }

  document.addEventListener('spg-admin-change', syncAdmin);
  document.addEventListener('spg-ov-change', function () { rebuildAll(); });
  window.addEventListener('load', syncAdmin);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
