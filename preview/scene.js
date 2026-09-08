import * as THREE from '/vendor/three/build/three.module.js';
import {OrbitControls} from '/vendor/three/examples/jsm/controls/OrbitControls.js';

export function createScene(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e8e5dd');
  const camera=new THREE.PerspectiveCamera(40,1,.1,300);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;
  controls.minDistance=2;controls.maxDistance=240;controls.maxPolarAngle=Math.PI*.49;
  const hemisphere=new THREE.HemisphereLight(0xe8f2ff,0x8c8b73,.8);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight(0xffefd9,1.05);sun.position.set(-25,55,-15);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,near:1,far:150});sun.shadow.bias=-.001;
  sun.shadow.normalBias=.08;
  sun.target.position.set(16,0,16);scene.add(sun,sun.target);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:0xe3e0d6,roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.set(16,-.08,16);floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(100,100,0xc7c9ba,0xd7d7cb);grid.position.set(16,-.06,16);grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
  const building=new THREE.Group();scene.add(building);
  const context=new THREE.Group();scene.add(context);
  const siteLines=new THREE.Group();scene.add(siteLines);
  function siteBounds(site){
    for(const child of [...siteLines.children]){siteLines.remove(child);child.geometry.dispose();child.material.dispose();}
    if(!site)return;
    for(const [bounds,color]of [[site.plot,0x718d79],...site.protected.map(b=>[b,0xd79a59])]){
      const min=bounds.min.map((v,i)=>v-site.origin[i]),max=bounds.max.map((v,i)=>v-site.origin[i]);
      const helper=new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(...min),new THREE.Vector3(...max)),color);siteLines.add(helper);
    }
    const p=site.frontage.map((v,i)=>v-site.origin[i]);siteLines.add(new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(p[0]-.5,p[1],p[2]-.5),new THREE.Vector3(p[0]+.5,p[1]+2,p[2]+.5)),0x6f9edd));
  }
  let outline=null,changes=null;
  const texturePromise=new Promise((resolve,reject)=>new THREE.TextureLoader().load('/texture.png',texture=>{
    texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.flipY=false;texture.encoding=THREE.sRGBEncoding;resolve(texture);
  },undefined,reject));
  let material;
  const presets={perspective:[53,34,-33],front:[16,17,-47],side:[65,23,16],rear:[16,20,76],roof:[16,76,16.01],street:[31,6,-17]};
  let center=[16,16],viewScale=1,currentView='perspective',baseY=0;
  function view(name) {
    currentView=name;const [x,y,z]=presets[name],targetY=name==='street'?7:8;
    camera.position.set(center[0]+(x-16)*viewScale,baseY+targetY+(y-targetY)*viewScale,center[1]+(z-16)*viewScale);
    controls.target.set(center[0],baseY+targetY,center[1]);controls.update();
  }
  // Fit once per project, not per revision: comparisons retain their camera.
  function frame(dimensions,groundY=0){center=[dimensions.x/2,dimensions.z/2];baseY=groundY;viewScale=Math.max(1,dimensions.x/32,dimensions.z/32);view(currentView);}
  function fit(cells) {
    if(!cells.length)return;
    const bounds=new THREE.Box3();
    for(const p of cells){bounds.expandByPoint(new THREE.Vector3(p.x,p.y,p.z));bounds.expandByPoint(new THREE.Vector3(p.x+1,p.y+1,p.z+1));}
    const target=bounds.getCenter(new THREE.Vector3());
    const vertical=THREE.MathUtils.degToRad(camera.fov)/2,horizontal=Math.atan(Math.tan(vertical)*camera.aspect);
    const direction=camera.position.clone().sub(controls.target).normalize();
    const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
    let distance=controls.minDistance;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]) {
      const point=new THREE.Vector3(x,y,z).sub(target),depth=point.dot(direction);
      distance=Math.max(distance,Math.abs(point.dot(right))/Math.tan(horizontal)+depth,Math.abs(point.dot(up))/Math.tan(vertical)+depth);
    }
    controls.target.copy(target);camera.position.copy(target).addScaledVector(direction,distance*1.15);controls.update();
  }
  let lightingMode='studio';
  function lighting(name) {
    if(!['studio','warm'].includes(name))return;
    lightingMode=name;const warm=name==='warm';
    // Meshes already carry game ambient occlusion; soft studio fill avoids double-shadowing fine details.
    renderer.shadowMap.enabled=warm;
    sun.color.set(warm?0xffdfb3:0xffffff);sun.intensity=warm?1.05:.75;
    hemisphere.intensity=warm?.8:1.1;renderer.toneMappingExposure=warm?.95:1;
    if(material)material.needsUpdate=true;floor.material.needsUpdate=true;
  }
  lighting('studio');
  view('perspective');
  function resize(){const rect=canvas.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(canvas);resize();
  let frames=0,started=performance.now();
  function draw(){controls.update();renderer.render(scene,camera);frames++;requestAnimationFrame(draw);}draw();
  function clear(group=building){for(const child of [...group.children]){group.remove(child);child.geometry.dispose();}}
  async function load(mesh,group=building) {
    const texture=await texturePromise;
    material??=new THREE.MeshLambertMaterial({map:texture,vertexColors:true,transparent:true,alphaTest:.1});
    clear(group);
    for(const part of mesh.sections) {
      const geometry=new THREE.BufferGeometry();
      for(const [name,key,size] of [['position','positions',3],['normal','normals',3],['color','colors',3],['uv','uvs',2]])
        geometry.setAttribute(name,new THREE.Float32BufferAttribute(part[key],size));
      geometry.setIndex(part.indices);geometry.computeBoundingSphere();
      const object=new THREE.Mesh(geometry,material);object.position.set(part.sx,part.sy,part.sz);object.castShadow=true;object.receiveShadow=true;group.add(object);
    }
  }
  function select(cells) {
    if(outline){scene.remove(outline);outline.geometry.dispose();outline.material.dispose();outline=null;}
    if(!cells.length)return;
    const bounds=new THREE.Box3();
    for(const p of cells){bounds.expandByPoint(new THREE.Vector3(p.x,p.y,p.z));bounds.expandByPoint(new THREE.Vector3(p.x+1,p.y+1,p.z+1));}
    outline=new THREE.Box3Helper(bounds,0xb67b31);scene.add(outline);
  }
  function differences(cells) {
    if(changes){scene.remove(changes);for(const obj of changes.children){obj.geometry.dispose();obj.material.dispose();}changes=null;}
    if(!cells.length)return;
    changes=new THREE.Group();
    for(const [kind,color] of [['add',0x2dbb88],['change',0xffbf38],['remove',0xef7663]]) {
      const subset=cells.filter(c=>c.kind===kind);if(!subset.length)continue;
      const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1.02,1.02,1.02),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.48,depthWrite:false}),subset.length);
      subset.forEach((p,i)=>mesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(p.x+.5,p.y+.5,p.z+.5)));changes.add(mesh);
    }scene.add(changes);
  }
  function pick(event){const rect=canvas.getBoundingClientRect();const pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);return ray.intersectObjects(building.children)[0];}
  function png(label){renderer.render(scene,camera);const output=document.createElement('canvas');output.width=canvas.width;output.height=canvas.height+64;const ctx=output.getContext('2d');ctx.drawImage(canvas,0,0);ctx.fillStyle='#f7f8f3';ctx.fillRect(0,canvas.height,output.width,64);ctx.fillStyle='#29493e';ctx.font='16px sans-serif';ctx.fillText(label,24,canvas.height+38);return output;}
  canvas.addEventListener('keydown',event=>{
    const offsets={ArrowLeft:-.12,ArrowRight:.12};
    if(event.key in offsets){const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new THREE.Vector3(0,1,0),offsets[event.key]);camera.position.copy(controls.target).add(v);}
    else if(['+','=','-'].includes(event.key)){camera.position.sub(controls.target).multiplyScalar(event.key==='-'?1.1:.9).add(controls.target);}
    else if(event.key==='ArrowUp'||event.key==='ArrowDown'){camera.position.y+=event.key==='ArrowUp'?2:-2;}
    else if(event.key.toLowerCase()==='r')view('perspective');else return;event.preventDefault();controls.update();
  });
  function theme(mode){
    const dark=mode==='dark',oled=mode==='oled';
    scene.background.set(oled?'#000000':dark?'#242424':'#e8e8e6');
    floor.material.color.set(oled?'#000000':dark?'#303030':'#e3e3e0').convertSRGBToLinear();
    floor.visible=!oled;
    grid.material.opacity=oled?.055:dark?.13:.3;
  }
  return {load,siteBounds,loadContext:mesh=>load(mesh,context),contextVisible:value=>{context.visible=value;siteLines.visible=value;},position:offset=>building.position.fromArray(offset),view,frame,fit,lighting,gridVisible:value=>{grid.visible=value;},presentation:()=>({lighting:lightingMode,grid:grid.visible}),select,differences,pick,png,theme,hide:()=>{building.visible=false;},show:()=>{building.visible=true;},
    camera:()=>[...camera.position.toArray(),...controls.target.toArray()],metrics:()=>({frames,elapsed:performance.now()-started,triangles:renderer.info.render.triangles})};
}
