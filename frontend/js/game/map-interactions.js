/**
 * Sodales — interactions souris sur la carte (partie extraite de game.html)
 * Sélection/glisser de jetons, zoom, pan, navigation clavier de la caméra.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */

// Renvoie true si l'utilisateur courant peut déplacer/contrôler ce token
function canControlToken(t) {
  if (myRole === 'gm') return true;
  // Token lié à un personnage : seulement si c'est le personnage du joueur
  if (t.character_id) return t.char_user_id === getUser()?.id;
  // Token PNJ libre (pas de personnage) : MJ uniquement
  return false;
}

// Vrai si le token appartient au joueur courant ET a un champ de vision conique
function isPlayerConeToken(t) {
  return myRole !== 'gm'
    && t.char_user_id === getUser()?.id
    && t.char_vision_angle && t.char_vision_angle < 360
    && visionMode === 'character';
}

// Sauvegarde le facing courant du token sélectionné via socket
function saveTokenFacing() {
  if (!selectedToken || !socket) return;
  const t = gameTokens.find(tk => tk.id === selectedToken);
  if (!t) return;
  socket.emit('token_move', {
    campaign_id: CAMPAIGN_ID, map_id: currentMap?.id,
    token_id: t.id, x: t.x, y: t.y,
    facing: t.facing ?? 0,
  });
}

function onMouseDown(e) {
  const x = e.offsetX, y = e.offsetY;   // coordonnées relatives au canvas
  const world = screenToWorld(x, y);

  // Close condition menu on any click
  if (!e.target.closest('#conditionMenu')) hideConditionMenu();

  if (currentTool === 'fog' && myRole === 'gm') {
    fogPainting = true;
    fogPaintAt(world.x, world.y);
    return;
  }

  if (currentTool === 'walls' && myRole === 'gm') {
    wallDrawStart = { x: world.x, y: world.y };
    return;
  }

  if (currentTool === 'objects' && myRole === 'gm') {
    // Clic sur un objet existant → le sélectionner pour drag
    const hit = findObjectAt(world.x, world.y);
    if (hit) {
      selectedObjectId = hit.id;
      draggingObject = true;
      drawMap();
    } else if (selectedObjectType) {
      // Placer un nouvel objet du type sélectionné
      const gs = currentMap?.grid_size || GRID;
      const snapped = { x: Math.round(world.x / gs) * gs, y: Math.round(world.y / gs) * gs };
      const obj = { id: `obj_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: selectedObjectType, x: snapped.x, y: snapped.y };
      mapObjects.push(obj);
      syncLightsFromObjects();
      _invalidateVisionAll();
      saveObjects();
      drawMap();
    }
    return;
  }

  if (currentTool === 'measure') {
    const snapped = snapToGrid(world);
    if (!measureActive) {
      measurePoints = [snapped];
      measureActive = true;
    } else {
      measurePoints.push(snapped);
      broadcastMeasure();
    }
    return;
  }

  if (currentTool === 'zones') {
    const gs = currentMap?.grid_size || GRID;
    // Clic sur une zone existante → déplacement
    const hitZone = spellZones.find(z => isPointInZone(world, z, gs));
    if (hitZone) {
      draggingZone   = hitZone;
      draggingZoneOX = world.x - hitZone.ox;
      draggingZoneOY = world.y - hitZone.oy;
      canvas.style.cursor = 'grabbing';
      return;
    }
    // Pas de zone sous le curseur → créer une nouvelle zone
    zoneMouseDown = true;
    const snapped = snapToGrid(world);
    zoneDrawing = { type: zoneType, colorIdx: zoneColorIdx, ox: snapped.x, oy: snapped.y,
                    cx: snapped.x, cy: snapped.y, radius: 0,
                    angle: 0, length: 0,
                    x2: snapped.x, y2: snapped.y };
    return;
  }

  if (currentTool === 'draw') {
    startDrawStroke(world.x, world.y);
    return;
  }

  if (currentTool === 'select') {
    const hit = findTokenAt(world.x, world.y);
    if (hit) {
      selectedToken = hit.id;
      selectedObjectId = null;
      drawMap();
      // Seulement démarrer le drag si le joueur contrôle ce token
      if (canControlToken(hit)) {
        draggingToken = true;
        drag.tokenStartX      = hit.x;
        drag.tokenStartY      = hit.y;
        drag.tokenMouseStartX = world.x;
        drag.tokenMouseStartY = world.y;
        canvas.style.cursor = 'grabbing';
      }
      return;
    }
    // Objet cliqué en mode select (MJ) → drag d'objet
    if (myRole === 'gm') {
      const objHit = findObjectAt(world.x, world.y);
      if (objHit) {
        selectedObjectId = objHit.id;
        draggingObject = true;
        canvas.style.cursor = 'grabbing';
        drawMap();
        return;
      }
    }
    // Clic sur espace vide : si un token conique était sélectionné, on sauvegarde le facing
    if (selectedToken) {
      const sel = gameTokens.find(tk => tk.id === selectedToken);
      if (sel && isPlayerConeToken(sel)) saveTokenFacing();
    }
    rotatingToken = false;
    selectedToken = null;
    selectedObjectId = null;
    drag.active = true; drag.startX = x; drag.startY = y;
    drag.camX = cam.x; drag.camY = cam.y;
    canvas.classList.add('dragging');
    drawMap();
  }
}

function onMouseMove(e) {
  const x = e.offsetX, y = e.offsetY;  // coordonnées relatives au canvas
  const world = screenToWorld(x, y);
  const gs = currentMap?.grid_size || GRID;
  document.getElementById('mapInfo').textContent =
    `Case ${Math.floor(world.x / gs)}, ${Math.floor(world.y / gs)} — zoom ${Math.round(cam.zoom * 100)}%`;

  fogMouseWorld = world;
  wallPreviewEnd = (currentTool === 'walls' && wallDrawStart) ? { x: world.x, y: world.y } : null;

  if (currentTool === 'fog' && fogPainting && myRole === 'gm') {
    fogPaintAt(world.x, world.y);
    return;
  }

  if (currentTool === 'draw' && drawCurrentStroke) {
    addDrawPoint(world.x, world.y);
    return;
  }

  if (currentTool === 'walls' && wallDrawStart) {
    drawMap();
    return;
  }

  if (currentTool === 'measure' && measureActive) {
    measureCursor = snapToGrid(world);
    drawMap();
    return;
  }

  if (currentTool === 'zones' && draggingZone) {
    // Déplacement d'une zone existante
    const gs = currentMap?.grid_size || GRID;
    const newOx = Math.round((world.x - draggingZoneOX) / gs) * gs;
    const newOy = Math.round((world.y - draggingZoneOY) / gs) * gs;
    const ddx = newOx - draggingZone.ox;
    const ddy = newOy - draggingZone.oy;
    draggingZone.ox += ddx;
    draggingZone.oy += ddy;
    if ('x2' in draggingZone) { draggingZone.x2 += ddx; draggingZone.y2 += ddy; }
    drawMap();
    return;
  }

  if (currentTool === 'zones' && zoneDrawing && zoneMouseDown) {
    const gs = currentMap?.grid_size || GRID;
    const snapped = snapToGrid(world);
    const dx = snapped.x - zoneDrawing.ox, dy = snapped.y - zoneDrawing.oy;
    zoneDrawing.angle  = Math.atan2(dy, dx);
    zoneDrawing.length = Math.hypot(dx, dy);
    zoneDrawing.radius = Math.round(Math.hypot(dx, dy) / gs) * gs;
    if (zoneDrawing.radius < gs) zoneDrawing.radius = gs;
    zoneDrawing.x2 = snapped.x;
    zoneDrawing.y2 = snapped.y;
    drawMap();
    return;
  }

  // Curseur en mode zones : grab au survol d'une zone existante
  if (currentTool === 'zones' && e.buttons === 0) {
    const gs = currentMap?.grid_size || GRID;
    const hovZone = spellZones.find(z => isPointInZone(world, z, gs));
    canvas.style.cursor = hovZone ? 'grab' : 'crosshair';
  }

  // Mode rotation : souris libre (sans bouton) sur un token conique sélectionné
  if (e.buttons === 0 && selectedToken && currentTool === 'select') {
    const t = gameTokens.find(tk => tk.id === selectedToken);
    if (t && isPlayerConeToken(t)) {
      rotatingToken = true;
      t.facing = Math.atan2(world.y - t.y, world.x - t.x);
      _invalidateVisionToken(t.id);
      canvas.style.cursor = 'crosshair';
      drawMap();
      return;  // bloque le pan de la carte
    }
  } else if (e.buttons !== 0) {
    // Dès qu'on enfonce un bouton, on n'est plus en rotation
    if (rotatingToken) { rotatingToken = false; canvas.style.cursor = 'grabbing'; }
  }

  // Drag objet (depuis le mode objects OU le mode select)
  if (draggingObject && selectedObjectId && (currentTool === 'objects' || currentTool === 'select')) {
    const snapped = { x: Math.round(world.x / gs) * gs, y: Math.round(world.y / gs) * gs };
    const obj = mapObjects.find(o => o.id === selectedObjectId);
    if (obj) { obj.x = snapped.x; obj.y = snapped.y; syncLightsFromObjects(); _invalidateVisionAll(); drawMap(); }
    return;
  }

  // Survol : changer le curseur selon token survolé et droits du joueur
  if (currentTool === 'select' && e.buttons === 0) {
    const hovTok = findTokenAt(world.x, world.y);
    if (hovTok) {
      canvas.style.cursor = canControlToken(hovTok) ? 'grab' : 'not-allowed';
      return;
    }
    if (myRole === 'gm') {
      const hovObj = findObjectAt(world.x, world.y);
      if (hovObj) { canvas.style.cursor = 'grab'; return; }
    }
  }

  if (draggingToken && selectedToken) {
    const snapped = { x: Math.round(world.x / gs) * gs, y: Math.round(world.y / gs) * gs };
    const t = gameTokens.find(tk => tk.id === selectedToken);
    if (t) { t.x = snapped.x; t.y = snapped.y; _invalidateVisionToken(t.id); drawMap(); }
    return;
  }
  if (drag.active) {
    cam.x = drag.camX - (x - drag.startX) / cam.zoom;
    cam.y = drag.camY - (y - drag.startY) / cam.zoom;
    drawMap();
  }
}

function onMouseUp(e) {
  if (currentTool === 'fog') { fogPainting = false; return; }
  if (currentTool === 'draw') { endDrawStroke(); return; }
  if (currentTool === 'walls' && wallDrawStart && myRole === 'gm') {
    const world = screenToWorld(e.offsetX, e.offsetY);
    const dx = world.x - wallDrawStart.x, dy = world.y - wallDrawStart.y;
    if (Math.hypot(dx, dy) > 5) {
      mapWalls.push({ id: Date.now(), x1: wallDrawStart.x, y1: wallDrawStart.y, x2: world.x, y2: world.y });
      saveWalls();
    }
    wallDrawStart = null;
    wallPreviewEnd = null;
    drawMap();
    return;
  }
  if (currentTool === 'measure') {
    return; // on gère tout dans mousedown
  }

  if (currentTool === 'zones' && draggingZone) {
    const moved = { ...draggingZone };
    draggingZone = null;
    draggingZoneOX = 0; draggingZoneOY = 0;
    if (socket) socket.emit('zone_move', { campaign_id: CAMPAIGN_ID, zone: moved });
    canvas.style.cursor = 'crosshair';
    drawMap();
    return;
  }

  if (currentTool === 'zones' && zoneMouseDown && zoneDrawing) {
    zoneMouseDown = false;
    const gs = currentMap?.grid_size || GRID;
    const minSize = gs * 0.8;
    if (zoneDrawing.length >= minSize || zoneDrawing.radius >= gs) {
      const zone = { ...zoneDrawing, id: `z_${Date.now()}_${Math.random().toString(36).slice(2,5)}` };
      spellZones.push(zone);
      if (socket) socket.emit('zone_add', { campaign_id: CAMPAIGN_ID, zone });
    }
    zoneDrawing = null;
    drawMap();
    return;
  }
  // Fin de drag d'objet → save
  if (draggingObject && selectedObjectId) {
    draggingObject = false;
    saveObjects();
    return;
  }

  if (draggingToken && selectedToken && socket) {
    const t = gameTokens.find(tk => tk.id === selectedToken);
    if (t) {
      // Enregistrer position avant déplacement pour Ctrl+Z
      if (drag.tokenStartX !== undefined) pushTokenHistory(t.id, drag.tokenStartX, drag.tokenStartY);
      // Calculer le facing depuis la direction de la souris
      const rawMouse = screenToWorld(e.offsetX, e.offsetY);
      const mdx = rawMouse.x - (drag.tokenMouseStartX ?? t.x);
      const mdy = rawMouse.y - (drag.tokenMouseStartY ?? t.y);
      const minDrag = 8 / cam.zoom;
      if (Math.hypot(mdx, mdy) > minDrag) {
        t.facing = Math.atan2(mdy, mdx);
      }
      socket.emit('token_move', {
        campaign_id: CAMPAIGN_ID, map_id: currentMap?.id,
        token_id: t.id, x: t.x, y: t.y,
        facing: t.facing ?? 0,
      });
    }
  }
  draggingToken = false;
  drag.active = false;
  canvas.classList.remove('dragging');
  canvas.style.cursor = currentTool === 'select' ? 'grab' : 'default';
}

function onWheel(e) {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  const world = screenToWorld(e.offsetX, e.offsetY);
  cam.zoom = Math.max(0.2, Math.min(4, cam.zoom * factor));
  // Zoomer vers la souris
  const newScreen = worldToScreen(world.x, world.y);
  cam.x += (newScreen.x - e.offsetX) / cam.zoom;
  cam.y += (newScreen.y - e.offsetY) / cam.zoom;
  drawMap();
}

function onRightClick(e) {
  e.preventDefault();
  const world = screenToWorld(e.offsetX, e.offsetY);
  const hit = findTokenAt(world.x, world.y);
  if (hit) {
    if (myRole === 'gm' || canControlToken(hit)) {
      showConditionMenu(hit, e.clientX, e.clientY);
    }
    return;
  }
  // Clear measure on right click
  if (currentTool === 'measure') {
    measurePoints = []; measureCursor = null; measureActive = false;
    if (socket) socket.emit('measure_clear', { campaign_id: CAMPAIGN_ID });
    drawMap();
  }
  // Zones : clic droit sur une zone la supprime
  if (currentTool === 'zones') {
    const gs = currentMap?.grid_size || GRID;
    const zoneHit = spellZones.find(z => isPointInZone(world, z, gs));
    if (zoneHit) {
      spellZones = spellZones.filter(z => z.id !== zoneHit.id);
      if (socket) socket.emit('zone_remove', { campaign_id: CAMPAIGN_ID, zone_id: zoneHit.id });
      drawMap();
    }
  }
  // Supprimer mur ou lumière au clic droit
  if (currentTool === 'walls' && myRole === 'gm') {
    const before = mapWalls.length;
    mapWalls = mapWalls.filter(w => {
      const d = pointToSegmentDist(world.x, world.y, w.x1, w.y1, w.x2, w.y2);
      return d > 12 / cam.zoom;
    });
    if (mapWalls.length !== before) { saveWalls(); drawMap(); }
    return;
  }
  // Supprimer un objet au clic droit — depuis le mode objects OU le mode select
  if (myRole === 'gm' && (currentTool === 'objects' || currentTool === 'select')) {
    const objHit = findObjectAt(world.x, world.y);
    if (objHit) {
      mapObjects = mapObjects.filter(o => o.id !== objHit.id);
      if (selectedObjectId === objHit.id) selectedObjectId = null;
      syncLightsFromObjects();
      _invalidateVisionAll();
      saveObjects();
      drawMap();
      return;
    }
  }
}

function findTokenAt(wx, wy) {
  const gs = currentMap?.grid_size || GRID;
  return [...gameTokens].reverse().find(t => {
    const r = gs * (t.size || 1) / 2;
    return Math.hypot(wx - t.x, wy - t.y) <= r;
  });
}
