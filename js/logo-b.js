window.__SMARTAI_LOGO_B='';
window.SMARTAI_LOGO_SRC='data:image/jpeg;base64,'+(window.__SMARTAI_LOGO_A||'')+(window.__SMARTAI_LOGO_B||'');
(function(){
  function apply(){
    if(!window.SMARTAI_LOGO_SRC||window.SMARTAI_LOGO_SRC.length<100) return;
    document.querySelectorAll('a.logo,.sidebar-brand,[data-brand-logo]').forEach(function(el){
      if(el.getAttribute('data-logo-done')) return;
      el.setAttribute('data-logo-done','1');
      var h=el.classList.contains('sidebar-brand')?34:40;
      el.innerHTML='<img class="logo-img" src="'+window.SMARTAI_LOGO_SRC+'" alt="Smart AI" height="'+h+'"/>';
    });
  }
  window.applySmartAILogos=apply;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply);
  else apply();
})();
