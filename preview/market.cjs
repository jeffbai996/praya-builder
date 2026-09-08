const {planKit}=require('./plan-kit.cjs');
function market(){
  const {plan,component,clearance}=planKit('go-corner-market','Go Corner Market',
    'An Amazon Go-inspired neighbourhood market: open entry gates, chilled-food wall, stocked gondolas, coffee counter, stockroom and loading lane. Original green branding, brick piers and a timber-lined canopy.');
  Object.assign(plan.palette,{brand:'minecraft:lime_terracotta',brick:'minecraft:bricks',
    tile:'minecraft:polished_andesite',vent:'minecraft:chiseled_stone_bricks',
    crate:'minecraft:barrel[facing=up,open=false]',coffee:'minecraft:smoker[facing=north,lit=false]',
    yellow:'minecraft:yellow_terracotta',red:'minecraft:red_terracotta',screen:'minecraft:black_concrete'});
  component('site','Pedestrian frontage and separate side loading lane',(box,block)=>{
    box([0,0,0],[32,1,32],'grass');box([1,0,1],[31,1,8],'stone');
    box([29,0,8],[32,1,31],'tile');box([23,0,28],[31,1,31],'tile');
    for(const x of [3,9,15,21,27])block([x,0,2],'light');
    box([14,1,8],[18,2,9],'stair');
  });
  component('envelope','Brick piers, full-height glazing, brand fascia and loading opening',(box)=>{
    box([3,1,9],[29,2,28],'tile');
    box([3,2,9],[29,7,10],'glass');box([3,2,27],[29,7,28],'brick');
    for(const x of [3,28]){
      box([x,2,10],[x+1,7,27],'brick');box([x,3,11],[x+1,6,21],'glass');
    }
    for(const x of [3,10,21,28])box([x,2,9],[x+1,7,10],'brick');
    box([14,2,9],[18,6,10],'air');box([24,2,27],[27,5,28],'air');
    box([2,7,8],[30,8,29],'dark');box([3,8,9],[29,9,10],'brand');
    box([17,7,15],[25,8,19],'glass');
    box([14,8,8],[26,13,9],'brand');
    // The north-facing lettering reads left to right as world X decreases.
    box([24,8,7],[25,13,8],'white');box([20,12,7],[25,13,8],'white');
    box([20,8,7],[25,9,8],'white');box([20,8,7],[21,11,8],'white');
    box([20,10,7],[23,11,8],'white');
    box([15,8,7],[18,13,8],'white');box([16,9,7],[17,12,8],'air');
    for(const x of [6,12,18,24])box([x,6,11],[x+1,7,21],'light');
  });
  component('entry-gates','Open check-in portals with decorative scanner pedestals',(box,block)=>{
    for(const x of [13,18]){box([x,2,11],[x+1,3,13],'dark');block([x,3,11],'brand');}
    box([11,2,11],[12,4,13],'wood');block([11,4,11],'screen');
  });
  component('retail-shelves','Three stocked gondolas with contrasting products and end displays',(box,block)=>{
    for(const x of [8,14,20]){
      box([x,2,15],[x+2,3,21],'wood');
      for(const y of [3,5]){
        box([x,y,15],[x+2,y+1,21],'slab');
        for(let z=15;z<21;z++)block([x,y+1,z],['green','yellow','red'][z%3]);
      }
    }
    box([6,2,11],[9,3,13],'wood');box([6,3,11],[9,4,13],'green');
  });
  component('chilled-food','Lit chilled-food cabinets with glazed fronts and product shelves',(box)=>{
    box([4,2,13],[6,6,22],'white');box([5,3,13],[6,5,22],'glass');
    for(const z of [13,16,19]){
      box([4,3,z],[5,4,z+2],'green');box([4,4,z],[5,5,z+2],'yellow');
      box([4,5,z],[6,6,z+1],'light');
    }
    box([26,2,13],[28,5,18],'white');box([26,3,13],[27,5,18],'glass');
  });
  component('coffee-counter','Coffee equipment, preparation worktop and sheltered snack bar',(box,block)=>{
    box([24,2,19],[28,3,22],'wood');box([24,3,19],[28,4,20],'slab');
    block([27,3,21],'coffee');block([25,3,21],'screen');
    box([22,2,11],[27,3,12],'wood');box([23,2,12],[26,3,13],'seat');
  });
  component('stockroom','Rear service partition, open delivery passage and pallet storage',(box)=>{
    box([4,2,22],[28,7,23],'dark');box([24,2,22],[27,5,23],'air');
    for(const x of [5,10,16])box([x,2,24],[x+3,4,26],'crate');
    box([20,2,24],[22,3,27],'wood');
  });
  component('canopy','Deep timber soffit, thin fascia and frontage lighting',(box)=>{
    box([2,6,5],[30,7,9],'dark');box([3,6,5],[29,7,8],'wood');
    box([5,5,8],[11,6,9],'light');box([21,5,8],[27,6,9],'light');
    for(const x of [3,28])box([x,1,6],[x+1,6,7],'dark');
  });
  component('roof-services','Screened refrigeration plant and rooflight strip',(box)=>{
    box([5,8,21],[14,9,27],'stone');
    for(const x of [6,10]){box([x,9,22],[x+3,11,25],'dark');box([x,11,22],[x+3,12,25],'vent');}
    box([4,8,20],[15,11,21],'wood');box([4,8,21],[5,11,28],'wood');
    box([17,8,15],[25,9,19],'glass');
    box([20,9,23],[27,10,27],'soil');box([20,10,23],[27,11,27],'leaves');
  });
  component('landscape','Pocket seating terrace, cycle stands and planted street edge',(box)=>{
    for(const x of [6,23]){
      box([x,1,5],[x+2,2,7],'slab');box([x,1,7],[x+2,2,8],'seat');
      box([x,1,3],[x+4,2,4],'dark');box([x,2,3],[x+4,3,4],'leaves');
    }
    for(const x of [5,8,11])box([x,1,1],[x+1,2,2],'railing');
    box([1,1,11],[2,3,27],'leaves');
  });
  for(const [id,min,max] of [
    ['entry',[14,2,9],[18,5,14]],['aisle-one',[10,2,15],[13,4,22]],
    ['aisle-two',[16,2,15],[19,4,22]],['aisle-three',[22,2,15],[24,4,22]],
    ['delivery-route',[24,2,22],[27,5,28]],['cross-aisle',[6,2,14],[26,4,15]],
  ])clearance(id,min,max);
  return plan;
}
module.exports={market};
