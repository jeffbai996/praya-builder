const prefix='pbd.review.v1.';
export function readTheme(){try{return localStorage.getItem('pbd.theme');}catch{return null;}}
export function saveTheme(theme){try{localStorage.setItem('pbd.theme',theme);return true;}catch{return false;}}
export function bindThemeToggle(button,initial,onChange){
  const themes=['light','dark','oled'],names={light:'Light',dark:'Dark',oled:'OLED black'};
  const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>';
  const moon='<path d="M20.5 14.1A8.7 8.7 0 0 1 9.9 3.5a8.7 8.7 0 1 0 10.6 10.6Z"/>';
  let current=themes.includes(initial)?initial:'light';
  function render(){
    const next=themes[(themes.indexOf(current)+1)%themes.length];
    button.dataset.theme=current;button.title=button.ariaLabel=`Theme: ${names[current]}. Switch to ${names[next]}`;
    button.innerHTML=`<svg viewBox="0 0 24 24" fill="${current==='oled'?'currentColor':'none'}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${current==='light'?sun:moon}</svg>`;
  }
  button.addEventListener('click',()=>{current=themes[(themes.indexOf(current)+1)%themes.length];render();onChange(current);});
  render();
}
export function readReview(project,hash){
  try{
    const value=JSON.parse(localStorage.getItem(prefix+project+'.'+hash));
    if(value&&['unreviewed','changes','game-check'].includes(value.status)&&typeof value.note==='string')
      return {...value,note:value.note.slice(0,4000)};
  }catch{/* A corrupt or unavailable local draft must not stop design inspection. */}
  return {status:'unreviewed',note:'',savedAt:null};
}
export function saveReview(project,hash,value){
  const review={status:value.status,note:value.note.slice(0,4000),savedAt:new Date().toISOString()};
  localStorage.setItem(prefix+project+'.'+hash,JSON.stringify(review));
  return review;
}
