const {clinic}=require('./clinic.cjs');
const {revisionKit}=require('./revision-kit.cjs');
function clinicR1(){
  const {plan,edit,set,clip,clearance}=revisionKit(clinic(),
    'An L-shaped garden clinic: the reception wing and consultation wing wrap a planted arrival court. A glazed return wall, garden entrance, sheltered waiting terrace and offset medical marker replace the rectangular frontage while retaining the care-room programme.');
  const footprint=[[13,0,32,32],[0,15,13,32]];
  for(const id of ['envelope','reception'])clip(id,footprint);
  edit('envelope',box=>{
    box([13,2,9],[14,8,15],'glass');box([13,2,9],[14,8,10],'dark');
    box([13,2,11],[14,5,14],'air');
    box([21,9,9],[28,12,11],'dark');box([23,9,8],[25,12,9],'cyan');
    box([22,10,8],[26,11,9],'cyan');
  });
  edit('partitions',box=>{
    box([4,7,15],[13,8,16],'pale');
    box([5,4,15],[12,7,16],'glass');
    for(const x of [4,12])box([x,2,15],[x+1,8,16],'wood');
  });
  edit('reception',box=>{box([14,2,13],[18,3,14],'seat');});
  edit('site',(box,block)=>{
    box([3,0,8],[13,1,15],'stone');box([10,1,11],[13,2,14],'floor');
    for(const x of [4,8,12])block([x,0,9],'light');
  });
  set('entrance-canopy','Asymmetric arrival canopy and garden threshold',(box)=>{
    box([12,6,6],[21,7,8],'dark');box([13,6,6],[20,7,7],'wood');
    box([10,5,10],[13,6,15],'slab');box([12,4,11],[13,5,14],'light');
  });
  set('garden-court','Open-sky pocket court with a sheltered bench and specimen planting',(box,block)=>{
    box([3,1,10],[5,2,14],'dark');box([3,2,10],[5,3,14],'leaves');
    box([6,1,13],[10,2,14],'seat');box([6,1,10],[8,2,11],'slab');
    block([6,2,10],'flower');
    box([4,1,7],[10,2,8],'wood');box([4,2,7],[10,3,8],'leaves');
  });
  clearance('garden-door',[13,2,11],[16,5,13]);
  return plan;
}
module.exports={clinicR1};
