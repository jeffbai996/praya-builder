const {mansion}=require('./mansion.cjs');
const {revisionKit}=require('./revision-kit.cjs');
const {furniture}=require('./furniture-kit.cjs');
const {claimFrom}=require('./component-claims.cjs');

function mansionR1(){
  const plan=mansion();
  const {set,clearance}=revisionKit(plan,
    'A garden house resolved on all four elevations: timber-screened side bays, a framed rear colonnade and accessible garden and gallery terraces. Layered joinery, bedroom desks, bathroom privacy glazing and an outdoor dining room extend the furnished domestic programme.');
  Object.assign(plan.palette,{
    privacyNS:'minecraft:white_stained_glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]',
    mirror:'minecraft:light_gray_stained_glass',brick:'minecraft:bricks',
  });
  set('side-screens','Wrapping frame rails, recessed timber screens and bathroom privacy panes',(box)=>{
    for(const [outer,wall] of [[4,5],[40,39]]){
      for(const y of [7,13])box([outer,y,12],[outer+1,y+1,34],'pale');
      for(const z of [16,23,32])box([outer,2,z],[outer+1,13,z+1],'pale');
      for(const y of [3,9])for(const z of [18,20,28,30])box([outer,y,z],[outer+1,y+3,z+1],'wood');
      box([wall,3,26],[wall+1,6,32],'privacyNS');
    }
    box([5,9,26],[6,12,32],'privacyNS');
  });
  set('garden-elevation','Rear colonnade, glazed gallery loggia and a sheltered outdoor dining terrace',(box,block)=>{
    box([7,1,34],[37,2,39],'deck');
    for(const x of [6,16,27,39])box([x,1,34],[x+1,14,35],'pale');
    box([6,7,34],[40,8,35],'pale');box([6,13,34],[40,14,35],'pale');
    for(const x of [16,27])box([x,2,33],[x+1,13,34],'brick');
    box([24,2,33],[27,5,34],'air');
    box([18,7,35],[28,8,38],'pale');box([18,7,34],[28,8,35],'pale');
    for(const x of [18,27])box([x,2,37],[x+1,8,38],'wood');
    box([18,8,37],[28,9,38],'smokedEW');
    box([18,8,35],[19,9,37],'smokedNS');box([27,8,35],[28,9,37],'smokedNS');
    box([24,8,33],[27,11,35],'air');
    box([19,8,36],[21,9,37],'seat');block([22,8,36],'wood');block([22,9,36],'plant');
    for(const x of [8,14])box([x,2,37],[x+1,6,38],'wood');
    for(const z of [34,36,38])box([8,6,z],[15,7,z+1],'wood');
    box([10,2,35],[13,3,37],'table');
    for(const x of [10,12]){block([x,2,34],'chairSouth');block([x,2,37],'seat');}
    for(const x of [8,36]){box([x,2,38],[x+2,3,39],'wood');box([x,3,38],[x+2,4,39],'leaves');}
    for(const x of [17,28,38])block([x,2,35],'lamp');
  });
  set('interior-joinery','Bedroom reading nooks, fitted storage, bathroom mirrors and kitchen details',(box,block)=>{
    const f=furniture(box,block);
    // Keep the central gallery and all doorway approaches free of furnishings.
    f.desk(7,8,18);block([7,9,18],'lamp');
    for(const z of [18,30]){block([37,8,z],'wood');block([37,9,z],'lamp');}
    box([7,2,24],[10,3,25],'wood');box([7,3,24],[10,4,25],'books');
    box([34,5,12],[37,6,13],'cabinet');block([32,3,12],'plant');
    for(const [x,y,z] of [[7,8,27],[28,2,25]]){
      box([x,y+1,z-1],[x+2,y+3,z],'mirror');
      box([x+1,y+2,z],[x+3,y+3,z+1],'cabinet');
    }
    // The rear pavilion now has a garden-facing window and a fitted console.
    box([9,15,33],[16,18,34],'smokedEW');
    box([9,14,32],[14,15,33],'wood');block([10,15,32],'plant');block([13,15,32],'lamp');
  });
  clearance('garden-terrace-door',[24,2,32],[27,5,37]);
  clearance('gallery-loggia-door',[24,8,32],[27,11,37]);
  claimFrom(plan,'side-screens',['envelope']);
  claimFrom(plan,'garden-elevation',['envelope']);
  claimFrom(plan,'interior-joinery',['primary-suite','living-room','kitchen','bathrooms','envelope','roof-lounge']);
  return plan;
}
module.exports={mansionR1};
