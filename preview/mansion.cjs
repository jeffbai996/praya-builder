const {planKit}=require('./plan-kit.cjs');
const {furniturePalette,furniture}=require('./furniture-kit.cjs');
const {northLettering}=require('./block-lettering.cjs');

function mansion(){
  const {plan,component,clearance}=planKit('braemar-frame-house','Braemar Frame House',
    'A broad framed garden house with recessed smoked glazing, a double-height dining hall, three bedrooms and a furnished roof pavilion.');
  plan.dimensions={x:44,y:24,z:40};
  plan.references=['braemar-mansion-user-reference'];
  furniturePalette(plan);
  Object.assign(plan.palette,{
    smokedEW:'minecraft:gray_stained_glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]',
    smokedNS:'minecraft:gray_stained_glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]',
    clearNS:'minecraft:glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]',
    water:'minecraft:water[level=0]',deck:'minecraft:dark_oak_planks',
    path:'minecraft:polished_andesite',tile:'minecraft:polished_diorite',
  });
  component('site','landscape',(box,block)=>{
    box([0,0,0],[44,1,40],'grass');
    box([18,0,0],[25,1,13],'path');box([3,0,34],[42,1,38],'path');
    box([41,0,8],[44,1,38],'path');
    for(const x of [2,15,26,41])for(const z of [5,36])block([x,0,z],'light');
    for(const [a,b] of [[2,17],[26,42]]){
      box([a,1,1],[b,2,2],'dark');
      for(let x=a;x<b;x+=4){box([x,1,1],[x+1,4,2],'pale');block([x,3,1],'light');}
      box([a,2,2],[b,3,3],'leaves');
    }
    for(const [x,z] of [[4,7],[13,6],[4,36],[38,37]]){
      box([x,1,z],[x+1,5,z+1],'wood');box([x-1,4,z-1],[x+2,6,z+2],'leaves');
    }
    box([6,1,5],[11,2,6],'seat');
  });
  component('envelope','structure',(box,block)=>{
    const footprints=[[5,11,16,34],[16,12,27,34],[27,9,40,34]];
    for(const [x,z,xx,zz] of footprints)box([x,1,z],[xx,2,zz],'floor');
    // Keep the two storeys open above the dining room and both stair flights.
    for(const y of [7,13]){
      box([5,y,11],[16,y+1,34],'floor');box([27,y,9],[40,y+1,34],'floor');
      for(let x=16;x<27;x++)for(let z=y===7?26:12;z<34;z++)
        if(!(x>=20&&x<23&&z>=26&&z<32))block([x,y,z],y===13?'deck':'floor');
    }
    // The outer frame is separate from recessed glazing, leaving deep reveals.
    box([4,13,10],[17,14,35],'pale');
    box([14,13,6],[42,14,11],'pale');box([40,1,6],[42,14,11],'pale');
    box([39,13,10],[42,14,35],'pale');box([4,13,34],[42,14,35],'pale');
    box([4,1,10],[6,14,12],'dark');box([4,1,33],[6,14,35],'dark');
    box([5,2,12],[6,13,33],'dark');
    for(const y of [3,9])box([5,y,14],[6,y+3,31],'smokedNS');
    for(const [x,z,xx] of [[6,11,16],[27,9,40]]){
      box([x,2,z],[xx,13,z+1],'dark');
      for(const y of [3,9])box([x+1,y,z],[xx-1,y+3,z+1],'smokedEW');
      box([x,7,z-1],[xx,8,z+1],'pale');
      for(let xx1=x+2;xx1<xx-1;xx1+=4)box([xx1,2,z+1],[xx1+1,7,z+2],'wood');
    }
    box([39,2,10],[40,13,34],'dark');
    for(const y of [3,9])box([39,y,12],[40,y+3,32],'smokedNS');
    box([6,2,33],[39,13,34],'dark');
    for(const y of [3,9])box([7,y,33],[38,y+3,34],'smokedEW');
    // Garden-facing dining glass is intentionally clear for a view through the hall.
    box([16,2,12],[27,12,13],'railing');box([18,2,12],[24,5,13],'air');
    box([16,12,12],[27,13,13],'dark');
    box([16,8,13],[17,12,26],'smokedNS');box([26,8,13],[27,12,26],'smokedNS');
    box([16,12,13],[17,13,26],'dark');box([26,12,13],[27,13,26],'dark');
    // Transparent guard at the gallery edge; bedrooms open onto the rear bridge.
    box([17,8,26],[20,9,27],'railing');box([23,8,26],[26,9,27],'railing');
    box([30,8,11],[31,13,33],'pale');
    for(const z of [16,26])box([30,8,z],[31,11,z+3],'air');
    box([31,8,22],[39,13,23],'pale');
    box([6,8,24],[16,13,25],'pale');box([11,8,24],[14,11,25],'air');
    box([11,8,25],[12,13,33],'pale');box([11,8,28],[12,11,31],'air');
    box([27,2,23],[34,7,24],'pale');box([30,2,23],[32,5,24],'air');
    box([27,2,24],[28,7,33],'pale');box([33,2,24],[34,7,33],'pale');
    box([6,2,25],[16,7,26],'wood');box([11,2,25],[15,5,26],'air');
    for(const z of [14,22,30])for(const x of [7,37])block([x,6,z],'light');
    for(const z of [16,28])for(const x of [8,36])block([x,12,z],'light');
    // A small dark roof pavilion keeps the main silhouette low and horizontal.
    box([7,14,25],[18,19,26],'dark');box([8,15,25],[17,18,26],'smokedEW');
    box([7,14,26],[8,19,33],'dark');box([7,15,27],[8,18,32],'smokedNS');
    box([17,14,26],[18,19,33],'smokedNS');box([17,14,28],[18,17,31],'air');
    box([7,14,33],[18,19,34],'dark');
    box([6,19,24],[19,20,35],'dark');
    for(const [x,z,xx,zz] of [[5,11,16,12],[27,9,39,10],[39,11,40,33],[19,33,39,34]])
      box([x,14,z],[xx,15,zz],zz-z===1?'smokedEW':'smokedNS');
    box([28,14,30],[38,15,32],'dark');box([28,15,30],[38,16,32],'leaves');
    box([6,14,14],[8,15,22],'dark');box([6,15,14],[8,16,22],'leaves');
    box([28,14,11],[38,15,12],'dark');box([28,15,11],[38,16,12],'leaves');
    box([17,14,12],[27,15,13],'smokedEW');
    box([19,14,26],[20,15,32],'smokedNS');box([23,14,26],[24,15,31],'smokedNS');
  });
  component('stairs','circulation',(box)=>{
    for(let level=0;level<2;level++)for(let step=0;step<6;step++)
      box([20,2+level*6+step,26+step],[23,3+level*6+step,27+step],'stair');
  });
  component('living-room','furniture',(box,block)=>{
    const f=furniture(box,block);f.sofa(8,2,20,4);f.coffee(8,2,17);
    box([7,2,16],[12,3,19],'rug');f.coffee(8,2,17);
    box([7,2,13],[13,3,14],'wood');box([8,3,13],[12,5,14],'dark');
    block([7,3,13],'plant');block([12,3,13],'lamp');
    box([6,2,22],[8,5,24],'books');block([14,2,22],'wood');block([14,3,22],'lamp');
  });
  component('dining-hall','furniture',(box,block)=>{
    for(const z of [18,22])box([20,2,z],[23,3,z+1],'leg');
    box([20,3,18],[23,4,23],'table');block([21,4,20],'plant');
    for(const z of [18,20,22]){block([19,2,z],'chairWest');block([23,2,z],'chairEast');}
    for(const x of [19,24]){box([x,9,20],[x+1,13,21],'stem');block([x,8,20],'pendant');}
  });
  component('kitchen','furniture',(box,block)=>{
    const f=furniture(box,block);
    box([32,2,11],[38,3,13],'pale');box([32,4,11],[38,6,12],'wood');
    block([33,2,12],'cooker');f.basin(36,2,12);
    box([34,2,17],[38,3,19],'wood');box([34,3,17],[38,4,19],'table');
    for(const x of [34,36])block([x,2,20],'chairSouth');
    block([37,4,17],'plant');box([28,2,11],[30,5,13],'pale');
    box([28,2,13],[30,5,14],'cabinet');
  });
  component('study','furniture',(box,block)=>{
    const f=furniture(box,block);f.desk(7,2,27);f.wardrobe(7,2,31,3);
    box([14,2,27],[15,6,32],'books');
  });
  component('primary-suite','furniture',(box,block)=>{
    const f=furniture(box,block);f.bed(9,8,14);f.wardrobe(7,8,21,3);
    f.sofa(12,8,22,2);block([14,8,19],'table');block([14,9,19],'plant');
  });
  for(const [id,z] of [['bedroom-two',12],['bedroom-three',24]])
    component(id,'furniture',(box,block)=>{
      const f=furniture(box,block);f.bed(34,8,z);f.desk(33,8,z+6);
      f.wardrobe(31,8,z+7,2);
    });
  component('bathrooms','furniture',(box,block)=>{
    const f=furniture(box,block);
    for(const [x,y,z] of [[7,8,27],[28,2,25]]){
      f.basin(x,y,z);block([x+3,y,z],'cushion');block([x+3,y+1,z-1],'pale');
      box([x,y,z+3],[x+4,y+1,z+5],'tile');
      box([x+3,y+1,z+3],[x+4,y+4,z+5],'clearNS');
      block([x,y+2,z+4],'tap');block([x,y+2,z+3],'pale');
    }
  });
  component('utility-room','furniture',(box,block)=>{
    const f=furniture(box,block);f.wardrobe(35,2,31,3);
    box([35,2,25],[38,3,27],'pale');block([35,2,26],'cooker');
    block([37,3,25],'plant');box([35,4,25],[38,5,26],'wood');
  });
  component('roof-lounge','furniture',(box,block)=>{
    const f=furniture(box,block);f.sofa(10,14,31,4);f.coffee(11,14,28);
    box([9,14,27],[15,15,30],'rug');f.coffee(11,14,28);
    block([9,14,31],'armEast');block([15,14,32],'wood');block([15,15,32],'lamp');
    box([28,14,25],[32,15,26],'wood');block([29,14,25],'cooker');
    f.sofa(30,14,21,4);f.coffee(30,14,18);
    for(const x of [30,35])block([x,14,28],'lamp');
  });
  component('pool','landscape',(box,block)=>{
    box([28,1,3],[39,2,8],'pale');box([29,1,4],[38,2,7],'water');
    for(const x of [29,37])block([x,1,3],'light');
    box([25,1,4],[26,2,7],'slab');block([25,1,7],'cushion');
  });
  component('entrance-marker','signage',(box,block)=>{
    box([15,1,4],[18,6,5],'dark');northLettering(block,'1',17,4,3,'pale');
    box([15,6,3],[18,7,5],'slab');
  });
  clearance('entry-walk',[19,2,8],[24,5,14]);
  clearance('upper-gallery',[23,8,28],[26,11,32]);
  return plan;
}
module.exports={mansion};
