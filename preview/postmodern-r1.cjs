const {planKit}=require('./plan-kit.cjs');
const {furniturePalette,furniture}=require('./furniture-kit.cjs');
const {northLettering}=require('./block-lettering.cjs');

function postmodernR1(){
  const {plan,component,clearance}=planKit('rosedale-court','Rosedale Court',
    'Six residential storeys recast in the Praya language: charcoal masonry, deep pale frames, recessed smoked panes, brick accents and planted asymmetric terraces. Ten furnished studios and a penthouse share a continuous rear stair.');
  plan.revision='r1';plan.dimensions.y=32;
  plan.references=['braemar-common-user-reference','praya-netflix-building-user-reference'];
  furniturePalette(plan);
  Object.assign(plan.palette,{
    masonry:'minecraft:deepslate_bricks',brick:'minecraft:bricks',
    paneEW:'minecraft:gray_stained_glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]',
    paneNS:'minecraft:gray_stained_glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]',
    clearEW:'minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]',
    rooflight:'minecraft:gray_stained_glass',deck:'minecraft:dark_oak_planks',
    strip:'minecraft:end_rod[facing=east]',accent:'minecraft:red_terracotta',
  });
  const bounds=n=>n<4?[5,28,8]:n===4?[7,28,10]:[10,26,12];
  component('site','Inset path lighting, sheltered approach and garden edges',(box,block)=>{
    box([0,0,0],[32,1,32],'grass');box([1,0,1],[31,1,7],'stone');
    box([2,0,7],[4,1,30],'stone');box([29,0,7],[31,1,30],'stone');
    box([14,1,6],[19,2,8],'slab');
    for(const x of [3,9,15,21,27])block([x,0,2],'light');
    for(const z of [10,16,22,28]){block([2,0,z],'light');block([30,0,z],'light');}
  });
  component('envelope','Offset wings with recessed window walls and continuous six-level circulation',(box,block)=>{
    for(let n=0;n<6;n++){
      const f=1+n*4,[lo,hi,front]=bounds(n),[deckLo,deckHi,deckFront]=bounds(Math.max(0,n-1));
      for(let z=deckFront;z<27;z++){
        if(n&&z>=21&&z<25){box([deckLo,f,z],[14,f+1,z+1],'floor');box([17,f,z],[deckHi,f+1,z+1],'floor');}
        else box([deckLo,f,z],[deckHi,f+1,z+1],'floor');
      }
      box([lo,f+1,front],[hi,f+4,front+1],'paneEW');
      box([lo,f+1,26],[hi,f+4,27],'masonry');
      for(const x of [lo,hi-1]){
        box([x,f+1,front],[x+1,f+4,27],'masonry');
        for(const z of [14,19,23])box([x,f+1,z],[x+1,f+3,z+2],'paneNS');
      }
      box([14,f+1,front],[19,f+4,front+1],'brick');
      box([15,f+1,front],[18,f+3,front+1],'paneEW');
      for(const x of [lo+2,hi-4])box([x,f+1,26],[x+2,f+3,27],'paneEW');
      box([lo,f+3,front],[hi,f+4,front+1],'masonry');
      if(n<5)for(const x of [13,19]){
        box([x,f+1,front+1],[x+1,f+4,26],'pale');
        box([x,f+1,18],[x+1,f+3,20],'air');
      }
      // Door openings give the glazed balconies actual access, not sealed displays.
      if(n>0&&n<5)for(const x of [11,21])box([x,f+1,front],[x+1,f+3,front+1],'air');
      for(const x of [12,20])block([x,f+3,17],'light');
    }
    box([14,2,8],[19,5,9],'air');
    box([10,25,12],[26,26,27],'dark');box([14,25,21],[18,26,25],'rooflight');
  });
  component('stairs','Five stair flights and shared landings',(box)=>{
    for(let n=0;n<5;n++)for(let i=0;i<4;i++)box([14,2+n*4+i,21+i],[17,3+n*4+i,22+i],'stair');
  });
  component('residential-frame','Deep quartz outriggers and asymmetric vertical frames',(box)=>{
    box([4,1,7],[5,18,10],'pale');box([28,1,7],[29,26,10],'pale');
    box([4,17,7],[8,18,8],'pale');
    box([28,25,7],[29,26,13],'pale');box([10,25,10],[29,26,12],'pale');
    for(const [y,x,z] of [[18,6,10],[22,9,12]])box([x,y,z],[x+1,26,14],'pale');
    for(const n of [0,1,2,3,4]){
      const f=1+n*4,[lo,hi,front]=bounds(n);
      box([lo,f+3,front-1],[13,f+4,front],'pale');
      box([20,f+3,front-1],[hi,f+4,front],'pale');
    }
    box([5,5,4],[28,6,6],'dark');box([14,4,5],[19,5,6],'strip');
  });
  component('balconies','Smoked-pane balcony guards with integrated timber planters',(box)=>{
    for(let n=1;n<5;n++){
      const y=1+n*4,[lo,hi,front]=bounds(n);
      for(const [a,b] of [[lo+1,13],[20,hi-1]]){
        if(n<4)box([a,y,front-2],[b,y+1,front],'pale');
        box([a,y+1,front-2],[b,y+2,front-1],'paneEW');
        box([a,y+1,front-1],[a+1,y+2,front],'wood');
        box([a,y+2,front-1],[a+1,y+3,front],'leaves');
      }
    }
    box([8,22,13],[9,23,20],'wood');box([8,23,13],[9,24,20],'leaves');
    box([20,22,10],[25,23,11],'paneEW');
  });
  for(let n=0;n<6;n++){
    const y=2+n*4,[lo,hi,front]=bounds(n);
    component(`homes-${n+1}`,n===5?'Penthouse bedroom wings and shared living area':'Two studios with layered bedding, fitted storage and kitchenettes',(box,block)=>{
      const f=furniture(box,block);
      for(const x of [lo+2,hi-5]){
        f.bed(x,y,front+3);
        box([x,y,24],[x+3,y+1,26],'wood');block([x+1,y,25],'sink');
        block([x+2,y+1,24],'plant');
        f.sofa(x,y,20,2);block([x,y,22],'slab');
        block([x+2,y+1,25],'cabinet');
      }
      if(n===5){box([15,y,15],[18,y+1,16],'table');block([16,y+1,15],'plant');}
    });
    clearance(`level-${n+1}-landing`,[17,y,18],[19,y+2,25]);
  }
  component('roof-garden','A flat planted roof and light timber pergola replace the old crown',(box,block)=>{
    box([11,26,24],[25,27,26],'wood');box([11,27,24],[25,28,26],'leaves');
    for(const x of [11,24])box([x,26,14],[x+1,29,15],'wood');
    for(const z of [14,17,20])box([11,29,z],[25,30,z+1],'wood');
    box([11,28,14],[12,29,21],'wood');box([24,28,14],[25,29,21],'wood');
    box([14,26,14],[21,27,15],'seat');
    for(const x of [12,23])block([x,26,22],'lamp');
  });
  component('landscape','Dense low planting, street trees and residents seats',(box,block)=>{
    for(const x of [5,23]){
      box([x,1,3],[x+4,2,5],'dark');box([x,2,3],[x+4,3,5],'leaves');
    }
    box([5,1,28],[28,2,30],'dark');box([5,2,28],[28,3,30],'leaves');
    for(const [x,z] of [[1,10],[30,26]]){
      box([x,1,z],[x+1,5,z+1],'wood');box([x-1,5,z-1],[x+2,7,z+2],'leaves');
    }
    box([6,1,5],[11,2,6],'seat');
  });
  component('address-marker','A restrained block-built entrance numeral',(box,block)=>{
    box([20,1,3],[23,5,4],'dark');northLettering(block,'2',22,4,2,'pale');
  });
  return plan;
}
module.exports={postmodernR1};
