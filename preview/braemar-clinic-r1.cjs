const {braemarClinic}=require('./braemar-clinic.cjs');
const {revisionKit}=require('./revision-kit.cjs');
const {northLettering,letterPixels}=require('./block-lettering.cjs');

function braemarClinicR1(){
  const plan=braemarClinic();
  const {edit,set}=revisionKit(plan,
    'An enlarged three-storey BraemarHealth clinic with smoked connected panes, a corrected two-L medical mark, integrated CLINIC fascia, entrance signage and an identity monument. Clear panes retain sightlines at check-in and the entrance tower; care-room glazing is tinted.');
  plan.dimensions={x:36,y:32,z:36};
  const widen=v=>v>22?v+4:v, deepen=v=>v>25?v+2:v;
  const point=([x,y,z])=>[widen(x),y,deepen(z)];
  const pane=(name,axis)=>`minecraft:${name}[east=${axis==='ew'},north=${axis==='ns'},south=${axis==='ns'},waterlogged=false,west=${axis==='ew'}]`;
  for(const axis of ['ew','ns']){
    plan.palette[`smoke_${axis}`]=pane('gray_stained_glass_pane',axis);
    plan.palette[`clear_${axis}`]=pane('glass_pane',axis);
  }
  plan.palette.letter='minecraft:white_concrete';
  for(const part of plan.components)for(const op of part.operations){
    const lo=op.min||op.at,hi=op.max||op.at.map(v=>v+1);
    if(op.material==='glass'||op.material==='railing'){
      const axis=hi[0]-lo[0]===1&&hi[2]-lo[2]>1?'ns':'ew';
      const clear=part.id==='entrance-tower'||(part.id==='envelope'&&lo[1]===2&&lo[2]===8);
      op.material=`${clear?'clear':'smoke'}_${axis}`;
    }
    if(op.op==='block')op.at=point(op.at);
    else {op.min=point(op.min);op.max=point(op.max);}
  }
  for(const space of plan.spaces){space.min=point(space.min);space.max=point(space.max);}
  edit('site',box=>box([0,0,34],[36,1,36],'grass'));

  // Replace the incorrect mark, rather than leaving its extra cyan tail behind.
  set('medical-sign','Reference-aligned cyan upper-left and green lower-right L shapes',(box,block)=>{
    const rows=['..CC....','..CC....','CCCCGGGG','CCCCGGGG','....GG..','....GG..'];
    rows.forEach((row,v)=>[...row].forEach((pixel,u)=>{
      if(pixel!=='.')block([31-u,19-v,3],pixel==='C'?'cyan':'lime');
    }));
    for(const x of [16,33])box([x,14,4],[x+1,19,5],'hanger');
  });
  // The earlier planter occupied the new signage band; keep other planting intact.
  const landscape=plan.components.find(c=>c.id==='landscape');
  landscape.operations=landscape.operations.filter(op=>(op.min||op.at)[1]<8);
  const clinicPixels=new Set(letterPixels('CLINIC').map(([u,v])=>`${32-u},${11-v}`));
  set('signage-fascia','Recessed dark identity band with flush lettering and slim lighting',(box,block)=>{
    box([15,8,6],[34,12,7],'dark');
    for(let x=15;x<34;x++)for(let y=8;y<12;y++)if(!clinicPixels.has(`${x},${y}`))block([x,y,5],'dark');
    box([15,12,5],[34,13,7],'slab');
    box([16,7,4],[33,8,5],'strip');
  });
  set('clinic-lettering','North-facing CLINIC lettering built into the facade',(_,block)=>{
    northLettering(block,'CLINIC',32,11,5,'letter');
  });
  set('entrance-sign','A compact downward marker identifies the sheltered patient entrance',(box,block)=>{
    box([8,6,2],[13,10,3],'dark');
    northLettering(block,'↓',11,9,2,'letter');
  });
  set('identity-monument','BraemarHealth monogram and illuminated pedestrian identity marker',(box,block)=>{
    box([25,1,1],[34,2,3],'stone');
    box([26,2,2],[34,8,3],'dark');
    northLettering(block,'BH',33,6,2,'letter');
    box([26,7,1],[34,8,2],'strip');
    block([26,1,1],'cyan');block([27,1,1],'lime');
  });
  set('floor-wayfinding','Visible floor numerals at the three stair landings',(_,block)=>{
    for(const [n,y] of [['1',6],['2',12],['3',18]])northLettering(block,n,10,y,27,'cyan');
  });
  set('upper-planters','Smaller planted returns frame the glazing without hiding signage',(box)=>{
    box([29,8,9],[32,9,10],'dark');box([29,9,9],[32,10,10],'leaves');
    box([15,14,6],[21,15,7],'dark');box([15,15,6],[21,16,7],'leaves');
  });
  return plan;
}
module.exports={braemarClinicR1};
