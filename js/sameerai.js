// ============================================================
//  SAMEER AI — chatbot logic  (data/sameerai.js मा भएको SAMEER_BIO प्रयोग गर्छ)
//  नोट: यहाँ `const SAMEER_BIO` फेरि नलेख्नुस् — त्यो data/sameerai.js मा मात्र हुन्छ।
// ============================================================
(function () {
  let greeted = false;

  const RULES = [
    { key: 'study',            words: ['पढाइ','पढ्','अध्ययन','शास्त्री','कक्षा','विद्यालय','कलेज','study','studying','education','class','sanskrit','संस्कृत'] },
    { key: 'hometown',         words: ['घर','जन्म','स्याङ्जा','स्याङजा','वालिङ','सुर्कौदी','गाउँ','hometown','home','born','village'] },
    { key: 'currentAddress',   words: ['बस्','हाल','बुटवल','मणिग्राम','ठेगाना','address','live','living'] },
    { key: 'upcomingBook',     words: ['पुस्तक','किताब','अन्धो','प्रेम','काव्य','book','upcoming'] },
    { key: 'sanskritInterest', words: ['कालिदास','मेघदूत','ऋतुसंहार','श्लोक','kalidas','meghdut'] },
    { key: 'englishLearning',  words: ['अंग्रेजी','english'] },
    { key: 'hobbies',          words: ['फिल्म','संगीत','शौक','फुर्सद','मनोरञ्जन','hobby','hobbies','movie','music'] },
    { key: 'interests',        words: ['रुचि','मन पर्छ','साहित्य','कविता','उपन्यास','गीत','लेख्','interest','poem','poetry','write','writing','literature'] },
    { key: 'name',             words: ['नाम','को हो','तिमी को','परिचय','name','who','about','आफ्नो बारे'] }
  ];

  function reply(text) {
    const q = (text || '').toLowerCase();
    const bio = window.SAMEER_BIO || (typeof SAMEER_BIO !== 'undefined' ? SAMEER_BIO : null);
    if (!bio) return 'माफ गर्नुस्, बायो data लोड भएन। पेज reload गर्नुस्।';

    if (/^(नमस्ते|namaste|hi|hello|hey)\b/.test(q)) return bio.greeting;

    // सबैभन्दा धेरै keyword मिल्ने नियम छान्ने
    let best = null, bestScore = 0;
    for (const r of RULES) {
      let s = 0;
      for (const w of r.words) if (q.includes(w.toLowerCase())) s += w.length;
      if (s > bestScore) { bestScore = s; best = r; }
    }
    if (!best) {
      return 'यो प्रश्नको जवाफ मसँग छैन। तपाईं समीरको पढाइ, घर, हालको ठेगाना, रुचि, पुस्तक वा शौकबारे सोध्न सक्नुहुन्छ।';
    }
    if (best.key === 'name') {
      return 'म ' + bio.name + 'को AI सहायक हुँ। ' + bio.study + ' ' + bio.interests;
    }
    return bio[best.key];
  }

  function addMsg(text, who) {
    const box = document.getElementById('sameerAIMessages');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'sameerai-msg ' + who;
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  window.openSameerAI = function () {
    const modal = document.getElementById('sameerAIModal');
    if (!modal) return;
    modal.classList.add('open');
    if (!greeted) {
      greeted = true;
      const bio = window.SAMEER_BIO || (typeof SAMEER_BIO !== 'undefined' ? SAMEER_BIO : null);
      addMsg(bio ? bio.greeting : 'नमस्ते! 🙏 म समीर AI हुँ।', 'bot');
    }
    const input = document.getElementById('sameerAIInput');
    if (input) setTimeout(() => input.focus(), 400);
  };

  window.closeSameerAI = function () {
    const modal = document.getElementById('sameerAIModal');
    if (modal) modal.classList.remove('open');
  };

  window.sendSameerAIMessage = function () {
    const input = document.getElementById('sameerAIInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';
    setTimeout(() => addMsg(reply(text), 'bot'), 350);
  };

  document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('sameerAIInput');
    if (input) input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); window.sendSameerAIMessage(); }
    });
  });
})();
