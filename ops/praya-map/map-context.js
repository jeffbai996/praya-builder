(() => {
  const style = document.createElement('style');
  style.textContent = `
    #praya-map-context { position:fixed; top:12px; left:50%; transform:translateX(-50%); z-index:10001; max-width:calc(100vw - 128px); width:max-content; box-sizing:border-box; padding:9px 13px; background:#161b1eed; border:1px solid #ffffff30; border-radius:9px; color:#e9eeee; font:13px/1.45 system-ui,sans-serif; box-shadow:0 2px 12px #0003; }
    #praya-map-context summary { cursor:pointer; font-weight:600; }
    #praya-map-context p { max-width:320px; margin:9px 0 0; color:#c3cccd; }
    @media(max-width:1000px) { #praya-map-context { top:70px; max-width:calc(100vw - 32px); font-size:12px; padding:7px 9px; } }
  `;
  document.head.append(style);
  const context = document.createElement('details');
  context.id = 'praya-map-context';
  const label = document.createElement('summary');
  label.textContent = 'Main Praya · saved map';
  const description = document.createElement('p');
  description.textContent = 'Last rendered main-world terrain. Sandbox changes are not shown. Area selection remains available when Minecraft is stopped.';
  const status = document.createElement('p');
  status.textContent = 'Checking server status…';
  context.append(label, description, status);
  document.body.append(context);
  fetch('/map-status.json', {cache:'no-store', signal:AbortSignal.timeout(5000)})
    .then(response => { if (!response.ok) throw new Error('status unavailable'); return response.json(); })
    .then(data => { status.textContent = data.ready ? 'Server online. Terrain updates as rendering completes.' : 'Server offline or starting. Saved terrain is available.'; })
    .catch(() => { status.textContent = 'Server status unavailable. Saved terrain is available.'; });
})();
