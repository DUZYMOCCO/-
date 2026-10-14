import {createServer} from 'node:http';
import {createReadStream,statSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
export async function startQaServer(reference=null){
  const root=resolve('.'),types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.m4a':'audio/mp4','.aac':'audio/aac','.ogg':'audio/ogg','.woff2':'font/woff2'};
  const server=createServer((req,res)=>{
    try{
      let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path.endsWith('/'))path+='index.html';
      const original=resolve(root,'.'+path);if(!original.startsWith(root+sep)){res.writeHead(403).end();return;}
      const old=reference&&resolve(reference,'.'+path),file=old&&existsSync(old)?old:original;
      if(!statSync(file).isFile())throw new Error('not a file');res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});createReadStream(file).pipe(res);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
