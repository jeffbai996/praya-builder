// A compact plan view edits frontage and full-height protected columns.
export function plotEditor({svg,readBounds,onChange}){
 const ns='http://www.w3.org/2000/svg';let frontage=null,protectedAreas=[],mode='frontage',anchor=null;
 function shape(tag,attributes){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attributes))e.setAttribute(k,v);svg.append(e);return e;}
 function render(){
  const b=readBounds();svg.replaceChildren();if(!b)return;
  const w=b.max[0]-b.min[0],d=b.max[2]-b.min[2];svg.setAttribute('viewBox',`-2 -2 ${w+4} ${d+4}`);
  shape('rect',{x:0,y:0,width:w,height:d,fill:'var(--panel)',stroke:'currentColor','stroke-width':'.3'});
  for(const area of protectedAreas)shape('rect',{x:area.min[0]-b.min[0],y:area.min[2]-b.min[2],width:area.max[0]-area.min[0],height:area.max[2]-area.min[2],fill:'#b87d6a66',stroke:'#b87d6a','stroke-width':'.3'});
  const p=frontage||[Math.floor((b.min[0]+b.max[0])/2),b.min[2]];
  shape('circle',{cx:p[0]-b.min[0]+.5,cy:p[1]-b.min[2]+.5,r:.8,fill:'#54795f',stroke:'currentColor','stroke-width':'.2'});
  if(anchor)shape('circle',{cx:anchor[0]-b.min[0]+.5,cy:anchor[1]-b.min[2]+.5,r:.7,fill:'#b87d6a'});
 }
 function click(event){
  const b=readBounds();if(!b)return;const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const local=point.matrixTransform(svg.getScreenCTM().inverse());
  const x=b.min[0]+Math.floor(local.x),z=b.min[2]+Math.floor(local.y);if(x<b.min[0]||x>=b.max[0]||z<b.min[2]||z>=b.max[2])return;
  if(mode==='frontage')frontage=[x,z];
  else if(!anchor)anchor=[x,z];else{if(protectedAreas.length>=64){anchor=null;onChange('Protected-area limit reached.');return;}protectedAreas.push({min:[Math.min(x,anchor[0]),b.min[1],Math.min(z,anchor[1])],max:[Math.max(x,anchor[0])+1,b.max[1],Math.max(z,anchor[1])+1]});anchor=null;}
  render();onChange(mode==='frontage'?'Street entrance marked. Its height will come from the captured terrain.':anchor?'Choose the opposite corner of the protected area.':`${protectedAreas.length} protected areas marked.`);
 }
 svg.addEventListener('click',click);
 return {render,setMode(value){mode=value;anchor=null;render();},reset(){frontage=null;protectedAreas=[];anchor=null;render();},value(){const b=readBounds();return {frontage:frontage?[frontage[0],b.min[1]+1,frontage[1]]:undefined,frontageHeight:'terrain',protected:protectedAreas};}};
}
