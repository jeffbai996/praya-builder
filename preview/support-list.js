// One way to show what a special block type supports, used by the catalogue and the studio.
export function renderSupport(list,rows){
  list.replaceChildren(...rows.map(row=>{
    const li=document.createElement('li'),name=document.createElement('strong');name.textContent=`${row.count.toLocaleString()} ${row.label}`;li.append(name);
    for(const [stage,ok,extra] of [['Preview',row.preview],['Schematic',row.schematic],['Bridge placement',row.placement,row.placementNote]]){
      const span=document.createElement('span');span.className='stage';span.dataset.ok=String(Boolean(ok));span.textContent=stage+(extra&&!ok?' · '+extra:'');li.append(span);
    }
    return li;
  }));
  list.hidden=!rows.length;
}
