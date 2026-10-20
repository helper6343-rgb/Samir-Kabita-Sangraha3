/* ===== chat.js =====
   एपभित्रै (Instagram DM जस्तै) पाठक ↔ समीर कुराकानी।
   Supabase (निःशुल्क cloud database, "Publishable key" प्रयोग — गोप्य होइन)
   मार्फत काम गर्छ।

   पाठकले: "💬 Chat" बाट नाम/फोटो (प्रोफाइल) राखेर, text/भ्वाइस म्यासेज
            पठाउन सक्छन्, आफ्नै म्यासेज सच्याउन/मेटाउन (unsend) सक्छन्।
   Admin ले: "📥 सन्देशहरू" मा सबै thread देखेर जवाफ दिन्छन्, आफ्नो
            nickname राख्न सक्छन्, आफ्नै म्यासेज सच्याउन/मेटाउन सक्छन्। */
(function () {
  var SUPABASE_URL = 'https://jybhlqxptxsryjwjsaqd.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_LiFNXwxSxX36bNDArM-JQw_spLDoBfY';
  var TABLE = 'messages';
  var PROFILE_TABLE = 'profiles';
  var THREAD_KEY = 'spg_chat_thread';
  var NAME_KEY = 'spg_chat_name';
  var PHOTO_KEY = 'spg_chat_photo';
  var ADMIN_NAME_KEY = 'spg_chat_admin_name';
  var POLL_MS = 4000;
  var MAX_RECORD_MS = 60000;
  var PHOTO_SIZE = 160;

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
  function myPhoto() { try { return localStorage.getItem(PHOTO_KEY) || ''; } catch (e) { return ''; } }
  function setMyPhoto(p) { try { p ? localStorage.setItem(PHOTO_KEY, p) : localStorage.removeItem(PHOTO_KEY); } catch (e) {} }
  function adminName() { try { return localStorage.getItem(ADMIN_NAME_KEY) || 'समीर'; } catch (e) { return 'समीर'; } }
  function setAdminName(n) { try { localStorage.setItem(ADMIN_NAME_KEY, n); } catch (e) {} }

  /* ---------- Supabase (REST, plain fetch, कुनै SDK चाहिँदैन) ---------- */
  function sbHeaders(extra) {
    return Object.assign({ apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }, extra || {});
  }
  function sbUrl(table, qs) { return SUPABASE_URL + '/rest/v1/' + table + (qs || ''); }
  async function sbSelect(table, qs) {
    var r = await fetch(sbUrl(table, qs), { headers: sbHeaders(), cache: 'no-store' });
    if (!r.ok) throw new Error('लोड भएन (' + r.status + ')');
    return r.json();
  }
  async function sbInsert(table, row) {
    var r = await fetch(sbUrl(table, ''), { method: 'POST', headers: sbHeaders({ Prefer: 'return=representation' }), body: JSON.stringify([row]) });
    if (!r.ok) throw new Error('पठाउन सकिएन (' + r.status + ')');
    return r.json();
  }
  async function sbUpsert(table, row, pkCol) {
    var r = await fetch(sbUrl(table, ''), { method: 'POST', headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }), body: JSON.stringify([row]) });
    if (!r.ok) throw new Error('सेभ भएन (' + r.status + ')');
    return r.json();
  }
  async function sbUpdate(table, id, fields) {
    var r = await fetch(sbUrl(table, '?id=eq.' + id), { method: 'PATCH', headers: sbHeaders(), body: JSON.stringify(fields) });
    if (!r.ok) throw new Error('सच्याउन सकिएन (' + r.status + ')');
  }
  async function sbDelete(table, id) {
    var r = await fetch(sbUrl(table, '?id=eq.' + id), { method: 'DELETE', headers: sbHeaders() });
    if (!r.ok) throw new Error('मेटाउन सकिएन (' + r.status + ')');
  }

  /* ---------- प्रोफाइल फोटो: सानो वर्गाकार JPEG बनाउने ---------- */
  function processProfilePhoto(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas');
        c.width = PHOTO_SIZE; c.height = PHOTO_SIZE;
        var ctx = c.getContext('2d');
        var side = Math.min(im.width, im.height);
        ctx.drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.8));
      };
      im.onerror = function () { rej(new Error('फोटो खुलेन')); };
      im.src = url;
    });
  }

  /* ---------- साझा CSS ---------- */
  var st = document.createElement('style');
  st.textContent =
    '.chat-box{display:flex;flex-direction:column;gap:10px;min-height:160px;max-height:46vh;overflow-y:auto;padding:4px 2px;margin:12px 0}' +
    '.chat-row{display:flex;gap:8px;align-items:flex-end}' +
    '.chat-row.me{flex-direction:row-reverse}' +
    '.chat-av{width:26px;height:26px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:rgba(0,0,0,.1)}' +
    '.chat-msg{max-width:74%;padding:9px 13px;border-radius:16px;font-size:14.5px;line-height:1.55;word-break:break-word;white-space:pre-line;position:relative}' +
    '.chat-row.other .chat-msg{background:rgba(0,0,0,.06);border-bottom-left-radius:4px}' +
    '[data-theme="dark"] .chat-row.other .chat-msg{background:rgba(255,255,255,.1)}' +
    '.chat-row.me .chat-msg{background:#1a2547;color:#fff;border-bottom-right-radius:4px}' +
    '.chat-msg .chat-time{display:block;margin-top:4px;font-size:10.5px;opacity:.65}' +
    '.chat-msg audio{max-width:220px;height:34px}' +
    '.chat-msg-actions{display:flex;gap:10px;margin:2px 8px 0;font-size:12px;opacity:.75}' +
    '.chat-row.me .chat-msg-actions{justify-content:flex-end}' +
    '.chat-msg-actions span{cursor:pointer;text-decoration:underline}' +
    '.chat-empty{text-align:center;padding:24px 10px;opacity:.6;font-size:13.5px}' +
    '.chat-input-row{display:flex;gap:8px;margin-top:4px;align-items:flex-end}' +
    '.chat-input-row textarea{flex:1;min-height:44px;max-height:120px;padding:11px 13px;border-radius:14px;border:1px solid #cfc7bd;font-size:15px;font-family:inherit;resize:none}' +
    '.chat-input-row button{flex:0 0 auto;width:44px;height:44px;border:0;border-radius:50%;background:#1a2547;color:#fff;font-size:18px;cursor:pointer}' +
    '.chat-input-row button.rec-on{background:#d32f2f;animation:chatPulse 1s infinite}' +
    '@keyframes chatPulse{0%,100%{opacity:1}50%{opacity:.6}}' +
    '.chat-thread-row{display:flex;gap:10px;align-items:center;padding:12px 6px;border-bottom:1px solid rgba(0,0,0,.08);cursor:pointer}' +
    '[data-theme="dark"] .chat-thread-row{border-color:rgba(255,255,255,.1)}' +
    '.chat-thread-row img{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:rgba(0,0,0,.1)}' +
    '.chat-thread-row .cn{font-weight:700;font-size:15px}' +
    '.chat-thread-row .cp{font-size:13px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.chat-back{display:block;margin-bottom:10px;border:0;background:none;color:#e8710a;font-size:14px;cursor:pointer;padding:4px 0}' +
    '.chat-profile-row{display:flex;align-items:center;gap:12px;margin-bottom:14px}' +
    '.chat-profile-row img{width:50px;height:50px;border-radius:50%;object-fit:cover;background:rgba(0,0,0,.1);cursor:pointer}' +
    '.chat-profile-row input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid #cfc7bd;font-size:14.5px;font-family:inherit}' +
    '.chat-rec-timer{font-size:12.5px;opacity:.75;margin-left:4px;align-self:center}';
  document.head.appendChild(st);

  function timeLabel(iso) {
    try { return new Date(iso).toLocaleString('ne-NP', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }); }
    catch (e) { return ''; }
  }
  function defaultAvatar() {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23bbb"/><circle cx="20" cy="15" r="7" fill="%23fff"/><ellipse cx="20" cy="33" rx="13" ry="9" fill="%23fff"/></svg>');
  }

  /* ---------- एउटा thread का म्यासेज देखाउने (दुवै (पाठक/admin) view मा प्रयोग हुन्छ) ---------- */
  function renderMessages(box, rows, myRole, myId, onEdit, onDelete, otherAvatar) {
    if (!rows.length) { box.innerHTML = ''; var e = document.createElement('div'); e.className = 'chat-empty'; e.textContent = 'अहिलेसम्म कुनै सन्देश छैन। तल लेखेर पठाउनुस्।'; box.appendChild(e); return; }
    box.innerHTML = '';
    rows.forEach(function (m) {
      var mine = m.sender === myRole;
      var row = document.createElement('div');
      row.className = 'chat-row ' + (mine ? 'me' : 'other');
      var av = document.createElement('img');
      av.className = 'chat-av';
      av.src = mine ? (myId.photo || defaultAvatar()) : (otherAvatar || defaultAvatar());
      var bubble = document.createElement('div');
      bubble.className = 'chat-msg';
      if (m.audio) {
        var au = document.createElement('audio');
        au.controls = true; au.src = m.audio;
        bubble.appendChild(au);
      }
      if (m.text) {
        var tdiv = document.createElement('div');
        tdiv.textContent = m.text + (m.edited ? ' (सच्याइएको)' : '');
        bubble.appendChild(tdiv);
      }
      var tm = document.createElement('span');
      tm.className = 'chat-time';
      tm.textContent = (mine ? '' : esc(m.name || '') + ' • ') + timeLabel(m.created_at);
      bubble.appendChild(tm);
      row.appendChild(av); row.appendChild(bubble);
      box.appendChild(row);
      if (mine && !m.audio) {
        var act = document.createElement('div');
        act.className = 'chat-msg-actions';
        var ed = document.createElement('span'); ed.textContent = '✏️ सच्याउनुस्';
        ed.addEventListener('click', function () { onEdit && onEdit(m); });
        var del = document.createElement('span'); del.textContent = '🗑️ मेटाउनुस्';
        del.addEventListener('click', function () { onDelete && onDelete(m); });
        act.appendChild(ed); act.appendChild(del);
        box.appendChild(act);
      } else if (mine && m.audio) {
        var act2 = document.createElement('div');
        act2.className = 'chat-msg-actions';
        var del2 = document.createElement('span'); del2.textContent = '🗑️ मेटाउनुस्';
        del2.addEventListener('click', function () { onDelete && onDelete(m); });
        act2.appendChild(del2);
        box.appendChild(act2);
      }
    });
    box.scrollTop = box.scrollHeight;
  }

  /* ---------- भ्वाइस रेकर्डिङ (साझा) ---------- */
  function makeRecorder(micBtn, timerEl, onReady) {
    var mediaRecorder = null, chunks = [], stream = null, recording = false, maxTimer = null, startAt = 0, tickTimer = null;
    function fmt(sec) { var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
    micBtn.addEventListener('click', async function () {
      if (recording) { stop(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('यो ब्राउजरमा भ्वाइस रेकर्ड गर्न मिल्दैन'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) { toast('माइक्रोफोनको अनुमति दिनुस्'); return; }
      chunks = [];
      try { mediaRecorder = new MediaRecorder(stream); }
      catch (e) { toast('रेकर्डिङ सुरु भएन'); return; }
      mediaRecorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        clearTimeout(maxTimer); clearInterval(tickTimer);
        recording = false; micBtn.classList.remove('rec-on'); micBtn.textContent = '🎤';
        if (timerEl) timerEl.textContent = '';
        if (!chunks.length) return;
        var blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        var fr = new FileReader();
        fr.onload = function () { onReady(fr.result); };
        fr.readAsDataURL(blob);
      };
      mediaRecorder.start();
      recording = true; startAt = Date.now();
      micBtn.classList.add('rec-on'); micBtn.textContent = '⏹';
      if (timerEl) {
        tickTimer = setInterval(function () { timerEl.textContent = fmt(Math.floor((Date.now() - startAt) / 1000)); }, 500);
      }
      maxTimer = setTimeout(stop, MAX_RECORD_MS);
    });
    function stop() { if (mediaRecorder && recording) mediaRecorder.stop(); }
  }

  /* =====================================================================
     पाठकको Chat
     ===================================================================== */
  var visitOv = document.createElement('div');
  visitOv.className = 'sp-ov'; visitOv.id = 'cvChat';
  visitOv.innerHTML =
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>💬 Chat</h2>' +
    '<div class="sp-sub">तपाईंको सन्देश सिधै समीरलाई पुग्छ</div>' +
    '<div class="chat-profile-row"><img id="cvAvatar" src=""><input id="cvNameInput" type="text" placeholder="तपाईंको नाम (वैकल्पिक)"></div>' +
    '<input type="file" id="cvPhotoFile" accept="image/*" hidden>' +
    '<div class="chat-box" id="cvBox"></div>' +
    '<div class="chat-input-row"><textarea id="cvInput" placeholder="सन्देश लेख्नुस्..."></textarea><span class="chat-rec-timer" id="cvRecTimer"></span><button id="cvMic">🎤</button><button id="cvSend">➤</button></div>' +
    '</div>';
  document.body.appendChild(visitOv);
  visitOv.addEventListener('click', function (e) { if (e.target === visitOv) closeVisitor(); });
  visitOv.querySelector('.sp-x').addEventListener('click', closeVisitor);
  var vPoll = null;
  function openVisitor() {
    visitOv.classList.add('sp-open');
    visitOv.querySelector('#cvAvatar').src = myPhoto() || defaultAvatar();
    visitOv.querySelector('#cvNameInput').value = myName();
    refreshVisitor();
    clearInterval(vPoll); vPoll = setInterval(refreshVisitor, POLL_MS);
  }
  function closeVisitor() { visitOv.classList.remove('sp-open'); clearInterval(vPoll); }
  visitOv.querySelector('#cvNameInput').addEventListener('change', function () {
    setMyName(this.value.trim());
    saveMyProfile();
  });
  visitOv.querySelector('#cvAvatar').addEventListener('click', function () { visitOv.querySelector('#cvPhotoFile').click(); });
  visitOv.querySelector('#cvPhotoFile').addEventListener('change', async function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    try {
      var dataUrl = await processProfilePhoto(f);
      setMyPhoto(dataUrl);
      visitOv.querySelector('#cvAvatar').src = dataUrl;
      saveMyProfile();
      refreshVisitor();
    } catch (e) { toast('फोटो राख्न सकिएन'); }
  });
  async function saveMyProfile() {
    try { await sbUpsert(PROFILE_TABLE, { thread_id: myThreadId(), name: myName(), photo: myPhoto() || null }); } catch (e) {}
  }
  async function refreshVisitor() {
    try {
      var rows = await sbSelect(TABLE, '?thread_id=eq.' + encodeURIComponent(myThreadId()) + '&select=*&order=created_at.asc');
      renderMessages(visitOv.querySelector('#cvBox'), rows, 'visitor', { photo: myPhoto() }, visitorEditMsg, visitorDeleteMsg, '');
    } catch (e) {}
  }
  function visitorEditMsg(m) {
    var nv = prompt('सन्देश सच्याउनुस्:', m.text);
    if (nv == null) return;
    nv = nv.trim();
    if (!nv || nv === m.text) return;
    sbUpdate(TABLE, m.id, { text: nv, edited: true }).then(refreshVisitor).catch(function (e) { toast((e && e.message) || 'सच्याउन सकिएन'); });
  }
  function visitorDeleteMsg(m) {
    if (!confirm('यो सन्देश मेटाउने (unsend) हो?')) return;
    sbDelete(TABLE, m.id).then(refreshVisitor).catch(function (e) { toast((e && e.message) || 'मेटाउन सकिएन'); });
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
        setMyName(name); visitOv.querySelector('#cvNameInput').value = name; saveMyProfile();
      }
      await sbInsert(TABLE, { thread_id: myThreadId(), sender: 'visitor', name: name, text: text });
      inp.value = '';
      refreshVisitor();
    } catch (e) { toast((e && e.message) || 'पठाउन सकिएन, फेरि प्रयास गर्नुस्।', 3500); }
    finally { btn.disabled = false; }
  }
  visitOv.querySelector('#cvSend').addEventListener('click', sendVisitorMsg);
  visitOv.querySelector('#cvInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendVisitorMsg(); }
  });
  makeRecorder(visitOv.querySelector('#cvMic'), visitOv.querySelector('#cvRecTimer'), async function (dataUrl) {
    try {
      var name = myName() || 'पाठक';
      if (!myName()) { setMyName(name); visitOv.querySelector('#cvNameInput').value = name; saveMyProfile(); }
      await sbInsert(TABLE, { thread_id: myThreadId(), sender: 'visitor', name: name, text: '', audio: dataUrl });
      refreshVisitor();
    } catch (e) { toast((e && e.message) || 'भ्वाइस पठाउन सकिएन', 3500); }
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
    '<div class="chat-profile-row" style="justify-content:flex-end"><input id="caNickname" type="text" placeholder="तपाईंको nickname" style="max-width:160px"></div>' +
    '<div id="caList"></div>' +
    '</div>';
  document.body.appendChild(inboxOv);
  inboxOv.addEventListener('click', function (e) { if (e.target === inboxOv) closeInbox(); });
  inboxOv.querySelector('.sp-x').addEventListener('click', closeInbox);
  inboxOv.querySelector('#caNickname').addEventListener('change', function () {
    var v = this.value.trim() || 'समीर';
    setAdminName(v); this.value = v;
    toast('Nickname सेभ भयो ✓');
  });
  var iPoll = null;
  function openInbox() {
    if (!isAdmin()) { toast('पहिले लगइन गर्नुस्'); return; }
    inboxOv.classList.add('sp-open');
    inboxOv.querySelector('#caNickname').value = adminName();
    refreshInbox();
    clearInterval(iPoll); iPoll = setInterval(refreshInbox, POLL_MS);
  }
  function closeInbox() { inboxOv.classList.remove('sp-open'); clearInterval(iPoll); }
  var threadProfiles = {};
  async function refreshInbox() {
    var list = inboxOv.querySelector('#caList');
    try {
      var rows = await sbSelect(TABLE, '?select=*&order=created_at.desc&limit=500');
      var byThread = {};
      rows.forEach(function (m) {
        if (!byThread[m.thread_id]) byThread[m.thread_id] = { thread_id: m.thread_id, name: m.name, last: m };
        if (m.sender === 'visitor' && !byThread[m.thread_id].name) byThread[m.thread_id].name = m.name;
      });
      var threads = Object.keys(byThread).map(function (k) { return byThread[k]; });
      threads.sort(function (a, b) { return new Date(b.last.created_at) - new Date(a.last.created_at); });
      try {
        var profs = await sbSelect(PROFILE_TABLE, '?select=*');
        profs.forEach(function (p) { threadProfiles[p.thread_id] = p; });
      } catch (e) {}
      if (!threads.length) { list.innerHTML = '<div class="chat-empty">अहिलेसम्म कुनै पाठकको सन्देश आएको छैन।</div>'; return; }
      list.innerHTML = '';
      threads.forEach(function (t) {
        var prof = threadProfiles[t.thread_id];
        var row = document.createElement('div');
        row.className = 'chat-thread-row';
        var img = document.createElement('img'); img.src = (prof && prof.photo) || defaultAvatar();
        var mid = document.createElement('div'); mid.style.cssText = 'flex:1;min-width:0;';
        var cn = document.createElement('div'); cn.className = 'cn'; cn.textContent = (prof && prof.name) || t.name || 'पाठक';
        var cp = document.createElement('div'); cp.className = 'cp'; cp.textContent = (t.last.sender === 'admin' ? 'तपाईं: ' : '') + (t.last.audio ? '🎤 भ्वाइस म्यासेज' : t.last.text);
        mid.appendChild(cn); mid.appendChild(cp);
        row.appendChild(img); row.appendChild(mid);
        row.addEventListener('click', function () { openThread(t.thread_id, (prof && prof.name) || t.name, prof && prof.photo); });
        list.appendChild(row);
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
    '<div class="chat-input-row"><textarea id="caInput" placeholder="जवाफ लेख्नुस्..."></textarea><span class="chat-rec-timer" id="caRecTimer"></span><button id="caMic">🎤</button><button id="caSend">➤</button></div>' +
    '</div>';
  document.body.appendChild(threadOv);
  threadOv.addEventListener('click', function (e) { if (e.target === threadOv) closeThreadOv(); });
  threadOv.querySelector('.sp-x').addEventListener('click', closeThreadOv);
  threadOv.querySelector('#caBack').addEventListener('click', closeThreadOv);
  var curThreadId = null, curThreadPhoto = '', tPoll = null;
  function openThread(id, name, photo) {
    curThreadId = id; curThreadPhoto = photo || '';
    threadOv.querySelector('#caThreadTitle').textContent = name || 'पाठक';
    threadOv.classList.add('sp-open');
    refreshThread();
    clearInterval(tPoll); tPoll = setInterval(refreshThread, POLL_MS);
  }
  function closeThreadOv() { threadOv.classList.remove('sp-open'); clearInterval(tPoll); curThreadId = null; }
  async function refreshThread() {
    if (!curThreadId) return;
    try {
      var rows = await sbSelect(TABLE, '?thread_id=eq.' + encodeURIComponent(curThreadId) + '&select=*&order=created_at.asc');
      renderMessages(threadOv.querySelector('#caBox'), rows, 'admin', { photo: '' }, adminEditMsg, adminDeleteMsg, curThreadPhoto);
    } catch (e) {}
  }
  function adminEditMsg(m) {
    var nv = prompt('सन्देश सच्याउनुस्:', m.text);
    if (nv == null) return;
    nv = nv.trim();
    if (!nv || nv === m.text) return;
    sbUpdate(TABLE, m.id, { text: nv, edited: true }).then(refreshThread).catch(function (e) { toast((e && e.message) || 'सच्याउन सकिएन'); });
  }
  function adminDeleteMsg(m) {
    if (!confirm('यो सन्देश मेटाउने हो?')) return;
    sbDelete(TABLE, m.id).then(refreshThread).catch(function (e) { toast((e && e.message) || 'मेटाउन सकिएन'); });
  }
  async function sendAdminMsg() {
    if (!curThreadId) return;
    var inp = threadOv.querySelector('#caInput');
    var text = inp.value.trim();
    if (!text) return;
    var btn = threadOv.querySelector('#caSend'); btn.disabled = true;
    try {
      await sbInsert(TABLE, { thread_id: curThreadId, sender: 'admin', name: adminName(), text: text });
      inp.value = '';
      refreshThread();
    } catch (e) { toast((e && e.message) || 'पठाउन सकिएन', 3500); }
    finally { btn.disabled = false; }
  }
  threadOv.querySelector('#caSend').addEventListener('click', sendAdminMsg);
  threadOv.querySelector('#caInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminMsg(); }
  });
  makeRecorder(threadOv.querySelector('#caMic'), threadOv.querySelector('#caRecTimer'), async function (dataUrl) {
    if (!curThreadId) return;
    try {
      await sbInsert(TABLE, { thread_id: curThreadId, sender: 'admin', name: adminName(), text: '', audio: dataUrl });
      refreshThread();
    } catch (e) { toast((e && e.message) || 'भ्वाइस पठाउन सकिएन', 3500); }
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
