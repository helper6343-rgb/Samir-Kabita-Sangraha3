/* ===== home-update.js =====
   1. लोकप्रिय रचनाहरू lai sabai bhanda talo pathaune
   2. सबै रचनाहरू ko card book jasto banaune (title/time/पढ्नुहोस् hatera vidha matra)
   Card ko class naam app.js ma jun chha, tyo jaanna pardaina: auto pata lagaunchha. */
(function () {
  var VIDHA = { kavita:'कविता', kabita:'कविता', lekh:'लेख', gazal:'गजल', ghazal:'गजल', muktak:'मुक्तक', geet:'गीत' };
  var CAT_RE = /^(kavita|kabita|lekh|gazal|ghazal|muktak|geet|कविता|लेख|गजल|मुक्तक|गीत)$/i;

  function movePopularToEnd() {
    var pop = document.getElementById('popularCards');
    var all = document.getElementById('allCards');
    if (!pop || !all) return;
    var popSec = pop.closest('section') || pop.parentElement;
    var allSec = all.closest('section') || all.parentElement;
    if (allSec.nextElementSibling !== popSec) allSec.after(popSec);
  }

  function findCover(card) {
    var img = card.querySelector('img');
    if (img) return img;
    var els = card.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      if (/url\(/.test(getComputedStyle(els[i]).backgroundImage)) return els[i];
    }
    return null;
  }

  function findCat(card) {
    var els = card.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (!e.children.length && CAT_RE.test(e.textContent.trim())) return e;
    }
    return card.querySelector('[class*="cat"],[class*="type"],[class*="genre"],[class*="badge"]');
  }

  function chain(el, card, set) {
    while (el && el !== card) { set.add(el); el = el.parentElement; }
  }

  function bookify(card) {
    if (card.dataset.book) return;
    var cover = findCover(card);
    if (!cover) return;
    var cat = findCat(card);
    var keep = new Set();
    chain(cover, card, keep);
    if (cat) chain(cat, card, keep);

    card.querySelectorAll('*').forEach(function (e) {
      if (keep.has(e)) return;
      if (cover.contains(e) || (cat && cat.contains(e))) return;
      e.classList.add('bk-hide');
    });

    cover.classList.add('bk-cover');
    if (cat) {
      cat.classList.add('bk-cat');
      var k = cat.textContent.trim().toLowerCase();
      if (!cat.children.length && VIDHA[k]) cat.textContent = VIDHA[k];
    }
    card.dataset.book = '1';
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
