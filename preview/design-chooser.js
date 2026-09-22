import {collectDesigns} from './design-library.js';
export function designChooser({getIndex,open}){
 const dialog=document.getElementById('design-chooser'),search=document.getElementById('chooser-search'),type=document.getElementById('chooser-type'),list=document.getElementById('chooser-list'),status=document.getElementById('chooser-status');let page=0;
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 function pick(id,revision){dialog.close();open(id,revision);}
 function render(){
  const q=search.value.trim().toLowerCase(),all=collectDesigns(getIndex()).filter(d=>(!type.value||d.type===type.value)&&[d.name,d.type,...d.drafts.map(v=>v.name+' '+d.siteName(v.siteId))].join(' ').toLowerCase().includes(q)).sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
  page=Math.min(page,Math.max(0,Math.ceil(all.length/8)-1));list.replaceChildren();
  for(const d of all.slice(page*8,page*8+8)){
   const row=node('article'),button=node('button');button.type='button';button.className='chooser-project';button.dataset.draftId=d.id;button.append(node('strong',d.name),node('span',d.type+' · '+d.siteName(d.siteId)));button.onclick=()=>pick(d.id);row.append(button);
   const editions=node('details');editions.append(node('summary',d.drafts.length+' drafts · '+d.saved.length+' saved versions'));
   for(const v of d.drafts){const b=node('button');b.type='button';b.dataset.draftId=v.id;b.append(node('strong',v.name),node('span',d.siteName(v.siteId)+(v.valid?'':' · Needs changes')));b.onclick=()=>pick(v.id);editions.append(b);}
   for(const v of d.saved){const b=node('button');b.type='button';b.append(node('strong','Review '+v.plan.name),node('span',d.siteName(v.siteId)+' · '+new Date(v.createdAt).toLocaleString()));b.onclick=()=>pick(v.draftId,v.id);editions.append(b);}
   row.append(editions);list.append(row);
  }
  status.textContent=all.length?`${page*8+1}–${Math.min(page*8+8,all.length)} of ${all.length} designs`:'No designs match this search.';
  document.getElementById('chooser-prev').disabled=page===0;document.getElementById('chooser-next').disabled=(page+1)*8>=all.length;
 }
 search.oninput=()=>{page=0;render();};type.onchange=()=>{page=0;render();};document.getElementById('chooser-prev').onclick=()=>{page--;render();};document.getElementById('chooser-next').onclick=()=>{page++;render();};document.getElementById('chooser-close').onclick=()=>dialog.close();
 return {show(){const current=type.value;type.replaceChildren(new Option('All building types',''),...[...new Set(collectDesigns(getIndex()).map(d=>d.type))].sort().map(t=>new Option(t,t)));type.value=current;render();dialog.showModal();search.focus();}};
}
