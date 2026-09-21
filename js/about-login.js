/* ===== about-login.js =====
   3-dot menu ma: "बारेमा" ra "लगइन".
   Login: मोबाइल नम्बर + पासवर्ड. Password le GitHub token lai encrypt garera rakhchha
   (data/admin.json). Password kahin plain text ma chhaina. */
(function () {
  /* ---------- Yaha aafno vivaran milaunus ---------- */
  var REPO = 'helper6343-rgb/Samir-Kabita-Sangraha3';
  var BRANCH = 'main';
  var ABOUT = {
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
  var TOKEN_KEY = 'spg_admin_token';
  var ADMIN_FILE = 'data/admin.json';
  var PBKDF2_ITER = 250000;

  /* ---------- CSS ---------- */
  var css = '\
.sp-ov{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:none;align-items:flex-end;justify-content:center}\
.sp-ov.sp-open{display:flex}\
.sp-sheet{position:relative;width:100%;max-width:560px;max-height:90vh;overflow:auto;background:#faf6f0;color:#1a1a2e;border-radius:22px 22px 0 0;padding:26px 22px calc(28px + env(safe-area-inset-bottom,0px));font-family:"Noto Sans Devanagari","Tiro Devanagari Hindi",sans-serif}\
[data-theme="dark"] .sp-sheet{background:#1e1a2b;color:#eee}\
.sp-sheet [hidden]{display:none!important}\
.sp-x{position:absolute;right:14px;top:12px;border:0;background:none;font-size:22px;color:inherit;cursor:pointer;padding:6px}\
.sp-logo{display:block;width:92px;height:92px;border-radius:50%;margin:4px auto 12px;box-shadow:0 8px 18px -6px rgba(0,0,0,.45)}\
.sp-sheet h2{text-align:center;margin:0;font-size:22px}\
.sp-sub{text-align:center;margin:4px 0 16px;font-size:13px;opacity:.7;letter-spacing:.5px}\
.sp-sheet h3{margin:20px 0 8px;font-size:17px}\
.sp-sheet p{line-height:1.9;margin:0 0 8px;font-size:16px}\
.sp-sheet ul{margin:0;padding-left:20px;line-height:2;font-size:16px}\
.sp-link{display:block;margin-top:18px;text-align:center;color:#e8710a;font-weight:600;text-decoration:none}\
.sp-input{display:block;width:100%;margin-top:10px;padding:13px 14px;border-radius:12px;border:1px solid #cfc7bd;font-size:16px;background:#fff;color:#111;box-sizing:border-box}\
.sp-btn{width:100%;margin-top:14px;padding:14px;border:0;border-radius:12px;background:#1a2547;color:#fff;font-size:17px;font-weight:600;cursor:pointer}\
.sp-btn:disabled{opacity:.6}\
.sp-linkbtn{display:block;width:100%;margin-top:12px;padding:8px;border:0;background:none;color:#e8710a;font-size:15px;cursor:pointer;text-decoration:underline}\
.sp-msg{margin-top:10px;font-size:14px;min-height:20px;line-height:1.6}\
.sp-msg.err{color:#d32f2f}.sp-msg.ok{color:#2e7d32}\
.sp-note{font-size:13px;line-height:1.7;opacity:.8;margin:10px 0 0}\
.sp-help{margin-top:14px;font-size:14px;line-height:1.8}\
.sp-help summary{cursor:pointer;font-weight:600}\
.sp-help ol{padding-left:20px;margin:8px 0 0}';
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
    ov.innerHTML = '<div class="sp-sheet"><button class="sp-x" aria-label="बन्द">✕</button>' + html + '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.sp-x')) close(ov); });
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

  /* ---------- बारेमा ---------- */
  var aboutOv = overlay('spAbout',
    '<img class="sp-logo" src="' + esc(ABOUT.logo) + '" alt="' + esc(ABOUT.appName) + '">' +
    '<h2>' + esc(ABOUT.appName) + '</h2>' +
    '<div class="sp-sub">' + esc(ABOUT.tagline) + '</div>' +
    '<p>' + esc(ABOUT.intro) + '</p>' +
    '<h3>लेखकको बारेमा — ' + esc(ABOUT.name) + '</h3>' +
    '<ul>' + ABOUT.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
    '<a class="sp-link" href="' + esc(ABOUT.website) + '" target="_blank" rel="noopener">' + esc(ABOUT.website.replace('https://', '')) + '</a>');

  /* ---------- लगइन / सेटअप ---------- */
  var loginOv = overlay('spLogin',
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
    '<div class="sp-msg" id="spMsg"></div>');

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

  function finish(t) {
    setToken(t);
    ['#spPass', '#spPass2', '#spPass3', '#spToken'].forEach(function (s) { $(s).value = ''; });
    say(''); close(loginOv); refreshMenu();
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
      finish(tok);
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
      finish(tok);
    } catch (e) {
      say((e && e.message) || 'सेटअप भएन।', 'err');
    } finally { btn.disabled = false; }
  });

  /* ---------- 3-dot menu मा item थप्ने ---------- */
  var aboutLink, loginLink;
  function refreshMenu() {
    if (!loginLink) return;
    loginLink.innerHTML = token() ? '🔓 <span>लगआउट</span>' : '🔐 <span>लगइन</span>';
  }
  function buildMenu() {
    var menu = document.getElementById('dropdownMenu');
    if (!menu || document.getElementById('spMenuAbout')) return;
    var divider = menu.querySelector('.menu-divider');

    aboutLink = document.createElement('a');
    aboutLink.href = '#'; aboutLink.id = 'spMenuAbout';
    aboutLink.innerHTML = 'ℹ️ <span>बारेमा</span>';
    aboutLink.addEventListener('click', function (e) { e.preventDefault(); open(aboutOv); });

    loginLink = document.createElement('a');
    loginLink.href = '#'; loginLink.id = 'spMenuLogin';
    loginLink.addEventListener('click', function (e) {
      e.preventDefault();
      if (token()) {
        if (confirm('लगआउट गर्ने हो?')) { setToken(''); refreshMenu(); closeMenu(); toast('लगआउट भयो'); document.dispatchEvent(new CustomEvent('spg-admin-change')); }
      } else { mode(false); open(loginOv); }
    });

    if (divider) { menu.insertBefore(aboutLink, divider); menu.insertBefore(loginLink, divider); }
    else { menu.appendChild(aboutLink); menu.appendChild(loginLink); }
    refreshMenu();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildMenu);
  else buildMenu();

  /* Aarko step (edit / cover) le yehi use garchha */
  window.SPG_ADMIN = {
    repo: REPO, branch: BRANCH,
    isLoggedIn: function () { return !!token(); },
    token: token,
    get: function (p) { return ghGet(p, token()); },
    put: function (p, b64, m, sha) { return ghPut(p, b64, m, sha, token()); },
    enc: enc, dec: dec, hash: hash,
    _seal: sealToken, _open: openToken
  };
})();
