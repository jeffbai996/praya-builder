const {planKit}=require('./plan-kit.cjs');
function clinic(){
  const {plan,component,clearance}=planKit('garden-medical-clinic','Garden Medical Clinic',
    'A neighbourhood clinic with two exam rooms, treatment suite, reception, staff facilities and a sheltered garden forecourt. Pale frames, charcoal fins and a cyan medical cross translate the Braemar reference into a smaller institution.');
  Object.assign(plan.palette,{cyan:'minecraft:cyan_concrete',mint:'minecraft:light_blue_concrete',
    tile:'minecraft:polished_diorite',vent:'minecraft:chiseled_stone_bricks',
    sink:'minecraft:cauldron',flower:'minecraft:potted_poppy',screen:'minecraft:black_concrete'});
  component('site','Paved approach, drop-off edge and perimeter garden',(box,block)=>{
    box([0,0,0],[32,1,32],'grass');box([1,0,1],[31,1,7],'stone');
    box([12,0,7],[22,1,9],'stone');box([29,0,8],[31,1,30],'stone');
    for(const x of [3,9,15,21,27])block([x,0,2],'light');
    box([13,1,7],[20,2,8],'stair');
  });
  component('envelope','Glazed reception, privacy windows, pale roof frame and medical marker',(box)=>{
    box([3,1,8],[29,2,29],'tile');
    box([14,1,16],[18,2,28],'mint');
    box([3,2,8],[29,8,9],'glass');box([3,2,28],[29,8,29],'pale');
    for(const x of [3,28]){
      box([x,2,9],[x+1,8,28],'pale');
      for(const z of [11,17,24])box([x,4,z],[x+1,7,z+3],'glass');
    }
    for(const x of [3,10,21,28])box([x,2,8],[x+1,8,9],'dark');
    box([14,2,8],[19,6,9],'air');
    box([2,8,7],[30,9,30],'pale');
    for(const z of [10,14])box([15,8,z],[19,9,z+2],'glass');
    box([4,9,9],[11,12,11],'dark');box([6,9,8],[8,12,9],'cyan');
    box([5,10,8],[9,11,9],'cyan');
    for(const x of [5,10,21,26])box([x,7,9],[x+1,8,14],'light');
    for(const x of [2,29])for(const z of [10,15,22,27])box([x,1,z],[x+1,8,z+1],'dark');
  });
  component('partitions','Patient corridor, four care bays and staff washroom division',(box)=>{
    box([4,2,15],[28,7,16],'pale');box([14,2,15],[18,7,16],'air');
    for(const x of [13,18]){
      box([x,2,16],[x+1,7,28],'pale');
      for(const z of [18,25])box([x,2,z],[x+1,5,z+2],'air');
    }
    box([4,2,22],[13,7,23],'pale');box([19,2,22],[28,7,23],'pale');
    box([23,2,23],[24,7,28],'pale');box([23,2,25],[24,5,27],'air');
    for(const x of [11,20])for(const z of [17,24])box([x,4,z],[x+1,5,z+1],'cyan');
  });
  component('reception','Reception counter, records, waiting benches and check-in screen',(box,block)=>{
    box([21,2,11],[27,3,13],'wood');box([21,3,11],[27,4,12],'slab');
    block([25,4,11],'screen');box([24,2,13],[26,3,14],'seat');
    box([23,2,14],[27,5,15],'books');
    for(const z of [10,13])box([6,2,z],[11,3,z+1],'seat');
    box([11,2,11],[12,3,13],'slab');block([11,3,11],'flower');
  });
  component('exam-rooms','Two furnished consultation rooms with exam couches, sinks and worktops',(box,block)=>{
    for(const z of [16,23]){
      box([6,2,z+1],[8,3,z+4],'pale');box([6,3,z+1],[8,4,z+3],'mint');
      box([9,2,z],[12,3,z+1],'wood');block([11,3,z],'screen');
      block([5,2,z+4],'sink');box([10,2,z+4],[12,3,z+5],'seat');
    }
  });
  component('treatment','Treatment couch, privacy screen, supply cabinets and wash station',(box,block)=>{
    box([24,2,17],[26,3,21],'pale');box([24,3,17],[26,4,20],'mint');
    box([27,2,17],[28,5,21],'white');block([20,2,16],'sink');
    box([21,2,16],[24,3,17],'wood');box([22,3,20],[23,5,22],'glass');
  });
  component('staff-washrooms','Staff kitchenette, lockers and separate washroom fixtures',(box,block)=>{
    box([19,2,27],[23,3,28],'wood');block([19,3,27],'sink');
    box([19,2,23],[22,5,24],'white');box([21,2,24],[23,3,25],'seat');
    block([26,2,27],'stair');block([27,2,24],'sink');
  });
  component('entrance-canopy','Sheltered threshold with timber soffit and lighting',(box)=>{
    box([12,6,5],[22,7,8],'dark');box([13,6,5],[21,7,7],'wood');
    box([14,5,7],[20,6,8],'light');
  });
  component('roof-services','Screened ventilation plant, service walkway and green roof',(box)=>{
    box([18,9,20],[28,10,28],'stone');
    for(const x of [19,24]){box([x,10,22],[x+3,12,25],'dark');box([x,12,22],[x+3,13,25],'vent');}
    box([17,9,19],[29,12,20],'wood');box([28,9,20],[29,12,29],'wood');
    box([5,9,17],[11,10,27],'soil');box([5,10,17],[11,11,27],'leaves');
  });
  component('landscape','Garden seating, flowering borders and low perimeter planting',(box,block)=>{
    for(const x of [3,23]){box([x,1,4],[x+6,2,6],'dark');box([x,2,4],[x+6,3,6],'leaves');block([x+2,3,4],'flower');}
    box([4,1,6],[10,2,7],'seat');box([24,1,6],[28,2,7],'seat');
    box([1,1,10],[2,3,28],'leaves');box([3,1,30],[28,3,31],'leaves');
  });
  for(const [id,min,max] of [
    ['entry',[14,2,8],[19,5,11]],['patient-corridor',[14,2,16],[18,5,28]],
    ['exam-one-access',[10,2,18],[14,4,20]],['exam-two-access',[10,2,25],[14,4,27]],
    ['treatment-access',[18,2,18],[22,4,20]],['staff-access',[18,2,25],[21,4,27]],
    ['washroom-access',[23,2,25],[27,4,27]],
  ])clearance(id,min,max);
  return plan;
}
module.exports={clinic};
