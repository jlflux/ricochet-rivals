(()=>{"use strict";
const C=document.getElementById("poolCanvas"),ctx=C.getContext("2d"),$=id=>document.getElementById(id);
const W=1040,H=590,L=71,T=78,RIGHT=969,BOTTOM=512,R=12.15;
const POCKETS=[{x:L,y:T,label:"Top left"},{x:W/2,y:T,label:"Top middle"},{x:RIGHT,y:T,label:"Top right"},{x:L,y:BOTTOM,label:"Bottom left"},{x:W/2,y:BOTTOM,label:"Bottom middle"},{x:RIGHT,y:BOTTOM,label:"Bottom right"}];
const COLORS=["#ffffff","#e9be3e","#3762c4","#cd4b43","#834eac","#dc7435","#278363","#963940","#191c21","#e9be3e","#3762c4","#cd4b43","#834eac","#dc7435","#278363","#963940"];
const key="ricochet-eightball-local-v1";
let profile={wins:0,games:0,bestRun:0};try{const p=JSON.parse(localStorage.getItem(key));if(p)for(const k in profile)profile[k]=Math.max(0,Number(p[k])||0)}catch(_){}
let balls=[],turn=0,groups=[null,null],phase="aim",breakShot=true,ballInHand=false,calledPocket=-1,callMode=false,aim=null,hover=null,shot=null,shotsMade=0,rackNumber=0,roundAge=0,simAccumulator=0,aiDelay=0,logs=[],currentRun=0,gameFinished=false,lastTs=0,particles=[],toastTimeout=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const length=(x,y)=>Math.hypot(x,y);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const group=n=>n===0?"cue":n===8?"eight":n>=1&&n<=7?"solid":"stripe";
const groupLabel=g=>g===null?"OPEN TABLE":g==="solid"?"SOLIDS · 1–7":"STRIPES · 9–15";
const ball=n=>balls.find(b=>b.n===n);
const active=()=>balls.filter(b=>b.alive);
const remaining=g=>balls.filter(b=>b.alive&&group(b.n)===g).length;
const remainingFor=side=>groups[side]?remaining(groups[side]):null;
const save=()=>{try{localStorage.setItem(key,JSON.stringify(profile))}catch(_){}};
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.remove("show"),2400)}
function log(message,type=""){logs.unshift({message,type});logs=logs.slice(0,7);const root=$("feed");root.replaceChildren();for(const item of logs){const p=document.createElement("p");p.textContent=item.message;p.className=item.type;root.appendChild(p)}}
function makeBall(n,x,y){return{n,x,y,vx:0,vy:0,r:R,alive:true}}
function rack(startTurn=0,preserveGame=false){
 if(!preserveGame){profile.games+=0;rackNumber++;shotsMade=0}
 balls=[makeBall(0,290,295)];
 const numbers=[1,2,3,4,5,6,7,9,10,11,12,13,14,15],take=n=>{numbers.splice(numbers.indexOf(n),1);return n};
 let layout=Array(15).fill(null);layout[0]=take(1);layout[4]=8;layout[10]=take(2);layout[14]=take(10);
 for(let i=numbers.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[numbers[i],numbers[j]]=[numbers[j],numbers[i]]}
 let k=0;for(let i=0;i<15;i++)if(layout[i]===null)layout[i]=numbers[k++];
 let index=0;
 for(let row=0;row<5;row++)for(let col=0;col<=row;col++){const n=layout[index++];balls.push(makeBall(n,697+row*21.12,295+(col-row/2)*24.65))}
 turn=startTurn;groups=[null,null];phase=startTurn===0?"aim":"ai";breakShot=true;ballInHand=false;calledPocket=-1;callMode=false;aim=null;hover=null;shot=null;roundAge=0;simAccumulator=0;aiDelay=.85;gameFinished=false;currentRun=0;particles=[];
 $("overlay").classList.add("hidden");log("Fresh rack. "+(startTurn===0?"You break.":"Hustler breaks."),"win");refreshUI();
}
function newGame(){logs=[];rack(0,false);toast("New rack — you're breaking")}
function openRules(){
 $("overlayTag").textContent="THE 8-BALL CLUB";$("overlayHeading").textContent="Rules of the table";
 $("overlayBody").textContent="Pull backward from the white cue ball and release to shoot. Legally pocket a solid or stripe after the break to claim that set. Hit one of your own balls first, and make sure a ball reaches a rail or a pocket. A foul gives ball in hand. Clear your seven balls, click Call 8 pocket, choose one of the six pockets, then sink the 8 there to win. A wrong or early 8 loses.";
 $("overlayScore").textContent="House rules · Break stays open · 8 on break re-racks · 4-rail legal break";
 $("overlayButton").textContent="BACK TO TABLE";$("overlayButton").onclick=hideOverlay;
 $("overlay").classList.remove("hidden");
}
function hideOverlay(){$("overlay").classList.add("hidden");$("overlayButton").onclick=null}
function showEnd(winner,reason){
 gameFinished=true;phase="finished";aim=null;callMode=false;profile.games++;if(winner===0)profile.wins++;save();
 $("overlayTag").textContent="RACK COMPLETE";$("overlayHeading").textContent=winner===0?"YOU WIN THE RACK":"THE HUSTLER WINS";
 $("overlayBody").textContent=reason;
 $("overlayScore").textContent="YOUR RECORD · "+profile.wins+" WINS / "+profile.games+" GAMES";
 $("overlayButton").textContent="RACK 'EM AGAIN ↻";$("overlayButton").onclick=newGame;
 $("overlay").classList.remove("hidden");log(winner===0?"Victory! "+reason:"Defeat. "+reason,winner===0?"win":"foul");refreshUI();
}
function validPlace(x,y,ignoreCue=true){return x>L+R+6&&x<RIGHT-R-6&&y>T+R+6&&y<BOTTOM-R-6&&active().every(b=>(ignoreCue&&b.n===0)||Math.hypot(x-b.x,y-b.y)>R*2+3)&&POCKETS.every(p=>Math.hypot(x-p.x,y-p.y)>32)}
function findPlace(x,y){
 x=clamp(x,L+R+8,RIGHT-R-8);y=clamp(y,T+R+8,BOTTOM-R-8);
 if(validPlace(x,y))return{x,y};
 for(let ring=1;ring<=28;ring++)for(let i=0;i<24;i++){const a=i/24*Math.PI*2,px=x+Math.cos(a)*ring*10,py=y+Math.sin(a)*ring*10;if(validPlace(px,py))return{x:px,y:py}}
 return{x:290,y:295};
}
function placeCue(x,y){
 const p=findPlace(x,y),cue=ball(0);cue.x=p.x;cue.y=p.y;cue.alive=true;cue.vx=cue.vy=0;ballInHand=false;phase=turn===0?"aim":"ai";aiDelay=.65;log((turn===0?"You":"Hustler")+" placed the cue ball.");refreshUI();
}
function firstBallOfGroupForAI(){
 let own=groups[1];
 if(own&&remaining(own)===0)return[ball(8)].filter(Boolean);
 return active().filter(b=>b.n!==0&&b.n!==8&&(own?group(b.n)===own:true));
}
function clearSegment(start,end,excluded,extra=0){
 const dx=end.x-start.x,dy=end.y-start.y,d=dx*dx+dy*dy;if(d<1)return false;
 for(const b of active()){
  if(excluded.has(b.n))continue;
  const t=clamp(((b.x-start.x)*dx+(b.y-start.y)*dy)/d,0,1);
  const px=start.x+t*dx,py=start.y+t*dy;
  if(Math.hypot(px-b.x,py-b.y)<R*2+extra)return false;
 }
 return true;
}
function aiPlan(){
 const cue=ball(0),targets=firstBallOfGroupForAI(),opts=[];
 for(const target of targets)for(let i=0;i<6;i++){
  const p=POCKETS[i],pd=dist(target,p);
  if(pd<18)continue;
  const tx=(p.x-target.x)/pd,ty=(p.y-target.y)/pd;
  const ghost={x:target.x-tx*(2*R+1),y:target.y-ty*(2*R+1)};
  if(!validPlace(ghost.x,ghost.y))continue;
  const cd=dist(cue,ghost);if(cd<25)continue;
  const a=clearSegment(cue,ghost,new Set([0,target.n]),-2);
  const b=clearSegment(target,p,new Set([target.n,0]),-1);
  const score=(a?240:-200)+(b?175:-145)-cd*.24-pd*.2+(target.n===8?80:0);
  opts.push({target,pocket:i,ghost,score,power:clamp((340+cd*.8+pd*.28)/1250,.36,1)});
 }
 opts.sort((a,b)=>b.score-a.score);
 if(opts.length)return opts[0];
 // Safety fallback: at least try to contact a legally available ball.
 const target=targets.sort((a,b)=>dist(a,cue)-dist(b,cue))[0];
 if(!target)return null;
 return{target,pocket:-1,ghost:{x:target.x,y:target.y},score:0,power:.67};
}
function takeAITurn(){
 if(phase!=="ai"||turn!==1||gameFinished)return;
 if(ballInHand||!ball(0).alive){
  let place={x:300,y:295};
  const targets=firstBallOfGroupForAI();
  if(targets.length){
   targets.sort((a,b)=>a.x-b.x);
   const t=targets[0];place={x:clamp(t.x-175,L+50,RIGHT-50),y:clamp(t.y,T+50,BOTTOM-50)};
  }
  placeCue(place.x,place.y);
 }
 const cue=ball(0);let angle,power,call=-1;
 if(breakShot){angle=Math.atan2(295-cue.y,697-cue.x);power=.97}
 else{
  const choice=aiPlan();
  if(!choice){angle=0;power=.7}
  else{
   angle=Math.atan2(choice.ghost.y-cue.y,choice.ghost.x-cue.x);power=choice.power;
   const expert=$("difficulty").value==="expert",casual=$("difficulty").value==="casual";
   const jitter=expert?.016:casual?.175:.063;
   angle+=(Math.random()-.5)*jitter*2;
   power=clamp(power+(Math.random()-.5)*(casual?.17:.09),.3,1);
   if(groups[1]&&remaining(groups[1])===0){call=choice.pocket;if(call<0){const eight=ball(8);call=POCKETS.map((p,i)=>({i,d:dist(eight,p)})).sort((a,b)=>a.d-b.d)[0].i}}
  }
 }
 calledPocket=call;fireShot(1,angle,power);
}
function onPocket(b,pocket){
 b.alive=false;b.vx=b.vy=0;
 if(!shot)return;
 shot.pocketed.push({n:b.n,pocket});
 if(b.n===0)shot.scratched=true;
 for(let i=0;i<12;i++){const a=Math.random()*Math.PI*2,v=1+Math.random()*2;particles.push({x:b.x,y:b.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.55,color:b.n===0?"#ffffff":COLORS[b.n]})}
}
function fireShot(side,angle,power){
 if(!["aim","ai"].includes(phase)||gameFinished||turn!==side||!ball(0).alive)return;
 const cue=ball(0);
 const speed=(105+clamp(power,.07,1)*1130)/120;
 cue.vx=Math.cos(angle)*speed;cue.vy=Math.sin(angle)*speed;
 shot={side,breaker:breakShot,groupsBefore:[...groups],eligibleEight:!!groups[side]&&remaining(groups[side])===0,firstHit:null,pocketed:[],scratched:false,railAfter:false,railBalls:new Set(),call:calledPocket};
 phase="moving";aim=null;callMode=false;roundAge=0;simAccumulator=0;shotsMade++;
 log((side===0?"You":"Hustler")+" shot"+(shot.call>=0?" · called "+POCKETS[shot.call].label:"")+".");
 refreshUI();
}
function detectPockets(b){
 for(let i=0;i<POCKETS.length;i++)if(dist(b,POCKETS[i])<24.4){onPocket(b,i);return true}
 return false;
}
function impact(a,b){
 let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=R*2;
 if(d>=min)return;
 if(d<.000001){dx=.001;dy=0;d=.001}
 const nx=dx/d,ny=dy/d,overlap=min-d;
 a.x-=nx*overlap*.5;a.y-=ny*overlap*.5;b.x+=nx*overlap*.5;b.y+=ny*overlap*.5;
 if(shot&&shot.firstHit===null){if(a.n===0&&b.n!==0)shot.firstHit=b.n;else if(b.n===0&&a.n!==0)shot.firstHit=a.n}
 const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
 if(relative>=0)return;
 const j=-(1+.96)*relative/2;
 a.vx-=j*nx;a.vy-=j*ny;b.vx+=j*nx;b.vy+=j*ny;
}
function stepPhysics(){
 for(const b of balls){
  if(!b.alive)continue;
  b.x+=b.vx;b.y+=b.vy;b.vx*=.990;b.vy*=.990;
  if(Math.abs(b.vx)<.025)b.vx=0;if(Math.abs(b.vy)<.025)b.vy=0;
  if(detectPockets(b))continue;
  let hit=false;
  if(b.x<L+R){b.x=L+R;b.vx=Math.abs(b.vx)*.88;hit=true}
  if(b.x>RIGHT-R){b.x=RIGHT-R;b.vx=-Math.abs(b.vx)*.88;hit=true}
  if(b.y<T+R){b.y=T+R;b.vy=Math.abs(b.vy)*.88;hit=true}
  if(b.y>BOTTOM-R){b.y=BOTTOM-R;b.vy=-Math.abs(b.vy)*.88;hit=true}
  if(hit&&shot){
   if(shot.firstHit!==null)shot.railAfter=true;
   if(b.n!==0)shot.railBalls.add(b.n);
  }
 }
 for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++)if(balls[i].alive&&balls[j].alive)impact(balls[i],balls[j]);
}
function swapTurn(reason,foul){
 const was=turn;turn=1-turn;currentRun=0;calledPocket=-1;callMode=false;ballInHand=!!foul;
 if(foul){const cue=ball(0);cue.alive=false;cue.vx=cue.vy=0}
 phase=turn===0?(foul?"placing":"aim"):"ai";aiDelay=.8;
 log(reason,foul?"foul":"");if(foul)toast((was===0?"Foul — AI":"AI foul — you")+" have ball in hand");
 refreshUI();
}
function resolveShot(){
 if(!shot)return;
 const s=shot,who=s.side,opponent=1-who;
 const objects=s.pocketed.filter(p=>p.n!==0),eight=objects.find(p=>p.n===8);
 // House rule: 8 on break is a re-rack; neither player instantly wins or loses.
 if(eight&&s.breaker){log("8 on the break — re-rack under house rules!","win");rack(who,true);return}
 const first=s.firstHit,own=s.groupsBefore[who],opGroup=s.groupsBefore[opponent];
 let foul="";
 if(s.scratched)foul="Cue ball scratched";
 else if(first===null)foul="No ball was hit";
 else if(first===8&&!s.eligibleEight)foul="8-ball hit before your set was cleared";
 else if(own&&remainingBeforeShot(own,s)&&group(first)!==own)foul="Wrong group hit first";
 else if(own&&s.eligibleEight&&first!==8)foul="You must contact the 8-ball first";
 else if(!s.breaker&&s.pocketed.length===0&&!s.railAfter)foul="No rail or pocket after contact";
 else if(s.breaker&&objects.length===0&&s.railBalls.size<4)foul="Illegal break: pocket a ball or send 4 balls to rails";
 if(eight){
  const valid=s.eligibleEight&&!foul&&s.call===eight.pocket&&first===8;
  showEnd(valid?who:opponent,valid?"The called 8-ball dropped cleanly.":!s.eligibleEight?"The 8-ball was pocketed early.":foul?"The 8-ball was pocketed on a foul.":s.call<0?"The 8-ball pocket was not called.":"The 8-ball went into the wrong pocket.");
  return;
 }
 if(foul){swapTurn(foul+" — opponent has ball in hand.",true);return}
 if(!s.breaker&&groups[0]===null){
  const firstClaim=objects.find(p=>p.n!==8&&(group(p.n)==="solid"||group(p.n)==="stripe"));
  if(firstClaim){groups[who]=group(firstClaim.n);groups[opponent]=groups[who]==="solid"?"stripe":"solid";log((who===0?"You":"Hustler")+" claimed "+groups[who]+"s!","win")}
 }
 if(s.breaker){breakShot=false;log(objects.length?"Legal break — "+objects.length+" ball(s) pocketed.":"Legal dry break — open table.")}
 const kept=s.breaker?objects.length>0:objects.some(p=>groups[who]?group(p.n)===groups[who]:p.n!==8);
 if(kept){
  currentRun+=objects.filter(p=>p.n!==8).length;
  if(who===0&&currentRun>profile.bestRun){profile.bestRun=currentRun;save()}
  phase=who===0?"aim":"ai";aiDelay=.82;calledPocket=-1;callMode=false;ballInHand=false;
  log((who===0?"Your":"Hustler's")+" turn continues — "+objects.length+" pocketed.","win");
  refreshUI();
 }else swapTurn("No qualifying ball made — "+(who===0?"Hustler":"your")+" turn.",false);
}
function remainingBeforeShot(g,s){
 // Reconstruct ball count at start of shot, to correctly handle the last ball and 8 together.
 return remaining(g)+s.pocketed.filter(p=>group(p.n)===g).length>0;
}
function playerOnEight(){return groups[0]!==null&&remaining(groups[0])===0}
function refreshUI(){
 $("humanGroup").textContent=groupLabel(groups[0]);$("aiGroup").textContent=groupLabel(groups[1]);
 $("rackNumber").textContent=String(rackNumber).padStart(2,"0");
 $("turnBadge").textContent=breakShot?"BREAK SHOT":groups[0]===null?"OPEN TABLE":"GROUPS SET";
 $("difficultyChip").textContent=$("difficulty").value.toUpperCase();
 const total=active().filter(b=>b.n>0).length;$("ballCount").textContent=total+" balls left";
 const human=turn===0,claim=human?"YOUR":"AI";
 let title="",desc="",status="",icon="◎";
 if(phase==="finished"){title="Rack complete";desc="Start a new rack to play again.";status="RACK COMPLETE";icon="★"}
 else if(phase==="moving"){title="Balls in motion";desc="Watch for pockets, cushions, and any foul.";status="SHOT IN PROGRESS";icon="↗"}
 else if(phase==="placing"){title="Ball in hand";desc="Click anywhere on the felt to place your cue ball legally.";status="PLACE YOUR CUE BALL";icon="◉"}
 else if(phase==="ai"){title="Hustler is lining up";desc="The computer is choosing its next shot.";status="AI THINKING";icon="✦"}
 else if(breakShot){title="Your break";desc="Pull backward from the cue ball and release to break the rack.";status="READY TO BREAK"}
 else if(playerOnEight()){title="You're on the eight";desc=calledPocket<0?"Call a pocket before shooting the 8.":("Called: "+POCKETS[calledPocket].label+". Pull back to shoot.");status="8-BALL SHOT"}
 else{title="Your turn";desc="Drag backward from the white cue ball. Pocket a ball from your set.";status="TAKE YOUR SHOT"}
 $("turnTitle").textContent=phase==="moving"?"IN PLAY":phase==="finished"?"GAME OVER":phase==="placing"?"BALL IN HAND":human?"YOUR TURN":"AI'S TURN";
 $("turnSub").textContent=breakShot?"Break shot":groups[0]===null?"Open table":"Solids vs stripes";
 $("statusTitle").textContent=title;$("statusDescription").textContent=desc;
 $("tablePhase").innerHTML='<span class="signal"></span> '+status;$("statusIcon").textContent=icon;
 $("callBtn").disabled=phase!=="aim"||!playerOnEight();
 $("callBtn").classList.toggle("armed",calledPocket>=0);
 $("callBtn").textContent=calledPocket>=0?"✦ "+POCKETS[calledPocket].label:"Call 8 pocket";
 $("callHelp").classList.toggle("hidden",!callMode);
 $("resetAim").disabled=!aim&&!callMode;
 const power=aim?clamp(dist(aim.from,aim.to)/170,0,1):0;
 $("powerFill").style.width=Math.round(power*100)+"%";$("powerValue").textContent=Math.round(power*100)+"%";
 $("eightTitle").textContent=playerOnEight()?"You're on the 8-ball":"The black eight";
 $("eightDescription").textContent=playerOnEight()?(calledPocket>=0?("Called pocket: "+POCKETS[calledPocket].label):"Call your pocket to finish the rack."):"Clear your set before the 8.";
 function drawSet(id,side){
  const root=$(id);root.replaceChildren();const g=groups[side];
  if(!g){const s=document.createElement("span");s.className="none-yet";s.textContent="Not assigned yet";root.appendChild(s);return}
  const numbers=g==="solid"?[1,2,3,4,5,6,7]:[9,10,11,12,13,14,15];
  for(const n of numbers){const div=document.createElement("div");div.className="smallball"+(n>=9?" stripe":"")+(ball(n).alive?"":" potted");div.style.setProperty("--ball",COLORS[n]);div.title="Ball "+n+(ball(n).alive?"":" (pocketed)");div.textContent=n;root.appendChild(div)}
 }
 drawSet("playerSet",0);drawSet("aiSet",1);
 $("playerLeft").textContent=groups[0]?remaining(groups[0])+" LEFT":"—";
 $("aiLeft").textContent=groups[1]?remaining(groups[1])+" LEFT":"—";
 $("wins").textContent=profile.wins;$("matches").textContent=profile.games;$("bestRun").textContent=profile.bestRun;
 $("rank").textContent=profile.wins>=20?"POOL SHARK":profile.wins>=5?"TABLE REGULAR":"POOL ROOKIE";
}
function getPoint(e){const rect=C.getBoundingClientRect();return{x:(e.clientX-rect.left)/rect.width*W,y:(e.clientY-rect.top)/rect.height*H}}
function down(e){
 if(!$("overlay").classList.contains("hidden")||turn!==0||gameFinished)return;
 const p=getPoint(e);
 if(callMode){const idx=POCKETS.findIndex(q=>dist(p,q)<44);
  if(idx>=0){calledPocket=idx;callMode=false;toast("Called "+POCKETS[idx].label)}else toast("Tap a highlighted pocket");refreshUI();return}
 if(phase==="placing"){const spot=findPlace(p.x,p.y);placeCue(spot.x,spot.y);toast("Cue ball placed — take your shot");return}
 if(phase!=="aim")return;
 const cue=ball(0);if(!cue.alive)return;
 if(dist(p,cue)>cue.r+25){hover=p;return}
 aim={from:{x:cue.x,y:cue.y},to:p};try{C.setPointerCapture(e.pointerId)}catch(_){}refreshUI();
}
function move(e){hover=getPoint(e);if(aim){aim.to=hover;refreshUI()}}
function up(e){
 if(!aim||phase!=="aim"||turn!==0)return;
 const p=getPoint(e),cue=ball(0),dx=cue.x-p.x,dy=cue.y-p.y,m=length(dx,dy);
 aim=null;
 if(m<16){refreshUI();return}
 if(playerOnEight()&&calledPocket<0){toast("Call an 8-ball pocket first.");refreshUI();return}
 fireShot(0,Math.atan2(dy,dx),clamp(m/170,.07,1));
}
C.addEventListener("pointerdown",down);C.addEventListener("pointermove",move);C.addEventListener("pointerup",up);
C.addEventListener("pointercancel",()=>{aim=null;refreshUI()});
$("newBtn").addEventListener("click",newGame);
$("rulesBtn").addEventListener("click",openRules);
$("resetAim").addEventListener("click",()=>{aim=null;callMode=false;refreshUI()});
$("callBtn").addEventListener("click",()=>{
 if(phase!=="aim"||!playerOnEight())return;
 callMode=true;aim=null;refreshUI();toast("Choose one of the six pockets");
});
$("overlayButton").addEventListener("click",()=>{$("overlay").classList.add("hidden")});
$("difficulty").addEventListener("change",()=>{refreshUI();toast("AI set to "+$("difficulty").value)});
function drawBall(b){
 if(!b.alive)return;
 const color=COLORS[b.n];
 ctx.save();ctx.beginPath();ctx.ellipse(b.x+2,b.y+4,R*1.05,R*.75,0,0,Math.PI*2);ctx.fillStyle="#00120e91";ctx.fill();
 const grad=ctx.createRadialGradient(b.x-4,b.y-5,1,b.x,b.y,R);grad.addColorStop(0,"#fff");grad.addColorStop(.20,color);grad.addColorStop(1,b.n===0?"#a1b2b0":"#181e1f");
 ctx.beginPath();ctx.arc(b.x,b.y,R,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.clip();
 if(b.n>=9){ctx.fillStyle="#f4f4e7";ctx.fillRect(b.x-R,b.y-R,R*2,R*.6);ctx.fillRect(b.x-R,b.y+R*.44,R*2,R*.6);ctx.fillStyle=color;ctx.fillRect(b.x-R,b.y-R*.46,R*2,R*.92)}
 ctx.beginPath();ctx.arc(b.x,b.y,R*.45,0,Math.PI*2);ctx.fillStyle=b.n===0?"#f4f4e9":"#f8f9ec";ctx.fill();
 if(b.n){ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#171b1e";ctx.font="900 9px Arial,sans-serif";ctx.fillText(b.n,b.x,b.y+.4)}
 ctx.restore();
 ctx.beginPath();ctx.arc(b.x,b.y,R,0,Math.PI*2);ctx.strokeStyle="#eaf4ef63";ctx.lineWidth=.8;ctx.stroke();
}
function drawTable(){
 const wood=ctx.createLinearGradient(0,0,W,H);wood.addColorStop(0,"#8c623c");wood.addColorStop(.45,"#47321e");wood.addColorStop(1,"#a27242");
 ctx.fillStyle=wood;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#1d231c";ctx.fillRect(18,18,W-36,H-36);
 ctx.strokeStyle="#d3a66a";ctx.lineWidth=8;ctx.strokeRect(10,10,W-20,H-20);
 ctx.fillStyle="#153f31";ctx.fillRect(40,43,W-80,H-86);
 const felt=ctx.createRadialGradient(W/2,H/2,40,W/2,H/2,550);felt.addColorStop(0,"#217d60");felt.addColorStop(.7,"#146347");felt.addColorStop(1,"#0d3f32");
 ctx.fillStyle=felt;ctx.fillRect(L,T,RIGHT-L,BOTTOM-T);
 ctx.strokeStyle="#86bb9a2b";ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(284,T+3);ctx.lineTo(284,BOTTOM-3);ctx.stroke();
 ctx.beginPath();ctx.arc(284,295,62,0,Math.PI*2);ctx.strokeStyle="#9ac4a939";ctx.stroke();
 ctx.strokeStyle="#d1c59a55";ctx.lineWidth=5;ctx.strokeRect(L-2,T-2,RIGHT-L+4,BOTTOM-T+4);
 // Cushion highlights, rail diamonds.
 ctx.fillStyle="#092c24";ctx.fillRect(L,T-9,RIGHT-L,9);ctx.fillRect(L,BOTTOM,RIGHT-L,9);
 ctx.fillRect(L-9,T,9,BOTTOM-T);ctx.fillRect(RIGHT,T,9,BOTTOM-T);
 ctx.fillStyle="#e9d49c";
 for(const x of [155,284,391,647,756,885])for(const y of [28,562]){ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+5,y);ctx.lineTo(x,y+4);ctx.lineTo(x-5,y);ctx.fill()}
 for(const y of [166,271,379,425])for(const x of [29,1011]){ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+5,y);ctx.lineTo(x,y+4);ctx.lineTo(x-5,y);ctx.fill()}
 // Pocket mouths drawn above all rails, below balls.
 POCKETS.forEach((p,i)=>{
  ctx.beginPath();ctx.arc(p.x,p.y,i===1||i===4?28:27,0,Math.PI*2);ctx.fillStyle="#0c1814";ctx.fill();ctx.lineWidth=5;ctx.strokeStyle="#9c7d4d";ctx.stroke();
  ctx.beginPath();ctx.arc(p.x,p.y,19,0,Math.PI*2);ctx.fillStyle="#030a0b";ctx.fill();
  if(callMode||calledPocket===i){
   const active=calledPocket===i;
   ctx.beginPath();ctx.arc(p.x,p.y,35,0,Math.PI*2);ctx.lineWidth=active?5:3;ctx.strokeStyle=active?"#fff4c0":"#e9c47b";ctx.stroke();
   if(callMode){ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="900 10px system-ui";ctx.fillStyle="#f9e4a6";ctx.fillText("CALL",p.x,p.y-39)}
  }
 });
}
function drawGuide(){
 if(phase!=="aim"||turn!==0||!ball(0).alive||callMode)return;
 const cue=ball(0),from=aim?aim.to:hover;
 if(!from)return;
 const dx=aim?cue.x-from.x:from.x-cue.x,dy=aim?cue.y-from.y:from.y-cue.y;
 const m=length(dx,dy);if(m<1)return;
 const nx=dx/m,ny=dy/m;
 // Find earliest prospective ball hit along the shot ray (ghost-ball contact).
 let best=Infinity,hit=null;
 for(const b of balls)if(b.alive&&b.n!==0){
  const bx=b.x-cue.x,by=b.y-cue.y,t=bx*nx+by*ny;
  if(t<=0)continue;
  const side2=bx*bx+by*by-t*t;
  if(side2>(R*2)**2)continue;
  const entry=t-Math.sqrt(Math.max(0,(R*2)**2-side2));
  if(entry<best){best=entry;hit=b}
 }
 const travel=hit?best:Math.min(700,Math.max(0,(nx>0?(RIGHT-R-cue.x)/nx:(L+R-cue.x)/nx) ||700));
 ctx.save();
 ctx.setLineDash([7,7]);ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(cue.x,cue.y);ctx.lineTo(cue.x+nx*travel,cue.y+ny*travel);ctx.strokeStyle="#fff6d3bf";ctx.stroke();
 ctx.setLineDash([]);
 if(hit){ctx.beginPath();ctx.arc(cue.x+nx*best,cue.y+ny*best,R,0,Math.PI*2);ctx.strokeStyle="#f8df9b";ctx.lineWidth=1.5;ctx.stroke()}
 if(aim){
  const power=clamp(m/170,0,1),tail=52+power*116;
  ctx.beginPath();ctx.moveTo(cue.x-nx*(R+9),cue.y-ny*(R+9));ctx.lineTo(cue.x-nx*(R+tail),cue.y-ny*(R+tail));
  ctx.strokeStyle="#967448";ctx.lineWidth=8;ctx.lineCap="round";ctx.stroke();
  ctx.beginPath();ctx.moveTo(cue.x-nx*(R+9),cue.y-ny*(R+9));ctx.lineTo(cue.x-nx*(R+30),cue.y-ny*(R+30));ctx.strokeStyle="#d3ded6";ctx.lineWidth=5;ctx.stroke();
  ctx.beginPath();ctx.arc(cue.x,cue.y,R+8,0,Math.PI*2);ctx.strokeStyle="#ffdda1";ctx.lineWidth=1.6;ctx.stroke();
 }
 ctx.restore();
}
function draw(){
 ctx.clearRect(0,0,W,H);drawTable();
 for(const b of balls)drawBall(b);
 if(phase==="placing"&&hover){const p=findPlace(hover.x,hover.y);ctx.beginPath();ctx.arc(p.x,p.y,R+4,0,Math.PI*2);ctx.fillStyle="#ffffff74";ctx.fill();ctx.strokeStyle="#ffd88a";ctx.lineWidth=2;ctx.stroke()}
 drawGuide();
 for(const p of particles){
  ctx.globalAlpha=clamp(p.life/.55,0,1);ctx.beginPath();ctx.arc(p.x,p.y,2.3,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();
 }
 ctx.globalAlpha=1;
}
function frame(time){
 const dt=Math.min((time-lastTs)/1000||0,.06);lastTs=time;
 if(phase==="moving"){
  roundAge+=dt;simAccumulator=Math.min(simAccumulator+dt,.12);
  while(simAccumulator>=1/120){stepPhysics();simAccumulator-=1/120}
  if((roundAge>.28&&active().every(b=>length(b.vx,b.vy)<.035))||roundAge>17){for(const b of active()){b.vx=b.vy=0}resolveShot()}
 }else if(phase==="ai"){
  aiDelay-=dt;if(aiDelay<=0)takeAITurn();
 }
 particles=particles.filter(p=>p.life>0);for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.life-=dt}
 draw();requestAnimationFrame(frame);
}
newGame();requestAnimationFrame(frame);
})();