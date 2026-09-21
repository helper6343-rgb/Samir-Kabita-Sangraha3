/* ===== admin-edit.js =====
   Login gareko admin le kavita/lekh kholera ✏️ thichera badalna sakchha:
   शीर्षक, विधा, पाठ (ashuddhi sudhar), akshar ko size, rachana ko photo, book cover photo.
   Sabai badlaav data/overrides.json ma save hunchha (asli data file chhuinna). */
(function () {
  var OV_FILE = 'data/overrides.json';
  var GENRES = ['कविता', 'लेख', 'गजल', 'मुक्तक', 'गीत', 'कथा'];
  var CAT_RE = /^(kavita|kabita|lekh|gazal|ghazal|muktak|geet|story|katha|कविता|लेख|गजल|मुक्तक|गीत|कथा)$/i;
  var OV = {};

  window.SPG_OV = {
    get: function (t) { return OV[t] || null; },
    all: function () { return OV; }
  };

  /* ---------- CSS ---------- */
  var st = document.createElement('style');
  st.textContent = '\
.ae-btn{display:none!important}\
body.spg-admin .ae-btn{display:inline-flex!important}\
.ae-ov{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.5);display:none;align-items:flex-end;justify-content:center}\
.ae-ov.ae-open{display:flex}\
.ae-sheet{width:100%;max-width:620px;max-height:92vh;overflow:auto;background:#faf6f0;color:#1a1a2e;border-radius:22px 22px 0 0;padding:22px 20px calc(26px + env(safe-area-inset-bottom,0px));font-family:"Noto Sans Devanagari","Tiro Devanagari Hindi",sans-serif;position:relative}\
[data-theme="dark"] .ae-sheet{background:#1e1a2b;color:#eee}\
.ae-sheet h2{margin:0 0 12px;font-size:20px;text-align:center}\
.ae-x{position:absolute;right:12px;top:10px;border:0;background:none;font-size:22px;color:inherit;cursor:pointer;padding:6px}\
.ae-sheet label{display:block;margin:14px 0 6px;font-size:14px;font-weight:600}\
.ae-in{display:block;width:100%;box-sizing:border-box;padding:12px 13px;border-radius:12px;border:1px solid #cfc7bd;font:inherit;font-size:16px;background:#fff;color:#111}\
textarea.ae-in{min-height:220px;line-height:1.9;resize:vertical}\
.ae-row{display:flex;align-items:center;gap:12px}\
.ae-row input[type=range]{flex:1}\
.ae-val{min-width:52px;text-align:right;font-weight:600}\
.ae-file{font-size:14px;width:100%}\
.ae-note{font-size:12.5px;opacity:.7;margin-top:4px;line-height:1.6}\
.ae-btn2{display:block;width:100%;margin-top:16px;padding:14px;border:0;border-radius:12px;background:#1a2547;color:#fff;font-size:17px;font-weight:600;cursor:pointer}\
.ae-btn2.alt{background:transparent;color:#d32f2f;border:1px solid #d32f2f;font-weight:500;font-size:15px}\
.ae-btn2:disabled{opacity:.6}\
.ae-msg{margin-top:10px;font-size:14px;min-height:20px}\
.ae-msg.err{color:#d32f2f}';
  document.head.appendChild(st);

  /* ---------- Helpers ---------- */
  function admin() { return window.SPG_ADMIN; }
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
  }
  function norm(s) { return String(s || '').replace(/\r/g, '').replace(/^\s+|\s+$/g, ''); }

  function poemEls() {
    var b = document.getElementById('modalBody');
    if (!b) return null;
    var t = b.querySelector('.poem-title-large'), c = b.querySelector('.poem-content');
    if (!t || !c) return null;
    return { b: b, t: t, c: c, cv: b.querySelector('.poem-cover-large') };
  }
  function origTitle(e) {
    if (!e.t.dataset.orig) e.t.dataset.orig = e.t.textContent.trim();
    return e.t.dataset.orig;
  }

  /* cover photo (img wa background) */
  function getCover(cv) {
    if (!cv) return '';
    if (cv.tagName === 'IMG') return cv.getAttribute('src') || '';
    var im = cv.querySelector('img');
    if (im) return im.getAttribute('src') || '';
    return cv.style.backgroundImage || getComputedStyle(cv).backgroundImage || '';
  }
  function setCover(cv, src) {
    if (!cv || !src) return;
    if (cv.tagName === 'IMG') { if (cv.getAttribute('src') !== src) { cv.removeAttribute('srcset'); cv.src = src; } return; }
    var im = cv.querySelector('img');
    if (im) { if (im.getAttribute('src') !== src) { im.removeAttribute('srcset'); im.src = src; } return; }
    var v = /^url\(/.test(src) ? src : 'url("' + src + '")';
    if (cv.style.backgroundImage !== v) cv.style.backgroundImage = v;
  }
  function genreEl(e) {
    var els = e.b.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var x = els[i];
      if (!x.children.length && x !== e.t && !e.c.contains(x) && CAT_RE.test(x.textContent.trim())) return x;
    }
    return null;
  }

  /* ---------- Kavita page ma lagaune ---------- */
  function applyPoem() {
    var e = poemEls();
    if (!e) return;
    var key = origTitle(e);
    if (e.c.dataset.origText === undefined) e.c.dataset.origText = e.c.textContent;
    if (e.cv && e.cv.dataset.origCover === undefined) e.cv.dataset.origCover = getCover(e.cv);
    var g = genreEl(e);
    if (g && g.dataset.origGenre === undefined) g.dataset.origGenre = g.textContent;

    var ov = OV[key];
    var wantTitle = (ov && ov.title) || key;
    if (e.t.textContent !== wantTitle) e.t.textContent = wantTitle;

    var wantText = (ov && typeof ov.text === 'string') ? ov.text : e.c.dataset.origText;
    if (e.c.textContent !== wantText) e.c.textContent = wantText;

    if (ov && ov.size) e.c.dataset.userSize = ov.size; else delete e.c.dataset.userSize;

    if (e.cv) setCover(e.cv, (ov && ov.cover) || e.cv.dataset.origCover);
    if (g) {
      var wg = (ov && ov.genre) || g.dataset.origGenre;
      if (g.textContent !== wg) g.textContent = wg;
    }
    if (window.SPG_fitPoem) window.SPG_fitPoem();
  }

  var _t;
  function scheduleApply() { cancelAnimationFrame(_t); _t = requestAnimationFrame(function () { applyPoem(); addBtn(); }); }

  /* ---------- ✏️ button ---------- */
  function addBtn() {
    var act = document.querySelector('#poemModal .modal-actions');
    if (!act || document.getElementById('aeBtn')) return;
    var b = document.createElement('button');
    b.className = 'icon-btn ae-btn'; b.id = 'aeBtn'; b.type = 'button';
    b.title = 'सम्पादन'; b.setAttribute('aria-label', 'सम्पादन'); b.textContent = '✏️';
    b.addEventListener('click', openEditor);
    act.insertBefore(b, act.firstChild);
  }

  /* ---------- Editor ---------- */
  var ed = document.createElement('div');
  ed.className = 'ae-ov'; ed.id = 'aeSheet';
  ed.innerHTML =
    '<div class="ae-sheet"><button class="ae-x" aria-label="बन्द">✕</button>' +
    '<h2>✏️ सम्पादन</h2>' +
    '<label for="aeTitle">शीर्षक</label><input class="ae-in" id="aeTitle" type="text">' +
    '<label for="aeGenre">विधा</label><select class="ae-in" id="aeGenre"></select>' +
    '<label for="aeText">पाठ (अशुद्धि यहीँ मिलाउनुस्)</label><textarea class="ae-in" id="aeText"></textarea>' +
    '<label>अक्षरको साइज</label><div class="ae-row"><input type="range" id="aeSize" min="12" max="32" step="1"><span class="ae-val" id="aeSizeVal"></span></div>' +
    '<div class="ae-note">धेरै ठूलो राख्दा लामो लाइन अटाउन अक्षर आफैँ सानो हुन्छ।</div>' +
    '<label for="aePhoto">रचनाको फोटो (कविता पेजमा)</label><input class="ae-file" id="aePhoto" type="file" accept="image/*">' +
    '<label for="aeBook">Book cover फोटो (होम पेजमा)</label><input class="ae-file" id="aeBook" type="file" accept="image/*">' +
    '<div class="ae-note">Book cover ३:४ (ठाडो) फोटो राम्रो हुन्छ, जस्तै ९०० × १२०० px।</div>' +
    '<button class="ae-btn2" id="aeSave">सेभ गर्नुस्</button>' +
    '<button class="ae-btn2 alt" id="aeReset">मूल स्थितिमा फर्काउनुस्</button>' +
    '<div class="ae-msg" id="aeMsg"></div></div>';
  document.body.appendChild(ed);
  var $ = function (s) { return ed.querySelector(s); };
  var sizeTouched = false, editKey = '', baseText = '', baseSize = 20;

  var sel = $('#aeGenre');
  sel.innerHTML = '<option value="">(जस्ताको तस्तै)</option>' + GENRES.map(function (g) { return '<option>' + g + '</option>'; }).join('');
  $('#aeSize').addEventListener('input', function () { sizeTouched = true; $('#aeSizeVal').textContent = this.value + ' px'; });
  ed.addEventListener('click', function (e) { if (e.target === ed || e.target.closest('.ae-x')) ed.classList.remove('ae-open'); });
  function msg(t, err) { var m = $('#aeMsg'); m.className = 'ae-msg' + (err ? ' err' : ''); m.textContent = t || ''; }

  function openEditor() {
    var a = admin();
    if (!a || !a.isLoggedIn()) { toast('पहिले लगइन गर्नुस्'); return; }
    var e = poemEls();
    if (!e) { toast('कविता खुलेको छैन'); return; }
    editKey = origTitle(e);
    var ov = OV[editKey] || {};
    var g = genreEl(e);
    $('#aeTitle').value = e.t.textContent.trim();
    var cur = (ov.genre) || (g && (g.dataset.origGenre || g.textContent).trim()) || '';
    if (cur && GENRES.indexOf(cur) < 0) { sel.insertAdjacentHTML('beforeend', '<option>' + cur + '</option>'); }
    sel.value = cur;
    baseText = norm(e.c.dataset.origText !== undefined ? e.c.dataset.origText : e.c.textContent);
    $('#aeText').value = norm(e.c.textContent);
    var fs = ov.size || Math.round(parseFloat(getComputedStyle(e.c).fontSize)) || 20;
    baseSize = fs;
    $('#aeSize').value = fs; $('#aeSizeVal').textContent = fs + ' px';
    sizeTouched = !!ov.size;
    $('#aePhoto').value = ''; $('#aeBook').value = '';
    msg('');
    ed.classList.add('ae-open');
  }

  function processImage(file, W, H) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = W; c.height = H;
        var ctx = c.getContext('2d'), r = Math.max(W / im.width, H / im.height);
        var dw = im.width * r, dh = im.height * r;
        ctx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
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

  async function writeOv(mutator, message) {
    var a = admin();
    for (var i = 0; i < 3; i++) {
      var f = await a.get(OV_FILE);
      var cur = {};
      if (f) { try { cur = JSON.parse(a.dec(f.content)); } catch (e) { cur = {}; } }
      mutator(cur);
      var r = await a.put(OV_FILE, a.enc(JSON.stringify(cur, null, 2)), message, f && f.sha);
      if (r.ok) { OV = cur; return; }
      if (r.status !== 409 && r.status !== 422) throw new Error('सेभ भएन (' + r.status + ')');
    }
    throw new Error('सेभ भएन, फेरि प्रयास गर्नुस्।');
  }

  function afterChange() {
    applyPoem();
    document.dispatchEvent(new CustomEvent('spg-ov-change'));
  }

  $('#aeSave').addEventListener('click', async function () {
    var a = admin();
    if (!a || !a.isLoggedIn()) return msg('पहिले लगइन गर्नुस्।', true);
    var btn = this; btn.disabled = true;
    try {
      var entry = Object.assign({}, OV[editKey] || {});
      var title = $('#aeTitle').value.trim(), genre = sel.value, text = norm($('#aeText').value);

      if (title && title !== editKey) entry.title = title; else delete entry.title;
      if (genre) entry.genre = genre; else delete entry.genre;
      if (text && text !== baseText) entry.text = text; else delete entry.text;
      if (sizeTouched) entry.size = parseInt($('#aeSize').value, 10); else delete entry.size;

      var pf = $('#aePhoto').files[0];
      if (pf) {
        msg('रचनाको फोटो अपलोड हुँदैछ…');
        var b64 = await processImage(pf, 1280, 720);
        var path = 'covers/edit/' + a.hash(editKey) + '-p.jpg';
        var ex = await a.get(path);
        var r = await a.put(path, b64, 'Poem photo: ' + editKey, ex && ex.sha);
        if (!r.ok) throw new Error('फोटो अपलोड भएन (' + r.status + ')');
        entry.cover = path + '?v=' + Date.now();
      }

      msg('सेभ हुँदैछ…');
      await writeOv(function (all) {
        if (Object.keys(entry).length) all[editKey] = entry; else delete all[editKey];
      }, 'Edit: ' + editKey);

      var bf = $('#aeBook').files[0];
      if (bf && window.SPG_BOOK) {
        msg('Book cover अपलोड हुँदैछ…');
        await window.SPG_BOOK.saveCover(editKey, bf);
      }

      afterChange();
      ed.classList.remove('ae-open');
      toast('सेभ भयो ✓ (१-२ मिनेटमा सबैले देख्छन्)', 3500);
    } catch (e) {
      msg((e && e.message) || 'सेभ भएन।', true);
    } finally { btn.disabled = false; }
  });

  $('#aeReset').addEventListener('click', async function () {
    if (!confirm('यो रचनाका सबै बदलाव हटाएर मूल स्थितिमा फर्काउने?')) return;
    var btn = this; btn.disabled = true;
    try {
      msg('फर्काउँदैछ…');
      await writeOv(function (all) { delete all[editKey]; }, 'Reset: ' + editKey);
      afterChange();
      ed.classList.remove('ae-open');
      toast('मूल स्थितिमा फर्कियो ✓');
    } catch (e) { msg((e && e.message) || 'भएन।', true); }
    finally { btn.disabled = false; }
  });

  /* ---------- सुरु ---------- */
  function loadOv() {
    return fetch(OV_FILE + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (j) { OV = j || {}; document.dispatchEvent(new CustomEvent('spg-ov-change')); applyPoem(); });
  }
  function init() {
    addBtn();
    var body = document.getElementById('modalBody'), modal = document.getElementById('poemModal');
    if (body) new MutationObserver(scheduleApply).observe(body, { childList: true, subtree: true });
    if (modal) new MutationObserver(scheduleApply).observe(modal, { attributes: true, attributeFilter: ['class'] });
    loadOv();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
