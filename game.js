const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score');
const bestEl=document.getElementById('best');
const comboEl=document.getElementById('combo');
const levelEl=document.getElementById('level');
const badgesEl=document.getElementById('badges');
const soundBtn=document.getElementById('soundBtn');
const overlay=document.getElementById('overlay');
const title=document.getElementById('overlayTitle');
const text=document.getElementById('overlayText');
const startBtn=document.getElementById('startBtn');

const ground=292;
const jeep={x:105,y:0,w:88,h:48,vy:0,grounded:true,onRamp:null,rampHeight:0,angle:0,wheelSpin:0,suspension:0,jumpStartX:0,airDistance:0};
let running=false,last=0,score=0,speed=350,distance=0;
let course=[],particles=[],collectibles=[],featureId=0,spawnTimer=0,spawnIndex=0;
let combo=0,badges=0,level=1,lastMilestone=0,screenShake=0,airControl=0;
let best=Number(localStorage.getItem('jeepRunnerBest')||0);
let bestJump=Number(localStorage.getItem('jeepRunnerBestJump')||0);
let lifetimeBadges=Number(localStorage.getItem('jeepRunnerBadges')||0);
let soundOn=localStorage.getItem('jeepRunnerSound')!=='off';
let audioCtx=null;
bestEl.textContent=best;

function tone(freq=220,duration=.08,type='square',volume=.035){
  if(!soundOn)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.value=volume;
    o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration);
  }catch(e){}
}
function updateSoundButton(){if(soundBtn)soundBtn.textContent=soundOn?'🔊 Sound':'🔇 Sound';}
updateSoundButton();

function makeRamp(x,size=3){const w=jeep.h*size,h=size===3?60:43;return {id:++featureId,type:'ramp',x,w,h,size,counted:true};}
function makeHole(x,w=150){return {id:++featureId,type:'hole',x,w,h:78,mudY:ground+48,counted:false};}
function addRampMudCombo(x=canvas.width+40,size=Math.random()>.5?3:2){const ramp=makeRamp(x,size),gap=16,holeW=size===3?178:128;course.push(ramp,makeHole(x+ramp.w+gap,holeW));}
function addStandaloneHole(x=canvas.width+40){course.push(makeHole(x,95+Math.random()*55));}
function addObstacle(x=canvas.width+40,forcedType=null){
  const types=['rock','stump','logpile','tires','boulder','cone','fallenSign'];
  const type=forcedType||types[Math.floor(Math.random()*types.length)];
  const dims={rock:{w:48,h:34},stump:{w:42,h:52},logpile:{w:68,h:31},tires:{w:48,h:40},boulder:{w:58,h:46},cone:{w:34,h:38},fallenSign:{w:70,h:30}}[type];
  course.push({id:++featureId,type,x,y:ground-dims.h,w:dims.w,h:dims.h,counted:false});
}
function addStayLowHazard(x=canvas.width+40){course.push({id:++featureId,type:'lowbranch',x,y:ground-116,w:118,h:34,counted:false});}
function addCollectible(x=canvas.width+60,y=ground-96){collectibles.push({x,y,w:24,h:24,spin:0,collected:false});}
function addTrailSign(x,label){course.push({id:++featureId,type:'trailSign',x,y:ground-92,w:72,h:92,label,counted:true});}

function reset(){
  score=0;speed=350;distance=0;spawnTimer=0;spawnIndex=0;course=[];particles=[];collectibles=[];combo=0;badges=0;level=1;lastMilestone=0;screenShake=0;
  Object.assign(jeep,{y:ground-jeep.h,vy:0,grounded:true,onRamp:null,rampHeight:0,angle:0,wheelSpin:0,suspension:0,airDistance:0});
  updateHud();
  addRampMudCombo(canvas.width-225,3);
}
function start(){reset();running=true;overlay.classList.add('hidden');last=performance.now();tone(180,.12,'sawtooth');requestAnimationFrame(loop);}
function puff(x,y,count=6,color='#b9956b'){for(let i=0;i<count;i++)particles.push({x,y,vx:-80+Math.random()*180,vy:-40-Math.random()*100,a:1,size:3+Math.random()*5,color});}
function updateHud(){scoreEl.textContent=Math.floor(score);if(comboEl)comboEl.textContent=combo>1?`x${combo}`:'—';if(levelEl)levelEl.textContent=level;if(badgesEl)badgesEl.textContent=badges;}

function jump(){
  if(!running){start();return;}
  if(jeep.grounded){jeep.vy=-710-(jeep.onRamp?75:0);jeep.grounded=false;jeep.onRamp=null;jeep.jumpStartX=distance;jeep.airDistance=0;puff(jeep.x+18,jeep.y+jeep.h,6);tone(310,.07,'square');}
}
function rampSurfaceAt(x){for(const f of course)if(f.type==='ramp'&&x>=f.x&&x<=f.x+f.w){const t=(x-f.x)/f.w;return {type:'ramp',y:ground-f.h*t,feature:f};}return null;}
function holeAt(x){return course.find(f=>f.type==='hole'&&x>=f.x&&x<=f.x+f.w)||null;}
function supportAt(x){const ramp=rampSurfaceAt(x);if(ramp)return ramp;if(holeAt(x))return null;return {type:'ground',y:ground,feature:null};}
function launchFromRamp(){jeep.grounded=false;jeep.vy=-(610+jeep.rampHeight*2.35+speed*.05);jeep.angle=-.18;jeep.jumpStartX=distance;jeep.airDistance=0;puff(jeep.x+25,jeep.y+jeep.h,9);tone(260,.12,'sawtooth');jeep.onRamp=null;jeep.rampHeight=0;}

function awardClear(){combo=Math.min(9,combo+1);score+=4+combo*1.5;tone(420+combo*30,.04,'square',.018);updateHud();}
function gameOver(reason='Trail ended!'){
  if(!running)return;running=false;combo=0;screenShake=7;tone(90,.24,'sawtooth',.05);
  const final=Math.floor(score);if(final>best){best=final;localStorage.setItem('jeepRunnerBest',best);bestEl.textContent=best;}
  const stats=`Score ${final} · Badges ${badges} · Longest jump ${Math.round(bestJump)} ft`;
  title.textContent=reason;text.textContent=`${stats}. Hit the trail again?`;startBtn.textContent='Run Again';overlay.classList.remove('hidden');
}
function collide(a,b,p=8){return a.x+p<b.x+b.w&&a.x+a.w-p>b.x&&a.y+p<b.y+b.h&&a.y+a.h-p>b.y;}

function spawnNext(){
  const x=canvas.width+45;
  if(spawnIndex===0)addStandaloneHole(x);
  else if(spawnIndex===1)addObstacle(x,'logpile');
  else if(spawnIndex===2)addStayLowHazard(x);
  else if(spawnIndex===3)addObstacle(x,'tires');
  else if(spawnIndex===4)addCollectible(x+50,ground-115);
  else if(spawnIndex===5)addRampMudCombo(x,2);
  else{
    const r=Math.random();
    if(r<.20)addRampMudCombo(x,Math.random()>.55?3:2);
    else if(r<.40)addStandaloneHole(x);
    else if(r<.57)addStayLowHazard(x);
    else addObstacle(x);
    if(Math.random()<.28)addCollectible(x+90,ground-(70+Math.random()*65));
  }
  spawnIndex++;
}

function updateJeep(dt){
  const wheelX=jeep.x+jeep.w*.68,previousBottom=jeep.y+jeep.h,support=supportAt(wheelX);
  if(jeep.grounded){
    jeep.wheelSpin+=(speed/18)*dt;jeep.suspension+=((Math.sin(distance*.035)*1.8)-jeep.suspension)*Math.min(1,dt*10);
    if(jeep.onRamp&&(!support||support.type!=='ramp'||support.feature.id!==jeep.onRamp))launchFromRamp();
    else if(!support){jeep.grounded=false;jeep.onRamp=null;jeep.jumpStartX=distance;}
    else{
      jeep.y=support.y-jeep.h;jeep.vy=0;
      if(support.type==='ramp'){jeep.onRamp=support.feature.id;jeep.rampHeight=support.feature.h;jeep.angle=-Math.atan2(support.feature.h,support.feature.w);}
      else{jeep.onRamp=null;jeep.rampHeight=0;jeep.angle*=Math.max(0,1-dt*14);}
    }
  }
  if(!jeep.grounded){
    jeep.airDistance=distance-jeep.jumpStartX;jeep.vy+=1750*dt;jeep.y+=jeep.vy*dt;
    jeep.angle+=airControl*1.25*dt+(jeep.vy>0?.20:-.05)*dt;jeep.angle=Math.max(-.48,Math.min(.42,jeep.angle));
    const landing=supportAt(wheelX);
    if(landing&&jeep.vy>=0&&previousBottom<=landing.y+8&&jeep.y+jeep.h>=landing.y){
      const impact=jeep.vy;jeep.y=landing.y-jeep.h;jeep.vy=0;jeep.grounded=true;jeep.angle=0;jeep.suspension=Math.min(7,impact/95);
      if(landing.type==='ramp'){jeep.onRamp=landing.feature.id;jeep.rampHeight=landing.feature.h;}else{jeep.onRamp=null;jeep.rampHeight=0;}
      const jumpFt=jeep.airDistance/5;if(jumpFt>bestJump){bestJump=jumpFt;localStorage.setItem('jeepRunnerBestJump',bestJump.toFixed(1));}
      puff(jeep.x+25,jeep.y+jeep.h,impact>650?10:5);tone(140,.055,'triangle',.03);
    }
  }
  const pit=holeAt(wheelX);
  if(pit&&jeep.y+jeep.h>=pit.mudY-1){puff(jeep.x+jeep.w*.65,pit.mudY,18,'#70451f');gameOver('Stuck in the mud!');}
  else if(jeep.y>canvas.height+35)gameOver('That was a deep one!');
}

function update(dt){
  distance+=speed*dt;score+=dt*10;speed=Math.min(735,350+score*.76);level=1+Math.floor(score/200);
  const milestone=Math.floor(score/200);
  if(milestone>lastMilestone){lastMilestone=milestone;addTrailSign(canvas.width+30,`TRAIL ${level}`);tone(620,.13,'triangle',.025);}
  for(const f of course)f.x-=speed*dt;for(const c of collectibles){c.x-=speed*dt;c.spin+=dt*5;}
  course=course.filter(f=>f.x+f.w>-140);collectibles=collectibles.filter(c=>c.x+c.w>-50&&!c.collected);
  spawnTimer+=dt;const interval=spawnIndex<2?2.05:Math.max(1.08,1.58-score*.00058);if(spawnTimer>=interval){spawnTimer=0;spawnNext();}
  updateJeep(dt);

  for(const f of course){
    if(!f.counted&&f.x+f.w<jeep.x){f.counted=true;awardClear();}
    if(['rock','stump','logpile','tires','boulder','cone','fallenSign','lowbranch'].includes(f.type)&&collide(jeep,f)){
      gameOver(f.type==='lowbranch'?'Should have stayed low!':'Trail ended!');break;
    }
  }
  for(const c of collectibles){
    if(!c.collected&&collide(jeep,c,4)){c.collected=true;badges++;lifetimeBadges++;localStorage.setItem('jeepRunnerBadges',lifetimeBadges);score+=25;combo=Math.min(9,combo+1);puff(c.x,c.y,10,'#ffd76b');tone(760,.10,'triangle',.03);}
  }
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.a-=dt*1.7;}particles=particles.filter(p=>p.a>0);
  if(screenShake>0)screenShake=Math.max(0,screenShake-dt*28);updateHud();
}

function drawBackground(){
  const phase=(score%1200)/1200;const night=Math.max(0,Math.sin(phase*Math.PI*2-Math.PI/2)*.5+.5);
  const skyR=Math.round(22-12*night),skyG=Math.round(40-20*night),skyB=Math.round(56-16*night);
  ctx.fillStyle=`rgb(${skyR},${skyG},${skyB})`;ctx.fillRect(0,0,canvas.width,ground);
  if(night>.42){ctx.fillStyle=`rgba(240,245,210,${(night-.42)*1.4})`;ctx.beginPath();ctx.arc(820,58,20,0,Math.PI*2);ctx.fill();for(let i=0;i<18;i++){ctx.fillRect((i*83+41)%940,24+(i*37)%115,2,2);}}
  ctx.fillStyle=night>.52?'#1b2b36':'#294357';ctx.beginPath();ctx.moveTo(0,230);for(let x=0;x<=canvas.width;x+=100)ctx.lineTo(x,180+Math.sin((x+distance*.05)/135)*24);ctx.lineTo(canvas.width,ground);ctx.lineTo(0,ground);ctx.fill();
  ctx.fillStyle='#785437';ctx.fillRect(0,ground,canvas.width,canvas.height-ground);ctx.fillStyle='#9b734d';ctx.fillRect(0,ground,canvas.width,7);
  ctx.strokeStyle='#5c402c';ctx.lineWidth=2;ctx.setLineDash([20,26]);ctx.beginPath();ctx.moveTo(-(distance*.2)%46,ground+38);ctx.lineTo(canvas.width,ground+38);ctx.stroke();ctx.setLineDash([]);
}
function drawHole(h){
  ctx.fillStyle='#100d0b';ctx.fillRect(h.x-2,ground-3,h.w+4,canvas.height-ground+3);ctx.fillStyle='#4b3223';
  ctx.beginPath();ctx.moveTo(h.x-12,ground);ctx.lineTo(h.x+18,h.mudY);ctx.lineTo(h.x,h.mudY);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(h.x+h.w+12,ground);ctx.lineTo(h.x+h.w-18,h.mudY);ctx.lineTo(h.x+h.w,h.mudY);ctx.closePath();ctx.fill();
  ctx.fillStyle='#553319';ctx.fillRect(h.x+12,h.mudY,h.w-24,canvas.height-h.mudY);ctx.fillStyle='#7c4b20';ctx.beginPath();ctx.moveTo(h.x+12,h.mudY);for(let x=0;x<=h.w-24;x+=12)ctx.lineTo(h.x+12+x,h.mudY+Math.sin((x+score*10)/13)*4);ctx.lineTo(h.x+h.w-12,canvas.height);ctx.lineTo(h.x+12,canvas.height);ctx.closePath();ctx.fill();ctx.strokeStyle='#c48a45';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.x+12,h.mudY);ctx.lineTo(h.x+h.w-12,h.mudY);ctx.stroke();ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle='#f3c678';ctx.fillText('MUD',h.x+h.w/2,h.mudY+23);ctx.textAlign='start';
}
function drawRamp(r){ctx.fillStyle='#80552e';ctx.beginPath();ctx.moveTo(r.x,ground);ctx.lineTo(r.x+r.w,ground-r.h);ctx.lineTo(r.x+r.w,ground);ctx.closePath();ctx.fill();ctx.strokeStyle='#efb45e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(r.x,ground-2);ctx.lineTo(r.x+r.w,ground-r.h);ctx.stroke();ctx.font='bold 13px system-ui';ctx.fillStyle='#ffd27b';ctx.fillText(`${r.size}× RAMP`,r.x+8,ground-r.h-10);}
function drawObstacle(o){
  if(o.type==='rock'||o.type==='boulder'){ctx.fillStyle=o.type==='boulder'?'#68737d':'#838b94';ctx.beginPath();ctx.moveTo(o.x,ground);ctx.lineTo(o.x+7,o.y+12);ctx.lineTo(o.x+o.w*.45,o.y);ctx.lineTo(o.x+o.w,ground-8);ctx.lineTo(o.x+o.w,ground);ctx.fill();}
  else if(o.type==='stump'){ctx.fillStyle='#715038';ctx.fillRect(o.x+10,o.y,o.w-20,o.h);ctx.fillStyle='#9a744f';ctx.fillRect(o.x+15,o.y+5,6,o.h-10);}
  else if(o.type==='logpile'){ctx.strokeStyle='#4f321f';ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(o.x+8,ground-9);ctx.lineTo(o.x+58,ground-27);ctx.moveTo(o.x+14,ground-26);ctx.lineTo(o.x+62,ground-8);ctx.stroke();ctx.lineCap='butt';}
  else if(o.type==='tires'){ctx.strokeStyle='#111820';ctx.lineWidth=9;ctx.beginPath();ctx.arc(o.x+16,ground-13,11,0,Math.PI*2);ctx.arc(o.x+31,ground-14,11,0,Math.PI*2);ctx.arc(o.x+24,ground-31,11,0,Math.PI*2);ctx.stroke();}
  else if(o.type==='cone'){ctx.fillStyle='#e88235';ctx.beginPath();ctx.moveTo(o.x+17,o.y);ctx.lineTo(o.x+31,ground-6);ctx.lineTo(o.x+3,ground-6);ctx.closePath();ctx.fill();ctx.fillStyle='#f5d3aa';ctx.fillRect(o.x+9,o.y+18,16,5);}
  else if(o.type==='fallenSign'){ctx.strokeStyle='#735438';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(o.x+8,ground-5);ctx.lineTo(o.x+60,o.y+7);ctx.stroke();ctx.fillStyle='#d2aa58';ctx.fillRect(o.x+31,o.y,35,18);ctx.fillStyle='#241d14';ctx.font='bold 9px system-ui';ctx.fillText('ROUGH',o.x+34,o.y+12);}
  else if(o.type==='lowbranch'){ctx.fillStyle='#4c3020';ctx.fillRect(o.x,o.y+10,o.w,o.h-12);ctx.fillStyle='#263d25';ctx.beginPath();ctx.arc(o.x+18,o.y+8,17,0,Math.PI*2);ctx.arc(o.x+55,o.y+5,20,0,Math.PI*2);ctx.arc(o.x+94,o.y+10,17,0,Math.PI*2);ctx.fill();ctx.font='bold 12px system-ui';ctx.fillStyle='#ffd27b';ctx.textAlign='center';ctx.fillText('STAY LOW',o.x+o.w/2,o.y-8);ctx.textAlign='start';}
  else if(o.type==='trailSign'){ctx.strokeStyle='#6d4b2e';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(o.x+36,ground);ctx.lineTo(o.x+36,o.y+34);ctx.stroke();ctx.fillStyle='#d7a54c';ctx.fillRect(o.x,o.y,o.w,34);ctx.fillStyle='#20170f';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(o.label,o.x+o.w/2,o.y+21);ctx.textAlign='start';}
}
function drawCollectible(c){ctx.save();ctx.translate(c.x+12,c.y+12);ctx.rotate(c.spin);ctx.fillStyle='#ffd76b';ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?6:12;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.fillStyle='#5b4318';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('★',0,1);ctx.restore();}
function drawWheel(x,y,r){ctx.save();ctx.translate(x,y);ctx.rotate(jeep.wheelSpin);ctx.fillStyle='#0a0e12';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6f7f8d';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*(r-3),Math.sin(a)*(r-3));}ctx.stroke();ctx.restore();}
function drawJeep(){
  ctx.save();ctx.translate(jeep.x+jeep.w/2,jeep.y+jeep.h/2);ctx.rotate(jeep.angle);ctx.translate(-jeep.w/2,-jeep.h/2);
  const bounce=jeep.suspension;
  ctx.strokeStyle='#58616a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(25,31);ctx.lineTo(25,37);ctx.moveTo(67,31);ctx.lineTo(67,37);ctx.stroke();
  drawWheel(25,38,12);drawWheel(67,38,12);
  ctx.save();ctx.translate(0,-bounce);
  ctx.fillStyle='#4f8fe8';ctx.fillRect(12,17,68,19);ctx.fillRect(31,4,35,19);ctx.fillStyle='#77b8f5';ctx.fillRect(35,7,12,11);ctx.fillRect(50,7,12,11);
  ctx.strokeStyle='#243447';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(30,4);ctx.lineTo(27,21);ctx.moveTo(66,4);ctx.lineTo(70,21);ctx.stroke();
  ctx.fillStyle='#356cae';ctx.fillRect(7,21,12,10);ctx.fillRect(78,22,8,9);ctx.strokeStyle='#2d5d97';ctx.lineWidth=3;ctx.beginPath();ctx.arc(25,35,14,Math.PI,0);ctx.arc(67,35,14,Math.PI,0);ctx.stroke();
  ctx.fillStyle='#1a2836';for(let i=0;i<6;i++)ctx.fillRect(76+i*1.6,17,1,9);ctx.fillStyle='#f5e4a4';ctx.fillRect(82,20,4,6);
  ctx.fillStyle='#0a0e12';ctx.beginPath();ctx.arc(8,18,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#71808e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(8,18,5,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#dbeafe';ctx.font='bold 8px system-ui';ctx.fillText('JKU',45,31);ctx.restore();ctx.restore();
}
function draw(){
  ctx.save();if(screenShake>0)ctx.translate((Math.random()-.5)*screenShake,(Math.random()-.5)*screenShake);drawBackground();
  for(const f of course)if(f.type==='hole')drawHole(f);for(const f of course)if(f.type==='ramp')drawRamp(f);for(const f of course)if(!['hole','ramp'].includes(f.type))drawObstacle(f);for(const c of collectibles)drawCollectible(c);
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.a);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;drawJeep();ctx.restore();
}
function loop(now){if(!running)return;const dt=Math.min((now-last)/1000,.032);last=now;update(dt);draw();if(running)requestAnimationFrame(loop);}

startBtn.addEventListener('click',start);
if(soundBtn)soundBtn.addEventListener('click',()=>{soundOn=!soundOn;localStorage.setItem('jeepRunnerSound',soundOn?'on':'off');updateSoundButton();if(soundOn)tone(440,.06,'triangle');});
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();jump();}if(['ArrowLeft','KeyA'].includes(e.code))airControl=-1;if(['ArrowRight','KeyD'].includes(e.code))airControl=1;});
window.addEventListener('keyup',e=>{if(['ArrowLeft','KeyA','ArrowRight','KeyD'].includes(e.code))airControl=0;});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();jump();});
reset();draw();