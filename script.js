const themeToggle=document.getElementById('themeToggle');
const saved=localStorage.getItem('theme');

if(saved==='dark'||(!saved&&matchMedia('(prefers-color-scheme: dark)').matches)){
  document.body.classList.add('dark');
}

if(themeToggle){
  themeToggle.addEventListener('click',()=>{
    document.body.classList.toggle('dark');
    localStorage.setItem('theme',document.body.classList.contains('dark')?'dark':'light');
  });
}

// The current homepage does not contain #year. Guarding this prevents the
// rest of the script (including the Jeep Runner links) from being aborted.
const yearEl=document.getElementById('year');
if(yearEl) yearEl.textContent=new Date().getFullYear();

function addJeepRunnerLinks(){
  const heroActions=document.querySelector('.hero .actions');
  if(heroActions&&!heroActions.querySelector('[data-jeep-runner-link]')){
    const gameLink=document.createElement('a');
    gameLink.className='btn';
    gameLink.href='game.html';
    gameLink.textContent='Play Jeep Runner 🛞';
    gameLink.setAttribute('aria-label','Play Jeep Runner game');
    gameLink.dataset.jeepRunnerLink='hero';
    heroActions.appendChild(gameLink);
  }

  const nav=document.querySelector('.site-header nav');
  if(nav&&!nav.querySelector('[data-jeep-runner-link]')){
    const navLink=document.createElement('a');
    navLink.href='game.html';
    navLink.textContent='Game';
    navLink.dataset.jeepRunnerLink='nav';
    nav.appendChild(navLink);
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',addJeepRunnerLinks,{once:true});
}else{
  addJeepRunnerLinks();
}
