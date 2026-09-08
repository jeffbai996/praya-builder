// BlueMap identifies a location. Only an imported block survey can establish site state.
function integrationConfig(env=process.env){
 const mapUrl=env.BUILDER_MAP_URL||'';
 if(mapUrl&&!['http:','https:'].includes(new URL(mapUrl).protocol))throw Error('Invalid map URL');
 return {mapUrl,mapId:env.BUILDER_MAP_ID||'world',world:env.BUILDER_MAP_WORLD||'world',capture:'worldedit-schematic',placement:'isolated-bridge'};
}
function parseMapLocation(value,config){
 if(!config.mapUrl)throw Error('The map connection is not configured');
 const url=new URL(value),base=new URL(config.mapUrl),parts=url.hash.slice(1).split(':');
 if(url.origin!==base.origin||url.pathname!==base.pathname||decodeURIComponent(parts[0])!==config.mapId)throw Error('Choose a location on the configured world map');
 const x=Number(parts[1]),z=Number(parts[3]);
 if(!parts[1]||!parts[3]||![x,z].every(n=>Number.isFinite(n)&&Math.abs(n)<=29999800))throw Error('Map link has no usable location');
 return {x:Math.floor(x),z:Math.floor(z)};
}
function selectionMetadata(input,config){
 const {x,z,base,width,depth,height}=input;
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw Error('Give the plot a name');
 if(![x,z,base,width,depth,height].every(Number.isInteger)||![x,z,base].every(n=>Math.abs(n)<=29999800))throw Error('Use whole-block coordinates');
 if(![width,depth,height].every(n=>n>=4&&n<=128)||width*depth*height>262144)throw Error('Survey must fit within 262,144 blocks and 128 blocks per side');
 const contextMargin=input.contextMargin??0;
 if(!Number.isInteger(contextMargin)||contextMargin<0||contextMargin>16)throw Error('Surroundings must be between 0 and 16 blocks');
 const captureWidth=width+contextMargin*2,captureDepth=depth+contextMargin*2;
 if(captureWidth>128||captureDepth>128||captureWidth*captureDepth*height>262144)throw Error('Plot and surroundings exceed the survey budget');
 const origin=[x-Math.floor(width/2),base,z-Math.floor(depth/2)];
 const plot={min:origin,max:origin.map((n,i)=>n+[width,height,depth][i])},inside=p=>Array.isArray(p)&&p.length===3&&p.every((n,i)=>Number.isInteger(n)&&n>=plot.min[i]&&n<plot.max[i]);
 const frontage=input.frontage||[x,base+1,origin[2]],protectedAreas=input.protected||[];
 if(!inside(frontage)||!Array.isArray(protectedAreas)||protectedAreas.length>64||protectedAreas.some(b=>!inside(b?.min)||!Array.isArray(b?.max)||b.max.length!==3||!inside(b.max.map(n=>n-1))||b.min.some((n,i)=>n>=b.max[i])))throw Error('Frontage and protected areas must fit inside the selected plot');
 return {schemaVersion:1,name:input.name.trim(),world:config.world,origin:[origin[0]-contextMargin,base,origin[2]-contextMargin],plot,frontage,frontageHeight:input.frontageHeight==='terrain'?'terrain':'fixed',protected:protectedAreas,dimensions:{x:captureWidth,y:height,z:captureDepth},contextMargin,source:'bluemap-selection'};
}
function captureGuide(selection){
 const stem='builder-survey-'+selection.id;
 return {filename:stem+'.schem',world:selection.world,commands:[`//pos1 ${selection.origin.join(',')}`,`//pos2 ${selection.origin.map((n,i)=>n+selection.dimensions[['x','y','z'][i]]-1).join(',')}`,'//copy',`//schem save sponge ${stem}`],note:'Run in the selected world. These commands select and copy blocks; they do not paste or change the world. Upload the resulting WorldEdit schematic to complete the survey.'};
}
function placementPackage(revision,site,artifact){
 if(!site||revision.siteId!==site.id||revision.surveyHash!==site.hash||revision.artifactHash!==artifact.hash)throw Error('Saved revision and survey do not match');
 return {schemaVersion:1,kind:'builder-placement-handoff',execution:'review-required',revisionId:revision.id,world:site.world,siteId:site.id,surveyHash:site.hash,artifactHash:artifact.hash,transform:revision.transform,plot:site.plot,protected:site.protected,writeMask:'Listed cells only; explicit air clears; unlisted cells remain untouched.',artifact};
}
module.exports={integrationConfig,parseMapLocation,selectionMetadata,captureGuide,placementPackage};
