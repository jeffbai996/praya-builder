const types={
 'north-plot-point-tower':'Apartments','courtyard-apartments':'Apartments','rosedale-court':'Apartments',
 'study-bar':'Apartments','study-court':'Apartments','study-staggered':'Apartments',
 'terraced-brick-residences':'Houses','terrace-mews':'Houses','braemar-frame-house':'Houses',
 'garden-medical-clinic':'Healthcare','braemarhealth-hillside-clinic':'Healthcare',
 'civic-reading-room':'Civic & education','parkside-elementary':'Civic & education',
 'oakville-corner-stores':'Shops & mixed use','go-corner-market':'Shops & mixed use'
};
export const designKey=record=>record.project.split(':')[0];
export const designName=name=>name.replace(/ · (?:R\d+|Praya detail pass)$/,'');
export function collectDesigns(workspace){
 const groups=new Map(),sites=new Map(workspace.sites.map(s=>[s.id,s.name]));
 for(const d of workspace.drafts){const key=designKey(d);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d);}
 return [...groups].map(([key,drafts])=>{
  const saved=workspace.revisions.filter(r=>designKey(r)===key).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const touched=d=>[d.createdAt||'',...saved.filter(r=>r.draftId===d.id).map(r=>r.createdAt)].sort().at(-1);
  drafts.sort((a,b)=>touched(b).localeCompare(touched(a)));
  const current=drafts.find(d=>d.valid)||drafts[0];
  const revision=saved.find(r=>r.draftId===current.id&&r.artifactHash===current.candidateHash);
  return {...current,key,name:designName(current.name),type:types[key]||'Other',revision,saved,drafts,
   siteName:id=>sites.get(id)||'Unassigned site',versions:saved.length,savedAt:touched(current)};
 });
}
