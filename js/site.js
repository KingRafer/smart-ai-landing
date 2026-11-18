const html = document.documentElement;
const saved = localStorage.getItem('theme');
if (saved) html.setAttribute('data-theme', saved);
var themeBtn = document.getElementById('theme-toggle');
if (themeBtn) themeBtn.addEventListener('click', () => {
  const n = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', n);
  localStorage.setItem('theme', n);
});
const hamburger = document.getElementById('hamburger'), mobileMenu = document.getElementById('mobile-menu');
if (hamburger && mobileMenu) hamburger.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  document.body.style.overflow = open ? 'hidden' : '';
});
function closeMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
}
function toggleFaq(btn) {
  const item = btn.parentElement;
  const was = item.classList.contains('active');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
  if (!was) item.classList.add('active');
}
const nav = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* Load official Smart AI logo */
(function loadBrandLogo() {
  function injectCss() {
    if (document.getElementById('smartai-logo-css')) return;
    var s = document.createElement('style');
    s.id = 'smartai-logo-css';
    s.textContent = '.logo{display:inline-flex;align-items:center}.logo-img{height:42px;width:auto;display:block;object-fit:contain}footer .logo-img{height:36px}';
    document.head.appendChild(s);
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = src;
      sc.onload = resolve;
      sc.onerror = reject;
      document.head.appendChild(sc);
    });
  }
  injectCss();
  loadScript('js/logo-a.js')
    .then(function () { return loadScript('js/logo-b.js'); })
    .then(function () { if (window.applySmartAILogos) window.applySmartAILogos(); })
    .catch(function () {});
})();

/* ===== Animasi pop pada card ===== */
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var CARDS = '.why-card,.eco-card,.perf-card,.testi-card,.adv-card,.step,.feature-bar-item,.faq-item';
  var FORMS = '.form-card,.login-card';
  var LOAD = CARDS + ',' + FORMS;
  var CLICK = CARDS + ',.monitor-card,.stat-box';
  var cards = [].slice.call(document.querySelectorAll(LOAD));
  function popIn(el) {
    if (!el.classList.contains('pop-card')) return;
    var i = [].indexOf.call(el.parentNode.children, el) % 6;
    el.classList.remove('pop-card');
    if (el.animate) el.animate([
      { opacity: 0, transform: 'scale(.78) translateY(24px)' },
      { opacity: 1, transform: 'scale(1.05) translateY(0)', offset: .6 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 650, delay: i * 80, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
  }
  cards.forEach(function (el) {
    el.classList.remove('reveal');
    el.classList.add('pop-card');
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          popIn(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: .1 });
    cards.forEach(function (el) { io.observe(el); });
  } else {
    cards.forEach(popIn);
  }
  setTimeout(function () { cards.forEach(popIn); }, 3500);
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest(CLICK);
    if (!el || !el.animate) return;
    el.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(.93)', offset: .25 },
      { transform: 'scale(1.06)', offset: .65 },
      { transform: 'scale(1)' }
    ], { duration: 450, easing: 'ease-out' });
  });
})();
