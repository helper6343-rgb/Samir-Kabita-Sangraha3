/* ===== about-login.js =====
   3-dot menu ma: "बारेमा" (editable), "सेटिङ" (password change, login bela matra), "लगइन".
   Login: मोबाइल नम्बर + पासवर्ड. Password le GitHub token lai encrypt garera rakhchha
   (data/admin.json). "बारेमा" ko jaankari data/about.json ma save hunchha — admin le
   ✏️ thichera text ra फोटो (crop/zoom sahit) badalna sakchha. */
(function () {
  /* ---------- Default vivaran (data/about.json nabhaye yehi dekhinchha) ---------- */
  var REPO = 'helper6343-rgb/Samir-Kabita-Sangraha3';
  var BRANCH = 'main';
  var DEFAULT_ABOUT = {
    appName: 'समीर साहित्य संग्रह',
    tagline: 'Kavita • Lekh • Gazal',
    logo: 'icons/icon-192x192.png',
    intro: 'कविता, लेख, गजल, मुक्तक र गीतहरूको मेरो निजी संग्रह। यहाँ मैले लेखेका रचनाहरू पढ्न, सेभ गर्न र साथीभाइसँग सेयर गर्न सकिन्छ।',
    name: 'समीर पंगेनी',
    points: [
      'शास्त्री दोस्रो वर्षमा अध्ययनरत (संस्कृत)',
      'कविता, उपन्यास र गीत लेख्छु',
      '"अन्धो प्रेम" शीर्षकको कृति लेख्ने योजना छ',
      'संस्कृत साहित्य, विशेष गरी कालिदासका कृति (मेघदूत, ऋतुसंहार) मन पर्छ',
      'अंग्रेजी बोल्न र लेख्न सिक्दैछु',
      'दक्षिण भारतीय हिन्दी डबिङ फिल्म हेर्न र सङ्गीत सुन्न मन पर्छ'
    ],
    website: 'https://sameerpangeni.com.np'
  };
  var ABOUT = Object.assign({}, DEFAULT_ABOUT);
  var TOKEN_KEY = 'spg_admin_token';
  var PHONE_KEY = 'spg_admin_phone';
  var EDIT_MODE_KEY = 'spg_edit_mode';
  var ADMIN_FILE = 'data/admin.json';
  var ABOUT_FILE = 'data/about.json';
  var PBKDF2_ITER = 250000;

  /* ---------- CSS ---------- */
  var css = '\
.sp-ov{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:none;align-items:flex-end;justify-content:center}\
.sp-ov.sp-open{display:flex}\
.sp-sheet{position:relative;width:100%;max-width:560px;max-height:92vh;overflow:auto;background:#faf6f0;color:#1a1a2e;border-radius:22px 22px 0 0;padding:26px 22px calc(28px + env(safe-area-inset-bottom,0px));font-family:"Tiro Devanagari Hindi","Noto Sans Devanagari",serif}\
[data-theme="dark"] .sp-sheet{background:#1e1a2b;color:#eee}\
.sp-sheet [hidden]{display:none!important}\
.sp-x{position:absolute;right:14px;top:12px;border:0;background:none;font-size:22px;color:inherit;cursor:pointer;padding:6px;z-index:2}\
.sp-edit{position:absolute;left:14px;top:12px;border:0;background:rgba(0,0,0,.06);width:34px;height:34px;border-radius:50%;font-size:16px;cursor:pointer;z-index:2;display:none}\
body.spg-admin .sp-edit{display:block}\
.sp-logo{display:block;width:92px;height:92px;border-radius:50%;margin:4px auto 12px;box-shadow:0 8px 18px -6px rgba(0,0,0,.45);object-fit:cover}\
.sp-sheet h2{text-align:center;margin:0;font-size:22px;font-weight:700}\
.sp-sub{text-align:center;margin:4px 0 16px;font-size:13px;opacity:.7;letter-spacing:.5px}\
.sp-divider{width:120px;height:1px;background:rgba(232,196,122,.6);margin:16px auto 18px}\
.sp-sheet h3{margin:20px 0 10px;font-size:17px;font-weight:700;text-align:center}\
.sp-sheet p{line-height:2;margin:0 0 8px;font-size:16px;text-align:justify}\
.sp-sheet ul{margin:0;padding:0;list-style:none}\
.sp-sheet ul li{line-height:1.85;font-size:15.5px;padding:7px 0 7px 26px;position:relative;border-bottom:1px dashed rgba(0,0,0,.08)}\
[data-theme="dark"] .sp-sheet ul li{border-color:rgba(255,255,255,.1)}\
.sp-sheet ul li::before{content:"✦";position:absolute;left:0;color:#e8710a;font-size:13px;top:9px}\
.sp-link{display:block;margin-top:18px;text-align:center;color:#e8710a;font-weight:600;text-decoration:none}\
.sp-input{display:block;width:100%;margin-top:10px;padding:13px 14px;border-radius:12px;border:1px solid #cfc7bd;font-size:16px;background:#fff;color:#111;box-sizing:border-box;font-family:inherit}\
textarea.sp-input{min-height:88px;line-height:1.7;resize:vertical}\
.sp-sheet label{display:block;margin:14px 0 0;font-size:13.5px;font-weight:600;opacity:.85}\
.sp-btn{width:100%;margin-top:14px;padding:14px;border:0;border-radius:12px;background:#1a2547;color:#fff;font-size:17px;font-weight:600;cursor:pointer;font-family:inherit}\
.sp-btn:disabled{opacity:.6}\
.sp-linkbtn{display:block;width:100%;margin-top:12px;padding:8px;border:0;background:none;color:#e8710a;font-size:15px;cursor:pointer;text-decoration:underline;font-family:inherit}\
.sp-msg{margin-top:10px;font-size:14px;min-height:20px;line-height:1.6}\
.sp-msg.err{color:#d32f2f}.sp-msg.ok{color:#2e7d32}\
.sp-note{font-size:12.5px;line-height:1.7;opacity:.7;margin:10px 0 0}\
.sp-help{margin-top:14px;font-size:14px;line-height:1.8}\
.sp-help summary{cursor:pointer;font-weight:600}\
.sp-help ol{padding-left:20px;margin:8px 0 0}\
.sp-photo-row{display:flex;align-items:center;gap:14px;margin-top:10px}\
.sp-photo-row img{width:64px;height:64px;border-radius:50%;object-fit:cover;background:#ddd}\
.sp-photo-row button{flex:1;padding:11px;border-radius:10px;border:1px solid #cfc7bd;background:#fff;font-size:14px;cursor:pointer;font-family:inherit}\
.sp-crop-wrap{max-height:48vh;overflow:hidden;border-radius:14px;background:#111}\
.sp-crop-wrap img{display:block;max-width:100%}\
.sp-crop-wrap .cropper-view-box,.sp-crop-wrap .cropper-face{border-radius:50%}\
.sp-zoom-row{display:flex;align-items:center;gap:10px;margin-top:14px}\
.sp-zoom-row input[type=range]{flex:1}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- Helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  function overlay(id, html) {
    var ov = document.createElement('div');
    ov.className = 'sp-ov'; ov.id = id;
    ov.innerHTML = html;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(ov); });
    document.body.appendChild(ov);
    return ov;
  }
  function open(ov) { closeMenu(); ov.classList.add('sp-open'); }
  function close(ov) { ov.classList.remove('sp-open'); }
  function closeMenu() {
    var m = document.getElementById('dropdownMenu');
    if (m) ['open', 'show', 'active', 'visible'].forEach(function (c) { m.classList.remove(c); });
  }

  /* ---------- Crypto: password le token lai lock garne ---------- */
  var te = new TextEncoder(), td = new TextDecoder();
  function toB64(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
  function fromB64(b) { var s = atob(b), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  async function sha256hex(str) {
    var d = await crypto.subtle.digest('SHA-256', te.encode(str));
    return Array.from(new Uint8Array(d)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  async function deriveKey(secret, salt, iter) {
    var km = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, km,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function sealToken(token, phone, pass) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(phone + ':' + pass, salt, PBKDF2_ITER);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, te.encode(token));
    return { v: 1, pid: await sha256hex('spg:' + phone), iter: PBKDF2_ITER, salt: toB64(salt), iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
  }
  async function openToken(blob, phone, pass) {
    if (blob.pid !== await sha256hex('spg:' + phone)) throw new Error('phone');
    var key = await deriveKey(phone + ':' + pass, fromB64(blob.salt), blob.iter);
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(blob.iv) }, key, fromB64(blob.ct));
    return td.decode(pt);
  }
  function enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function dec(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, '')))); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'b' + (h >>> 0).toString(36); }

  /* ---------- GitHub ---------- */
  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function phoneNum() { try { return localStorage.getItem(PHONE_KEY) || ''; } catch (e) { return ''; } }
  function setPhone(p) { try { p ? localStorage.setItem(PHONE_KEY, p) : localStorage.removeItem(PHONE_KEY); } catch (e) {} }
  function editMode() { try { return localStorage.getItem(EDIT_MODE_KEY) === '1'; } catch (e) { return false; } }
  function setEditMode(v) { try { v ? localStorage.setItem(EDIT_MODE_KEY, '1') : localStorage.removeItem(EDIT_MODE_KEY); } catch (e) {} }
  function ghHeaders(t) { return { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' }; }
  function ghUrl(path) { return 'https://api.github.com/repos/' + REPO + '/contents/' + path; }
  async function ghGet(path, t) {
    var r = await fetch(ghUrl(path) + '?ref=' + BRANCH, { headers: ghHeaders(t), cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('GitHub ' + r.status);
    return r.json();
  }
  function ghPut(path, b64, message, sha, t) {
    var body = { message: message, content: b64, branch: BRANCH };
    if (sha) body.sha = sha;
    return fetch(ghUrl(path), { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders(t)), body: JSON.stringify(body) });
  }
  async function verify(t) {
    var r = await fetch('https://api.github.com/repos/' + REPO, { headers: ghHeaders(t) });
    if (r.status === 401) throw new Error('Token मिलेन वा सकिएको छ।');
    if (!r.ok) throw new Error('Repository भेटिएन वा अनुमति छैन।');
    var j = await r.json();
    if (!(j.permissions && j.permissions.push)) throw new Error('यो token ले फाइल परिवर्तन गर्न मिल्दैन। Contents: Read and write दिनुस्।');
  }
  function isLoggedIn() { return !!token(); }

  /* =====================================================================
     बारेमा (About) — editable, logo crop/zoom
     ===================================================================== */
  var aboutOv = overlay('spAbout', '');
  function renderAbout() {
    aboutOv.innerHTML =
      '<div class="sp-sheet">' +
      '<button class="sp-x" aria-label="बन्द">✕</button>' +
      '<button class="sp-edit" id="spAboutEditBtn" aria-label="सम्पादन" title="सम्पादन">✏️</button>' +
      '<img class="sp-logo" src="' + esc(ABOUT.logo) + '" alt="' + esc(ABOUT.appName) + '">' +
      '<h2>' + esc(ABOUT.appName) + '</h2>' +
      '<div class="sp-sub">' + esc(ABOUT.tagline) + '</div>' +
      '<div class="sp-divider"></div>' +
      '<p>' + esc(ABOUT.intro) + '</p>' +
      '<h3>लेखकको बारेमा — ' + esc(ABOUT.name) + '</h3>' +
      '<ul>' + ABOUT.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
      '<a class="sp-link" href="' + esc(ABOUT.website) + '" target="_blank" rel="noopener">' + esc(ABOUT.website.replace(/^https?:\/\//, '')) + '</a>' +
      '</div>';
    aboutOv.querySelector('.sp-x').addEventListener('click', function () { close(aboutOv); });
    aboutOv.querySelector('#spAboutEditBtn').addEventListener('click', openAboutEditor);
  }
  renderAbout();

  function loadAboutOverrides() {
    return fetch(ABOUT_FILE + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (j) {
        if (j && typeof j === 'object') {
          ABOUT = Object.assign({}, DEFAULT_ABOUT, j);
          if (!Array.isArray(ABOUT.points)) ABOUT.points = DEFAULT_ABOUT.points;
          renderAbout();
        }
      });
  }

  /* ---------- Lazy-load Cropper.js (फोटो crop/zoom को लागि) ---------- */
  function loadCropper() {
    if (window.Cropper) return Promise.resolve();
    if (loadCropper._p) return loadCropper._p;
    loadCropper._p = new Promise(function (res, rej) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css';
      document.head.appendChild(link);
      var sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';
      sc.onload = function () { res(); };
      sc.onerror = function () { rej(new Error('फोटो मिलाउने टूल लोड भएन। इन्टरनेट जाँच्नुस्।')); };
      document.head.appendChild(sc);
    });
    return loadCropper._p;
  }

  /* ---------- Crop overlay ---------- */
  var cropOv = overlay('spCrop',
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>फोटो मिलाउनुस्</h2>' +
    '<div class="sp-sub">तान्नुस् र जुम गरेर मिलाउनुस्</div>' +
    '<div class="sp-crop-wrap" id="spCropWrap"><img id="spCropImg"></div>' +
    '<div class="sp-zoom-row">🔍<input type="range" id="spCropZoom" min="0" max="2" step="0.01" value="0"></div>' +
    '<button class="sp-btn" id="spCropSave">यो फोटो राख्नुस्</button>' +
    '<div class="sp-msg" id="spCropMsg"></div>' +
    '</div>');
  var cropper = null, cropResolve = null, cropReject = null;
  cropOv.querySelector('.sp-x').addEventListener('click', function () {
    if (cropper) { cropper.destroy(); cropper = null; }
    close(cropOv);
    if (cropReject) cropReject(new Error('cancelled'));
  });
  cropOv.querySelector('#spCropZoom').addEventListener('input', function () {
    if (cropper) cropper.zoomTo(parseFloat(this.value));
  });
  cropOv.querySelector('#spCropSave').addEventListener('click', function () {
    var m = cropOv.querySelector('#spCropMsg');
    if (!cropper) return;
    m.textContent = '';
    var canvas = cropper.getCroppedCanvas({ width: 480, height: 480, imageSmoothingQuality: 'high' });
    canvas.toBlob(function (blob) {
      if (!blob) { m.className = 'sp-msg err'; m.textContent = 'फोटो तयार भएन।'; return; }
      cropper.destroy(); cropper = null; close(cropOv);
      if (cropResolve) cropResolve(blob);
    }, 'image/jpeg', 0.9);
  });

  /* file (chosen by user) -> crop/zoom UI -> JPEG Blob */
  function cropPhoto(file) {
    return loadCropper().then(function () {
      return new Promise(function (resolve, reject) {
        cropResolve = resolve; cropReject = reject;
        var img = cropOv.querySelector('#spCropImg');
        var url = URL.createObjectURL(file);
        img.onload = function () {
          open(cropOv);
          cropOv.querySelector('#spCropZoom').value = 0;
          if (cropper) cropper.destroy();
          cropper = new Cropper(img, {
            aspectRatio: 1, viewMode: 1, autoCropArea: 1, background: false,
            guides: false, center: false, highlight: false,
            cropBoxMovable: false, cropBoxResizable: false, toggleDragModeOnDblclick: false,
            zoomOnWheel: true, ready: function () { URL.revokeObjectURL(url); }
          });
        };
        img.src = url;
      });
    });
  }

  /* ---------- बारेमा सम्पादन ---------- */
  var aEditOv = overlay('spAboutEdit',
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>✏️ बारेमा सम्पादन</h2>' +
    '<label>फोटो</label>' +
    '<div class="sp-photo-row"><img id="aaLogoPrev" src=""><button type="button" id="aaPhotoBtn">फोटो बदल्नुस्</button></div>' +
    '<input type="file" id="aaPhotoFile" accept="image/*" hidden>' +
    '<label for="aaApp">एपको नाम</label><input class="sp-input" id="aaApp" type="text">' +
    '<label for="aaTag">ट्यागलाइन</label><input class="sp-input" id="aaTag" type="text">' +
    '<label for="aaIntro">परिचय</label><textarea class="sp-input" id="aaIntro"></textarea>' +
    '<label for="aaName">लेखकको नाम</label><input class="sp-input" id="aaName" type="text">' +
    '<label for="aaPoints">विशेषताहरू (हरेक लाइनमा एउटा)</label><textarea class="sp-input" id="aaPoints" style="min-height:140px"></textarea>' +
    '<label for="aaSite">वेबसाइट</label><input class="sp-input" id="aaSite" type="text">' +
    '<button class="sp-btn" id="aaSave">सेभ गर्नुस्</button>' +
    '<div class="sp-msg" id="aaMsg"></div>' +
    '</div>');
  var $$ = function (s) { return aEditOv.querySelector(s); };
  var pendingLogoBlob = null, pendingLogoUrl = null;

  aEditOv.querySelector('.sp-x').addEventListener('click', function () { close(aEditOv); });
  $$('#aaPhotoBtn').addEventListener('click', function () { $$('#aaPhotoFile').click(); });
  $$('#aaPhotoFile').addEventListener('change', async function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    try {
      var blob = await cropPhoto(f);
      pendingLogoBlob = blob;
      if (pendingLogoUrl) URL.revokeObjectURL(pendingLogoUrl);
      pendingLogoUrl = URL.createObjectURL(blob);
      $$('#aaLogoPrev').src = pendingLogoUrl;
    } catch (e) { /* cancel bhayo, kehi nagarne */ }
  });

  function openAboutEditor() {
    if (!isLoggedIn()) { toast('पहिले लगइन गर्नुस्'); return; }
    pendingLogoBlob = null;
    $$('#aaLogoPrev').src = ABOUT.logo;
    $$('#aaApp').value = ABOUT.appName;
    $$('#aaTag').value = ABOUT.tagline;
    $$('#aaIntro').value = ABOUT.intro;
    $$('#aaName').value = ABOUT.name;
    $$('#aaPoints').value = ABOUT.points.join('\n');
    $$('#aaSite').value = ABOUT.website;
    $$('#aaMsg').textContent = '';
    close(aboutOv);
    open(aEditOv);
  }

  function b64FromBlob(blob) {
    return new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result.split(',')[1]); };
      fr.readAsDataURL(blob);
    });
  }

  $$('#aaSave').addEventListener('click', async function () {
    var m = $$('#aaMsg');
    var t = token();
    if (!t) { m.className = 'sp-msg err'; m.textContent = 'पहिले लगइन गर्नुस्।'; return; }
    var btn = this; btn.disabled = true;
    try {
      var next = Object.assign({}, ABOUT, {
        appName: $$('#aaApp').value.trim() || DEFAULT_ABOUT.appName,
        tagline: $$('#aaTag').value.trim(),
        intro: $$('#aaIntro').value.trim(),
        name: $$('#aaName').value.trim(),
        points: $$('#aaPoints').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
        website: $$('#aaSite').value.trim() || DEFAULT_ABOUT.website
      });

      if (pendingLogoBlob) {
        m.textContent = 'फोटो अपलोड हुँदैछ…';
        var b64 = await b64FromBlob(pendingLogoBlob);
        var path = 'covers/about/logo-' + Date.now() + '.jpg';
        var r1 = await ghPut(path, b64, 'About photo update', null, t);
        if (!r1.ok) throw new Error('फोटो अपलोड भएन (' + r1.status + ')');
        next.logo = path;
      }

      m.textContent = 'सेभ हुँदैछ…';
      var ok = false;
      for (var i = 0; i < 3 && !ok; i++) {
        var ex = await ghGet(ABOUT_FILE, t);
        var r2 = await ghPut(ABOUT_FILE, enc(JSON.stringify(next, null, 2)), 'Update about info', ex && ex.sha, t);
        if (r2.ok) ok = true;
        else if (r2.status !== 409 && r2.status !== 422) throw new Error('सेभ भएन (' + r2.status + ')');
      }
      if (!ok) throw new Error('सेभ भएन, फेरि प्रयास गर्नुस्।');

      ABOUT = next;
      renderAbout();
      pendingLogoBlob = null;
      m.textContent = '';
      close(aEditOv);
      toast('बारेमा सेभ भयो ✓ (१-२ मिनेटमा सबैले देख्छन्)');
    } catch (e) {
      m.className = 'sp-msg err'; m.textContent = (e && e.message) || 'सेभ भएन।';
    } finally { btn.disabled = false; }
  });

  /* =====================================================================
     लगइन / पहिलो पटक सेटअप
     ===================================================================== */
  var loginOv = overlay('spLogin',
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2 id="spTitle">🔐 लगइन</h2>' +
    '<div class="sp-sub">केवल साइटका मालिकका लागि</div>' +

    '<div id="spFormLogin">' +
    '<input class="sp-input" id="spPhone" type="tel" inputmode="numeric" maxlength="10" placeholder="मोबाइल नम्बर" autocomplete="username">' +
    '<input class="sp-input" id="spPass" type="password" placeholder="पासवर्ड" autocomplete="current-password">' +
    '<button class="sp-btn" id="spLoginBtn">लगइन गर्नुस्</button>' +
    '<button class="sp-linkbtn" id="spToSetup">पासवर्ड बिर्सनुभयो? / पहिलो पटक सेटअप</button>' +
    '</div>' +

    '<div id="spFormSetup" hidden>' +
    '<input class="sp-input" id="spPhone2" type="tel" inputmode="numeric" maxlength="10" placeholder="मोबाइल नम्बर">' +
    '<input class="sp-input" id="spPass2" type="password" placeholder="नयाँ पासवर्ड (कम्तीमा ८ अक्षर)" autocomplete="new-password">' +
    '<input class="sp-input" id="spPass3" type="password" placeholder="पासवर्ड फेरि लेख्नुस्" autocomplete="new-password">' +
    '<input class="sp-input" id="spToken" type="password" placeholder="GitHub Token टाँस्नुस्" autocomplete="off" autocapitalize="off" spellcheck="false">' +
    '<button class="sp-btn" id="spSetupBtn">पासवर्ड सेट गर्नुस्</button>' +
    '<button class="sp-linkbtn" id="spToLogin">← लगइनमा फर्कनुस्</button>' +
    '<p class="sp-note">पासवर्ड बिर्सिएमा वा पहिलो पटक: GitHub को नयाँ token चाहिन्छ। Token भएकै मान्छेले मात्र पासवर्ड बदल्न सक्छ, त्यसैले यो सुरक्षित छ।</p>' +
    '<details class="sp-help"><summary>Token कसरी बनाउने?</summary><ol>' +
    '<li>GitHub → Settings → Developer settings</li>' +
    '<li>Personal access tokens → Fine-grained tokens → Generate new token</li>' +
    '<li>Repository access: केवल <b>Samir-Kabita-Sangraha3</b> छान्नुस्</li>' +
    '<li>Permissions → Contents: <b>Read and write</b></li>' +
    '<li>Generate गरेर आएको token यहाँ टाँस्नुस्</li></ol></details>' +
    '</div>' +
    '<div class="sp-msg" id="spMsg"></div>' +
    '</div>');
  loginOv.querySelector('.sp-x').addEventListener('click', function () { close(loginOv); });
  var $ = function (s) { return loginOv.querySelector(s); };
  var msg = $('#spMsg');
  function say(t, kind) { msg.className = 'sp-msg' + (kind ? ' ' + kind : ''); msg.textContent = t || ''; }
  function mode(setup) {
    $('#spFormLogin').hidden = setup; $('#spFormSetup').hidden = !setup;
    $('#spTitle').textContent = setup ? '🔑 पासवर्ड सेटअप' : '🔐 लगइन';
    say('');
  }
  $('#spToSetup').addEventListener('click', function () { mode(true); });
  $('#spToLogin').addEventListener('click', function () { mode(false); });
  function validPhone(p) { return /^\d{10}$/.test(p); }

  function finish(t, phone) {
    setToken(t);
    if (phone) setPhone(phone);
    ['#spPass', '#spPass2', '#spPass3', '#spToken'].forEach(function (s) { $(s).value = ''; });
    say(''); close(loginOv); refreshMenu();
    document.body.classList.add('spg-admin');
    toast('लगइन भयो ✓');
    document.dispatchEvent(new CustomEvent('spg-admin-change'));
  }

  $('#spLoginBtn').addEventListener('click', async function () {
    var phone = $('#spPhone').value.trim(), pass = $('#spPass').value;
    if (!validPhone(phone)) return say('१० अङ्कको मोबाइल नम्बर लेख्नुस्।', 'err');
    if (!pass) return say('पासवर्ड लेख्नुस्।', 'err');
    var btn = this; btn.disabled = true; say('जाँच हुँदैछ…');
    try {
      var blob;
      try {
        var r = await fetch(ADMIN_FILE + '?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('none');
        blob = await r.json();
      } catch (e) { return say('पासवर्ड अझै सेट भएको छैन। "पहिलो पटक सेटअप" बाट सुरु गर्नुस्।', 'err'); }
      var tok;
      try { tok = await openToken(blob, phone, pass); }
      catch (e) { return say('मोबाइल नम्बर वा पासवर्ड मिलेन।', 'err'); }
      try { await verify(tok); }
      catch (e) { return say('सुरक्षा कुञ्जी (token) सकिएछ। "पासवर्ड बिर्सनुभयो?" बाट नयाँ token राखेर फेरि सेट गर्नुस्।', 'err'); }
      finish(tok, phone);
    } finally { btn.disabled = false; }
  });

  $('#spSetupBtn').addEventListener('click', async function () {
    var phone = $('#spPhone2').value.trim(), p1 = $('#spPass2').value, p2 = $('#spPass3').value, tok = $('#spToken').value.trim();
    if (!validPhone(phone)) return say('१० अङ्कको मोबाइल नम्बर लेख्नुस्।', 'err');
    if (p1.length < 8) return say('पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।', 'err');
    if (p1 !== p2) return say('दुवै पासवर्ड मिलेन।', 'err');
    if (!tok) return say('GitHub Token टाँस्नुस्।', 'err');
    var btn = this; btn.disabled = true; say('जाँच हुँदैछ…');
    try {
      await verify(tok);
      say('सुरक्षित गर्दैछ…');
      var blob = await sealToken(tok, phone, p1);
      var ex = await ghGet(ADMIN_FILE, tok);
      var r = await ghPut(ADMIN_FILE, enc(JSON.stringify(blob, null, 2)), 'Set admin login', ex && ex.sha, tok);
      if (!r.ok) throw new Error('सेभ भएन (' + r.status + ')');
      finish(tok, phone);
    } catch (e) {
      say((e && e.message) || 'सेटअप भएन।', 'err');
    } finally { btn.disabled = false; }
  });

  /* =====================================================================
     सेटिङ: पासवर्ड बदल्ने
     ===================================================================== */
  var settingsOv = overlay('spSettings',
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>⚙️ सेटिङ</h2>' +
    '<div class="sp-sub">पासवर्ड बदल्नुस्</div>' +
    '<input class="sp-input" id="spNewPass1" type="password" placeholder="नयाँ पासवर्ड (कम्तीमा ८ अक्षर)" autocomplete="new-password">' +
    '<input class="sp-input" id="spNewPass2" type="password" placeholder="नयाँ पासवर्ड फेरि लेख्नुस्" autocomplete="new-password">' +
    '<button class="sp-btn" id="spChangePassBtn">पासवर्ड बदल्नुस्</button>' +
    '<div class="sp-msg" id="spSetMsg"></div>' +
    '</div>');
  settingsOv.querySelector('.sp-x').addEventListener('click', function () { close(settingsOv); });
  var $$$ = function (s) { return settingsOv.querySelector(s); };
  $$$('#spChangePassBtn').addEventListener('click', async function () {
    var m = $$$('#spSetMsg'), p1 = $$$('#spNewPass1').value, p2 = $$$('#spNewPass2').value;
    m.className = 'sp-msg'; m.textContent = '';
    if (p1.length < 8) { m.className = 'sp-msg err'; m.textContent = 'पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।'; return; }
    if (p1 !== p2) { m.className = 'sp-msg err'; m.textContent = 'दुवै पासवर्ड मिलेन।'; return; }
    var btn = this; btn.disabled = true; m.textContent = 'बदल्दैछ…';
    try {
      await changePassword(p1);
      $$$('#spNewPass1').value = ''; $$$('#spNewPass2').value = '';
      m.textContent = ''; close(settingsOv);
      toast('पासवर्ड बदलियो ✓');
    } catch (e) { m.className = 'sp-msg err'; m.textContent = (e && e.message) || 'बदलिएन।'; }
    finally { btn.disabled = false; }
  });
  async function changePassword(newPass) {
    var t = token(), phone = phoneNum();
    if (!t || !phone) throw new Error('फेरि लगइन गर्नुस्।');
    var blob = await sealToken(t, phone, newPass);
    var ex = await ghGet(ADMIN_FILE, t);
    var r = await ghPut(ADMIN_FILE, enc(JSON.stringify(blob, null, 2)), 'Change password', ex && ex.sha, t);
    if (!r.ok) throw new Error('सेभ भएन (' + r.status + ')');
  }

  /* =====================================================================
     3-dot menu मा item थप्ने
     ===================================================================== */
  var aboutLink, loginLink, settingsLink, editModeLink, addPostLink;
  function refreshMenu() {
    if (!loginLink) return;
    loginLink.innerHTML = token() ? '🔓 <span>लगआउट</span>' : '🔐 <span>लगइन</span>';
    var li = isLoggedIn();
    if (settingsLink) settingsLink.style.display = li ? '' : 'none';
    if (editModeLink) editModeLink.style.display = li ? '' : 'none';
    document.body.classList.toggle('spg-admin', li);
    var em = li && editMode();
    document.body.classList.toggle('spg-edit-mode', em);
    if (editModeLink) editModeLink.innerHTML = em ? '✅ <span>सम्पादन मोड: चालू</span>' : '✏️ <span>सम्पादन मोड: बन्द</span>';
    if (addPostLink) addPostLink.style.display = em ? '' : 'none';
  }
  function buildMenu() {
    var menu = document.getElementById('dropdownMenu');
    if (!menu || document.getElementById('spMenuAbout')) return;
    var divider = menu.querySelector('.menu-divider');

    aboutLink = document.createElement('a');
    aboutLink.href = '#'; aboutLink.id = 'spMenuAbout';
    aboutLink.innerHTML = 'ℹ️ <span>बारेमा</span>';
    aboutLink.addEventListener('click', function (e) { e.preventDefault(); open(aboutOv); });

    settingsLink = document.createElement('a');
    settingsLink.href = '#'; settingsLink.id = 'spMenuSettings';
    settingsLink.innerHTML = '⚙️ <span>सेटिङ</span>';
    settingsLink.addEventListener('click', function (e) { e.preventDefault(); open(settingsOv); });

    editModeLink = document.createElement('a');
    editModeLink.href = '#'; editModeLink.id = 'spMenuEditMode';
    editModeLink.addEventListener('click', function (e) {
      e.preventDefault();
      setEditMode(!editMode());
      refreshMenu();
      toast(editMode() ? 'सम्पादन मोड चालू भयो' : 'सम्पादन मोड बन्द भयो');
    });

    addPostLink = document.createElement('a');
    addPostLink.href = '#'; addPostLink.id = 'spMenuAddPost';
    addPostLink.innerHTML = '➕ <span>नयाँ रचना थप्नुस्</span>';
    addPostLink.addEventListener('click', function (e) {
      e.preventDefault(); closeMenu();
      if (window.SPG_NEWPOST) window.SPG_NEWPOST.open();
      else toast('लोड हुँदैछ, फेरि प्रयास गर्नुस्');
    });

    loginLink = document.createElement('a');
    loginLink.href = '#'; loginLink.id = 'spMenuLogin';
    loginLink.addEventListener('click', function (e) {
      e.preventDefault();
      if (token()) {
        if (confirm('लगआउट गर्ने हो?')) {
          setToken(''); setPhone('');
          refreshMenu(); closeMenu(); toast('लगआउट भयो');
          document.dispatchEvent(new CustomEvent('spg-admin-change'));
        }
      } else { mode(false); open(loginOv); }
    });

    if (divider) {
      menu.insertBefore(aboutLink, divider);
      menu.insertBefore(settingsLink, divider);
      menu.insertBefore(editModeLink, divider);
      menu.insertBefore(addPostLink, divider);
      menu.insertBefore(loginLink, divider);
    } else {
      menu.appendChild(aboutLink); menu.appendChild(settingsLink);
      menu.appendChild(editModeLink); menu.appendChild(addPostLink); menu.appendChild(loginLink);
    }
    refreshMenu();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildMenu);
  else buildMenu();
  document.addEventListener('spg-admin-change', refreshMenu);
  loadAboutOverrides();

  /* ⋮ मेनु: एप खुल्दा केही बेर आफैं देखिने समस्या नआओस् भनेर, सुरुमा जबरजस्ती बन्द */
  closeMenu();
  [0, 50, 200, 500, 1200].forEach(function (ms) { setTimeout(closeMenu, ms); });
  window.addEventListener('load', closeMenu);

  /* ⋮ मेनु: scroll गर्दा र बाहिर touch गर्दा आफैं बन्द होस् */
  window.addEventListener('scroll', closeMenu, { passive: true });
  document.addEventListener('click', function (e) {
    var menu = document.getElementById('dropdownMenu');
    var btn = document.getElementById('menuBtn');
    if (!menu) return;
    if (menu.contains(e.target)) return;
    if (btn && btn.contains(e.target)) return;
    closeMenu();
  }, true);

  /* Aarko step (edit / cover) le yehi use garchha */
  window.SPG_ADMIN = {
    repo: REPO, branch: BRANCH,
    isLoggedIn: isLoggedIn,
    token: token,
    get: function (p) { return ghGet(p, token()); },
    put: function (p, b64, m, sha) { return ghPut(p, b64, m, sha, token()); },
    enc: enc, dec: dec, hash: hash,
    _seal: sealToken, _open: openToken
  };
})();
