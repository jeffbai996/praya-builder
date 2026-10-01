const {diff,authorOf}=require('./design-service.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const conflict=message=>{const error=Error(message);error.status=409;return error;};
class RevisionReview{
 constructor(store,service){this.store=store;this.service=service;}
 baseline(request){const draft=this.store.get('drafts',request.draftId);if(draft.version!==request.expectedVersion||draft.candidate.hash!==request.baselineHash)throw conflict('This request is obsolete. Create a request from the current draft.');return draft;}
 context(id){const request=this.store.get('requests',id),draft=this.baseline(request);return {request,context:this.service.context(draft.id),submit:'/api/workspace/requests/'+id+'/candidates'};}
 submit(id,input){return this.service.serialized(async()=>{
  const request=this.store.get('requests',id),draft=this.baseline(request),author=authorOf(input.author),plan=clone(input.plan);
  if(!plan||plan.plan_id!==draft.plan.plan_id||plan.revision!==draft.plan.revision)throw Error('Candidate must retain the draft identity');
  let result,changes=[],scopeErrors=[];
  try{
   result=await this.service.evaluate(plan,draft.siteId,draft.transform);
   changes=diff(result.candidate,draft.candidate);
   if(request.componentId){
    const selected=request.componentId,old=new Map(draft.candidate.blocks.map(c=>[[c.x,c.y,c.z].join(','),c]));
    for(const change of changes){const before=old.get([change.x,change.y,change.z].join(','));if(change.component!==selected||(before&&before.component!==selected))scopeErrors.push('Geometry outside the selected component changed');}
    const unchanged=p=>({...p,components:p.components.filter(c=>c.id!==selected),palette:undefined,signs:undefined});
    if(JSON.stringify(unchanged(plan))!==JSON.stringify(unchanged(draft.plan)))scopeErrors.push('Plan structure outside the selected component changed');
   }
  }catch(error){result={valid:false,diagnostics:[{rule:'compile.invalid-plan',severity:'error',message:error.message}],candidate:null};}
  // Compilation may have yielded while another process changed the draft.
  this.baseline(request);
  const diagnostics=[...result.diagnostics,...[...new Set(scopeErrors)].map(message=>({rule:'revision.scope',severity:'error',message}))];
  return this.store.create('candidates',{schemaVersion:1,requestId:id,draftId:draft.id,baselineHash:request.baselineHash,expectedVersion:request.expectedVersion,plan,author,artifactHash:result.candidate?.hash||null,valid:result.valid&&!scopeErrors.length,diagnostics,diagnosticsVersion:result.diagnosticsVersion||null,access:result.access||null,changes});
 });}
 accept(id){return this.service.serialized(async()=>{
  const candidate=this.store.get('candidates',id),existing=this.store.list('revisions').find(r=>r.candidateId===id);if(existing)return existing;
  if(!candidate.valid)throw Error('Fix candidate diagnostics before accepting');
  const request=this.store.get('requests',candidate.requestId),draft=this.baseline(request);
  const latest=this.store.list('revisions').filter(r=>r.project===draft.project).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  if(latest&&latest.artifactHash!==candidate.baselineHash&&latest.artifactHash!==draft.parentHash)throw conflict('Another version has been saved. Rebase this request before accepting.');
  // One immutable record is the acceptance boundary. The baseline draft stays intact.
  return this.store.create('revisions',{schemaVersion:1,project:draft.project,draftId:draft.id,candidateId:id,requestId:request.id,parentHash:candidate.baselineHash,artifactHash:candidate.artifactHash,surveyHash:draft.surveyHash,siteId:draft.siteId,transform:draft.transform,brief:draft.brief,author:candidate.author,plan:candidate.plan,diagnostics:candidate.diagnostics,diagnosticsVersion:candidate.diagnosticsVersion,access:candidate.access,idempotencyKey:'candidate-'+id});
 });}
}
module.exports={RevisionReview};
