const {planKit}=require('./plan-kit.cjs');

function braemarClinic(){
  const {plan,component,clearance}=planKit('braemarhealth-hillside-clinic','BraemarHealth Hillside Clinic',
    'A three-storey clinic study informed by the Braemar Hills Medical Center reference: illuminated charcoal entrance tower, projecting glazed care wing, pale slab edges, cyan-and-lime medical cross and a planted urban forecourt.');
  plan.dimensions.y=32;
  plan.references=['braemar-hills-medical-center'];
  Object.assign(plan.palette,{cyan:'minecraft:cyan_concrete',lime:'minecraft:lime_concrete',
    tile:'minecraft:polished_diorite',brick:'minecraft:deepslate_bricks',
    sink:'minecraft:cauldron',screen:'minecraft:black_concrete',bed:'minecraft:light_blue_wool',
    flower:'minecraft:potted_poppy',vent:'minecraft:chiseled_stone_bricks',
    hanger:'minecraft:iron_bars[east=false,north=false,south=false,waterlogged=false,west=false]',beacon:'minecraft:redstone_torch[lit=true]',
    rod:'minecraft:end_rod[facing=up]',strip:'minecraft:end_rod[facing=east]',door:'minecraft:iron_trapdoor[facing=north,half=bottom,open=true,powered=false,waterlogged=false]'});
  component('site','Illuminated pavement, level entrance approach and planted plot',(box,block)=>{
    box([0,0,0],[32,1,32],'grass');box([1,0,1],[31,1,7],'stone');
    box([1,0,7],[4,1,29],'stone');box([29,0,7],[31,1,29],'stone');
    box([7,1,4],[13,2,6],'stair');
    for(const x of [3,9,15,21,27])block([x,0,2],'light');
    box([4,0,28],[29,1,30],'stone');
  });
  component('envelope','Dark lower bays and two projecting glass wings with pale horizontal slab edges',(box)=>{
    for(let n=0;n<3;n++){
      const f=1+n*6,front=n===2?5:8;
      // Deck openings leave continuous headroom above the rear stair flights.
      for(let z=front;z<27;z++){
        if(n===2&&z<8){box([4,f,z],[7,f+1,z+1],'tile');box([13,f,z],[29,f+1,z+1],'tile');}
        else if(n&&z>=18&&z<24){box([4,f,z],[6,f+1,z+1],'tile');box([9,f,z],[29,f+1,z+1],'tile');}
        else box([4,f,z],[29,f+1,z+1],'tile');
      }
      for(const [lo,hi] of n===2?[[4,7],[13,29]]:[[4,29]])box([lo,f+1,front],[hi,f+6,front+1],'glass');
      box([4,f+1,26],[29,f+6,27],'brick');
      for(const x of [4,28]){
        box([x,f+1,front+1],[x+1,f+6,26],'brick');
        for(const z of [10,16,22])box([x,f+2,z],[x+1,f+5,z+3],'glass');
      }
      for(const x of [4,14,28])box([x,f+1,front],[x+1,f+6,front+1],'dark');
      for(const x of [17,21,25])box([x,f+1,front],[x+1,f+6,front+1],'railing');
      for(const [lo,hi] of n===2?[[4,7],[13,29]]:[[4,29]])box([lo,f+5,front],[hi,f+6,front+1],'pale');
      if(n===0)box([8,2,8],[13,6,9],'air');
      // Clinical rooms share a generous central corridor behind the public lounge.
      box([18,f+1,16],[19,f+5,26],'pale');
      for(const z of [18,23])box([18,f+1,z],[19,f+4,z+2],'air');
      box([19,f+1,21],[28,f+5,22],'pale');
      box([19,f+1,16],[28,f+5,17],'pale');
      for(const x of [21,25])box([x,f+3,16],[x+2,f+5,17],'glass');
      for(const x of [10,16,23])box([x,f+5,12],[x+1,f+6,15],'light');
    }
    box([3,7,7],[7,8,8],'pale');box([13,7,7],[30,8,8],'pale');box([14,13,4],[30,14,5],'pale');
    box([3,19,4],[7,20,8],'slab');box([13,19,4],[30,20,8],'slab');box([3,19,8],[30,20,28],'slab');
    for(const x of [15,18,21,24,27]){
      box([x,2,7],[x+1,7,8],'dark');
      box([x,5,6],[x+1,6,7],'pale');
      box([x,2,6],[x+1,3,7],'light');
    }
  });
  component('entrance-tower','Tall recessed glass shaft, luminous frame and sheltered entrance portal',(box,block)=>{
    box([7,1,6],[13,2,8],'tile');
    box([7,2,6],[13,23,7],'dark');
    box([9,2,6],[12,6,7],'air');
    for(const x of [7,12])box([x,2,7],[x+1,23,8],'dark');
    box([8,8,5],[9,21,6],'rod');box([11,8,5],[12,21,6],'rod');
    box([8,8,5],[12,9,6],'strip');box([8,20,5],[12,21,6],'strip');
    box([9,9,6],[11,20,7],'glass');
    for(const y of [10,14,18])box([9,y,5],[11,y+1,6],'door');
    box([6,6,3],[14,7,7],'dark');box([8,5,4],[12,6,5],'light');
    box([6,23,5],[14,24,12],'dark');
    box([7,24,7],[13,25,11],'dark');box([7,25,7],[13,26,11],'leaves');
    for(const x of [6,13])block([x,24,5],'beacon');
  });
  component('stairs','Three-block-wide stair flights and unobstructed side landings',(box)=>{
    for(let n=0;n<2;n++)for(let i=0;i<6;i++)box([6,2+n*6+i,18+i],[9,3+n*6+i,19+i],'stair');
  });
  component('reception','Check-in desk, records wall, waiting groups and public information screen',(box,block)=>{
    box([21,2,10],[27,3,12],'wood');box([21,3,10],[27,4,11],'slab');
    block([25,4,10],'screen');box([24,2,13],[27,5,14],'books');
    for(const z of [11,14])box([5,2,z],[9,3,z+1],'seat');
    box([12,2,13],[15,3,14],'seat');block([13,2,11],'slab');block([13,3,11],'flower');
    box([5,3,16],[6,5,18],'screen');
  });
  component('consultation','Ground and middle-floor exam suites with couches, basins and clinician desks',(box,block)=>{
    for(const y of [2,8])for(const z of [17,22]){
      box([24,y,z+1],[26,y+1,z+4],'pale');box([24,y+1,z+1],[26,y+2,z+3],'bed');
      box([20,y,z],[23,y+1,z+1],'wood');block([21,y+1,z],'screen');block([27,y,z+1],'sink');
      block([20,y,z+3],'seat');
    }
    for(const x of [11,22])box([x,8,10],[x+4,9,11],'seat');
    box([24,8,13],[27,9,14],'wood');block([25,9,13],'flower');
  });
  component('treatment','Upper procedure and recovery rooms, observation desks and patient lounge',(box,block)=>{
    for(const z of [17,22]){
      box([24,14,z+1],[26,15,z+4],'pale');box([24,15,z+1],[26,16,z+3],'bed');
      block([27,14,z+1],'sink');box([20,14,z],[23,15,z+1],'wood');block([21,15,z],'screen');
      box([27,14,z+2],[28,17,z+4],'white');
    }
    for(const x of [15,22])box([x,14,8],[x+4,15,9],'seat');
    box([24,14,12],[27,15,14],'wood');block([25,15,12],'flower');
  });
  component('staff-facilities','Stacked enclosed washrooms, staff pantry and supply cupboards',(box,block)=>{
    for(const y of [2,8,14]){
      box([11,y,20],[12,y+4,26],'pale');box([12,y,20],[16,y+4,21],'pale');
      box([15,y,21],[16,y+4,26],'pale');box([15,y,22],[16,y+3,24],'air');
      block([12,y,25],'stair');block([14,y,25],'sink');
      box([5,y,25],[6,y+3,26],'white');
      box([11,y,17],[15,y+1,18],'wood');block([12,y+1,17],'sink');
    }
  });
  component('medical-sign','Cyan-and-lime cross mounted ahead of the upper curtain wall',(box)=>{
    box([23,15,3],[25,20,4],'cyan');box([21,16,3],[25,18,4],'cyan');
    box([25,16,3],[29,18,4],'lime');box([25,14,3],[27,18,4],'lime');
    // Iron bars retain a slim hanger in both renderer and export registries.
    for(const x of [16,29])box([x,14,4],[x+1,19,5],'hanger');
  });
  component('roof-services','Screened mechanical plant, access housing and rooftop communications mast',(box,block)=>{
    box([15,20,17],[27,21,25],'stone');
    for(const x of [17,23]){box([x,21,19],[x+3,23,23],'dark');box([x,23,19],[x+3,24,23],'vent');}
    box([15,21,16],[28,23,17],'dark');box([27,21,17],[28,23,26],'dark');
    box([19,20,10],[22,22,13],'pale');box([20,22,11],[21,29,12],'pale');
    box([16,24,11],[25,25,12],'brick');box([20,26,10],[21,27,11],'light');
    block([20,29,11],'beacon');box([23,25,11],[24,28,12],'rod');
  });
  component('landscape','Planted forecourt, benches, mature side trees and upper terrace planters',(box,block)=>{
    for(const [x,z] of [[2,10],[2,22],[30,18]]){
      box([x,1,z],[x+1,5,z+1],'wood');box([x-1,5,z-1],[x+2,7,z+2],'leaves');
    }
    box([16,1,4],[28,2,5],'wood');box([16,2,4],[28,3,5],'leaves');
    box([17,1,3],[23,2,4],'seat');
    box([5,1,29],[27,2,31],'dark');box([5,2,29],[27,3,31],'leaves');
    for(const x of [6,14,25])block([x,3,29],'flower');
    box([15,8,6],[28,9,7],'dark');box([15,9,6],[28,10,7],'leaves');
  });
  clearance('entrance',[9,2,6],[12,5,10]);
  for(const [floor,y] of [[1,2],[2,8],[3,14]]){
    clearance(`level-${floor}-corridor`,[16,y,10],[18,y+3,26]);
    clearance(`level-${floor}-front-care-access`,[18,y,18],[23,y+2,20]);
    clearance(`level-${floor}-rear-care-access`,[18,y,23],[23,y+2,25]);
    clearance(`level-${floor}-landing`,[9,y,18],[11,y+2,26]);
  }
  return plan;
}
module.exports={braemarClinic};
