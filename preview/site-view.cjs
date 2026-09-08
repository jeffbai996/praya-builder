// Presentation only: the immutable survey remains authoritative for assessment.
function siteView(site,depth='full'){
 if(!['surface','full'].includes(depth))throw Error('Unknown survey depth view');
 const tops=new Map();for(const c of site.blocks){const key=c.x+','+c.z;tops.set(key,Math.max(tops.get(key)??-1,c.y));}
 const surfaceY=tops.size?Math.max(0,Math.min(...tops.values())-3):0;
 const floor=depth==='surface'?surfaceY:0;
 return {floor,surfaceY,blocks:site.blocks.filter(c=>c.y>=floor)};
}
module.exports={siteView};
