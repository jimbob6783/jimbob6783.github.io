const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score');
const bestEl=document.getElementById('best');
const overlay=document.getElementById('overlay');
const title=document.getElementById('overlayTitle');
const text=document.getElementById('overlayText');
const startBtn=document.getElementById('startBtn');

const ground=292;
const jeep={x:105,y:0,w:86,h:46,vy:0,grounded:true,onRamp:null,rampHeight:0,angle:0};
let running=false,last=0,score=0,speed=340;
let course=[],particles=[],featureId=0,spawnTimer=0,spawnIndex=0;
let best=Number(localStorage.getItem('jeepRunnerBest')||0);
bestEl.textContent=best;

function makeRamp(x,size=3){
  const w=jeep.h*size;
  const h=size===3?60:43;
  return {id:++featureId,type:'ramp',x,w,h,size};
}
function makeHole(x,w=150){return {id:++featureId,type:'hole',x,w,h:78,mudY:ground+48};}
function addRampMudCombo(x=canvas.width+40,size=Math.random()>.5?3:2){
  const ramp=makeRamp(x,size),gap=16,holeW=size===3?178:128;
  course.push(ramp,makeHole(x+ramp.w+gap,holeW));
}
function addStandaloneHole(x=canvas.width+40){course.push(makeHole(x,95+Math.random()*55));}

function addObstacle(x=canvas.width+40,forcedType=null){
  const types=['rock','stump','logpile','tires','boulder'];
  const type=forcedType||types[Math.floor(Math.random()*types.length)];
  const dims={
    rock:{w:48,h:34},stump:{w:42,h:52},logpile:{w:68,h:31},
    tires:{w:48,h:40},boulder:{w:58,h:46}
  }[type];
  course.push({id:++featureId,type,x,y:ground-dims.h,w:dims.w,h:dims.h});
}

function addStayLowHazard(x=canvas.width+40){
  // Jeep clears this while grounded, but a normal jump intersects it.
  course.push({id:++featureId,type:'lowbranch',x,y:ground-116,w:118,h:34});
}

function reset(){
  score=0;speed=340;spawnTimer=0;spawnIndex=0;course=[];particles=[];
  jeep.y=ground-jeep.h;jeep.vy=0;jeep.grounded=true;jeep.onRamp=null;jeep.rampHeight=0;jeep.angle=0;
  scoreEl.textContent='0';
  // Keep one early showcase ramp, but ramps are less common afterward.
  addRampMudCombo(canvas.width-225,3);
}
function start(){reset();running=true;overlay.classList.add('hidden');last=performance.now();requestAnimationFrame(loop);}
function puff(x,y,count=6,color='#b9956b'){
  for(let i=0;i<count;i++)particles.push({x,y,vx:-80+Math.random()*180,vy:-40-Math.random()*100,a:1,size:3+Math.random()*5,color});
}
function jump(){
  if(!running){start();return;}
  if(jeep.grounded){jeep.vy=-710-(jeep.onRamp?75:0);jeep.grounded=false;jeep.onRamp=null;puff(jeep.x+18,jeep.y+jeep.h,6);}
}
function rampSurfaceAt(x){
  for(const f of course)if(f.type==='ramp'&&x>=f.x&&x<=f.x+f.w){const t=(x-f.x)/f.w;return {type:'ramp',y:ground-f.h*t,feature:f};}
  return null;
}
function holeAt(x){return course.find(f=>f.type==='hole'&&x>=f.x&&x<=f.x+f.w)||null;}
function supportAt(x){const ramp=rampSurfaceAt(x);if(ramp)return ramp;if(holeAt(x))return null;return {type:'ground',y:ground,feature:null};}
function launchFromRamp(){
  jeep.grounded=false;jeep.vy=-(610+jeep.rampHeight*2.35+speed*.05);jeep.angle=-0.18;
  puff(jeep.x+25,jeep.y+jeep.h,9);jeep.onRamp=null;jeep.rampHeight=0;
}
function gameOver(reason='Trail ended!'){
  if(!running)return;running=false;
  const final=Math.floor(score);if(final>best){best=final;localStorage.setItem('jeepRunnerBest',best);bestEl.textContent=best;}
  title.textContent=reason;text.textContent=`You made it ${final} points. Hit the trail again?`;startBtn.textContent='Run Again';overlay.classList.remove('hidden');
}
function collide(a,b){const p=8;return a.x+p<b.x+b.w&&a.x+a.w-p>b.x&&a.y+p<b.y+b.h&&a.y+a.h-p>b.y;}

function spawnNext(){
  const x=canvas.width+45;
  // Early sequence deliberately teaches every mechanic.
  if(spawnIndex===0)addStandaloneHole(x);
  else if(spawnIndex===1)addObstacle(x,'logpile');
  else if(spawnIndex===2)addStayLowHazard(x);
  else if(spawnIndex===3)addObstacle(x,'tires');
  else if(spawnIndex===4)addRampMudCombo(x,2);
  else{
    const r=Math.random();
    if(r<.27)addRampMudCombo(x,Math.random()>.55?3:2);          // fewer ramps
    else if(r<.48)addStandaloneHole(x);
    else if(r<.66)addStayLowHazard(x);                         // don't jump
    else addObstacle(x);
  }
  spawnIndex++;
}

function updateJeep(dt){
  const wheelX=jeep.x+jeep.w*.68,previousBottom=jeep.y+jeep.h,support=supportAt(wheelX);
  if(jeep.grounded){
    if(jeep.onRamp&&(!support||support.type!=='ramp'||support.feature.id!==jeep.onRamp))launchFromRamp();
    else if(!support){jeep.grounded=false;jeep.onRamp=null;}
    else{
      jeep.y=support.y-jeep.h;jeep.vy=0;
      if(support.type==='ramp'){
        jeep.onRamp=support.feature.id;jeep.rampHeight=support.feature.h;jeep.angle=-Math.atan2(support.feature.h,support.feature.w);
      }else{jeep.onRamp=null;jeep.rampHeight=0;jeep.angle*=Math.max(0,1-dt*14);}
    }
  }
  if(!jeep.grounded){
    jeep.vy+=1750*dt;jeep.y+=jeep.vy*dt;jeep.angle+=jeep.vy>0?0.35*dt:-0.08*dt;jeep.angle=Math.max(-.35,Math.min(.28,jeep.angle));
    const landing=supportAt(wheelX);
    if(landing&&jeep.vy>=0&&previousBottom<=landing.y+8&&jeep.y+jeep.h>=landing.y){
      jeep.y=landing.y-jeep.h;jeep.vy=0;jeep.grounded=true;jeep.angle=0;
      if(landing.type==='ramp'){jeep.onRamp=landing.feature.id;jeep.rampHeight=landing.feature.h;}else{jeep.onRamp=null;jeep.rampHeight=0;}
      puff(jeep.x+25,jeep.y+jeep.h,5);
    }
  }
  const pit=holeAt(wheelX);
  if(pit&&jeep.y+jeep.h>=pit.mudY-1){puff(jeep.x+jeep.w*.65,pit.mudY,18,'#70451f');gameOver('Stuck in the mud!');}
  else if(jeep.y>canvas.height+35)gameOver('That was a deep one!');
}

function update(dt){
  score+=dt*10;
  // Faster difficulty ramp: reaches high speed noticeably sooner.
  speed=Math.min(690,340+score*.62);
  scoreEl.textContent=Math.floor(score);
  for(const f of course)f.x-=speed*dt;
  course=course.filter(f=>f.x+f.w>-140);
  spawnTimer+=dt;
  const interval=spawnIndex<2?2.1:Math.max(1.18,1.62-score*.00055);
  if(spawnTimer>=interval){spawnTimer=0;spawnNext();}
  updateJeep(dt);
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.a-=dt*1.7;}
  particles=particles.filter(p=>p.a>0);

  for(const f of course){
    if(['rock','stump','logpile','tires','boulder','lowbranch'].includes(f.type)&&collide(jeep,f)){
      gameOver(f.type==='lowbranch'?'Should have stayed low!':'Trail ended!');break;
    }
  }
}

function drawBackground(){
  ctx.fillStyle='#162838';ctx.fillRect(0,0,canvas.width,ground);
  ctx.fillStyle='#294357';ctx.beginPath();ctx.moveTo(0,230);
  for(let x=0;x<=canvas.width;x+=100)ctx.lineTo(x,180+Math.sin((x+score*2)/135)*24);
  ctx.lineTo(canvas.width,ground);ctx.lineTo(0,ground);ctx.fill();
  ctx.fillStyle='#785437';ctx.fillRect(0,ground,canvas.width,canvas.height-ground);
  ctx.fillStyle='#9b734d';ctx.fillRect(0,ground,canvas.width,7);
  ctx.strokeStyle='#5c402c';ctx.lineWidth=2;ctx.setLineDash([20,26]);ctx.beginPath();ctx.moveTo(0,ground+38);ctx.lineTo(canvas.width,ground+38);ctx.stroke();ctx.setLineDash([]);
}
function drawHole(h){
  ctx.fillStyle='#100d0b';ctx.fillRect(h.x-2,ground-3,h.w+4,canvas.height-ground+3);
  ctx.fillStyle='#4b3223';ctx.beginPath();ctx.moveTo(h.x-12,ground);ctx.lineTo(h.x+18,h.mudY);ctx.lineTo(h.x,h.mudY);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(h.x+h.w+12,ground);ctx.lineTo(h.x+h.w-18,h.mudY);ctx.lineTo(h.x+h.w,h.mudY);ctx.closePath();ctx.fill();
  ctx.fillStyle='#553319';ctx.fillRect(h.x+12,h.mudY,h.w-24,canvas.height-h.mudY);
  ctx.fillStyle='#7c4b20';ctx.beginPath();ctx.moveTo(h.x+12,h.mudY);
  for(let x=0;x<=h.w-24;x+=12)ctx.lineTo(h.x+12+x,h.mudY+Math.sin((x+score*10)/13)*4);
  ctx.lineTo(h.x+h.w-12,canvas.height);ctx.lineTo(h.x+12,canvas.height);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c48a45';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.x+12,h.mudY);ctx.lineTo(h.x+h.w-12,h.mudY);ctx.stroke();
  ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle='#f3c678';ctx.fillText('MUD',h.x+h.w/2,h.mudY+23);ctx.textAlign='start';
}
function drawRamp(r){
  ctx.fillStyle='#80552e';ctx.beginPath();ctx.moveTo(r.x,ground);ctx.lineTo(r.x+r.w,ground-r.h);ctx.lineTo(r.x+r.w,ground);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#efb45e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(r.x,ground-2);ctx.lineTo(r.x+r.w,ground-r.h);ctx.stroke();
  ctx.strokeStyle='#4e321f';ctx.lineWidth=3;
  for(let i=1;i<6;i++){const t=i/6,x=r.x+r.w*t,y=ground-r.h*t;ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(x,ground);ctx.stroke();}
  ctx.font='bold 14px system-ui';ctx.fillStyle='#ffd27b';ctx.fillText(`${r.size}× RAMP`,r.x+8,ground-r.h-10);
}

function drawObstacle(o){
  if(o.type==='rock'){
    ctx.fillStyle='#838b94';ctx.beginPath();ctx.moveTo(o.x,o.y+o.h);ctx.lineTo(o.x+7,o.y+10);ctx.lineTo(o.x+24,o.y);ctx.lineTo(o.x+43,o.y+13);ctx.lineTo(o.x+o.w,o.y+o.h);ctx.fill();
  }else if(o.type==='stump'){
    ctx.fillStyle='#715038';ctx.fillRect(o.x+10,o.y,o.w-20,o.h);ctx.fillRect(o.x,o.y+14,18,10);ctx.fillStyle='#9a744f';ctx.fillRect(o.x+15,o.y+5,6,o.h-10);
  }else if(o.type==='logpile'){
    ctx.strokeStyle='#4f321f';ctx.lineWidth=13;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(o.x+8,ground-9);ctx.lineTo(o.x+58,ground-27);ctx.moveTo(o.x+14,ground-26);ctx.lineTo(o.x+62,ground-8);ctx.stroke();ctx.lineCap='butt';
  }else if(o.type==='tires'){
    ctx.strokeStyle='#111820';ctx.lineWidth=9;
    ctx.beginPath();ctx.arc(o.x+16,ground-13,11,0,Math.PI*2);ctx.arc(o.x+31,ground-14,11,0,Math.PI*2);ctx.arc(o.x+24,ground-31,11,0,Math.PI*2);ctx.stroke();
  }else if(o.type==='boulder'){
    ctx.fillStyle='#68737d';ctx.beginPath();ctx.moveTo(o.x,ground);ctx.lineTo(o.x+5,o.y+15);ctx.lineTo(o.x+20,o.y+2);ctx.lineTo(o.x+42,o.y);ctx.lineTo(o.x+58,ground-10);ctx.lineTo(o.x+52,ground);ctx.closePath();ctx.fill();
  }else if(o.type==='lowbranch'){
    ctx.fillStyle='#4c3020';ctx.fillRect(o.x,o.y+10,o.w,o.h-12);
    ctx.fillStyle='#263d25';ctx.beginPath();ctx.arc(o.x+18,o.y+8,17,0,Math.PI*2);ctx.arc(o.x+55,o.y+5,20,0,Math.PI*2);ctx.arc(o.x+94,o.y+10,17,0,Math.PI*2);ctx.fill();
    ctx.font='bold 12px system-ui';ctx.fillStyle='#ffd27b';ctx.textAlign='center';ctx.fillText('STAY LOW',o.x+o.w/2,o.y-8);ctx.textAlign='start';
  }
}

function drawJeep(){
  ctx.save();ctx.translate(jeep.x+jeep.w/2,jeep.y+jeep.h/2);ctx.rotate(jeep.angle);ctx.translate(-jeep.w/2,-jeep.h/2);
  // Wrangler-like side profile: boxy body, upright windshield, fenders, spare tire.
  ctx.fillStyle='#4f8fe8';
  ctx.fillRect(12,16,66,20);                     // tub
  ctx.fillRect(29,4,35,18);                      // cabin
  ctx.fillStyle='#77b8f5';ctx.fillRect(33,7,12,11);ctx.fillRect(48,7,12,11);
  ctx.strokeStyle='#243447';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(28,4);ctx.lineTo(25,20);ctx.moveTo(64,4);ctx.lineTo(68,20);ctx.stroke();
  ctx.fillStyle='#396fba';ctx.fillRect(8,20,9,11);ctx.fillRect(74,21,9,10); // bumpers/fenders
  ctx.strokeStyle='#2e5f9e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(25,34,13,Math.PI,0);ctx.arc(64,34,13,Math.PI,0);ctx.stroke();
  ctx.fillStyle='#0b0f14';ctx.beginPath();ctx.arc(25,37,11,0,Math.PI*2);ctx.arc(64,37,11,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8fa3b8';ctx.beginPath();ctx.arc(25,37,4,0,Math.PI*2);ctx.arc(64,37,4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#0b0f14';ctx.beginPath();ctx.arc(10,17,9,0,Math.PI*2);ctx.fill(); // rear-mounted spare
  ctx.strokeStyle='#d8e8f7';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(75+i*2,23);ctx.lineTo(75+i*2,29);ctx.stroke();}
  ctx.fillStyle='#fff1a8';ctx.fillRect(79,19,5,6);
  ctx.restore();
}

function draw(){
  drawBackground();
  for(const f of course)if(f.type==='hole')drawHole(f);
  for(const f of course)if(f.type==='ramp')drawRamp(f);
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.a);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;
  drawJeep();
  for(const f of course)if(['rock','stump','logpile','tires','boulder','lowbranch'].includes(f.type))drawObstacle(f);
}
function loop(now){if(!running)return;const dt=Math.min((now-last)/1000,.032);last=now;update(dt);draw();if(running)requestAnimationFrame(loop);}
startBtn.addEventListener('click',start);
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();jump();}});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();jump();});
reset();draw();