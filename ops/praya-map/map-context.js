(() => {
  const key = 'praya-map-context-v2';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
  const state = { x: Number.isFinite(saved.x) ? saved.x : null, y: Number.isFinite(saved.y) ? saved.y : null, expanded: !!saved.expanded, minimized: !!saved.minimized, hidden: !!saved.hidden };
  const save = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} };
  const style = document.createElement('style');
  style.textContent = `
    #praya-map-context, #praya-map-context-restore { position:fixed; z-index:10001; box-sizing:border-box; color:#f5f5f7; background:#17181cef; border:1px solid #ffffff24; border-radius:9px; box-shadow:0 8px 28px #0008; backdrop-filter:blur(14px); font:13px/1.45 "Anthropic Sans","Plus Jakarta Sans",system-ui,sans-serif; }
    #praya-map-context { top:12px; left:124px; max-width:calc(100vw - 24px); }
    #praya-map-context[hidden], #praya-map-context-restore[hidden], #praya-map-context .praya-context-body[hidden] { display:none !important; }
    #praya-map-context .praya-context-bar { display:flex; align-items:center; gap:4px; min-height:42px; padding:4px; }
    #praya-map-context .praya-context-label { display:flex; align-items:center; gap:9px; padding:0 8px 0 3px; white-space:nowrap; font-family:"Plus Jakarta Sans",system-ui,sans-serif; font-weight:700; letter-spacing:-.02em; }
    #praya-map-context .praya-context-label::before { content:""; width:8px; height:8px; flex:none; border-radius:2px; background:#a6e22e; }
    #praya-map-context button, #praya-map-context-restore { display:grid; place-items:center; width:30px; height:30px; flex:none; padding:0; border:1px solid #ffffff24; border-radius:6px; background:#ffffff0d; color:#d7d7dd; cursor:pointer; }
    #praya-map-context button:hover, #praya-map-context-restore:hover { background:#ffffff1c; color:#fff; }
    #praya-map-context button:focus-visible, #praya-map-context-restore:focus-visible { outline:2px solid #a6e22e; outline-offset:2px; }
    #praya-map-context button svg, #praya-map-context-restore svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
    #praya-map-context .praya-context-drag { cursor:grab; touch-action:none; }
    #praya-map-context .praya-context-drag:active { cursor:grabbing; }
    #praya-map-context .praya-context-drag svg { fill:currentColor; stroke:none; }
    #praya-map-context .praya-context-toggle svg { transition:transform .16s ease; }
    #praya-map-context[data-expanded="true"] .praya-context-toggle svg { transform:rotate(180deg); }
    #praya-map-context .praya-context-body { border-top:1px solid #ffffff18; max-width:340px; }
    #praya-map-context .praya-context-body p { margin:0; padding:9px 12px 0; color:#b5b5bd; }
    #praya-map-context .praya-context-body p:last-child { padding-bottom:12px; }
    #praya-map-context[data-minimized="true"] .praya-context-bar { min-height:38px; padding:3px; }
    #praya-map-context[data-minimized="true"] .praya-context-bar > :not(.praya-context-minimize) { display:none; }
    #praya-map-context[data-minimized="true"] .praya-context-minimize { width:30px; height:30px; color:#a6e22e; font-weight:700; }
    #praya-map-context-restore { top:12px; left:124px; width:38px; height:38px; }
    #praya-map-context-restore svg { stroke:#a6e22e; }
    @media(max-width:575.98px) { #praya-map-context { top:60px; left:12px; } #praya-map-context-restore { top:60px; left:12px; } }
  `;
  document.head.append(style);
  const icon = {
    drag: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="3.5" r="1"/><circle cx="11" cy="3.5" r="1"/><circle cx="5" cy="8" r="1"/><circle cx="11" cy="8" r="1"/><circle cx="5" cy="12.5" r="1"/><circle cx="11" cy="12.5" r="1"/></svg>',
    chevron: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>',
    minus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9"/></svg>',
    close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>',
    info: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 7.5v3.5M8 5h.01"/></svg>',
  };
  const button = (className, title, markup) => {
    const element = document.createElement('button');
    element.type = 'button'; element.className = className; element.title = title;
    element.setAttribute('aria-label', title); element.innerHTML = markup;
    return element;
  };
  const context = document.createElement('section');
  context.id = 'praya-map-context'; context.setAttribute('aria-label', 'Praya map status');
  const bar = document.createElement('div'); bar.className = 'praya-context-bar';
  const drag = button('praya-context-drag', 'Move Praya status', icon.drag);
  const label = document.createElement('span'); label.className = 'praya-context-label'; label.textContent = 'Praya · Production';
  const toggle = button('praya-context-toggle', 'Show map details', icon.chevron);
  const minimize = button('praya-context-minimize', 'Minimize Praya status', icon.minus);
  const hide = button('praya-context-hide', 'Hide Praya status', icon.close);
  const body = document.createElement('div'); body.className = 'praya-context-body';
  const description = document.createElement('p'); description.textContent = 'Saved terrain from the main world. Sandbox changes are not shown.';
  const status = document.createElement('p'); status.textContent = 'Checking server status…';
  const restore = button('', 'Show Praya status', icon.info); restore.id = 'praya-map-context-restore';
  body.append(description, status); bar.append(drag, label, toggle, minimize, hide); context.append(bar, body); document.body.append(context, restore);
  const position = () => {
    const defaultX = window.innerWidth <= 575 ? 12 : 124;
    const defaultY = window.innerWidth <= 575 ? 60 : 12;
    const x = Math.max(0, Math.min(state.x ?? defaultX, window.innerWidth - context.offsetWidth));
    const y = Math.max(0, Math.min(state.y ?? defaultY, window.innerHeight - context.offsetHeight));
    context.style.left = `${x}px`; context.style.top = `${y}px`;
    if (state.x !== null) state.x = x;
    if (state.y !== null) state.y = y;
  };
  const render = () => {
    context.hidden = state.hidden; restore.hidden = !state.hidden;
    context.dataset.expanded = String(state.expanded); context.dataset.minimized = String(state.minimized);
    body.hidden = !state.expanded || state.minimized;
    toggle.setAttribute('aria-expanded', String(state.expanded));
    toggle.setAttribute('aria-label', state.expanded ? 'Hide map details' : 'Show map details');
    minimize.setAttribute('aria-label', state.minimized ? 'Restore Praya status' : 'Minimize Praya status');
    minimize.title = state.minimized ? 'Restore Praya status' : 'Minimize Praya status';
    minimize.innerHTML = state.minimized ? 'P' : icon.minus;
    position(); save();
  };
  toggle.addEventListener('click', () => { state.expanded = !state.expanded; render(); });
  minimize.addEventListener('click', () => { state.minimized = !state.minimized; render(); });
  hide.addEventListener('click', () => { state.hidden = true; render(); });
  restore.addEventListener('click', () => { state.hidden = false; render(); });
  window.addEventListener('resize', position);
  drag.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const startX = event.clientX, startY = event.clientY;
    const originX = context.offsetLeft, originY = context.offsetTop;
    drag.setPointerCapture(event.pointerId);
    const move = moveEvent => { state.x = originX + moveEvent.clientX - startX; state.y = originY + moveEvent.clientY - startY; position(); };
    const end = () => { drag.removeEventListener('pointermove', move); drag.removeEventListener('pointerup', end); drag.removeEventListener('pointercancel', end); save(); };
    drag.addEventListener('pointermove', move); drag.addEventListener('pointerup', end); drag.addEventListener('pointercancel', end);
  });
  render();
  fetch('/map-status.json', {cache:'no-store', signal:AbortSignal.timeout(5000)})
    .then(response => { if (!response.ok) throw new Error('status unavailable'); return response.json(); })
    .then(data => { status.textContent = data.ready ? 'Server online. Terrain updates as rendering completes.' : 'Server offline or starting. Saved terrain is available.'; })
    .catch(() => { status.textContent = 'Server status unavailable. Saved terrain is available.'; });

  // BlueMap's low-resolution tiles are heightfields. Tall buildings can become
  // long triangles when viewed from the side, so limit isolated height peaks.
  const smoothing = { value: 0 };
  const oldHeight = 'vPosition.y = metaToHeight(meta) + 1.0 - position.x * 0.0001 - position.z * 0.0002;';
  const smoothedHeight = `
    float rawHeight = metaToHeight(meta);
    if (prayaSmoothing > 0.5) {
      float localFloor = rawHeight;
      localFloor = min(localFloor, metaToHeight(texture(textureImage, posToMetaUV(position.xz + vec2(24.0, 0.0)))));
      localFloor = min(localFloor, metaToHeight(texture(textureImage, posToMetaUV(position.xz + vec2(-24.0, 0.0)))));
      localFloor = min(localFloor, metaToHeight(texture(textureImage, posToMetaUV(position.xz + vec2(0.0, 24.0)))));
      localFloor = min(localFloor, metaToHeight(texture(textureImage, posToMetaUV(position.xz + vec2(0.0, -24.0)))));
      localFloor = min(localFloor, metaToHeight(texture(textureImage, posToMetaUV(position.xz + vec2(24.0, 24.0)))));
      localFloor = min(localFloor, metaToHeight(texture(textureImage, posToMetaUV(position.xz + vec2(-24.0, 24.0)))));
      localFloor = min(localFloor, metaToHeight(texture(textureImage, posToMetaUV(position.xz + vec2(24.0, -24.0)))));
      localFloor = min(localFloor, metaToHeight(texture(textureImage, posToMetaUV(position.xz + vec2(-24.0, -24.0)))));
      rawHeight = min(rawHeight, localFloor + 4.0);
    }
    vPosition.y = rawHeight + 1.0 - position.x * 0.0001 - position.z * 0.0002;`;
  const patchTile = model => {
    const material = model?.material;
    if (model?.userData?.tileType !== 'lowres' || !material?.vertexShader?.includes(oldHeight)) return;
    material.vertexShader = material.vertexShader
      .replace('varying vec3 vPosition;', 'uniform float prayaSmoothing;\nvarying vec3 vPosition;')
      .replace(oldHeight, smoothedHeight);
    material.uniforms.prayaSmoothing = smoothing;
    material.needsUpdate = true;
  };
  const installSmoothing = () => {
    const app = window.bluemap;
    if (!app?.mapViewer?.events) { setTimeout(installSmoothing, 150); return; }
    const viewer = app.mapViewer;
    let flyDetailOriginal = null;
    let flyDetailApplied = null;
    let flyDetailSuppressed = false;
    viewer.events.addEventListener('bluemapTileLoaded', event => {
      if (viewer.map?.data?.id === 'world') patchTile(event.detail?.tile?.model);
    });
    viewer.events.addEventListener('bluemapRenderFrame', () => {
      const mainWorld = viewer.map?.data?.id === 'world';
      const flying = mainWorld && app.appState.controls.state === 'free';
      smoothing.value = mainWorld && app.appState.controls.state !== 'flat' ? 1 : 0;
      if (!flying) flyDetailSuppressed = false;
      if (flying && flyDetailApplied === null && !flyDetailSuppressed) {
        const detailTarget = window.innerWidth >= 800 ? 500 : 250;
        const currentDetail = viewer.data.loadedHiresViewDistance;
        if (currentDetail < detailTarget) {
          flyDetailOriginal = currentDetail;
          flyDetailApplied = detailTarget;
          viewer.data.loadedHiresViewDistance = detailTarget;
          viewer.updateLoadedMapArea();
        }
      } else if (flyDetailApplied !== null && !flying) {
        if (viewer.data.loadedHiresViewDistance === flyDetailApplied) {
          viewer.data.loadedHiresViewDistance = flyDetailOriginal;
          viewer.updateLoadedMapArea();
        }
        flyDetailOriginal = null;
        flyDetailApplied = null;
      } else if (flyDetailApplied !== null && viewer.data.loadedHiresViewDistance !== flyDetailApplied) {
        flyDetailOriginal = null;
        flyDetailApplied = null;
        flyDetailSuppressed = true;
      }
    });
    if (viewer.map?.data?.id === 'world') {
      for (const manager of viewer.map.lowresTileManager) manager.scene.traverse(patchTile);
    }
  };
  installSmoothing();
})();
