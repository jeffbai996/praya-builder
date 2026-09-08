const {postmodernR1}=require('./postmodern-r1.cjs');
const {revisionKit}=require('./revision-kit.cjs');
const {furniture}=require('./furniture-kit.cjs');
const {claimFrom}=require('./component-claims.cjs');

function postmodernR2(){
  const plan=postmodernR1();
  const {set,clearance}=revisionKit(plan,
    'Six-storey Praya apartments with framed side bays, glazed rear circulation and planted shared loggias. Ten compact studios now include private bathrooms, kitchens, storage and living areas; the penthouse has separate sleeping and bathing spaces.');
  plan.revision='r2';
  Object.assign(plan.palette,{
    privacyEW:'minecraft:white_stained_glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]',
    privacyNS:'minecraft:white_stained_glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]',
    tile:'minecraft:polished_diorite',mirror:'minecraft:light_gray_stained_glass',
  });
  const bounds=n=>n<4?[5,28,8]:n===4?[7,28,10]:[10,26,12];
  set('side-elevations','Recessed bedroom and living bays with wrapping pale eyebrows and privacy glazing',(box,block)=>{
    for(let n=0;n<6;n++){
      const f=1+n*4,[lo,hi,front]=bounds(n);
      for(const [wall,outer] of [[lo,lo-1],[hi-1,hi]]){
        box([wall,f+1,front+2],[wall+1,f+3,front+6],'paneNS');
        box([wall,f+1,17],[wall+1,f+3,21],'paneNS');
        box([wall,f+1,23],[wall+1,f+3,26],'privacyNS');
        for(const [a,b] of [[front+1,front+7],[16,22],[23,27]])
          box([outer,f+3,a],[outer+1,f+4,b],'pale');
        for(const z of [front+1,22])box([outer,f+1,z],[outer+1,f+3,z+1],'brick');
        if(n%2===1){block([outer,f+1,19],'wood');block([outer,f+2,19],'leaves');}
      }
    }
  });
  set('rear-elevation','Pale rear frame, screened domestic windows and a smoked-glass stair bay',(box)=>{
    for(let n=0;n<6;n++){
      const f=1+n*4,[lo,hi]=bounds(n);
      box([lo,f+3,27],[hi,f+4,28],'pale');
      for(const x of [lo,13,19,hi-1])box([x,f,27],[x+1,f+4,28],'pale');
      for(const [a,b] of [[lo+1,13],[20,hi-1]])box([a,f+1,26],[b,f+3,27],'privacyEW');
      box([14,f+1,26],[19,f+3,27],'paneEW');
      box([18,f+1,26],[19,f+3,28],'air');
    }
  });
  set('rear-loggias','Shared planted rear landings and a paved garden entrance',(box,block)=>{
    box([14,0,27],[21,1,32],'stone');box([14,1,27],[20,2,30],'floor');
    box([17,2,28],[20,4,30],'air');
    for(let n=1;n<6;n++){
      const f=1+n*4;
      box([13,f,28],[20,f+1,30],'pale');
      box([13,f,27],[20,f+1,28],'pale');
      box([13,f+1,30],[20,f+2,31],'paneEW');
      box([13,f+1,28],[14,f+2,30],'paneNS');
      box([19,f+1,28],[20,f+2,30],'paneNS');
      block([14,f+1,29],'wood');block([14,f+2,29],'leaves');
      block([16,f+1,29],'seat');
      clearance(`rear-loggia-${n}`,[18,f+1,26],[19,f+3,30]);
    }
  });
  // Local U runs from the exterior wall toward the shared corridor. Mirroring
  // the right-hand studio keeps the same route beside the bed and wet room.
  function studio(box,block,lo,hi,y,front,mirror){
    const width=hi-lo;
    const b=(a,c,d,e,f,g,material)=>box([mirror?hi-e:lo+a,y+c,front+d],[mirror?hi-a:lo+e,y+f,front+g],material);
    const p=(u,v,z,material)=>b(u,v,z,u+1,v+1,z+1,material);
    b(0,0,1,2,2,2,'wood');b(0,0,2,2,1,6,'white');
    b(0,1,2,2,2,3,'pillow');b(0,1,3,2,2,6,'rug');p(2,0,2,'wood');p(2,1,2,'lamp');
    b(width-2,0,3,width,1,7,'wood');p(width-1,0,4,'cooker');
    b(width-2,2,3,width,3,6,'cabinet');p(width-2,1,6,'plant');
    const work=16-front,sit=18-front;
    b(0,0,work,2,1,work+1,'table');p(0,1,work,'plant');p(1,1,work,'dark');
    b(0,0,sit,2,1,sit+1,'cushion');p(2,0,sit,'armWest');
    b(0,0,sit+2,2,1,sit+3,'slab');
    const wet=22-front;
    b(0,0,wet,width-1,3,wet+1,'pale');b(width-1,2,wet,width,3,wet+1,'pale');
    p(0,0,wet+1,'sink');p(0,1,wet,'mirror');
    b(0,0,wet+2,2,1,wet+4,'tile');b(2,1,wet+3,3,3,wet+4,'privacyNS');
    p(0,2,wet+3,'tap');p(width-2,0,wet+2,'cushion');
  }
  for(let n=0;n<5;n++){
    const y=2+n*4,[lo,hi,front]=bounds(n);
    set(`homes-${n+1}`,'Two complete compact studios with sleeping, cooking, work, sitting and private wet rooms',(box,block)=>{
      studio(box,block,lo+1,13,y,front,false);studio(box,block,20,hi-1,y,front,true);
    });
    for(const x of [12,20])clearance(`studio-${n}-${x}-bath-entry`,[x,y,22],[x+1,y+2,24]);
  }
  set('homes-6','Penthouse sleeping wings, central lounge, fitted kitchen and enclosed bathroom',(box,block)=>{
    const f=furniture(box,block);
    f.bed(12,22,15);f.bed(21,22,15);
    box([11,22,22],[15,25,23],'pale');box([14,22,23],[15,25,26],'pale');
    box([13,22,22],[14,24,23],'air');f.basin(11,22,23);
    box([11,22,24],[13,23,26],'tile');block([12,24,25],'tap');
    box([15,22,19],[17,23,20],'seat');block([16,22,17],'slab');
    box([21,22,24],[25,23,26],'wood');block([22,22,25],'cooker');block([24,23,24],'plant');
    box([20,24,24],[25,25,25],'cabinet');
  });
  claimFrom(plan,'side-elevations',['envelope','residential-frame']);
  claimFrom(plan,'rear-elevation',['envelope']);
  claimFrom(plan,'rear-loggias',['site','landscape','rear-elevation']);
  return plan;
}
module.exports={postmodernR2};
