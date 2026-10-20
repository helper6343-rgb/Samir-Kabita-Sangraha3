/* ===== home-update.js =====
   1. लोकप्रिय रचनाहरू lai sabai bhanda talo pathaune
   2. सबै रचनाहरू ko card book jasto banaune
   3. Book ko lagi alag cover photo (data/book-covers.json). Lekh ma bhayeko asli photo badalindaina.
   4. Login gareko admin le ⋮ bata card-kai (native + extra) सम्पादन/मेटाउन सक्छ
   5. कुनै पनि customized overlay/sheet ma back (edge-swipe/हार्डवेयर) ले एप बन्द नगरोस् भनेर history integrate */
(function () {
  var VIDHA = { kavita:'कविता', kabita:'कविता', lekh:'लेख', gazal:'गजल', ghazal:'गजल', muktak:'मुक्तक', geet:'गीत', story:'कथा', katha:'कथा' };
  var CAT_RE = /^(kavita|kabita|lekh|gazal|ghazal|muktak|geet|story|katha|कविता|लेख|गजल|मुक्तक|गीत|कथा)$/i;
  var READ_RE = /^(पढ्नुस्|पढ्नुहोस्|पढ्नुस|read)/i;
  var TIME_RE = /(मिनेट|min)/i;
  var MAP_URL = 'data/book-covers.json';
  var EXTRA_URL = 'data/extra-posts.json';
  var DELETED_URL = 'data/deleted.json';
  var EXTRA = [];
  var DELETED = [];
  var COVER_W = 900, COVER_H = 1200;   /* 3:4 */
  var MAP = {};

  function toast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
  }

  function hidePopularSection() {
    var pop = document.getElementById('popularCards');
    if (!pop) return;
    var popSec = pop.closest('section') || pop.parentElement;
    if (popSec && popSec.style.display !== 'none') popSec.style.display = 'none';
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

  /* ---------- admin / GitHub helpers (माथि नै चाहिने, कार्ड बनाउँदा ⋮ ले प्रयोग गर्छ) ---------- */
  function admin() { return window.SPG_ADMIN; }
  function syncAdmin() {
    var a = admin();
    document.body.classList.toggle('spg-admin', !!(a && a.isLoggedIn()));
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'b' + (h >>> 0).toString(36);
  }
  function enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function dec(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, '')))); }

  /* ---------- ⋮ kebab मेनु (card-कै माथि, सम्पादन/मेटाउनुस्) ---------- */
  function closeAllKebabs() {
    document.querySelectorAll('.bk-kebab-menu.open').forEach(function (m) { m.classList.remove('open'); });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.bk-kebab') && !e.target.closest('.bk-kebab-menu')) closeAllKebabs();
  }, true);

  function makeKebab(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'bk-kebab-wrap';
    var btn = document.createElement('button');
    btn.className = 'bk-kebab'; btn.type = 'button';
    btn.setAttribute('aria-label', 'विकल्प');
    btn.textContent = '⋮';
    var menu = document.createElement('div');
    menu.className = 'bk-kebab-menu';
    var editBtn = document.createElement('button');
    editBtn.type = 'button'; editBtn.innerHTML = '✏️ <span>सम्पादन</span>';
    var delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.className = 'bk-kebab-danger'; delBtn.innerHTML = '🗑️ <span>मेटाउनुस्</span>';
    menu.appendChild(editBtn); menu.appendChild(delBtn);
    btn.addEventListener('click', function (e) {
      e.stopPropagation(); e.preventDefault();
      var wasOpen = menu.classList.contains('open');
      closeAllKebabs();
      if (!wasOpen) menu.classList.add('open');
    });
    editBtn.addEventListener('click', function (e) {
      e.stopPropagation(); e.preventDefault();
      closeAllKebabs();
      opts.onEdit && opts.onEdit();
    });
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation(); e.preventDefault();
      closeAllKebabs();
      opts.onDelete && opts.onDelete();
    });
    wrap.appendChild(btn); wrap.appendChild(menu);
    return wrap;
  }

  /* ---------- book banaune ---------- */
  function bookify(card) {
    if (card.querySelector(':scope > .bk-book')) return;
    if (!card.dataset.title) card.dataset.title = cardTitle(card);
    if (card.dataset.label === undefined) card.dataset.label = catText(card);
    if (!card.dataset.orig) card.dataset.orig = coverSrc(card);

    var title = card.dataset.title, label = card.dataset.label;

    /* Admin le मेटाएको (soft-delete) रचना भए, कार्ड नै नदेखाउने */
    if (DELETED.indexOf(title) !== -1) {
      card.style.setProperty('display', 'none', 'important');
      return;
    }

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
      f.onerror = function () {
        // Custom cover kholna sakena (missing/galat naam) bhane, asli photo ma pharkane
        f.remove();
        if (!box.querySelector('.bk-bg') && orig) {
          var bg2 = document.createElement('img');
          bg2.className = 'bk-bg'; bg2.src = orig; bg2.alt = ''; bg2.setAttribute('aria-hidden', 'true');
          var im2 = document.createElement('img');
          im2.className = 'bk-img'; im2.src = orig; im2.alt = shownTitle;
          box.insertBefore(bg2, box.firstChild);
          box.insertBefore(im2, box.querySelector('.bk-kebab-wrap'));
        } else if (!orig) {
          box.classList.add('bk-noimg');
          var ph = document.createElement('div');
          ph.className = 'bk-fallback';
          ph.textContent = '📖';
          box.insertBefore(ph, box.querySelector('.bk-kebab-wrap'));
        }
      };
      box.appendChild(f);
    } else if (orig) {
      var bg = document.createElement('img');
      bg.className = 'bk-bg'; bg.src = orig; bg.alt = ''; bg.setAttribute('aria-hidden', 'true');
      var im = document.createElement('img');
      im.className = 'bk-img'; im.src = orig; im.alt = shownTitle;
      box.appendChild(bg); box.appendChild(im);
    } else {
      // photo nai nabhaeko rachana ko lagi khali thau
      box.classList.add('bk-noimg');
      var ph2 = document.createElement('div');
      ph2.className = 'bk-fallback';
      ph2.textContent = '📖';
      box.appendChild(ph2);
    }

    var kebab = makeKebab({
      onEdit: function () { editNativeFromCard(card); },
      onDelete: function () { confirmDeleteNative(title); }
    });
    kebab.classList.add('bk-admin-only');
    box.appendChild(kebab);

    var lb = document.createElement('div');
    lb.className = 'bk-label'; lb.textContent = label;
    wrap.appendChild(box); wrap.appendChild(lb);
    if (shownTitle) {
      var tt = document.createElement('div');
      tt.className = 'bk-title'; tt.textContent = shownTitle; tt.title = shownTitle;
      wrap.appendChild(tt);
    }

    wrap.addEventListener('click', function (e) {
      if (e.target.closest('.bk-kebab-wrap')) return;
      var btn = readButton(card);
      if (btn) { e.stopPropagation(); e.preventDefault(); btn.click(); }
    });
    card.appendChild(wrap);
  }

  function rebuild(card) {
    var w = card.querySelector(':scope > .bk-book');
    if (w) w.remove();
    card.style.removeProperty('display');
    bookify(card);
  }

  function apply() {
    hidePopularSection();
    var grid = document.getElementById('allCards');
    if (!grid) return;
    Array.prototype.forEach.call(grid.children, bookify);
    /* साइटको आफ्नै कोडले #allCards फेरि बनायो भने (जस्तै filter/search),
       हाम्रा थप रचनाहरू हराउन सक्छन् — सङ्ख्या नमिले फेरि देखाइदिने */
    if (EXTRA.length) {
      var have = grid.querySelectorAll(':scope > .bk-extra-item').length;
      if (have !== EXTRA.length) renderExtra();
    }
  }

  function rebuildAll() {
    var grid = document.getElementById('allCards');
    if (!grid) return;
    Array.prototype.forEach.call(grid.children, rebuild);
  }

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

  /* ---------- Native रचना: ⋮ बाट सम्पादन/मेटाउने ---------- */
  function editNativeFromCard(card) {
    var a = admin();
    if (!a || !a.isLoggedIn()) { toast('पहिले लगइन गर्नुस्'); return; }
    var btn = readButton(card);
    if (!btn) { toast('यो रचना खोल्न सकिएन'); return; }
    btn.click();
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var ae = document.getElementById('aeBtn');
      if (ae) { clearInterval(t); ae.click(); }
      else if (tries > 30) clearInterval(t);
    }, 100);
  }
  /* Native रचना असली data/kavita.js मा राखिएकोले मेटाउँदा "soft delete" —
     शीर्षकको सूची data/deleted.json मा राखेर होमपेजमा लुकाउने (असली फाइल कहिल्यै छोइँदैन) */
  function loadDeleted() {
    return fetch(DELETED_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (j) { DELETED = Array.isArray(j) ? j : []; });
  }
  async function deleteNative(title) {
    var a = admin();
    if (!a || !a.isLoggedIn()) { toast('पहिले लगइन गर्नुस्'); return; }
    try {
      toast('मेटाउँदैछ…', 4000);
      var ok = false;
      for (var i = 0; i < 3 && !ok; i++) {
        var f = await getFile(DELETED_URL);
        var cur = [];
        if (f) { try { cur = JSON.parse(dec(f.content)); } catch (e) { cur = []; } }
        if (!Array.isArray(cur)) cur = [];
        if (cur.indexOf(title) === -1) cur.push(title);
        var r = await putFile(DELETED_URL, enc(JSON.stringify(cur, null, 2)), 'Delete (hide): ' + title, f && f.sha);
        if (r.ok) ok = true;
        else if (r.status !== 409 && r.status !== 422) throw new Error('मेटिएन (' + r.status + ')');
      }
      if (!ok) throw new Error('मेटिएन, फेरि प्रयास गर्नुस्।');
      if (DELETED.indexOf(title) === -1) DELETED.push(title);
      rebuildAll();
      toast('रचना मेटियो ✓');
    } catch (e) { toast((e && e.message) || 'मेटिएन', 4000); }
  }
  function confirmDeleteNative(title) {
    if (confirm('"' + title + '" मेटाउने हो? यो फिर्ता हुँदैन।')) deleteNative(title);
  }

  /* ---------- Kabita ko ek line lai ek nai line ma rakhne ----------
     Line lamo bhayo bhane akshar aafai sano hunchha, dui line ma bhaachindaina. */
  var _measure = document.createElement('canvas').getContext('2d');
  var POEM_MIN = 11;
  var POEM_BASE = 20;                              // sabai kabita/लेख ko akshar ustai naap (admin le size nabadaleko bhaye)
  function fitPoem() {
    var pc = document.querySelector('#modalBody .poem-content');
    if (!pc || !pc.clientWidth) return;
    var us = pc.dataset.userSize;                 // admin le ek-ek rachana ko lagi rakheko size (bhaye)
    var base = us ? parseFloat(us) : POEM_BASE;
    pc.style.fontSize = base + 'px';
    pc.style.fontStyle = 'normal';
    var cs = getComputedStyle(pc);
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


  /* ---------- थप रचनाहरू (admin ले एप बाटै थपेका नयाँ लेख/कविता) ---------- */
  var PENDING_KEY = 'spg_pending_extra';
  /* GitHub मा सेभ सफल भइसकेपछि पनि, GitHub Pages ले नयाँ फाइल सबैतिर
     देखाउन केही मिनेट लिन सक्छ (CDN propagation)। त्यो बेलामा फेरि app
     खोल्दा/fetch गर्दा रचना "हरायो" जस्तो देखिने समस्या आउँथ्यो। अब
     प्रकाशित भएको (confirmed सफल) रचना यहीँ फोनमा (localStorage) पनि
     राखेर, असली फाइलले भेट्टाउन्जेल देखाइरहने — हराउँदैन। */
  function getPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch (e) { return []; }
  }
  function setPending(list) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function pendingAdd(entry) {
    var list = getPending().filter(function (x) { return x.id !== entry.id; });
    list.unshift(entry);
    setPending(list);
  }
  function pendingRemove(id) {
    setPending(getPending().filter(function (x) { return x.id !== id; }));
  }
  function loadExtra() {
    return fetch(EXTRA_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (j) {
        var net = Array.isArray(j) ? j : [];
        var pending = getPending();
        if (pending.length) {
          var netIds = {};
          net.forEach(function (x) { netIds[x.id] = true; });
          var stillPending = [];
          var extra = [];
          pending.forEach(function (p) {
            if (netIds[p.id]) return;           // असली फाइलमा आइसक्यो — pending बाट हटाउने
            stillPending.push(p);
            extra.push(p);                        // अझै देखाइरहने
          });
          setPending(stillPending);
          EXTRA = extra.concat(net);
        } else {
          EXTRA = net;
        }
      });
  }

  function makeExtraCard(entry) {
    var wrap = document.createElement('div');
    wrap.className = 'bk-book';
    wrap.dataset.extraId = entry.id;
    var box = document.createElement('div');
    box.className = 'bk-cover-box';
    if (entry.cover) {
      var im = document.createElement('img');
      im.className = 'bk-full'; im.src = entry.cover; im.alt = entry.title || '';
      box.appendChild(im);
    } else {
      box.classList.add('bk-noimg');
      var ph = document.createElement('div'); ph.className = 'bk-fallback'; ph.textContent = '📖';
      box.appendChild(ph);
    }

    var kebab = makeKebab({
      onEdit: function () {
        var a = admin();
        if (!a || !a.isLoggedIn()) { toast('पहिले लगइन गर्नुस्'); return; }
        if (window.SPG_NEWPOST) window.SPG_NEWPOST.openEdit(entry);
      },
      onDelete: function () {
        if (confirm('"' + (entry.title || '') + '" मेटाउने हो? यो फिर्ता हुँदैन।')) deleteExtra(entry.id);
      }
    });
    kebab.classList.add('bk-admin-only');
    box.appendChild(kebab);

    var lb = document.createElement('div');
    lb.className = 'bk-label'; lb.textContent = entry.genre || '';
    var tt = document.createElement('div');
    tt.className = 'bk-title'; tt.textContent = entry.title || ''; tt.title = entry.title || '';
    wrap.appendChild(box); wrap.appendChild(lb); wrap.appendChild(tt);
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('.bk-kebab-wrap')) return;
      openExtraPost(entry);
    });
    var outer = document.createElement('div');
    outer.className = 'bk-extra-item';
    outer.appendChild(wrap);
    return outer;
  }

  function openExtraPost(entry) {
    var body = document.getElementById('modalBody');
    var modal = document.getElementById('poemModal');
    if (!body || !modal) return;
    var html = '';
    if (entry.cover) html += '<div class="poem-cover-large"><img src="' + esc(entry.cover) + '" alt="' + esc(entry.title || '') + '"></div>';
    html += '<h1 class="poem-title-large">' + esc(entry.title || '') + '</h1>';
    html += '<div class="poem-content">' + esc(entry.text || '') + '</div>';
    body.innerHTML = html;
    body.dataset.extraId = entry.id;             /* "थप रचना" हो भनेर चिन्ह लगाउने —
      सम्पादन थिच्दा extra-post-कै editor (admin-newpost.js) खुलोस् भनेर */
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    if (window.SPG_fitPoem) setTimeout(window.SPG_fitPoem, 60);
  }
  window.SPG_openExtraPost = openExtraPost;

  /* Native कविता (app.js को openPoem) खुल्दा माथिको चिन्ह हटाउने, नत्र त्यो
     native कविता लाई पनि "थप रचना" सम्झेर गलत editor खुल्छ */
  (function guardExtraEdit() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (typeof window.openPoem === 'function' && !window.openPoem.__spgWrapped) {
        var orig = window.openPoem;
        window.openPoem = function () {
          var body = document.getElementById('modalBody');
          if (body) delete body.dataset.extraId;
          return orig.apply(this, arguments);
        };
        window.openPoem.__spgWrapped = true;
        clearInterval(t);
      } else if (tries > 40) clearInterval(t);
    }, 100);
  })();

  function renderExtra() {
    var grid = document.getElementById('allCards');
    if (!grid) return;
    grid.querySelectorAll(':scope > .bk-extra-item').forEach(function (e) { e.remove(); });
    for (var i = EXTRA.length - 1; i >= 0; i--) {
      grid.insertBefore(makeExtraCard(EXTRA[i]), grid.firstChild);
    }
  }
  async function deleteExtra(id) {
    var a = admin();
    if (!a || !a.isLoggedIn()) { toast('पहिले लगइन गर्नुस्'); return; }
    try {
      toast('मेटाउँदैछ…', 4000);
      var ok = false;
      for (var i = 0; i < 3 && !ok; i++) {
        var f = await a.get(EXTRA_URL);
        var cur = [];
        if (f) { try { cur = JSON.parse(a.dec(f.content)); } catch (e) { cur = []; } }
        if (!Array.isArray(cur)) cur = [];
        var next = cur.filter(function (x) { return x.id !== id; });
        var r = await a.put(EXTRA_URL, a.enc(JSON.stringify(next, null, 2)), 'Delete post ' + id, f && f.sha);
        if (r.ok) ok = true;
        else if (r.status !== 409 && r.status !== 422) throw new Error('मेटिएन (' + r.status + ')');
      }
      if (!ok) throw new Error('मेटिएन, फेरि प्रयास गर्नुस्।');
      EXTRA = EXTRA.filter(function (x) { return x.id !== id; });
      pendingRemove(id);
      renderExtra();
      toast('रचना मेटियो ✓');
    } catch (e) { toast((e && e.message) || 'मेटिएन', 4000); }
  }
  window.SPG_EXTRA = {
    reload: function () { return loadExtra().then(renderExtra); },
    list: function () { return EXTRA; },
    /* नयाँ रचना सेभ भएपछि, GitHub Pages ले साइट अपडेट गर्न (सबैतिर देखाउन) केही
       मिनेट लिन सक्छ। त्यसैले फेरि fetch नगरी, थप्यै-थपि (optimistic) यहीँ
       देखाइदिने, र फोनमै (localStorage) पनि राख्ने — app बन्द गरे/पुनः खोले
       पनि असली फाइलले भेट्टाउन्जेल हराउँदैन */
    addLocal: function (entry) { EXTRA.unshift(entry); pendingAdd(entry); renderExtra(); },
    /* सम्पादन सेभ भएपछि, सोही entry local array मा पनि अपडेट गर्ने */
    updateLocal: function (entry) {
      var idx = -1;
      for (var i = 0; i < EXTRA.length; i++) { if (EXTRA[i].id === entry.id) { idx = i; break; } }
      if (idx !== -1) EXTRA[idx] = entry; else EXTRA.unshift(entry);
      pendingAdd(entry);
      renderExtra();
      var body = document.getElementById('modalBody');
      if (body && body.dataset.extraId === entry.id) openExtraPost(entry);
    }
  };


  /* ---------- कुनै पनि खुला मोडल (कविता/सेभ/समीर AI) मा side बाट तानेर back ---------- */
  function initEdgeSwipeBack() {
    var EDGE = 28, THRESH = 70, MAX_Y = 70;
    var startX = 0, startY = 0, tracking = false;
    document.addEventListener('touchstart', function (e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      tracking = t.clientX <= EDGE;
      startX = t.clientX; startY = t.clientY;
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      var dx = t.clientX - startX, dy = Math.abs(t.clientY - startY);
      if (dx > THRESH && dy < MAX_Y) triggerBack();
    }, { passive: true });
    function triggerBack() {
      /* पहिले हाम्रा custom overlay/editor हरू खुला भए ती नै बन्द गर्ने (history-integrated) */
      if (anyCustomOverlayOpen()) { history.back(); return; }
      var ids = ['poemModal', 'bookmarkModal', 'sameerAIModal'];
      for (var i = 0; i < ids.length; i++) {
        var m = document.getElementById(ids[i]);
        if (m && m.classList.contains('open')) {
          var btn = m.querySelector('.modal-back');
          if (btn) { btn.click(); return; }
        }
      }
    }
  }

  /* ---------- तल्लो nav: स्क्रोल तल गर्दा लुक्ने, माथि गर्दा देखिने ---------- */
  function initNavAutoHide() {
    var nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    var lastY = window.scrollY, ticking = false;
    function onScroll() {
      var y = window.scrollY;
      if (y > lastY + 6 && y > 80) nav.classList.add('nav-hidden');
      else if (y < lastY - 6 || y < 80) nav.classList.remove('nav-hidden');
      lastY = y; ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
  }

  /* ---------- कविता/लेख पढ्ने पेज: edit/bookmark/print सबै ⋮ भित्र ---------- */
  function buildPoemMenuExtras() {
    var menu = document.getElementById('poemMoreMenu');
    if (!menu || document.getElementById('pmEditBtn')) return;

    var editBtn = document.createElement('button');
    editBtn.id = 'pmEditBtn'; editBtn.type = 'button'; editBtn.setAttribute('role', 'menuitem');
    editBtn.className = 'pm-admin-only';
    editBtn.innerHTML = '✏️ <span>सम्पादन</span>';
    editBtn.addEventListener('click', function () {
      var body = document.getElementById('modalBody');
      if (body && body.dataset.extraId) {
        /* यो "थप रचना" हो — त्यसकै सम्पादन फारम (फोटो/विधा/पाठ सबै) खोल्ने */
        var entry = null;
        if (window.SPG_EXTRA) {
          window.SPG_EXTRA.list().forEach(function (x) { if (x.id === body.dataset.extraId) entry = x; });
        }
        if (entry && window.SPG_NEWPOST) { window.SPG_NEWPOST.openEdit(entry); return; }
        toast('सम्पादन खुल्न सकेन, फेरि प्रयास गर्नुस्।');
        return;
      }
      var real = document.getElementById('aeBtn');
      if (real) real.click();
    });

    var bmBtn = document.createElement('button');
    bmBtn.id = 'pmBookmarkBtn'; bmBtn.type = 'button'; bmBtn.setAttribute('role', 'menuitem');
    bmBtn.innerHTML = '🔖 <span>सेभ / हटाउनुस्</span>';
    bmBtn.addEventListener('click', function () {
      var real = document.getElementById('bookmarkBtn');
      if (real) real.click();
    });

    var prBtn = document.createElement('button');
    prBtn.id = 'pmPrintBtn'; prBtn.type = 'button'; prBtn.setAttribute('role', 'menuitem');
    prBtn.innerHTML = '🖨️ <span>प्रिन्ट</span>';
    prBtn.addEventListener('click', function () { window.print(); });

    menu.insertBefore(prBtn, menu.firstChild);
    menu.insertBefore(bmBtn, menu.firstChild);
    menu.insertBefore(editBtn, menu.firstChild);
  }

  /* ---------- विधा (genre) छान्ने + आउँदै छन् (upcoming) ---------- */
  var UPCOMING_URL = 'data/upcoming.json';
  var genreFilterActive = null;

  function sheetOverlay(id) {
    var ov = document.createElement('div');
    ov.id = id;
    ov.className = 'spg-sheet-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:none;align-items:flex-end;justify-content:center;';
    ov.innerHTML = '<div class="spg-sheet" style="position:relative;width:100%;max-width:560px;max-height:80vh;overflow:auto;background:var(--bg,#faf6f0);color:inherit;border-radius:22px 22px 0 0;padding:24px 20px calc(26px + env(safe-area-inset-bottom,0px));"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) closeSheet(ov); });
    document.body.appendChild(ov);
    return ov;
  }
  function openSheet(ov) { ov.style.display = 'flex'; }
  function closeSheet(ov) { ov.style.display = 'none'; }

  /* ---- विधा (genre) ---- */
  var genreOv = sheetOverlay('spgGenreSheet');
  function collectGenres() {
    var counts = {};
    document.querySelectorAll('#allCards > *').forEach(function (card) {
      var g = '';
      if (card.classList.contains('bk-extra-item')) {
        var lb = card.querySelector('.bk-label');
        g = lb ? lb.textContent.trim() : '';
      } else {
        g = card.dataset ? (card.dataset.label || '') : '';
      }
      if (g) counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }
  function applyGenreFilter(g) {
    genreFilterActive = g || null;
    document.querySelectorAll('#allCards > *').forEach(function (card) {
      var cg = '';
      if (card.classList.contains('bk-extra-item')) {
        var lb = card.querySelector('.bk-label');
        cg = lb ? lb.textContent.trim() : '';
      } else {
        cg = card.dataset ? (card.dataset.label || '') : '';
      }
      var show = !genreFilterActive || cg === genreFilterActive;
      card.style.setProperty('display', show ? 'block' : 'none', 'important');
    });
  }
  function renderGenreSheet() {
    var sheet = genreOv.querySelector('.spg-sheet');
    var counts = collectGenres();
    var keys = Object.keys(counts).sort();
    var html = '<h2 style="text-align:center;margin:0 0 4px;font-size:20px;">🏷️ विधा छान्नुस्</h2>';
    html += '<div style="text-align:center;font-size:13px;opacity:.7;margin-bottom:16px;">कुनै एउटा विधा छानेर त्यही खालका रचना मात्र हेर्नुस्</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">';
    html += '<button class="spg-genre-chip" data-g="" style="padding:9px 16px;border-radius:999px;border:1px solid rgba(232,196,122,.5);background:' + (!genreFilterActive ? '#e8710a;color:#fff' : 'transparent') + ';font-size:14px;cursor:pointer;">सबै</button>';
    keys.forEach(function (g) {
      var active = g === genreFilterActive;
      html += '<button class="spg-genre-chip" data-g="' + esc(g) + '" style="padding:9px 16px;border-radius:999px;border:1px solid rgba(232,196,122,.5);background:' + (active ? '#e8710a;color:#fff' : 'transparent') + ';font-size:14px;cursor:pointer;">' + esc(g) + ' (' + counts[g] + ')</button>';
    });
    html += '</div>';
    sheet.innerHTML = html;
    sheet.querySelectorAll('.spg-genre-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyGenreFilter(btn.dataset.g || null);
        closeSheet(genreOv);
        toast(genreFilterActive ? ('"' + genreFilterActive + '" मात्र देखाइँदैछ') : 'सबै रचना देखाइँदैछ');
      });
    });
  }

  /* ---- आउँदै छन् (upcoming): फोटो + विधा + शीर्षक, थिचेपछि छोटो अंश देखिने ---- */
  var upcomingOv = sheetOverlay('spgUpcomingSheet');
  var UPCOMING = [];
  var UPCOMING_GENRES = ['कविता', 'लेख', 'गजल', 'मुक्तक', 'गीत', 'कथा'];
  function loadUpcoming() {
    return fetch(UPCOMING_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (j) { UPCOMING = Array.isArray(j) ? j : []; });
  }
  async function saveUpcoming(list) {
    var a = admin();
    var ok = false, lastErr = null;
    for (var i = 0; i < 3 && !ok; i++) {
      var f = await getFile(UPCOMING_URL);
      var r = await putFile(UPCOMING_URL, enc(JSON.stringify(list, null, 2)), 'Update upcoming', f && f.sha);
      if (r.ok) ok = true; else if (r.status !== 409 && r.status !== 422) { lastErr = r.status; break; }
    }
    if (!ok) throw new Error('सेभ भएन' + (lastErr ? ' (' + lastErr + ')' : ''));
  }
  async function addUpcoming(entry) {
    toast('सेभ हुँदैछ…', 5000);
    var next = UPCOMING.concat([entry]);
    await saveUpcoming(next);
    UPCOMING = next;
    renderUpcomingSheet();
    toast('थपियो ✓');
  }
  async function deleteUpcoming(id) {
    var next = UPCOMING.filter(function (u) { return u.id !== id; });
    await saveUpcoming(next);
    UPCOMING = next;
    renderUpcomingSheet();
    toast('मेटियो ✓');
  }

  var upcomingExpanded = null;
  function renderUpcomingSheet() {
    var sheet = upcomingOv.querySelector('.spg-sheet');
    var isAdmin = document.body.classList.contains('spg-admin') && document.body.classList.contains('spg-edit-mode');
    var html = '<h2 style="text-align:center;margin:0 0 4px;font-size:20px;">🔜 आउँदै छन्</h2>';
    if (isAdmin) {
      html += '<button id="spgUpAddBtn" style="display:block;margin:6px auto 14px;padding:9px 18px;border-radius:999px;border:0;background:#1a2547;color:#fff;font-size:14px;cursor:pointer;">➕ नयाँ थप्नुस्</button>';
    }
    if (!UPCOMING.length) {
      html += '<div style="text-align:center;padding:30px 10px;opacity:.65;font-size:14px;">अहिलेलाई कुनै रचना सूचीमा राखिएको छैन।</div>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:14px;margin-top:4px;">';
      UPCOMING.forEach(function (u) {
        var open = upcomingExpanded === u.id;
        html += '<div class="spg-up-item" data-id="' + esc(u.id) + '" style="display:flex;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid rgba(232,196,122,.4);cursor:pointer;">';
        if (u.cover) html += '<img src="' + esc(u.cover) + '" style="width:48px;height:64px;object-fit:cover;border-radius:6px;flex:0 0 auto;">';
        html += '<div style="flex:1;min-width:0;">';
        if (u.genre) html += '<div style="font-size:12px;color:#e8710a;font-weight:600;margin-bottom:2px;">' + esc(u.genre) + '</div>';
        html += '<div style="font-weight:700;font-size:16px;">' + esc(u.title || '') + '</div>';
        if (open && u.note) html += '<div style="font-size:13.5px;opacity:.8;line-height:1.6;margin-top:6px;white-space:pre-line;">' + esc(u.note) + '</div>';
        html += '</div>';
        if (isAdmin) html += '<button class="spg-up-del" data-id="' + esc(u.id) + '" style="border:0;background:none;color:#d32f2f;font-size:16px;cursor:pointer;align-self:flex-start;">🗑️</button>';
        html += '</div>';
      });
      html += '</div>';
    }
    sheet.innerHTML = html;
    sheet.querySelectorAll('.spg-up-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('.spg-up-del')) return;
        var id = el.dataset.id;
        upcomingExpanded = (upcomingExpanded === id) ? null : id;
        renderUpcomingSheet();
      });
    });
    sheet.querySelectorAll('.spg-up-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('मेटाउने हो?')) deleteUpcoming(btn.dataset.id).catch(function (er) { toast((er && er.message) || 'मेटिएन'); });
      });
    });
    var addBtn = sheet.querySelector('#spgUpAddBtn');
    if (addBtn) addBtn.addEventListener('click', openUpcomingForm);
  }

  var upFormOv = sheetOverlay('spgUpcomingForm');
  var upPendingFile = null;
  function openUpcomingForm() {
    var sheet = upFormOv.querySelector('.spg-sheet');
    upPendingFile = null;
    sheet.innerHTML =
      '<h2 style="text-align:center;margin:0 0 14px;font-size:20px;">➕ आउँदै छ भनेर थप्नुस्</h2>' +
      '<label style="display:block;font-size:13.5px;font-weight:600;margin-bottom:6px;">फोटो (वैकल्पिक)</label>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;"><img id="spgUpPrev" src="" style="width:48px;height:64px;object-fit:cover;border-radius:6px;background:#ddd"><button type="button" id="spgUpPhotoBtn" style="padding:9px 14px;border-radius:10px;border:1px solid #cfc7bd;background:#fff;cursor:pointer;">फोटो छान्नुस्</button></div>' +
      '<input type="file" id="spgUpPhotoFile" accept="image/*" hidden>' +
      '<label style="display:block;font-size:13.5px;font-weight:600;margin-bottom:6px;">विधा</label>' +
      '<select id="spgUpGenre" style="display:block;width:100%;margin-bottom:14px;padding:11px;border-radius:10px;border:1px solid #cfc7bd;font-size:15px;">' +
        UPCOMING_GENRES.map(function (g) { return '<option>' + g + '</option>'; }).join('') +
      '</select>' +
      '<label style="display:block;font-size:13.5px;font-weight:600;margin-bottom:6px;">शीर्षक</label>' +
      '<input id="spgUpTitle" type="text" style="display:block;width:100%;margin-bottom:14px;padding:11px;border-radius:10px;border:1px solid #cfc7bd;font-size:15px;box-sizing:border-box;">' +
      '<label style="display:block;font-size:13.5px;font-weight:600;margin-bottom:6px;">छोटो अंश (थिचेपछि देखिने)</label>' +
      '<textarea id="spgUpNote" style="display:block;width:100%;min-height:90px;margin-bottom:14px;padding:11px;border-radius:10px;border:1px solid #cfc7bd;font-size:15px;box-sizing:border-box;line-height:1.7;"></textarea>' +
      '<button id="spgUpSave" style="width:100%;padding:13px;border:0;border-radius:12px;background:#1a2547;color:#fff;font-size:16px;font-weight:600;cursor:pointer;">सेभ गर्नुस्</button>' +
      '<div id="spgUpMsg" style="margin-top:10px;font-size:14px;"></div>';
    sheet.querySelector('#spgUpPhotoBtn').addEventListener('click', function () { sheet.querySelector('#spgUpPhotoFile').click(); });
    sheet.querySelector('#spgUpPhotoFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      upPendingFile = f;
      sheet.querySelector('#spgUpPrev').src = URL.createObjectURL(f);
    });
    sheet.querySelector('#spgUpSave').addEventListener('click', async function () {
      var msg = sheet.querySelector('#spgUpMsg');
      var title = sheet.querySelector('#spgUpTitle').value.trim();
      if (!title) { msg.style.color = '#d32f2f'; msg.textContent = 'शीर्षक लेख्नुस्।'; return; }
      var btn = this; btn.disabled = true; msg.style.color = ''; msg.textContent = '';
      try {
        var id = 'u' + Date.now().toString(36) + hash(title);
        var cover = '';
        if (upPendingFile) {
          msg.textContent = 'फोटो अपलोड हुँदैछ…';
          var b64 = await processImage(upPendingFile);
          var path = 'covers/upcoming/' + id + '.jpg';
          var r1 = await putFile(path, b64, 'Upcoming cover: ' + title);
          if (!r1.ok) throw new Error('फोटो अपलोड भएन (' + r1.status + ')');
          cover = path + '?v=' + Date.now();
        }
        var entry = { id: id, title: title, genre: sheet.querySelector('#spgUpGenre').value, cover: cover, note: sheet.querySelector('#spgUpNote').value.trim() };
        await addUpcoming(entry);
        closeSheet(upFormOv);
        openSheet(upcomingOv);
      } catch (e) {
        msg.style.color = '#d32f2f'; msg.textContent = (e && e.message) || 'सेभ भएन।';
      } finally { btn.disabled = false; }
    });
  }
  (function hookUpcomingAddNav() {
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'spgUpAddBtn') { closeSheet(upcomingOv); openSheet(upFormOv); }
    });
  })();

  function initGenreUpcoming() {
    var gBtn = document.getElementById('spMenuGenre');
    var uBtn = document.getElementById('spMenuUpcoming');
    if (gBtn) gBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var m = document.getElementById('dropdownMenu');
      if (m) ['open', 'show', 'active', 'visible'].forEach(function (c) { m.classList.remove(c); });
      renderGenreSheet();
      openSheet(genreOv);
    });
    if (uBtn) uBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var m = document.getElementById('dropdownMenu');
      if (m) ['open', 'show', 'active', 'visible'].forEach(function (c) { m.classList.remove(c); });
      upcomingExpanded = null;
      renderUpcomingSheet();
      openSheet(upcomingOv);
      loadUpcoming().then(renderUpcomingSheet);
    });
    loadUpcoming();
  }

  /* =========================================================================
     कुनै पनि ठाउँमा back थिच्दा / साइडबाट तान्दा एप नै बन्द नहोस् भनेर:
     हाम्रा सबै custom overlay (about-login.js को sp-ov, admin-newpost.js को
     sp-ov/crop, admin-edit.js को ae-open editor, र माथिका genre/upcoming
     sheet) मध्ये कुनै खुल्ला भए history.pushState गर्ने, र back/popstate
     आउँदा त्यही खुला भएको बन्द गर्ने — अरू कुनै फाइल नछोइकनै ।
     ========================================================================= */
  function anyCustomOverlayOpen() {
    return !!(document.querySelector('.sp-ov.sp-open') ||
      document.querySelector('.ae-ov.ae-open, .ae-open') ||
      (genreOv.style.display === 'flex') ||
      (upcomingOv.style.display === 'flex') ||
      (upFormOv.style.display === 'flex'));
  }
  function closeAllCustomOverlays() {
    document.querySelectorAll('.sp-ov.sp-open').forEach(function (o) { o.classList.remove('sp-open'); });
    document.querySelectorAll('.ae-ov.ae-open, .ae-open').forEach(function (o) { o.classList.remove('ae-open'); });
    if (genreOv.style.display === 'flex') closeSheet(genreOv);
    if (upcomingOv.style.display === 'flex') closeSheet(upcomingOv);
    if (upFormOv.style.display === 'flex') closeSheet(upFormOv);
  }
  function initOverlayBackFix() {
    var pushed = false;
    function sync() {
      var open = anyCustomOverlayOpen();
      if (open && !pushed) {
        history.pushState({ spgCustomOverlay: true }, '');
        pushed = true;
      } else if (!open && pushed) {
        /* X/✕/सेभ/बाहिर-touch बाट बन्द भयो (back थिचेर होइन) — अब
           बेकामको "forward" history entry आफैं pop गरिदिने, नत्र त्यसले
           अर्को पटक back थिच्दा एक पटक केही नभई मात्र consume हुन्छ */
        pushed = false;
        history.back();
      }
    }
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });
    window.addEventListener('popstate', function () {
      if (anyCustomOverlayOpen()) closeAllCustomOverlays();
      pushed = false;
    });
  }

  /* ---------- समीर AI मोडल: back/साइड-स्वाइपले एप बन्द नगरोस् ----------
     js/sameerai.js ले खोल्दा history.pushState कहिल्यै गर्दैन (असली बग),
     त्यसैले back/edge-swipe थिच्दा app बाटै बाहिरिन्छ। openSameerAI/
     closeSameerAI लाई यहीँबाट wrap गरेर history-सँग जोड्ने — असली फाइल
     कहिल्यै छोइँदैन । */
  (function guardSameerAIHistory() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (typeof window.openSameerAI === 'function' && typeof window.closeSameerAI === 'function' && !window.openSameerAI.__spgWrapped) {
        var origOpen = window.openSameerAI, origClose = window.closeSameerAI;
        window.openSameerAI = function () {
          origOpen.apply(this, arguments);
          history.pushState({ spgAI: true }, '');
        };
        window.closeSameerAI = function () {
          if (history.state && history.state.spgAI) history.back();
          else origClose.apply(this, arguments);
        };
        window.openSameerAI.__spgWrapped = true;
        clearInterval(t);
      } else if (tries > 50) clearInterval(t);
    }, 100);
  })();

  /* ---------- समीर AI: जवाफ नभेटे "Google मा खोज्नुस्" लिंक थप्ने ----------
     साइट backend-रहित भएकोले सिधै AI ले live Google जवाफ ल्याउन सक्दैन;
     बायोमा नभएको प्रश्नमा एक-थिचाइको Google-खोज लिंक दिने — प्रयोगकर्ताले
     उत्तर नपाई नरोकियोस् भनेर । */
  (function enhanceSameerAIFallback() {
    var FALLBACK = 'यो प्रश्नको जवाफ मसँग छैन। तपाईं समीरको पढाइ, घर, हालको ठेगाना, रुचि, पुस्तक वा शौकबारे सोध्न सक्नुहुन्छ।';
    var lastQuestion = '';
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var input = document.getElementById('sameerAIInput');
      if (typeof window.sendSameerAIMessage === 'function' && input && !window.sendSameerAIMessage.__spgWrapped) {
        var orig = window.sendSameerAIMessage;
        window.sendSameerAIMessage = function () {
          lastQuestion = (input.value || '').trim();
          orig.apply(this, arguments);
          setTimeout(checkFallback, 420);
        };
        window.sendSameerAIMessage.__spgWrapped = true;
        clearInterval(t);
      } else if (tries > 50) clearInterval(t);
    }, 100);
    function checkFallback() {
      if (!lastQuestion) return;
      var box = document.getElementById('sameerAIMessages');
      if (!box) return;
      var msgs = box.querySelectorAll('.sameerai-msg.bot');
      var last = msgs[msgs.length - 1];
      if (!last || last.dataset.spgGoogled || last.textContent.trim() !== FALLBACK) return;
      last.dataset.spgGoogled = '1';
      var a = document.createElement('a');
      a.href = 'https://www.google.com/search?q=' + encodeURIComponent(lastQuestion);
      a.target = '_blank'; a.rel = 'noopener';
      a.textContent = '🔍 "' + lastQuestion + '" Google मा खोज्नुस्';
      a.style.cssText = 'display:inline-block;margin-top:8px;color:#1a73e8;text-decoration:underline;font-size:13.5px;';
      last.appendChild(document.createElement('br'));
      last.appendChild(a);
      box.scrollTop = box.scrollHeight;
    }
  })();

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
    loadDeleted().then(rebuildAll);
    loadExtra().then(renderExtra);
    initPoemFit();
    initNavAutoHide();
    buildPoemMenuExtras();
    initEdgeSwipeBack();
    initGenreUpcoming();
    initOverlayBackFix();
    setTimeout(apply, 500);
    setTimeout(syncAdmin, 800);
  }

  document.addEventListener('spg-admin-change', syncAdmin);
  document.addEventListener('spg-ov-change', function () { rebuildAll(); });
  window.addEventListener('load', syncAdmin);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
