const {planKit}=require('./plan-kit.cjs');
function terrace(){
  const {plan,component,clearance}=planKit('terrace-mews','Terrace Mews',
    'Two modern duplex homes with private entrances, recessed balconies, planted roofs and a shared garden lane.');
  component('site','Paved frontage, garden lane and independent approaches',(box,block)=>{
    box([0,0,0],[32,1,32],'grass');box([0,0,0],[32,1,4],'stone');
    box([14,0,4],[18,1,30],'stone');
    for(const x of [4,18])box([x+5,0,3],[x+9,1,9],'stone');
    for(let x=2;x<32;x+=4)block([x,0,1],'light');
  });
  for(const x of [4,18]){
    component(`home-${x===4?'a':'b'}`,'Two-storey duplex shell, stair, terrace and planted roof',(box)=>{
      box([x,1,8],[x+10,2,25],'pale');box([x+1,1,9],[x+9,2,24],'floor');
      box([x+5,1,7],[x+9,2,8],'stair');
      // Upper plate excludes a two-block-wide stairwell with a rear landing.
      box([x,6,6],[x+10,7,17],'pale');box([x,6,22],[x+10,7,25],'pale');
      box([x,6,17],[x+1,7,22],'pale');box([x+3,6,17],[x+10,7,22],'floor');
      for(const y of [2,7]){
        box([x,y,8],[x+10,y+4,9],'dark');
        box([x,y,24],[x+10,y+4,25],'pale');
        for(const side of [x,x+9])box([side,y,9],[side+1,y+4,24],'pale');
        box([x+1,y,8],[x+9,y+3,9],'glass');
        box([x+5,y,8],[x+8,y+2,9],'air');
        box([x+1,y+1,24],[x+8,y+3,25],'glass');
        for(const side of [x,x+9])box([side,y+1,11],[side+1,y+3,15],'glass');
        box([x,y,8],[x+1,y+4,9],'wood');
        box([x+9,y,8],[x+10,y+4,9],'pale');
      }
      for(let n=0;n<5;n++)box([x+1,2+n,17+n],[x+3,3+n,18+n],'stair');
      box([x+3,7,17],[x+4,10,22],'pale');
      box([x+4,7,18],[x+9,10,19],'pale');box([x+6,7,18],[x+8,9,19],'air');
      box([x,11,8],[x+10,12,25],'pale');
      box([x,11,6],[x+10,12,8],'slab');
      box([x+1,7,6],[x+9,8,7],'railing');
      box([x+1,12,19],[x+9,13,24],'soil');box([x+1,13,19],[x+9,14,24],'leaves');
      box([x,12,18],[x+10,13,19],'dark');
    });
    component(`interior-${x===4?'a':'b'}`,'Living and kitchen below; bedroom and study above',(box)=>{
      box([x+1,2,11],[x+4,3,12],'seat');box([x+2,2,13],[x+4,3,15],'slab');
      box([x+7,2,15],[x+9,3,21],'pale');box([x+7,2,18],[x+8,3,19],'dark');
      box([x+5,7,20],[x+7,8,23],'wood');box([x+5,8,21],[x+7,9,23],'green');
      box([x+5,8,20],[x+7,9,21],'white');box([x+1,7,11],[x+4,8,12],'wood');
      box([x+1,8,11],[x+2,9,12],'light');
    });
    clearance(`entry-${x}`,[x+5,2,8],[x+8,4,11]);
    clearance(`landing-${x}`,[x+1,7,22],[x+4,10,24]);
    for(let n=0;n<5;n++)clearance(`stair-${x}-${n}`,[x+1,3+n,17+n],[x+3,5+n,18+n]);
  }
  component('landscape','Small front gardens and central planted court',(box)=>{
    for(const x of [4,18]){box([x,1,4],[x+4,2,6],'dark');box([x,2,4],[x+4,3,6],'leaves');}
    for(const z of [11,24]){box([15,1,z],[17,2,z+3],'wood');box([15,2,z],[17,3,z+3],'leaves');}
    box([15,1,18],[17,2,20],'seat');
  });
  return plan;
}
module.exports={terrace};
