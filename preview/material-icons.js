import * as THREE from './vendor/three/build/three.module.js';

const thumbnails=new Map();
let renderer,texturePromise;
function textureAtlas(){
  return texturePromise??=new Promise((resolve,reject)=>{
    new THREE.TextureLoader().load('/texture.png',texture=>{
      texture.minFilter=texture.magFilter=THREE.NearestFilter;
      texture.flipY=false;texture.encoding=THREE.sRGBEncoding;resolve(texture);
    },undefined,reject);
  });
}
async function thumbnail(name){
  const response=await fetch(`/api/material-icon/${encodeURIComponent(name)}`,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Material icon unavailable');
  const mesh=await response.json();
  if(!mesh.sections.length)return null;
  const texture=await textureAtlas();
  // One reusable context, one render per material; no extra animation loop.
  if(!renderer){
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(80,80);renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.setClearColor(0x000000,0);
  }
  const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
  const material=new THREE.MeshLambertMaterial({map:texture,vertexColors:true,transparent:true,alphaTest:.1,side:THREE.DoubleSide});
  try{
    for(const part of mesh.sections){
      const geometry=new THREE.BufferGeometry();
      for(const [attribute,key,size] of [['position','positions',3],['normal','normals',3],['color','colors',3],['uv','uvs',2]])
        geometry.setAttribute(attribute,new THREE.Float32BufferAttribute(part[key],size));
      geometry.setIndex(part.indices);
      const object=new THREE.Mesh(geometry,material);object.position.set(part.sx,part.sy,part.sz);group.add(object);
    }
    const bounds=new THREE.Box3().setFromObject(group),center=bounds.getCenter(new THREE.Vector3());
    const span=bounds.getSize(new THREE.Vector3()).length()*.64;
    const camera=new THREE.OrthographicCamera(-span,span,span,-span,.1,100);
    camera.position.copy(center).add(new THREE.Vector3(3,2.4,4));camera.lookAt(center);
    scene.add(new THREE.HemisphereLight(0xffffff,0x999999,1));
    const light=new THREE.DirectionalLight(0xffffff,.65);light.position.set(-3,6,5);scene.add(light);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL('image/png');
  }finally{
    for(const child of group.children)child.geometry.dispose();
    material.dispose();
  }
}

export function materialIcon(name){
  const icon=document.createElement('span');icon.className='material-icon';
  icon.dataset.material=name;icon.dataset.status='pending';icon.setAttribute('aria-hidden','true');
  if(!thumbnails.has(name))thumbnails.set(name,thumbnail(name).catch(()=>undefined));
  thumbnails.get(name).then(url=>{
    if(!url){icon.dataset.status=url===null?'empty':'unavailable';icon.textContent=url===null?'∅':'◇';return;}
    const image=document.createElement('img');image.alt='';image.width=40;image.height=40;
    image.onload=()=>{icon.dataset.status='ready';};
    image.onerror=()=>{icon.dataset.status='unavailable';icon.replaceChildren();icon.textContent='◇';};
    image.src=url;icon.replaceChildren(image);
  });
  return icon;
}
