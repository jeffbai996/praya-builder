const {planKit}=require('./plan-kit.cjs');
function postmodern(){
  const {plan,component,clearance}=planKit('rosedale-court','Rosedale Court',
    'A six-storey postmodern apartment house with eleven homes, a rusticated base, warm masonry, oversized entrance arch, paired window bays and a sculpted crown. Two upper setbacks create planted terraces above a chamfered street frontage.');
  plan.dimensions.y=32;
  Object.assign(plan.palette,{brick:'minecraft:bricks',rose:'minecraft:pink_terracotta',
    cream:'minecraft:smooth_sandstone',teal:'minecraft:cyan_terracotta',bed:'minecraft:white_wool',
    sink:'minecraft:cauldron',screen:'minecraft:black_concrete'});
  const bounds=n=>n<4?[5,27,8]:n===4?[7,25,10]:[9,23,12];
  const inside=(n,x,z)=>{
    const [lo,hi,front]=bounds(n);
    return x>=lo&&x<hi&&z>=front&&z<27&&x+z>=lo+front+2&&hi-1-x+z>=front+2;
  };
  component('site','Stone forecourt, entrance steps and perimeter garden',(box,block)=>{
    box([0,0,0],[32,1,32],'grass');box([2,0,1],[30,1,8],'stone');
    box([3,0,8],[5,1,29],'stone');box([27,0,8],[29,1,29],'stone');
    box([14,1,7],[19,2,8],'stair');
    for(const x of [4,10,16,22,28])block([x,0,2],'light');
  });
  component('envelope','Six occupied floors, chamfered bays and two upper setbacks',(box)=>{
    for(let n=0;n<6;n++){
      const floor=1+n*4,[lo,hi,front]=bounds(n),deck=n?Math.max(0,n-1):0;
      // Individual deck rows retain the outer terraces while leaving the stair well open.
      for(let z=8;z<27;z++){
        let start=null;
        for(let x=5;x<=27;x++){
          const occupied=x<27&&inside(deck,x,z)&&!(n>0&&x>=14&&x<17&&z>=21&&z<25);
          if(occupied&&start===null)start=x;
          if(!occupied&&start!==null){box([start,floor,z],[x,floor+1,z+1],'floor');start=null;}
        }
      }
      for(let z=front;z<27;z++)for(let x=lo;x<hi;x++)if(inside(n,x,z)){
        if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>!inside(n,x+dx,z+dz))){
          box([x,floor+1,z],[x+1,floor+4,z+1],n===0?'stone':'brick');
          if((z===front&&x%4!==0)||(x===lo||x===hi-1)&&z%4!==0||z===26&&x%4!==0)
            box([x,floor+1,z],[x+1,floor+3,z+1],'glass');
          box([x,floor+3,z],[x+1,floor+4,z+1],'cream');
        }
      }
      if(n<5){
        for(const x of [13,19]){
          box([x,floor+1,front+1],[x+1,floor+4,26],'pale');
          box([x,floor+1,18],[x+1,floor+3,20],'air');
        }
      }
      for(const x of [lo,hi-1])box([x,floor+1,front+2],[x+1,floor+4,front+3],'rose');
    }
    box([14,2,8],[19,5,9],'air');
    box([9,25,12],[23,26,27],'cream');box([14,25,21],[18,26,25],'glass');
  });
  component('stairs','Continuous six-level stair with landings and clear headroom',(box)=>{
    for(let n=0;n<5;n++)for(let i=0;i<4;i++){
      const y=2+n*4+i;
      box([14,y,21+i],[17,y+1,22+i],'stair');
    }
  });
  for(let n=0;n<6;n++){
    const y=2+n*4,[lo,hi,front]=bounds(n);
    component(`homes-${n+1}`,n===5?'Single penthouse with living room and two sleeping alcoves':'Two furnished studios with kitchenette, living and sleeping areas',(box,block)=>{
      for(const [x,direction] of [[lo+1,1],[hi-2,-1]]){
        const left=direction===1?x:x-1;
        box([left,y,front+3],[left+2,y+1,front+6],'bed');
        box([left,y,24],[left+2,y+1,26],'wood');block([left,y+1,25],'sink');
        box([left,y,20],[left+2,y+1,21],'seat');block([left,y,22],'slab');
        block([left,y+1,24],'screen');
      }
      if(n===5){box([14,y,14],[18,y+1,15],'seat');box([15,y,16],[17,y+1,18],'slab');}
    });
    clearance(`level-${n+1}-landing`,[17,y,18],[19,y+2,25]);
  }
  component('portal','Overscaled sandstone entrance arch and rose keystone',(box)=>{
    for(const x of [12,20])box([x,1,6],[x+1,5,8],'cream');
    box([13,5,6],[15,6,8],'cream');box([18,5,6],[20,6,8],'cream');
    box([14,6,6],[19,7,8],'cream');box([16,6,5],[17,7,6],'rose');
  });
  component('terraces','Planted fifth- and sixth-floor terraces with pale balustrades',(box)=>{
    for(const [y,lo,hi,z] of [[18,5,27,9],[22,7,25,11]]){
      box([lo+2,y,z],[14,y+1,z+1],'railing');box([19,y,z],[hi-2,y+1,z+1],'railing');
      for(const x of [lo+1,hi-2]){box([x,y,15],[x+1,y+1,20],'wood');box([x,y+1,15],[x+1,y+2,20],'leaves');}
    }
  });
  component('crown','Broken pediment, central oculus and sculpted roof silhouette',(box)=>{
    box([9,26,12],[23,27,13],'rose');
    for(let i=0;i<3;i++){
      box([9+i,27+i,12],[12+i,28+i,13],'cream');
      box([20-i,27+i,12],[23-i,28+i,13],'cream');
    }
    box([15,26,12],[18,30,13],'cream');box([16,27,11],[17,29,12],'teal');
    box([10,26,25],[22,27,27],'rose');
    for(const x of [10,21])box([x,26,13],[x+1,27,25],'cream');
    box([11,26,19],[13,27,24],'soil');box([11,27,19],[13,28,24],'leaves');
  });
  component('landscape','Formal street planting and residents benches',(box)=>{
    for(const x of [5,23]){box([x,1,4],[x+4,2,6],'cream');box([x,2,4],[x+4,3,6],'leaves');}
    box([6,1,28],[26,3,30],'leaves');box([4,1,3],[10,2,4],'seat');
  });
  return plan;
}
module.exports={postmodern};
