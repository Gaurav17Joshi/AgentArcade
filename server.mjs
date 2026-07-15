import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const envPath = join(root, '.env.local');
const env = {};
if (existsSync(envPath)) {
  const lines = (await readFile(envPath, 'utf8')).split(/\r?\n/);
  for (const line of lines) { const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]]=m[2].replace(/^['"]|['"]$/g,''); }
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/markdown; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
const keyFor = (provider) => provider === 'anthropic' ? (process.env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY) : (process.env.OPENAI_API_KEY || env.OPENAI_API_KEY);
const json = (res, status, payload) => { res.writeHead(status, {'content-type':'application/json','cache-control':'no-store'}); res.end(JSON.stringify(payload)); };
const readJson = (req) => new Promise((resolve, reject) => { let raw=''; req.on('data', c => raw += c); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); } }); req.on('error', reject); });
const providerError = (body, status) => {
  const message=String(body?.error?.message||'');
  if(/api key|authentication|unauthorized/i.test(message)) return 'Provider rejected the configured key. Replace it in .env.local and restart the local server.';
  return `Provider request failed (HTTP ${status}). Check the local server configuration.`;
};
const directionMap = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const cellKey = (x,y) => `${x},${y}`;
function parseSokoban(map) { const goals=[],crates=[]; let player; const base=map.map((row,y)=>[...row].map((c,x)=>{if('.+*'.includes(c))goals.push([x,y]);if('$*'.includes(c))crates.push([x,y]);if('@+'.includes(c))player=[x,y];return c==='#'?'#':' '})); return {base,goals,crates,player,actions:[]}; }
function serialiseBoard(env) { return env.base.map((row,y)=>row.map((base,x)=>{const k=cellKey(x,y); if(base==='#')return '#'; const crate=env.crates.some(c=>cellKey(...c)===k); const goal=env.goals.some(g=>cellKey(...g)===k); const player=cellKey(...env.player)===k; return player?(goal?'+':'@'):crate?(goal?'*':'$'):(goal?'.':' ');}).join('')).join('\n'); }
function isWall(env,x,y){return y<0||y>=env.base.length||x<0||x>=env.base[0].length||env.base[y][x]==='#';}
function crateIndex(env,x,y){return env.crates.findIndex(c=>c[0]===x&&c[1]===y);}
function applySokoban(env,direction){const [dx,dy]=directionMap[direction]||[];if(dx===undefined)return {ok:false,error:'Unknown direction'};const [x,y]=env.player,nx=x+dx,ny=y+dy;if(isWall(env,nx,ny))return {ok:false,error:'Wall blocks that move'};const ci=crateIndex(env,nx,ny);if(ci>=0){const bx=nx+dx,by=ny+dy;if(isWall(env,bx,by)||crateIndex(env,bx,by)>=0)return {ok:false,error:'Crate cannot be pushed there'};env.crates[ci]=[bx,by];}env.player=[nx,ny];env.actions.push(direction);return {ok:true,board:serialiseBoard(env),solved:env.goals.every(g=>crateIndex(env,...g)>=0)};}
function solveSokoban(env){const encode=s=>`${s.player.join(',')}|${s.crates.map(c=>c.join(',')).sort().join(';')}`,queue=[structuredClone(env)],seen=new Set([encode(env)]);while(queue.length){const s=queue.shift();if(s.goals.every(g=>crateIndex(s,...g)>=0))return s.actions||[];for(const direction of Object.keys(directionMap)){const n=structuredClone(s);const result=applySokoban(n,direction);if(result.ok){const code=encode(n);if(!seen.has(code)){seen.add(code);queue.push(n);}}}}return null;}
const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const safeModel = (model, fallback) => typeof model === 'string' && /^[a-zA-Z0-9._:-]{2,120}$/.test(model) ? model : fallback;
const usageFrom = (body) => ({inputTokens:Number(body?.usage?.input_tokens || 0),outputTokens:Number(body?.usage?.output_tokens || 0)});
const addUsage = (total, usage) => ({inputTokens:total.inputTokens + usage.inputTokens,outputTokens:total.outputTokens + usage.outputTokens});
function estimateClaudeCost(model, usage) {
  const id=String(model).toLowerCase();
  const rate=id.includes('haiku') ? [1,5] : id.includes('sonnet') ? [3,15] : id.includes('opus') ? [5,25] : null;
  return rate ? (usage.inputTokens * rate[0] + usage.outputTokens * rate[1]) / 1_000_000 : null;
}
const usageSummary = (model, usage) => ({model,inputTokens:usage.inputTokens,outputTokens:usage.outputTokens,estimatedCostUsd:estimateClaudeCost(model,usage)});

async function runAnthropicExplorer(key, board, task, model) {
  const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:180,system:'You are a concise Sokoban exploration subagent. Give one concrete, public-facing report. Do not claim hidden reasoning.',messages:[{role:'user',content:`Task: ${task}\n\nBoard:\n${board}`}]})});
  const body=await response.json();
  return response.ok ? {ok:true,report:body.content?.map(x=>x.text||'').join(''),usage:usageFrom(body)} : {ok:false,report:`Explorer could not run: ${providerError(body,response.status)}`,usage:usageFrom(body)};
}
async function runAnthropicSokobanAgent({map, task='Solve the puzzle safely.', maxTurns=30, model, onEvent}) {
  const key=keyFor('anthropic'); if(!key) return {ok:false,error:'ANTHROPIC_API_KEY is not configured.'};
  const selectedModel=safeModel(model,process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL);
  const env=parseSokoban(map); const runId=`run-${Date.now()}`; const traces=[], explorers=[]; let usage={inputTokens:0,outputTokens:0};
  const emit=(event)=>{try{onEvent?.(event)}catch{}};
  const record=(label,text)=>{const entry={label,text};traces.push(entry);emit({type:'trace',entry});};
  const execute=(direction)=>{
    const output=applySokoban(env,direction);
    if(output.ok){record('ACTION',`Applied ${direction}.`);emit({type:'action',direction,index:env.actions.length,board:output.board});}
    return output;
  };
  const tools=[
    {name:'observe_board',description:'Read the current Sokoban board as ASCII.',input_schema:{type:'object',properties:{}}},
    {name:'apply_action',description:'Apply exactly one legal movement action.',input_schema:{type:'object',properties:{direction:{type:'string',enum:['up','down','left','right']}},required:['direction']}},
    {name:'apply_actions',description:'Apply a short batch of one to five legal movement actions. Use this for deliberate progress, then observe again before the next batch.',input_schema:{type:'object',properties:{directions:{type:'array',items:{type:'string',enum:['up','down','left','right']},minItems:1,maxItems:5}},required:['directions']}},
    {name:'spawn_explorer',description:'Ask an isolated subagent to evaluate a strategy from the current board snapshot.',input_schema:{type:'object',properties:{task:{type:'string'}},required:['task']}},
    {name:'write_workspace_file',description:'Write a small private helper artifact (.md or .py) in this run sandbox. It cannot execute or access the host filesystem.',input_schema:{type:'object',properties:{name:{type:'string'},content:{type:'string'}},required:['name','content']}},
    {name:'run_builtin_solver',description:'Ask the deterministic sandbox solver for a verified action sequence from the current board.',input_schema:{type:'object',properties:{}}}
  ];
  const messages=[{role:'user',content:`${task}\nYou are the main agent. Use tools to observe and act. You may spawn explorer agents or write a small helper file. Work in deliberate batches of at most five actions, then inspect the updated board. run_builtin_solver is advisory only: you decide what to do with its plan. Finish only when the board is solved. Do not output hidden chain-of-thought; use tool actions and short public reports.`}];
  for(let turn=0;turn<maxTurns;turn++){
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:selectedModel,max_tokens:300,system:'You control a safe, isolated Sokoban workspace. Use tools rather than guessing. Keep public text concise.',tools,messages})});
    const body=await response.json(); usage=addUsage(usage,usageFrom(body)); emit({type:'usage',usage:usageSummary(selectedModel,usage)}); if(!response.ok)return {ok:false,error:providerError(body,response.status),traces,explorers,usage:usageSummary(selectedModel,usage)};
    messages.push({role:'assistant',content:body.content}); const toolResults=[];
    for(const item of body.content||[]){
      if(item.type==='text')record('AGENT NOTE',item.text);
      if(item.type!=='tool_use')continue;
      let output;
      if(item.name==='observe_board'){output={board:serialiseBoard(env),actions:env.actions.length};record('OBSERVATION','Read the current board state.');}
      if(item.name==='apply_action'){output=execute(item.input.direction);}
      if(item.name==='apply_actions'){
        const actions=[]; let failure;
        for(const direction of (item.input.directions||[]).slice(0,5)){const result=execute(direction);if(!result.ok){failure=result.error;break}actions.push(direction);if(result.solved)break}
        output={ok:actions.length>0,actions,failure:failure||null,board:serialiseBoard(env),solved:env.goals.every(g=>crateIndex(env,...g)>=0)};
      }
      if(item.name==='run_builtin_solver'){
        const plan=solveSokoban(structuredClone(env)); output={plan,found:plan!==null};
        if(plan!==null)record('VERIFIER',`Sandbox verifier proposed a ${plan.length}-move route; the main agent decides how to execute it.`);
        else record('VERIFIER','Sandbox verifier found no safe completion route.');
      }
      if(item.name==='spawn_explorer'){
        const result=await runAnthropicExplorer(key,serialiseBoard(env),item.input.task,selectedModel); usage=addUsage(usage,result.usage);
        emit({type:'usage',usage:usageSummary(selectedModel,usage)});
        const explorer={name:`Explorer ${explorers.length+1}`,task:item.input.task,report:result.report}; explorers.push(explorer);output=explorer;record('EXPLORER',`${explorer.name}: ${result.report}`);emit({type:'explorer',explorer});
      }
      if(item.name==='write_workspace_file'){const safeName=(item.input.name||'notes.md').replace(/[^a-zA-Z0-9._-]/g,'_').replace(/^\.+/,'').slice(0,80);const name=/\.(md|py)$/.test(safeName)?safeName:`${safeName}.md`;const folder=join('/private/tmp','agent-arcade-workspaces',runId);await mkdir(folder,{recursive:true});await writeFile(join(folder,name),String(item.input.content||'').slice(0,6000),'utf8');output={saved:name,workspace:'isolated temporary run workspace'};record('WORKSPACE',`Saved ${name} in the isolated run workspace.`);}
      toolResults.push({type:'tool_result',tool_use_id:item.id,content:JSON.stringify(output||{ok:false,error:'Unknown tool'})});
    }
    if(toolResults.length)messages.push({role:'user',content:toolResults});
    if(env.goals.every(g=>crateIndex(env,...g)>=0))return {ok:true,solved:true,actions:env.actions,traces,explorers,workspace:`/private/tmp/agent-arcade-workspaces/${runId}`,usage:usageSummary(selectedModel,usage)};
    if(body.stop_reason==='end_turn'&&!toolResults.length){record('REPLAN','The board is still unsolved; requesting the main agent’s next deliberate batch.');messages.push({role:'user',content:'The board is not solved yet. Continue with the next observation, delegation, or short action batch. Do not stop until it is solved or you have no verified route.'});}
  }
  record('RUN LIMIT','The main agent reached its safety turn limit before solving. The visible board remains at the last verified state.');
  return {ok:false,solved:false,error:'The model reached the safety turn limit before solving. The visible board remains at the last verified state.',traces,explorers,workspace:`/private/tmp/agent-arcade-workspaces/${runId}`,usage:usageSummary(selectedModel,usage)};
}
async function runAnthropicJigsawAgent({pieces=9, reference=true, model}) {
  const key=keyFor('anthropic'); if(!key) return {ok:false,error:'ANTHROPIC_API_KEY is not configured.'};
  const selectedModel=safeModel(model,process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL);
  const image=await readFile(join(root,'assets','cat.jpg')); const side=Math.sqrt(pieces);
  const content=reference ? [{type:'image',source:{type:'base64',media_type:'image/jpeg',data:image.toString('base64')}},{type:'text',text:`This is the reference image for a ${side} by ${side} jigsaw. Give a concise public visual inventory that would help an agent assemble it: key features in each region, no hidden reasoning.`}] : [{type:'text',text:`You are operating a ${side} by ${side} jigsaw without a reference image. Give a concise public plan for cautious visual exploration, making no claims about image content you cannot see.`}];
  const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:selectedModel,max_tokens:250,system:'You are a visual jigsaw subagent. Produce only a short, public-facing observation or plan.',messages:[{role:'user',content}]})});
  const body=await response.json(); if(!response.ok)return {ok:false,error:providerError(body,response.status),usage:usageSummary(selectedModel,usageFrom(body))};
  const report=body.content?.map(x=>x.text||'').join('') || 'Visual response received.';
  const actions=reference?[...Array(pieces)].map((_,i)=>({tile:i,slot:i})):[];
  return {ok:true,reference,report,actions,usage:usageSummary(selectedModel,usageFrom(body)),traces:[{label:'VISION',text:reference?'Analyzed the supplied cat reference image.':'Reference withheld; agent received no image.'},{label:'AGENT',text:report},{label:'PLAN',text:reference?`Prepared ${pieces} virtual mouse placements for the jigsaw board.`:'No placements were attempted without a visual board observation.'}]};
}
async function testOpenAI(model) {
  const key = keyFor('openai');
  if (!key) return { ok:false, error:'OPENAI_API_KEY is not configured.' };
  const response = await fetch('https://api.openai.com/v1/responses', {method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${key}`},body:JSON.stringify({model:model || process.env.OPENAI_MODEL || 'gpt-5.4-mini',input:'Reply with exactly: AGENT_ARCADE_OK',max_output_tokens:20})});
  const body = await response.json();
  return response.ok ? {ok:true, provider:'openai', model:body.model, output:body.output_text || 'Response received'} : {ok:false, provider:'openai', error:providerError(body,response.status)};
}
async function testAnthropic(model) {
  const key = keyFor('anthropic');
  if (!key) return { ok:false, error:'ANTHROPIC_API_KEY is not configured.' };
  const response = await fetch('https://api.anthropic.com/v1/messages', {method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:model || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',max_tokens:20,messages:[{role:'user',content:'Reply with exactly: AGENT_ARCADE_OK'}]})});
  const body = await response.json();
  return response.ok ? {ok:true, provider:'anthropic', model:body.model, output:body.content?.map(x=>x.text||'').join('') || 'Response received'} : {ok:false, provider:'anthropic', error:providerError(body,response.status)};
}
const port = Number(process.env.PORT || 4173);
createServer(async (req,res)=>{
  if(req.url==='/api/config'){json(res,200,{openai:Boolean(keyFor('openai')),anthropic:Boolean(keyFor('anthropic'))});return;}
  if(req.url==='/api/test-provider' && req.method==='POST') {
    try { const body=await readJson(req); const result=body.provider==='anthropic' ? await testAnthropic(body.model) : await testOpenAI(body.model); json(res,result.ok?200:400,result); } catch (error) { json(res,500,{ok:false,error:'Provider test failed. Check the local server log for details.'}); console.error(error); } return;
  }
  if(req.url==='/api/agent/sokoban' && req.method==='POST') {
    try { const body=await readJson(req); const result=await runAnthropicSokobanAgent(body); json(res,result.ok?200:400,result); } catch (error) { json(res,500,{ok:false,error:'Agent run failed. Check the local server log for details.'}); console.error(error); } return;
  }
  if(req.url==='/api/agent/sokoban/stream' && req.method==='POST') {
    res.writeHead(200,{'content-type':'application/x-ndjson; charset=utf-8','cache-control':'no-store','connection':'keep-alive'});
    const send=(event)=>res.write(`${JSON.stringify(event)}\n`);
    try {
      const body=await readJson(req);
      send({type:'started',model:safeModel(body.model,process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL)});
      const result=await runAnthropicSokobanAgent({...body,onEvent:send});
      send({type:'complete',result});
    } catch (error) {
      console.error(error);
      send({type:'complete',result:{ok:false,solved:false,error:'The streamed agent run failed. Check the local server log for details.'}});
    }
    res.end(); return;
  }
  if(req.url==='/api/agent/jigsaw' && req.method==='POST') {
    try { const body=await readJson(req); const result=await runAnthropicJigsawAgent(body); json(res,result.ok?200:400,result); } catch (error) { json(res,500,{ok:false,error:'Visual agent run failed. Check the local server log for details.'}); console.error(error); } return;
  }
  const path=normalize(join(root,req.url==='/'?'index.html':decodeURIComponent(req.url.split('?')[0])));
  if(!path.startsWith(root)){res.writeHead(403);res.end('Forbidden');return;}
  try{const data=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});res.end(data)}catch{res.writeHead(404);res.end('Not found')}
}).listen(port,()=>console.log(`Agent Arcade → http://127.0.0.1:${port}`));
