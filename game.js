const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score');
const bestEl=document.getElementById('best');
const overlay=document.getElementById('overlay');
const title=document.getElementById('overlayTitle');
const text=document.getElementById('overlayText');
const startBtn=document.getElementById('startBtn');

let running=false;
let last=0;
let score=0;
let speed=330;
let spawnTimer=0;
let nextSpawn=1.25;
let course=[];
let dust=[];
let featureId=0;
let best=Number(localStorage.getItem('jeepRunnerBest')||0);
bestEl.textContent=best;

const ground=292;
const jeep={x:105,y:0,w:78,h:42,vy:0,grounded:true,onRamp:null,rampHeight:0,angle:0};

function reset(){
  score=0;
  speed=330;
  spawnTimer=0;
  nextSpawn=1.2;
  course=[];
  dust=[];
  jeep.y=ground-jeep.h;
  jeep.vy=0;
  jeep.grounded=true;
  jeep.onRamp=null;
  jeep.rampHeight=0;
  jeep.angle=0;
  scoreEl.textContent='0';
}

function start(){
  reset();
  running=true;
  overlay.classList.add('hidden');
  last=performance.now();
  requestAnimationFrame(loop);
}

function makeDust(x,y,count=5){
  for(let i=0;i<count;i++){
    dust.push({x,y,vx:-70-Math.random()*100,vy:-20-Math.random()*65,a:1,size:3+Math.random()*4,color:'#b9956b'});
  }
}

function jump(){
  if(!running){start();return;}
  if(jeep.grounded){
    const rampBoost=jeep.onRamp?70:0;
    jeep.vy=-690-rampBoost;
    jeep.grounded=false;
    jeep.onRamp=null;
    makeDust(jeep.x+18,jeep.y+jeep.h,6);
  }
}

function addObstacle(x=canvas.width+40){
  const tall=Math.random()>.72;
  course.push({id:++featureId,type:tall?'stump':'rock',x,y:ground-(tall?52:34),w:tall?42:48,h:tall?52:34});
}

function addHole(x,width){
  const depth=54+Math.random()*18;
  course.push({id:++featureId,type:'hole',x,w:width,h:depth,mudY:ground+depth*.58});
}

function addRampHoleCombo(x=canvas.width+45){
  const longRamp=Math.random()>.5;
  const rampW=jeep.h*(longRamp?3:2); // ramp run is 2x or 3x vehicle height
  const rampH=longRamp?46:34;
  const holeW=longRamp?145+Math.random()*45:105+Math.random()*40;
  const ramp={id:++featureId,type:'ramp',x,w:rampW,h:rampH};
  course.push(ramp);
  addHole(x+rampW+5,holeW);
  nextSpawn=1.75+Math.random()*.75;
}

function addRandomHole(x=canvas.width+45){
  addHole(x,78+Math.random()*62);
  nextSpawn=1.35+Math.random()*.7;
}

function spawnCourse(){
  const roll=Math.random();
  if(roll<.42){
    addObstacle();
    nextSpawn=.95+Math.random()*.8-Math.min(score/5000,.18);
  }else if(roll<.78){
    addRampHoleCombo();
  }else{
    addRandomHole();
  }
}

function collide(a,b){
  const p=9;
  return a.x+p<b.x+b.w&&a.x+a.w-p>b.x&&a.y+p<b.y+b.h&&a.y+a.h-p>b.y;
}

function rampSurfaceAt(screenX){
  for(const f of course){
    if(f.type==='ramp'&&screenX>=f.x&&screenX<=f.x+f.w){
      const t=(screenX-f.x)/f.w;
      return {y:ground-f.h*t,feature:f};
    }
  }
  return null;
}

function holeAt(screenX){
  return course.find(f=>f.type==='hole'&&screenX>=f.x&&screenX<=f.x+f.w)||null;
}

function supportAt(screenX){
  const ramp=rampSurfaceAt(screenX);
  if(ramp)return {type:'ramp',y:ramp.y,feature:ramp.feature};
  if(holeAt(screenX))return null;
  return {type:'ground',y:ground,feature:null};
}

function launchFromRamp(){
  jeep.grounded=false;
  jeep.vy=-(500+jeep.rampHeight*3.5+speed*.08);
  makeDust(jeep.x+18,jeep.y+jeep.h,7);
  jeep.onRamp=null;
  jeep.rampHeight=0;
}

function gameOver(reason='Trail ended!'){
  if(!running)return;
  running=false;
  const final=Math.floor(score);
  if(final>best){
    best=final;
    localStorage.setItem('jeepRunnerBest',best);
    bestEl.textContent=best;
  }
  title.textContent=reason;
  text.textContent=`You made it ${final} points. Hit the trail again?`;
  startBtn.textContent='Run Again';
  overlay.classList.remove('hidden');
}

function updateJeep(dt){
  const wheelX=jeep.x+jeep.w*.68;
  const previousBottom=jeep.y+jeep.h;
  const support=supportAt(wheelX);

  if(jeep.grounded){
    if(jeep.onRamp&&(!support||support.type!=='ramp'||support.feature.id!==jeep.onRamp)){
      launchFromRamp();
    }else if(!support){
      jeep.grounded=false;
      jeep.onRamp=null;
    }else{
      jeep.y=support.y-jeep.h;
      jeep.vy=0;
      if(support.type==='ramp'){
        jeep.onRamp=support.feature.id;
        jeep.rampHeight=support.feature.h;
        jeep.angle=Math.atan2(-support.feature.h,support.feature.w);
      }else{
        jeep.onRamp=null;
        jeep.rampHeight=0;
        jeep.angle*=Math.max(0,1-dt*12);
      }
    }
  }

  if(!jeep.grounded){
    jeep.vy+=1800*dt;
    jeep.y+=jeep.vy*dt;
    jeep.angle*=Math.max(0,1-dt*2.5);

    const landing=supportAt(wheelX);
    if(landing&&jeep.vy>=0&&previousBottom<=landing.y+7&&jeep.y+jeep.h>=landing.y){
      jeep.y=landing.y-jeep.h;
      jeep.vy=0;
      jeep.grounded=true;
      if(landing.type==='ramp'){
        jeep.onRamp=landing.feature.id;
        jeep.rampHeight=landing.feature.h;
        jeep.angle=Math.atan2(-landing.feature.h,landing.feature.w);
      }else{
        jeep.onRamp=null;
        jeep.rampHeight=0;
        jeep.angle=0;
      }
      makeDust(jeep.x+22,jeep.y+jeep.h,4);
    }
  }

  const pit=holeAt(wheelX);
  if(pit&&jeep.y+jeep.h>=pit.mudY-2){
    makeMudSplash(jeep.x+jeep.w*.65,pit.mudY);
    gameOver('Stuck in the mud!');
  }else if(jeep.y>canvas.height+30){
    gameOver('That was a deep one!');
  }
}

function makeMudSplash(x,y){
  for(let i=0;i<12;i++){
    dust.push({x,y,vx:-120+Math.random()*240,vy:-80-Math.random()*130,a:1,size:4+Math.random()*6,color:'#76532d'});
  }
}

function update(dt){
  score+=dt*10;
  speed=Math.min(620,330+score*.42);
  scoreEl.textContent=Math.floor(score);

  for(const f of course)f.x-=speed*dt;
  course=course.filter(f=>f.x+f.w>-100);

  spawnTimer+=dt;
  if(spawnTimer>=nextSpawn){
    spawnTimer=0;
    spawnCourse();
  }

  updateJeep(dt);

  for(const d of dust){
    d.x+=d.vx*dt;
    d.y+=d.vy*dt;
    d.vy+=180*dt;
    d.a-=dt*1.65;
  }
  dust=dust.filter(d=>d.a>0);

  for(const f of course){
    if((f.type==='rock'||f.type==='stump')&&collide(jeep,f)){
      gameOver('Trail ended!');
      break;
    }
  }
}

function drawBackground(){
  ctx.fillStyle='#172634';
  ctx.fillRect(0,0,canvas.width,ground);

  ctx.fillStyle='#243746';
  ctx.beginPath();
  ctx.moveTo(0,220);
  for(let x=0;x<=canvas.width;x+=120){
    ctx.lineTo(x,180+Math.sin((x+score*2)/140)*25);
  }
  ctx.lineTo(canvas.width,ground);
  ctx.lineTo(0,ground);
  ctx.fill();

  ctx.fillStyle='#654a32';
  ctx.fillRect(0,ground,canvas.width,canvas.height-ground);
  ctx.strokeStyle='#8a6748';
  ctx.lineWidth=3;
  ctx.setLineDash([18,25]);
  ctx.beginPath();
  ctx.moveTo(0,ground+35);
  ctx.lineTo(canvas.width,ground+35);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHole(h){
  const bottom=canvas.height;
  ctx.fillStyle='#211c18';
  ctx.fillRect(h.x,ground,h.w,bottom-ground);

  ctx.fillStyle='#49351f';
  ctx.fillRect(h.x,h.mudY,h.w,bottom-h.mudY);

  ctx.fillStyle='#6f4b25';
  ctx.beginPath();
  ctx.moveTo(h.x,h.mudY+2);
  for(let x=0;x<=h.w;x+=14){
    ctx.lineTo(h.x+x,h.mudY+Math.sin((x+score*8)/16)*4);
  }
  ctx.lineTo(h.x+h.w,bottom);
  ctx.lineTo(h.x,bottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle='#a17a4e';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(h.x,ground);
  ctx.lineTo(h.x,ground+15);
  ctx.moveTo(h.x+h.w,ground);
  ctx.lineTo(h.x+h.w,ground+15);
  ctx.stroke();

  ctx.fillStyle='#9b713e';
  for(let i=0;i<3;i++){
    const bx=h.x+18+i*(h.w-36)/2;
    const by=h.mudY+8+(i%2)*9;
    ctx.beginPath();
    ctx.arc(bx,by,2.5+(i%2),0,Math.PI*2);
    ctx.fill();
  }
}

function drawRamp(r){
  ctx.fillStyle='#7a5a3a';
  ctx.beginPath();
  ctx.moveTo(r.x,ground);
  ctx.lineTo(r.x+r.w,ground-r.h);
  ctx.lineTo(r.x+r.w,ground);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle='#b48a58';
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.moveTo(r.x,ground-1);
  ctx.lineTo(r.x+r.w,ground-r.h);
  ctx.stroke();

  ctx.strokeStyle='#5d432c';
  ctx.lineWidth=2;
  for(let i=1;i<4;i++){
    const x=r.x+r.w*(i/4);
    const top=ground-r.h*(i/4);
    ctx.beginPath();
    ctx.moveTo(x,top+2);
    ctx.lineTo(x,ground);
    ctx.stroke();
  }
}

function drawJeep(){
  const x=jeep.x;
  const y=jeep.y;
  ctx.save();
  ctx.translate(x+jeep.w/2,y+jeep.h/2);
  ctx.rotate(jeep.angle);
  ctx.translate(-jeep.w/2,-jeep.h/2);

  ctx.fillStyle='#6ea8fe';
  ctx.fillRect(10,14,61,20);
  ctx.fillRect(25,3,34,16);
  ctx.fillStyle='#9dd0ff';
  ctx.fillRect(29,6,12,10);
  ctx.fillRect(44,6,11,10);
  ctx.fillStyle='#dbeafe';
  ctx.fillRect(69,18,8,7);

  ctx.fillStyle='#0b0f14';
  ctx.beginPath();
  ctx.arc(23,35,10,0,Math.PI*2);
  ctx.arc(61,35,10,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle='#8fa3b8';
  ctx.beginPath();
  ctx.arc(23,35,4,0,Math.PI*2);
  ctx.arc(61,35,4,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle='#6ea8fe';
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.moveTo(25,4);
  ctx.lineTo(21,-5);
  ctx.lineTo(24,-8);
  ctx.stroke();
  ctx.restore();
}

function drawObstacle(o){
  ctx.save();
  if(o.type==='rock'){
    ctx.fillStyle='#78828d';
    ctx.beginPath();
    ctx.moveTo(o.x,o.y+o.h);
    ctx.lineTo(o.x+7,o.y+10);
    ctx.lineTo(o.x+24,o.y);
    ctx.lineTo(o.x+43,o.y+13);
    ctx.lineTo(o.x+o.w,o.y+o.h);
    ctx.fill();
  }else{
    ctx.fillStyle='#765437';
    ctx.fillRect(o.x+10,o.y,o.w-20,o.h);
    ctx.fillRect(o.x,o.y+14,18,10);
    ctx.fillStyle='#96704b';
    ctx.fillRect(o.x+15,o.y+5,6,o.h-10);
  }
  ctx.restore();
}

function draw(){
  drawBackground();

  for(const f of course)if(f.type==='hole')drawHole(f);
  for(const f of course)if(f.type==='ramp')drawRamp(f);

  for(const d of dust){
    ctx.globalAlpha=Math.max(0,d.a);
    ctx.fillStyle=d.color;
    ctx.fillRect(d.x,d.y,d.size,d.size);
  }
  ctx.globalAlpha=1;

  drawJeep();
  for(const f of course)if(f.type==='rock'||f.type==='stump')drawObstacle(f);
}

function loop(now){
  if(!running)return;
  const dt=Math.min((now-last)/1000,.032);
  last=now;
  update(dt);
  draw();
  if(running)requestAnimationFrame(loop);
}

startBtn.addEventListener('click',start);
window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','KeyW'].includes(e.code)){
    e.preventDefault();
    jump();
  }
});
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();
  jump();
});

reset();
draw();
