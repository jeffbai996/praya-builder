export function bindViewerTools(scene,getCurrent) {
  const $=id=>document.getElementById(id);
  function cells(componentOnly=false) {
    const current=getCurrent();if(!current)return [];
    const ceiling=Number($('ceiling').value),component=$('component').value;
    return current.artifact.blocks.filter(b=>b.y<ceiling&&b.block!=='minecraft:air'&&(!componentOnly||b.component===component));
  }
  function refresh() {
    const ready=Boolean(getCurrent());
    $('fit-model').disabled=!ready;
    $('focus-component').disabled=!ready||!$('component').value||!cells(true).length;
  }
  function fit(selected) {
    scene?.fit(cells(selected));
    for(const button of document.querySelectorAll('[data-view]')){button.classList.remove('active');button.setAttribute('aria-pressed','false');}
  }
  $('fit-model').addEventListener('click',()=>fit(false));
  $('focus-component').addEventListener('click',()=>fit(true));
  $('lighting').addEventListener('change',()=>scene?.lighting($('lighting').value));
  $('show-grid').addEventListener('change',()=>scene?.gridVisible($('show-grid').checked));
  function expand(value) {
    document.body.classList.toggle('model-expanded',value);
    $('expand-view').setAttribute('aria-pressed',String(value));
    $('expand-view').textContent=value?'Exit expanded view':'Expand view';
    $('expand-view').focus();
  }
  $('expand-view').addEventListener('click',()=>expand(!document.body.classList.contains('model-expanded')));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&document.body.classList.contains('model-expanded')&&!document.querySelector('dialog[open]'))expand(false);
  });
  return {refresh};
}
