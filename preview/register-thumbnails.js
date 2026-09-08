export function projectThumbnail(project){
  const revision=project.revisions.find(r=>r.id===project.latest);
  const frame=document.createElement('div');frame.className='project-thumbnail';frame.dataset.status='pending';
  const image=document.createElement('img');image.width=640;image.height=400;image.loading='lazy';image.decoding='async';
  image.alt=`${project.name}, ${revision.id.toUpperCase()} exterior`;
  const fallback=document.createElement('span');fallback.className='thumbnail-fallback';fallback.textContent='Preparing preview…';
  const retry=document.createElement('button');retry.type='button';retry.className='thumbnail-retry';retry.textContent='Retry preview';retry.hidden=true;
  const badge=document.createElement('span');badge.className='thumbnail-revision';badge.textContent=`${revision.id.toUpperCase()} · LATEST`;
  const url=`/api/thumbnail/v1/${encodeURIComponent(project.id)}/${encodeURIComponent(revision.id)}?hash=${revision.hash}`;
  function load(){frame.dataset.status='pending';fallback.hidden=false;fallback.textContent='Preparing preview…';retry.hidden=true;image.src=url;}
  image.onload=()=>{frame.dataset.status='ready';fallback.hidden=true;retry.hidden=true;};
  image.onerror=()=>{frame.dataset.status='unavailable';fallback.hidden=false;fallback.textContent='Preview unavailable';retry.hidden=false;};
  retry.addEventListener('click',()=>{image.removeAttribute('src');load();});
  frame.append(image,fallback,retry,badge);load();return frame;
}
