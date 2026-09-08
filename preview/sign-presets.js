// Sign compositions from docs/praya/sign-formats.md. Presets decide layout only; every word comes from the user.
export const LINE_LIMIT=24;
const control=/\p{Cc}/gu;
const clean=value=>String(value||'').replace(control,'').slice(0,LINE_LIMIT);
const rule=(...texts)=>'-'.repeat(Math.min(LINE_LIMIT,Math.max(4,...texts.map(t=>t.length))));
export const presets=[
 {id:'custom',name:'Custom lines',fields:[{key:'l1',label:'Line 1'},{key:'l2',label:'Line 2'},{key:'l3',label:'Line 3'},{key:'l4',label:'Line 4'}],
  compose:f=>[f.l1,f.l2,f.l3,f.l4]},
 {id:'centered',name:'Centered notice',hint:'Two lines in the middle rows, blank rows above and below.',fields:[{key:'a',label:'First line'},{key:'b',label:'Second line'}],
  compose:f=>['',f.a,f.b,'']},
 {id:'framed',name:'Framed notice',hint:'Two lines between matching rules, like “Please wait / to be seated”.',fields:[{key:'a',label:'First line'},{key:'b',label:'Second line'}],
  compose:f=>{const r=rule(f.a,f.b);return [r,f.a,f.b,r];}},
 {id:'identity',name:'Identity with note',hint:'Name on two rows, a rule, then one useful line such as an entrance or address.',fields:[{key:'a',label:'Name line 1'},{key:'b',label:'Name line 2'},{key:'c',label:'Note'}],
  compose:f=>[f.a,f.b,rule(f.a,f.b),f.c]},
 {id:'plaque',name:'Address plaque',hint:'Numbers in pipes, a short rule, street, then the verified second-language line.',fields:[{key:'numbers',label:'Numbers, comma separated'},{key:'street',label:'Street'},{key:'second',label:'Second-language line'}],
  compose:f=>{const numbers=f.numbers.split(',').map(n=>n.trim()).filter(Boolean);const head=numbers.length?'| '+numbers.join(' | ')+' |':'';return [head,head?'-'.repeat(Math.min(LINE_LIMIT,Math.max(1,head.length-numbers.length*4))):'',f.street,f.second];}},
 {id:'street',name:'Bilingual street sign',hint:'Rule, street, second language, then the number range with its arrow, spaced as on Commonwealth Av.',fields:[{key:'street',label:'Street'},{key:'second',label:'Second-language line'},{key:'range',label:'Number range'},{key:'direction',label:'Arrow',options:[['east','Right'],['west','Left']]}],
  compose:f=>{const arrow=f.range?(f.direction==='west'?'<- '+f.range:' '.repeat(Math.max(0,15-f.range.length-3))+f.range+' ->'):'';return ['-'.repeat(Math.min(LINE_LIMIT,Math.max(4,f.street.length,f.second.length))),f.street,f.second,arrow];}},
];
export function compose(presetId,fields){
 const preset=presets.find(p=>p.id===presetId)||presets[0];
 const values=Object.fromEntries(preset.fields.map(f=>[f.key,clean(fields[f.key])]));
 const lines=preset.compose(values).map(clean);
 return {lines,empty:preset.fields.filter(f=>!f.options).every(f=>!values[f.key].trim())};
}
