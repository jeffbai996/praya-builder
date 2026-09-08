import * as THREE from '/vendor/three/build/three.module.js';

let renderer,atlas;
function textureAtlas(){
  return atlas??=new Promise((resolve,reject)=>new THREE.TextureLoader().load('/texture.png',texture=>{
    texture.magFilter=texture.minFilter=THREE.NearestFilter;
    texture.flipY=false;texture.encoding=THREE.sRGBEncoding;resolve(texture);
  },undefined,reject));
}

// Called serially by generate-thumbnails.cjs, never by the register. One context,
// no animation loop, and no geometry retained after each exported image.
export async function renderThumbnail({project,revision,hash,ceiling}){
  const response=await fetch(`/api/mesh/${encodeURIComponent(project)}/${encodeURIComponent(revision)}?ceiling=${ceiling}`,
    {signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(`Could not load thumbnail mesh (${response.status})`);
  const mesh=await response.json();
  if(mesh.hash!==hash||mesh.ceiling!==ceiling)throw Error('Thumbnail artifact identity mismatch');
  const texture=await textureAtlas();
  if(!renderer){
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(640,400);renderer.setClearColor(0x000000,0);
    renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  }
  const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
  const material=new THREE.MeshLambertMaterial({map:texture,vertexColors:true,transparent:true,alphaTest:.1});
  try{
    for(const part of mesh.sections){
      const geometry=new THREE.BufferGeometry();
      for(const [name,key,size] of [['position','positions',3],['normal','normals',3],['color','colors',3],['uv','uvs',2]])
        geometry.setAttribute(name,new THREE.Float32BufferAttribute(part[key],size));
      geometry.setIndex(part.indices);
      const object=new THREE.Mesh(geometry,material);object.position.set(part.sx,part.sy,part.sz);group.add(object);
    }
    const bounds=new THREE.Box3().setFromObject(group);
    if(bounds.isEmpty())throw Error('Thumbnail mesh is empty');
    const center=bounds.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(1,.85,-1.25).normalize();
    const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
    const up=new THREE.Vector3().crossVectors(direction,right),aspect=640/400;
    let halfHeight=0;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const point=new THREE.Vector3(x,y,z).sub(center);
      halfHeight=Math.max(halfHeight,Math.abs(point.dot(up)),Math.abs(point.dot(right))/aspect);
    }
    halfHeight*=1.12;
    const camera=new THREE.OrthographicCamera(-halfHeight*aspect,halfHeight*aspect,halfHeight,-halfHeight,.1,1000);
    camera.position.copy(center).addScaledVector(direction,200);camera.lookAt(center);
    scene.add(new THREE.HemisphereLight(0xe8f2ff,0x8c8b73,1.1));
    const sun=new THREE.DirectionalLight(0xffffff,.75);sun.position.set(-25,55,-15);sun.target.position.copy(center);scene.add(sun,sun.target);
    renderer.render(scene,camera);
    return {hash:mesh.hash,ceiling:mesh.ceiling,png:renderer.domElement.toDataURL('image/png')};
  }finally{
    for(const object of group.children)object.geometry.dispose();material.dispose();renderer.renderLists.dispose();
  }
}
