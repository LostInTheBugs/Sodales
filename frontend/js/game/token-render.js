/**
 * Sodales — cache d'images des tokens (partie extraite de game.html)
 * Chargement/cache des portraits et images de tokens.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
const tokenImgCache = new Map(); // url → HTMLImageElement | HTMLVideoElement | 'error' | null

function isAnimatedUrl(url) {
  if (!url) return false;
  const u = url.toLowerCase().split('?')[0];
  return u.endsWith('.webm') || u.endsWith('.gif') || u.endsWith('.mp4');
}

function getTokenImage(url) {
  if (!url) return null;
  if (tokenImgCache.has(url)) return tokenImgCache.get(url);
  tokenImgCache.set(url, null);

  if (isAnimatedUrl(url)) {
    const vid = document.createElement('video');
    vid.src = url; vid.loop = true; vid.muted = true; vid.playsInline = true;
    vid._isAnimated = true;
    vid.style.cssText = 'position:absolute;top:-9999px;pointer-events:none;width:1px;height:1px;';
    document.body.appendChild(vid);
    vid.play().catch(() => {});
    vid.onloadedmetadata = () => { tokenImgCache.set(url, vid); startAnimationLoop(); drawMap(); };
    vid.onerror = () => { tokenImgCache.set(url, 'error'); vid.remove(); };
  } else {
    const img = new Image();
    img.onload  = () => { tokenImgCache.set(url, img); drawMap(); };
    img.onerror = () => { tokenImgCache.set(url, 'error'); };
    img.src = url;
  }
  return null;
}

let _animLoopRunning = false;
function startAnimationLoop() {
  if (_animLoopRunning) return;
  _animLoopRunning = true;
  function loop() {
    const hasAnim = [...tokenImgCache.values()].some(v => v?._isAnimated);
    if (!hasAnim) { _animLoopRunning = false; return; }
    drawMap();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

const GRID = 50;

function initCanvas() {
  canvas = document.getElementById('mapCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onRightClick);
  document.addEventListener('keydown', hotkeyHandler);
  initWeatherCanvas();

  canvas.addEventListener('dblclick', (e) => {
    // Double-clic mesure = finalise (garde la ligne affichée)
    if (currentTool === 'measure' && measureActive) {
      const world = screenToWorld(e.offsetX, e.offsetY);
      const snapped = snapToGrid(world);
      measurePoints.push(snapped);
      measureCursor = null;
      measureActive = false;
      broadcastMeasure();
      drawMap();
      return;
    }
    // Double-clic = pathfinding (si token sélectionné) ou ping
    if (currentTool !== 'select') return;
    const world = screenToWorld(e.offsetX, e.offsetY);
    const hit = gameTokens.find(t => {
      const s = worldToScreen(t.x, t.y);
      const r = (currentMap?.grid_size || GRID) * cam.zoom * (t.size || 1) / 2;
      return Math.hypot(s.x - e.offsetX, s.y - e.offsetY) <= r;
    });
    // Si un token est sélectionné et on double-clique sur espace libre → pathfinding
    if (!hit && selectedToken && currentMap) {
      if (pathfindTo(world.x, world.y)) return;
    }
    if (!hit) sendMapPing(world.x, world.y);
  });

  if (campaign.maps?.length) {
    currentMap = campaign.maps.find(m => m.is_active) || campaign.maps[0];
    mapWalls   = Array.isArray(currentMap.walls)   ? currentMap.walls   : [];
    mapObjects = Array.isArray(currentMap.objects) ? currentMap.objects : [];
    // Charger les dessins existants
    const savedDrawings = currentMap.drawings;
    if (savedDrawings && Array.isArray(savedDrawings)) {
      drawStrokes = savedDrawings;
    } else if (typeof savedDrawings === 'string') {
      try { drawStrokes = JSON.parse(savedDrawings) || []; } catch { drawStrokes = []; }
    }
    syncLightsFromObjects();
    // Charger les tokens
    API.maps.tokens(CAMPAIGN_ID, currentMap.id).then(t => { gameTokens = t; drawMap(); }).catch(() => {});
  }
  initObjPicker();
  drawMap();
}

function resizeCanvas() {
  if (DISPLAY_MODE) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    const area = document.getElementById('mapArea');
    canvas.width = area.clientWidth;
    canvas.height = area.clientHeight;
  }
  drawMap();
}

function worldToScreen(wx, wy) {
  return { x: (wx - cam.x) * cam.zoom + canvas.width / 2, y: (wy - cam.y) * cam.zoom + canvas.height / 2 };
}
function screenToWorld(sx, sy) {
  return { x: (sx - canvas.width / 2) / cam.zoom + cam.x, y: (sy - canvas.height / 2) / cam.zoom + cam.y };
}

function _renderFrame() {
  _drawPending = false;
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fond
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grille
  if (currentMap) {
    if (showGrid) drawGrid();
    if (currentMap.background_url) drawBackground();
  }

  // Lumières (glow au sol, dessiné avant les tokens)
  if (myRole === 'gm' || visionMode !== 'character') drawLights(false);

  // Tokens
  gameTokens.forEach(t => drawToken(t));

  // Anneau vert ownership (joueur courant uniquement)
  if (myRole !== 'gm') gameTokens.forEach(t => drawTokenOwnerRing(t));

  // Barres/nombres PV sous chaque token
  gameTokens.forEach(t => {
    const s = worldToScreen(t.x, t.y);
    const r = ((currentMap?.grid_size || GRID) * cam.zoom) * (t.size || 1) / 2;
    drawTokenHpBar(t, s, r);
  });

  // Token sélectionné highlight
  if (selectedToken) {
    const t = gameTokens.find(tk => tk.id === selectedToken);
    if (t) drawTokenHighlight(t);
  }

  // Combattant actif — glow pulsant
  if (combatState) {
    const active = combatState.combatants[combatState.current_turn];
    if (active) {
      const at = active.char_id
        ? gameTokens.find(t => t.character_id === active.char_id)
        : gameTokens.find(t => (t.label || t.char_name || '') === active.name);
      if (at) drawActiveCombatantGlow(at, active.color);
    }
  }

  // Objets (décor, lumières, etc.)
  drawObjects();

  // Murs (par-dessus les tokens pour le MJ en mode édition)
  drawWalls();
  drawWallPreview();

  // Mode nuit : overlay sombre avec découpe aux sources lumineuses
  renderNightOverlay();

  renderFog();
  drawFogBrushPreview();
  renderVisionOverlay();
  drawSpellZones();
  drawMeasure();
  drawPathPreview();
  drawPings();
  drawStrokesOnMap();
  drawTargetLines();
}
