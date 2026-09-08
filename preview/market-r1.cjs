const {market}=require('./market.cjs');
const {revisionKit}=require('./revision-kit.cjs');
function marketR1(){
  const {plan,edit,set,clearance}=revisionKit(market(),
    'A chamfered corner market with a diagonal glazed entrance, stepped timber canopy and an offset rear service wing. The cut corner becomes a pocket plaza; a recessed delivery court separates the stocked retail hall from refrigeration plant and loading.');
  const inside=(x,z)=>z>=9&&z<30&&x>= (z<17?20-z:z<23?3:16)&&x<29;
  const boundary=(x,z)=>inside(x,z)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>!inside(x+dx,z+dz));
  set('envelope','Chamfered glazed hall and offset service-wing shell',(box,block)=>{
    for(let z=9;z<30;z++){
      const left=z<17?20-z:z<23?3:16;
      box([left,1,z],[29,2,z+1],'tile');box([left,7,z],[29,8,z+1],'dark');
      for(let x=left;x<29;x++)if(boundary(x,z)){
        box([x,2,z],[x+1,7,z+1],'brick');
        if(z<22)box([x,3,z],[x+1,6,z+1],'glass');
        if(z>=10&&z<=13&&x===left)box([x,2,z],[x+1,6,z+1],'air');
      }
    }
    box([14,2,9],[18,6,10],'air');box([24,2,29],[27,5,30],'air');
    box([17,7,15],[25,8,19],'glass');
    for(const x of [12,18,24])box([x,6,14],[x+1,7,21],'light');
    box([14,8,8],[26,13,9],'brand');
    box([24,8,7],[25,13,8],'white');box([20,12,7],[25,13,8],'white');
    box([20,8,7],[25,9,8],'white');box([20,8,7],[21,11,8],'white');
    box([20,10,7],[23,11,8],'white');box([15,8,7],[18,13,8],'white');
    box([16,9,7],[17,12,8],'air');
    for(let z=10;z<17;z++)block([20-z,7,z],'brand');
  });
  // Keep the main gondolas, but relocate the clipped corner's produce stand.
  plan.components.find(c=>c.id==='retail-shelves').operations=
    plan.components.find(c=>c.id==='retail-shelves').operations.filter(op=>(op.min||op.at)[2]>=15);
  edit('retail-shelves',box=>{box([9,2,13],[12,3,14],'wood');box([9,3,13],[12,4,14],'green');});
  set('chilled-food','Chilled-food wall repositioned beyond the diagonal entrance',(box)=>{
    box([4,2,18],[6,6,22],'white');box([5,3,18],[6,5,22],'glass');
    box([4,5,18],[6,6,19],'light');box([4,3,19],[5,4,22],'green');
    box([26,2,13],[28,5,18],'white');box([26,3,13],[27,5,18],'glass');
  });
  set('stockroom','Offset service wing, stock pallets and rear loading passage',(box)=>{
    box([17,2,23],[28,7,24],'dark');box([24,2,23],[27,5,24],'air');
    box([17,2,25],[20,4,28],'crate');box([21,2,27],[23,3,29],'wood');
  });
  set('canopy','Stepped timber entrance canopy following the chamfer',(box)=>{
    box([12,6,6],[29,7,9],'wood');box([12,6,5],[29,7,6],'dark');
    for(let z=9;z<16;z++){
      const x=20-z;box([x-2,6,z],[x,7,z+1],'wood');
      box([x-3,6,z],[x-2,7,z+1],'dark');
    }
  });
  set('roof-services','Rear plant enclosure and retail rooflights',(box)=>{
    box([18,8,25],[28,9,29],'stone');
    for(const x of [19,24]){box([x,9,26],[x+3,11,28],'dark');box([x,11,26],[x+3,12,28],'vent');}
    box([17,8,24],[29,11,25],'wood');
    box([17,8,15],[25,9,19],'glass');
    box([6,8,18],[11,9,22],'soil');box([6,9,18],[11,10,22],'leaves');
  });
  edit('site',(box,block)=>{
    box([2,0,8],[12,1,17],'stone');box([3,0,23],[16,1,30],'tile');
    for(const [x,z] of [[9,10],[8,11],[7,12],[6,13]])block([x,1,z],'stair');
    box([24,1,30],[27,2,31],'stair');
  });
  set('corner-plaza','Diagonal arrival plaza, seating and planting',(box)=>{
    box([3,1,8],[6,2,10],'dark');box([3,2,8],[6,3,10],'leaves');
    box([3,1,11],[4,2,15],'seat');
    box([5,1,24],[12,2,26],'dark');box([5,2,24],[12,3,26],'leaves');
  });
  plan.spaces=plan.spaces.filter(s=>!['delivery-route','cross-aisle'].includes(s.id));
  clearance('delivery-route',[24,2,23],[27,5,30]);
  clearance('cross-aisle',[7,2,14],[26,4,15]);
  clearance('corner-entry',[8,2,12],[10,5,13]);
  return plan;
}
module.exports={marketR1};
