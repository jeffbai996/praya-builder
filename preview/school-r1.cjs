const {school}=require('./school.cjs');
const {revisionKit}=require('./revision-kit.cjs');
function schoolR1(){
  const {plan,edit,set,clip,clearance}=revisionKit(school(),
    'A U-shaped elementary school with two classroom wings embracing an open-sky learning court. A glazed rear circulation spine links the wings and staircase; the retained four classrooms, canteen and support rooms open toward the sheltered campus heart.');
  const footprint=[[0,0,13,32],[20,0,32,32],[13,20,20,32]];
  clip('envelope',footprint);
  clip('partitions',[[0,0,13,32],[20,0,32,32],[13,21,20,32]]);
  edit('envelope',box=>{
    // Recessing the entrance opens the court all the way through both storeys.
    box([13,2,20],[20,7,21],'glass');box([17,2,20],[20,6,21],'air');
    box([13,8,20],[20,13,21],'glass');box([13,7,20],[20,8,21],'pale');
    for(const x of [13,19])box([x,2,20],[x+1,13,21],'pale');
    box([17,2,20],[19,5,21],'air');
    box([14,9,19],[15,12,20],'blue');box([16,9,19],[17,12,20],'yellow');
    box([18,9,19],[19,12,20],'red');
  });
  edit('partitions',box=>{
    for(const y of [2,8]){
      // Courtyard-facing classroom walls replace doors that would open into a void upstairs.
      for(const x of [12,20]){
        box([x,y,12],[x+1,y+5,20],'pale');
        box([x,y+1,13],[x+1,y+4,19],'glass');
      }
      box([10,y,22],[12,y+3,23],'air');box([21,y,22],[23,y+3,23],'air');
    }
  });
  set('entrance-canopy','Recessed timber portico overlooking the learning court',(box)=>{
    box([13,6,18],[20,7,20],'wood');box([13,6,18],[20,7,19],'dark');
    box([17,5,19],[19,6,20],'light');
  });
  edit('site',box=>{
    box([13,0,10],[20,1,20],'stone');box([17,1,19],[19,2,20],'stair');
    box([14,0,12],[19,1,17],'blue');
    for(const z of [12,14,16])box([15,0,z],[17,1,z+1],'yellow');
  });
  set('learning-court','Open-sky courtyard with outdoor teaching benches and planted edges',(box)=>{
    box([13,1,12],[14,2,17],'seat');box([19,1,12],[20,2,17],'seat');
    box([14,1,17],[16,2,18],'wood');box([14,2,17],[16,3,18],'leaves');
  });
  plan.spaces=plan.spaces.filter(s=>!['entry','ground-corridor','upper-corridor'].includes(s.id));
  clearance('courtyard-entry',[17,2,20],[19,5,21]);
  clearance('left-class-access',[10,2,22],[11,4,26]);
  clearance('right-class-access',[21,2,22],[23,4,24]);
  return plan;
}
module.exports={schoolR1};
