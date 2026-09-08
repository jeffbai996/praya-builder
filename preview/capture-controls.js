export function captureControls({api,action,status,refresh,selectSite,selection}){
 const $=id=>document.getElementById(id);let job,timer,bridge,serial=0;
 async function show(next){
  ++serial;
  job=next;const count=job.state==='verifying'?job.verified:job.read;
  $('capture-progress').max=job.total*2;$('capture-progress').value=job.read+job.verified;
  $('capture-result').textContent=job.state==='reading'?`Reading surroundings · ${count.toLocaleString()} of ${job.total.toLocaleString()} blocks`:job.state==='verifying'?`Verifying survey · ${count.toLocaleString()} of ${job.total.toLocaleString()} blocks`:job.message||job.state;
  $('capture-result').dataset.state=job.state;$('capture-cancel').disabled=!['reading','verifying'].includes(job.state);$('capture-open').hidden=job.state!=='completed';
  clearTimeout(timer);
  if(['reading','verifying'].includes(job.state)){const expected=++serial;timer=setTimeout(async()=>{try{const result=await api('captures/'+job.id);if(expected===serial)await show(result);}catch(e){status(e.message);}},700);}
  else $('capture-start').disabled=!eligible();
 }
 function eligible(){const s=selection();return Boolean(s&&bridge?.connected&&bridge.capabilities?.survey===1&&bridge.world===s.world&&Array.isArray(bridge.minimum)&&Array.isArray(bridge.maximum)&&s.origin.every((n,i)=>n>=bridge.minimum[i]&&n+s.dimensions[['x','y','z'][i]]<=bridge.maximum[i]));}
 async function select(){
  clearTimeout(timer);serial++;job=null;$('capture-open').hidden=true;$('capture-cancel').disabled=true;$('capture-progress').value=0;
  bridge=await api('capture/status');const s=selection();$('capture-start').disabled=!eligible();
  $('capture-connection').textContent=eligible()?`Automatic capture ready · ${bridge.world}`:bridge.connected?`Automatic capture is connected to ${bridge.world}. Select a plot in that reserved area, or use a schematic below.`:'Capture adapter unavailable. Schematic import remains available.';
  $('capture-result').textContent='A complete capture is checked twice before becoming a survey.';
  const config=await api('integration'),recent=config.captures.filter(j=>j.selectionId===s?.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  $('capture-history').replaceChildren(new Option('Choose a capture',''),...recent.map(j=>new Option(new Date(j.createdAt).toLocaleString()+' · '+j.state,j.id)));
  if(recent.length){$('capture-history').value=recent[0].id;await show(await api('captures/'+recent[0].id));}
 }
 $('capture-start').onclick=()=>action(async()=>{const s=selection();if(!s)throw Error('Choose a saved plot');$('capture-start').disabled=true;try{await show(await api('selections/'+s.id+'/capture',{}));status('Capturing and checking the selected surroundings…');}catch(e){$('capture-start').disabled=!eligible();throw e;}});
 $('capture-cancel').onclick=()=>action(async()=>{if(job)await show(await api('captures/'+job.id+'/cancel',{}));});
 $('capture-history').onchange=()=>action(async()=>{if($('capture-history').value)await show(await api('captures/'+$('capture-history').value));});
 $('capture-open').onclick=()=>action(async()=>{if(!job?.siteId)return;await refresh();await selectSite(job.siteId);status('Verified survey opened. Ready to develop proposals.');});
 return {select};
}
