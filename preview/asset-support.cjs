// What each special block type actually supports, stage by stage. Keep this honest: every "yes" here is backed by a check
// (check-signs-beds, check-sign-construction, check-paper-signs) or by the isolated bridge policy in TestWorldBridge.
const TABLE=[
 {kind:'sign',label:'wall signs with text',preview:true,schematic:true,placement:'bridge-sign-data',note:'Text is compiled, exported as Sponge block entities and placed by a bridge that reports sign data.'},
 {kind:'bed',label:'beds',preview:true,schematic:true,placement:'never',note:'Simplified preview model; exported as block states; not in the isolated placement allowlist.'},
 {kind:'head',label:'custom heads',preview:false,schematic:false,placement:'never',note:'No preview model; profile and texture data are not exported; not placeable by the bridge.'},
];
const isHead=state=>/^minecraft:(player|zombie|skeleton|wither_skeleton|creeper|dragon|piglin)_(head|wall_head|skull|wall_skull)\b/.test(state);
const isBed=state=>/^minecraft:[a-z_]+_bed\[/.test(state);
function assetSupport(artifact,bridge){
 const counts={sign:(artifact.signs||[]).length,bed:0,head:0};
 for(const c of artifact.blocks||[]){if(isBed(c.block))counts.bed++;else if(isHead(c.block))counts.head++;}
 const signBridge=Boolean(bridge?.connected&&bridge.capabilities?.signData===1);
 return TABLE.filter(row=>counts[row.kind]>0).map(row=>({...row,count:counts[row.kind],placement:row.placement==='never'?false:signBridge,placementNote:row.placement==='bridge-sign-data'&&!signBridge?'needs a connected bridge with sign data':null}));
}
module.exports={assetSupport,TABLE};
