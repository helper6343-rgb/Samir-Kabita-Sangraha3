/* ===== contact-message.js =====
   सबैलाई (login नगरिकन पनि) देखिने ⋮ मेनुको "सन्देश पठाउनुस्" फिचर।
   EmailJS (emailjs.com) प्रयोग गरेर सन्देश सिधै एपभित्रैबाट पठाउँछ —
   कतै arको app खोल्नु पर्दैन, "पठाउनुस्" थिचेपछि एपभित्रै "पठियो ✓" देखिन्छ।
   साँचो SMS होइन (त्यो paid SMS service बिना सम्भव छैन), तर यो इमेल
   भिजिटरले आफैं केही नखोली, एपभित्रै पठाउन मिल्छ। */
(function () {
  /* ⚠️ emailjs.com मा free account खोलेर यी ३ वटा राख्नुस् (हेर्नुस्: तलको नोट) */
  var EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
  var EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
  var EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

  function notConfigured() {
    return EMAILJS_PUBLIC_KEY.indexOf('YOUR_') === 0 ||
      EMAILJS_SERVICE_ID.indexOf('YOUR_') === 0 ||
      EMAILJS_TEMPLATE_ID.indexOf('YOUR_') === 0;
  }

  function toast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
  }

  function loadEmailJS() {
    if (window.emailjs) return Promise.resolve();
    if (loadEmailJS._p) return loadEmailJS._p;
    loadEmailJS._p = new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      sc.onload = function () { try { window.emailjs.init(EMAILJS_PUBLIC_KEY); res(); } catch (e) { rej(e); } };
      sc.onerror = function () { rej(new Error('पठाउने टूल लोड भएन। इन्टरनेट जाँच्नुस्।')); };
      document.head.appendChild(sc);
    });
    return loadEmailJS._p;
  }

  var ov = document.createElement('div');
  ov.className = 'sp-ov'; ov.id = 'cmSend';
  ov.innerHTML =
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>💬 सन्देश पठाउनुस्</h2>' +
    '<div class="sp-sub">तपाईंको सन्देश लेखकलाई सिधै पुग्छ</div>' +
    '<label for="cmName">तपाईंको नाम / इमेल</label>' +
    '<input class="sp-input" id="cmName" type="text" placeholder="जस्तै: Ram Shrestha, ram@gmail.com">' +
    '<label for="cmMsg">सन्देश</label>' +
    '<textarea class="sp-input" id="cmMsg" style="min-height:140px"></textarea>' +
    '<button class="sp-btn" id="cmSendBtn">पठाउनुस्</button>' +
    '<div class="sp-msg" id="cmMsgBox"></div>' +
    '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  ov.querySelector('.sp-x').addEventListener('click', close);
  function open() { ov.classList.add('sp-open'); }
  function close() { ov.classList.remove('sp-open'); }
  var $ = function (s) { return ov.querySelector(s); };

  $('#cmSendBtn').addEventListener('click', async function () {
    var name = $('#cmName').value.trim(), msg = $('#cmMsg').value.trim();
    var box = $('#cmMsgBox');
    if (!name) { box.className = 'sp-msg err'; box.textContent = 'नाम वा इमेल लेख्नुस्।'; return; }
    if (!msg) { box.className = 'sp-msg err'; box.textContent = 'सन्देश लेख्नुस्।'; return; }
    if (notConfigured()) {
      box.className = 'sp-msg err';
      box.textContent = 'साइट मालिकले अझै सन्देश पठाउने सेटअप पूरा गर्नुभएको छैन।';
      return;
    }
    var btn = this; btn.disabled = true;
    box.className = 'sp-msg'; box.textContent = 'पठाउँदैछ…';
    try {
      await loadEmailJS();
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        from_name: name, message: msg, page_url: location.href
      });
      box.className = 'sp-msg ok'; box.textContent = 'सन्देश पठियो ✓';
      $('#cmName').value = ''; $('#cmMsg').value = '';
      toast('सन्देश पठियो ✓');
      setTimeout(close, 900);
    } catch (e) {
      box.className = 'sp-msg err';
      box.textContent = (e && e.text) || (e && e.message) || 'पठाउन सकिएन, फेरि प्रयास गर्नुस्।';
    } finally { btn.disabled = false; }
  });

  function buildMenu() {
    var menu = document.getElementById('dropdownMenu');
    if (!menu || document.getElementById('cmMenuItem')) return;
    var link = document.createElement('a');
    link.href = '#'; link.id = 'cmMenuItem';
    link.innerHTML = '💬 <span>सन्देश पठाउनुस्</span>';
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var m = document.getElementById('dropdownMenu');
      if (m) ['open', 'show', 'active', 'visible'].forEach(function (c) { m.classList.remove(c); });
      $('#cmName').value = ''; $('#cmMsg').value = ''; $('#cmMsgBox').textContent = '';
      open();
      loadEmailJS().catch(function () {});   /* pahile nai load garera rakhne, chito hos */
    });
    var aboutEl = document.getElementById('spMenuAbout');
    if (aboutEl && aboutEl.nextSibling) aboutEl.parentNode.insertBefore(link, aboutEl.nextSibling);
    else if (aboutEl) aboutEl.parentNode.appendChild(link);
    else {
      var divider = menu.querySelector('.menu-divider');
      if (divider) menu.insertBefore(link, divider); else menu.appendChild(link);
    }
  }
  function init() {
    buildMenu();
    setTimeout(buildMenu, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
