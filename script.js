const themeToggle=document.getElementById('themeToggle');const saved=localStorage.getItem('theme');if(saved==='dark'||(!saved&&matchMedia('(prefers-color-scheme: dark)').matches))document.body.classList.add('dark');themeToggle.addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('theme',document.body.classList.contains('dark')?'dark':'light')});document.getElementById('year').textContent=new Date().getFullYear();

// Small portfolio easter egg: launch the vanilla-JS Jeep Runner game.
const heroActions=document.querySelector('.hero .actions');
if(heroActions){const gameLink=document.createElement('a');gameLink.className='btn';gameLink.href='game.html';gameLink.textContent='Play Jeep Runner 🛞';gameLink.setAttribute('aria-label','Play Jeep Runner game');heroActions.appendChild(gameLink);}
