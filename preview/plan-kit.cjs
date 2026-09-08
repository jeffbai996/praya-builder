// Shared authoring vocabulary, not an alternative to Java validation.
function planKit(id, name, description) {
  const plan={schema_version:1,plan_id:id,revision:'r0',name,description,
    dimensions:{x:32,y:24,z:32},references:[],spaces:[],components:[],palette:{
      air:'minecraft:air',pale:'minecraft:smooth_quartz',dark:'minecraft:gray_concrete',
      stone:'minecraft:stone_bricks',floor:'minecraft:birch_planks',wood:'minecraft:stripped_oak_wood[axis=y]',
      glass:'minecraft:glass',grass:'minecraft:grass_block[snowy=false]',soil:'minecraft:dirt',
      leaves:'minecraft:oak_leaves[distance=1,persistent=true,waterlogged=false]',light:'minecraft:sea_lantern',
      books:'minecraft:bookshelf',white:'minecraft:white_wool',green:'minecraft:green_terracotta',
      slab:'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]',
      stair:'minecraft:quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]',
      seat:'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
      railing:'minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]',
    }};
  function component(id,role,build){
    const operations=[];
    const box=(min,max,material)=>operations.push({op:'box',min,max,material});
    const block=(at,material)=>operations.push({op:'block',at,material});
    build(box,block);plan.components.push({id,role,origin:[0,0,0],operations});
  }
  function clearance(id,min,max){plan.spaces.push({id,min,max});}
  return {plan,component,clearance};
}
module.exports={planKit};
