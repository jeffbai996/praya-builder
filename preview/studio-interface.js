import {plotEditor} from './plot-editor.js';
import {captureControls} from './capture-controls.js';
const $=id=>document.getElementById(id);
export const label=value=>String(value||'').replace(/^minecraft:/,'').split('[')[0].replaceAll('_',' ').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function componentLabel(id){
 const home=/^home-(\d+)-(\d+)-(.+)$/.exec(id);
 if(home)return `Floor ${home[1]} · Apartment ${home[2]} · ${label(home[3])}`;
 return label(id);
}
export function coordinates(prefix){return ['x','y','z'].map(axis=>{const value=$(prefix+'-'+axis).value;if(!value.trim()||!Number.isInteger(Number(value)))throw Error('Enter whole-block positions in each coordinate field');return Number(value);});}
export function setCoordinates(prefix,point){['x','y','z'].forEach((axis,i)=>{$(prefix+'-'+axis).value=point[i];});}
export function record(element,entries){
 element.replaceChildren(...entries.flatMap(([name,value])=>{const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=name;detail.textContent=value;return [term,detail];}));
}
export function review(draft){
 const assessment=draft.assessment,metrics=$('review-metrics');metrics.replaceChildren();
 for(const [name,value] of [['Changed existing blocks',assessment?.collisions.length??'—'],['Blocks to clear',assessment?.excavations.length??'—'],['Street access',draft.access?.checked?(draft.access.issues.length?'Needs review':'Routes checked'):'Not checked']]){
  const item=document.createElement('div'),strong=document.createElement('strong'),caption=document.createElement('span');strong.textContent=typeof value==='number'?value.toLocaleString():value;caption.textContent=name;item.append(strong,caption);metrics.append(item);
 }
 $('diagnostics').replaceChildren(...(draft.diagnostics.length?draft.diagnostics:[{reason:'No blocking findings in the current checks.'}]).map(issue=>{const li=document.createElement('li');li.textContent=(issue.component?componentLabel(issue.component)+': ':'')+(issue.reason||String(issue));return li;}));
}
const finishes=['smooth_quartz','quartz_block','white_concrete','light_gray_concrete','gray_concrete','gray_terracotta','bricks','stone_bricks','smooth_stone','polished_andesite','sandstone','smooth_sandstone','oak_planks','spruce_planks','dark_oak_planks','glass','black_stained_glass','copper_block','deepslate_tiles'];
export function finishChoices(state){
 const values=[...new Set([state,...finishes.map(v=>'minecraft:'+v)])].filter(Boolean);
 $('material-choice').replaceChildren(...values.map(v=>new Option(label(v)+(v.includes('[')?' · configured':''),v)));
 $('material-choice').value=state;
}
export function siteInterface({api,action,status,refresh,selectSite}){
 let selected,protectedIndex=0;
 const editor=plotEditor({svg:$('plot-editor'),readBounds:()=>{const values=['x','z','base','width','depth','height'].map(k=>Number($('plot-'+k).value));if(values.some(n=>!Number.isInteger(n))||values.slice(3).some(n=>n<4||n>128))return null;const [x,z,base,w,d,h]=values,min=[x-Math.floor(w/2),base,z-Math.floor(d/2)];return {min,max:min.map((v,i)=>v+[w,h,d][i])};},onChange:message=>{$('plot-editor-note').textContent=message;}});
 for(const key of ['x','z','base','width','depth','height'])$('plot-'+key).addEventListener('input',()=>editor.reset());
 $('plot-tool').onchange=()=>editor.setMode($('plot-tool').value);$('plot-reset').onclick=()=>editor.reset();editor.render();
 const capture=captureControls({api,action,status,refresh,selectSite,selection:()=>selected});
 const time=()=>{const now=new Date();return new Date(now-now.getTimezoneOffset()*60000).toISOString().slice(0,16);};
 $('survey-time').value=time();$('capture-time').value=time();
 $('add-protected').onclick=()=>{
  const wrapper=document.createElement('fieldset');wrapper.className='protected-area';const prefix='protected-'+protectedIndex++;
  const legend=document.createElement('legend');legend.textContent='Protected area';wrapper.append(legend);
  for(const bound of ['min','max']){const title=document.createElement('p');title.className='field-title';title.textContent=bound==='min'?'Minimum corner':'Upper boundary';wrapper.append(title);const row=document.createElement('div');row.className='coordinate-fields';for(const axis of ['x','y','z']){const l=document.createElement('label');l.textContent=axis.toUpperCase();const input=document.createElement('input');input.type='number';input.step='1';input.required=true;input.id=prefix+'-'+bound+'-'+axis;l.append(input);row.append(l);}wrapper.append(row);}
  wrapper.dataset.prefix=prefix;const remove=document.createElement('button');remove.type='button';remove.textContent='Remove area';remove.onclick=()=>wrapper.remove();wrapper.append(remove);$('protected-areas').append(wrapper);
 };
 async function selection(id){
  selected=id?await api('selections/'+id):null;$('capture-guide').hidden=!selected;
  if(!selected)return;
  await capture.select();
  $('capture-note').textContent=`${selected.name} · ${selected.world} · ${selected.dimensions.x} × ${selected.dimensions.z} blocks. Save as ${selected.guide.filename}.`;
  $('capture-steps').replaceChildren(...selected.guide.commands.map((command,i)=>{const li=document.createElement('li'),span=document.createElement('span'),button=document.createElement('button');span.textContent=['Select first corner','Select opposite corner','Copy the survey','Save the survey'][i];button.textContent='Copy command';button.type='button';button.onclick=()=>action(async()=>{await navigator.clipboard.writeText(command);status(span.textContent+' command copied.');});li.append(span,button);return li;}));
 }
 $('connected-selection').onclick=()=>action(async()=>{selected=await api('capture/selection',{});await load();await selection(selected.id);status('Connected world area selected. Capture its surroundings before designing.');});
 $('capture-select').onchange=()=>action(()=>selection($('capture-select').value));
 async function load(){const config=await api('integration');if(config.mapUrl){$('open-map').href=config.mapUrl;$('open-map').hidden=false;}$('survey-world').value=config.world;$('capture-select').replaceChildren(new Option('Choose a plot to capture',''),...config.selections.map(s=>new Option(s.name,s.id)));if(selected)$('capture-select').value=selected.id;}
 async function readMap(){const point=await api('map-location',{url:$('map-location').value});$('plot-x').value=point.x;$('plot-z').value=point.z;editor.reset();status('Map location selected. Confirm capture size and the height below the terrain.');}
 $('read-map').onclick=()=>action(readMap);
 $('map-selection').onsubmit=e=>{e.preventDefault();action(async()=>{const input={name:$('plot-name').value};for(const key of ['x','z','base','width','depth','height'])input[key]=Number($('plot-'+key).value);selected=await api('selections',{...input,contextMargin:Number($('plot-margin').value),...editor.value()});await load();await selection(selected.id);status('Plot saved. Capture its surroundings automatically or import a WorldEdit survey.');});};
 const encode=async file=>{if(!file)throw Error('Choose a survey file');if(file.size>8*1024*1024)throw Error('Survey exceeds 8 MiB');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);};
 $('import-capture').onclick=()=>action(async()=>{if(!selected)throw Error('Choose a saved plot');const saved=await api('selections/'+selected.id+'/import',{schematic:await encode($('capture-file').files[0]),capturedAt:new Date($('capture-time').value).toISOString()});await refresh();await selectSite(saved.id);status('Survey imported. Ready to develop proposals.');});
 $('site-import').onsubmit=e=>{e.preventDefault();action(async()=>{const metadata={name:$('survey-name').value,world:$('survey-world').value,capturedAt:new Date($('survey-time').value).toISOString(),origin:coordinates('survey-origin'),plot:{min:coordinates('plot-min'),max:coordinates('plot-max')},frontage:coordinates('frontage'),protected:[...document.querySelectorAll('.protected-area')].map(e=>({min:coordinates(e.dataset.prefix+'-min'),max:coordinates(e.dataset.prefix+'-max')}))};const saved=await api('sites',{schematic:await encode($('schematic-file').files[0]),metadata});await refresh();await selectSite(saved.id);status('Survey imported. Ready to develop proposals.');});};
 return {async start(){await load();const location=new URL(window.location.href).searchParams.get('map');if(location){$('map-panel').open=true;$('map-location').value=location;await readMap();const query=new URL(window.location.href).searchParams;const vals=['minX','minZ','maxX','maxZ'].map(k=>query.has(k)?Number(query.get(k)):NaN);if(vals.every(Number.isInteger)){const [x,z,mx,mz]=vals,w=mx-x,d=mz-z;if(w>=4&&w<=128&&d>=4&&d<=128){$('plot-x').value=x+Math.floor(w/2);$('plot-z').value=z+Math.floor(d/2);$('plot-width').value=w;$('plot-depth').value=d;editor.reset();status('Selected plot loaded from BlueMap. Confirm capture height and mark its street entrance.');}}}}};
}
