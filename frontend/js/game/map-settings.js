/**
 * Sodales — réglages de carte et import UVTT (partie extraite de game.html)
 * Vision par personnage, fond de carte (dimensions/image/API), murs et
 * lumières, import UVTT, presets de conditions.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function toggleVisionMenu() {
  const dd = document.getElementById('vision-dropdown');
  dd.classList.toggle('open');
}

function closeVisionMenu() {
  document.getElementById('vision-dropdown')?.classList.remove('open');
}

function setVisionMode(mode) {
  closeVisionMenu();
  socket?.emit('vision_mode_set', { campaign_id: CAMPAIGN_ID, mode });
  // Mise à jour locale immédiate pour le MJ
  visionMode = mode;
  updateVisionModeUI(mode);
  drawMap();
}

function updateVisionModeUI(mode) {
  const icons = { all: '👁', character: '🧝', none: '🌑' };
  const labels = { all: 'Tout', character: 'Personnage', none: 'Rien' };
  const iconEl = document.getElementById('vision-mode-icon');
  const labelEl = document.getElementById('vision-mode-label');
  if (iconEl) iconEl.textContent = icons[mode] || '👁';
  if (labelEl) labelEl.textContent = labels[mode] || 'Tout';
  ['all', 'character', 'none'].forEach(m => {
    const el = document.getElementById(`vcheck-${m}`);
    if (el) el.textContent = m === mode ? '✓' : '';
  });
}

const fogPaintBuffer = [];
let fogPaintTimer = null;

function fogPaintAt(wx, wy) {
  const gs = currentMap?.grid_size || GRID;
  const r = fogBrushRadius * gs;
  // Avoid duplicate nearby circles
  const tooClose = fogState.circles.some(c => Math.hypot(c.x - wx, c.y - wy) < r * 0.6);
  if (tooClose) return;
  const circle = { x: wx, y: wy, r };
  fogState.circles.push(circle);
  fogPaintBuffer.push(circle);
  drawMap();

  clearTimeout(fogPaintTimer);
  fogPaintTimer = setTimeout(() => {
    if (fogPaintBuffer.length) {
      socket?.emit('fog_reveal', { campaign_id: CAMPAIGN_ID, map_id: currentMap?.id, circles: [...fogPaintBuffer] });
      fogPaintBuffer.length = 0;
    }
  }, 150);
}

// ══════════════════════════════════════════════════════════════
// PATHFINDING A* — évitement des murs
// ══════════════════════════════════════════════════════════════
let pathPreview     = null;  // [{x,y}] chemin en cours de prévisualisation
let pathAnimTimer   = null;  // timer d'animation du déplacement

// Test d'intersection de deux segments (stricte — pas aux extrémités)
function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1x = x2-x1, d1y = y2-y1, d2x = x4-x3, d2y = y4-y3;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((x3-x1)*d2y - (y3-y1)*d2x) / cross;
  const u = ((x3-x1)*d1y - (y3-y1)*d1x) / cross;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

// Vérifie si un mouvement de (fx,fy) vers (tx,ty) est bloqué par un mur
function movementBlocked(fx, fy, tx, ty) {
  for (const w of mapWalls) {
    if (segmentsIntersect(fx, fy, tx, ty, w.x1, w.y1, w.x2, w.y2)) return true;
  }
  return false;
}

// A* sur grille (ou hexagone) — retourne un tableau [{x,y}] de centres de cases
function aStarPath(startX, startY, goalX, goalY) {
  const gs   = currentMap?.grid_size || GRID;
  const maxR = 28; // rayon de recherche maximal en cases

  let sx, sy, gx, gy;
  if (gridType === 'hex') {
    const s0 = snapToHex(startX, startY);
    const g0 = snapToHex(goalX,  goalY);
    // Use world-space hex centers as nodes — too complex; fall back to square grid approx
    sx = Math.round(startX / gs); sy = Math.round(startY / gs);
    gx = Math.round(goalX  / gs); gy = Math.round(goalY  / gs);
  } else {
    sx = Math.round(startX / gs); sy = Math.round(startY / gs);
    gx = Math.round(goalX  / gs); gy = Math.round(goalY  / gs);
  }

  if (sx === gx && sy === gy) return [];
  if (Math.hypot(gx-sx, gy-sy) > maxR) return null; // trop loin

  const key = (x, y) => (x + 100) * 10000 + (y + 100);
  const unkey = k => ({ x: ((k / 10000 | 0) - 100), y: (k % 10000 - 100) });

  const gScore   = new Map();
  const fScore   = new Map();
  const cameFrom = new Map();
  const openSet  = new Map();
  const closed   = new Set();

  const heur = (x, y) => Math.hypot(x-gx, y-gy);
  const sk   = key(sx, sy);
  gScore.set(sk, 0);
  fScore.set(sk, heur(sx, sy));
  openSet.set(sk, true);

  const dirs8 = [[-1,-1,Math.SQRT2],[0,-1,1],[1,-1,Math.SQRT2],[-1,0,1],[1,0,1],[-1,1,Math.SQRT2],[0,1,1],[1,1,Math.SQRT2]];
  let iter = 0;

  while (openSet.size > 0 && iter++ < 2500) {
    // pop lowest f
    let cur = null, bestF = Infinity;
    for (const [k] of openSet) {
      const f = fScore.get(k) ?? Infinity;
      if (f < bestF) { bestF = f; cur = k; }
    }
    if (cur === null) break;
    openSet.delete(cur);
    closed.add(cur);

    const { x: cx, y: cy } = unkey(cur);

    if (cx === gx && cy === gy) {
      // Reconstruct
      const path = [];
      let c = cur;
      while (cameFrom.has(c)) {
        const { x, y } = unkey(c);
        path.unshift({ x: x * gs, y: y * gs });
        c = cameFrom.get(c);
      }
      path.unshift({ x: sx * gs, y: sy * gs });
      return path;
    }

    for (const [dx, dy, cost] of dirs8) {
      const nx = cx + dx, ny = cy + dy;
      if (Math.hypot(nx-sx, ny-sy) > maxR) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;

      // Wall check: is the move from (cx,cy) to (nx,ny) blocked?
      if (mapWalls.length > 0 && movementBlocked(cx*gs, cy*gs, nx*gs, ny*gs)) continue;

      const tentG = (gScore.get(cur) ?? Infinity) + cost;
      if (tentG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, cur);
        gScore.set(nk, tentG);
        fScore.set(nk, tentG + heur(nx, ny));
        openSet.set(nk, true);
      }
    }
  }
  return null; // no path
}

// Déplacer le token pas à pas le long du chemin
function animatePathMove(tokenId, path, stepIdx) {
  if (!path || stepIdx >= path.length) {
    pathPreview = null;
    pathAnimTimer = null;
    drawMap();
    return;
  }
  const step = path[stepIdx];
  socket?.emit('token_move', { campaign_id: CAMPAIGN_ID, token_id: tokenId, x: step.x, y: step.y, facing: null });
  const t = gameTokens.find(tk => tk.id === tokenId);
  if (t) { t.x = step.x; t.y = step.y; drawMap(); }
  pathAnimTimer = setTimeout(() => animatePathMove(tokenId, path, stepIdx + 1), 100);
}

// Lancer pathfinding vers une destination (appelé depuis dblclick)
function pathfindTo(destX, destY) {
  if (!selectedToken) return false;
  const t = gameTokens.find(tk => tk.id === selectedToken);
  if (!t) return false;
  // Vérifier permission de déplacement
  const canMove = myRole === 'gm' || myChars?.some(c => c.id === t.character_id);
  if (!canMove) return false;

  // Si pas de murs, déplacement direct
  if (!mapWalls.length) {
    const snapped = snapToGrid({ x: destX, y: destY });
    pushTokenHistory(t.id, t.x, t.y);
    socket?.emit('token_move', { campaign_id: CAMPAIGN_ID, token_id: t.id, x: snapped.x, y: snapped.y, facing: null });
    t.x = snapped.x; t.y = snapped.y;
    drawMap();
    return true;
  }

  const snapped = snapToGrid({ x: destX, y: destY });
  const path = aStarPath(t.x, t.y, snapped.x, snapped.y);

  if (!path) {
    // Pas de chemin trouvé — déplacement direct
    pushTokenHistory(t.id, t.x, t.y);
    socket?.emit('token_move', { campaign_id: CAMPAIGN_ID, token_id: t.id, x: snapped.x, y: snapped.y, facing: null });
    t.x = snapped.x; t.y = snapped.y;
    drawMap();
    return true;
  }

  if (path.length === 0) return true; // déjà sur place

  pushTokenHistory(t.id, t.x, t.y);
  pathPreview = path;
  drawMap();

  if (pathAnimTimer) clearTimeout(pathAnimTimer);
  animatePathMove(t.id, path, 1); // step 0 = position actuelle
  return true;
}

// ══════════════════════════════════════════════════════════════
// MESURE DE DISTANCE
// ══════════════════════════════════════════════════════════════
let measurePoints = [];   // [{x,y}, ...] points posés
let measureCursor = null; // position live du curseur
let measureActive = false;
let remoteMeasure = null; // mesure reçue des autres joueurs

// Snap au centre de la case (ou hexagone) la plus proche
function snapToGrid(world) {
  if (gridType === 'hex') return snapToHex(world.x, world.y);
  const gs = currentMap?.grid_size || GRID;
  return {
    x: Math.round(world.x / gs) * gs,
    y: Math.round(world.y / gs) * gs
  };
}

// Distance totale en cases sur un tableau de points
function measureTotalCells(pts) {
  const gs = currentMap?.grid_size || GRID;
  if (gridType === 'hex') {
    // Hex distance in cells: convert world coords to axial, use cube distance
    const s = gs / 2;
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i-1], b = pts[i];
      const aq = (Math.sqrt(3)/3*a.x - 1/3*a.y)/s, ar = (2/3*a.y)/s;
      const bq = (Math.sqrt(3)/3*b.x - 1/3*b.y)/s, br = (2/3*b.y)/s;
      // Cube distance
      const dq = bq-aq, dr = br-ar, ds = -(dq+dr);
      total += (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
    }
    return total;
  }
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot((pts[i].x - pts[i-1].x) / gs, (pts[i].y - pts[i-1].y) / gs);
  }
  return total;
}

function broadcastMeasure() {
  if (!socket) return;
  socket.emit('measure_show', { campaign_id: CAMPAIGN_ID, points: measurePoints });
}

function _drawMeasurePath(pts, cursorPt, isRemote) {
  if (pts.length === 0) return;
  const gs = currentMap?.grid_size || GRID;
  const allPts = cursorPt ? [...pts, cursorPt] : pts;
  if (allPts.length < 2) {
    // Juste un point de départ — dessiner un cercle
    const s = worldToScreen(pts[0].x, pts[0].y);
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = isRemote ? '#60a5fa' : '#f59e0b';
    ctx.fill();
    ctx.restore();
    return;
  }

  const COLOR    = isRemote ? '#60a5fa' : '#f59e0b';
  const COLORFILL = isRemote ? 'rgba(96,165,250,0.15)' : 'rgba(245,158,11,0.15)';

  ctx.save();

  // — Ligne principale avec glow —
  ctx.shadowColor = COLOR;
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  const s0 = worldToScreen(allPts[0].x, allPts[0].y);
  ctx.moveTo(s0.x, s0.y);
  for (let i = 1; i < allPts.length; i++) {
    const s = worldToScreen(allPts[i].x, allPts[i].y);
    ctx.lineTo(s.x, s.y);
  }
  ctx.strokeStyle = COLOR;
  ctx.lineWidth   = 2.5;
  ctx.setLineDash([8, 4]);
  ctx.stroke();
  ctx.shadowBlur  = 0;
  ctx.setLineDash([]);

  // — Flèche au bout —
  const sLast = worldToScreen(allPts[allPts.length - 1].x, allPts[allPts.length - 1].y);
  const sPrev = worldToScreen(allPts[allPts.length - 2].x, allPts[allPts.length - 2].y);
  const angle = Math.atan2(sLast.y - sPrev.y, sLast.x - sPrev.x);
  const ah = 12, aw = 6;
  ctx.beginPath();
  ctx.moveTo(sLast.x, sLast.y);
  ctx.lineTo(sLast.x - ah * Math.cos(angle - 0.4), sLast.y - ah * Math.sin(angle - 0.4));
  ctx.lineTo(sLast.x - ah * Math.cos(angle + 0.4), sLast.y - ah * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fillStyle = COLOR;
  ctx.fill();

  // — Points de cheminement —
  allPts.forEach((p, i) => {
    const s = worldToScreen(p.x, p.y);
    ctx.beginPath();
    ctx.arc(s.x, s.y, i === 0 ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle   = i === 0 ? COLOR : COLORFILL;
    ctx.strokeStyle = COLOR;
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();
  });

  // — Labels par segment —
  for (let i = 1; i < allPts.length; i++) {
    const sa = worldToScreen(allPts[i-1].x, allPts[i-1].y);
    const sb = worldToScreen(allPts[i].x, allPts[i].y);
    const segCells = Math.hypot(
      (allPts[i].x - allPts[i-1].x) / gs,
      (allPts[i].y - allPts[i-1].y) / gs
    );
    const segFt = Math.round(segCells * 5);
    const segM  = (segCells * 1.5).toFixed(1);
    const mx = (sa.x + sb.x) / 2, my = (sa.y + sb.y) / 2 - 14;
    const label = `${segCells.toFixed(1)} cases · ${segFt}ft · ${segM}m`;
    const tw = ctx.measureText(label).width + 12;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(10,10,20,0.8)';
    ctx.beginPath();
    ctx.roundRect(mx - tw/2, my - 10, tw, 16, 4);
    ctx.fill();
    ctx.fillStyle = COLOR;
    ctx.textAlign = 'center';
    ctx.fillText(label, mx, my + 2);
  }

  // — Label total (si > 1 segment) —
  if (allPts.length > 2) {
    const totalCells = measureTotalCells(allPts);
    const totalFt = Math.round(totalCells * 5);
    const totalM  = (totalCells * 1.5).toFixed(1);
    const sEnd = worldToScreen(allPts[allPts.length - 1].x, allPts[allPts.length - 1].y);
    const label = `Total : ${totalCells.toFixed(1)} cases · ${totalFt}ft · ${totalM}m`;
    ctx.font = 'bold 12px Inter, sans-serif';
    const tw = ctx.measureText(label).width + 16;
    ctx.fillStyle = 'rgba(10,10,20,0.9)';
    ctx.beginPath();
    ctx.roundRect(sEnd.x - tw/2, sEnd.y + 12, tw, 18, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(label, sEnd.x, sEnd.y + 25);
  }

  ctx.restore();
}

function drawMeasure() {
  // Mesure locale
  if (measurePoints.length > 0) {
    _drawMeasurePath(measurePoints, measureActive ? measureCursor : null, false);
  }
  // Mesure distante (autre joueur)
  if (remoteMeasure && remoteMeasure.points.length > 1) {
    _drawMeasurePath(remoteMeasure.points, null, true);
  }
}

// ══════════════════════════════════════════════════════════════
// ZONES DE SORTS
// ══════════════════════════════════════════════════════════════

function isPointInZone(world, z, gs) {
  if (z.type === 'circle') {
    return Math.hypot(world.x - z.ox, world.y - z.oy) <= z.radius;
  }
  if (z.type === 'cone') {
    const dist = Math.hypot(world.x - z.ox, world.y - z.oy);
    if (dist > z.length) return false;
    const a = Math.atan2(world.y - z.oy, world.x - z.ox);
    let diff = Math.abs(a - z.angle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    return diff <= Math.PI / 6; // 30° de chaque côté = 60° total
  }
  if (z.type === 'line') {
    // Distance point-segment
    const dx = z.x2 - z.ox, dy = z.y2 - z.oy;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return false;
    const t = Math.max(0, Math.min(1, ((world.x - z.ox)*dx + (world.y - z.oy)*dy) / len2));
    const px = z.ox + t*dx - world.x, py = z.oy + t*dy - world.y;
    const halfW = (gs * 0.6);
    return Math.hypot(px, py) <= halfW;
  }
  return false;
}

function _drawOneZone(z, alpha) {
  const gs = currentMap?.grid_size || GRID;
  const col = ZONE_COLORS[z.colorIdx ?? 0];
  const s0 = worldToScreen(z.ox, z.oy);

  ctx.save();
  ctx.globalAlpha = alpha ?? 1;
  ctx.shadowColor = col.stroke;
  ctx.shadowBlur  = 10;

  if (z.type === 'circle') {
    const sr = z.radius * cam.zoom;
    ctx.beginPath();
    ctx.arc(s0.x, s0.y, sr, 0, Math.PI * 2);
    ctx.fillStyle   = col.fill;
    ctx.fill();
    ctx.strokeStyle = col.stroke;
    ctx.lineWidth   = 2;
    ctx.stroke();
    // Label rayon
    ctx.shadowBlur = 0;
    ctx.font = 'bold 11px Inter,sans-serif';
    ctx.textAlign = 'center';
    const radiusFt = Math.round(z.radius / gs * 5);
    const radiusM  = (z.radius / gs * 1.5).toFixed(1);
    const lbl = `r ${radiusFt}ft · ${radiusM}m`;
    const tw = ctx.measureText(lbl).width + 12;
    ctx.fillStyle = 'rgba(10,10,20,0.8)';
    ctx.beginPath(); ctx.roundRect(s0.x - tw/2, s0.y + sr + 4, tw, 16, 4); ctx.fill();
    ctx.fillStyle = col.stroke;
    ctx.fillText(lbl, s0.x, s0.y + sr + 16);
  }

  if (z.type === 'cone') {
    const a1 = z.angle - Math.PI / 6; // -30°
    const a2 = z.angle + Math.PI / 6; // +30°
    const sl = z.length * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(s0.x, s0.y);
    ctx.arc(s0.x, s0.y, sl, a1, a2);
    ctx.closePath();
    ctx.fillStyle   = col.fill;
    ctx.fill();
    ctx.strokeStyle = col.stroke;
    ctx.lineWidth   = 2;
    ctx.stroke();
    // Label
    ctx.shadowBlur = 0;
    const ex = s0.x + Math.cos(z.angle) * sl * 0.65;
    const ey = s0.y + Math.sin(z.angle) * sl * 0.65;
    const lenFt = Math.round(z.length / gs * 5);
    const lenM  = (z.length / gs * 1.5).toFixed(1);
    const lbl = `${lenFt}ft · ${lenM}m`;
    const tw = ctx.measureText(lbl).width + 12;
    ctx.font = 'bold 11px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,10,20,0.8)';
    ctx.beginPath(); ctx.roundRect(ex - tw/2, ey - 8, tw, 16, 4); ctx.fill();
    ctx.fillStyle = col.stroke;
    ctx.fillText(lbl, ex, ey + 4);
  }

  if (z.type === 'line') {
    const s2 = worldToScreen(z.x2, z.y2);
    const halfW = gs * 0.6 * cam.zoom; // ~5ft wide
    const dx = s2.x - s0.x, dy = s2.y - s0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy/len * halfW, ny = dx/len * halfW;
    ctx.beginPath();
    ctx.moveTo(s0.x + nx, s0.y + ny);
    ctx.lineTo(s2.x + nx, s2.y + ny);
    ctx.lineTo(s2.x - nx, s2.y - ny);
    ctx.lineTo(s0.x - nx, s0.y - ny);
    ctx.closePath();
    ctx.fillStyle   = col.fill;
    ctx.fill();
    ctx.strokeStyle = col.stroke;
    ctx.lineWidth   = 2;
    ctx.stroke();
    // Label
    ctx.shadowBlur = 0;
    const mx = (s0.x + s2.x)/2, my = (s0.y + s2.y)/2;
    const lenGS = Math.hypot(z.x2 - z.ox, z.y2 - z.oy) / gs;
    const lenFt = Math.round(lenGS * 5);
    const lenM  = (lenGS * 1.5).toFixed(1);
    const lbl = `${lenFt}ft · ${lenM}m`;
    const tw2 = ctx.measureText(lbl).width + 12;
    ctx.font = 'bold 11px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,10,20,0.8)';
    ctx.beginPath(); ctx.roundRect(mx - tw2/2, my - 18, tw2, 16, 4); ctx.fill();
    ctx.fillStyle = col.stroke;
    ctx.fillText(lbl, mx, my - 6);
  }

  ctx.restore();
}

function drawSpellZones() {
  spellZones.forEach(z => _drawOneZone(z, 1));
  if (zoneDrawing) _drawOneZone(zoneDrawing, 0.7); // preview en cours
}

// ══════════════════════════════════════════════════════════════
// GESTION DES CARTES MULTIPLES
// ══════════════════════════════════════════════════════════════
let campaignMaps = [];

async function loadMaps() {
  if (myRole !== 'gm') return;
  try {
    campaignMaps = await API.maps.list(CAMPAIGN_ID);
    renderMapsList();
  } catch {}
}

function renderMapsList() {
  const list = document.getElementById('mapsList');
  if (!list) return;
  list.innerHTML = campaignMaps.map(m => `
    <div class="map-item ${m.is_active ? 'active-map' : ''}" onclick="switchMap('${m.id}')" title="${esc(m.name)}">
      <span class="map-dot"></span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(m.name)}</span>
      ${m.is_active ? '<span style="font-size:.65rem;color:var(--accent);">●</span>' : ''}
    </div>`).join('');
}

async function switchMap(mapId) {
  if (myRole !== 'gm' || !socket) return;
  socket.emit('map_change', { campaign_id: CAMPAIGN_ID, map_id: mapId });
  campaignMaps.forEach(m => m.is_active = m.id === mapId);
  renderMapsList();
  // Reset fog for new map
  fogState = { circles: [], allRevealed: false };
}

function openNewMapModal() {
  document.getElementById('newmap-name').value = '';
  document.getElementById('newmap-grid').value = '50';
  document.getElementById('modal-newmap').classList.add('open');
}

async function createNewMap() {
  const name = document.getElementById('newmap-name').value.trim();
  if (!name) return;
  try {
    const map = await API.maps.create(CAMPAIGN_ID, {
      name,
      grid_size: parseInt(document.getElementById('newmap-grid').value) || 50,
    });
    campaignMaps.push(map);
    renderMapsList();
    document.getElementById('modal-newmap').classList.remove('open');
    // Activer la nouvelle carte
    switchMap(map.id);
  } catch (err) { alert(err.message); }
}

// ══════════════════════════════════════════════════════════════
// IMPORT CARTES UVTT
// ══════════════════════════════════════════════════════════════

/**
 * Convertit une couleur UVTT (objet {r,g,b,a} en 0-1 ou string hex) en "#rrggbb".
 */
function uvttColorToHex(c) {
  if (!c) return '#ffffff';
  if (typeof c === 'string') return c.startsWith('#') ? c : '#ffffff';
  const r = Math.round((c.r ?? 1) * 255);
  const g = Math.round((c.g ?? 1) * 255);
  const b = Math.round((c.b ?? 1) * 255);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/** Lecture d'un fichier UVTT sélectionné via le file input */
function processUvttFile(event) {
  const file = event.target.files?.[0];
  event.target.value = '';   // reset pour permettre re-import du même fichier
  if (!file) return;
  if (!currentMap) { alert('Veuillez d\'abord sélectionner une carte.'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      applyUvttData(data, file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      alert('Fichier UVTT invalide : ' + err.message);
    }
  };
  reader.readAsText(file);
}

/**
 * Applique les données d'un fichier UVTT sur la carte courante.
 * - Importe l'image de fond (upload server)
 * - Importe les murs (line_of_sight + objects_line_of_sight)
 * - Importe les sources de lumière
 */
async function applyUvttData(data, sourceName) {
  if (!currentMap) return;
  const gridPx = currentMap.grid_size || 50;

  // ── 1. Dimensions carte ──────────────────────────────────
  const res = data.resolution || {};
  const mapW = res.map_size?.x ? Math.round(res.map_size.x * gridPx) : (currentMap.width  || 2000);
  const mapH = res.map_size?.y ? Math.round(res.map_size.y * gridPx) : (currentMap.height || 1500);

  // ── 2. Image de fond ─────────────────────────────────────
  let bgUrl = currentMap.background_url || null;
  if (data.image) {
    try {
      // data.image can be raw base64 or a data URL
      const dataUrl = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
      const blob = await (await fetch(dataUrl)).blob();
      const ext  = blob.type.includes('jpeg') ? 'jpg' : 'png';
      const uploadFile = new File([blob], `uvtt_bg_${Date.now()}.${ext}`, { type: blob.type });
      const uploadRes  = await API.upload(uploadFile);
      bgUrl = uploadRes.url;
    } catch (err) {
      console.warn('[UVTT] Image upload failed:', err);
    }
  }

  // ── 3. Mise à jour map via API ────────────────────────────
  try {
    const updated = await API.maps.update(CAMPAIGN_ID, currentMap.id, {
      ...(bgUrl ? { background_url: bgUrl } : {}),
      width: mapW,
      height: mapH,
    });
    Object.assign(currentMap, updated);
    delete bgCache[currentMap.background_url]; // invalide le cache image
  } catch (err) {
    console.warn('[UVTT] Map update failed:', err);
  }

  // ── 4. Murs (line_of_sight + objects_line_of_sight) ───────
  mapWalls = [];
  const allPaths = [
    ...(data.line_of_sight || []),
    ...(data.objects_line_of_sight || []),
  ];
  allPaths.forEach(path => {
    if (!Array.isArray(path) || path.length < 2) return;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      mapWalls.push({
        id: `uvtt_w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        x1: a.x * gridPx, y1: a.y * gridPx,
        x2: b.x * gridPx, y2: b.y * gridPx,
      });
    }
  });

  // ── 5. Lumières ───────────────────────────────────────────
  // Remove existing UVTT light objects then add fresh ones
  mapObjects = mapObjects.filter(o => o.type !== 'uvtt_light');
  (data.lights || []).forEach(l => {
    const px  = l.position?.x ?? 0;
    const py  = l.position?.y ?? 0;
    const rad = (l.range ?? 5) * gridPx;
    const col = uvttColorToHex(l.color);
    mapObjects.push({
      id: `uvtt_l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'uvtt_light',
      x: px * gridPx,
      y: py * gridPx,
      light_radius: Math.round(rad),
      light_color:  col,
    });
  });

  // ── 6. Persistance & rendu ────────────────────────────────
  saveWalls();
  saveObjects();
  syncLightsFromObjects();
  _invalidateVisionAll();
  drawMap();

  const wCnt = mapWalls.length;
  const lCnt = (data.lights || []).length;
  console.log(`[UVTT] Import «${sourceName}» : ${wCnt} segments de mur, ${lCnt} lumières.`);

  // Notification dans le chat
  const chatBox = document.getElementById('chatMessages');
  if (chatBox) {
    const div = document.createElement('div');
    div.className = 'chat-msg system';
    div.innerHTML = `<span class="chat-system">📥 Carte UVTT importée : <b>${wCnt}</b> murs, <b>${lCnt}</b> lumières.</span>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// ══════════════════════════════════════════════════════════════
// CONDITIONS DE STATUT
// ══════════════════════════════════════════════════════════════
const CONDITIONS = [
  // ── Combat / D&D 5e standard ────────────────────────────────
  { id: 'concentration', icon: '🎯', label: 'Concentration' },
  { id: 'aveugle',       icon: '🙈', label: 'Aveuglé' },
  { id: 'charme',        icon: '💕', label: 'Charmé' },
  { id: 'assourdi',      icon: '🔇', label: 'Assourdi' },
  { id: 'effrayé',       icon: '😨', label: 'Effrayé' },
  { id: 'entrave',       icon: '⛓️', label: 'Entravé' },
  { id: 'incapable',     icon: '🚫', label: 'Incapacité' },
  { id: 'invisible',     icon: '👻', label: 'Invisible' },
  { id: 'paralyse',      icon: '⚡', label: 'Paralysé' },
  { id: 'petrifie',      icon: '🪨', label: 'Pétrifié' },
  { id: 'empoisonne',    icon: '🤢', label: 'Empoisonné' },
  { id: 'prone',         icon: '⬇️', label: 'À terre' },
  { id: 'etourdi',       icon: '🌀', label: 'Étourdi' },
  { id: 'inconscient',   icon: '😵', label: 'Inconscient' },
  { id: 'epuise',        icon: '😮‍💨', label: 'Épuisé' },
  // ── Custom ─────────────────────────────────────────────────
  { id: 'mort',          icon: '☠️', label: 'Mort' },
  { id: 'inspire',       icon: '✨', label: 'Inspiré' },
  { id: 'protege',       icon: '🛡️', label: 'Protégé' },
  { id: 'feu',           icon: '🔥', label: 'En feu' },
  { id: 'gele',          icon: '❄️', label: 'Gelé' },
];

let conditionMenuToken = null;

function showConditionMenu(token, ex, ey) {
  conditionMenuToken = token;
  const menu = document.getElementById('conditionMenu');
  const grid = document.getElementById('condGrid');

  // Titre = nom du token
  document.getElementById('condMenuTitle').textContent = token.label || token.char_name || 'Token';

  // HP rapide — seulement si le token a des HP
  const hpRow = document.getElementById('condHpRow');
  const hpInp = document.getElementById('condHpInput');
  const hpMax = document.getElementById('condHpMax');
  const hasHp = token.hp_current !== null && token.hp_current !== undefined;
  hpRow.style.display = hasHp ? 'flex' : 'none';
  if (hasHp) {
    hpInp.value = token.hp_current ?? 0;
    // Trouver le hp_max depuis le personnage lié ou le token directement
    const char = (myRole === 'gm' ? (campaign?.characters || []) : myChars).find(c => c.id === token.character_id);
    hpMax.textContent = ` / ${char?.hp_max ?? token.hp_max ?? '?'}`;
  }

  // Conditions
  const conds = token.conditions || [];
  grid.innerHTML = CONDITIONS.map(c => `
    <button class="cond-btn ${conds.includes(c.id) ? 'active' : ''}" onclick="toggleCondition('${c.id}')">
      ${c.icon} ${c.label}
    </button>`).join('');

  // Attack button — visible when another token is selected as the attacker
  const attackBtn = document.getElementById('combatAttackBtn');
  const combatSep = document.getElementById('combatSep');
  const hasAttacker = selectedToken && selectedToken !== token.id;
  attackBtn.style.display = hasAttacker ? '' : 'none';
  combatSep.style.display  = hasAttacker ? '' : 'none';
  // Target button
  const targetBtn = document.getElementById('targetBtn');
  if (targetBtn) targetBtn.style.display = hasAttacker ? '' : 'none';

  // Section GM : conditions, reassign, supprimer
  const gmSection = document.getElementById('condGmSection');
  const condGrid  = document.getElementById('condGrid');
  if (myRole === 'gm') {
    gmSection.style.display = '';
    condGrid.style.display = '';
    // Peupler le select de réassignation avec les membres de la campagne
    const assignSel = document.getElementById('assignPlayerSelect');
    assignSel.innerHTML = '<option value="">— Aucun joueur —</option>';
    allCampaignMembers.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.user_id;
      opt.textContent = m.username + (m.role === 'gm' ? ' 🛡' : '');
      if (token.char_user_id && m.user_id === token.char_user_id) opt.selected = true;
      assignSel.appendChild(opt);
    });
    // Désactiver si token PNJ (pas de personnage)
    assignSel.disabled = !token.character_id;
  } else {
    gmSection.style.display = 'none';
    condGrid.style.display = 'none';  // joueur : HP uniquement, pas de conditions
  }

  menu.style.display = 'block';
  const x = Math.min(ex, window.innerWidth - 230);
  const y = Math.min(ey, window.innerHeight - 340);
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function quickHpDelta(delta) {
  if (!conditionMenuToken) return;
  const token = gameTokens.find(t => t.id === conditionMenuToken.id);
  if (!token || token.hp_current === null || token.hp_current === undefined) return;
  const newVal = Math.max(0, (token.hp_current ?? 0) + delta);
  quickHpSet(newVal);
}

function quickHpSet(val) {
  if (!conditionMenuToken) return;
  const token = gameTokens.find(t => t.id === conditionMenuToken.id);
  if (!token) return;
  const newVal = Math.max(0, parseInt(val) || 0);
  token.hp_current = newVal;
  document.getElementById('condHpInput').value = newVal;
  socket?.emit('token_hp', { campaign_id: CAMPAIGN_ID, token_id: token.id, hp_current: newVal });
  drawMap();
}

function hideConditionMenu() {
  document.getElementById('conditionMenu').style.display = 'none';
  conditionMenuToken = null;
}

function reassignTokenOwner(newUserId) {
  if (!conditionMenuToken || myRole !== 'gm') return;
  const token = gameTokens.find(t => t.id === conditionMenuToken.id);
  if (!token || !token.character_id) return;
  socket?.emit('token_reassign', {
    campaign_id: CAMPAIGN_ID,
    character_id: token.character_id,
    new_user_id: newUserId || null,
  });
}

function toggleCondition(condId) {
  if (!conditionMenuToken) return;
  const token = gameTokens.find(t => t.id === conditionMenuToken.id);
  if (!token) return;
  if (!token.conditions) token.conditions = [];
  const idx = token.conditions.indexOf(condId);
  if (idx >= 0) token.conditions.splice(idx, 1);
  else token.conditions.push(condId);
  // Refresh menu
  document.querySelectorAll('#condGrid .cond-btn').forEach((btn, i) => {
    btn.classList.toggle('active', token.conditions.includes(CONDITIONS[i].id));
  });
  socket?.emit('token_conditions', { campaign_id: CAMPAIGN_ID, token_id: token.id, conditions: token.conditions });
  drawMap();
}

function deleteSelectedToken() {
  if (!conditionMenuToken) return;
  hideConditionMenu();
  socket?.emit('token_delete', { campaign_id: CAMPAIGN_ID, token_id: conditionMenuToken.id });
}

// ══════════════════════════════════════════════════════════════
// AUTOMATION DE COMBAT D&D 5E
// ══════════════════════════════════════════════════════════════

let _combatAttacker = null;
let _combatTarget   = null;

/** Évalue une formule de dés type "2d6+3", "1d8-1", "d4", "5".
 *  @param {string}  formula  La formule
 *  @param {boolean} critical Si true, double le nombre de dés */
function evalDiceFormula(formula, critical = false) {
  if (!formula) return { rolls: [], total: 0, formula: '0' };
  const str = String(formula).trim().toLowerCase().replace(/\s/g, '');
  let total = 0;
  const rolls = [];
  const parts = str.match(/[+\-]?[^+\-]+/g) || [];
  for (let p of parts) {
    const m = p.match(/^([+\-]?)(\d*)d(\d+)$/);
    if (m) {
      const sign  = m[1] === '-' ? -1 : 1;
      const count = (critical ? 2 : 1) * (parseInt(m[2]) || 1);
      const faces = parseInt(m[3]) || 1;
      for (let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * faces) + 1;
        rolls.push(sign * r);
        total += sign * r;
      }
    } else {
      total += parseInt(p) || 0;
    }
  }
  return { rolls, total: Math.max(1, total), formula };
}

/** Résout l'AC d'un token : depuis le personnage lié ou depuis le token lui-même. */
function getTokenAC(token) {
  if (!token) return 10;
  if (token.character_id) {
    const chars = campaign?.characters || myChars || [];
    const char  = chars.find(c => c.id === token.character_id);
    if (char?.ac) return char.ac;
  }
  return token.ac ?? 10;
}

/** Retourne la liste d'attaques du personnage lié au token. */
function getTokenAttacks(token) {
  if (!token) return [];
  if (token.character_id) {
    const chars = campaign?.characters || myChars || [];
    const char  = chars.find(c => c.id === token.character_id);
    if (char?.attacks?.length) return char.attacks;
  }
  return [];
}

/** Ouvre le panneau d'attaque : attaquant = selectedToken, cible = conditionMenuToken */
function setTarget() {
  if (!conditionMenuToken || !selectedToken) return;
  const fromId = selectedToken;
  const toId = conditionMenuToken.id;
  const toName = conditionMenuToken.label || conditionMenuToken.char_name || 'Inconnu';
  hideConditionMenu();
  if (socket) {
    socket.emit('set_target', { campaign_id: CAMPAIGN_ID, from_token_id: fromId, to_token_id: toId, to_token_name: toName });
  }
}

function openCombatAttack() {
  hideConditionMenu();
  if (!conditionMenuToken) return;
  _combatTarget   = conditionMenuToken;
  _combatAttacker = selectedToken ? gameTokens.find(t => t.id === selectedToken) : null;

  document.getElementById('combatAttackerLabel').textContent = _combatAttacker?.label || _combatAttacker?.char_name || '— aucun —';
  document.getElementById('combatTargetLabel').textContent   = _combatTarget.label || _combatTarget.char_name || 'Cible';
  document.getElementById('combatTargetAC').value = getTokenAC(_combatTarget);

  // Remplir le sélecteur d'attaques depuis la fiche du personnage attaquant
  const sel = document.getElementById('combatAtkSelect');
  sel.innerHTML = '<option value="_manual">— Attaque manuelle —</option>';
  const attacks = getTokenAttacks(_combatAttacker);
  attacks.forEach((atk, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    const bonus = atk.atk_bonus >= 0 ? `+${atk.atk_bonus}` : `${atk.atk_bonus}`;
    opt.textContent = `${atk.name} (${bonus}) ${atk.dmg_formula}`;
    sel.appendChild(opt);
  });
  sel.value = attacks.length ? '0' : '_manual';
  onCombatAtkSelect();

  document.getElementById('combatResult').style.display = 'none';
  document.getElementById('combatOverlay').classList.add('open');
}

function closeCombatAttack() {
  document.getElementById('combatOverlay').classList.remove('open');
  _combatAttacker = null;
  _combatTarget   = null;
}

/** Met à jour les champs manuels quand l'utilisateur choisit une attaque prédéfinie */
function onCombatAtkSelect() {
  const sel  = document.getElementById('combatAtkSelect');
  const atks = getTokenAttacks(_combatAttacker);
  if (sel.value === '_manual' || !atks.length) return;
  const atk = atks[parseInt(sel.value)];
  if (!atk) return;
  document.getElementById('combatAtkName').value    = atk.name;
  document.getElementById('combatAtkBonus').value   = atk.atk_bonus ?? 0;
  document.getElementById('combatDmgFormula').value = atk.dmg_formula || '1d6';
  document.getElementById('combatDmgType').value    = atk.dmg_type   || '';
}

/** Exécute le jet d'attaque et applique les dégâts */
function rollCombatAttack() {
  const targetAC   = parseInt(document.getElementById('combatTargetAC').value)   || 10;
  const atkBonus   = parseInt(document.getElementById('combatAtkBonus').value)   || 0;
  const dmgFormula = document.getElementById('combatDmgFormula').value.trim()   || '1d6';
  const dmgType    = document.getElementById('combatDmgType').value.trim();
  const atkName    = document.getElementById('combatAtkName').value.trim()       || 'Attaque';

  const d20     = Math.floor(Math.random() * 20) + 1;
  const isCrit  = d20 === 20;
  const isFumbl = d20 === 1;
  const total   = d20 + atkBonus;
  const hit     = !isFumbl && (isCrit || total >= targetAC);

  const attackerName = _combatAttacker?.label || _combatAttacker?.char_name || '?';
  const targetName   = _combatTarget?.label   || _combatTarget?.char_name  || '?';
  const bonusStr     = atkBonus >= 0 ? `+${atkBonus}` : `${atkBonus}`;

  let html = `<b>${atkName}</b> · d20 <b>${d20}</b> ${bonusStr} = <b>${total}</b> vs CA ${targetAC}<br>`;
  let chatTxt = '';

  if (isFumbl) {
    html    += `<span class="result-fumble">💨 Échec critique !</span>`;
    chatTxt  = `💨 **${attackerName}** → **${targetName}** : ${atkName} — Échec critique ! (d20=1)`;
  } else if (hit) {
    const dmg     = evalDiceFormula(dmgFormula, isCrit);
    const dmgTotal = dmg.total;
    if (isCrit) {
      html += `<span class="result-crit">💥 Coup critique !</span> `;
    } else {
      html += `<span class="result-hit">✅ Touché !</span> `;
    }
    const rollsStr = dmg.rolls.length ? dmg.rolls.map(Math.abs).join('+') + ' = ' : '';
    html += `Dégâts: ${rollsStr}<b>${dmgTotal}</b>`;
    if (dmgType) html += ` <span style="color:var(--text2);">(${dmgType})</span>`;

    // Appliquer les dégâts sur la cible
    const tgt = gameTokens.find(t => t.id === _combatTarget?.id);
    if (tgt && tgt.hp_current != null) {
      const oldHp = tgt.hp_current;
      const newHp = Math.max(0, oldHp - dmgTotal);
      tgt.hp_current = newHp;
      document.getElementById('combatTargetAC').parentElement.previousElementSibling.textContent = tgt.label || tgt.char_name || 'Cible';
      socket?.emit('token_hp', {
        campaign_id: CAMPAIGN_ID,
        token_id: tgt.id,
        hp_current: newHp,
        hp_max: tgt.hp_max,
      });
      html += `<br><span style="color:var(--text2);font-size:.78rem;">PV ${targetName}: ${oldHp} → <b>${newHp}</b></span>`;
      if (newHp === 0) html += ' ☠️';
      drawMap();
    }

    chatTxt = `⚔️ **${attackerName}** → **${targetName}** : ${isCrit ? '💥 Critique ! ' : ''}${atkName} touche (${total} ≥ CA ${targetAC}) — **${dmgTotal} dégâts**${dmgType ? ' ' + dmgType : ''}`;
  } else {
    html   += `<span class="result-miss">❌ Raté (${total} < CA ${targetAC})</span>`;
    chatTxt = `❌ **${attackerName}** → **${targetName}** : ${atkName} raté (${total} < CA ${targetAC})`;
  }

  document.getElementById('combatResult').style.display = '';
  document.getElementById('combatResult').innerHTML = html;

  // Diffuser dans le chat de campagne
  socket?.emit('combat_announce', {
    campaign_id: CAMPAIGN_ID,
    text: chatTxt,
  });
}

function drawTokenConditions(t, sx, sy, r) {
  const conds = t.conditions || [];
  if (!conds.length) return;
  const icons = conds.map(id => CONDITIONS.find(c => c.id === id)?.icon).filter(Boolean);
  if (!icons.length) return;
  ctx.save();
  ctx.font = `${Math.max(10, r * 0.55)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  icons.forEach((icon, i) => {
    const angle = (i / Math.max(icons.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const ex = sx + Math.cos(angle) * (r + 8);
    const ey = sy + Math.sin(angle) * (r + 8);
    ctx.fillText(icon, ex, ey);
  });
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
// MUSIQUE D'AMBIANCE
// ══════════════════════════════════════════════════════════════
