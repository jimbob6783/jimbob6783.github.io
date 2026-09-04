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

function addJeepRunnerProject(){
  const projects=document.querySelector('#projects .projects');
  if(!projects||projects.querySelector('[data-jeep-runner-project]')) return;

  const number=String(projects.querySelectorAll('.project').length+1).padStart(2,'0');
  const article=document.createElement('article');
  article.className='project';
  article.dataset.jeepRunnerProject='true';
  article.innerHTML=`
    <div class="project-num">${number}</div>
    <div class="project-copy">
      <p class="kicker">INTERACTIVE · JAVASCRIPT GAME</p>
      <h3>Jeep Runner</h3>
      <p>Custom endless-runner built for this portfolio using the HTML5 Canvas API and vanilla JavaScript. The game includes ramp and mud-pit physics, animated suspension and rotating wheels, airborne vehicle control, combo scoring, collectibles, progressive trail levels, changing day/night conditions, synthesized sound effects, persistent high scores and multiple obstacle mechanics—including hazards that reward staying grounded instead of jumping.</p>
      <div class="tags"><span>JavaScript</span><span>HTML5 Canvas</span><span>Game Physics</span><span>Web Audio</span><span>LocalStorage</span><span>Responsive UI</span></div>
      <div class="project-links">
        <a href="game.html">Play Jeep Runner →</a>
        <a href="https://github.com/jimbob6783/jimbob6783.github.io/blob/main/game.js" target="_blank" rel="noopener noreferrer">View source ↗</a>
      </div>
    </div>`;
  projects.appendChild(article);
}

function enhancePortfolio(){
  addJeepRunnerLinks();
  addJeepRunnerProject();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',enhancePortfolio,{once:true});
}else{
  enhancePortfolio();
}
