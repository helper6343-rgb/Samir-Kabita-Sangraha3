/* ===== admin-newpost.js =====
   ⋮ → सम्पादन मोड → "➕ नयाँ रचना थप्नुस्" बाट नयाँ कविता/लेख थप्ने।
   नयाँ रचना data/extra-posts.json मा थपिन्छ; होम पेजमा अरू book जस्तै देखिन्छ,
   थिचेपछि कविता/लेख पढ्ने पेज जस्तै नै खुल्छ। असली data/kavita.js छोइँदैन. */
(function () {
  var EXTRA_URL = 'data/extra-posts.json';
  var GENRES = ['कविता', 'लेख', 'गजल', 'मुक्तक', 'गीत', 'कथा'];
  var COVER_W = 900, COVER_H = 1200;

  var st = document.createElement('style');
  st.textContent = '.np-crop-wrap{max-height:52vh;overflow:hidden;border-radius:14px;background:#111}.np-crop-wrap img{display:block;max-width:100%}';
  document.head.appendChild(st);

  function admin() { return window.SPG_ADMIN; }
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var ov = document.createElement('div');
  ov.className = 'sp-ov'; ov.id = 'npAdd';
  ov.innerHTML =
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>➕ नयाँ रचना थप्नुस्</h2>' +
    '<label for="npTitle">शीर्षक</label><input class="sp-input" id="npTitle" type="text">' +
    '<label for="npGenre">विधा</label><select class="sp-input" id="npGenre">' +
      GENRES.map(function (g) { return '<option>' + g + '</option>'; }).join('') +
    '</select>' +
    '<label for="npText">पाठ</label><textarea class="sp-input" id="npText" style="min-height:220px;line-height:1.9"></textarea>' +
    '<label>कभर फोटो</label>' +
    '<div class="sp-photo-row"><img id="npCoverPrev" src="" style="border-radius:8px;width:56px;height:74px;object-fit:cover;background:#ddd"><button type="button" id="npPhotoBtn">फोटो छान्नुस्</button></div>' +
    '<input type="file" id="npPhotoFile" accept="image/*" hidden>' +
    '<button class="sp-btn" id="npSave">प्रकाशित गर्नुस्</button>' +
    '<div class="sp-msg" id="npMsg"></div>' +
    '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', function (e) { if (e.target === ov) closeOv(); });
  ov.querySelector('.sp-x').addEventListener('click', closeOv);
  function openOv() { ov.classList.add('sp-open'); }
  function closeOv() { ov.classList.remove('sp-open'); }
  var $ = function (s) { return ov.querySelector(s); };

  /* ---------- Crop overlay (3:4, book cover) ---------- */
  var cropOv = document.createElement('div');
  cropOv.className = 'sp-ov'; cropOv.id = 'npCrop';
  cropOv.innerHTML =
    '<div class="sp-sheet">' +
    '<button class="sp-x" aria-label="बन्द">✕</button>' +
    '<h2>फोटो मिलाउनुस्</h2>' +
    '<div class="sp-sub">book cover जस्तै ठाडो (3:4) हुन्छ</div>' +
    '<div class="np-crop-wrap" id="npCropWrap"><img id="npCropImg"></div>' +
    '<div class="sp-zoom-row">🔍<input type="range" id="npCropZoom" min="0" max="2" step="0.01" value="0"></div>' +
    '<button class="sp-btn" id="npCropSave">यो फोटो राख्नुस्</button>' +
    '<div class="sp-msg" id="npCropMsg"></div>' +
    '</div>';
  document.body.appendChild(cropOv);
  var cropper = null, cropResolve = null, cropReject = null;
  cropOv.querySelector('.sp-x').addEventListener('click', function () {
    if (cropper) { cropper.destroy(); cropper = null; }
    cropOv.classList.remove('sp-open');
    if (cropReject) cropReject(new Error('cancelled'));
  });
  cropOv.querySelector('#npCropZoom').addEventListener('input', function () {
    if (cropper) cropper.zoomTo(parseFloat(this.value));
  });
  cropOv.querySelector('#npCropSave').addEventListener('click', function () {
    if (!cropper) return;
    var canvas = cropper.getCroppedCanvas({ width: COVER_W, height: COVER_H, imageSmoothingQuality: 'high' });
    canvas.toBlob(function (blob) {
      if (!blob) { cropOv.querySelector('#npCropMsg').textContent = 'फोटो तयार भएन।'; return; }
      cropper.destroy(); cropper = null; cropOv.classList.remove('sp-open');
      if (cropResolve) cropResolve(blob);
    }, 'image/jpeg', 0.88);
  });

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
  function cropPhoto(file) {
    return loadCropper().then(function () {
      return new Promise(function (resolve, reject) {
        cropResolve = resolve; cropReject = reject;
        var img = cropOv.querySelector('#npCropImg');
        var url = URL.createObjectURL(file);
        img.onload = function () {
          cropOv.classList.add('sp-open');
          cropOv.querySelector('#npCropZoom').value = 0;
          if (cropper) cropper.destroy();
          cropper = new Cropper(img, {
            aspectRatio: COVER_W / COVER_H, viewMode: 1, autoCropArea: 1, background: false,
            guides: false, center: false, highlight: false,
            cropBoxMovable: false, cropBoxResizable: false, toggleDragModeOnDblclick: false,
            zoomOnWheel: true, ready: function () { URL.revokeObjectURL(url); }
          });
        };
        img.src = url;
      });
    });
  }

  var pendingBlob = null;
  $('#npPhotoBtn').addEventListener('click', function () { $('#npPhotoFile').click(); });
  $('#npPhotoFile').addEventListener('change', async function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    try {
      var blob = await cropPhoto(f);
      pendingBlob = blob;
      $('#npCoverPrev').src = URL.createObjectURL(blob);
    } catch (e) { /* cancel bhayo */ }
  });

  function b64FromBlob(blob) {
    return new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result.split(',')[1]); };
      fr.readAsDataURL(blob);
    });
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'b' + (h >>> 0).toString(36); }

  $('#npSave').addEventListener('click', async function () {
    var a = admin();
    var m = $('#npMsg');
    m.className = 'sp-msg'; m.textContent = '';
    if (!a || !a.isLoggedIn()) { m.className = 'sp-msg err'; m.textContent = 'पहिले लगइन गर्नुस्।'; return; }
    var title = $('#npTitle').value.trim(), genre = $('#npGenre').value, text = $('#npText').value.trim();
    if (!title) { m.className = 'sp-msg err'; m.textContent = 'शीर्षक लेख्नुस्।'; return; }
    if (!text) { m.className = 'sp-msg err'; m.textContent = 'पाठ लेख्नुस्।'; return; }
    var btn = this; btn.disabled = true;
    try {
      var id = 'x' + Date.now().toString(36) + hash(title);
      var cover = '';
      if (pendingBlob) {
        m.textContent = 'फोटो अपलोड हुँदैछ…';
        var b64 = await b64FromBlob(pendingBlob);
        var path = 'covers/book/extra-' + id + '.jpg';
        var r1 = await a.put(path, b64, 'New post cover: ' + title);
        if (!r1.ok) throw new Error('फोटो अपलोड भएन (' + r1.status + ')');
        cover = path + '?v=' + Date.now();
      }
      var words = text.split(/\s+/).filter(Boolean).length;
      var minutes = Math.max(1, Math.round(words / 120));
      var entry = { id: id, title: title, genre: genre, text: text, cover: cover, minutes: minutes, created: Date.now() };

      m.textContent = 'सेभ हुँदैछ…';
      var ok = false;
      for (var i = 0; i < 3 && !ok; i++) {
        var ex = await a.get(EXTRA_URL);
        var cur = [];
        if (ex) { try { cur = JSON.parse(a.dec(ex.content)); } catch (e) { cur = []; } }
        if (!Array.isArray(cur)) cur = [];
        cur.push(entry);
        var r2 = await a.put(EXTRA_URL, a.enc(JSON.stringify(cur, null, 2)), 'Add post: ' + title, ex && ex.sha);
        if (r2.ok) ok = true;
        else if (r2.status !== 409 && r2.status !== 422) throw new Error('सेभ भएन (' + r2.status + ')');
      }
      if (!ok) throw new Error('सेभ भएन, फेरि प्रयास गर्नुस्।');

      $('#npTitle').value = ''; $('#npText').value = ''; $('#npCoverPrev').src = ''; pendingBlob = null;
      m.textContent = ''; closeOv();
      /* GitHub Pages लाई अपडेट हुन केही समय लाग्छ, त्यसैले फेरि fetch नगरी
         सिधै यहीँ देखाइदिने (optimistic) — फ्ल्यास भएर हराउने समस्या नआओस् */
      if (window.SPG_EXTRA) window.SPG_EXTRA.addLocal(entry);
      toast('रचना प्रकाशित भयो ✓');
    } catch (e) {
      m.className = 'sp-msg err'; m.textContent = (e && e.message) || 'सेभ भएन।';
    } finally { btn.disabled = false; }
  });

  window.SPG_NEWPOST = {
    open: function () {
      if (!admin() || !admin().isLoggedIn()) { toast('पहिले लगइन गर्नुस्'); return; }
      $('#npTitle').value = ''; $('#npText').value = ''; $('#npCoverPrev').src = '';
      $('#npGenre').value = 'कविता'; pendingBlob = null; $('#npMsg').textContent = '';
      openOv();
    }
  };
})();
