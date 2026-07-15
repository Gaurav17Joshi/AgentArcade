const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const puzzles={
 sokoban:{label:'Sokoban',description:'Plan crate pushes. One bad corner can end the run.',levels:[
  {id:'s1',name:'Warm-up',title:'One crate.<br>One promise.',kicker:'LOGIC LAB · LEVEL 01',map:['#####','# . #','# $ #','# @ #','#####']},
  {id:'s2',name:'Two crates',title:'Two crates.<br>One clean route.',kicker:'LOGIC LAB · LEVEL 02',map:['########','# .  . #','# $  $ #','#  @   #','########']},
  {id:'s3',name:'Three bay',title:'Three bays.<br>No wasted pushes.',kicker:'LOGIC LAB · ADVANCED',map:['#########','# . . . #','# $ $ $ #','#   @   #','#########']},
  {id:'s4',name:'Switchback',title:'A tighter<br>warehouse.',kicker:'LOGIC LAB · HARD',map:['#########','# .   . #','# $ # $ #','#   @   #','#########']},
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
let type='sokoban',levelId='s2',state,selectedPiece,selectedTile,workspaces=[{id:'main',name:'Main agent',status:'ready',parent:'Authoritative workspace'}],activeWorkspace='main',trace=[],isRunning=false,timer,modelChoice='local',strategyChoice='explore',pickerType='sokoban',liveRun={timer:null,startedAt:0,events:[]},runGeneration=0;
const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const current=()=>puzzles[type],level=()=>current().levels.find(x=>x.id===levelId),pos=(x,y)=>`${x},${y}`;
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e.t);e.t=setTimeout(()=>e.classList.remove('show'),2400)}
function log(label,text,kind=''){trace.unshift({label,text,kind});if($('#drawer').classList.contains('show'))renderDrawerContent()}
function normaliseMap(map){const width=Math.max(...map.map(row=>row.length));return map.map(row=>row.padEnd(width,'#'))}
function parseGrid(map){let player,goal;const goals=[],crates=[];const base=normaliseMap(map).map((r,y)=>[...r].map((c,x)=>{if('.+*'.includes(c)){goals.push([x,y]);goal=[x,y]}if('$*'.includes(c))crates.push([x,y]);if('@+'.includes(c))player=[x,y];return c==='#'?'#':' '}));if(!player)throw new Error('Puzzle map has no player start.');return{base,player,goal,goals,crates,steps:0,pushes:0,solved:false}}
function resetLiveRun(){clearInterval(liveRun.timer);liveRun={timer:null,startedAt:0,events:[]};$('#live-run-panel').hidden=true}
function elapsed(){let seconds=Math.max(0,Math.floor((Date.now()-liveRun.startedAt)/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
function renderLiveRun(){const panel=$('#live-run-panel');if(!liveRun.startedAt){panel.hidden=true;return}panel.hidden=false;$('#live-run-elapsed').textContent=elapsed();$('#live-run-title').textContent=liveRun.title||'Agent is working on the puzzle.';$('#live-run-detail').textContent=liveRun.detail||'Preparing the next safe step.';$('#live-run-events').innerHTML=liveRun.events.slice(-4).map((event,index)=>`<li class="${index===liveRun.events.slice(-4).length-1?'current':'done'}">${event}</li>`).join('')}
function beginLiveRun(title,detail){resetLiveRun();liveRun.startedAt=Date.now();liveRun.title=title;liveRun.detail=detail;liveRun.events=['Workspace opened'];liveRun.timer=setInterval(renderLiveRun,400);renderLiveRun()}
function updateLiveRun(title,detail,event){if(!liveRun.startedAt)return;liveRun.title=title;liveRun.detail=detail;if(event&&liveRun.events.at(-1)!==event)liveRun.events.push(event);renderLiveRun()}
function finishLiveRun(title,detail){if(!liveRun.startedAt)return;updateLiveRun(title,detail,'Run complete');clearInterval(liveRun.timer);liveRun.timer=null;setTimeout(()=>{$('#live-run-panel').hidden=true},7000)}
function friendlyAction(direction,index,total){return `Move ${String(index+1).padStart(2,'0')}/${String(total).padStart(2,'0')} · ${({up:'↑ Up',down:'↓ Down',left:'← Left',right:'→ Right'})[direction]||direction}`}
function briefTrace(text,limit=180){const clean=String(text||'').replace(/[#*_`]/g,'').replace(/\s+/g,' ').trim();return clean.length>limit?`${clean.slice(0,limit-1).trim()}…`:clean}
function init(){runGeneration++;stop(true);resetLiveRun();selectedPiece=null;selectedTile=null;const l=level();if(type==='sokoban')state=parseGrid(l.map);else if(type==='maze')state=parseGrid(l.map);else if(type==='klotski')state={pieces:structuredClone(l.pieces),steps:0,solved:false};else state={n:l.n,art:l.art,steps:0,solved:false,pieces:shuffle([...Array(l.n*l.n)].map((_,i)=>i)),placed:{},reference:true,history:[]};$('#puzzle-kicker').textContent=l.kicker;$('#arena-name').textContent=`${current().label} · ${l.name}`;$('#mode-copy').textContent=type==='jigsaw'?'Virtual mouse / vision':'Structured logic';$('#game-caption').textContent=type==='sokoban'?'Arrow keys move the keeper. Every crate must land on a target.':type==='maze'?'Arrow keys navigate to the green exit.':type==='klotski'?'Click a numbered tile, then use arrows. Example: 1R.':'Select a tile, then a destination. Click a placed tile to remove it.';$('#undo-piece-button').hidden=type!=='jigsaw';$('#step-count').textContent='00';$('#push-count').textContent='00';$('#metric-two').textContent=type==='maze'?'cells explored':type==='jigsaw'?'pieces placed':type==='klotski'?'slides':'pushes';$('#run-status').textContent='READY';$('#command-value').textContent='—';log('BOARD READY',`${l.name} is loaded in the main workspace.`);renderBoard();renderCards()}
function shuffle(a){return a.sort(()=>Math.random()-.5)}
function renderBoard(){if(type==='sokoban'||type==='maze')renderGrid();if(type==='klotski')renderKlotski();if(type==='jigsaw')renderJigsaw()}
function renderGrid(){const rows=state.base.length,cols=state.base[0].length,goals=new Set((type==='sokoban'?state.goals:[state.goal]).map(p=>pos(...p))),crates=new Set((state.crates||[]).map(p=>pos(...p)));$('#game-stage').innerHTML=`<div class="grid-board" style="--cols:${cols};--rows:${rows}">${state.base.map((r,y)=>r.map((c,x)=>{let k=pos(x,y),g=goals.has(k);return`<div class="grid-cell ${c==='#'?'wall':''} ${g?'goal':''}">${crates.has(k)?`<i class="crate ${g?'good':''}"></i>`:''}${k===pos(...state.player)?`<i class="${type==='maze'?'maze-player':'player'}"></i>`:''}${type==='maze'&&g?'<i class="maze-goal"></i>':''}</div>`}).join('')).join('')}</div>`}
function wall(s,x,y){return y<0||y>=s.base.length||x<0||x>=s.base[0].length||s.base[y][x]==='#'}function crate(s,x,y){return s.crates.findIndex(c=>c[0]===x&&c[1]===y)}
function move(dir,agent=false){if(state.solved||(isRunning&&!agent)||type==='jigsaw'||type==='klotski')return false;let [dx,dy]=dirs[dir],[x,y]=state.player,nx=x+dx,ny=y+dy;if(wall(state,nx,ny)){if(!agent)log('REJECTED','Wall blocks that action.');return false}if(type==='sokoban'){let ci=crate(state,nx,ny);if(ci>=0){let bx=nx+dx,by=ny+dy;if(wall(state,bx,by)||crate(state,bx,by)>=0){if(!agent)log('REJECTED','The crate cannot be pushed there.');return false}state.crates[ci]=[bx,by];state.pushes++}}state.player=[nx,ny];state.steps++;$('#step-count').textContent=String(state.steps).padStart(2,'0');$('#push-count').textContent=String(state.pushes||state.steps).padStart(2,'0');$('#command-value').textContent=dir[0].toUpperCase();renderGrid();if(!agent)log('MANUAL ACTION',`Moved ${dir}.`,'action');let done=type==='maze'?pos(...state.player)===pos(...state.goal):state.goals.every(g=>crate(state,...g)>=0);if(done)complete();return true}
function renderKlotski(){$('#game-stage').innerHTML=`<div class="klotski-board"><span class="exit">»</span>${state.pieces.map(p=>`<button class="k-piece ${p.target?'target':''} ${selectedPiece===p.id?'selected':''}" data-k="${p.id}" style="--x:${p.x};--y:${p.y};--w:${p.w};--h:${p.h}">${p.id}</button>`).join('')}</div>`;$$('[data-k]').forEach(b=>b.onclick=()=>{selectedPiece=b.dataset.k;renderKlotski();log('SELECTION',`Selected box ${selectedPiece}.`)} )}
function moveK(dir,agent=false){let p=state.pieces.find(x=>x.id===selectedPiece)||state.pieces.find(x=>x.target);let horizontal=p.w>p.h;if(horizontal&&['up','down'].includes(dir)||!horizontal&&['left','right'].includes(dir)){if(!agent)log('REJECTED',`Box ${p.id} only moves on its long axis.`);return false}let[dx,dy]=dirs[dir],nx=p.x+dx,ny=p.y+dy;if(p.target&&dir==='right'&&p.y===2&&p.x===3){state.steps++;complete();return true}let taken=new Set();state.pieces.filter(q=>q!==p).forEach(q=>{for(let y=q.y;y<q.y+q.h;y++)for(let x=q.x;x<q.x+q.w;x++)taken.add(pos(x,y))});for(let y=ny;y<ny+p.h;y++)for(let x=nx;x<nx+p.w;x++)if(x<0||x>4||y<0||y>4||taken.has(pos(x,y))){if(!agent)log('REJECTED',`Command ${p.id}${dir[0].toUpperCase()} is blocked.`);return false}p.x=nx;p.y=ny;state.steps++;$('#step-count').textContent=String(state.steps).padStart(2,'0');$('#command-value').textContent=`${p.id}${dir[0].toUpperCase()}`;renderKlotski();if(!agent)log('COMMAND',`Applied ${p.id}${dir[0].toUpperCase()}.`,'action');return true}
function artStyle(i){let n=state.n,x=i%n,y=Math.floor(i/n);return`--art:${state.art};--n:${n};--x:${x};--y:${y}`}
function renderJigsaw(){let n=state.n;let placed=Object.entries(state.placed);$('#game-stage').innerHTML=`<div class="jigsaw-wrap ${state.reference?'':'hidden-ref'}"><div class="jigsaw-board" style="--n:${n}">${[...Array(n*n)].map((_,slot)=>{let piece=state.placed[slot],occupied=piece!==undefined;return`<button aria-label="${occupied?`Remove tile ${piece+1} from board cell ${slot+1}`:`Board cell ${slot+1}`}" class="j-slot ${occupied?'placed':''}" data-slot="${slot}" ${occupied?`style="${artStyle(piece)}"`:''}></button>`}).join('')}</div><div><div class="reference" style="background:${state.art}"></div><div class="ref-label">reference${state.reference?'':' hidden'}</div><div class="j-tray">${state.pieces.filter(i=>!placed.some(([,p])=>+p===i)).map(i=>`<button aria-label="Jigsaw tile ${i+1}" class="j-piece ${selectedTile===i?'selected':''}" data-tile="${i}" style="${artStyle(i)}"></button>`).join('')}</div></div></div>`;$$('[data-tile]').forEach(b=>b.onclick=()=>{selectedTile=+b.dataset.tile;renderJigsaw();log('TILE SELECTED',`Tile ${selectedTile+1} is ready to place.`)});$$('[data-slot]').forEach(b=>b.onclick=()=>placeTile(+b.dataset.slot))}
function saveJigsawHistory(){state.history.push(structuredClone(state.placed));if(state.history.length>50)state.history.shift()}
function syncJigsawMetrics(){const placed=Object.keys(state.placed).length;$('#step-count').textContent=String(state.steps).padStart(2,'0');$('#push-count').textContent=String(placed).padStart(2,'0')}
function removeTile(slot){let piece=state.placed[slot];if(piece===undefined)return;saveJigsawHistory();delete state.placed[slot];selectedTile=null;$('#command-value').textContent=`REMOVE ${slot+1}`;syncJigsawMetrics();log('TILE REMOVED',`Tile ${piece+1} returned to the tray from cell ${slot+1}.`,'action');renderJigsaw();toast('Tile returned to the tray.')}
function undoJigsaw(){if(type!=='jigsaw'||!state.history.length){toast('Nothing to undo yet.');return}state.placed=state.history.pop();selectedTile=null;$('#command-value').textContent='UNDO';syncJigsawMetrics();log('UNDO',`Restored the previous jigsaw arrangement.`,'action');renderJigsaw()}
function placeTile(slot){if(state.placed[slot]!==undefined){removeTile(slot);return}if(selectedTile===undefined||selectedTile===null){toast('Select a tile first.');return}saveJigsawHistory();state.placed[slot]=selectedTile;state.steps++;syncJigsawMetrics();$('#command-value').textContent=`CLICK ${slot+1}`;log('TILE PLACED',`Tile ${selectedTile+1} placed in cell ${slot+1}.`,'action');selectedTile=null;renderJigsaw();if(Object.keys(state.placed).length===state.n*state.n&&Object.entries(state.placed).every(([s,p])=>+s===+p))complete()}
function encode(s){return`${s.player.join(',')}|${s.crates.map(c=>c.join(',')).sort().join(';')}`}
function solveSoko(initial){let q=[structuredClone(initial)],seen=new Set([encode(initial)]),count=0;while(q.length&&count++<70000){let s=q.shift();if(s.goals.every(g=>crate(s,...g)>=0))return s.path||[];for(let[d,[dx,dy]]of Object.entries(dirs)){let n=structuredClone(s),[x,y]=n.player,nx=x+dx,ny=y+dy;if(wall(n,nx,ny))continue;let ci=crate(n,nx,ny);if(ci>=0){let bx=nx+dx,by=ny+dy;if(wall(n,bx,by)||crate(n,bx,by)>=0)continue;n.crates[ci]=[bx,by]}n.player=[nx,ny];n.path=[...(s.path||[]),d];let k=encode(n);if(!seen.has(k)){seen.add(k);q.push(n)}}}return null}
function solveMaze(initial){let q=[{p:initial.player,path:[]}],seen=new Set([pos(...initial.player)]);while(q.length){let z=q.shift();if(pos(...z.p)===pos(...initial.goal))return z.path;for(let[d,[dx,dy]]of Object.entries(dirs)){let n=[z.p[0]+dx,z.p[1]+dy],k=pos(...n);if(!wall(initial,...n)&&!seen.has(k)){seen.add(k);q.push({p:n,path:[...z.path,d]})}}}return null}
function run(){
  if(isRunning||state.solved)return;
  if(type==='klotski'){toast('Klotski is ready for numbered commands; its visual agent is the next harness.');log('HARNESS','Use number + direction commands such as 1R.');return}
  if(type==='jigsaw'){
    if(!state.reference){toast('A vision-only run needs a board-observation tool before it can place tiles.');log('VISION MODE','Reference withheld; no placement was guessed.','report');return}
    let open=[...Array(state.n*state.n)].filter(i=>state.placed[i]===undefined);isRunning=true;$('#run-status').textContent='RUNNING';beginLiveRun('Local visual agent is assembling the board.','Matching reference tiles to their destination cells.');
    let i=0;const tick=()=>{if(!isRunning)return;if(i>=open.length){isRunning=false;finishLiveRun('Visual assembly complete.','All available tiles were placed.');return}selectedTile=open[i];placeTile(open[i]);updateLiveRun('Local visual agent is assembling the board.',`Placing tile ${i+1} of ${open.length}.`,`Tile ${i+1} → cell ${open[i]+1}`);i++;timer=setTimeout(tick,180)};tick();return;
  }
  beginLiveRun('Local planner is mapping the board.','Searching only legal moves and crate pushes.');
  let plan=type==='sokoban'?solveSoko(structuredClone(state)):solveMaze(structuredClone(state));
  if(!plan){finishLiveRun('No safe route was found.','The board was left unchanged.');toast('No valid plan found from this board.');log('RESULT','Local search found no safe route.','report');return}
  if(strategyChoice==='explore')delegate(plan);
  isRunning=true;$('#run-status').textContent='RUNNING';log('PLAN VERIFIED',`Local planner verified a ${plan.length}-move route.`,'report');updateLiveRun('Route verified.','The board will now animate one validated move at a time.',`${plan.length} safe moves queued`);
  let i=0;const tick=()=>{if(!isRunning)return;if(i>=plan.length){isRunning=false;finishLiveRun('Route finished.','All verified moves have been applied.');return}let action=plan[i];move(action,true);let message=friendlyAction(action,i,plan.length);log('EXECUTING',message,'action');updateLiveRun('Executing verified route.',message,message);i++;if(!state.solved)timer=setTimeout(tick,240)};timer=setTimeout(tick,360)
}
function delegate(plan){let a=spawn(true),b=spawn(true);a.status='reported';b.status='reported';log('DELEGATION',`${a.name} rejected a risky path. ${b.name} verified the ${plan.length}-move route.`,'report')}
function spawn(silent=false){let n=workspaces.length,w={id:`explorer-${Date.now()}-${n}`,name:`Explorer ${n}`,status:'ready',parent:'Private snapshot'};workspaces.push(w);$('#agent-count').textContent=workspaces.length;if(!silent){toast(`${w.name} has a private board snapshot.`);log('SPAWN',`${w.name} is exploring independently.`,'report')}return w}
function stop(silent=false){clearTimeout(timer);if(isRunning&&!silent){log('RUN CONTROL','Run paused before the next move.');$('#run-status').textContent='STOPPED';finishLiveRun('Run paused.','The board remains exactly where it was.')}isRunning=false}
function complete(){state.solved=true;stop(true);$('#run-status').textContent='SOLVED';log('RESULT',`Solved ${level().name} in the main workspace.`,'report');finishLiveRun('Puzzle solved.','Every goal is occupied; the final board is preserved.');toast('Puzzle solved ✦')}
function renderCards(){$('#puzzle-cards').innerHTML=Object.entries(puzzles).map(([id,p])=>`<button class="puzzle-card ${id===type?'active':''}" data-card="${id}"><p class="kicker">${p.levels.length} CHALLENGES</p><h3>${p.label}</h3><p>${p.description}</p><b>↗</b></button>`).join('');$$('[data-card]').forEach(b=>b.onclick=()=>{type=b.dataset.card;levelId=puzzles[type].levels[0].id;init()})}
function openDrawer(kind){let t=$(`#${kind}-template`);$('#drawer-content').innerHTML='';$('#drawer-content').append(t.content.cloneNode(true));$('#drawer-kicker').textContent=kind==='api'?'LOCAL CONFIGURATION':kind==='trace'?'RUN HISTORY':kind==='puzzles'?'PUZZLE LIBRARY':kind==='workspace'?'AGENT WORKSPACES':'AGENT CONTROL';$('#drawer').classList.add('show');$('#scrim').classList.add('show');renderDrawerContent(kind)}
function renderDrawerContent(kind){
  kind=kind||($('#drawer-kicker').textContent.includes('WORKSPACE')?'workspace':$('#drawer-kicker').textContent.includes('CONFIG')?'api':$('#drawer-kicker').textContent.includes('HISTORY')?'trace':$('#drawer-kicker').textContent.includes('LIBRARY')?'puzzles':'agents');
  if(kind==='agents'){
    $('#model-select').value=modelChoice;
    $('#model-select').onchange=e=>modelChoice=e.target.value;
    $('#run-from-drawer').onclick=run;
    $('#toggle-reference').onclick=()=>{if(type!=='jigsaw'){toast('Reference mode is available in Jigsaw.');return}state.reference=!state.reference;renderBoard();log('VISION MODE',state.reference?'Reference image provided to the agent.':'Reference image withheld from the agent.');};
    $('#spawn-agent').onclick=()=>{spawn();renderDrawerContent('agents')};
    $('#agent-list').innerHTML=workspaces.map(w=>`<div class="agent-item"><div><b>${w.name}</b><small>${w.parent}</small></div><small>${w.status}</small></div>`).join('');
    $('#trace-list').innerHTML=trace.slice(0,5).map(t=>`<div class="trace-item ${t.kind}"><b>${t.label}</b><small>${briefTrace(t.text)}</small></div>`).join('');
  }
  if(kind==='workspace'){
    $('#workspace-list').innerHTML=workspaces.map(w=>`<button class="workspace-item ${w.id===activeWorkspace?'active':''}" data-w="${w.id}"><span><b>${w.name}</b><small>${w.parent}</small></span><span>${w.status}</span></button>`).join('');
    $$('[data-w]').forEach(b=>b.onclick=()=>{activeWorkspace=b.dataset.w;$('#active-workspace').textContent=workspaces.find(w=>w.id===activeWorkspace).name;renderDrawerContent('workspace')});
  }
  if(kind==='trace')$('#full-trace').innerHTML=trace.map(t=>`<div class="trace-item ${t.kind}"><b>${t.label}</b><small>${briefTrace(t.text,420)}</small></div>`).join('');
  if(kind==='puzzles'){
    pickerType=pickerType in puzzles?pickerType:type;
    const renderPicker=()=>{const family=puzzles[pickerType],selected=family.levels.find(l=>l.id===$('#drawer-level-select').value)||family.levels[0];$('#puzzle-family-tabs').innerHTML=Object.entries(puzzles).map(([id,p])=>`<button class="puzzle-family-tab ${id===pickerType?'active':''}" data-family="${id}">${p.label} <small>${p.levels.length}</small></button>`).join('');$('#drawer-level-select').innerHTML=family.levels.map((l,index)=>`<option value="${l.id}" ${l.id===(pickerType===type?levelId:family.levels[0].id)?'selected':''}>${String(index+1).padStart(2,'0')} · ${l.name}</option>`).join('');const updateCard=()=>{const l=family.levels.find(x=>x.id===$('#drawer-level-select').value);$('#selected-level-card').innerHTML=`<b>${family.label} · ${l.name}</b><small>${l.kicker} · ${family.description}</small>`};updateCard();$$('[data-family]').forEach(b=>b.onclick=()=>{pickerType=b.dataset.family;renderPicker()});$('#drawer-level-select').onchange=updateCard;$('#load-selected-level').onclick=()=>{type=pickerType;levelId=$('#drawer-level-select').value;closeDrawer();init()}};
    renderPicker();
  }
  if(kind==='api'){
    fetch('/api/config').then(r=>r.json()).then(c=>{if(c.openai)$('#openai-key-status').classList.add('configured');if(c.anthropic)$('#anthropic-key-status').classList.add('configured')}).catch(()=>{});
    const verify=(provider)=>async()=>{const output=$(`#${provider}-test-result`);output.className='';output.textContent='Checking locally…';try{const response=await fetch('/api/test-provider',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider})});const result=await response.json();output.classList.add(result.ok?'good':'bad');output.textContent=result.ok?`Verified with ${result.model||provider}.`:result.error||'Provider check failed.'}catch{output.classList.add('bad');output.textContent='Could not reach the local server.'}};
    $('#test-openai').onclick=verify('openai');$('#test-anthropic').onclick=verify('anthropic');
  }
}
function closeDrawer(){$('#drawer').classList.remove('show');$('#scrim').classList.remove('show')}
$('#agents-tab').onclick=()=>openDrawer('agents');$('#workspace-tab').onclick=()=>openDrawer('workspace');$('#api-tab').onclick=()=>openDrawer('api');$('#trace-button').onclick=()=>openDrawer('trace');$$('[data-open-palette]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.openPalette));$$('[data-close]').forEach(b=>b.onclick=closeDrawer);$('#run-button').onclick=run;$('#reset-button').onclick=init;document.addEventListener('keydown',e=>{if(!dirs[e.key.replace('Arrow','').toLowerCase()])return;e.preventDefault();let d=e.key.replace('Arrow','').toLowerCase();if(type==='klotski')moveK(d);else move(d)});init();
$('#level-button').onclick=()=>openDrawer('puzzles');

const localRun = run;
async function playLiveActions(actions,source='Agent',generation=runGeneration){
  isRunning=true; $('#run-status').textContent='RUNNING';
  for(let index=0;index<actions.length;index++){
    if(!isRunning||generation!==runGeneration)break;
    const action=actions[index];let message;
    if(type==='sokoban'||type==='maze'){move(action,true);message=friendlyAction(action,index,actions.length)}
    else if(type==='jigsaw'){selectedTile=action.tile;placeTile(action.slot);message=`Tile ${action.tile+1} → board cell ${action.slot+1}`}
    log('EXECUTING',message,'action');
    updateLiveRun(`${source} is applying the verified route.`,message,message);
    await new Promise(resolve=>setTimeout(resolve,280));
  }
  isRunning=false;
  if(generation===runGeneration&&!state.solved)finishLiveRun(`${source} finished its action sequence.`,`${actions.length} validated steps were applied.`);
}
run = async function(){
  const generation=runGeneration;
  let nudge;
  if(modelChoice==='local')return localRun();
  if(modelChoice==='openai'){
    beginLiveRun('Checking the local OpenAI configuration.','The browser never sees the key; this asks only the local server.');
    try{const response=await fetch('/api/test-provider',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider:'openai'})});const result=await response.json();if(!result.ok)throw new Error(result.error||'OpenAI rejected the configured key.');finishLiveRun('OpenAI key accepted.','The OpenAI puzzle harness is the next provider adapter to connect.');toast('OpenAI key accepted; the puzzle runner is not connected yet.')}catch(error){finishLiveRun('OpenAI configuration needs attention.','The key was rejected before any puzzle request was made.');toast(error.message)}return;
  }
  if(modelChoice!=='claude'){toast('Choose Local Solver, Claude, or configure an adapter.');return;}
  try{
    isRunning=true; $('#run-status').textContent='THINKING';beginLiveRun(type==='jigsaw'?'Claude is reviewing the visual reference.':'Claude main agent is surveying the board.',type==='jigsaw'?'Cataloguing visible regions before any virtual placement.':'Opening a private workspace and checking the puzzle state.');
    nudge=setTimeout(()=>updateLiveRun(type==='jigsaw'?'Claude is matching visual regions.':'Claude is comparing safe paths.',type==='jigsaw'?'Comparing the reference with the controlled tile map.':'The main agent may ask an explorer and deterministic planner for confirmation.',type==='jigsaw'?'Visual region check':'Explorer / planner check'),1400);
    if(type==='sokoban'){
      const response=await fetch('/api/agent/sokoban',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({map:level().map,task:'Solve this puzzle as a team. Inspect the board, use an explorer when useful, write a concise private helper artifact, ask the sandbox solver to verify a route, then execute only verified moves. Give short public status reports, never hidden reasoning.'})});
      clearTimeout(nudge);
      const result=await response.json(); if(generation!==runGeneration)return;if(!result.ok)throw new Error(result.error||'Agent run failed');
      const usedExplorer=result.explorers?.length||0;
      if(usedExplorer)result.explorers.forEach(x=>{const w=spawn(true);w.name=x.name;w.status='reported';w.parent='Frozen board snapshot';log('EXPLORER REPORT',`${x.name} checked board risks and returned a concise strategy report.`,'report')});
      if(result.traces?.some(t=>t.label==='WORKSPACE'))log('WORKSPACE NOTE','The main agent saved a private helper artifact for this run.','report');
      log('PLAN VERIFIED',`Sandbox planner verified ${result.actions.length} legal moves${usedExplorer?` after ${usedExplorer} explorer report${usedExplorer===1?'':'s'}`:''}.`,'report');
      updateLiveRun('Claude has a verified route.','Every move was checked against the canonical board before animation.',`${result.actions.length} safe moves queued`);
      await playLiveActions(result.actions,'Claude',generation); return;
    }
    if(type==='jigsaw'){
      const response=await fetch('/api/agent/jigsaw',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pieces:state.n*state.n,reference:state.reference})});
      clearTimeout(nudge);
      const result=await response.json(); if(generation!==runGeneration)return;if(!result.ok)throw new Error(result.error||'Visual agent run failed');
      log('VISION REPORT',state.reference?'Claude catalogued visible regions of the supplied reference image.':'Reference withheld; Claude created a cautious exploration plan without guessing.','report');
      if(!result.actions.length){isRunning=false;$('#run-status').textContent='READY';finishLiveRun('Visual exploration paused.','No tile was placed because no visual board observation was supplied.');toast('No placement was guessed without a reference.');return;}
      updateLiveRun('Claude mapped the jigsaw reference.','Animating the virtual tile placements.',`${result.actions.length} tile placements queued`);
      await playLiveActions(result.actions,'Claude',generation); return;
    }
    clearTimeout(nudge);isRunning=false;toast('Live Claude runner is currently available for Sokoban and Jigsaw.'); $('#run-status').textContent='READY';finishLiveRun('This environment is not connected yet.','Choose Sokoban or Jigsaw for a live model run.');
  }catch(error){if(generation!==runGeneration)return;clearTimeout(nudge);isRunning=false;$('#run-status').textContent='ERROR';finishLiveRun('The live run could not start.',error.message);toast(error.message);log('RUN ERROR',error.message,'report');}
};
$('#run-button').onclick=run;
$('#undo-piece-button').onclick=undoJigsaw;
