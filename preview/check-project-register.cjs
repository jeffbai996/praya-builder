const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {FileStore}=require('./workspace-store.cjs');
const {ProjectRegister,idFor}=require('./project-register.cjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'praya-register-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const store=new FileStore(root);return {root,store,register:new ProjectRegister(store)};}
function draft(store,key,siteId=null,name=key){return store.create('drafts',{project:key+':'+(siteId||'unassigned'),siteId,plan:{name,revision:'r1',primitives:['private-geometry']},candidate:{hash:'artifact-'+key,blocks:['private-blocks']},history:['private-history'],valid:true});}
const location=extra=>({number:'18',street:'Example Avenue',unit:'',municipality:'Example municipality',neighbourhood:'Example neighbourhood',status:'unverified',source:'TEST FIXTURE ONLY',...extra});
test('hundreds of projects paginate compact summaries, grouped editions and lazy history without mutating source records',t=>{
 const {store,register}=fixture(t);
 // Direct fixture writes keep this test focused on reads rather than quota accounting.
 fs.mkdirSync(path.join(store.root,'drafts'));
 for(let i=0;i<305;i++)fs.writeFileSync(store.file('drafts','draft-'+i),JSON.stringify({id:'draft-'+i,project:'design-'+i+':unassigned',plan:{name:'Design '+i,revision:'r1',geometry:'must not escape'},siteId:null,candidate:{hash:'hash'+i,blocks:['heavy']},createdAt:'2026-09-01',valid:true}));
 const before=fs.readFileSync(store.file('drafts','draft-0'));
 let result=register.list(new URLSearchParams({size:'6',page:'50'}));assert.equal(result.total,305);assert.equal(result.items.length,5);assert.equal(result.pages,51);
 const serialized=JSON.stringify(result);assert.ok(serialized.length<14000);assert.equal(/geometry|heavy|"plan"|"history"|"blocks"/.test(serialized),false);
 assert.equal(register.list(new URLSearchParams({q:'Design 304'})).items[0].key,'design-304');
 assert.equal(register.list(new URLSearchParams({page:'999'})).page,50);
 assert.throws(()=>register.list(new URLSearchParams({size:'10000'})),/page/);
 assert.throws(()=>register.list(new URLSearchParams({page:'-1'})),/page/);
 assert.deepEqual(fs.readFileSync(store.file('drafts','draft-0')),before);assert.equal(fs.existsSync(path.join(store.root,'project-locations')),false);
});
test('location identity survives renames and restart, keeps sites separate, verifies provenance and rejects stale saves',t=>{
 const {store,register}=fixture(t),site=store.create('sites',{name:'Site A',world:'isolated-test',worldId:'world-a',origin:[10,64,20],blocks:[]});
 const first=draft(store,'tower',site.id,'Tower'),other=draft(store,'tower',null,'Tower study');
 const before=JSON.stringify(store.get('drafts',first.id)),id=idFor(first.project);
 register.update(id,{expectedVersion:0,location:location()});
 let group=register.detail('tower');assert.equal(group.applications.length,2);assert.equal(group.drafts.length,2);
 assert.equal(group.applications.find(a=>!a.siteId).location.street,'');
 const query=new URLSearchParams({q:'18 Example',municipality:'Example municipality',assignment:'addressed'}),listed=register.list(query);
 assert.equal(listed.total,1);assert.equal(listed.items[0].draftId,first.id);assert.equal(listed.items[0].applications.length,1);
 assert.equal(register.list(new URLSearchParams({assignment:'unassigned'})).items[0].draftId,other.id);
 assert.equal(register.list(new URLSearchParams({assignment:'unassigned',municipality:'Example municipality'})).total,0);
 assert.throws(()=>register.update(id,{expectedVersion:0,location:location()}),e=>e.status===409);
 assert.throws(()=>register.update(id,{expectedVersion:1,location:location({status:'verified',source:''})}),/source/);
 assert.throws(()=>register.update(id,{expectedVersion:1,location:location({street:''})}),/street/);
 assert.throws(()=>register.update(id,{expectedVersion:1,location:location({intruder:'x'})}),/Unknown/);
 const saved=register.update(id,{expectedVersion:1,location:location({status:'verified'})});assert.equal(saved.version,2);
 assert.equal(JSON.stringify(store.get('drafts',first.id)),before);
 store.update('drafts',first.id,1,{...first,plan:{...first.plan,name:'Renamed Tower'}});
 group=new ProjectRegister(new FileStore(store.root)).detail('tower');assert.equal(group.applications.find(a=>a.id===id).location.street,'Example Avenue');
 assert.equal(group.drafts.find(d=>d.id===first.id).name,'Renamed Tower');
});
test('saved versions stay immutable and searchable when no current draft exists',t=>{
 const {store,register}=fixture(t),revision=store.create('revisions',{project:'library:unassigned',draftId:'old-draft',siteId:null,plan:{name:'Library',revision:'r3',blocks:['private']},artifactHash:'fixed'});
 const before=fs.readFileSync(store.file('revisions',revision.id));
 const record=register.list().items[0];assert.equal(record.revision.id,revision.id);assert.equal(record.draftId,null);
 register.update(record.applications[0].id,{expectedVersion:0,location:location()});assert.deepEqual(fs.readFileSync(store.file('revisions',revision.id)),before);
 assert.equal(register.detail('library').saved[0].revision,'r3');
});
