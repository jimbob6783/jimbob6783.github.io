const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score');
const bestEl=document.getElementById('best');
const overlay=document.getElementById('overlay');
const title=document.getElementById('overlayTitle');
const text=document.getElementById('overlayText');
const startBtn=document.getElementById('startBtn');

const ground=292;
const jeep={x:105,y:0,w:78,h:42,vy:0,grounded:true,onRamp:null,rampHeight:0,angle:0};

let running=false,last=0,score=0,speed=330;
let course=[],particles=[],featureId=0,spawnTimer=0,spawnIndex=0;
let best=Number(localStorage.getItem('jeepRunnerBest')||0);
bestEl.textContent=best;

function makeRamp(x,size=3){
  const w=jeep.h*size;                 // exactly 2x or 3x vehicle height
  const h=size===3?58:42;
  return {id:++featureId,type:'ramp',x,w,h,size};
}

function makeHole(x,w=150){
  const depth=78;
  return {id:++featureId,type:'hole',x,w,h:depth,mudY:ground+48};
}

function addRampMudCombo(x=canvas.width+40,size=Math.random()>.45?3:2){
  const ramp=makeRamp(x,size);
  const gap=16;
  const holeW=size===3?175:125;
  course.push(ramp);
  course.push(makeHole(x+ramp.w+gap,holeW));
}

function addStandaloneHole(x=canvas.width+40){
  course.push(makeHole(x,95+Math.random()*55));
}

function addObstacle(x=canvas.width+40){
  const tall=Math.random()>.7;
  course.push({id:++featureId,type:tall?'stump':'rock',x,y:ground-(tall?52:34),w:tall?42:48,h:tall?52:34});
}

function reset(){
  score=0;speed=330;spawnTimer=0;spawnIndex=0;course=[];particles=[];
  jeep.y=ground-jeep.h;jeep.vy=0;jeep.grounded=true;jeep.onRamp=null;jeep.rampHeight=0;jeep.angle=0;
  scoreEl.textContent='0';

  // Guaranteed showcase: the player sees a large ramp + muddy pit almost immediately.
  addRampMudCombo(canvas.width-235,3);
}

function start(){
  reset();running=true;overlay.classList.add('hidden');last=performance.now();requestAnimationFrame(loop);
}

function puff(x,y,count=6,color='#b9956b'){
  for(let i=0;i<count;i++)particles.push({x,y,vx:-80+Math.random()*180,vy:-40-Math.random()*100,a:1,size:3+Math.random()*5,color});
}

function jump(){
  if(!running){start();return;}
  if(jeep.grounded){
    jeep.vy=-700-(jeep.onRamp?80:0);jeep.grounded=false;jeep.onRamp=null;
    puff(jeep.x+18,jeep.y+jeep.h,6);
  }
}

function rampSurfaceAt(x){
  for(const f of course){
    if(f.type==='ramp'&&x>=f.x&&x<=f.x+f.w){
      const t=(x-f.x)/f.w;
      return {type:'ramp',y:ground-f.h*t,feature:f};
    }
  }
  return null;
}

function holeAt(x){return course.find(f=>f.type==='hole'&&x>=f.x&&x<=f.x+f.w)||null;}

function supportAt(x){
  const ramp=rampSurfaceAt(x);if(ramp)return ramp;
  if(holeAt(x))return null;
  return {type:'ground',y:ground,feature:null};
}

function launchFromRamp(){
  jeep.grounded=false;
  // Strong enough to visibly arc over the matching pit.
  jeep.vy=-(610+jeep.rampHeight*2.4+speed*.05);
  jeep.angle=-0.18;
  puff(jeep.x+25,jeep.y+jeep.h,9);
  jeep.onRamp=null;jeep.rampHeight=0;
}

function gameOver(reason='Trail ended!'){
  if(!running)return;
  running=false;
  const final=Math.floor(score);
  if(final>best){best=final;localStorage.setItem('jeepRunnerBest',best);bestEl.textContent=best;}
  title.textContent=reason;
  text.textContent=`You made it ${final} points. Hit the trail again?`;
  startBtn.textContent='Run Again';overlay.classList.remove('hidden');
}

function collide(a,b){const p=9;return a.x+p<b.x+b.w&&a.x+a.w-p>b.x&&a.y+p<b.y+b.h&&a.y+a.h-p>b.y;}

function spawnNext(){
  const x=canvas.width+45;
  // A predictable early sequence ensures every player actually sees the new terrain.
  if(spawnIndex===0)addStandaloneHole(x);
  else if(spawnIndex===1)addRampMudCombo(x,2);
  else if(spawnIndex===2)addObstacle(x);
  else if(spawnIndex===3)addRampMudCombo(x,3);
  else{
    const r=Math.random();
    if(r<.48)addRampMudCombo(x,Math.random()>.5?3:2);
    else if(r<.78)addStandaloneHole(x);
    else addObstacle(x);
  }
  spawnIndex++;
}

function updateJeep(dt){
  const wheelX=jeep.x+jeep.w*.68;
  const previousBottom=jeep.y+jeep.h;
  const support=supportAt(wheelX);

  if(jeep.grounded){
    if(jeep.onRamp&&(!support||support.type!=='ramp'||support.feature.id!==jeep.onRamp)){
      launchFromRamp();
    }else if(!support){
      jeep.grounded=false;jeep.onRamp=null;
    }else{
      jeep.y=support.y-jeep.h;jeep.vy=0;
      if(support.type==='ramp'){
        jeep.onRamp=support.feature.id;jeep.rampHeight=support.feature.h;
        jeep.angle=-Math.atan2(support.feature.h,support.feature.w);
      }else{
        jeep.onRamp=null;jeep.rampHeight=0;jeep.angle*=Math.max(0,1-dt*14);
      }
    }
  }

  if(!jeep.grounded){
    jeep.vy+=1750*dt;jeep.y+=jeep.vy*dt;
    jeep.angle+=jeep.vy>0?0.35*dt:-0.08*dt;
    jeep.angle=Math.max(-.35,Math.min(.28,jeep.angle));

    const landing=supportAt(wheelX);
    if(landing&&jeep.vy>=0&&previousBottom<=landing.y+8&&jeep.y+jeep.h>=landing.y){
      jeep.y=landing.y-jeep.h;jeep.vy=0;jeep.grounded=true;jeep.angle=0;
      if(landing.type==='ramp'){
        jeep.onRamp=landing.feature.id;jeep.rampHeight=landing.feature.h;
      }else{jeep.onRamp=null;jeep.rampHeight=0;}
      puff(jeep.x+25,jeep.y+jeep.h,5);
    }
  }

  const pit=holeAt(wheelX);
  if(pit&&jeep.y+jeep.h>=pit.mudY-1){
    puff(jeep.x+jeep.w*.65,pit.mudY,18,'#70451f');
    gameOver('Stuck in the mud!');
  }else if(jeep.y>canvas.height+35){gameOver('That was a deep one!');}
}

function update(dt){
  score+=dt*10;speed=Math.min(610,330+score*.38);scoreEl.textContent=Math.floor(score);
  for(const f of course)f.x-=speed*dt;
  course=course.filter(f=>f.x+f.w>-120);

  spawnTimer+=dt;
  const interval=spawnIndex<2?2.25:1.65+Math.random()*.25;
  if(spawnTimer>=interval){spawnTimer=0;spawnNext();}

  updateJeep(dt);

  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.a-=dt*1.7;}
  particles=particles.filter(p=>p.a>0);

  for(const f of course){
    if((f.type==='rock'||f.type==='stump')&&collide(jeep,f)){gameOver('Trail ended!');break;}
  }
}

function drawBackground(){
  ctx.fillStyle='#162838';ctx.fillRect(0,0,canvas.width,ground);
  ctx.fillStyle='#294357';ctx.beginPath();ctx.moveTo(0,230);
  for(let x=0;x<=canvas.width;x+=100)ctx.lineTo(x,180+Math.sin((x+score*2)/135)*24);
  ctx.lineTo(canvas.width,ground);ctx.lineTo(0,ground);ctx.fill();

  // Dirt platform.
  ctx.fillStyle='#785437';ctx.fillRect(0,ground,canvas.width,canvas.height-ground);
  ctx.fillStyle='#9b734d';ctx.fillRect(0,ground,canvas.width,7);
  ctx.strokeStyle='#5c402c';ctx.lineWidth=2;ctx.setLineDash([20,26]);
  ctx.beginPath();ctx.moveTo(0,ground+38);ctx.lineTo(canvas.width,ground+38);ctx.stroke();ctx.setLineDash([]);
}

function drawHole(h){
  // Cut a dark opening through the dirt platform.
  ctx.fillStyle='#100d0b';ctx.fillRect(h.x-2,ground-3,h.w+4,canvas.height-ground+3);

  // Sloped dirt banks make the pit read as lower than the road.
  ctx.fillStyle='#4b3223';
  ctx.beginPath();ctx.moveTo(h.x-12,ground);ctx.lineTo(h.x+18,h.mudY);ctx.lineTo(h.x,h.mudY);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(h.x+h.w+12,ground);ctx.lineTo(h.x+h.w-18,h.mudY);ctx.lineTo(h.x+h.w,h.mudY);ctx.closePath();ctx.fill();

  // Mud pool, clearly below the platform.
  ctx.fillStyle='#553319';ctx.fillRect(h.x+12,h.mudY,h.w-24,canvas.height-h.mudY);
  ctx.fillStyle='#7c4b20';ctx.beginPath();ctx.moveTo(h.x+12,h.mudY);
  for(let x=0;x<=h.w-24;x+=12)ctx.lineTo(h.x+12+x,h.mudY+Math.sin((x+score*10)/13)*4);
  ctx.lineTo(h.x+h.w-12,canvas.height);ctx.lineTo(h.x+12,canvas.height);ctx.closePath();ctx.fill();

  ctx.strokeStyle='#c48a45';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.x+12,h.mudY);ctx.lineTo(h.x+h.w-12,h.mudY);ctx.stroke();

  ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle='#f3c678';ctx.fillText('MUD',h.x+h.w/2,h.mudY+23);
  ctx.textAlign='start';
}

function drawRamp(r){
  ctx.fillStyle='#80552e';ctx.beginPath();ctx.moveTo(r.x,ground);ctx.lineTo(r.x+r.w,ground-r.h);ctx.lineTo(r.x+r.w,ground);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#efb45e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(r.x,ground-2);ctx.lineTo(r.x+r.w,ground-r.h);ctx.stroke();

  ctx.strokeStyle='#4e321f';ctx.lineWidth=3;
  for(let i=1;i<6;i++){
    const t=i/6,x=r.x+r.w*t,y=ground-r.h*t;
    ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(x,ground);ctx.stroke();
  }

  ctx.font='bold 14px system-ui';ctx.fillStyle='#ffd27b';ctx.fillText(`${r.size}× RAMP`,r.x+8,ground-r.h-10);
}

function drawObstacle(o){
  if(o.type==='rock'){
    ctx.fillStyle='#838b94';ctx.beginPath();ctx.moveTo(o.x,o.y+o.h);ctx.lineTo(o.x+7,o.y+10);ctx.lineTo(o.x+24,o.y);ctx.lineTo(o.x+43,o.y+13);ctx.lineTo(o.x+o.w,o.y+o.h);ctx.fill();
  }else{
    ctx.fillStyle='#715038';ctx.fillRect(o.x+10,o.y,o.w-20,o.h);ctx.fillRect(o.x,o.y+14,18,10);ctx.fillStyle='#9a744f';ctx.fillRect(o.x+15,o.y+5,6,o.h-10);
  }
}

function drawJeep(){
  ctx.save();ctx.translate(jeep.x+jeep.w/2,jeep.y+jeep.h/2);ctx.rotate(jeep.angle);ctx.translate(-jeep.w/2,-jeep.h/2);
  ctx.fillStyle='#6ea8fe';ctx.fillRect(10,14,61,20);ctx.fillRect(25,3,34,16);
  ctx.fillStyle='#9dd0ff';ctx.fillRect(29,6,12,10);ctx.fillRect(44,6,11,10);
  ctx.fillStyle='#dbeafe';ctx.fillRect(69,18,8,7);
  ctx.fillStyle='#0b0f14';ctx.beginPath();ctx.arc(23,35,10,0,Math.PI*2);ctx.arc(61,35,10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8fa3b8';ctx.beginPath();ctx.arc(23,35,4,0,Math.PI*2);ctx.arc(61,35,4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#6ea8fe';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(25,4);ctx.lineTo(21,-5);ctx.lineTo(24,-8);ctx.stroke();ctx.restore();
}

function draw(){
  drawBackground();
  for(const f of course)if(f.type==='hole')drawHole(f);
  for(const f of course)if(f.type==='ramp')drawRamp(f);
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.a);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;
  drawJeep();
  for(const f of course)if(f.type==='rock'||f.type==='stump')drawObstacle(f);
}

function loop(now){
  if(!running)return;const dt=Math.min((now-last)/1000,.032);last=now;update(dt);draw();if(running)requestAnimationFrame(loop);
}

startBtn.addEventListener('click',start);
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();jump();}});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();jump();});
reset();draw();