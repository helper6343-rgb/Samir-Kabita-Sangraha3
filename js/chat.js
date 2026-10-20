/* ===== chat.js =====
   एपभित्रै (Instagram DM जस्तै) पाठक ↔ समीर कुराकानी।
   कुनै आफ्नै server नभएकोले, सन्देशहरू Supabase (निःशुल्क, cloud database) मा
   राखिन्छन् — त्यहाँको "Publishable key" यहाँ राखिएको छ, यो गोप्य होइन
   (सार्वजनिक प्रयोगकै लागि बनेको हो, GitHub token जस्तो होइन)।

   पाठकले: मेनुबाट "💬 Chat" थिचेर नाम/इमेल नचाहिई सिधै लेख्न सक्छन्।
            फोनमै एउटा thread-id बन्छ (localStorage), त्यसैले फर्केर आउँदा
            उही कुराकानी देखिन्छ।
   Admin ले: लगइन गरेपछि मेनुमा "📥 सन्देशहरू" मा सबै पाठकका thread देख्छन्,
            जुनसुकैमा पसेर जवाफ लेख्न सक्छन् — पाठकले आफ्नो chat मा त्यो
            जवाफ देख्छन् (केही सेकेन्डमा, auto-refresh हुन्छ)। */
(function () {
  var SUPABASE_URL = 'https://jybhlqxptxsryjwjsaqd.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_LiFNXwxSxX36bNDArM-JQw_spLDoBfY';
  var TABLE = 'messages';
  var THREAD_KEY = 'spg_chat_thread';
  var NAME_KEY = 'spg_chat_name';
  var POLL_MS = 4000;

  function admin() { return window.SPG_ADMIN; }
  function isAdmin() { var a = admin(); return !!(a && a.isLoggedIn()); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
  }

  function myThreadId() {
    try {
      var id = localStorage.getItem(THREAD_KEY);
      if (!id) { id = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem(THREAD_KEY, id); }
      return id;
    } catch (e) { return 'guest'; }
  }
  function myName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
  function setMyName(n) { try { localStorage.setItem(NAME_KEY, n); } catch (e) {} }

  /* ---------- Supabase (REST, plain fetch, कुनै SDK चाहिँदैन) ---------- */
  function sbHeaders(extra) {
    return Object.assign({ apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }, extra || {});
  }
  function sbUrl(qs) { return SUPABASE_URL + '/rest/v1/' + TABLE + qs; }
  async function sbSelect(qs) {
    var r = await fetch(sbUrl(qs), { headers: sbHeaders(), cache: 'no-store' });
    if (!r.ok) throw new Error('लोड भएन (' + r.status + ')');
    return r.json();
  }
  async function sbInsert(row) {
    var r = await fetch(sbUrl(''), { method: 'POST', headers: sbHeaders({ Prefer: 'return=representation' }), body: JSON.stringify([row]) });
    if (!r.ok) throw new Error('पठाउन सकिएन (' + r.status + ')');
    return r.json();
  }

  /* ---------- साझा: एउटा message bubble बनाउने ---------- */
  var st = document.createElement('style');
  st.textContent =
    '.chat-box{display:flex;flex-direction:column;gap:10px;min-height:160px;max-height:50vh;overflow-y:auto;padding:4px 2px;margin:12px 0}' +
    '.chat-msg{max-width:78%;padding:9px 13px;border-radius:16px;font-size:14.5px;line-height:1.55;word-break:break-word;white-space:pre-line}' +
    '.chat-msg.visitor{align-self:flex-start;background:rgba(0,0,0,.06);border-bottom-left-radius:4px}' +
    '[data-theme="dark"] .chat-msg.visitor{background:rgba(255,255,255,.1)}' +
    '.chat-msg.admin{align-self:flex-end;background:#1a2547;color:#fff;border-bottom-right-radius:4px}' +
    '.chat-msg .chat-time{display:block;margin-top:4px;font-size:10.5px;opacity:.6}' +
    '.chat-empty{text-align:center;padding:24px 10px;opacity:.6;font-size:13.5px}' +
    '.chat-input-row{display:flex;gap:8px;margin-top:4px}' +
    '.chat-input-row textarea{flex:1;min-height:44px;max-height:120px;padding:11px 13px;border-radius:14px;border:1px solid #cfc7bd;font-size:15px;font-family:inherit;resize:none}' +
    '.chat-input-row button{flex:0 0 auto;padding:0 18px;border:0;border-radius:14px;background:#1a2547;color:#fff;font-size:20px;cursor:pointer}' +
    '.chat-thread-row{display:flex;gap:10px;align-items:center;padding:12px 6px;border-bottom:1px solid rgba(0,0,0,.08);cursor:pointer}' +
    '[data-theme="dark"] .chat-thread-row{border-color:rgba(255,255,255,.1)}' +
    '.chat-thread-row .cn{font-weight:700;font-size:15px}' +
    '.chat-thread-row .cp{font-size:13px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.chat-back{display:block;margin-bottom:10px;border:0;background:none;color:#e8710a;font-size:14px;cursor:pointer;padding:4px 0}';
  document.head.appendChild(st);

  function timeLabel(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString('ne-NP', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
    } catch (e) { return ''; }
  }

  function renderMessages(box, rows, isAdminView) {
    if (!rows.length) { box.innerHTML = '<div class="chat-empty">अहिलेसम्म कुनै सन्देश छैन। तल लेखेर पठाउनुस्।</div>'; return; }
    var html = '';
    rows.forEach(function (m) {
      html += '<div class="chat-msg ' + (m.sender === 'admin' ? 'admin' : 'visitor') + '">' + esc(m.text) +
        '<span class="chat-time">' + (m.sender === 'admin' ? 'समीर' : esc(m.name || 'तपाईं')) + ' • ' + timeLabel(m.created_at) + '</span></div>';
    });
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }

  /* =====================================================================
     पाठकको Chat (सबैलाई देखिने)
     ===================================================================== */
  var visitOv = document.createElement('div');
  visitOv.className = 'sp-ov'; visitOv.id = 'cvChat';
  visitOv.innerHTML =
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>💬 Chat</h2>' +
    '<div class="sp-sub">तपाईंको सन्देश सिधै समीरलाई पुग्छ</div>' +
    '<div class="chat-box" id="cvBox"></div>' +
    '<div class="chat-input-row"><textarea id="cvInput" placeholder="सन्देश लेख्नुस्..."></textarea><button id="cvSend">➤</button></div>' +
    '</div>';
  document.body.appendChild(visitOv);
  visitOv.addEventListener('click', function (e) { if (e.target === visitOv) closeVisitor(); });
  visitOv.querySelector('.sp-x').addEventListener('click', closeVisitor);
  var vPoll = null;
  function openVisitor() {
    visitOv.classList.add('sp-open');
    refreshVisitor();
    clearInterval(vPoll); vPoll = setInterval(refreshVisitor, POLL_MS);
  }
  function closeVisitor() { visitOv.classList.remove('sp-open'); clearInterval(vPoll); }
  async function refreshVisitor() {
    try {
      var rows = await sbSelect('?thread_id=eq.' + encodeURIComponent(myThreadId()) + '&select=*&order=created_at.asc');
      renderMessages(visitOv.querySelector('#cvBox'), rows, false);
    } catch (e) { /* बिस्तारै फेरि प्रयास हुन्छ, silent */ }
  }
  async function sendVisitorMsg() {
    var inp = visitOv.querySelector('#cvInput');
    var text = inp.value.trim();
    if (!text) return;
    var btn = visitOv.querySelector('#cvSend'); btn.disabled = true;
    try {
      var name = myName();
      if (!name) {
        name = (prompt('तपाईंको नाम (वैकल्पिक, खाली पनि राख्न सकिन्छ):') || '').trim() || 'पाठक';
        setMyName(name);
      }
      await sbInsert({ thread_id: myThreadId(), sender: 'visitor', name: name, text: text });
      inp.value = '';
      refreshVisitor();
    } catch (e) { toast((e && e.message) || 'पठाउन सकिएन, फेरि प्रयास गर्नुस्।', 3500); }
    finally { btn.disabled = false; }
  }
  visitOv.querySelector('#cvSend').addEventListener('click', sendVisitorMsg);
  visitOv.querySelector('#cvInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendVisitorMsg(); }
  });

  /* =====================================================================
     Admin को इनबक्स (लगइन भएपछि मात्र)
     ===================================================================== */
  var inboxOv = document.createElement('div');
  inboxOv.className = 'sp-ov'; inboxOv.id = 'caInbox';
  inboxOv.innerHTML =
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>📥 सन्देशहरू</h2>' +
    '<div class="sp-sub">पाठकहरूको कुराकानी</div>' +
    '<div id="caList"></div>' +
    '</div>';
  document.body.appendChild(inboxOv);
  inboxOv.addEventListener('click', function (e) { if (e.target === inboxOv) closeInbox(); });
  inboxOv.querySelector('.sp-x').addEventListener('click', closeInbox);
  var iPoll = null;
  function openInbox() {
    inboxOv.classList.add('sp-open');
    refreshInbox();
    clearInterval(iPoll); iPoll = setInterval(refreshInbox, POLL_MS);
  }
  function closeInbox() { inboxOv.classList.remove('sp-open'); clearInterval(iPoll); }
  async function refreshInbox() {
    var list = inboxOv.querySelector('#caList');
    try {
      var rows = await sbSelect('?select=*&order=created_at.desc&limit=500');
      var byThread = {};
      rows.forEach(function (m) {
        if (!byThread[m.thread_id]) byThread[m.thread_id] = { thread_id: m.thread_id, name: m.name, last: m };
        if (m.sender === 'visitor' && !byThread[m.thread_id].name) byThread[m.thread_id].name = m.name;
      });
      var threads = Object.keys(byThread).map(function (k) { return byThread[k]; });
      threads.sort(function (a, b) { return new Date(b.last.created_at) - new Date(a.last.created_at); });
      if (!threads.length) { list.innerHTML = '<div class="chat-empty">अहिलेसम्म कुनै पाठकको सन्देश आएको छैन।</div>'; return; }
      var html = '';
      threads.forEach(function (t) {
        html += '<div class="chat-thread-row" data-id="' + esc(t.thread_id) + '"><div style="flex:1;min-width:0;"><div class="cn">' + esc(t.name || 'पाठक') + '</div><div class="cp">' + (t.last.sender === 'admin' ? 'तपाईं: ' : '') + esc(t.last.text) + '</div></div></div>';
      });
      list.innerHTML = html;
      list.querySelectorAll('.chat-thread-row').forEach(function (row) {
        row.addEventListener('click', function () { openThread(row.dataset.id, byThread[row.dataset.id].name); });
      });
    } catch (e) { list.innerHTML = '<div class="chat-empty">लोड भएन, फेरि प्रयास हुँदैछ…</div>'; }
  }

  /* ---- एउटा पाठकको thread खोलेर जवाफ लेख्ने ---- */
  var threadOv = document.createElement('div');
  threadOv.className = 'sp-ov'; threadOv.id = 'caThread';
  threadOv.innerHTML =
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<button class="chat-back" id="caBack">← सूचीमा फर्कनुस्</button>' +
    '<h2 id="caThreadTitle">पाठक</h2>' +
    '<div class="chat-box" id="caBox"></div>' +
    '<div class="chat-input-row"><textarea id="caInput" placeholder="जवाफ लेख्नुस्..."></textarea><button id="caSend">➤</button></div>' +
    '</div>';
  document.body.appendChild(threadOv);
  threadOv.addEventListener('click', function (e) { if (e.target === threadOv) closeThreadOv(); });
  threadOv.querySelector('.sp-x').addEventListener('click', closeThreadOv);
  threadOv.querySelector('#caBack').addEventListener('click', closeThreadOv);
  var curThreadId = null, tPoll = null;
  function openThread(id, name) {
    curThreadId = id;
    threadOv.querySelector('#caThreadTitle').textContent = name || 'पाठक';
    threadOv.classList.add('sp-open');
    refreshThread();
    clearInterval(tPoll); tPoll = setInterval(refreshThread, POLL_MS);
  }
  function closeThreadOv() { threadOv.classList.remove('sp-open'); clearInterval(tPoll); curThreadId = null; }
  async function refreshThread() {
    if (!curThreadId) return;
    try {
      var rows = await sbSelect('?thread_id=eq.' + encodeURIComponent(curThreadId) + '&select=*&order=created_at.asc');
      renderMessages(threadOv.querySelector('#caBox'), rows, true);
    } catch (e) {}
  }
  async function sendAdminMsg() {
    if (!curThreadId) return;
    var inp = threadOv.querySelector('#caInput');
    var text = inp.value.trim();
    if (!text) return;
    var btn = threadOv.querySelector('#caSend'); btn.disabled = true;
    try {
      await sbInsert({ thread_id: curThreadId, sender: 'admin', name: 'समीर', text: text });
      inp.value = '';
      refreshThread();
    } catch (e) { toast((e && e.message) || 'पठाउन सकिएन', 3500); }
    finally { btn.disabled = false; }
  }
  threadOv.querySelector('#caSend').addEventListener('click', sendAdminMsg);
  threadOv.querySelector('#caInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminMsg(); }
  });

  /* =====================================================================
     ⋮ मेनुमा थप्ने: सबैलाई "💬 Chat", admin लाई मात्र "📥 सन्देशहरू"
     ===================================================================== */
  var chatLink, inboxLink;
  function refreshChatMenu() {
    if (inboxLink) inboxLink.style.display = isAdmin() ? '' : 'none';
  }
  function buildMenu() {
    var menu = document.getElementById('dropdownMenu');
    if (!menu || document.getElementById('spMenuChat')) return;

    chatLink = document.createElement('a');
    chatLink.href = '#'; chatLink.id = 'spMenuChat';
    chatLink.innerHTML = '💬 <span>Chat</span>';
    chatLink.addEventListener('click', function (e) {
      e.preventDefault();
      var m = document.getElementById('dropdownMenu');
      if (m) ['open', 'show', 'active', 'visible'].forEach(function (c) { m.classList.remove(c); });
      openVisitor();
    });

    inboxLink = document.createElement('a');
    inboxLink.href = '#'; inboxLink.id = 'spMenuInbox';
    inboxLink.innerHTML = '📥 <span>सन्देशहरू</span>';
    inboxLink.addEventListener('click', function (e) {
      e.preventDefault();
      var m = document.getElementById('dropdownMenu');
      if (m) ['open', 'show', 'active', 'visible'].forEach(function (c) { m.classList.remove(c); });
      openInbox();
    });

    var aboutEl = document.getElementById('spMenuAbout');
    if (aboutEl && aboutEl.parentNode) {
      aboutEl.parentNode.insertBefore(chatLink, aboutEl.nextSibling);
      aboutEl.parentNode.insertBefore(inboxLink, chatLink);
    } else {
      menu.appendChild(chatLink); menu.appendChild(inboxLink);
    }
    refreshChatMenu();
  }
  function init() {
    buildMenu();
    setTimeout(buildMenu, 600);
    setTimeout(refreshChatMenu, 900);
  }
  document.addEventListener('spg-admin-change', refreshChatMenu);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
