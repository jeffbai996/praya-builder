(() => {
  const style = document.createElement('style');
  style.textContent = `
    #praya-map-context { position:fixed; top:12px; left:50%; transform:translateX(-50%); z-index:10001; max-width:calc(100vw - 360px); box-sizing:border-box; padding:0; color:#f5f5f7; background:#17181cef; border:1px solid #ffffff24; border-radius:9px; box-shadow:0 8px 28px #0008; backdrop-filter:blur(14px); font:13px/1.45 "Anthropic Sans","Plus Jakarta Sans",system-ui,sans-serif; }
    #praya-map-context summary { display:flex; align-items:center; gap:9px; padding:10px 13px; cursor:pointer; list-style:none; white-space:nowrap; font-family:"Plus Jakarta Sans",system-ui,sans-serif; font-weight:700; letter-spacing:-.02em; }
    #praya-map-context summary::-webkit-details-marker { display:none; }
    #praya-map-context summary::before { content:""; width:8px; height:8px; flex:none; border-radius:2px; background:#a6e22e; }
    #praya-map-context summary::after { content:"⌄"; color:#b5b5bd; font-weight:400; }
    #praya-map-context[open] summary { border-bottom:1px solid #ffffff18; }
    #praya-map-context p { max-width:310px; margin:0; padding:9px 13px 0; color:#b5b5bd; }
    #praya-map-context p:last-child { padding-bottom:12px; }
    #praya-map-context :focus-visible { outline:2px solid #a6e22e; outline-offset:2px; }
    @media(max-width:1000px) { #praya-map-context { top:58px; max-width:calc(100vw - 24px); } }
    @media(max-width:575.98px) { #praya-map-context { top:52px; } #praya-map-context summary { padding:8px 11px; font-size:12px; } }
  `;
  document.head.append(style);
  const context = document.createElement('details');
  context.id = 'praya-map-context';
  const label = document.createElement('summary');
  label.textContent = 'Praya · Production';
  const description = document.createElement('p');
  description.textContent = 'Saved terrain from the main world. Sandbox changes are not shown.';
  const status = document.createElement('p');
  status.textContent = 'Checking server status…';
  context.append(label, description, status);
  document.body.append(context);
  fetch('/map-status.json', {cache:'no-store', signal:AbortSignal.timeout(5000)})
    .then(response => { if (!response.ok) throw new Error('status unavailable'); return response.json(); })
    .then(data => { status.textContent = data.ready ? 'Server online. Terrain updates as rendering completes.' : 'Server offline or starting. Saved terrain is available.'; })
    .catch(() => { status.textContent = 'Server status unavailable. Saved terrain is available.'; });
})();
