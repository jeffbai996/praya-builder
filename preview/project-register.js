const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const address=a=>[a.location.number,a.location.street,a.location.unit&&'Unit '+a.location.unit].filter(Boolean).join(' ');
const place=a=>[address(a),a.location.neighbourhood,a.location.municipality].filter(Boolean).join(' · ');
const studio=(draft,review)=>'/studio?draft='+encodeURIComponent(draft)+(review?'&review='+encodeURIComponent(review):'')+'#design-workspace';
async function get(url,options){const r=await fetch(url,options);const body=await r.json();if(!r.ok)throw Error(body.error||'Could not load the register');return body;}
export function mountProjectRegister(){
 let page=0,sequence=0,timer,editing,returnFocus;
 const dialog=el('dialog','location-dialog');dialog.id='location-dialog';dialog.setAttribute('aria-labelledby','location-title');
 dialog.innerHTML=`<form id="location-form"><div class="location-heading"><h2 id="location-title">Project location</h2><button type="button" id="location-close" class="secondary-button" aria-label="Close location">Close</button></div><p id="location-project"></p><label>Site application<select id="location-application"></select></label><p id="location-survey" class="hint"></p><div class="location-fields"><label>Street number<input id="location-number" maxlength="120" autocomplete="off"></label><label>Street<input id="location-street" maxlength="120" autocomplete="off"></label><label>Unit / suffix<input id="location-unit" maxlength="120" autocomplete="off"></label><label>Municipality<input id="location-municipality" maxlength="120" autocomplete="off"></label><label>Neighbourhood<input id="location-neighbourhood" maxlength="120" autocomplete="off"></label><label>Address status<select id="location-status"><option value="unverified">Not verified</option><option value="verified">Verified from source</option></select></label><label class="location-source">Source / note<input id="location-source" maxlength="500" placeholder="Street sign, survey record, or source link" autocomplete="off"></label></div><p class="hint">Use an existing Praya address. These details apply to this site application.</p><p id="location-error" class="location-error" role="alert"></p><div class="location-actions"><button type="button" id="location-cancel" class="secondary-button">Cancel</button><button id="location-save" type="submit" class="primary-button">Save location</button></div></form>`;
 document.body.append(dialog);
 const fields=['number','street','unit','municipality','neighbourhood','status','source'];
 function loadLocation(){const a=editing.applications.find(a=>a.id===$('location-application').value);for(const key of fields)$('location-'+key).value=a.location[key];$('location-error').textContent='';$('location-survey').textContent=a.site?[a.site.name,a.site.world,'X/Y/Z '+(a.site.origin||[]).join(', ')].filter(Boolean).join(' · '):'Unassigned study · no survey linked';}
 async function editLocation(key,button,applicationId){try{editing=await get('/api/workspace/library/projects/'+encodeURIComponent(key));returnFocus=button;$('location-project').textContent=editing.name;$('location-application').replaceChildren(...editing.applications.map(a=>new Option(a.site?.name||'Unassigned study',a.id)));if(applicationId)$('location-application').value=applicationId;loadLocation();dialog.showModal();}catch(e){$('working-design-status').textContent=e.message;}}
 $('location-application').onchange=loadLocation;
 $('location-close').onclick=$('location-cancel').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>returnFocus?.isConnected?returnFocus.focus():$('working-search').focus());
 $('location-form').onsubmit=async e=>{e.preventDefault();const a=editing.applications.find(a=>a.id===$('location-application').value);$('location-save').disabled=true;$('location-error').textContent='';try{await get('/api/workspace/library/locations/'+a.id,{method:'POST',headers:{'Content-Type':'application/json','X-Builder-Write':'1'},body:JSON.stringify({expectedVersion:a.version,location:Object.fromEntries(fields.map(k=>[k,$('location-'+k).value]))})});dialog.close();await refresh();}catch(error){$('location-error').textContent=error.message;}finally{$('location-save').disabled=false;}};
 function card(d){
  const card=el('article','library-design'),link=el('a','working-design-link');link.href=studio(d.draftId||d.revision.draftId,d.draftId?null:d.revision.id);
  const thumb=el('span','working-thumb');if(d.revision){const img=el('img');img.src='/api/workspace/revisions/'+d.revision.id+'/thumbnail';img.alt='';img.loading='lazy';img.onerror=()=>{img.remove();thumb.textContent='No preview';};thumb.append(img);}else thumb.textContent='Draft';
  const text=el('div','working-card-text');text.append(el('strong','',d.name),el('span','working-meta',d.type+' · '+d.versionCount+' saved version'+(d.versionCount===1?'':'s')));
  const arrow=el('span','working-open','→');arrow.setAttribute('aria-hidden','true');link.append(thumb,text,arrow);card.append(link);
  const locations=el('div','project-locations');
  for(const a of d.applications){const row=el('div','project-location');row.append(el('span','location-address',place(a)||a.site?.name||'Unassigned study'));if(address(a))row.append(el('span','address-status '+(a.location.status==='verified'?'verified':''),a.location.status==='verified'?'Verified':'Not verified'));else if(a.site)row.append(el('span','address-status','Address not recorded'));locations.append(row);}
  const edit=el('button','location-edit',d.applications.some(a=>place(a))?'Edit location':'Add address / location');edit.type='button';edit.onclick=()=>editLocation(d.key,edit,d.applications[0]?.id);locations.append(edit);card.append(locations);
  const history=el('details','library-editions');history.append(el('summary','',d.versionCount+' saved version'+(d.versionCount===1?'':'s')+' · '+d.draftCount+' draft'+(d.draftCount===1?'':'s')));
  let loaded=false;history.addEventListener('toggle',async()=>{if(!history.open||loaded)return;loaded=true;const content=el('div','edition-list','Loading versions…');history.append(content);try{const detail=await get('/api/workspace/library/projects/'+encodeURIComponent(d.key));content.replaceChildren();const locationFor=r=>{const a=detail.applications.find(a=>a.project===r.project);return a?place(a)||a.site?.name||'Unassigned study':'Unassigned study';};
   for(const r of detail.saved){const a=el('a','edition-link');a.href=studio(r.draftId,r.id);a.append(el('strong','',r.name+' · '+r.revision.toUpperCase()),el('span','',locationFor(r)+' · '+new Date(r.createdAt).toLocaleString()),el('span','','Review saved version'));content.append(a);}
   const drafts=el('details','library-drafts');drafts.append(el('summary','','Working drafts ('+detail.drafts.length+')'));for(const d of detail.drafts){const a=el('a','edition-link');a.href=studio(d.id);a.append(el('strong','',d.name),el('span','',locationFor(d)+(d.valid?'':' · Needs changes')));drafts.append(a);}content.append(drafts);
  }catch(e){content.textContent=e.message;const retry=el('button','secondary-button','Retry');retry.onclick=()=>{content.remove();loaded=false;history.open=false;history.open=true;};content.append(retry);}});card.append(history);return card;
 }
 function options(id,values,label){const before=$(id).value;$(id).replaceChildren(new Option(label,''),...values.map(v=>new Option(v,v)));$(id).value=values.includes(before)?before:'';}
 async function refresh(){
  const request=++sequence;$('working-design-list').setAttribute('aria-busy','true');
  const params=new URLSearchParams({q:[$('search').value,$('working-search').value].join(' ').trim(),type:$('working-type').value,municipality:$('working-municipality').value,assignment:$('working-assignment').value,sort:$('working-sort').value,page:String(page)});
  try{const data=await get('/api/workspace/library/projects?'+params);if(sequence!==request)return;page=data.page;
   options('working-type',data.types,'All building types');options('working-municipality',data.municipalities,'All municipalities');$('working-municipality').hidden=!data.municipalities.length;
   $('working-design-list').replaceChildren(...data.items.map(card));$('working-design-count').textContent=data.projectCount+' designs';$('nav-count').textContent=String(data.projectCount).padStart(2,'0');
   $('working-design-status').textContent=data.total?`${page*data.size+1}–${Math.min((page+1)*data.size,data.total)} of ${data.total} designs`:'No designs match. Try another address, place or name.';
   $('working-prev').disabled=page===0;$('working-next').disabled=page>=data.pages-1;document.querySelector('.library-pagination').hidden=data.pages<=1;
   if(data.recent){$('continue-design-name').textContent=data.recent.name;$('continue-design-link').href=studio(data.recent.draftId);$('continue-design').hidden=false;}
  }catch(e){if(sequence!==request)return;$('working-design-list').replaceChildren();$('working-design-status').textContent=e.message;const retry=el('button','secondary-button','Retry');retry.onclick=refresh;$('working-design-list').append(retry);}
  finally{if(sequence===request)$('working-design-list').removeAttribute('aria-busy');}
 }
 function search(){page=0;clearTimeout(timer);sequence++;timer=setTimeout(refresh,180);}
 $('working-search').oninput=search;
 for(const id of ['working-type','working-sort','working-municipality','working-assignment'])$(id).onchange=()=>{page=0;refresh();};
 $('working-prev').onclick=()=>{page--;refresh();};$('working-next').onclick=()=>{page++;refresh();};
 return {refresh,search};
}
