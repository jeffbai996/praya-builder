const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export function createPartsUI({container,api,apply,onChange=()=>{}}){
 let parts=[],draft=null,loaded=false,loading=null,selectedCell=null,draftToken=0;
 const detail=node('details'),heading=node('summary','Insert architectural part'),select=node('select');select.id='part-select';
 const label=node('label','Part');label.htmlFor=select.id;
 const description=node('p'),fields=node('div'),position=node('div'),hint=node('p','Click a block to use its position, then adjust it to free space.');description.className=hint.className='hint';fields.className='part-parameters';position.className='part-position';
 const coords=['X','Y','Z'].map((axis,i)=>{const label=node('label',axis),input=node('input');input.type='number';input.step='1';input.min='0';input.required=true;input.id='part-'+axis.toLowerCase();input.setAttribute('aria-label','Part '+axis+' position');input.value='0';label.append(input);position.append(label);return input;});
 const insert=node('button','Preview part');insert.id='insert-part';insert.type='button';insert.className='preview-action';insert.disabled=true;
 const message=node('p');message.className='hint';message.setAttribute('role','status');detail.append(heading,label,select,description,fields,hint,position,insert,message);container.append(detail);

 function partCalls(operations){for(const op of operations||[]){if(op.op==='call'||partCalls(op.operations))return true;}return false;}
 function render(){
  const part=parts.find(p=>p.id===select.value);fields.replaceChildren();insert.disabled=!draft||!part;
  if(!part){description.textContent='';return;}description.textContent=part.description||part.id;let missingMaterial=false;
  for(const [name,definition]of Object.entries(part.parameters)){
   const label=node('label',name.replaceAll('_',' '));let input;
   if(definition.type==='integer'){input=node('input');input.type='number';input.min=definition.min;input.max=definition.max;input.step='1';input.value=definition.default;}
   else{input=node('select');const values=definition.type==='material'?Object.keys(draft?.plan.palette||{}):definition.values;for(const value of values)input.append(new Option(value.replaceAll('_',' '),value));if(values.includes(definition.default))input.value=definition.default;if(definition.type==='material'&&!values.length)missingMaterial=true;}
   input.required=true;input.dataset.parameter=name;input.dataset.type=definition.type;input.setAttribute('aria-label',name);label.append(input);fields.append(label);
  }
  insert.disabled=!draft||missingMaterial;
  if(missingMaterial)message.textContent='This design needs at least one palette material before this part can be inserted.';
  else if(message.textContent.startsWith('This design needs at least one palette material'))message.textContent='';
 }
 async function load(){
  if(loaded)return parts;if(loading)return loading;message.textContent='Loading parts…';
  loading=(async()=>{const registry=await api('parts');if(!registry||!Array.isArray(registry.parts))throw Error('Parts registry is unavailable');parts=registry.parts;select.replaceChildren(...parts.map(p=>new Option(p.id.replaceAll('.',' · ').replaceAll('-',' '),p.id)));loaded=true;message.textContent='';render();onChange();return parts;})();
  try{return await loading;}catch(error){message.textContent=error.message;throw error;}finally{loading=null;}
 }
 select.onchange=render;
 detail.addEventListener('toggle',()=>{if(detail.open&&!loaded)load().catch(()=>{});});
 insert.onclick=async()=>{if(!draft)return;const token=draftToken;insert.disabled=true;message.textContent='Compiling part…';
  const inputs=[...coords,...fields.querySelectorAll('[data-parameter]')],invalid=inputs.find(input=>!input.checkValidity());
  if(invalid){message.textContent='Complete the part position and parameters within their allowed bounds.';invalid.reportValidity();insert.disabled=false;return;}
  const params={};for(const input of fields.querySelectorAll('[data-parameter]'))params[input.dataset.parameter]=input.dataset.type==='integer'?Number(input.value):input.value;
  try{await apply({id:select.value,at:coords.map(input=>Number(input.value)),params});if(token===draftToken)message.textContent='Part preview updated. Save the version when it is ready.';}catch(error){if(token===draftToken)message.textContent=error.message;}finally{insert.disabled=!draft||!parts.some(part=>part.id===select.value)||[...fields.querySelectorAll('select[required]')].some(input=>!input.value);}};
 return {
  setDraft(value){const changed=draft?.id!==value?.id;if(changed)draftToken++;draft=value;if(changed){selectedCell=null;coords.forEach(input=>input.value='0');}for(let i=0;i<3;i++)coords[i].max=(draft?.candidate.dimensions[['x','y','z'][i]]||1)-1;render();if(draft&&partCalls((draft.plan.components||[]).flatMap(component=>component.operations||[])))load().catch(()=>{});},
  selectCell(cell){selectedCell=cell;if(cell)coords.forEach((input,i)=>input.value=[cell.x,cell.y,cell.z][i]);},
  roles(operations){const roles=new Set();const visit=ops=>{for(const op of ops){if(op.material)roles.add(op.material);if(op.interior)roles.add(op.interior);if(op.operations)visit(op.operations);if(op.op==='call'){const part=parts.find(p=>p.id===op.part);for(const [name,def]of Object.entries(part?.parameters||{}))if(def.type==='material')roles.add(op.params?.[name]??def.default);if(!part)for(const value of Object.values(op.params||{}))if(Object.hasOwn(draft?.plan.palette||{},value))roles.add(value);}}};visit(operations);return roles;}
 };
}
