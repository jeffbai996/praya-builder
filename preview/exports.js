export function bindExports({getCurrent,download}) {
  const $=id=>document.getElementById(id),dialog=$('export-dialog');
  let selected=null,busy=false;
  $('export-schematic').addEventListener('click',()=>{
    const current=getCurrent();if(!current)return;
    selected=current;
    const {project,artifact}=selected,{x,y,z}=artifact.dimensions;
    $('export-title').textContent=project.name;
    $('export-identity').textContent=`${artifact.revision.toUpperCase()} · ${artifact.hash.slice(0,12)}`;
    $('export-size').textContent=`${x} × ${z} footprint · ${y} blocks high`;
    $('export-count').textContent=`${artifact.blocks.length.toLocaleString()} authored cells · ${(x*y*z).toLocaleString()} volume cells`;
    $('export-load-command').textContent=`//schem load ${project.id}-${artifact.revision}-${artifact.hash.slice(0,12)}.schem`;
    $('export-message').textContent='';dialog.showModal();
  });
  for(const [id,kind,extension] of [['download-schematic','schematic','schem'],['download-manifest','export-manifest','manifest.json']]) {
    $(id).addEventListener('click',async()=>{
      if(!selected||busy)return;
      const {project,artifact}=selected;busy=true;
      $('download-schematic').disabled=true;$('download-manifest').disabled=true;
      $('close-export').disabled=true;dialog.setAttribute('aria-busy','true');
      $('export-message').textContent='Preparing download…';
      try {
        const response=await fetch(`/api/${kind}/${project.id}/${artifact.revision}?hash=${artifact.hash}`,{signal:AbortSignal.timeout(20000)});
        if(!response.ok)throw Error(response.status===409?'Revision changed. Close this panel and reload the proposal.':`Download failed (${response.status}). Try again.`);
        if(response.headers.get('X-Artifact-Hash')!==artifact.hash)throw Error('Download failed: artifact fingerprint mismatch. Reload before retrying.');
        download(await response.blob(),`${project.id}-${artifact.revision}-${artifact.hash.slice(0,12)}.${extension}`);
        $('export-message').textContent='Download prepared. Check your browser’s downloads.';
      }catch(error){$('export-message').textContent=error.name==='TimeoutError'?'Download failed: the server timed out. Try again.':error.message;}
      finally{busy=false;$('download-schematic').disabled=false;$('download-manifest').disabled=false;$('close-export').disabled=false;dialog.removeAttribute('aria-busy');}
    });
  }
  // Keep the captured revision visible while a download is being prepared.
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('close-export').addEventListener('click',()=>{if(!busy)dialog.close();});
}
