const {planKit}=require('./plan-kit.cjs');

// Assemblies share a room programme, while their envelope and circulation respond to the scheme.
function apartmentStudy(kind,base=1){
 const variants={bar:{name:'Paired garden apartments',units:[[4,7,10,19,'east'],[18,7,10,19,'west']]},staggered:{name:'Stepped garden apartments',units:[[4,5,10,21,'east'],[18,10,10,17,'west']]},court:{name:'Corner court apartments',units:[[4,5,10,22,'east'],[14,18,14,9,'north']]}};
 const variant=variants[kind];if(!variant||!Number.isInteger(base)||base<1||base>5)throw Error('Invalid apartment study');
 const {plan,component,clearance}=planKit('study-'+kind,variant.name,'Six one-bedroom homes, three floors, private bathrooms and a shared planted roof. '+(kind==='court'?'An L-shaped building shelters an open entrance court.':kind==='staggered'?'Offset wings create a sheltered garden and different apartment depths.':'Paired wings frame a shared stair and garden approach.'));
 plan.dimensions={x:32,y:base+21,z:32};
 Object.assign(plan.palette,{brick:'minecraft:bricks',privacy:'minecraft:white_stained_glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]',pane:'minecraft:light_gray_stained_glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]',sidepane:'minecraft:light_gray_stained_glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]',basin:'minecraft:cauldron',toilet:'minecraft:quartz_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',shower:'minecraft:polished_andesite_slab[type=bottom,waterlogged=false]',counter:'minecraft:smooth_quartz',cooker:'minecraft:polished_blackstone',table:'minecraft:oak_slab[type=top,waterlogged=false]',rug:'minecraft:light_gray_carpet',pillow:'minecraft:white_carpet',lamp:'minecraft:lantern[hanging=false,waterlogged=false]',arm:'minecraft:oak_trapdoor[facing=west,half=bottom,open=true,powered=false,waterlogged=false]'});
 const stairX=14,stairZ=10;
 const inUnit=(x,z)=>variant.units.some(([ux,uz,w,d])=>x>=ux&&x<ux+w&&z>=uz&&z<uz+d);
 component('foundations','Stepped foundations beneath the building and access deck',(box)=>{
  for(const [x,z,w,d]of variant.units)box([x,0,z],[x+w,base,z+d],'stone');
  for(let x=14;x<18;x++)for(let z=5;z<28;z++)if(!inUnit(x,z))box([x,0,z],[x+1,base,z+1],'stone');
 });
 component('approach','Street steps and sheltered arrival',(box,block)=>{
  for(let i=0;i<base;i++)box([14,i,2+i],[18,i+1,3+i],'stair');
  for(let z=2+base;z<5;z++)box([14,0,z],[18,base,z+1],'stone');
  box([14,base+4,4],[18,base+5,7],'slab');block([17,base+3,5],'light');
 });
 component('circulation','Open galleries, landings and continuous stair',(box)=>{
  for(let floor=0;floor<=3;floor++){const y=base+5*floor;
   for(let x=14;x<18;x++)for(let z=5;z<28;z++)if(!inUnit(x,z)&&!(floor>0&&x<16&&z>=stairZ&&z<stairZ+5))box([x,y,z],[x+1,y+1,z+1],'pale');
   if(floor<3)for(let step=0;step<5;step++)box([stairX,y+1+step,stairZ+step],[stairX+2,y+2+step,stairZ+step+1],'stair');
  }
 });
 for(let wing=0;wing<2;wing++){
  const [x,z,w,d,entry]=variant.units[wing];
  for(let floor=0;floor<3;floor++){
   const y=base+floor*5,id=`home-${wing+1}-${floor+1}`;
   component(id+'-envelope','Floor plate, all elevations and entrance',(box,block)=>{
    box([x,y,z],[x+w,y+1,z+d],'floor');
    for(const zz of [z,z+d-1]){
     box([x,y+1,zz],[x+w,y+5,zz+1],'dark');
     box([x+2,y+2,zz],[x+w-2,y+4,zz+1],'pane');
     for(const xx of [x,x+w-1])box([xx,y+1,zz],[xx+1,y+5,zz+1],'pale');
    }
    for(const xx of [x,x+w-1]){
     box([xx,y+1,z+1],[xx+1,y+5,z+d-1],'brick');
     for(let zz=z+2;zz<z+d-3;zz+=5){box([xx,y+2,zz],[xx+1,y+4,zz+3],'sidepane');box([xx,y+4,zz],[xx+1,y+5,zz+3],'pale');}
    }
    let door;
    if(entry==='north')door=[x+3,y+1,z];else door=[entry==='east'?x+w-1:x,y+1,z+3];
    for(const half of ['lower','upper']){
     const role=`door_${entry}_${half}`;plan.palette[role]=`minecraft:oak_door[facing=${entry},half=${half},hinge=left,open=false,powered=false]`;block([door[0],door[1]+(half==='upper'?1:0),door[2]],role);
    }
   });
   const wide=d<12;
   const bath=wide?[x+w-4,z+1]:[x+w-4,z+d-5];
   component(id+'-rooms','Private bathroom and bedroom partitions',(box,block)=>{
    const [bx,bz]=bath;
    box([bx,y+1,bz],[bx+1,y+5,bz+4],'pale');box([bx+1,y+1,bz+3],[bx+3,y+5,bz+4],'pale');
    for(const half of ['lower','upper']){const role='bath_door_'+half;plan.palette[role]=`minecraft:oak_door[facing=west,half=${half},hinge=left,open=false,powered=false]`;block([bx,y+1+(half==='upper'?1:0),bz+1],role);}
    if(!wide){box([x+1,y+1,z+d-8],[x+w-1,y+5,z+d-7],'pale');box([x+2,y+1,z+d-8],[x+4,y+3,z+d-7],'air');}
    else {box([x+7,y+1,z+1],[x+8,y+5,z+d-1],'pale');box([x+7,y+1,z+5],[x+8,y+3,z+7],'air');}
   });
   component(id+'-bathroom','Basin, toilet and shower',(box,block)=>{
    const [bx,bz]=bath;block([bx+1,y+1,bz],'basin');block([bx+2,y+1,bz],'toilet');block([bx+2,y+1,bz+2],'shower');block([bx+2,y+4,bz+1],'light');
   });
   component(id+'-interior','Kitchen, sleeping, storage, dining and seating',(box,block)=>{
    const bedX=wide?x+9:x+2,bedZ=wide?z+5:z+d-5;
    box([bedX,y+1,bedZ],[bedX+2,y+2,bedZ+3],'white');box([bedX,y+2,bedZ],[bedX+2,y+3,bedZ+1],'pillow');box([bedX,y+2,bedZ+1],[bedX+2,y+3,bedZ+3],'rug');
    block([bedX-1,y+1,bedZ],'wood');block([bedX-1,y+2,bedZ],'lamp');
    if(wide){box([x+1,y+1,z+1],[x+2,y+2,z+5],'counter');block([x+1,y+1,z+2],'cooker');block([x+1,y+1,z+4],'basin');}
    else {box([x+1,y+1,z+1],[x+5,y+2,z+2],'counter');block([x+2,y+1,z+1],'cooker');block([x+4,y+1,z+1],'basin');}
    box([x+1,y+1,z+5],[x+4,y+2,z+6],'seat');block([x+4,y+1,z+5],'arm');
    box([x+2,y+1,z+3],[x+4,y+2,z+4],'table');
    if(!wide){box([x+1,y+1,z+6],[x+2,y+4,z+8],'wood');box([x+5,y+1,z+6],[x+7,y+2,z+7],'table');block([x+6,y+2,z+6],'books');}
    block([x+5,y+4,z+4],'light');
   });
   if(!wide)clearance(id+'-bedroom-route',[x+2,y+1,z+d-8],[x+4,y+3,z+d-6]);
  }
  component('wing-'+wing+'-roof','Accessible roof garden with wraparound parapet',(box,block)=>{
   const y=base+15;box([x,y,z],[x+w,y+1,z+d],'pale');
   for(const zz of [z,z+d-1])box([x,y+1,zz],[x+w,y+2,zz+1],'railing');
   for(const xx of [x,x+w-1])box([xx,y+1,z+1],[xx+1,y+2,z+d-1],'sidepane');
   const entryX=entry==='east'?x+w-1:entry==='west'?x:x+3,entryZ=entry==='north'?z:z+3;box([entryX,y+1,entryZ],[entryX+1,y+2,entryZ+2],'air');
   box([x+1,y+1,z+d-3],[x+w-1,y+2,z+d-1],'dark');box([x+1,y+2,z+d-3],[x+w-1,y+3,z+d-1],'leaves');
   box([x+2,y+1,z+3],[x+5,y+2,z+4],'seat');block([x+3,y+1,z+5],'slab');
   for(const xx of [x+1,x+w-2])box([xx,y+1,z+1],[xx+1,y+4,z+2],'wood');box([x+1,y+4,z+1],[x+w-1,y+5,z+5],'slab');
  });
 }
 component('landscape','Garden threshold and sheltered rear edge',(box)=>{for(const [x,z]of [[4,2],[23,2],[4,29],[23,29]]){box([x,0,z],[x+5,base+1,z+2],'dark');box([x,base+1,z],[x+5,base+2,z+2],'leaves');}});
 for(let floor=0;floor<3;floor++){
  const y=base+floor*5;
  clearance('gallery-'+floor,[16,y+1,5],[18,y+3,18]);
  clearance('landing-'+floor,[14,y+1,15],[16,y+3,18]);
 }
 return plan;
}
module.exports={apartmentStudy};
