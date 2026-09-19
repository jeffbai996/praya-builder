// Blind presentation, shared validation, and a durable comparison ledger.
const clone=value=>JSON.parse(JSON.stringify(value));
const clean=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid '+label);return value;};
function author(value){
 if(!value||typeof value!=='object')throw Error('Entrant author is required');
 const result={agent:clean(value.agent,120,'agent'),model:clean(value.model,120,'model')};
 if(value.effort)result.effort=clean(value.effort,80,'effort');return result;
}
class BakeoffService{
 constructor({store,service,sheets}){this.store=store;this.service=service;this.sheets=sheets;this.tail=Promise.resolve();this.pending=0;}
 enqueue(work){if(this.pending>=4){const error=Error('Comparison queue is full; retry after current work finishes');error.status=429;return Promise.reject(error);}this.pending++;const result=this.tail.then(work);this.tail=result.catch(()=>{});return result.finally(()=>this.pending--);}
 create(input){
  if(!Array.isArray(input.entrants)||input.entrants.length<2||input.entrants.length>6)throw Error('Choose two to six entrants');
  const brief=input.brief;if(!brief||typeof brief!=='object')throw Error('A brief is required');
  const text=clean(brief.text,12000,'brief text');
  if(brief.siteId)this.store.get('sites',brief.siteId);
  const transform=brief.transform||{origin:[0,0,0],turns:0};
  if(!Array.isArray(transform.origin)||transform.origin.length!==3||!transform.origin.every(Number.isInteger)||!Number.isInteger(transform.turns)||transform.turns<0||transform.turns>3)throw Error('Invalid brief transform');
  const references=brief.references||[];if(!Array.isArray(references)||references.length>24||references.some(r=>typeof r!=='string'||r.length>2000))throw Error('Invalid brief references');
  return this.store.create('bakeoffs',{schemaVersion:1,name:clean(input.name||'Design comparison',120,'comparison name'),brief:{text,siteId:brief.siteId||null,transform:clone(transform),references},revealed:false,entrants:input.entrants.map((entry,i)=>({label:String.fromCharCode(65+i),author:author(entry),state:'pending'}))});
 }
 submit(id,input){return this.enqueue(()=>this.submitEntry(id,input));}
 async submitEntry(id,input){
  const record=this.store.get('bakeoffs',id);
  if(record.version!==input.expectedVersion){const e=Error('Comparison changed; reload before submitting');e.status=409;throw e;}
  const entry=record.entrants.find(e=>e.label===input.label);if(!entry||entry.state!=='pending')throw Error('Entrant is not pending');
  let outcome;
  if(input.failure){outcome={state:'failed',error:'Entrant command failed or returned no usable plan.'};}
  else{
   try{
    const draft=await this.service.createDraft({plan:input.plan,siteId:record.brief.siteId,transform:record.brief.transform,brief:record.brief.text,author:entry.author});
    const counts={error:0,warning:0,info:0};for(const d of draft.diagnostics||[])if(d.severity in counts)counts[d.severity]++;
    const sheet=this.sheets.describe({...draft,reviewLabel:'Entrant '+entry.label});
    outcome={state:draft.valid?'ready':'needs-changes',draftId:draft.id,artifactHash:draft.candidate.hash,cells:draft.candidate.blocks.length,components:draft.candidate.components.length,diagnostics:counts,walk:clone(draft.access||null),sheet};
   }catch(error){outcome={state:'failed',error:'Plan compilation or validation failed.',detail:String(error.message).slice(0,1000)};}
  }
  // Serialize this route through the workspace service queue at the caller. A
  // failed record write is visible, never reported as a successful submission.
  return this.store.update('bakeoffs',id,input.expectedVersion,{...record,entrants:record.entrants.map(e=>e.label===entry.label?{...e,...outcome}:e)});
 }
 reveal(id,input){return this.enqueue(()=>{const record=this.store.get('bakeoffs',id);return this.store.update('bakeoffs',id,input.expectedVersion,{...record,revealed:true});});}
 view(record){
  return {...record,entrants:record.entrants.map(entry=>{const {author,detail,draftId,...visible}=entry;return record.revealed?{...visible,author,detail,draftId}:visible;})};
 }
 list(){return this.store.list('bakeoffs').map(record=>this.view(record));}
}
module.exports={BakeoffService};
