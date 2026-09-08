const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {createHash} = require('node:crypto');
const {meshArtifact,VERSION} = require('./mesh.cjs');
const {allowedHosts} = require('./access.cjs');
const {projects} = require('./catalog.cjs');
const {materialIcon} = require('./material-icons.cjs');
const {exportSchematic,exportManifest} = require('./schematic.cjs');
const {STYLE_VERSION,readThumbnail}=require('./thumbnails.cjs');
const {workspaceApi}=require('./workspace-api.cjs');
const port = Number(process.env.PREVIEW_PORT || 8091);
if(!Number.isInteger(port)||port<1024||port>65535) throw Error('Invalid PREVIEW_PORT');
const hosts=allowedHosts(port,process.env.PREVIEW_PUBLIC_ORIGIN);
const artifacts = new Map();
for(const project of projects) for(const {id:revision} of project.revisions) {
  const stem=project.id==='courtyard'?revision:`${project.id}-${revision}`;
  const file = path.join(__dirname,'generated',`${stem}.json`);
  if(!fs.existsSync(file)) throw Error('Run npm run compile with Java 21 before starting the viewer.');
  const bytes=fs.readFileSync(file);
  if(bytes.length>4*1024*1024) throw Error('Artifact too large');
  const artifact=JSON.parse(bytes);
  const {hash,...content}=artifact;
  if(createHash('sha256').update(JSON.stringify(content)).digest('hex')!==hash) throw Error('Artifact hash mismatch');
  if(artifact.plan_id!==project.planId||artifact.revision!==revision)throw Error('Artifact catalogue identity mismatch');
  artifacts.set(`${project.id}/${revision}`,artifact);
}
const iconNames=new Set([...artifacts.values()].flatMap(artifact=>artifact.blocks.map(block=>block.block.split('[')[0].replace('minecraft:',''))));
const icons=new Map();
const workspace=workspaceApi({artifacts,port});
const files = new Map([
  ['/plot-editor.js',['plot-editor.js','text/javascript']], ['/capture-controls.js',['capture-controls.js','text/javascript']],
  ['/studio-interface.js',['studio-interface.js','text/javascript']],
  ['/studio',['studio.html','text/html']], ['/studio.js',['studio.js','text/javascript']], ['/studio.css',['studio.css','text/css']],
  ['/', ['index.html','text/html']], ['/style.css',['style.css','text/css']],
  ['/app.js',['app.js','text/javascript']], ['/scene.js',['scene.js','text/javascript']],
  ['/review-state.js',['review-state.js','text/javascript']],
  ['/register-thumbnails.js',['register-thumbnails.js','text/javascript']],
  ['/thumbnail-render.html',['thumbnail-render.html','text/html']],
  ['/thumbnail-render.js',['thumbnail-render.js','text/javascript']],
  ['/material-icons.js',['material-icons.js','text/javascript']],
  ['/exports.js',['exports.js','text/javascript']], ['/viewer-tools.js',['viewer-tools.js','text/javascript']],
  ['/fonts/dm-sans-latin.woff2',['fonts/dm-sans-latin.woff2','font/woff2']],
  ['/fonts/urbanist-latin.woff2',['fonts/urbanist-latin.woff2','font/woff2']],
  ['/vendor/three/build/three.module.js',['node_modules/three/build/three.module.js','text/javascript']],
  ['/vendor/three/examples/jsm/controls/OrbitControls.js',['node_modules/three/examples/jsm/controls/OrbitControls.js','text/javascript']],
  ['/texture.png',[`node_modules/prismarine-viewer/public/textures/${VERSION}.png`,'image/png']],
]);
const meshes = new Map();
const server=http.createServer(async(req,res)=> {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if(!hosts.has(req.headers.host)) {res.writeHead(403);res.end('Host not allowed');return;}
  let requestURL;
  try{requestURL=new URL(req.url,`http://127.0.0.1:${port}`);}catch{res.writeHead(400);res.end('Invalid request URL');return;}
  if(await workspace.handle(req,res,requestURL))return;
  if(req.method!=='GET'&&req.method!=='HEAD') {res.writeHead(405);res.end('Read-only viewer');return;}
  try {
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    const thumbnailMatch=/^\/api\/thumbnail\/(v[0-9]+)\/([a-z0-9-]+)\/(r[0-9]+)$/.exec(url.pathname);
    const iconMatch=/^\/api\/material-icon\/([a-z0-9_]+)$/.exec(url.pathname);
    const exportMatch=/^\/api\/(schematic|export-manifest)\/([a-z0-9-]+)\/(r[0-9]+)$/.exec(url.pathname);
    const match=/^\/api\/(artifact|mesh)\/(?:(courtyard|terrace|library|clinic|market|school|postmodern|braemar|mansion)\/)?(r[0-9]+)$/.exec(url.pathname);
    let body,type='application/json';
    if(url.pathname==='/api/health') {
      body=Buffer.from(JSON.stringify({status:'ok'}));
    } else if(url.pathname==='/api/projects') {
      body=Buffer.from(JSON.stringify(projects.map(project=>({...project,revisions:project.revisions.map(revision=>{
        const artifact=artifacts.get(`${project.id}/${revision.id}`);
        return {...revision,hash:artifact.hash,cells:artifact.blocks.length,dimensions:artifact.dimensions};
      })}))));
    } else if(thumbnailMatch) {
      const [,style,projectId,revision]=thumbnailMatch;
      const artifact=artifacts.get(`${projectId}/${revision}`);
      if(style!==STYLE_VERSION||!artifact){res.writeHead(404);res.end('Unknown preview');return;}
      const hash=url.searchParams.get('hash');
      if([...url.searchParams.keys()].some(key=>key!=='hash')||url.searchParams.getAll('hash').length!==1||!/^[a-f0-9]{64}$/.test(hash||'')){
        res.writeHead(400);res.end('An exact artifact hash is required.');return;
      }
      if(hash!==artifact.hash){res.writeHead(409);res.end('Revision changed. Reload the register.');return;}
      body=readThumbnail(projectId,revision,hash);
      if(!body){res.setHeader('Retry-After','5');res.writeHead(503);res.end('Preview image has not been generated.');return;}
      type='image/png';res.setHeader('X-Artifact-Hash',hash);
      res.setHeader('Cache-Control','private, max-age=31536000, immutable');
      const etag=`"${STYLE_VERSION}-${hash}"`;res.setHeader('ETag',etag);
      if(req.headers['if-none-match']===etag){res.writeHead(304);res.end();return;}
    } else if(exportMatch) {
      const [,kind,projectId,revision]=exportMatch;
      const artifact=artifacts.get(`${projectId}/${revision}`);
      if(!artifact){res.writeHead(404);res.end('Unknown project or revision');return;}
      if([...url.searchParams.keys()].some(key=>key!=='hash')||url.searchParams.getAll('hash').length!==1) {
        res.writeHead(400);res.end('An exact artifact hash is required; export always includes the full proposal.');return;
      }
      if(url.searchParams.get('hash')!==artifact.hash){res.writeHead(409);res.end('Revision changed. Reload the proposal before exporting.');return;}
      const schematic=kind==='schematic';
      body=schematic?exportSchematic(artifact):Buffer.from(JSON.stringify(exportManifest(artifact),null,2));
      type=schematic?'application/octet-stream':'application/json';
      res.setHeader('X-Artifact-Hash',artifact.hash);
      res.setHeader('Content-Disposition',`attachment; filename="${projectId}-${revision}-${artifact.hash.slice(0,12)}.${schematic?'schem':'manifest.json'}"`);
    } else if(iconMatch) {
      const name=iconMatch[1];
      if(!iconNames.has(name)){res.writeHead(404);res.end('Unknown material');return;}
      if(!icons.has(name))icons.set(name,Buffer.from(JSON.stringify(materialIcon(name))));
      body=icons.get(name);
    } else if(match) {
      const projectId=match[2]||'courtyard',revision=match[3];
      const artifact=artifacts.get(`${projectId}/${revision}`);
      if(!artifact){res.writeHead(404);res.end('Unknown project or revision');return;}
      if(match[1]==='artifact') body=Buffer.from(JSON.stringify(artifact));
      else {
        const ceiling=Number(url.searchParams.get('ceiling')||projects.find(p=>p.id===projectId).layers[0].value);
        if(!projects.find(p=>p.id===projectId).layers.some(l=>l.value===ceiling)) {res.writeHead(400);res.end('Invalid floor');return;}
        const key=`${projectId}/${revision}:${ceiling}`;
        if(!meshes.has(key)) {
          const start=performance.now();
          const mesh=meshArtifact(artifact,ceiling);
          mesh.buildMs=Math.round(performance.now()-start);
          if(meshes.size>=12)meshes.delete(meshes.keys().next().value);
          meshes.set(key,Buffer.from(JSON.stringify(mesh)));
        }
        body=meshes.get(key);
      }
    } else if(files.has(url.pathname)) {
      const [file,mime]=files.get(url.pathname); type=mime;
      body=fs.readFileSync(path.join(__dirname,file));
      // The packaged controls use a bare module import; map it to the local pinned module.
      if(url.pathname.endsWith('/OrbitControls.js')) body=Buffer.from(body.toString().replace("from 'three'", "from '/vendor/three/build/three.module.js'"));
    } else {res.writeHead(404);res.end('Not found');return;}
    res.setHeader('Content-Type',type);
    if(req.method==='HEAD') {res.writeHead(200);res.end();return;}
    if(/\bgzip\b/.test(req.headers['accept-encoding']||'') && !['image/png','application/octet-stream'].includes(type)) {
      zlib.gzip(body,(error,compressed)=>{
        if(error){res.writeHead(500);res.end('Compression failed');return;}
        res.setHeader('Content-Encoding','gzip');res.writeHead(200);res.end(compressed);
      });
    } else {res.writeHead(200);res.end(body);}
  } catch(error) {console.error(error.message);res.writeHead(500);res.end('Preview could not be loaded. Check the local server log.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Design workspace: http://localhost:${port} (catalogue review and studio)`));
