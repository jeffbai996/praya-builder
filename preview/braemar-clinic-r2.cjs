const {braemarClinicR1}=require('./braemar-clinic-r1.cjs');
const {revisionKit}=require('./revision-kit.cjs');

function braemarClinicR2(){
  const plan=braemarClinicR1();
  const {edit,set}=revisionKit(plan,
    'A postmodern care building with a stepped entrance arch, warm masonry, a sculpted cornice and smoked glazing. The cyan-and-lime medical mark is the sole exterior identity; the three furnished care floors are retained.');
  plan.revision='r2';
  Object.assign(plan.palette,{brick:'minecraft:bricks',terra:'minecraft:terracotta',
    cream:'minecraft:smooth_quartz',cap:'minecraft:smooth_quartz_slab[type=top,waterlogged=false]'});
  plan.components=plan.components.filter(c=>!['clinic-lettering','identity-monument','signage-fascia','entrance-sign'].includes(c.id));
  // Keep the reference-aligned medical mark untouched; express identity in massing.
  const tower=plan.components.find(c=>c.id==='entrance-tower');
  tower.operations=tower.operations.filter(o=>{
    const p=o.min||o.at;
    return !['rod','strip','door'].includes(o.material)&&!(p[1]===6&&p[2]===3);
  });
  edit('entrance-tower',(box,block)=>{
    box([7,6,6],[13,23,7],'terra');
    box([9,8,6],[11,15,7],'clear_ew');
    // A small oculus replaces the long illuminated slit, with an opaque backing.
    const ring=['.CCC.','CC.CC','C...C','CC.CC','.CCC.'];
    ring.forEach((row,v)=>[...row].forEach((c,u)=>block([8+u,21-v,5],c==='C'?'cream':'smoke_ew')));
    box([6,23,5],[14,24,12],'cream');
    box([7,24,7],[13,25,11],'terra');
  });
  set('entry-portal','Stepped masonry arch and fluted low columns shelter the entrance',(box,block)=>{
    for(const x of [6,13]){
      box([x,1,2],[x+2,2,4],'cream');box([x,2,3],[x+2,7,5],'terra');
      box([x,6,2],[x+2,7,5],'cream');block([x,3,2],'rod');
    }
    box([7,7,3],[9,8,5],'cream');box([12,7,3],[14,8,5],'cream');
    box([8,8,3],[13,9,5],'cream');box([9,9,3],[12,10,5],'terra');
  });
  edit('envelope',(box)=>{
    for(const x of [15,18,21,28,31]){
      box([x,2,7],[x+1,7,8],'cream');box([x,5,6],[x+1,6,7],'terra');
    }
    for(const [y,z] of [[8,8],[14,5]])for(const x of [14,32])
      box([x,y,z],[x+1,y+5,z+1],'terra');
    box([14,12,7],[34,13,8],'cream');
    box([14,13,4],[34,14,5],'terra');
  });
  set('civic-cornice','Layered stone cornice with offset stepped shoulders',(box)=>{
    box([14,20,4],[34,21,8],'cream');
    box([14,21,5],[19,22,8],'terra');box([29,21,5],[34,22,8],'terra');
    box([15,22,5],[20,23,8],'cap');box([28,22,5],[33,23,8],'cap');
    box([16,21,7],[32,22,8],'dark');
  });
  set('roof-services','Low screened mechanical plant behind the architectural cornice',(box)=>{
    box([15,20,19],[31,21,27],'stone');
    for(const x of [17,25]){
      box([x,21,21],[x+3,23,25],'dark');box([x,23,21],[x+3,24,25],'vent');
    }
    box([15,21,18],[32,23,19],'terra');box([31,21,19],[32,23,28],'terra');
  });
  set('forecourt-garden','A planted seat replaces the removed wordmark monument',(box,block)=>{
    box([26,1,1],[34,2,3],'cream');box([27,2,1],[33,3,3],'leaves');
    for(const x of [26,33])block([x,2,1],'light');
  });
  return plan;
}
module.exports={braemarClinicR2};
