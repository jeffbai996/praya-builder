import * as THREE from '/vendor/three/build/three.module.js';
// Small fixed-view renders of saved artifacts for the version list. One hidden renderer, rendered serially,
// nothing retained between images. The result is stored with the revision so other devices never re-render.
const WIDTH=256,HEIGHT=160;
let renderer,atlas,queue=Promise.resolve();
const texture=()=>atlas??=new Promise((resolve,reject)=>new THREE.TextureLoader().load('/texture.png',t=>{t.magFilter=t.minFilter=THREE.NearestFilter;t.flipY=false;t.encoding=THREE.sRGBEncoding;resolve(t);},undefined,reject));
async function render(url,hash,background){
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('Could not load the saved version');
  const mesh=await response.json();if(mesh.hash!==hash)throw Error('Version identity mismatch');
  renderer??=(()=>{const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(WIDTH,HEIGHT);r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;return r;})();
  renderer.setClearColor(new THREE.Color(background),1);
  const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
  const material=new THREE.MeshLambertMaterial({map:await texture(),vertexColors:true,transparent:true,alphaTest:.1});
  try{
    for(const part of mesh.sections){const g=new THREE.BufferGeometry();for(const [name,key,size] of [['position','positions',3],['normal','normals',3],['color','colors',3],['uv','uvs',2]])g.setAttribute(name,new THREE.Float32BufferAttribute(part[key],size));g.setIndex(part.indices);const o=new THREE.Mesh(g,material);o.position.set(part.sx,part.sy,part.sz);group.add(o);}
    const bounds=new THREE.Box3().setFromObject(group);if(bounds.isEmpty())throw Error('Empty version');
    const center=bounds.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(1,.85,-1.25).normalize();
    const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right),aspect=WIDTH/HEIGHT;
    let half=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).sub(center);half=Math.max(half,Math.abs(p.dot(up)),Math.abs(p.dot(right))/aspect);}
    half*=1.08;
    const camera=new THREE.OrthographicCamera(-half*aspect,half*aspect,half,-half,.1,1000);camera.position.copy(center).addScaledVector(direction,200);camera.lookAt(center);
    scene.add(new THREE.HemisphereLight(0xe8f2ff,0x8c8b73,1.1));const sun=new THREE.DirectionalLight(0xffffff,.75);sun.position.set(-25,55,-15);sun.target.position.copy(center);scene.add(sun,sun.target);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL('image/jpeg',.8);
  }finally{for(const o of group.children)o.geometry.dispose();material.dispose();renderer.renderLists.dispose();}
}
function enqueue(url,hash,background){const job=queue.then(()=>render(url,hash,background));queue=job.catch(()=>{});return job;}
export function versionThumbnail(hash,{background='#e8e8e6'}={}){return enqueue(`/api/workspace/artifacts/${hash}/mesh?ceiling=64`,hash,background);}
// The register keeps its pre-rendered PNGs (generate-thumbnails.cjs) and the same view direction, so both lists match.
