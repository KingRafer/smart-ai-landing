const html=document.documentElement;
const saved=localStorage.getItem('theme');
if(saved)html.setAttribute('data-theme',saved);
document.getElementById('theme-toggle').addEventListener('click',()=>{
  const n=html.getAttribute('data-theme')==='dark'?'light':'dark';
  html.setAttribute('data-theme',n);
  localStorage.setItem('theme',n);
});

const hamburger=document.getElementById('hamburger'),mobileMenu=document.getElementById('mobile-menu');
hamburger.addEventListener('click',()=>{
  const open=mobileMenu.classList.toggle('open');
  document.body.style.overflow=open?'hidden':'';
});
function closeMenu(){mobileMenu.classList.remove('open');document.body.style.overflow='';}
function toggleFaq(btn){
  const item=btn.parentElement;
  const was=item.classList.contains('active');
  document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('active'));
  if(!was)item.classList.add('active');
}

/* Smarter reveal with direction variants */
(function(){
  const els=document.querySelectorAll('.reveal');
  els.forEach((el,i)=>{
    if(el.closest('.hero-visual')||el.closest('.monitor-card')) return;
    if(el.classList.contains('section-label')||el.classList.contains('section-title')) return;
    const mod=i%5;
    if(mod===1) el.classList.add('from-left');
    else if(mod===2) el.classList.add('from-right');
    else if(mod===3) el.classList.add('scale-up');
  });

  function show(el){el.classList.add('visible');}
  if('IntersectionObserver' in window){
    const obs=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          show(e.target);
          obs.unobserve(e.target);
          e.target.querySelectorAll('.perf-stat .value').forEach(animateCount);
        }
      });
    },{threshold:0.1,rootMargin:'0px 0px -30px 0px'});
    els.forEach((el,i)=>{
      el.style.transitionDelay=(i%7)*0.06+'s';
      obs.observe(el);
    });
  }else{
    els.forEach(show);
  }
  setTimeout(()=>document.querySelectorAll('.reveal:not(.visible)').forEach(show),3500);
})();

function animateCount(el){
  if(el.dataset.counted) return;
  el.dataset.counted='1';
  const raw=el.textContent.trim();
  const match=raw.match(/^([+$]?)([\d.,]+)(.*)$/);
  if(!match) return;
  const prefix=match[1], numStr=match[2].replace(/,/g,''), suffix=match[3];
  const target=parseFloat(numStr);
  if(isNaN(target)) return;
  const isInt=Number.isInteger(target)||!numStr.includes('.');
  const duration=900;
  const start=performance.now();
  function tick(now){
    const t=Math.min(1,(now-start)/duration);
    const eased=1-Math.pow(1-t,3);
    let val=target*eased;
    let display;
    if(isInt){
      display=Math.round(val).toLocaleString('en-US');
    }else{
      const decimals=(numStr.split('.')[1]||'').length||2;
      display=val.toFixed(decimals);
    }
    el.textContent=prefix+display+suffix;
    if(t<1) requestAnimationFrame(tick);
    else{
      el.textContent=raw;
      el.classList.add('counted');
    }
  }
  requestAnimationFrame(tick);
}

const nav=document.querySelector('.navbar');
window.addEventListener('scroll',()=>{
  if(nav)nav.classList.toggle('scrolled',window.scrollY>40);
},{passive:true});
