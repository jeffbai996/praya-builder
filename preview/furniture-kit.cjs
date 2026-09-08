// Furniture stays in the compiled block plan, including details exposed by cutaways.
function furniturePalette(plan){
  Object.assign(plan.palette,{
    cushion:'minecraft:smooth_quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]',
    chairSouth:'minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]',
    chairEast:'minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]',
    chairWest:'minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]',
    armEast:'minecraft:oak_trapdoor[facing=east,half=bottom,open=true,powered=false,waterlogged=false]',
    armWest:'minecraft:oak_trapdoor[facing=west,half=bottom,open=true,powered=false,waterlogged=false]',
    headboard:'minecraft:oak_trapdoor[facing=north,half=bottom,open=true,powered=false,waterlogged=false]',
    table:'minecraft:oak_slab[type=top,waterlogged=false]',
    leg:'minecraft:oak_fence[east=false,north=false,south=false,waterlogged=false,west=false]',
    rug:'minecraft:light_gray_carpet',pillow:'minecraft:white_carpet',
    lamp:'minecraft:lantern[hanging=false,waterlogged=false]',
    pendant:'minecraft:lantern[hanging=true,waterlogged=false]',
    stem:'minecraft:iron_bars[east=false,north=true,south=true,waterlogged=false,west=false]',
    tap:'minecraft:tripwire_hook[attached=false,facing=south,powered=false]',
    sink:'minecraft:cauldron',plant:'minecraft:potted_fern',
    cooker:'minecraft:smoker[facing=north,lit=false]',
    cabinet:'minecraft:iron_trapdoor[facing=north,half=bottom,open=true,powered=false,waterlogged=false]',
  });
}
function furniture(box,block){
  return {
    sofa(x,y,z,width=4){
      box([x,y,z],[x+width,y+1,z+1],'cushion');
      block([x-1,y,z],'armEast');block([x+width,y,z],'armWest');
    },
    coffee(x,y,z){box([x,y,z],[x+3,y+1,z+1],'slab');},
    bed(x,y,z){
      box([x,y,z],[x+3,y+1,z+4],'white');
      box([x,y+1,z],[x+3,y+2,z+1],'pillow');
      box([x,y+1,z+1],[x+3,y+2,z+4],'rug');
      box([x,y,z-1],[x+3,y+2,z],'wood');
      for(const dx of [-1,3]){block([x+dx,y,z],'wood');block([x+dx,y+1,z],'lamp');}
    },
    desk(x,y,z){
      box([x,y,z],[x+4,y+1,z+1],'table');
      block([x,y+1,z],'plant');block([x+2,y+1,z],'dark');
      block([x+2,y,z+2],'chairSouth');
    },
    wardrobe(x,y,z,width=4){
      box([x,y,z],[x+width,y+3,z+1],'wood');
      box([x,y,z+1],[x+width,y+3,z+2],'cabinet');
    },
    basin(x,y,z){
      block([x,y,z],'sink');block([x,y+1,z-1],'pale');block([x,y+1,z],'tap');
    },
  };
}
module.exports={furniturePalette,furniture};
