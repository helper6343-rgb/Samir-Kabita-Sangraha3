// ===== ABOUT.JS — Magazine About Page Logic =====

document.addEventListener('DOMContentLoaded', () => {
  renderHero();
  renderStats();
  renderBio();
  renderTimeline();
  renderContact();
});

// ===== HERO =====
function renderHero() {
  const d = ABOUT_DATA;

  // Background photo
  const bg = document.getElementById('aboutHeroBg');
  if (d.photo) {
    const img = new Image();
    img.onload = () => {
      bg.style.backgroundImage = `url('${d.photo}')`;
    };
    img.onerror = () => {
      // Photo नभए emoji fallback
      bg.classList.add('no-photo');
      bg.textContent = d.photoEmoji || '✍️';
    };
    img.src = d.photo;
  } else {
    bg.classList.add('no-photo');
    bg.textContent = d.photoEmoji || '✍️';
  }

  document.getElementById('aboutQuote').textContent = `"${d.quote}"`;
  document.getElementById('aboutQuoteAuthor').textContent = d.quoteAuthor;
  document.getElementById('aboutName').textContent = d.name;
  document.getElementById('aboutSubtitle').textContent = d.subtitle;
  document.getElementById('aboutLocation').textContent = '📍 ' + d.location;
}

// ===== STATS (auto count from kavita.js) =====
function renderStats() {
  const kavita = KAVITA_DATA.filter(p => p.category === 'kavita').length;
  const lekh   = KAVITA_DATA.filter(p => p.category === 'lekh').length;
  const gazal  = KAVITA_DATA.filter(p => p.category === 'gazal').length;
  const total  = KAVITA_DATA.length;

  const stats = [
    { number: toNepaliNum(kavita), label: 'कविता' },
    { number: toNepaliNum(lekh),   label: 'लेख' },
    { number: toNepaliNum(gazal),  label: 'गजल' },
  ];

  // If any category is 0, show total instead
  const showTotal = (kavita + lekh + gazal) < total;

  document.getElementById('aboutStats').innerHTML = stats.map((s, i) => `
    <div class="stat-item" style="animation-delay:${i * 0.12}s">
      <div class="stat-number">${s.number || '०'}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('') + (showTotal ? `
    <div class="stat-item" style="animation-delay:0.36s;grid-column:1/-1;border-top:1px solid var(--border);">
      <div class="stat-number">${toNepaliNum(total)}</div>
      <div class="stat-label">जम्मा रचनाहरू</div>
    </div>
  ` : '');
}

// ===== BIO =====
function renderBio() {
  document.getElementById('aboutBio').textContent = ABOUT_DATA.bio;
}

// ===== TIMELINE =====
function renderTimeline() {
  const milestones = ABOUT_DATA.milestones || [];
  document.getElementById('aboutTimeline').innerHTML = milestones.map((m, i) => `
    <div class="timeline-item">
      <div class="timeline-left">
        <div class="timeline-year">${m.year}</div>
        <div class="timeline-line"></div>
      </div>
      <div class="timeline-dot"></div>
      <div class="timeline-text">${m.text}</div>
    </div>
  `).join('');
}

// ===== CONTACT =====
function renderContact() {
  const c = ABOUT_DATA.contact;
  const links = [
    { icon: '📘', name: 'Facebook',  label: 'Social',    href: c.facebook,  show: !!c.facebook },
    { icon: '📸', name: 'Instagram', label: 'Social',    href: c.instagram, show: !!c.instagram },
    { icon: '📧', name: 'Email',     label: 'सम्पर्क',   href: `mailto:${c.email}`, show: !!c.email },
    { icon: '💻', name: 'GitHub',    label: 'Code',      href: c.github,    show: !!c.github },
  ].filter(l => l.show);

  document.getElementById('aboutContact').innerHTML = links.map(l => `
    <a class="contact-btn" href="${l.href}" target="_blank" rel="noopener">
      <span class="c-icon">${l.icon}</span>
      <div class="contact-btn-inner">
        <span class="c-label">${l.label}</span>
        <span class="c-name">${l.name}</span>
      </div>
    </a>
  `).join('');
}

// ===== NEPALI NUMBER HELPER =====
const NEPALI_NUMS = ['०','१','२','३','४','५','६','७','८','९'];
function toNepaliNum(n) {
  return String(n).split('').map(d => NEPALI_NUMS[+d] ?? d).join('');
}
