(()=>{"use strict";
const W=960,H=600,RUNE={x:480,y:300,r:86},WALL=28,MAX_ROUNDS=12;
const PILLARS=[{x:480,y:150,r:31},{x:480,y:450,r:31}];
const CLASSES=[
 {key:"bruiser",name:"Vanguard",role:"Heavy · Frontline",letter:"V",hp:10,mass:1.58,speed:.93,r:24,skill:"Crushing Blow",desc:"Your next direct impact deals +2 damage.",cd:3,color:"#52baf3",enemyColor:"#ff8173"},
 {key:"striker",name:"Striker",role:"Fast · Attacker",letter:"S",hp:7,mass:.84,speed:1.22,r:21,skill:"Overdrive",desc:"Launch 35% faster and deal +1 impact damage.",cd:2,color:"#5bd5ad",enemyColor:"#ffb76c"},
 {key:"trickster",name:"Trickster",role:"Agile · Bank shots",letter:"T",hp:8,mass:1.01,speed:1.06,r:22,skill:"Bankbreaker",desc:"Deal +2 damage if your shot banks off a wall or pillar first.",cd:2,color:"#b69bff",enemyColor:"#ed91c2"}
];
const el=id=>document.getElementById(id),canvas=el("arena"),ctx=canvas.getContext("2d");
const storeKey="ricochet-rivals-battler-v2";
let profile={games:0,wins:0,xp:0,streak:0,best:0};
try{const saved=JSON.parse(localStorage.getItem(storeKey));if(saved&&typeof saved==="object"){for(const k of Object.keys(profile))profile[k]=Math.max(0,Number(saved[k])||0)}}catch(_){}
const save=()=>{try{localStorage.setItem(storeKey,JSON.stringify(profile))}catch(_){}};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let team=[],round=1,phase="planning",selectedId=0,skillEnabled=false,drag=null,shots=[],hitPairs=new Set(),effectTexts=[],sparks=[],logEntries=[],totalMax=[25,25],matchResult=null,lastFrame=0,stepAccumulator=0,flightTime=0,toastTimer=null,gameId=0;
const toast=message=>{const t=el("toast");t.textContent=message;t.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("visible"),2100)};
const char=(side,cls,i)=>{
 const x=side===0?178:W-178;
 return {id:side+"-"+i,side,type:cls.key,name:cls.name,letter:cls.letter,role:cls.role,r:cls.r,max:cls.hp,hp:cls.hp,mass:cls.mass,speed:cls.speed,
 color:side===0?cls.color:cls.enemyColor,skill:cls.skill,desc:cls.desc,cd:cls.cd,readyAt:1,guard:0,alive:true,
 x,y:178+i*122,vx:0,vy:0,banked:0,launched:false,special:false};
};
function getSelected(){return team.find(c=>c.id===selectedId&&c.alive&&c.side===0)||team.find(c=>c.side===0&&c.alive)||null}
function active(side){return team.filter(c=>c.side===side&&c.alive)}
function hp(side){return active(side).reduce((sum,c)=>sum+c.hp,0)}
function event(message,kind=""){logEntries.unshift({message,kind});logEntries=logEntries.slice(0,6);renderLog()}
function renderLog(){const list=el("battleLog");list.replaceChildren();for(const entry of logEntries){const p=document.createElement("p");p.textContent=entry.message;if(entry.kind)p.className="log-"+entry.kind;list.appendChild(p)}}
function renderProfile(){
 const lvl=1+Math.floor(profile.xp/150);
 const rank=profile.wins>=25?"CHAMPION":profile.wins>=10?"VETERAN":profile.wins>=3?"CONTENDER":"RECRUIT";
 el("profileRank").textContent=rank+" · LEVEL "+lvl;el("profileLevel").textContent="LVL "+lvl;
 el("xpCount").textContent=(profile.xp%150)+" / 150 XP";el("xpBar").style.width=(profile.xp%150)/150*100+"%";
 el("profileWins").textContent=profile.wins;el("profileGames").textContent=profile.games;el("profileStreak").textContent=profile.best;
}
function renderRoster(){
 const make=(side)=>{
  const root=el(side===0?"heroRoster":"enemyRoster");root.replaceChildren();
  team.filter(c=>c.side===side).forEach(c=>{
   const b=document.createElement(side===0?"button":"div");
   b.className="hero-card"+(side===1?" enemy":" selectable")+(c.alive&&c.id===selectedId?" selected":"")+(c.alive?"":" dead");
   if(side===0){b.type="button";b.disabled=!c.alive||phase!=="planning";b.addEventListener("click",()=>{selectedId=c.id;skillEnabled=false;drag=null;renderEverything()})}
   const circle=document.createElement("span");circle.className="disc-icon";circle.style.background=c.color;circle.textContent=c.letter;
   const content=document.createElement("div");content.className="hero-main";
   const title=document.createElement("div");title.className="hero-name";title.textContent=c.name+(c.guard?" ✧":"");
   const role=document.createElement("div");role.className="hero-role";role.textContent=c.role;
   const bar=document.createElement("div");bar.className="hero-hp-track";const fill=document.createElement("span");fill.style.width=(c.hp/c.max*100)+"%";bar.appendChild(fill);
   content.append(title,role,bar);
   const num=document.createElement("div");num.className="hero-num";num.textContent=c.hp+" / "+c.max;
   const sub=document.createElement("span");sub.textContent=c.alive?(c.readyAt<=round?"SKILL ✓":"CD "+(c.readyAt-round)):"KO";num.appendChild(sub);
   b.append(circle,content,num);root.appendChild(b);
  });
 };
 make(0);make(1);
 const selected=getSelected();
 if(selected){const ready=selected.readyAt<=round;el("selectedTip").textContent=selected.skill+" — "+selected.desc+(ready?" Ready to use.":" Ready in "+(selected.readyAt-round)+" round(s).");}
 else el("selectedTip").textContent="Your crew has been defeated.";
}
function updateControls(){
 const isPlanning=phase==="planning",c=getSelected();
 el("roundNum").textContent=String(round).padStart(2,"0");
 el("logRound").textContent="ROUND "+round;
 el("playerHp").textContent=hp(0);el("enemyHp").textContent=hp(1);
 el("playerHpMax").textContent="/ "+totalMax[0]+" HP";el("enemyHpMax").textContent="/ "+totalMax[1]+" HP";
 el("playerHealthBar").style.width=hp(0)/totalMax[0]*100+"%";el("enemyHealthBar").style.width=hp(1)/totalMax[1]*100+"%";
 const available=!!c&&c.readyAt<=round&&isPlanning;el("skillBtn").disabled=!available;
 el("skillLabel").textContent=c?c.skill+(available?"":" · Cooldown"):"Select a hero";
 el("skillBtn").classList.toggle("ready",available&&!skillEnabled);el("skillBtn").classList.toggle("active",available&&skillEnabled);
 el("skillSymbol").textContent=skillEnabled?"✓":"✦";
 el("cancelBtn").disabled=!drag;
 const power=drag?clamp(distance(drag.from,drag.to)/160,0,1):0;
 el("powerBar").style.width=(power*100).toFixed(0)+"%";el("powerPercent").textContent=Math.round(power*100)+"%";
 if(phase==="planning"){
  el("statusTitle").textContent="YOUR MOVE · ROUND "+round;
  el("statusText").textContent="Pick a hero and pull backward to aim. Both teams launch at once.";
  el("statusIcon").textContent="◎";el("phaseBadge").textContent="CHOOSE YOUR SHOT";
 }else if(phase==="flying"){
  el("statusTitle").textContent="BOTH TEAMS ARE IN MOTION";
  el("statusText").textContent="Collisions deal damage. Walls and pillars can set up trick shots.";
  el("statusIcon").textContent="↗";el("phaseBadge").textContent="SHOTS FIRED";
 }else{
  el("statusTitle").textContent="MATCH COMPLETE";el("statusText").textContent="Start another battle to experiment with a different crew strategy.";
  el("statusIcon").textContent="★";el("phaseBadge").textContent="MATCH ENDED";
 }
}
function renderEverything(){renderRoster();updateControls();renderProfile()}
function beginMatch(){
 gameId++;team=[];CLASSES.forEach((cls,i)=>team.push(char(0,cls,i)));CLASSES.forEach((cls,i)=>team.push(char(1,cls,i)));
 totalMax=[hp(0),hp(1)];round=1;phase="planning";selectedId="0-0";skillEnabled=false;drag=null;shots=[];hitPairs.clear();effectTexts=[];sparks=[];flightTime=0;stepAccumulator=0;matchResult=null;
 logEntries=[];event("Round 1: both crews are ready.");renderEverything();hideModal();
 toast("New match — choose a hero and take aim!");
}
function showModal(tag,title,body,button,detail,onClick){
 el("modalTag").textContent=tag;el("modalTitle").textContent=title;el("modalBody").textContent=body;
 el("modalStats").textContent=detail||"";el("modalButton").textContent=button;
 el("modalButton").onclick=()=>{hideModal();if(onClick)onClick()};
 el("modal").classList.remove("hidden");
}
function hideModal(){el("modal").classList.add("hidden")}
function point(e){const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)/rect.width*W,y:(e.clientY-rect.top)/rect.height*H}}
function startDrag(e){
 if(phase!=="planning"||!el("modal").classList.contains("hidden"))return;
 const p=point(e),potential=active(0).find(c=>distance(c,p)<c.r+17);
 if(!potential)return;
 if(selectedId!==potential.id){selectedId=potential.id;skillEnabled=false;}
 drag={from:{x:potential.x,y:potential.y},to:p,id:potential.id};
 try{canvas.setPointerCapture(e.pointerId)}catch(_){}
 renderEverything();
}
function moveDrag(e){if(!drag||phase!=="planning")return;drag.to=point(e);updateControls()}
function endDrag(e){
 if(!drag||phase!=="planning")return;
 const p=point(e),c=team.find(x=>x.id===drag.id);const dx=c.x-p.x,dy=c.y-p.y,length=Math.hypot(dx,dy);
 drag=null;
 if(length<13){renderEverything();return}
 const strength=clamp(length/160,.12,1);
 fireVolley(c,Math.atan2(dy,dx),strength,skillEnabled);
}
canvas.addEventListener("pointerdown",startDrag);canvas.addEventListener("pointermove",moveDrag);
canvas.addEventListener("pointerup",endDrag);canvas.addEventListener("pointercancel",()=>{drag=null;updateControls()});
el("cancelBtn").addEventListener("click",()=>{drag=null;updateControls()});
el("skillBtn").addEventListener("click",()=>{if(phase!=="planning")return;const c=getSelected();if(!c||c.readyAt>round)return;skillEnabled=!skillEnabled;updateControls();toast(skillEnabled?c.skill+" armed":"Normal shot selected")});
el("newBtn").addEventListener("click",()=>{beginMatch()});
el("rulesBtn").addEventListener("click",()=>showModal("FIELD MANUAL","How the arena works",
 "Choose one of your 3 heroes and drag backward to aim and set shot power. The AI secretly chooses a shot too. You both fire simultaneously; high-speed collisions damage enemy heroes. Knock all three enemy heroes out to win, or finish 12 rounds with more total HP. The center rune gives 1 shield to any hero ending a round inside it. Each hero has an optional special attack with a cooldown.",
 "BACK TO BATTLE","TIP: The fast Striker is great at direct hits. The Trickster rewards intentional bank shots."));
el("difficulty").addEventListener("change",()=>{event("AI tactics changed to "+el("difficulty").value+".");toast("AI difficulty: "+el("difficulty").value)});
function markSpecial(c,use){
 c.special=use&&c.readyAt<=round;
 if(c.special){c.readyAt=round+c.cd+1;event((c.side===0?"Your ":"Enemy ")+c.name+" used "+c.skill+".","success")}
}
function planAI(){
 const friends=active(1),foes=active(0);
 if(!friends.length||!foes.length)return null;
 const diff=el("difficulty").value;
 const blocked=(from,to)=>PILLARS.some(o=>{
  const dx=to.x-from.x,dy=to.y-from.y,den=dx*dx+dy*dy;
  if(den<1)return false;
  const t=clamp(((o.x-from.x)*dx+(o.y-from.y)*dy)/den,0,1);
  return Math.hypot(from.x+dx*t-o.x,from.y+dy*t-o.y)<o.r+20;
 });
 const options=[];
 for(const mine of friends)for(const foe of foes){
  const d=distance(mine,foe),blockedShot=blocked(mine,foe);
  const value=55+(foe.max-foe.hp)*5-d*.048-(blockedShot?25:0)+Math.random()*(diff==="expert"?5:diff==="casual"?42:18);
  options.push({mine,foe,d,blockedShot,value});
 }
 options.sort((a,b)=>b.value-a.value);
 const chosen=diff==="casual"&&options.length>2?options[Math.random()<.3?2:0]:options[0];
 const from=chosen.mine,to=chosen.foe;
 let angle=Math.atan2(to.y-from.y,to.x-from.x);
 // Controlled aim error. Expert typically aims true; casual sometimes misses.
 const error=diff==="casual"?.19:diff==="expert"?.025:.095;
 angle+=(Math.random()-.5)*error*2;
 // Shot tuned to reach the intended enemy rather than always using maximum power.
 const strength=clamp(chosen.d/710+.3,.46,.99)+(Math.random()-.5)*.11;
 const skillChance=diff==="casual"?.35:diff==="expert"?.89:.67;
 const special=from.readyAt<=round&&Math.random()<skillChance;
 return {c:from,angle,power:clamp(strength,.35,1),special};
}
function beginShot(c,angle,power,useSpecial){
 c.banked=0;c.launched=true;markSpecial(c,useSpecial);
 let v=(4.1+power*11.8)*c.speed;
 if(c.type==="striker"&&c.special)v*=1.35;
 c.vx=Math.cos(angle)*v;c.vy=Math.sin(angle)*v;
 shots.push(c.id);
}
function fireVolley(c,angle,power,useSpecial){
 if(phase!=="planning"||!c||!c.alive)return;
 const ai=planAI();if(!ai)return;
 phase="flying";skillEnabled=false;hitPairs=new Set();shots=[];flightTime=0;stepAccumulator=0;
 team.forEach(u=>{u.vx=0;u.vy=0;u.launched=false;u.special=false;u.banked=0});
 beginShot(c,angle,power,useSpecial);beginShot(ai.c,ai.angle,ai.power,ai.special);
 event("Both teams fired: "+c.name+" vs "+ai.c.name+".");
 renderEverything();
}
function float(x,y,label,color="#ffbd98"){effectTexts.push({x,y,label,color,life:1.1,max:1.1})}
function spark(x,y,color,n=7){for(let i=0;i<n;i++){const angle=i/n*Math.PI*2+Math.random()*.5;const speed=1.2+Math.random()*3.3;sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.48,max:.48,color})}}
function damage(target,amount,attacker){
 if(!target.alive)return;
 let guarded=0;if(target.guard>0){guarded=Math.min(amount,target.guard);target.guard-=guarded;amount-=guarded}
 if(guarded)float(target.x,target.y-47,"SHIELD -"+guarded,"#9cf2e0");
 if(amount<=0)return;
 target.hp=Math.max(0,target.hp-amount);
 float(target.x,target.y-44,"-"+amount,"#ffab84");spark(target.x,target.y,target.color);
 const who=target.side===0?"Your ":"Enemy ";
 if(target.hp===0){target.alive=false;target.vx=0;target.vy=0;event(who+target.name+" was knocked out!","damage");toast(target.side===1?"ENEMY KNOCKOUT!":"ALLY KNOCKOUT!")}
 else event((attacker?attacker.name+" hit ":"Impact hit ")+(target.side===0?"your ":"enemy ")+target.name+" for "+amount+".","damage");
}
function resolveContact(a,b,normalX,normalY,closing){
 if(a.side===b.side||closing<1.9)return;
 const key=[a.id,b.id].sort().join("|");if(hitPairs.has(key))return;
 hitPairs.add(key);
 const towardA=Math.max(0,a.vx*normalX+a.vy*normalY);
 const towardB=Math.max(0,-b.vx*normalX-b.vy*normalY);
 const base=clamp(Math.round(closing/5),1,4);
 const attackDamage=from=>{
  let bonus=0;
  if(from.launched&&from.special){
   if(from.type==="bruiser")bonus+=2;
   if(from.type==="striker")bonus+=1;
   if(from.type==="trickster"&&from.banked>0)bonus+=2;
  }
  return base+bonus;
 };
 // Precompute simultaneous impact damage before either crew member can be KO'd.
 if(towardA>2.5&&towardB>2.5){
  const damageToB=attackDamage(a),damageToA=attackDamage(b);
  damage(a,damageToA,b);
  damage(b,damageToB,a);
 }else if(towardA>=towardB)damage(b,attackDamage(a),a);
 else damage(a,attackDamage(b),b);
}
function collision(a,b){
 if(!a.alive||!b.alive)return;
 let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),limit=a.r+b.r;
 if(d>=limit)return;
 if(d<.00001){dx=.001;dy=0;d=.001}
 const nx=dx/d,ny=dy/d,overlap=limit-d;
 const sum=a.mass+b.mass;a.x-=nx*overlap*(b.mass/sum);a.y-=ny*overlap*(b.mass/sum);
 b.x+=nx*overlap*(a.mass/sum);b.y+=ny*overlap*(a.mass/sum);
 const closing=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
 if(closing<=0)return;
 resolveContact(a,b,nx,ny,closing);
 const impulse=(1+.9)*closing/(1/a.mass+1/b.mass);
 a.vx-=nx*impulse/a.mass;a.vy-=ny*impulse/a.mass;
 b.vx+=nx*impulse/b.mass;b.vy+=ny*impulse/b.mass;
 spark((a.x+b.x)*.5,(a.y+b.y)*.5,"#fcd6a0",4);
}
function physicsTick(){
 for(const c of team){
  if(!c.alive)continue;
  c.x+=c.vx;c.y+=c.vy;
  c.vx*=.982;c.vy*=.982;
  if(Math.abs(c.vx)<.075)c.vx=0;if(Math.abs(c.vy)<.075)c.vy=0;
  let bank=false;
  if(c.x<WALL+c.r){c.x=WALL+c.r;c.vx=Math.abs(c.vx)*.87;bank=true}
  if(c.x>W-WALL-c.r){c.x=W-WALL-c.r;c.vx=-Math.abs(c.vx)*.87;bank=true}
  if(c.y<WALL+c.r){c.y=WALL+c.r;c.vy=Math.abs(c.vy)*.87;bank=true}
  if(c.y>H-WALL-c.r){c.y=H-WALL-c.r;c.vy=-Math.abs(c.vy)*.87;bank=true}
  if(bank&&Math.hypot(c.vx,c.vy)>1.5)c.banked++;
  for(const p of PILLARS){
   let dx=c.x-p.x,dy=c.y-p.y,d=Math.hypot(dx,dy),min=c.r+p.r;
   if(d>=min)continue;
   if(d<.0001){dx=.001;dy=0;d=.001}
   const nx=dx/d,ny=dy/d; c.x=p.x+nx*min;c.y=p.y+ny*min;
   const normal=c.vx*nx+c.vy*ny;
   if(normal<0){c.vx-=(1+.92)*normal*nx;c.vy-=(1+.92)*normal*ny;if(Math.abs(normal)>1.5)c.banked++;spark(c.x-nx*12,c.y-ny*12,"#88e6ee",3)}
  }
 }
 for(let i=0;i<team.length;i++)for(let j=i+1;j<team.length;j++)collision(team[i],team[j]);
}
function finishVolley(){
 for(const c of team){c.vx=0;c.vy=0;c.launched=false;c.special=false}
 for(const c of team){
  if(c.alive&&distance(c,RUNE)<RUNE.r-c.r*.25&&c.guard<1){c.guard=1;float(c.x,c.y-39,"+1 SHIELD","#98f0df");event((c.side===0?"Your ":"Enemy ")+c.name+" claimed the center shield.","success")}
 }
 const a=active(0),b=active(1);
 if(!a.length&&!b.length){endMatch(-1,"Both crews were defeated.");return}
 if(!b.length){endMatch(0,"You knocked out the entire Ironclad crew.");return}
 if(!a.length){endMatch(1,"All of your heroes were knocked out.");return}
 if(round>=MAX_ROUNDS){
  const p=hp(0),e=hp(1);
  endMatch(p===e?-1:p>e?0:1,"After 12 rounds, the crew with more combined HP wins.");
  return;
 }
 round++;phase="planning";selectedId=getSelected()?.id||"";skillEnabled=false;drag=null;
 event("Round "+round+": choose your next shot.");renderEverything();
}
function endMatch(winner,reason){
 phase="end";matchResult=winner;
 profile.games++;profile.xp+=winner===0?115:winner===1?35:65;
 if(winner===0){profile.wins++;profile.streak++;profile.best=Math.max(profile.best,profile.streak)}
 else profile.streak=0;
 save();
 renderEverything();
 const result=winner===0?"VICTORY":winner===1?"DEFEAT":"DRAW";
 showModal("MATCH COMPLETE",winner===0?"Crew victorious!":winner===1?"Ironclad wins":"It's a draw",
  reason+(winner===0?" Your crew earned 115 XP.":winner===1?" You earned 35 XP.":" You earned 65 XP."),
  "FIGHT AGAIN →","FINAL HP  ·  YOU "+hp(0)+"  —  "+hp(1)+" IRONCLAD",beginMatch);
}
function update(dt){
 if(phase==="flying"){
  stepAccumulator=Math.min(stepAccumulator+dt,.12);
  while(stepAccumulator>=1/60){physicsTick();stepAccumulator-=1/60}
  flightTime+=dt;
  if((flightTime>.5&&team.every(c=>!c.alive||Math.hypot(c.vx,c.vy)<.15))||flightTime>9)finishVolley();
 }
 effectTexts=effectTexts.filter(e=>e.life>0);
 effectTexts.forEach(e=>{e.life-=dt;e.y-=dt*32});
 sparks=sparks.filter(e=>e.life>0);sparks.forEach(e=>{e.life-=dt;e.x+=e.vx*dt*60;e.y+=e.vy*dt*60;e.vx*=.97;e.vy*=.97});
 if(phase==="flying")updateControls();
}
function line(a,b,color,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function circle(x,y,r,fill,stroke,width=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function roundedRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function drawFloor(){
 const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#142f42");bg.addColorStop(1,"#0c2332");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#2c6e9630";ctx.fillRect(0,0,172,H);ctx.fillStyle="#a8484830";ctx.fillRect(W-172,0,172,H);
 ctx.strokeStyle="#ffffff09";ctx.lineWidth=1;
 for(let x=28;x<W;x+=40)line({x,y:28},{x,y:H-28},"#ffffff09");
 for(let y=28;y<H;y+=40)line({x:28,y},{x:W-28,y},"#ffffff09");
 ctx.setLineDash([8,10]);line({x:W/2,y:30},{x:W/2,y:H-30},"#6a9db134",2);ctx.setLineDash([]);
 circle(RUNE.x,RUNE.y,RUNE.r+23,"#c9ad6330");circle(RUNE.x,RUNE.y,RUNE.r,"#e3be5c15","#e3c780aa",3);circle(RUNE.x,RUNE.y,RUNE.r*.5,null,"#e3c7803c",2);
 ctx.font="800 11px system-ui";ctx.fillStyle="#d9b775";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("SHIELD RUNE",RUNE.x,RUNE.y);
 for(const p of PILLARS){
  circle(p.x,p.y,p.r+8,"#091927aa","#4e788e",3);circle(p.x,p.y,p.r,"#284658","#9ac0d4",3);
  circle(p.x-7,p.y-7,p.r*.48,"#3b6478");circle(p.x,p.y,p.r*.23,"#96e3ed");
 }
 roundedRect(13,13,W-26,H-26,13,null,"#55788e");ctx.lineWidth=8;ctx.strokeStyle="#395f75";ctx.stroke();
 for(const side of [0,1]){ctx.fillStyle=side===0?"#88d4ff33":"#ffaaa233";ctx.font="900 11px system-ui";ctx.textAlign="center";ctx.fillText(side===0?"COBALT":"IRONCLAD",side===0?105:W-105,H-39)}
}
function drawHero(c){
 if(!c.alive)return;
 const isSel=phase==="planning"&&selectedId===c.id;
 if(isSel){circle(c.x,c.y,c.r+12,"#f9d48313","#f8d581",2);circle(c.x,c.y,c.r+19,null,"#e7c37b70",1)}
 if(c.guard)circle(c.x,c.y,c.r+7,null,"#7ce6dc",3);
 ctx.save();ctx.shadowBlur=16;ctx.shadowColor=c.color+"99";
 circle(c.x,c.y+4,c.r+3,"#071925");ctx.shadowBlur=0;
 const grad=ctx.createRadialGradient(c.x-c.r*.35,c.y-c.r*.4,2,c.x,c.y,c.r);grad.addColorStop(0,"#ffffff");grad.addColorStop(.13,c.color);grad.addColorStop(1,c.side===0?"#164263":"#6a3040");
 circle(c.x,c.y,c.r,grad,"#e5f2fa",3);circle(c.x,c.y,c.r-5,null,"#ffffff75",1);
 ctx.font="900 16px system-ui";ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(c.letter,c.x,c.y+1);
 ctx.restore();
 // Dedicated readable HP bars above every unit.
 const bw=51,bh=7,bx=c.x-bw/2,by=c.y-c.r-24;
 roundedRect(bx,by,bw,bh,3,"#07121d","#7490a0");
 ctx.fillStyle=c.side===0?"#67c4f6":"#fb8878";ctx.fillRect(bx+1,by+1,Math.max(0,(bw-2)*c.hp/c.max),bh-2);
 if(c.special&&c.launched){ctx.font="900 11px system-ui";ctx.fillStyle="#f8d083";ctx.fillText("✦",c.x+c.r,c.y-c.r)}
}
function drawAim(){
 if(!drag||phase!=="planning")return;
 const c=team.find(x=>x.id===drag.id);if(!c)return;
 const dx=c.x-drag.to.x,dy=c.y-drag.to.y,len=Math.hypot(dx,dy),norm=Math.max(.001,len);
 const power=clamp(len/160,0,1),angle=Math.atan2(dy,dx);
 const vx=(4.1+power*11.8)*c.speed*(skillEnabled&&c.type==="striker"?1.35:1);
 const vy=Math.sin(angle)*vx;let sx=c.x,sy=c.y,svx=Math.cos(angle)*vx,svy=vy;
 ctx.save();
 ctx.setLineDash([6,9]);ctx.lineWidth=3;ctx.strokeStyle="#ffe6a8";
 ctx.beginPath();ctx.moveTo(c.x,c.y);
 for(let i=0;i<75;i++){
  sx+=svx;sy+=svy;svx*=.982;svy*=.982;
  if(sx<WALL+c.r||sx>W-WALL-c.r){svx*=-.87;sx=clamp(sx,WALL+c.r,W-WALL-c.r)}
  if(sy<WALL+c.r||sy>H-WALL-c.r){svy*=-.87;sy=clamp(sy,WALL+c.r,H-WALL-c.r)}
  ctx.lineTo(sx,sy);
 }
 ctx.stroke();ctx.setLineDash([]);
 line({x:c.x,y:c.y},drag.to,"#ffe09b81",2);
 circle(drag.to.x,drag.to.y,7,"#f7d48d");
 ctx.restore();
}
function drawEffects(){
 for(const p of sparks){ctx.globalAlpha=clamp(p.life/p.max,0,1);circle(p.x,p.y,2.5,p.color)}
 for(const f of effectTexts){
  ctx.globalAlpha=clamp(f.life/f.max,0,1);ctx.shadowColor="#07111d";ctx.shadowBlur=6;
  ctx.fillStyle=f.color;ctx.textAlign="center";ctx.font="900 19px system-ui";ctx.fillText(f.label,f.x,f.y);ctx.shadowBlur=0;
 }
 ctx.globalAlpha=1;
}
function render(){
 ctx.clearRect(0,0,W,H);drawFloor();
 for(const c of team)drawHero(c);
 drawAim();drawEffects();
 if(phase==="planning"){
  ctx.fillStyle="#bdd8e6";ctx.font="800 11px system-ui";ctx.textAlign="center";
  ctx.fillText("DRAG BACKWARD FROM YOUR HERO TO LAUNCH",W/2,H-43);
 }
}
function frame(timestamp){
 const dt=Math.min((timestamp-lastFrame)/1000||0,.05);lastFrame=timestamp;
 update(dt);render();requestAnimationFrame(frame);
}
renderProfile();beginMatch();requestAnimationFrame(frame);
try{if(!localStorage.getItem("ricochet-rivals-seen-v2")){localStorage.setItem("ricochet-rivals-seen-v2","1");showModal("NEW GAME MODE","This is not pool anymore.",
 "Build a crew of 3 heroes. Aim and launch one hero every round while Ironclad launches one at the same time. Hit enemies to deal damage, choose when to activate special skills, and use the arena to your advantage. No unfair last-shot zone scoring.",
 "ENTER ARENA →","FIRST TO KNOCK OUT ALL ENEMIES WINS · 12-ROUND HP TIEBREAKER");}}catch(_){}
})();
