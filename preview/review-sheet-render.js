import {signObject} from './sign-render.js';
import * as THREE from '/vendor/three/build/three.module.js';

const WIDTH=960,SCENE_HEIGHT=640,LABEL_HEIGHT=120,HEIGHT=SCENE_HEIGHT+LABEL_HEIGHT;
const ASPECT=WIDTH/SCENE_HEIGHT,MAX_MARKERS=99;
const severityOrder={error:0,warning:1,info:2};

export const REVIEW_EXTERIORS=Object.freeze([
  {id:'perspective',label:'Perspective',kind:'exterior',preset:'perspective'},
  {id:'front',label:'Front',kind:'exterior',preset:'front'},
  {id:'side',label:'Side',kind:'exterior',preset:'side'},
  {id:'rear',label:'Rear',kind:'exterior',preset:'rear'},
  {id:'roof',label:'Roof',kind:'exterior',preset:'roof'},
  {id:'street',label:'Street',kind:'exterior',preset:'street'},
]);
export const REVIEW_ELEVATIONS=Object.freeze(['north','east','south','west'].map(face=>({id:`elevation-${face}`,label:`${face[0].toUpperCase()+face.slice(1)} elevation`,kind:'elevation',face})));

const exteriorDirections={
  perspective:[37,26,-49],front:[0,9,-63],side:[49,15,0],rear:[0,12,60],roof:[0,68,.01],street:[15,-1,-33],
};
const elevationDirections={north:[0,0,-1],east:[1,0,0],south:[0,0,1],west:[-1,0,0]};
let renderer,atlas,queue=Promise.resolve(),fontReady;const materials=new Map();
function labelFont(){return fontReady??=(async()=>{const face=new FontFace('Urbanist','url(/fonts/urbanist-latin.woff2)',{weight:'400 700'});await face.load();document.fonts.add(face);})();}

function textureAtlas(){
  return atlas??=new Promise((resolve,reject)=>new THREE.TextureLoader().load('/texture.png',texture=>{
    texture.magFilter=texture.minFilter=THREE.NearestFilter;
    texture.flipY=false;texture.encoding=THREE.sRGBEncoding;resolve(texture);
  },undefined,reject));
}

function webgl(){
  if(renderer)return renderer;
  renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(WIDTH,SCENE_HEIGHT,false);renderer.setClearColor(0xe8e8e6,1);
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  return renderer;
}

function safeText(value,limit=512){
  return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit);
}

function fitText(ctx,value,maxWidth){
  const text=safeText(value);if(ctx.measureText(text).width<=maxWidth)return text;
  let lo=0,hi=text.length;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(ctx.measureText(text.slice(0,mid)+'…').width<=maxWidth)lo=mid;else hi=mid-1;}
  return text.slice(0,lo)+'…';
}

function validate({mesh,view,dimensions,diagnostics,components,name}){
  if(!mesh||typeof mesh.hash!=='string'||!Array.isArray(mesh.sections))throw Error('A prefetched mesh with an artifact hash is required');
  if(!view||!['exterior','elevation','plan'].includes(view.kind)||typeof view.id!=='string')throw Error('Invalid review-sheet view');
  if(!dimensions||!['x','y','z'].every(axis=>Number.isInteger(dimensions[axis])&&dimensions[axis]>0))throw Error('Invalid review-sheet dimensions');
  if(!Array.isArray(diagnostics)||!Array.isArray(components)||typeof name!=='string')throw Error('Invalid review-sheet metadata');
  if(view.kind==='exterior'&&!exteriorDirections[view.preset||view.id])throw Error('Unknown exterior preset');
  if(view.kind==='elevation'&&!elevationDirections[view.face])throw Error('Unknown elevation face');
  if(view.kind==='plan'&&!Number.isInteger(view.floor))throw Error('Plan view requires an integer floor');
}

function geometryGroup(mesh,material){
  const group=new THREE.Group();
  for(const part of mesh.sections){
    if(!part||!Array.isArray(part.positions)||!Array.isArray(part.normals)||!Array.isArray(part.colors)||!Array.isArray(part.uvs)||!Array.isArray(part.indices))throw Error('Invalid review-sheet mesh section');
    const geometry=new THREE.BufferGeometry();
    for(const [attribute,key,size] of [['position','positions',3],['normal','normals',3],['color','colors',3],['uv','uvs',2]])geometry.setAttribute(attribute,new THREE.Float32BufferAttribute(part[key],size));
    geometry.setIndex(part.indices);const object=new THREE.Mesh(geometry,material);object.position.set(part.sx||0,part.sy||0,part.sz||0);group.add(object);
  }
  return group;
}

function cameraUp(direction,plan=false){
  if(plan||Math.abs(direction.y)>.98)return new THREE.Vector3(0,0,-1);
  return new THREE.Vector3(0,1,0);
}

function corners(bounds){
  const result=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])result.push(new THREE.Vector3(x,y,z));return result;
}

function perspectiveCamera(bounds,direction){
  const center=bounds.getCenter(new THREE.Vector3()),dir=new THREE.Vector3(...direction).normalize(),upHint=cameraUp(dir);
  const right=new THREE.Vector3().crossVectors(upHint,dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right).normalize();
  const vertical=THREE.MathUtils.degToRad(40)/2,horizontal=Math.atan(Math.tan(vertical)*ASPECT);let distance=2;
  for(const point of corners(bounds)){const relative=point.sub(center),depth=relative.dot(dir);distance=Math.max(distance,Math.abs(relative.dot(right))/Math.tan(horizontal)+depth,Math.abs(relative.dot(up))/Math.tan(vertical)+depth);}
  const camera=new THREE.PerspectiveCamera(40,ASPECT,.1,1000);camera.up.copy(up);camera.position.copy(center).addScaledVector(dir,distance*1.12);camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return camera;
}

function orthographicCamera(bounds,direction,{plan=false}={}){
  const center=bounds.getCenter(new THREE.Vector3()),dir=new THREE.Vector3(...direction).normalize(),upHint=cameraUp(dir,plan);
  const right=new THREE.Vector3().crossVectors(upHint,dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right).normalize();let half=1;
  for(const point of corners(bounds)){const relative=point.sub(center);half=Math.max(half,Math.abs(relative.dot(up)),Math.abs(relative.dot(right))/ASPECT);}
  half*=1.08;const camera=new THREE.OrthographicCamera(-half*ASPECT,half*ASPECT,half,-half,.1,1000);
  camera.up.copy(up);camera.position.copy(center).addScaledVector(dir,200);camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return camera;
}

function chooseCamera(group,view,dimensions,ceiling){
  let bounds=new THREE.Box3().setFromObject(group);if(bounds.isEmpty())throw Error('Review-sheet mesh is empty');
  if(view.kind==='plan'){
    bounds=new THREE.Box3(new THREE.Vector3(0,0,0),new THREE.Vector3(dimensions.x,Math.max(1,Math.min(dimensions.y,ceiling)),dimensions.z));
    return orthographicCamera(bounds,[0,1,0],{plan:true});
  }
  if(view.kind==='elevation')return orthographicCamera(bounds,elevationDirections[view.face]);
  return perspectiveCamera(bounds,exteriorDirections[view.preset||view.id]);
}

function relevantDiagnostics(diagnostics,view,ceiling){
  const valid=diagnostics.filter(d=>Array.isArray(d.at)&&d.at.length===3&&d.at.every(Number.isFinite));
  if(view.kind!=='plan')return valid;
  return valid.filter(d=>d.at[1]>=view.floor&&d.at[1]<ceiling);
}

function drawMarkers(ctx,camera,diagnostics){
  const sorted=[...diagnostics].sort((a,b)=>(severityOrder[a.severity]??9)-(severityOrder[b.severity]??9)||a.at[1]-b.at[1]||a.at[2]-b.at[2]||a.at[0]-b.at[0]||String(a.rule).localeCompare(String(b.rule))).slice(0,MAX_MARKERS);
  const items=[];ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 12px Urbanist, sans-serif';
  for(let i=0;i<sorted.length;i++){
    const diagnostic=sorted[i],projected=new THREE.Vector3(diagnostic.at[0]+.5,diagnostic.at[1]+.5,diagnostic.at[2]+.5).project(camera);
    const x=(projected.x+1)*WIDTH/2,y=(1-projected.y)*SCENE_HEIGHT/2;if(x<0||x>WIDTH||y<0||y>SCENE_HEIGHT)continue;
    const number=i+1,color=diagnostic.severity==='error'?'#b94135':diagnostic.severity==='warning'?'#c37a22':'#286a87';
    ctx.beginPath();ctx.arc(x,y,15,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#ffffff';ctx.stroke();ctx.fillStyle='#ffffff';ctx.fillText(String(number),x,y+.5);
    items.push({number,at:[...diagnostic.at],x:Math.round(x*100)/100,y:Math.round(y*100)/100,rule:safeText(diagnostic.rule,80),severity:safeText(diagnostic.severity,16),component:diagnostic.component==null?null:safeText(diagnostic.component,120)});
  }
  ctx.restore();return items;
}

function componentLegend(components,diagnostics){
  const byId=new Map(components.map(component=>[component.id,component.role||component.id]));
  const ids=[...new Set(diagnostics.map(d=>d.component).filter(Boolean))];
  const chosen=(ids.length?ids:components.map(component=>component.id)).slice(0,6),labels=chosen.map(id=>safeText(byId.get(id)||id,48));
  const extra=Math.max(0,(ids.length?ids.length:components.length)-chosen.length);return labels.length?`Components · ${labels.join(' · ')}${extra?` · +${extra} more`:''}`:'Components · none recorded';
}

function diagnosticSummary(diagnostics){
  const count=severity=>diagnostics.filter(d=>d.severity===severity).length;
  return `${count('error')} error${count('error')===1?'':'s'} · ${count('warning')} warning${count('warning')===1?'':'s'} · ${count('info')} info`;
}

function markerLegend(items,total){
  if(!total)return 'No diagnostics on this level';
  const text=items.slice(0,5).map(item=>`${item.number} ${item.severity[0]?.toUpperCase()||'?'} ${item.rule}`).join(' · ');
  return text+(total>items.length?` · ${total-items.length} not shown`:'');
}

function compose(sceneCanvas,{name,view,components,diagnostics,camera,ceiling,dark=false}){
  const output=document.createElement('canvas');output.width=WIDTH;output.height=HEIGHT;const ctx=output.getContext('2d',{alpha:false});
  ctx.fillStyle='#e8e8e6';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.drawImage(sceneCanvas,0,0,WIDTH,SCENE_HEIGHT);
  const levelDiagnostics=relevantDiagnostics(diagnostics,view,ceiling),markerItems=view.kind==='plan'?drawMarkers(ctx,camera,levelDiagnostics):[];
  ctx.fillStyle=dark?'#171b1e':'#f7f8f3';ctx.fillRect(0,SCENE_HEIGHT,WIDTH,LABEL_HEIGHT);ctx.fillStyle=dark?'#343c40':'#c9cec8';ctx.fillRect(0,SCENE_HEIGHT,WIDTH,1);
  ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.fillStyle=dark?'#e4eeeb':'#183f34';ctx.font='600 24px Urbanist, sans-serif';
  const viewLabel=safeText(view.label||(view.kind==='plan'?`Level ${view.floor}`:view.id),120),title=fitText(ctx,`${safeText(name,160)} · ${viewLabel}`,660);ctx.fillText(title,24,SCENE_HEIGHT+39);
  ctx.textAlign='right';ctx.font='600 15px Urbanist, sans-serif';ctx.fillStyle=dark?'#aebdb9':'#4c5e58';const summary=fitText(ctx,diagnosticSummary(levelDiagnostics),250);ctx.fillText(summary,WIDTH-24,SCENE_HEIGHT+37);
  ctx.textAlign='left';ctx.font='14px Urbanist, sans-serif';ctx.fillStyle=dark?'#aebdb9':'#58645f';const legend=fitText(ctx,componentLegend(components,levelDiagnostics),590);ctx.fillText(legend,24,SCENE_HEIGHT+88);
  ctx.fillStyle=dark?'#aebdb9':'#475a54';const markers=fitText(ctx,markerLegend(markerItems,levelDiagnostics.length),310);ctx.fillText(markers,626,SCENE_HEIGHT+88);
  return {output,markerItems,diagnosticCount:levelDiagnostics.length,labels:{title,summary,legend,markers}};
}

async function pngDigest(dataUrl){
  const raw=atob(dataUrl.slice(dataUrl.indexOf(',')+1)),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
}

function projectionMetadata(camera,ceiling){
  const viewProjection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  return {type:camera.isOrthographicCamera?'orthographic':'perspective',viewport:{width:WIDTH,height:SCENE_HEIGHT},viewMatrix:camera.matrixWorldInverse.toArray(),projectionMatrix:camera.projectionMatrix.toArray(),viewProjectionMatrix:viewProjection.toArray(),clipCeiling:ceiling};
}

async function render(input){
  const normalized={diagnostics:[],components:[],name:'Untitled design',...input};validate(normalized);
  const {mesh,view,dimensions,diagnostics,components,name}=normalized;const dark=normalized.theme==='dark';await labelFont();
  const ceiling=view.kind==='plan'?(Number.isInteger(view.ceiling)?view.ceiling:view.floor+2):(Number.isInteger(view.ceiling)?view.ceiling:(Number.isInteger(mesh.ceiling)?mesh.ceiling:null));
  if(view.kind==='plan'&&(ceiling<=view.floor||ceiling>dimensions.y+1))throw Error('Invalid plan cut ceiling');
  const engine=webgl();engine.localClippingEnabled=view.kind==='plan';
  const clipping=view.kind==='plan'?[new THREE.Plane(new THREE.Vector3(0,-1,0),ceiling)]:[];
  const key=view.kind==='plan'?'plan':'exterior';let material=materials.get(key);if(!material){material=new THREE.MeshLambertMaterial({map:await textureAtlas(),vertexColors:true,transparent:true,alphaTest:.1,clippingPlanes:clipping,clipShadows:false});materials.set(key,material);}else material.clippingPlanes=clipping;
  const scene=new THREE.Scene(),group=geometryGroup(mesh,material);scene.background=new THREE.Color(dark?0x101416:0xe8e8e6);for(const sign of mesh.signs||[])group.add(await signObject(sign));scene.add(group);
  scene.add(new THREE.HemisphereLight(0xe8f2ff,0x8c8b73,1.1));const sun=new THREE.DirectionalLight(0xffffff,.75);sun.position.set(-25,55,-15);scene.add(sun);
  try{
    const camera=chooseCamera(group,view,dimensions,ceiling);engine.render(scene,camera);
    const composed=compose(engine.domElement,{name,view,components,diagnostics,camera,ceiling,dark});const png=composed.output.toDataURL('image/png');
    return {png,hash:mesh.hash,pngHash:await pngDigest(png),ceiling,kind:view.kind,projection:projectionMetadata(camera,view.kind==='plan'?ceiling:null),markers:composed.markerItems.length,markerItems:composed.markerItems,diagnosticCount:composed.diagnosticCount,labels:composed.labels};
  }finally{
    for(const object of group.children){object.geometry.dispose();if(object.userData.sign){object.material.map.dispose();object.material.dispose();}}engine.renderLists.dispose();engine.localClippingEnabled=false;
  }
}

export function renderReviewView(input){
  const job=queue.then(()=>render(input));queue=job.catch(()=>{});return job;
}
