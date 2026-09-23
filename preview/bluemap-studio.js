// BlueMap custom script: the Studio URL is supplied by the installed script URL.
(() => {
 if(document.getElementById('builder-studio-panel'))return;
 const script=document.currentScript;
 if(!script)return;
 const studio=new URL(script.src).searchParams.get('studio');
 if(!studio)return;
 let studioURL;
 try{studioURL=new URL(studio);if(!['http:','https:'].includes(studioURL.protocol))return;}catch{return;}
 const app=window.bluemap;
 const launcher=document.createElement('button');
 launcher.id='builder-open-panel';launcher.type='button';launcher.textContent='Builder';
 launcher.setAttribute('aria-controls','builder-studio-panel');launcher.setAttribute('aria-expanded','false');
 const panel=document.createElement('section');panel.id='builder-studio-panel';panel.hidden=true;
 panel.setAttribute('aria-label','Praya Builder');
 const header=document.createElement('div');header.className='builder-panel-header';
 const heading=document.createElement('strong');heading.textContent='Builder';
 const close=document.createElement('button');close.id='builder-close-panel';close.type='button';close.textContent='Close';
 header.append(heading,close);
 const note=document.createElement('p');note.id='builder-selection-note';note.textContent='Select an area on the map, or open Studio at the map center.';
 const actions=document.createElement('div');actions.className='builder-panel-actions';
 const select=document.createElement('button');select.id='builder-select-plot';select.type='button';select.textContent='Select a plot';
 const link=document.createElement('a');link.id='builder-studio-link';link.textContent='Open Studio ↗';link.target='_blank';link.rel='noopener';
 actions.append(select,link);panel.append(header,note,actions);document.body.append(launcher,panel);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),polygon=document.createElementNS(ns,'polygon');
 svg.id='builder-plot-outline';Object.assign(svg.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'9999'});
 polygon.setAttribute('fill','#a6e22e33');polygon.setAttribute('stroke','#a6e22e');polygon.setAttribute('stroke-width','3');
 svg.append(polygon);document.body.append(svg);
 let corners=[],selecting=false;
 function setOpen(open){panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(open)close.focus();else launcher.focus();}
 launcher.addEventListener('click',()=>setOpen(panel.hidden));close.addEventListener('click',()=>setOpen(false));
 addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){setOpen(false);}});
 function update(){app?.updatePageAddress?.();const target=new URL(studioURL);target.searchParams.set('map',location.href);if(corners.length===2){const [a,b]=corners;for(const axis of ['x','z']){target.searchParams.set('min'+axis.toUpperCase(),Math.floor(Math.min(a[axis],b[axis])));target.searchParams.set('max'+axis.toUpperCase(),Math.floor(Math.max(a[axis],b[axis]))+1);}}link.href=target.href;}
 function draw(){if(corners.length!==2){polygon.setAttribute('points','');return;}const [a,b]=corners,rect=app.mapViewer.rootElement.getBoundingClientRect(),y=Math.max(a.y,b.y)+.1;polygon.setAttribute('points',[[a.x,a.z],[b.x,a.z],[b.x,b.z],[a.x,b.z]].map(([x,z])=>a.clone().set(x,y,z).project(app.mapViewer.camera)).map(p=>`${rect.left+(p.x+1)*rect.width/2},${rect.top+(1-p.y)*rect.height/2}`).join(' '));}
 select.addEventListener('click',()=>{corners=[];selecting=true;select.textContent='Start again';note.textContent='Click the first corner on the map.';link.textContent='Open Studio ↗';link.removeAttribute('aria-disabled');draw();update();});
 app?.events.addEventListener('bluemapMapInteraction',event=>{
  if(!selecting||event.detail.data?.doubleTap)return;const point=event.detail.hit?.point;if(!point)return;corners.push(point.clone());
  if(corners.length===1){note.textContent='Click the opposite corner.';return;}
  selecting=false;const width=Math.abs(Math.floor(corners[0].x)-Math.floor(corners[1].x))+1,depth=Math.abs(Math.floor(corners[0].z)-Math.floor(corners[1].z))+1,valid=width>=4&&depth>=4&&width<=128&&depth<=128;
  note.textContent=valid?`${width} × ${depth} blocks selected. Confirm height and frontage in Studio.`:'Choose an area between 4 and 128 blocks per side.';
  link.textContent='Design selected plot ↗';link.setAttribute('aria-disabled',String(!valid));draw();update();
 });
 link.addEventListener('click',event=>{if(link.getAttribute('aria-disabled')==='true')event.preventDefault();else update();});
 app?.events.addEventListener('bluemapCameraMoved',draw);addEventListener('resize',draw);
 addEventListener('hashchange',()=>{corners=[];selecting=false;select.textContent='Select a plot';note.textContent='Select an area on the map, or open Studio at the map center.';link.textContent='Open Studio ↗';link.removeAttribute('aria-disabled');draw();update();});
 update();
})();
