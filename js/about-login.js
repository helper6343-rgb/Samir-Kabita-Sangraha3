/* ===== about-login.js =====
   3-dot menu ma: "बारेमा" (app ko logo + mero vivaran) ra "लगइन" (admin) thapchha.
   Login: GitHub token le. Token bhayeko manche (tapai) matra site ko file badalna sakchha. */
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

  /* ---------- CSS ---------- */
  var css = '\
.sp-ov{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:none;align-items:flex-end;justify-content:center}\
.sp-ov.sp-open{display:flex}\
.sp-sheet{position:relative;width:100%;max-width:560px;max-height:88vh;overflow:auto;background:#faf6f0;color:#1a1a2e;border-radius:22px 22px 0 0;padding:26px 22px calc(28px + env(safe-area-inset-bottom,0px));font-family:"Noto Sans Devanagari","Tiro Devanagari Hindi",sans-serif}\
[data-theme="dark"] .sp-sheet{background:#1e1a2b;color:#eee}\
.sp-x{position:absolute;right:14px;top:12px;border:0;background:none;font-size:22px;color:inherit;cursor:pointer;padding:6px}\
.sp-logo{display:block;width:92px;height:92px;border-radius:50%;margin:4px auto 12px;box-shadow:0 8px 18px -6px rgba(0,0,0,.45)}\
.sp-sheet h2{text-align:center;margin:0;font-size:22px}\
.sp-sub{text-align:center;margin:4px 0 16px;font-size:13px;opacity:.7;letter-spacing:.5px}\
.sp-sheet h3{margin:20px 0 8px;font-size:17px}\
.sp-sheet p{line-height:1.9;margin:0 0 8px;font-size:16px}\
.sp-sheet ul{margin:0;padding-left:20px;line-height:2;font-size:16px}\
.sp-link{display:block;margin-top:18px;text-align:center;color:#e8710a;font-weight:600;text-decoration:none}\
.sp-input{width:100%;padding:13px 14px;border-radius:12px;border:1px solid #cfc7bd;font-size:16px;background:#fff;color:#111;box-sizing:border-box}\
.sp-btn{width:100%;margin-top:12px;padding:14px;border:0;border-radius:12px;background:#1a2547;color:#fff;font-size:17px;font-weight:600;cursor:pointer}\
.sp-btn.sp-alt{background:#e8710a}\
.sp-msg{margin-top:10px;font-size:14px;min-height:20px}\
.sp-msg.err{color:#d32f2f}.sp-msg.ok{color:#2e7d32}\
.sp-help{margin-top:16px;font-size:14px;line-height:1.8}\
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

  /* ---------- बारेमा ---------- */
  var aboutOv = overlay('spAbout',
    '<img class="sp-logo" src="' + esc(ABOUT.logo) + '" alt="' + esc(ABOUT.appName) + '">' +
    '<h2>' + esc(ABOUT.appName) + '</h2>' +
    '<div class="sp-sub">' + esc(ABOUT.tagline) + '</div>' +
    '<p>' + esc(ABOUT.intro) + '</p>' +
    '<h3>लेखकको बारेमा — ' + esc(ABOUT.name) + '</h3>' +
    '<ul>' + ABOUT.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
    '<a class="sp-link" href="' + esc(ABOUT.website) + '" target="_blank" rel="noopener">' + esc(ABOUT.website.replace('https://', '')) + '</a>');

  /* ---------- लगइन ---------- */
  var loginOv = overlay('spLogin',
    '<h2>🔐 लगइन</h2>' +
    '<div class="sp-sub">केवल साइटका मालिकका लागि</div>' +
    '<input class="sp-input" id="spToken" type="password" placeholder="GitHub Token टाँस्नुस्" autocomplete="off" autocapitalize="off" spellcheck="false">' +
    '<button class="sp-btn" id="spLoginBtn">लगइन गर्नुस्</button>' +
    '<div class="sp-msg" id="spMsg"></div>' +
    '<details class="sp-help"><summary>Token कसरी बनाउने?</summary><ol>' +
    '<li>GitHub → Settings → Developer settings</li>' +
    '<li>Personal access tokens → Fine-grained tokens → Generate new token</li>' +
    '<li>Repository access: केवल <b>Samir-Kabita-Sangraha3</b> छान्नुस्</li>' +
    '<li>Permissions → Contents: <b>Read and write</b></li>' +
    '<li>Generate गरेर आएको token यहाँ टाँस्नुस्</li></ol></details>');

  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  async function verify(t) {
    var r = await fetch('https://api.github.com/repos/' + REPO, {
      headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' }
    });
    if (r.status === 401) throw new Error('Token मिलेन। फेरि जाँच्नुस्।');
    if (!r.ok) throw new Error('Repository भेटिएन वा अनुमति छैन।');
    var j = await r.json();
    if (!(j.permissions && j.permissions.push)) throw new Error('यो token ले फाइल परिवर्तन गर्न मिल्दैन। Contents: Read and write दिनुस्।');
  }

  var msg = loginOv.querySelector('#spMsg');
  loginOv.querySelector('#spLoginBtn').addEventListener('click', async function () {
    var t = loginOv.querySelector('#spToken').value.trim();
    if (!t) { msg.className = 'sp-msg err'; msg.textContent = 'Token टाँस्नुस्।'; return; }
    msg.className = 'sp-msg'; msg.textContent = 'जाँच हुँदैछ…';
    try {
      await verify(t);
      setToken(t);
      loginOv.querySelector('#spToken').value = '';
      msg.textContent = '';
      close(loginOv);
      refreshMenu();
      toast('लगइन भयो ✓');
      document.dispatchEvent(new CustomEvent('spg-admin-change'));
    } catch (e) {
      msg.className = 'sp-msg err';
      msg.textContent = (e && e.message) || 'लगइन भएन।';
    }
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
      } else open(loginOv);
    });

    if (divider) { menu.insertBefore(aboutLink, divider); menu.insertBefore(loginLink, divider); }
    else { menu.appendChild(aboutLink); menu.appendChild(loginLink); }
    refreshMenu();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildMenu);
  else buildMenu();

  /* Aarko step (cover / lekh sudhar) le yehi use garchha */
  window.SPG_ADMIN = {
    repo: REPO, branch: BRANCH,
    isLoggedIn: function () { return !!token(); },
    token: token
  };
})();
