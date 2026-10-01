import {blockBoxes} from '/roadwork-shapes.js';
// Survey and assembly drawings for Roadwork. Coordinates remain Minecraft X/Y/Z.
import * as THREE from '/vendor/three/build/three.module.js';
import {OrbitControls} from '/vendor/three/examples/jsm/controls/OrbitControls.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export {esc};
const axis=(point,key)=>Array.isArray(point)?Number(point[{x:0,y:1,z:2}[key]])||0:Number(point?.[key])||0;
export const isAir=state=>['air','cave_air','void_air'].includes(String(state??'').split('[')[0].split(':').at(-1));

export function normalizeBlocks(survey) {
  const source = survey?.blocks ?? survey?.site?.blocks ?? [];
  const origin = survey?.origin ?? survey?.site?.origin ?? {x:0,y:0,z:0};
  const result = [];
  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item) continue;
      if (Array.isArray(item)) result.push({x:Number(item[0]),y:Number(item[1]),z:Number(item[2]),state:item[3] ?? 'minecraft:air'});
      else result.push({x:Number(item.x),y:Number(item.y),z:Number(item.z),state:item.state ?? item.block ?? item.id ?? 'minecraft:air'});
    }
  } else if (source && typeof source === 'object') {
    for (const [coordinate,state] of Object.entries(source)) {
      const [x,y,z] = coordinate.split(',').map(Number);
      if ([x,y,z].every(Number.isFinite)) result.push({x,y,z,state:typeof state === 'string' ? state : state?.state ?? state?.block ?? 'minecraft:air'});
    }
  }
  const local = survey?.blockCoordinates !== 'world' && survey?.site?.blockCoordinates !== 'world';
  return result.filter(b=>[b.x,b.y,b.z].every(Number.isFinite)).map(b=>({...b,x:b.x+(local?axis(origin,'x'):0),y:b.y+(local?axis(origin,'y'):0),z:b.z+(local?axis(origin,'z'):0)}));
}

function bounds(survey,points,changes) {
  const o=survey?.origin??survey?.site?.origin??{x:0,y:0,z:0}, dim=survey?.dimensions??survey?.site?.dimensions??{x:64,y:32,z:64};
  const xs=[axis(o,'x'),axis(o,'x')+(Number(dim.x)||64),...points.map(p=>p.x),...changes.map(c=>c.x)];
  const zs=[axis(o,'z'),axis(o,'z')+(Number(dim.z)||64),...points.map(p=>p.z),...changes.map(c=>c.z)];
  return {minX:Math.min(...xs)-3,maxX:Math.max(...xs)+3,minZ:Math.min(...zs)-3,maxZ:Math.max(...zs)+3};
}
function projection(b) {
  const sx=940/Math.max(1,b.maxX-b.minX),sz=540/Math.max(1,b.maxZ-b.minZ),scale=Math.min(sx,sz);
  const ox=(1000-(b.maxX-b.minX)*scale)/2,oz=(600-(b.maxZ-b.minZ)*scale)/2;
  return {at:(x,z)=>[ox+(x-b.minX)*scale,oz+(z-b.minZ)*scale],scale};
}
const blockColor=state=>{const s=String(state??'').split('[')[0].toLowerCase();if(isAir(state))return '#152b32';if(s.includes('water'))return '#327b8e';if(s.includes('white_concrete')||s.includes('quartz'))return '#e6e9e2';if(s.includes('yellow_concrete'))return '#e6bb4b';if(s.includes('light_gray_concrete'))return '#a8b0ae';if(s.includes('gray_concrete')||s.includes('asphalt'))return '#585f63';if(s.includes('black_concrete')||s.includes('blackstone'))return '#292e32';if(s.includes('concrete'))return '#7e8c8d';if(s.includes('grass')||s.includes('moss')||s.includes('leaves'))return '#64826c';if(s.includes('dirt')||s.includes('mud'))return '#836b55';if(s.includes('sand'))return '#c6ac7e';if(s.includes('stone')||s.includes('andesite'))return '#89908c';return '#9a9d92';};

export function drawPlan(svg,{survey,blocks,assembly,points,station,showSurvey=true,showChanges=true,showGrid=false}) {
  const changes=assembly?.changes??[],samples=assembly?.samples??[];
  const b=bounds(survey,points,changes),p=projection(b),size=p.scale;
  const rects=[];
  if(showSurvey) {
    const topByXZ=new Map();
    for(const block of blocks) if(!isAir(block.state)) {const key=`${block.x},${block.z}`;if(!topByXZ.has(key)||block.y>topByXZ.get(key).y)topByXZ.set(key,block);}
    for(const block of topByXZ.values()) {const [x,z]=p.at(block.x,block.z);rects.push(`<rect x="${x.toFixed(2)}" y="${z.toFixed(2)}" width="${Math.max(1,size+.3).toFixed(2)}" height="${Math.max(1,size+.3).toFixed(2)}" fill="${blockColor(block.state)}"/>`);}
  }
  const overlays=[];
  if(showChanges) for(const c of changes) {const [x,z]=p.at(c.x,c.z);overlays.push(`<rect x="${x.toFixed(2)}" y="${z.toFixed(2)}" width="${Math.max(1,size+.3).toFixed(2)}" height="${Math.max(1,size+.3).toFixed(2)}" fill="${c.classification==='keep'?'#95aaa8':c.classification==='adapt'?'#f0bd57':c.classification==='replace'?'#32c6be':'#f27b5f'}" opacity=".82"/>`);}
  const route=samples.length? samples:points;
  const line=route.length>1?`<polyline points="${route.map(q=>p.at(q.x,q.z).join(',')).join(' ')}" fill="none" stroke="#ffab65" stroke-width="${Math.max(2,size*.3)}" stroke-linecap="round" stroke-linejoin="round"/>`:'';
  const nodes=points.map((q,i)=>{const [x,z]=p.at(q.x,q.z);return `<g class="roadwork-node" data-point="${i}" tabindex="0" role="button" aria-label="Control point ${i+1}, X ${q.x}, Y ${q.y}, Z ${q.z}"><circle cx="${x}" cy="${z}" r="8" fill="#ff9b5b" stroke="#101f29" stroke-width="3"/><text x="${x+11}" y="${z-9}" fill="#e7f8f6" font-size="11">${i===0?'START':i===points.length-1?'END':`P${i+1}`}</text></g>`;}).join('');
  const marker=samples.length?samples[Math.min(samples.length-1,Math.round(station/100*(samples.length-1)))]:null;
  const mark=marker?(()=>{const[x,z]=p.at(marker.x,marker.z);return `<circle cx="${x}" cy="${z}" r="5" fill="#f5ce47" stroke="#10232b" stroke-width="2"/>`;})():'';
  const grid=showGrid?`<path d="${Array.from({length:Math.ceil((b.maxX-b.minX)/10)},(_,i)=>{const [x]=p.at(b.minX+i*10,b.minZ);return `M${x} 0V600`}).join(' ')} ${Array.from({length:Math.ceil((b.maxZ-b.minZ)/10)},(_,i)=>{const[,z]=p.at(b.minX,b.minZ+i*10);return `M0 ${z}H1000`}).join(' ')}" stroke="#dae4e133" stroke-width="1" fill="none"/>`:'';
  svg.innerHTML=`<rect width="1000" height="600" fill="#15303a"/>${rects.join('')}${grid}${overlays.join('')}${line}${nodes}${mark}<text x="22" y="30" fill="#c8dedd" font-size="11">X ${b.minX.toFixed(0)}–${b.maxX.toFixed(0)} · Z ${b.minZ.toFixed(0)}–${b.maxZ.toFixed(0)} · 1 square = 1 block</text>`;
}

export function drawProfile(svg,{survey,blocks,assembly,points,station}) {
  const samples=assembly?.samples??points;if(!samples.length){svg.innerHTML='';return;}
  const distance=samples.map((s,i)=>Number(s.station??s.distance??s.chainage??i));const maxD=Math.max(1,...distance);
  const topByXZ=new Map();for(const block of blocks)if(!isAir(block.state)){const key=block.x+','+block.z;topByXZ.set(key,Math.max(topByXZ.get(key)??-Infinity,block.y));}
  const ground=samples.map(s=>Number(s.groundY??topByXZ.get(Math.round(s.x)+','+Math.round(s.z))??s.y));
  const ys=[...samples.map(s=>Number(s.y)),...ground].filter(Number.isFinite),minY=Math.min(...ys)-2,maxY=Math.max(...ys)+2;
  const at=(d,y)=>[40+d/maxD*920,190-(y-minY)/Math.max(1,maxY-minY)*160];
  const path=(values)=>values.map((y,i)=>at(distance[i],y).join(',')).join(' ');
  const cursorX=40+station/100*920;
  svg.innerHTML=`<rect width="1000" height="220" fill="#10272e"/><path d="M40 20V190H960" stroke="#58737a" fill="none"/><polyline points="${path(ground)}" stroke="#98a894" fill="none" stroke-width="3"/><polyline points="${path(samples.map(s=>Number(s.y)))}" stroke="#4dd3c9" fill="none" stroke-width="3"/><path d="M${cursorX} 20V190" stroke="#f5ce47" stroke-width="2"/><text x="45" y="211" fill="#b0c9ca" font-size="11">0 blocks</text><text x="875" y="211" fill="#b0c9ca" font-size="11">${Math.round(maxD)} blocks</text><text x="45" y="36" fill="#b0c9ca" font-size="11">Y ${minY.toFixed(0)}–${maxY.toFixed(0)}</text>`;
}

export function drawSection(svg,{survey,blocks,assembly,station}) {
  const samples=assembly?.samples??[],selected=samples[Math.min(samples.length-1,Math.round(station/100*(samples.length-1)))];
  if(!selected){svg.innerHTML='';return;}
  const [hx,hz]=Array.isArray(selected.heading)?selected.heading:[1,0],magnitude=Math.hypot(hx,hz)||1,nx=-hz/magnitude,nz=hx/magnitude;
  const width=Math.max(5,Number(assembly?.width??7)+6),half=Math.floor(width/2);
  const before=new Map(blocks.map(b=>[b.x+','+b.y+','+b.z,b.state]));
  const after=new Map((assembly?.changes??[]).map(c=>[c.x+','+c.y+','+c.z,c.after]));
  const minY=selected.y-5,maxY=selected.y+4,cell=Math.min(12,216/width,126/(maxY-minY+1));
  const cells=(proposed,startX)=>{let output='';for(let offset=-half;offset<=half;offset++){const x=Math.round(selected.x+nx*offset),z=Math.round(selected.z+nz*offset);for(let y=minY;y<=maxY;y++){const key=x+','+y+','+z,old=before.get(key)||'minecraft:air',state=proposed?(after.get(key)??old):old;if(isAir(state))continue;const px=startX+(offset+half)*cell,py=166-(y-minY+1)*cell;for(const box of blockBoxes(state)){const span=Math.abs(nx)*(box[3]-box[0])+Math.abs(nz)*(box[5]-box[2]),center=nx*((box[0]+box[3])/2-.5)+nz*((box[2]+box[5])/2-.5);output+=`<rect x="${(px+(.5+center-span/2)*cell).toFixed(2)}" y="${(py+(1-box[4])*cell).toFixed(2)}" width="${(span*cell).toFixed(2)}" height="${((box[4]-box[1])*cell).toFixed(2)}" fill="${blockColor(state)}" stroke="${proposed&&after.has(key)?'#4dd3c9':'#19313a'}" stroke-width="1"/>`;}}}return output;};
  svg.innerHTML=`<rect width="520" height="190" fill="#10272e"/><path d="M260 17V174M10 170H510" stroke="#607c80"/><text x="15" y="15" fill="#aec6c7" font-size="10">BEFORE · X ${selected.x} Z ${selected.z}</text><text x="272" y="15" fill="#aec6c7" font-size="10">PROPOSED · Y ${selected.y}</text>${cells(false,13)}${cells(true,267)}`;
}

let model=null;
function modelScene(container) {
  if(model?.container===container)return model;
  const canvas=document.createElement('canvas');canvas.className='roadwork-canvas';canvas.setAttribute('aria-label','Orbitable block occupancy model');
  const count=document.createElement('span');count.className='model-count';
  container.replaceChildren(canvas,count);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputEncoding=THREE.sRGBEncoding;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#102b34');
  scene.add(new THREE.HemisphereLight(0xe8f6f2,0x263a3b,.8));
  const light=new THREE.DirectionalLight(0xffffff,.6);light.position.set(22,40,15);scene.add(light);
  const camera=new THREE.PerspectiveCamera(46,1,.1,600);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.maxDistance=400;
  const content=new THREE.Group();scene.add(content);
  const draw=()=>{if(container.hidden)return;const w=container.clientWidth||640,h=container.clientHeight||390;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);};
  controls.addEventListener('change',draw);
  const resize=new ResizeObserver(draw);resize.observe(container);
  model={container,canvas,count,renderer,scene,camera,controls,content,draw,resize};
  return model;
}
export function drawModel(container,{survey,blocks,assembly,showSurvey=true,showChanges=true}) {
  const view=modelScene(container),changes=assembly?.changes??[],map=new Map();
  const signature=[survey?.hash||survey?.sourceHash||'none',JSON.stringify(survey?.origin),assembly?.hash||'none',blocks.length,showSurvey,showChanges].join(':');
  if(view.signature===signature){requestAnimationFrame(view.draw);return;}
  view.signature=signature;
  if(showSurvey)for(const b of blocks)map.set(b.x+','+b.y+','+b.z,{...b,changed:false});
  if(showChanges)for(const c of changes)map.set(c.x+','+c.y+','+c.z,{x:c.x,y:c.y,z:c.z,state:c.after,changed:true});
  for(const [key,b] of map)if(isAir(b.state))map.delete(key);
  const exposed=[];
  for(const b of map.values()){
    const {x,y,z}=b;
    if(b.state.includes('_slab[')||b.state.includes('_stairs[')||!map.has((x+1)+','+y+','+z)||!map.has((x-1)+','+y+','+z)||!map.has(x+','+(y+1)+','+z)||!map.has(x+','+(y-1)+','+z)||!map.has(x+','+y+','+(z+1))||!map.has(x+','+y+','+(z-1)))exposed.push(b);
  }
  for(const child of [...view.content.children]){view.content.remove(child);child.geometry.dispose();child.material.dispose();}
  if(!exposed.length){view.count.textContent='No visible blocks in selected layers';view.draw();return;}
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(const b of exposed){minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);minZ=Math.min(minZ,b.z);maxX=Math.max(maxX,b.x);maxY=Math.max(maxY,b.y);maxZ=Math.max(maxZ,b.z);}
  const groups=new Map();for(const b of exposed){const color=blockColor(b.state);if(!groups.has(color))groups.set(color,[]);for(const box of blockBoxes(b.state))groups.get(color).push({...b,box});}
  const transform=new THREE.Object3D();
  for(const [color,cells] of groups){const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:new THREE.Color(color).convertSRGBToLinear()}),cells.length);cells.forEach((b,i)=>{const q=b.box;transform.scale.set(q[3]-q[0],q[4]-q[1],q[5]-q[2]);transform.position.set(b.x-minX+(q[0]+q[3])/2-.5,b.y-minY+(q[1]+q[4])/2-.5,b.z-minZ+(q[2]+q[5])/2-.5);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});mesh.instanceMatrix.needsUpdate=true;view.content.add(mesh);}
  const cx=(maxX-minX)/2,cy=(maxY-minY)/2,cz=(maxZ-minZ)/2,diameter=Math.max(12,maxX-minX,maxZ-minZ,maxY-minY);
  view.controls.target.set(cx,cy,cz);view.camera.position.set(cx+diameter*.9,cy+diameter*.8,cz+diameter*.9);view.controls.update();
  view.count.textContent=exposed.length.toLocaleString()+' exposed blocks · '+map.size.toLocaleString()+' occupied cells · slab/stair shapes; other context uses occupancy cubes';
  requestAnimationFrame(view.draw);
}
export function fitModel(){if(model)model.signature=null;}
