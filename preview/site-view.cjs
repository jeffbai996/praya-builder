const {transformCells}=require('./sites.cjs');
// Presentation only: the immutable survey remains authoritative for assessment.
function siteView(site,depth='full',candidate=null,transform=null){
 if(!['surface','full'].includes(depth))throw Error('Unknown survey depth view');
 const tops=new Map();for(const c of site.blocks){const key=c.x+','+c.z;tops.set(key,Math.max(tops.get(key)??-1,c.y));}
 const surfaceY=tops.size?Math.max(0,Math.min(...tops.values())-3):0;
 const floor=depth==='surface'?surfaceY:0;
 const written=candidate?new Set(transformCells(candidate,transform).map(c=>`${c.x-site.origin[0]},${c.y-site.origin[1]},${c.z-site.origin[2]}`)):new Set();
 const blocks=site.blocks.filter(c=>c.y>=floor&&!written.has(`${c.x},${c.y},${c.z}`));
 return {floor,surfaceY,blocks,replacedCells:site.blocks.filter(c=>written.has(`${c.x},${c.y},${c.z}`)).length};
}
module.exports={siteView};
