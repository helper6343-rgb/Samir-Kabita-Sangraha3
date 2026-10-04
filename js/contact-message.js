/* ===== contact-message.js =====
   सबैलाई (login नगरिकन पनि) देखिने ⋮ मेनुको "सन्देश पठाउनुस्" फिचर।
   साँचो SMS पठाउन paid SMS service (Twilio/Sparrow SMS) चाहिन्छ, जुन यो
   static साइटमा सुरक्षित तरिकाले राख्न मिल्दैन। त्यसैले यहाँ भिजिटरको आफ्नै
   email app (Gmail लगायत) मार्फत तपाईंलाई इमेल पठाउने व्यवस्था गरिएको छ —
   पैसा वा account केही नचाहिने, तर भिजिटरले आफैं "Send" थिच्नुपर्छ। */
(function () {
  /* ⚠️ यहाँ आफ्नो साँचो Gmail ठेगाना राख्नुस् */
  var OWNER_EMAIL = 'yo.email.badlnus@gmail.com';

  function admin() { return window.SPG_ADMIN; }
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
  }

  var ov = document.createElement('div');
  ov.className = 'sp-ov'; ov.id = 'cmSend';
  ov.innerHTML =
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>💬 सन्देश पठाउनुस्</h2>' +
    '<div class="sp-sub">तपाईंको सन्देश लेखकलाई इमेलमार्फत जान्छ</div>' +
    '<label for="cmName">तपाईंको नाम / इमेल</label>' +
    '<input class="sp-input" id="cmName" type="text" placeholder="जस्तै: Ram Shrestha, ram@gmail.com">' +
    '<label for="cmMsg">सन्देश</label>' +
    '<textarea class="sp-input" id="cmMsg" style="min-height:140px"></textarea>' +
    '<button class="sp-btn" id="cmSendBtn">इमेलमार्फत पठाउनुस्</button>' +
    '<p class="sp-note">थिचेपछि तपाईंको इमेल एप (Gmail आदि) खुल्छ, सन्देश पहिल्यै लेखिएको हुन्छ — त्यहाँ Send थिच्नुपर्छ।</p>' +
    '<div class="sp-msg" id="cmMsgBox"></div>' +
    '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  ov.querySelector('.sp-x').addEventListener('click', close);
  function open() { ov.classList.add('sp-open'); }
  function close() { ov.classList.remove('sp-open'); }
  var $ = function (s) { return ov.querySelector(s); };

  $('#cmSendBtn').addEventListener('click', function () {
    var name = $('#cmName').value.trim(), msg = $('#cmMsg').value.trim();
    var box = $('#cmMsgBox');
    if (!name) { box.className = 'sp-msg err'; box.textContent = 'नाम वा इमेल लेख्नुस्।'; return; }
    if (!msg) { box.className = 'sp-msg err'; box.textContent = 'सन्देश लेख्नुस्।'; return; }
    if (OWNER_EMAIL.indexOf('badlnus') !== -1) {
      box.className = 'sp-msg err';
      box.textContent = 'साइट मालिकले अझै आफ्नो इमेल सेट गर्नुभएको छैन।';
      return;
    }
    var subject = 'समीर साहित्य संग्रह — सन्देश: ' + name;
    var body = msg + '\n\n— ' + name;
    var url = 'mailto:' + encodeURIComponent(OWNER_EMAIL) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    window.location.href = url;
    box.className = 'sp-msg ok';
    box.textContent = 'इमेल एप खुल्दैछ…';
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
    setTimeout(buildMenu, 600);   /* about-login.js ले मेनु अलि ढिलो बनायो भने पनि */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
