/* ===== home-update.js =====
   1. लोकप्रिय रचनाहरू lai sabai bhanda talo pathaune
   2. सबै रचनाहरू ko card book jasto banaune (photo + talo ma vidha matra)
   Card ko class naam app.js ma jun chha, tyo jaanna pardaina: auto pata lagaunchha. */
(function () {
  var VIDHA = { kavita:'कविता', kabita:'कविता', lekh:'लेख', gazal:'गजल', ghazal:'गजल', muktak:'मुक्तक', geet:'गीत', story:'कथा', katha:'कथा' };
  var CAT_RE = /^(kavita|kabita|lekh|gazal|ghazal|muktak|geet|story|katha|कविता|लेख|गजल|मुक्तक|गीत|कथा)$/i;
  var READ_RE = /^(पढ्नुस्|पढ्नुहोस्|पढ्नुस|read)/i;

  function movePopularToEnd() {
    var pop = document.getElementById('popularCards');
    var all = document.getElementById('allCards');
    if (!pop || !all) return;
    var popSec = pop.closest('section') || pop.parentElement;
    var allSec = all.closest('section') || all.parentElement;
    if (allSec.nextElementSibling !== popSec) allSec.after(popSec);
  }

  function coverSrc(card) {
    var img = card.querySelector('img');
    if (img) return img.currentSrc || img.src || img.getAttribute('data-src') || '';
    var els = card.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var m = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(els[i]).backgroundImage || '');
      if (m) return m[1];
    }
    return '';
  }

  function catText(card) {
    var els = card.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (!e.children.length) {
        var t = e.textContent.trim();
        if (CAT_RE.test(t)) return VIDHA[t.toLowerCase()] || t;
      }
    }
    var g = card.querySelector('[class*="cat"],[class*="type"],[class*="genre"],[class*="badge"]');
    if (g) {
      var s = g.textContent.trim();
      return VIDHA[s.toLowerCase()] || s;
    }
    return '';
  }

  function readButton(card) {
    var els = card.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (!e.children.length && READ_RE.test(e.textContent.trim())) {
        return e.closest('button,a,[onclick]') || e;
      }
    }
    return null;
  }

  function bookify(card) {
    if (card.querySelector(':scope > .bk-book')) return;
    var src = coverSrc(card);
    if (!src) return;
    var label = catText(card);

    var wrap = document.createElement('div');
    wrap.className = 'bk-book';
    var box = document.createElement('div');
    box.className = 'bk-cover-box';
    var bg = document.createElement('img');
    bg.className = 'bk-bg'; bg.src = src; bg.alt = ''; bg.setAttribute('aria-hidden', 'true');
    var im = document.createElement('img');
    im.className = 'bk-img'; im.src = src; im.alt = label || '';
    box.appendChild(bg); box.appendChild(im);
    var lb = document.createElement('div');
    lb.className = 'bk-label'; lb.textContent = label;
    wrap.appendChild(box); wrap.appendChild(lb);

    /* Click: purano "पढ्नुस्" button chalaidine */
    wrap.addEventListener('click', function (e) {
      var btn = readButton(card);
      if (btn) { e.stopPropagation(); e.preventDefault(); btn.click(); }
    });

    card.appendChild(wrap);
  }

  function apply() {
    movePopularToEnd();
    var grid = document.getElementById('allCards');
    if (!grid) return;
    Array.prototype.forEach.call(grid.children, bookify);
  }

  function init() {
    apply();
    var grid = document.getElementById('allCards');
    if (grid) new MutationObserver(apply).observe(grid, { childList: true, subtree: true });
    setTimeout(apply, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
