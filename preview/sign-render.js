import * as THREE from '/vendor/three/build/three.module.js';
let font;
export function signFont(){return font??=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data,cell=image.width/16,widths=[];for(let code=0;code<128;code++){let right=-1;for(let x=0;x<cell;x++)for(let y=0;y<cell;y++)if(pixels[((Math.floor(code/16)*cell+y)*image.width+(code%16)*cell+x)*4+3])right=Math.max(right,x);widths[code]=code===32?3:Math.ceil((right+1)*8/cell);}resolve({image,cell,widths});};image.onerror=()=>{font=null;reject(Error('Minecraft sign font could not load'));};image.src='/sign-font.png';});}
export async function signCanvas(lines){
 const {image,cell,widths}=await signFont(),canvas=document.createElement('canvas');canvas.width=96;canvas.height=48;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(const [row,line] of lines.slice(0,4).entries()){
  const glyphs=[];let width=0;for(const c of line){const n=c.codePointAt(0),code=n>=32&&n<127?n:63,advance=widths[code]+1;if(width+advance>90)break;glyphs.push(code);width+=advance;}
  let x=Math.floor((96-width)/2);ctx.save();ctx.beginPath();ctx.rect(3,0,90,48);ctx.clip();
  for(const code of glyphs){ctx.drawImage(image,(code%16)*cell,Math.floor(code/16)*cell,cell,cell,x,4+row*10,8,8);x+=widths[code]+1;}ctx.restore();
 }
 // Authored signs are exported and placed with black, non-glowing text.
 ctx.globalCompositeOperation='source-in';ctx.fillStyle='#000000';ctx.fillRect(0,0,96,48);return canvas;
}
export async function signObject(sign){
 const map=new THREE.CanvasTexture(await signCanvas(sign.lines));map.magFilter=map.minFilter=THREE.NearestFilter;map.generateMipmaps=false;
 const object=new THREE.Mesh(new THREE.PlaneGeometry(1,.5),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
 const facing=/facing=(north|south|east|west)/.exec(sign.block)?.[1]||'north';const [x,y,z]=sign.at;object.position.set(x+.5,y+.5,z+.5);
 if(facing==='north'){object.position.z=z+.873;object.rotation.y=Math.PI;}
 if(facing==='south')object.position.z=z+.127;
 if(facing==='east'){object.position.x=x+.127;object.rotation.y=Math.PI/2;}
 if(facing==='west'){object.position.x=x+.873;object.rotation.y=-Math.PI/2;}
 object.userData.sign=true;return object;
}
