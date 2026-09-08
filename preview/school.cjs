const {planKit}=require('./plan-kit.cjs');
function school(){
  const {plan,component,clearance}=planKit('parkside-elementary','Parkside Elementary',
    'A compact two-storey school with four furnished classrooms, administration, canteen, upstairs resource room, washrooms and a protected play forecourt. Brick bays, pale structural frames and coloured wayfinding give it a civic Praya character.');
  Object.assign(plan.palette,{brick:'minecraft:bricks',blue:'minecraft:blue_terracotta',
    yellow:'minecraft:yellow_terracotta',red:'minecraft:red_terracotta',board:'minecraft:green_concrete',
    sink:'minecraft:cauldron',vent:'minecraft:chiseled_stone_bricks',sand:'minecraft:sand',
    fence:'minecraft:oak_fence[east=true,north=false,south=false,waterlogged=false,west=true]'});
  component('site','School approach, play surface and perimeter planting ground',(box,block)=>{
    box([0,0,0],[32,1,32],'grass');box([1,0,1],[31,1,10],'stone');
    box([13,0,10],[20,1,11],'stone');box([1,0,10],[3,1,31],'stone');
    for(const x of [3,9,15,21,27])block([x,0,2],'light');
    box([14,1,10],[19,2,11],'stair');
    box([4,0,4],[12,1,9],'blue');box([21,0,4],[28,1,9],'sand');
    for(let x=5;x<11;x+=2)box([x,0,5],[x+1,1,6],'yellow');
  });
  component('envelope','Two-storey brick classroom wings, recessed glazing and framed entrance',(box)=>{
    box([3,1,11],[29,2,30],'floor');
    // Floor strips leave a real stair opening: no overlapping air ownership.
    box([3,7,11],[29,8,21],'floor');box([3,7,21],[14,8,27],'floor');
    box([17,7,21],[29,8,27],'floor');box([3,7,27],[29,8,30],'floor');
    for(const y of [2,8]){
      box([3,y,11],[29,y+5,12],'brick');box([3,y,29],[29,y+5,30],'brick');
      for(const x of [3,28]){
        box([x,y,12],[x+1,y+5,29],'pale');
        for(const z of [14,18,25])box([x,y+1,z],[x+1,y+4,z+3],'glass');
      }
      for(const x of [5,9,21,25]){
        box([x,y+1,11],[x+2,y+4,12],'glass');
        box([x,y,10],[x+2,y+1,11],'slab');
      }
      box([14,y,11],[19,y+5,12],'glass');
      box([5,y+1,29],[12,y+4,30],'glass');box([21,y+1,29],[27,y+4,30],'glass');
      for(const x of [4,12,20,27])box([x,y,10],[x+1,y+5,11],'dark');
    }
    box([14,2,11],[19,6,12],'air');
    box([2,13,10],[30,14,31],'pale');
    box([13,13,22],[19,14,28],'glass');
    for(const x of [3,13,19,28])box([x,2,10],[x+1,13,11],'pale');
    box([2,7,10],[30,8,11],'pale');
    for(const y of [6,12])for(const x of [7,16,24])box([x,y,13],[x+1,y+1,21],'light');
    box([14,9,10],[15,12,11],'blue');box([16,9,10],[17,12,11],'yellow');
    box([18,9,10],[19,12,11],'red');
  });
  component('partitions','Classroom corridor and separate rear support rooms',(box)=>{
    for(const y of [2,8]){
      for(const x of [13,19]){
        box([x,y,12],[x+1,y+5,29],'pale');
        for(const z of [16,25])box([x,y,z],[x+1,y+3,z+3],'air');
      }
      box([4,y,22],[13,y+5,23],'pale');box([20,y,22],[28,y+5,23],'pale');
      box([12,y+2,14],[13,y+3,15],y===2?'yellow':'blue');
      box([20,y+2,14],[21,y+3,15],y===2?'red':'green');
    }
  });
  component('stairs','Three-block-wide staircase linking both levels with an open landing',(box)=>{
    for(let i=0;i<6;i++){
      box([14,2,21+i],[17,3+i,22+i],'pale');
      box([14,2+i,21+i],[17,3+i,22+i],'stair');
    }
    box([17,8,21],[18,9,27],'railing');
  });
  let room=0;
  for(const y of [2,8])for(const x of [4,20]){
    room++;
    component(`classroom-${room}`,'Classroom with six pupil desks, teaching wall and reading storage',(box,block)=>{
      box([x+1,y+1,12],[x+7,y+3,13],'board');
      box([x+1,y,13],[x+4,y+1,14],'wood');
      for(const dx of [1,4])for(const z of [15,18,20]){
        block([x+dx,y,z],'slab');block([x+dx,y,z+1],'seat');
      }
      box([x+7,y,19],[x+8,y+3,22],'books');
      box([x+1,y,21],[x+3,y+1,22],'yellow');
    });
    clearance(`classroom-${room}-aisle`,[x+6,y,16],[x+7,y+2,21]);
  }
  component('admin','Ground-floor reception, staff desk and records room',(box,block)=>{
    box([6,2,24],[10,3,25],'wood');box([6,3,24],[10,4,25],'slab');
    box([5,2,27],[9,3,28],'seat');box([11,2,24],[12,5,28],'books');
    block([6,3,27],'light');
  });
  component('canteen','Small canteen with serving counter, sink and shared table',(box,block)=>{
    box([21,2,28],[28,3,29],'wood');block([27,3,28],'sink');
    box([23,2,24],[26,3,26],'slab');box([23,2,26],[26,3,27],'seat');
    box([27,2,23],[28,5,25],'white');
  });
  component('washrooms','Upper-floor washroom with screened cubicles and sinks',(box,block)=>{
    for(const x of [5,8]){
      box([x,8,26],[x+1,11,29],'pale');block([x+1,8,28],'stair');
    }
    block([11,8,24],'sink');block([11,8,27],'sink');
  });
  component('resource-room','Shared upstairs reading and creative-work room',(box)=>{
    box([21,8,28],[27,11,29],'books');box([23,8,24],[26,9,26],'slab');
    box([23,8,26],[26,9,27],'seat');box([27,8,24],[28,9,27],'blue');
  });
  component('entrance-canopy','Timber entrance portico and shaded waiting area',(box)=>{
    box([12,6,7],[21,7,10],'dark');box([13,6,7],[20,7,9],'wood');
    box([14,5,9],[19,6,10],'light');
    for(const x of [12,20])box([x,1,7],[x+1,6,8],'dark');
  });
  component('play-yard','Fenced play forecourt, hopscotch surface, sand table and shelter',(box)=>{
    box([3,1,3],[13,2,4],'fence');box([20,1,3],[29,2,4],'fence');
    box([4,1,8],[10,2,9],'seat');
    box([22,1,5],[27,2,8],'wood');box([23,1,6],[26,2,7],'sand');
    for(const x of [21,28])box([x,1,5],[x+1,4,6],'wood');
    box([21,4,4],[29,5,8],'slab');
  });
  component('roof-services','Planted roof strips and screened ventilation equipment',(box)=>{
    for(const x of [5,22]){box([x,14,13],[x+5,15,21],'soil');box([x,15,13],[x+5,16,21],'leaves');}
    box([5,14,25],[11,15,29],'dark');box([6,15,26],[10,16,28],'vent');
    box([4,14,24],[12,17,25],'wood');
  });
  component('landscape','Low hedges and garden seating beside the public approach',(box)=>{
    box([1,1,4],[2,3,10],'leaves');box([30,1,4],[31,3,29],'leaves');
    box([4,1,31],[28,3,32],'leaves');box([5,1,1],[11,2,2],'seat');
  });
  clearance('entry',[14,2,11],[19,5,15]);
  clearance('ground-corridor',[14,2,12],[19,5,21]);
  clearance('upper-corridor',[14,8,12],[19,11,21]);
  clearance('upper-landing',[14,8,27],[19,11,29]);
  return plan;
}
module.exports={school};
