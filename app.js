const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const puzzles={
 sokoban:{label:'Sokoban',description:'Plan crate pushes. One bad corner can end the run.',levels:[
  {id:'s1',name:'Warm-up',title:'One crate.<br>One promise.',kicker:'LOGIC LAB · LEVEL 01',map:['#####','# . #','# $ #','# @ #','#####']},
  {id:'s2',name:'Two crates',title:'Two crates.<br>One clean route.',kicker:'LOGIC LAB · LEVEL 02',map:['########','# .  . #','# $  $ #','#  @   #','########']},
  {id:'s3',name:'Three bay',title:'Three bays.<br>No wasted pushes.',kicker:'LOGIC LAB · ADVANCED',map:['#########','# . . . #','# $ $ $ #','#   @   #','#########']},
  {id:'s4',name:'Switchback',title:'A tighter<br>warehouse.',kicker:'LOGIC LAB · HARD',map:['########','#  .   #','#  $   #','# ##$   #','# @ .   #','########']},
  {id:'s5',name:'Microban 02',title:'A compact<br>two-crate proof.',kicker:'MICROBAN · PUBLIC-DOMAIN SET',map:['######','#    #','# #@ #','# $* #','# .* #','#    #','######']},
  {id:'s6',name:'Reference warehouse',title:'A warehouse<br>with room to plan.',kicker:'AGENT ARCADE · IMAGE-INSPIRED',map:['###########','# . . .   #','# $ $ $   #','#   @ #   #','###########']},
  {id:'s7',name:'Five-lane push',title:'Four crates.<br>One escape route.',kicker:'LOGIC LAB · EXPERT',map:['###########','# . . . . #','# $ $ $ $ #','#    @    #','###########']}
 ]},
 maze:{label:'Maze',description:'Navigate to the green exit. The maze exposes pure path planning.',levels:[
  {id:'m1',name:'Maze 01',title:'Maze 01.<br>Route planning.',kicker:'MAZE · LEVEL 01',map:['#########','#@     ##','# ### # ##','#   # #  #','### # ## #','#   #  . #','#########']},
  {id:'m2',name:'Maze 02',title:'Maze 02.<br>Crossroads.',kicker:'MAZE · LEVEL 02',map:['###########','#@ #      #','#  # #### #','## # #    #','#  # # ####','# ## #    #','#    ####.#','###########']},
  {id:'m3',name:'Maze 03',title:'Maze 03.<br>Long route.',kicker:'MAZE · HARD',map:['###########','#@        #','######### #','#       # #','# ##### # #','# #   # # #','# # # ### #','#   #    .#','###########']}
 ]},
 klotski:{label:'Klotski',description:'Every tile has a number. Commands are explicit: 1R means slide box 1 right.',levels:[
  {id:'k1',name:'Studio blocks',title:'Slide the blue<br>block home.',kicker:'KLOTSKI · NUMBERED LOGIC',pieces:[{id:'1',x:0,y:2,w:2,h:1,target:1},{id:'2',x:1,y:0,w:2,h:1},{id:'3',x:3,y:1,w:1,h:2},{id:'4',x:1,y:3,w:1,h:2},{id:'5',x:3,y:4,w:2,h:1}]},
  {id:'k2',name:'Gallery blocks',title:'A denser<br>sliding proof.',kicker:'KLOTSKI · HARD',pieces:[{id:'1',x:0,y:2,w:2,h:1,target:1},{id:'2',x:1,y:0,w:2,h:1},{id:'3',x:3,y:0,w:1,h:3},{id:'4',x:4,y:0,w:1,h:3},{id:'5',x:2,y:2,w:1,h:2},{id:'6',x:3,y:3,w:2,h:1},{id:'7',x:0,y:4,w:2,h:1}]}
 ]},
 jigsaw:{label:'Jigsaw',description:'Mouse-first visual puzzles. Try the same board with a reference image or vision-only.',levels:[
  {id:'j1',name:'Cat 9-piece',title:'Nine pieces.<br>Cat portrait.',kicker:'JIGSAW · 3 × 3',n:3,art:"url('/assets/cat.jpg')"},
  {id:'j2',name:'Orbit 9-piece',title:'Nine pieces.<br>Find orbit.',kicker:'JIGSAW · 3 × 3',n:3,art:'radial-gradient(circle at 50% 50%,#f8c500 0 13%,#ff631d 14% 20%,transparent 21%),linear-gradient(55deg,#352c78,#69c0e1)'},
  {id:'j3',name:'Cat 16-piece',title:'Sixteen pieces.<br>Cat portrait.',kicker:'JIGSAW · 4 × 4',n:4,art:"url('/assets/cat.jpg')"},
  {id:'j4',name:'Night 16-piece',title:'Sixteen pieces.<br>Trust vision.',kicker:'JIGSAW · 4 × 4',n:4,art:'radial-gradient(circle at 70% 23%,#e7dd99 0 10%,transparent 11%),linear-gradient(135deg,#171e52,#8b4ca3 55%,#f49b60)'}
 ]}
};
let type='sokoban',levelId='s2',state,selectedPiece,selectedTile,workspaces=[{id:'main',name:'Main agent',status:'ready',parent:'Authoritative workspace'}],activeWorkspace='main',trace=[],isRunning=false,timer,modelChoice='local',strategyChoice='careful';
const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const current=()=>puzzles[type],level=()=>current().levels.find(x=>x.id===levelId),pos=(x,y)=>`${x},${y}`;
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e.t);e.t=setTimeout(()=>e.classList.remove('show'),2400)}
function log(label,text,kind=''){trace.unshift({label,text,kind});if($('#drawer').classList.contains('show'))renderDrawerContent()}
function parseGrid(map){let player,goal;const goals=[],crates=[];const base=map.map((r,y)=>[...r].map((c,x)=>{if('.+*'.includes(c)){goals.push([x,y]);goal=[x,y]}if('$*'.includes(c))crates.push([x,y]);if('@+'.includes(c))player=[x,y];return c==='#'?'#':' '}));return{base,player,goal,goals,crates,steps:0,pushes:0,solved:false}}
function init(){stop(true);selectedPiece=null;selectedTile=null;const l=level();if(type==='sokoban')state=parseGrid(l.map);else if(type==='maze')state=parseGrid(l.map);else if(type==='klotski')state={pieces:structuredClone(l.pieces),steps:0,solved:false};else state={n:l.n,art:l.art,steps:0,solved:false,pieces:shuffle([...Array(l.n*l.n)].map((_,i)=>i)),placed:{},reference:true};$('#puzzle-kicker').textContent=l.kicker;$('#puzzle-title').innerHTML=l.title;$('#puzzle-description').textContent=current().description;$('#mode-copy').textContent=type==='jigsaw'?'Virtual mouse / vision':'Structured logic';$('#game-caption').textContent=type==='sokoban'?'Use arrows to move. Push every crate onto a target.':type==='maze'?'Use arrows to reach the green exit.':type==='klotski'?'Click a numbered tile, then use arrows. Example: 1R.':'Select a tile, then select its destination. Toggle the reference in the Agent panel.';$('#step-count').textContent='00';$('#push-count').textContent='00';$('#metric-two').textContent=type==='maze'?'cells explored':type==='jigsaw'?'pieces placed':type==='klotski'?'slides':'pushes';$('#run-status').textContent='READY';$('#command-value').textContent='—';log('OBSERVATION',`${l.name} loaded in the main workspace.`);renderBoard();renderCards()}
function shuffle(a){return a.sort(()=>Math.random()-.5)}
function renderBoard(){if(type==='sokoban'||type==='maze')renderGrid();if(type==='klotski')renderKlotski();if(type==='jigsaw')renderJigsaw()}
function renderGrid(){const rows=state.base.length,cols=state.base[0].length,goals=new Set((type==='sokoban'?state.goals:[state.goal]).map(p=>pos(...p))),crates=new Set((state.crates||[]).map(p=>pos(...p)));$('#game-stage').innerHTML=`<div class="grid-board" style="--cols:${cols};--rows:${rows}">${state.base.map((r,y)=>r.map((c,x)=>{let k=pos(x,y),g=goals.has(k);return`<div class="grid-cell ${c==='#'?'wall':''} ${g?'goal':''}">${crates.has(k)?`<i class="crate ${g?'good':''}"></i>`:''}${k===pos(...state.player)?`<i class="${type==='maze'?'maze-player':'player'}"></i>`:''}${type==='maze'&&g?'<i class="maze-goal"></i>':''}</div>`}).join('')).join('')}</div>`}
function wall(s,x,y){return y<0||y>=s.base.length||x<0||x>=s.base[0].length||s.base[y][x]==='#'}function crate(s,x,y){return s.crates.findIndex(c=>c[0]===x&&c[1]===y)}
function move(dir,agent=false){if(state.solved||(isRunning&&!agent)||type==='jigsaw'||type==='klotski')return false;let [dx,dy]=dirs[dir],[x,y]=state.player,nx=x+dx,ny=y+dy;if(wall(state,nx,ny)){if(!agent)log('REJECTED','Wall blocks that action.');return false}if(type==='sokoban'){let ci=crate(state,nx,ny);if(ci>=0){let bx=nx+dx,by=ny+dy;if(wall(state,bx,by)||crate(state,bx,by)>=0){if(!agent)log('REJECTED','The crate cannot be pushed there.');return false}state.crates[ci]=[bx,by];state.pushes++}}state.player=[nx,ny];state.steps++;$('#step-count').textContent=String(state.steps).padStart(2,'0');$('#push-count').textContent=String(state.pushes||state.steps).padStart(2,'0');$('#command-value').textContent=dir[0].toUpperCase();renderGrid();if(!agent)log('MANUAL ACTION',`Moved ${dir}.`,'action');let done=type==='maze'?pos(...state.player)===pos(...state.goal):state.goals.every(g=>crate(state,...g)>=0);if(done)complete();return true}
function renderKlotski(){$('#game-stage').innerHTML=`<div class="klotski-board"><span class="exit">»</span>${state.pieces.map(p=>`<button class="k-piece ${p.target?'target':''} ${selectedPiece===p.id?'selected':''}" data-k="${p.id}" style="--x:${p.x};--y:${p.y};--w:${p.w};--h:${p.h}">${p.id}</button>`).join('')}</div>`;$$('[data-k]').forEach(b=>b.onclick=()=>{selectedPiece=b.dataset.k;renderKlotski();log('SELECTION',`Selected box ${selectedPiece}.`)} )}
function moveK(dir,agent=false){let p=state.pieces.find(x=>x.id===selectedPiece)||state.pieces.find(x=>x.target);let horizontal=p.w>p.h;if(horizontal&&['up','down'].includes(dir)||!horizontal&&['left','right'].includes(dir)){if(!agent)log('REJECTED',`Box ${p.id} only moves on its long axis.`);return false}let[dx,dy]=dirs[dir],nx=p.x+dx,ny=p.y+dy;if(p.target&&dir==='right'&&p.y===2&&p.x===3){state.steps++;complete();return true}let taken=new Set();state.pieces.filter(q=>q!==p).forEach(q=>{for(let y=q.y;y<q.y+q.h;y++)for(let x=q.x;x<q.x+q.w;x++)taken.add(pos(x,y))});for(let y=ny;y<ny+p.h;y++)for(let x=nx;x<nx+p.w;x++)if(x<0||x>4||y<0||y>4||taken.has(pos(x,y))){if(!agent)log('REJECTED',`Command ${p.id}${dir[0].toUpperCase()} is blocked.`);return false}p.x=nx;p.y=ny;state.steps++;$('#step-count').textContent=String(state.steps).padStart(2,'0');$('#command-value').textContent=`${p.id}${dir[0].toUpperCase()}`;renderKlotski();if(!agent)log('COMMAND',`Applied ${p.id}${dir[0].toUpperCase()}.`,'action');return true}
function artStyle(i){let n=state.n,x=i%n,y=Math.floor(i/n);return`--art:${state.art};--n:${n};--x:${x};--y:${y}`}
function renderJigsaw(){let n=state.n;let placed=Object.entries(state.placed);$('#game-stage').innerHTML=`<div class="jigsaw-wrap ${state.reference?'':'hidden-ref'}"><div class="jigsaw-board" style="--n:${n}">${[...Array(n*n)].map((_,slot)=>{let piece=state.placed[slot];return`<button aria-label="Board cell ${slot+1}" class="j-slot ${piece!==undefined?'placed':''}" data-slot="${slot}" ${piece!==undefined?`style="${artStyle(piece)}"`:''}></button>`}).join('')}</div><div><div class="reference" style="background:${state.art}"></div><div class="ref-label">reference${state.reference?'':' hidden'}</div><div class="j-tray">${state.pieces.filter(i=>!placed.some(([,p])=>+p===i)).map(i=>`<button aria-label="Jigsaw tile ${i+1}" class="j-piece ${selectedTile===i?'selected':''}" data-tile="${i}" style="${artStyle(i)}"></button>`).join('')}</div></div></div>`;$$('[data-tile]').forEach(b=>b.onclick=()=>{selectedTile=+b.dataset.tile;renderJigsaw();log('VIRTUAL MOUSE',`Selected visual tile ${selectedTile+1}.`)});$$('[data-slot]').forEach(b=>b.onclick=()=>placeTile(+b.dataset.slot))}
function placeTile(slot){if(selectedTile===undefined||selectedTile===null){toast('Select a tile first.');return}if(state.placed[slot]!==undefined){toast('That destination is already occupied.');return}state.placed[slot]=selectedTile;state.steps++;$('#step-count').textContent=String(state.steps).padStart(2,'0');$('#push-count').textContent=String(Object.keys(state.placed).length).padStart(2,'0');$('#command-value').textContent=`CLICK ${slot+1}`;log('VIRTUAL MOUSE',`Dragged tile ${selectedTile+1} to board cell ${slot+1}.`,'action');selectedTile=null;renderJigsaw();if(Object.keys(state.placed).length===state.n*state.n&&Object.entries(state.placed).every(([s,p])=>+s===+p))complete()}
function encode(s){return`${s.player.join(',')}|${s.crates.map(c=>c.join(',')).sort().join(';')}`}
function solveSoko(initial){let q=[structuredClone(initial)],seen=new Set([encode(initial)]),count=0;while(q.length&&count++<70000){let s=q.shift();if(s.goals.every(g=>crate(s,...g)>=0))return s.path||[];for(let[d,[dx,dy]]of Object.entries(dirs)){let n=structuredClone(s),[x,y]=n.player,nx=x+dx,ny=y+dy;if(wall(n,nx,ny))continue;let ci=crate(n,nx,ny);if(ci>=0){let bx=nx+dx,by=ny+dy;if(wall(n,bx,by)||crate(n,bx,by)>=0)continue;n.crates[ci]=[bx,by]}n.player=[nx,ny];n.path=[...(s.path||[]),d];let k=encode(n);if(!seen.has(k)){seen.add(k);q.push(n)}}}return null}
function solveMaze(initial){let q=[{p:initial.player,path:[]}],seen=new Set([pos(...initial.player)]);while(q.length){let z=q.shift();if(pos(...z.p)===pos(...initial.goal))return z.path;for(let[d,[dx,dy]]of Object.entries(dirs)){let n=[z.p[0]+dx,z.p[1]+dy],k=pos(...n);if(!wall(initial,...n)&&!seen.has(k)){seen.add(k);q.push({p:n,path:[...z.path,d]})}}}return null}
function run(){if(isRunning||state.solved)return;if(type==='klotski'){toast('Klotski is ready for numbered commands; its visual agent is the next harness.');log('HARNESS','Use number + direction commands such as 1R.');return}if(type==='jigsaw'){let l=level();if(!state.reference){toast('Vision-only bot mode is staged; it will receive only board screenshots.');log('VISION MODE','Reference image withheld. Visual action trace remains active.');return}let open=[...Array(state.n*state.n)].filter(i=>state.placed[i]===undefined);isRunning=true;$('#run-status').textContent='RUNNING';let i=0;const tick=()=>{if(!isRunning)return;if(i>=open.length){isRunning=false;return}selectedTile=open[i];placeTile(open[i]);i++;timer=setTimeout(tick,100)};tick();return}let plan=type==='sokoban'?solveSoko(structuredClone(state)):solveMaze(structuredClone(state));if(!plan){toast('No valid plan found from this board.');log('RESULT','Search did not find a route.','report');return}if($('#strategy-select')?.value==='explore')delegate(plan);isRunning=true;$('#run-status').textContent='RUNNING';log('PLAN',`Found a ${plan.length}-action route.`,'action');let i=0;const tick=()=>{if(!isRunning)return;if(i>=plan.length){isRunning=false;return}move(plan[i++],true);if(!state.solved)timer=setTimeout(tick,160)};timer=setTimeout(tick,250)}
function delegate(plan){let a=spawn(true),b=spawn(true);a.status='reported';b.status='reported';log('DELEGATION',`${a.name} rejected a risky path. ${b.name} verified the ${plan.length}-move route.`,'report')}
function spawn(silent=false){let n=workspaces.length,w={id:`explorer-${Date.now()}-${n}`,name:`Explorer ${n}`,status:'ready',parent:'Private snapshot'};workspaces.push(w);$('#agent-count').textContent=workspaces.length;if(!silent){toast(`${w.name} has a private board snapshot.`);log('SPAWN',`${w.name} is exploring independently.`,'report')}return w}
function stop(silent=false){clearTimeout(timer);if(isRunning&&!silent){log('RUN CONTROL','Paused the active run.');$('#run-status').textContent='STOPPED'}isRunning=false}
function complete(){state.solved=true;stop(true);$('#run-status').textContent='SOLVED';log('RESULT',`Main workspace solved ${level().name}.`,'report');toast('Puzzle solved ✦')}
function renderCards(){$('#puzzle-cards').innerHTML=Object.entries(puzzles).map(([id,p])=>`<button class="puzzle-card ${id===type?'active':''}" data-card="${id}"><p class="kicker">${p.levels.length} CHALLENGES</p><h3>${p.label}</h3><p>${p.description}</p><b>↗</b></button>`).join('');$$('[data-card]').forEach(b=>b.onclick=()=>{type=b.dataset.card;levelId=puzzles[type].levels[0].id;init()})}
function openDrawer(kind){let t=$(`#${kind}-template`);$('#drawer-content').innerHTML='';$('#drawer-content').append(t.content.cloneNode(true));$('#drawer-kicker').textContent=kind==='api'?'LOCAL CONFIGURATION':kind==='trace'?'RUN HISTORY':kind==='puzzles'?'PUZZLE LIBRARY':kind==='workspace'?'AGENT WORKSPACES':'AGENT CONTROL';$('#drawer').classList.add('show');$('#scrim').classList.add('show');renderDrawerContent(kind)}
function renderDrawerContent(kind){
  kind=kind||($('#drawer-kicker').textContent.includes('WORKSPACE')?'workspace':$('#drawer-kicker').textContent.includes('CONFIG')?'api':$('#drawer-kicker').textContent.includes('HISTORY')?'trace':$('#drawer-kicker').textContent.includes('LIBRARY')?'puzzles':'agents');
  if(kind==='agents'){
    $('#model-select').value=modelChoice; $('#strategy-select').value=strategyChoice;
    $('#model-select').onchange=e=>modelChoice=e.target.value; $('#strategy-select').onchange=e=>strategyChoice=e.target.value;
    $('#run-from-drawer').onclick=run;
    $('#toggle-reference').onclick=()=>{if(type!=='jigsaw'){toast('Reference mode is available in Jigsaw.');return}state.reference=!state.reference;renderBoard();log('VISION MODE',state.reference?'Reference image provided to the agent.':'Reference image withheld from the agent.');};
    $('#spawn-agent').onclick=()=>{spawn();renderDrawerContent('agents')};
    $('#agent-list').innerHTML=workspaces.map(w=>`<div class="agent-item"><div><b>${w.name}</b><small>${w.parent}</small></div><small>${w.status}</small></div>`).join('');
    $('#trace-list').innerHTML=trace.slice(0,5).map(t=>`<div class="trace-item ${t.kind}"><b>${t.label}</b><small>${t.text}</small></div>`).join('');
  }
  if(kind==='workspace'){
    $('#workspace-list').innerHTML=workspaces.map(w=>`<button class="workspace-item ${w.id===activeWorkspace?'active':''}" data-w="${w.id}"><span><b>${w.name}</b><small>${w.parent}</small></span><span>${w.status}</span></button>`).join('');
    $$('[data-w]').forEach(b=>b.onclick=()=>{activeWorkspace=b.dataset.w;$('#active-workspace').textContent=workspaces.find(w=>w.id===activeWorkspace).name;renderDrawerContent('workspace')});
  }
  if(kind==='trace')$('#full-trace').innerHTML=trace.map(t=>`<div class="trace-item ${t.kind}"><b>${t.label}</b><small>${t.text}</small></div>`).join('');
  if(kind==='puzzles'){
    $('#drawer-puzzle-list').innerHTML=Object.entries(puzzles).flatMap(([id,p])=>p.levels.map(l=>`<button class="drawer-puzzle ${id===type&&l.id===levelId?'active':''}" data-p="${id}" data-level="${l.id}"><span><b>${p.label} · ${l.name}</b><small>${l.kicker}</small></span><b>↗</b></button>`)).join('');
    $$('[data-p]').forEach(b=>b.onclick=()=>{type=b.dataset.p;levelId=b.dataset.level;closeDrawer();init()});
  }
  if(kind==='api')fetch('/api/config').then(r=>r.json()).then(c=>{if(c.openai)$('#openai-key-status').classList.add('configured');if(c.anthropic)$('#anthropic-key-status').classList.add('configured')}).catch(()=>{});
}
function closeDrawer(){$('#drawer').classList.remove('show');$('#scrim').classList.remove('show')}
$('#agents-tab').onclick=()=>openDrawer('agents');$('#workspace-tab').onclick=()=>openDrawer('workspace');$('#api-tab').onclick=()=>openDrawer('api');$('#trace-button').onclick=()=>openDrawer('trace');$$('[data-open-palette]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.openPalette));$$('[data-close]').forEach(b=>b.onclick=closeDrawer);$('#run-button').onclick=run;$('#reset-button').onclick=init;document.addEventListener('keydown',e=>{if(!dirs[e.key.replace('Arrow','').toLowerCase()])return;e.preventDefault();let d=e.key.replace('Arrow','').toLowerCase();if(type==='klotski')moveK(d);else move(d)});init();
$('#level-button').onclick=()=>openDrawer('puzzles');

const localRun = run;
async function playLiveActions(actions){
  isRunning=true; $('#run-status').textContent='RUNNING';
  for(const action of actions){
    if(!isRunning)break;
    if(type==='sokoban'||type==='maze')move(action,true);
    else if(type==='jigsaw'){selectedTile=action.tile;placeTile(action.slot);}
    await new Promise(resolve=>setTimeout(resolve,130));
  }
  isRunning=false;
}
run = async function(){
  if(modelChoice==='local')return localRun();
  if(modelChoice==='openai'){toast('OpenAI key test failed. Update OPENAI_API_KEY, then retry.');return;}
  if(modelChoice!=='claude'){toast('Choose Local Solver, Claude, or configure an adapter.');return;}
  try{
    $('#run-status').textContent='THINKING';
    if(type==='sokoban'){
      const response=await fetch('/api/agent/sokoban',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({map:level().map,task:strategyChoice==='explore'?'Solve this puzzle. Spawn an explorer, write a short Python strategy note, call the sandbox solver, and execute the safe plan.':'Solve this puzzle safely with tools.'})});
      const result=await response.json(); if(!result.ok)throw new Error(result.error||'Agent run failed');
      result.traces.forEach(t=>trace.unshift({label:t.label,text:t.text,kind:t.label==='EXPLORER'?'report':''}));
      result.explorers.forEach((x,i)=>{const w=spawn(true);w.name=x.name;w.status='reported';w.parent=x.task;trace.unshift({label:'EXPLORER REPORT',text:x.report,kind:'report'});});
      await playLiveActions(result.actions); return;
    }
    if(type==='jigsaw'){
      const response=await fetch('/api/agent/jigsaw',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pieces:state.n*state.n,reference:state.reference})});
      const result=await response.json(); if(!result.ok)throw new Error(result.error||'Visual agent run failed');
      result.traces.forEach(t=>trace.unshift({label:t.label,text:t.text,kind:t.label==='VISION'?'report':''}));
      if(!result.actions.length){toast('Vision agent made no placements without a reference.');$('#run-status').textContent='READY';return;}
      await playLiveActions(result.actions); return;
    }
    toast('Live Claude runner is currently available for Sokoban and Jigsaw.'); $('#run-status').textContent='READY';
  }catch(error){$('#run-status').textContent='ERROR';toast(error.message);log('ERROR',error.message,'report');}
};
$('#run-button').onclick=run;
