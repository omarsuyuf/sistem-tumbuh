// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length > 1) {
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});

// Reveal-on-scroll: add `.reveal` to targets (CSS handles initial hidden state),
// then add `.in` when entering viewport.
const revealSelectors = [
  '.section-eyebrow',
  '.section-title',
  '.section-sub',
  '.omar-photo-wrap',
  '.omar-text',
  '.testi-card',
  '.outcome-block',
  '.outcome-guarantee',
  '.cta-action',
  '.cta-tagline'
];

const targets = document.querySelectorAll(revealSelectors.join(','));
targets.forEach(el => el.classList.add('reveal'));

// Stagger siblings
document.querySelectorAll('.testi-grid').forEach(grid => {
  [...grid.children].forEach((child, i) => {
    child.style.transitionDelay = `${i * 100}ms`;
  });
});
document.querySelectorAll('.compare-grid').forEach(grid => {
  [...grid.children].forEach((child, i) => {
    child.style.transitionDelay = `${i * 140}ms`;
  });
});
[...document.querySelectorAll('.path-track > *')].forEach((child, i) => {
  child.style.transitionDelay = `${i * 70}ms`;
});

const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

targets.forEach(el => io.observe(el));

// Parallax tilt for hero-line (subtle, mouse-driven)
const heroRight = document.querySelector('.hero-bg-cards.right');
if (heroRight) {
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 10;
    const y = (e.clientY / window.innerHeight - 0.5) * 8;
    heroRight.style.transform = `translateY(calc(-50% + ${y}px)) translateX(${x}px)`;
  });
}

// Hide scroll hint after first scroll of milestone path
const track = document.getElementById('pathTrack');
const hint = document.querySelector('.path-scroll-hint');
if (track && hint) {
  track.addEventListener('scroll', () => {
    if (track.scrollLeft > 80) hint.style.opacity = '0';
    else hint.style.opacity = '0.5';
  }, { passive: true });
}

// ============ WHATSAPP CTA — FIRE META PIXEL AddToCart EVENT ============
document.querySelectorAll('a[href*="wa.link"], a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(a => {
  a.addEventListener('click', () => {
    if (typeof fbq === 'function') {
      fbq('track', 'AddToCart', {
        content_name: 'Book Meeting - WhatsApp CTA',
        content_category: 'Consulting',
        source: 'sistem-tumbuh-landing'
      });
    }
  });
});

// ============ BOOK MEETING MODAL ============
// Web3Forms integration — submissions go to omarsuyufw@gmail.com
const W3F_ENDPOINT = 'https://api.web3forms.com/submit';
const W3F_ACCESS_KEY = 'e99eee46-4934-4bdd-924f-6e03ce58e8f6';
const FAILED_KEY = 'st_failed_submits';

// On page load — retry any submissions that failed in previous sessions
(async function retryFailedSubmits() {
  try {
    const raw = localStorage.getItem(FAILED_KEY);
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    console.log(`[Book Meeting] Found ${queue.length} pending submission(s), retrying...`);
    const stillFailed = [];

    for (const entry of queue) {
      const fd = new FormData();
      Object.entries(entry).forEach(([k, v]) => {
        if (k !== 'failedAt' && v != null) fd.append(k, String(v));
      });
      fd.append('access_key', W3F_ACCESS_KEY);
      fd.append('subject', `Lead Baru (recovered) — ${entry.nama || 'Sistem Tumbuh'}`);
      fd.append('from_name', `Sistem Tumbuh Landing`);

      try {
        const res = await fetch(W3F_ENDPOINT, { method: 'POST', body: fd, keepalive: true });
        const data = await res.json();
        if (data.success) {
          console.log('[Book Meeting] Recovered submission:', entry.nama);
        } else {
          stillFailed.push(entry);
        }
      } catch {
        stillFailed.push(entry);
      }
    }

    if (stillFailed.length > 0) {
      localStorage.setItem(FAILED_KEY, JSON.stringify(stillFailed));
    } else {
      localStorage.removeItem(FAILED_KEY);
    }
  } catch (err) {
    console.error('[Book Meeting] Recovery error:', err);
  }
})();

// Rate limit: prevent rapid resubmits in the same browser session
const RATE_LIMIT_KEY = 'st_last_submit';
const RATE_LIMIT_MS = 60_000; // 60 seconds between submissions

function canSubmit() {
  try {
    const last = parseInt(sessionStorage.getItem(RATE_LIMIT_KEY) || '0', 10);
    return Date.now() - last > RATE_LIMIT_MS;
  } catch { return true; }
}
function markSubmitted() {
  try { sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now())); } catch {}
}

const modal = document.getElementById('bookModal');
const form = document.getElementById('bookForm');
const modalHeader = document.getElementById('modalHeader');
const modalFooter = document.getElementById('modalFooter');
const btnBack = document.getElementById('btnBack');
const btnNext = document.getElementById('btnNext');
const btnSubmit = document.getElementById('btnSubmit');
const stepCurrentEl = document.getElementById('stepCurrent');
const progressFill = document.getElementById('progressFill');
const TOTAL_STEPS = 5;
let currentStep = 1;
let lastTrigger = null;

function showStep(n) {
  form.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  const target = form.querySelector(`[data-step="${n}"]`);
  if (target) target.classList.add('active');

  stepCurrentEl.textContent = n;
  const pct = ((n - 1) / (TOTAL_STEPS - 1)) * 100;
  progressFill.style.width = `${pct}%`;

  btnBack.disabled = (n === 1);
  btnNext.hidden = (n === TOTAL_STEPS);
  btnSubmit.hidden = (n !== TOTAL_STEPS);

  setTimeout(() => {
    target?.querySelector('input, textarea, select')?.focus();
  }, 80);
}

function validateStep(n) {
  const stepEl = form.querySelector(`[data-step="${n}"]`);
  if (!stepEl) return true;
  const inputs = stepEl.querySelectorAll('input, textarea, select');
  for (const inp of inputs) {
    inp.classList.remove('error');
    if (!inp.value.trim() || !inp.checkValidity()) {
      inp.classList.add('error');
      inp.focus();
      return false;
    }
  }
  return true;
}

function openModal(trigger) {
  lastTrigger = trigger || null;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  currentStep = 1;
  modalHeader.hidden = false;
  modalFooter.hidden = false;
  showStep(1);
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  setTimeout(() => {
    form.reset();
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    currentStep = 1;
    showStep(1);
    modalHeader.hidden = false;
    modalFooter.hidden = false;
  }, 250);
  if (lastTrigger) lastTrigger.focus();
}

function showLoading() {
  form.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  form.querySelector('.form-loading').classList.add('active');
  modalHeader.hidden = true;
  modalFooter.hidden = true;
}

function showSuccess() {
  form.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  form.querySelector('.form-success').classList.add('active');
  modalHeader.hidden = true;
  modalFooter.hidden = true;
}

// Wire triggers
document.querySelectorAll('[data-book-cta]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(btn);
  });
});

document.getElementById('modalClose').addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

btnNext.addEventListener('click', () => {
  if (!validateStep(currentStep)) return;
  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    showStep(currentStep);
  }
});

btnBack.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
});

async function submitWithRetry(formData, attempt = 1, maxAttempts = 3) {
  try {
    // keepalive: true → browser guarantees request completes even if user closes the tab
    const res = await fetch(W3F_ENDPOINT, { method: 'POST', body: formData, keepalive: true });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Web3Forms returned non-success');
    console.log('[Book Meeting] Lead submitted successfully on attempt', attempt);
    return true;
  } catch (err) {
    console.warn(`[Book Meeting] Attempt ${attempt}/${maxAttempts} failed:`, err.message);
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return submitWithRetry(formData, attempt + 1, maxAttempts);
    }
    // All retries exhausted — save to localStorage; will auto-retry on next page visit
    try {
      const failed = JSON.parse(localStorage.getItem(FAILED_KEY) || '[]');
      const entries = {};
      formData.forEach((v, k) => { if (k !== 'access_key') entries[k] = v; });
      failed.push({ ...entries, failedAt: new Date().toISOString() });
      localStorage.setItem(FAILED_KEY, JSON.stringify(failed));
      console.error('[Book Meeting] All retries failed. Saved to localStorage, will auto-retry on next visit.');
    } catch (storageErr) {
      console.error('[Book Meeting] All retries failed and localStorage unavailable:', storageErr);
    }
    return false;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateStep(currentStep)) return;

  // Honeypot — silent reject. Bot fills hidden field, real users don't.
  const honeypot = form.querySelector('input[name="botcheck"]');
  if (honeypot && honeypot.value) {
    showSuccess();
    return;
  }

  // Rate limit
  if (!canSubmit()) {
    btnSubmit.textContent = 'Tunggu sebentar...';
    setTimeout(() => { btnSubmit.textContent = 'Kirim Data'; }, 2500);
    return;
  }

  // Show loading state — buttons hidden, spinner visible
  showLoading();

  const formData = new FormData(form);
  formData.append('access_key', W3F_ACCESS_KEY);
  formData.append('subject', `Lead Baru — ${formData.get('nama') || 'Sistem Tumbuh'}`);
  formData.append('from_name', `Sistem Tumbuh Landing`);
  formData.append('source', 'sistem-tumbuh-landing');

  // Minimum 700ms so spinner doesn't flash on super-fast networks
  const minWait = new Promise(r => setTimeout(r, 700));

  // Wait for both: real submission (with retries) AND minimum spinner time
  await Promise.all([minWait, submitWithRetry(formData)]);

  markSubmitted();
  showSuccess();
});

// Clear error state on input
form.addEventListener('input', (e) => {
  if (e.target.classList?.contains('error')) e.target.classList.remove('error');
});
