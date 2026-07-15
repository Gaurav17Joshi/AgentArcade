import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
const port = Number(process.env.PORT || 4173);
createServer(async (req,res)=>{
  if(req.url==='/api/config'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({openai:Boolean(env.OPENAI_API_KEY),anthropic:Boolean(env.ANTHROPIC_API_KEY)}));return;}
  const path=normalize(join(root,req.url==='/'?'index.html':decodeURIComponent(req.url.split('?')[0])));
  if(!path.startsWith(root)){res.writeHead(403);res.end('Forbidden');return;}
  try{const data=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});res.end(data)}catch{res.writeHead(404);res.end('Not found')}
}).listen(port,()=>console.log(`Agent Arcade → http://127.0.0.1:${port}`));
