// BlueMap custom script: configuration stays in the installed script URL.
(() => {
 if(document.getElementById('builder-studio-panel'))return;
 const url=new URL(document.currentScript.src),studio=url.searchParams.get('studio');
 if(!studio||!['http:','https:'].includes(new URL(studio).protocol))return;
 const app=window.bluemap,panel=document.createElement('div');panel.id='builder-studio-panel';
 Object.assign(panel.style,{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',zIndex:'10000',padding:'12px',borderRadius:'10px',background:'#202522',color:'#fff',font:'13px system-ui',boxShadow:'0 2px 12px #0005',maxWidth:'calc(100vw - 32px)',boxSizing:'border-box'});
 const row=document.createElement('div');Object.assign(row.style,{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'});
 const select=document.createElement('button');select.id='builder-select-plot';select.textContent='Select a plot';
 Object.assign(select.style,{border:'1px solid #85998c',background:'transparent',color:'inherit',padding:'8px 12px',borderRadius:'5px',cursor:'pointer'});
 const link=document.createElement('a');link.id='builder-studio-link';link.textContent='Design here ↗';link.target='_blank';link.rel='noopener';Object.assign(link.style,{color:'inherit',padding:'8px',fontWeight:'600'});
 const note=document.createElement('p');note.id='builder-selection-note';note.textContent='Choose a plot, or use the map center.';Object.assign(note.style,{margin:'8px 0 0',fontSize:'11px',color:'#bdc9c0'});row.append(select,link);panel.append(row,note);document.body.append(panel);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),polygon=document.createElementNS(ns,'polygon');svg.id='builder-plot-outline';Object.assign(svg.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'9999'});polygon.setAttribute('fill','#84c19944');polygon.setAttribute('stroke','#a7f0bd');polygon.setAttribute('stroke-width','3');svg.append(polygon);document.body.append(svg);
 let corners=[],selecting=false;
 function update(){app?.updatePageAddress?.();const target=new URL(studio);target.searchParams.set('map',location.href);if(corners.length===2){const [a,b]=corners;for(const axis of ['x','z']){target.searchParams.set('min'+axis.toUpperCase(),Math.floor(Math.min(a[axis],b[axis])));target.searchParams.set('max'+axis.toUpperCase(),Math.floor(Math.max(a[axis],b[axis]))+1);}}link.href=target.href;}
 function draw(){if(corners.length!==2){polygon.setAttribute('points','');return;}const [a,b]=corners,rect=app.mapViewer.rootElement.getBoundingClientRect(),y=Math.max(a.y,b.y)+.1;polygon.setAttribute('points',[[a.x,a.z],[b.x,a.z],[b.x,b.z],[a.x,b.z]].map(([x,z])=>a.clone().set(x,y,z).project(app.mapViewer.camera)).map(p=>`${rect.left+(p.x+1)*rect.width/2},${rect.top+(1-p.y)*rect.height/2}`).join(' '));}
 select.onclick=()=>{corners=[];selecting=true;select.textContent='Start again';note.textContent='Click the first corner on the map.';link.textContent='Design here ↗';link.removeAttribute('aria-disabled');draw();update();};
 app?.events.addEventListener('bluemapMapInteraction',event=>{
  if(!selecting||event.detail.data?.doubleTap)return;const point=event.detail.hit?.point;if(!point)return;corners.push(point.clone());
  if(corners.length===1){note.textContent='Click the opposite corner.';return;}
  selecting=false;const width=Math.abs(Math.floor(corners[0].x)-Math.floor(corners[1].x))+1,depth=Math.abs(Math.floor(corners[0].z)-Math.floor(corners[1].z))+1,valid=width>=4&&depth>=4&&width<=128&&depth<=128;
  note.textContent=valid?`${width} × ${depth} blocks selected. Confirm height and frontage in studio.`:'Choose an area between 4 and 128 blocks per side.';link.textContent='Design selected plot ↗';link.setAttribute('aria-disabled',String(!valid));draw();update();
 });
 link.addEventListener('click',event=>{if(link.getAttribute('aria-disabled')==='true')event.preventDefault();else update();});
 app?.events.addEventListener('bluemapCameraMoved',draw);addEventListener('resize',draw);addEventListener('hashchange',()=>{corners=[];selecting=false;draw();update();});update();
})();
