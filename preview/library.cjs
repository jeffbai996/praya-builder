const {planKit}=require('./plan-kit.cjs');
function library(){
  const {plan,component,clearance}=planKit('civic-reading-room','Civic Reading Room',
    'A neighbourhood library pavilion: double-height reading hall, glazed frontage, rooflights and a sheltered civic forecourt.');
  component('site','Public forecourt, approach and planted perimeter',(box,block)=>{
    box([0,0,0],[32,1,32],'grass');box([1,0,1],[31,1,9],'stone');
    box([2,0,9],[4,1,28],'stone');box([28,0,9],[30,1,28],'stone');
    for(let x=3;x<30;x+=4)block([x,0,2],'light');
  });
  component('hall','Double-height glazed reading hall and rooflights',(box)=>{
    box([4,1,9],[28,2,27],'pale');box([5,1,10],[27,2,26],'floor');
    box([14,1,8],[18,2,9],'stair');
    box([4,2,9],[28,8,10],'glass');box([4,2,26],[28,8,27],'dark');
    for(const x of [4,27])box([x,2,10],[x+1,8,26],'pale');
    for(const x of [4,10,21,27])box([x,2,9],[x+1,8,10],'wood');
    box([14,2,9],[18,6,10],'air');
    for(const x of [4,27])box([x,3,12],[x+1,7,22],'glass');
    box([6,3,26],[14,7,27],'glass');box([19,3,26],[26,7,27],'glass');
    box([3,8,8],[29,9,28],'pale');box([13,8,15],[23,9,23],'glass');
    for(const z of [15,19,23])box([12,8,z],[24,9,z+1],'pale');
    box([5,9,18],[11,10,25],'soil');box([5,10,18],[11,11,25],'leaves');
  });
  component('portico','Thin entrance canopy and sheltered civic threshold',(box)=>{
    box([3,6,5],[29,7,9],'slab');
    for(const x of [4,27])box([x,1,6],[x+1,6,7],'dark');
    box([7,5,8],[12,6,9],'light');box([20,5,8],[25,6,9],'light');
  });
  component('collection','Book stacks, reception desk and quiet reading bays',(box)=>{
    for(const x of [6,10])for(const z of [14,20])box([x,2,z],[x+1,5,z+4],'books');
    box([19,2,12],[25,3,13],'wood');box([24,3,12],[25,4,13],'light');
    for(const x of [17,23])for(const z of [17,23]){
      box([x,2,z],[x+3,3,z+2],'slab');box([x,2,z+2],[x+3,3,z+3],'seat');
    }
  });
  component('landscape','Forecourt seats and low planting beds',(box)=>{
    for(const x of [4,22]){box([x,1,3],[x+6,2,5],'dark');box([x,2,3],[x+6,3,5],'leaves');}
    box([7,1,7],[12,2,8],'seat');box([20,1,7],[25,2,8],'seat');
    box([2,1,16],[3,4,23],'leaves');box([29,1,16],[30,4,23],'leaves');
  });
  clearance('public-entry',[14,2,8],[18,5,14]);
  clearance('central-reading-aisle',[14,2,14],[17,5,26]);
  return plan;
}
module.exports={library};
