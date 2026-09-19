const el=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
const HASH=/^[a-f0-9]{64}$/;
async function api(route,body){const response=await fetch('/api/workspace/'+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-Builder-Write':'1'}:{},body:body?JSON.stringify(body):undefined});let result;try{result=await response.json();}catch{result={};}if(!response.ok){const error=Error(result.error||'Comparison unavailable');error.status=response.status;throw error;}return result;}
function sheetIdentity(descriptor){
 if(!descriptor||!HASH.test(descriptor.artifactHash||'')||!HASH.test(descriptor.reviewHash||''))throw Error('Invalid review identity');
 const prefix=`/api/workspace/artifacts/${descriptor.artifactHash}/sheet/`,suffix=`?review=${descriptor.reviewHash}`;
 if(descriptor.index!==prefix+'index.json'+suffix)throw Error('Invalid review link');
 return {artifactHash:descriptor.artifactHash,reviewHash:descriptor.reviewHash,prefix,suffix,route:descriptor.index.slice('/api/workspace/'.length)};
}
function sheetViews(sheet,identity){
 if(!sheet||sheet.artifactHash!==identity.artifactHash||sheet.reviewHash!==identity.reviewHash||!Array.isArray(sheet.views))throw Error('Review identity changed while loading');
 for(const view of sheet.views){if(!view||!/^[-a-z0-9]+\.png$/.test(view.file||'')||view.url!==identity.prefix+view.file+identity.suffix)throw Error('Invalid image link');}
 return sheet.views;
}
export async function mountBakeoffs(container){
 if(!container)return;container.replaceChildren();
 const heading=el('div',null,'library-heading');heading.append(el('h2','Design comparisons'));container.append(heading);
 const status=el('p','Loading comparisons…','hint');status.setAttribute('role','status');container.append(status);
 try{
  const records=await api('bakeoffs');
  status.textContent=records.length?'Compare geometry and diagnostics, then reveal who made each proposal.':'Run a brief with the bake-off CLI to compare proposals here.';
  for(let record of records.slice().reverse()){
   const section=el('section',null,'bakeoff-card');section.append(el('h3',record.name),el('p',record.brief.text,'hint'));
   const body=el('div',null,'bakeoff-entrants'),message=el('p',null,'hint'),gallery=el('div',null,'bakeoff-gallery');message.setAttribute('role','status');
   let viewToken=0;
   function draw(){
    body.replaceChildren();
    for(const entry of record.entrants){
     const card=el('article',null,'bakeoff-entrant');card.dataset.label=entry.label;card.append(el('h4','Entrant '+entry.label));
     if(record.revealed)card.append(el('p',[entry.author?.model,entry.author?.effort,entry.author?.agent].filter(Boolean).join(' · '),'bakeoff-author'));
     card.append(el('p',entry.state.replaceAll('-',' '),'bakeoff-state'));
     if(entry.cells!==undefined)card.append(el('p',`${entry.cells.toLocaleString()} cells · ${entry.components} components`));
     if(entry.diagnostics)card.append(el('p',`${entry.diagnostics.error} errors · ${entry.diagnostics.warning} warnings · ${entry.diagnostics.info} notes`));
     if(entry.walk)card.append(el('p',!entry.walk.checked?'Access not checked · no survey':entry.walk.issues?.length?'Access needs review':'Access checks passed'));
     if(entry.error)card.append(el('p',record.revealed&&entry.detail?entry.detail:entry.error,'hint'));
     if(entry.sheet){
      const open=el('button','Review sheets','secondary-button');open.type='button';
      open.onclick=async()=>{const token=++viewToken;gallery.replaceChildren();message.textContent='Preparing Entrant '+entry.label+' sheets…';open.disabled=true;
       try{const identity=sheetIdentity(entry.sheet),sheet=await api(identity.route);if(token!==viewToken)return;const views=sheetViews(sheet,identity);
        for(const view of views){const figure=el('figure'),link=el('a');link.href=view.url;link.target='_blank';link.rel='noopener';const img=el('img');img.src=view.url;img.alt='Entrant '+entry.label+' · '+view.label;img.loading='lazy';link.append(img);figure.append(link,el('figcaption',view.label));gallery.append(figure);}message.textContent='Entrant '+entry.label+' · '+views.length+' sheets';
       }catch(error){if(token===viewToken)message.textContent=error.message;}finally{open.disabled=false;}};
      card.append(open);
     }
     body.append(card);
    }
   }
   const reveal=el('button',record.revealed?'Authors revealed':'Reveal authors','secondary-button');reveal.type='button';reveal.disabled=record.revealed;
   reveal.onclick=async()=>{reveal.disabled=true;try{record=await api('bakeoffs/'+record.id+'/reveal',{expectedVersion:record.version});draw();reveal.textContent='Authors revealed';message.textContent='Authors revealed. The comparison has no automatic winner.';}catch(error){
    if(error.status===409){try{record=await api('bakeoffs/'+record.id);draw();reveal.textContent=record.revealed?'Authors revealed':'Reveal authors';reveal.disabled=record.revealed;message.textContent=record.revealed?'Comparison changed and was reloaded. Authors were already revealed.':'Comparison changed and was reloaded. Review it, then choose Reveal authors again.';}catch(reloadError){message.textContent=reloadError.message;reveal.textContent='Retry reveal';reveal.disabled=false;}}
    else{message.textContent=error.message;reveal.textContent='Retry reveal';reveal.disabled=false;}
   }};
   draw();section.append(body,reveal,message,gallery);container.append(section);
  }
 }catch(error){status.textContent=error.message;const retry=el('button','Retry comparisons','secondary-button');retry.onclick=()=>mountBakeoffs(container);container.append(retry);}
}
