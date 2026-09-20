/* ===== 1. लोकप्रिय रचनाहरू lai sabai bhanda talo pathaune ===== */
function movePopularToEnd(){
  const heads = [...document.querySelectorAll('h1,h2,h3')];
  const head = heads.find(h => h.textContent.includes('लोकप्रिय'));
  if (!head) return;
  const box = head.closest('section') || head.parentElement;

  const allHead = heads.find(h => h.textContent.includes('सबै रचना'));
  const allBox = allHead?.closest('section') || allHead?.parentElement;

  (allBox || document.querySelector('main') || document.body).after(box);
}

/* ===== 2. Vidha Nepali ma dekhaune (MUKTAK -> मुक्तक ...) ===== */
const VIDHA = { MUKTAK:'मुक्तक', GEET:'गीत', GAZAL:'गजल', KAVITA:'कविता', LEKH:'लेख' };
function translateVidha(){
  document.querySelectorAll('#allGrid .cat').forEach(el => {
    const k = el.textContent.trim().toUpperCase();
    if (VIDHA[k]) el.textContent = VIDHA[k];
  });
}

function applyHomeUpdate(){
  movePopularToEnd();
  translateVidha();
}

document.addEventListener('DOMContentLoaded', () => {
  applyHomeUpdate();
  setTimeout(applyHomeUpdate, 600);   // card JS bata aaye pachhi pani chalos
});
