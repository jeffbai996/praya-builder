// Authoring helper only: all geometry passes through the Java compiler.
const fs = require('node:fs');
const path = require('node:path');

function apartment(revision) {
  if(!['r0','r1','r2'].includes(revision)) throw Error('Unknown apartment revision');
  const modern=revision==='r2', planted=revision!=='r0';
  const palette = {
    air: 'minecraft:air', pale: 'minecraft:smooth_quartz', brick: 'minecraft:bricks',
    dark: 'minecraft:polished_deepslate', floor: 'minecraft:birch_planks',
    timber: 'minecraft:dark_oak_planks', stone: 'minecraft:stone_bricks',
    glass: 'minecraft:glass', leaves: 'minecraft:oak_leaves[distance=1,persistent=true,waterlogged=false]',
    grass: 'minecraft:grass_block[snowy=false]', soil: 'minecraft:dirt', light: 'minecraft:sea_lantern',
    flower: 'minecraft:poppy', cushion: 'minecraft:white_wool', accent: 'minecraft:green_terracotta',
    basin: 'minecraft:cauldron',
    stair: 'minecraft:quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]',
    seat: 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
    slab: 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]',
    railing: 'minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]',
    side_railing: 'minecraft:glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]',
    door_w_lower: 'minecraft:oak_door[facing=west,half=lower,hinge=left,open=false,powered=false]',
    door_w_upper: 'minecraft:oak_door[facing=west,half=upper,hinge=left,open=false,powered=false]',
    door_e_lower: 'minecraft:oak_door[facing=east,half=lower,hinge=left,open=false,powered=false]',
    door_e_upper: 'minecraft:oak_door[facing=east,half=upper,hinge=left,open=false,powered=false]',
    charcoal: 'minecraft:gray_concrete', warm: 'minecraft:stripped_oak_wood[axis=y]',
    canopy: 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]',
  };
  const plan = {
    schema_version: 1, plan_id: 'courtyard-apartments', revision,
    name: 'Courtyard Apartments',
    description: modern ? 'Revision 02 — clean pale frames, charcoal recesses, wider glazing and a slim cantilevered roof canopy.' : revision === 'r1' ? 'Revision 01 — deeper planted balconies, a sheltered entrance and a softer street edge.' :
      'Initial study — six apartments around a shared stair, with a planted roof and compact frontage.',
    dimensions: {x: 32, y: 24, z: 32}, palette, components: [], spaces: [], references: [],
  };
  function plate(box, y, x1, x2, z1, z2, material) {
    // Leave the stairwell unowned; stairs are a separate component, not an air overwrite.
    box([x1,y,z1],[x2,y+1,17],material);
    box([x1,y,22],[x2,y+1,z2],material);
    box([x1,y,17],[14,y+1,22],material);
    box([16,y,17],[x2,y+1,22],material);
  }
  function component(id, role, build) {
    const operations = [];
    const box = (min, max, material) => operations.push({op: 'box', min, max, material});
    const block = (at, material) => operations.push({op: 'block', at, material});
    build(box, block);
    plan.components.push({id, role, origin: [0,0,0], operations});
  }
  component('site', 'Garden, sidewalk and entrance approach', (box, block) => {
    box([0,0,0],[32,1,32],'grass');
    box([0,0,0],[32,1,4],'stone');
    box([14,0,3],[18,1,9],'stone');
    box([3,0,7],[5,1,28],'stone'); box([27,0,7],[29,1,28],'stone');
    box([3,0,26],[29,1,28],'stone');
    for(let x=2;x<32;x+=4) block([x,0,1],'light');
  });
  component('floors', 'Three floor plates and balcony slabs', (box) => {
    for (const y of [1,6,11]) {
      if(y===1) {
        box([5,y,8],[27,y+1,26],'pale');
        box([6,y,10],[26,y+1,25],'floor');
        box([15,y,8],[17,y+1,9],'stair');
      } else {
        plate(box,y,5,27,8,26,'pale');
        plate(box,y,6,26,10,25,'floor');
      }
      if(y>1) {
        // A continuous central opening keeps both flights and headroom clear.
        for(const x of [6,19]) box([x,y,planted?5:6],[x+7,y+1,8],'pale');
      }
    }
  });
  component('front', modern?'Pale structural frames with charcoal reveals and wide glazing':'Recessed brick facade, glazing and pale piers', (box) => {
    for (const y of [1,6,11]) {
      box([5,y+1,9],[27,y+5,10],modern?'charcoal':'brick');
      for(const x of [7,20]) {
        box([x,y+1,9],[x+5,y+4,10],'glass');
        box([x,y+4,8],[x+5,y+5,9],modern?'charcoal':'dark');
      }
      box([14,y+1,9],[18,y+4,10], y===1?'air':'glass');
      for(const x of [5,12,18,26]) box([x,y+1,8],[x+1,y+5,9],modern?'pale':'dark');
      box([13,y+1,8],[14,y+5,9],'pale');
      if(modern) {
        for(const x of [6,19]) box([x,y+1,9],[x+7,y+4,10],'glass');
        box([13,y+1,8],[14,y+5,9],'warm');
      }
      if(y>1) for(const x of [10,20]) box([x,y+1,9],[x+1,y+3,10],'air');
    }
  });
  component('sides', 'Side walls and bedroom glazing', (box) => {
    for(const y of [1,6,11]) for(const x of [5,26]) {
      box([x,y+1,10],[x+1,y+5,26],'pale');
      for(const z of [12,20]) box([x,y+2,z],[x+1,y+4,z+3],'glass');
      box([x,y+1,16],[x+1,y+5,18],modern?'warm':'brick');
      if(modern) {
        for(const z of [11,20]) box([x,y+2,z],[x+1,y+4,z+4],'glass');
        box([x,y+4,11],[x+1,y+5,15],'charcoal');
      }
    }
  });
  component('rear', modern?'Charcoal rear elevation and landing windows':'Rear brickwork and landing windows', (box) => {
    for(const y of [1,6,11]) {
      box([6,y+1,25],[26,y+5,26],modern?'charcoal':'brick');
      for(const x of [7,14,20]) box([x,y+2,25],[x+4,y+4,26],'glass');
    }
  });
  component('partitions', 'Apartment boundaries and bedroom partitions', (box, block) => {
    for(const y of [1,6,11]) {
      for(const x of [13,18]) {
        box([x,y+1,10],[x+1,y+5,25],'pale');
        block([x,y+1,12],x===13?'door_w_lower':'door_e_lower');
        block([x,y+2,12],x===13?'door_w_upper':'door_e_upper');
      }
      for(const x of [6,19]) {
        box([x,y+1,18],[x+7,y+5,19],'pale');
        box([x+3,y+1,18],[x+5,y+3,19],'air');
        box([x+4,y+1,20],[x+5,y+5,25],'pale');
        box([x+4,y+1,20],[x+7,y+5,21],'pale');
        box([x+5,y+1,20],[x+6,y+3,21],'air');
      }
    }
  });
  component('stairs', 'Shared two-block-wide stair with an adjacent landing passage', (box) => {
    for(const y of [1,6,11]) for(let n=0;n<5;n++)
      box([14,y+1+n,17+n],[16,y+2+n,18+n],'stair');
  });
  component('furnishing', 'Living, kitchen and bedroom furniture studies', (box, block) => {
    for(const y of [1,6,11]) for(const x of [6,19]) {
      box([x,y+1,14],[x+3,y+2,15],'seat');
      box([x+1,y+1,12],[x+3,y+2,13],'slab');
      box([x+5,y+1,14],[x+7,y+2,17],'pale');
      block([x+5,y+1,16],'dark');
      box([x+1,y+1,21],[x+3,y+2,24],'timber');
      box([x+1,y+2,22],[x+3,y+3,24],'accent');
      box([x+1,y+2,21],[x+3,y+3,22],'cushion');
      box([x,y+1,20],[x+1,y+4,22],'timber');
      block([x+5,y+1,23],'basin');
      block([x+6,y+1,24],'stair');
      block([x+6,y+4,23],'light');
    }
  });
  component('balconies', 'Glazed balcony edges and planted corners', (box) => {
    for(const y of [6,11]) for(const x of [6,19]) {
      const z = planted?5:6;
      box([x,y+1,z],[x+7,y+2,z+1],'railing');
      box([x,y+1,z+1],[x+1,y+2,8],'side_railing');
      box([x+6,y+1,z+1],[x+7,y+2,8],'side_railing');
      if(planted) {
        box([x,y+1,z+1],[x+2,y+2,z+2],modern?'charcoal':'timber');
        box([x,y+2,z+1],[x+2,y+3,z+2],'leaves');
      }
    }
  });
  component('entrance', 'Sheltered entry and warm timber reveal', (box,block) => {
    const front = planted?5:7;
    box([14,5,front],[18,6,9],modern?'canopy':'pale');
    box([14,4,8],[15,5,9],'light'); box([17,4,8],[18,5,9],'light');
    if(planted) {
      const z=modern?8:6;
      box([14,modern?2:1,z],[15,4,z+1],modern?'charcoal':'timber');
      box([17,modern?2:1,z],[18,4,z+1],modern?'charcoal':'timber');
      if(!modern) {
        box([14,4,z],[15,5,z+1],'timber');
        box([17,4,z],[18,5,z+1],'timber');
      }
    }
  });
  component('roof', 'Shared planted roof terrace', (box,block) => {
    plate(box,16,5,27,8,26,'pale');
    box([6,17,8],[26,18,9],'railing');
    box([6,17,25],[26,18,26],'railing');
    for(const x of [5,26]) box([x,17,9],[x+1,18,25],'pale');
    for(const x of [7,22]) {
      box([x,17,20],[x+3,18,24],modern?'charcoal':'timber');
      box([x,18,20],[x+3,19,24],'leaves');
      block([x+1,18,21],'soil'); block([x+1,19,21],'flower');
    }
    box([7,17,12],[11,18,13],'seat');
    box([8,17,14],[10,18,16],'slab');
    if(modern) {
      // A shallow canopy leaves the rear garden open and clears the shared stair route.
      for(const x of [7,24]) box([x,17,16],[x+1,20,17],'charcoal');
      box([7,20,10],[25,21,17],'canopy');
    } else {
      for(const x of [7,24]) for(const z of [10,24]) box([x,17,z],[x+1,21,z+1],'timber');
      for(const z of [10,13,16,19,24]) box([7,21,z],[25,22,z+1],'timber');
      box([20,22,10],[25,23,14],'leaves');
    }
  });
  component('landscape', 'Layered planting and street-edge seating', (box,block) => {
    for(const x of [5,21]) {
      box([x,1,4],[x+6,2,6],'timber');
      box([x,2,4],[x+6,3,6],'leaves');
      for(let n=0;n<6;n+=2) { block([x+n,2,4],'soil'); block([x+n,3,4],'flower'); }
    }
    for(const x of [2,29]) {
      box([x,1,12],[x+1,6,13],'timber');
      box([x-1,5,11],[x+2,7,14],'leaves');
      box([x,7,12],[x+1,8,13],'leaves');
    }
    if(planted) {
      box([8,1,3],[12,2,4],'seat');
      box([20,1,3],[24,2,4],'seat');
    }
  });
  // Free standing volumes: geometry validation is separate from game collision testing.
  plan.spaces.push({id:'entry-approach',min:[15,2,4],max:[17,4,17]});
  for(const y of [1,6,11]) {
    plan.spaces.push({id:`landing-${y}`,min:[14,y+1,22],max:[18,y+4,25]});
    plan.spaces.push({id:`landing-passage-${y}`,min:[16,y+1,10],max:[18,y+3,25]});
    for(let n=0;n<5;n++) plan.spaces.push({id:`stair-headroom-${y}-${n}`,
      min:[14,y+2+n,17+n], max:[16,y+4+n,18+n]});
  }
  return plan;
}

if(require.main === module) {
  const dir = path.join(__dirname,'generated'); fs.mkdirSync(dir,{recursive:true});
  for(const revision of ['r0','r1','r2']) fs.writeFileSync(path.join(dir,`${revision}.plan.json`), JSON.stringify(apartment(revision),null,2));
}
module.exports = {apartment};
