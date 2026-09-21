/**
 * Sodales — vision et brouillard (partie extraite de game.html)
 * Géométrie des rayons, découpe de vision par pion, brouillard de guerre.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ══════════════════════════════════════════════════════════════
// RAYCASTING — POLYGONE DE VISIBILITÉ 2D
// ══════════════════════════════════════════════════════════════

/**
 * Intersection rayon / segment
 * Retourne t (distance le long du rayon) ou Infinity si pas d'intersection
 */
function raySegmentIntersect(ox, oy, dx, dy, x1, y1, x2, y2) {
  const ex = x2 - x1, ey = y2 - y1;
  const det = dx * ey - dy * ex;
  if (Math.abs(det) < 1e-10) return Infinity;
  const t = ((x1 - ox) * ey - (y1 - oy) * ex) / det;
  const s = ((x1 - ox) * dy - (y1 - oy) * dx) / det;
  if (t <= 1e-8 || s < -1e-8 || s > 1 + 1e-8) return Infinity;
  return t;
}

function normalizeAngle(a) {
  while (a < -Math.PI) a += Math.PI * 2;
  while (a >  Math.PI) a -= Math.PI * 2;
  return a;
}

/**
 * Calcule le polygone de visibilité depuis (ox, oy)
 * maxR       : rayon max en unités monde (0 = illimité → 4000)
 * walls      : segments [{x1,y1,x2,y2}]
 * facingRad  : direction d'orientation du token (radians, 0 = est)
 * coneAngle  : angle du champ de vision (degrés, 360 = omnidirectionnel)
 *
 * Pour un cône, le polygone commence par l'origine (pour former le secteur fermé).
 */
function computeVisibilityPolygon(ox, oy, maxR, walls, facingRad, coneAngle) {
  const r = (maxR && maxR > 0) ? maxR : 4000;
  const coneAngleDeg = (coneAngle == null || coneAngle >= 360) ? 360 : coneAngle;
  const fullCircle   = coneAngleDeg >= 360;
  const halfCone     = fullCircle ? Math.PI : (coneAngleDeg * Math.PI / 180 / 2);
  const facing       = facingRad || 0;

  // Bounding box carrée pour limiter les rayons
  const bbox = [
    { x1: ox-r, y1: oy-r, x2: ox+r, y2: oy-r },
    { x1: ox+r, y1: oy-r, x2: ox+r, y2: oy+r },
    { x1: ox+r, y1: oy+r, x2: ox-r, y2: oy+r },
    { x1: ox-r, y1: oy+r, x2: ox-r, y2: oy-r },
  ];
  const allWalls = [...walls, ...bbox];

  // ── Construction de la liste d'angles à tester ────────────
  const angles = [];

  if (fullCircle) {
    // 360° : tous les endpoints + coins bbox + intervalles réguliers
    walls.forEach(w => {
      [{ x:w.x1,y:w.y1 }, { x:w.x2,y:w.y2 }].forEach(ep => {
        const a = Math.atan2(ep.y-oy, ep.x-ox);
        angles.push(a-0.0001, a, a+0.0001);
      });
    });
    [{ x:ox-r,y:oy-r },{ x:ox+r,y:oy-r },{ x:ox+r,y:oy+r },{ x:ox-r,y:oy+r }].forEach(c =>
      angles.push(Math.atan2(c.y-oy, c.x-ox))
    );
    for (let a = -Math.PI; a < Math.PI; a += Math.PI/24) angles.push(a);

  } else {
    // Cône : angles limités à [facing-halfCone … facing+halfCone]
    // Ajouter les bords exacts du cône
    angles.push(facing-halfCone-0.0001, facing-halfCone, facing-halfCone+0.0001);
    angles.push(facing+halfCone-0.0001, facing+halfCone, facing+halfCone+0.0001);

    // Endpoints de murs dans le cône
    walls.forEach(w => {
      [{ x:w.x1,y:w.y1 }, { x:w.x2,y:w.y2 }].forEach(ep => {
        const a   = Math.atan2(ep.y-oy, ep.x-ox);
        const off = normalizeAngle(a - facing);
        if (Math.abs(off) <= halfCone+0.01) {
          angles.push(a-0.0001, a, a+0.0001);
        }
      });
    });
    // Intervalles réguliers dans le cône
    const step = Math.min(Math.PI/48, halfCone/8);
    for (let a = facing-halfCone; a <= facing+halfCone; a += step) angles.push(a);
  }

  // ── Lancer les rayons ─────────────────────────────────────
  const points = [];
  const tested = new Set();

  angles.forEach(rawAngle => {
    // Pour le cône, clamp l'angle dans la plage valide
    const angle = fullCircle ? rawAngle
      : Math.max(facing-halfCone, Math.min(facing+halfCone, rawAngle));

    const key = angle.toFixed(6);
    if (tested.has(key)) return;
    tested.add(key);

    const dx = Math.cos(angle), dy = Math.sin(angle);
    let minT = r;
    allWalls.forEach(w => {
      const t2 = raySegmentIntersect(ox, oy, dx, dy, w.x1, w.y1, w.x2, w.y2);
      if (t2 < minT) minT = t2;
    });

    points.push({ angle, x: ox + minT*dx, y: oy + minT*dy });
  });

  // Trier par angle dans le sens trigonométrique
  if (fullCircle) {
    points.sort((a, b) => a.angle - b.angle);
    return points;
  } else {
    // Trier relativement au centre du cône
    points.sort((a, b) => normalizeAngle(a.angle-facing) - normalizeAngle(b.angle-facing));
    // Ajouter l'origine au début et à la fin → secteur fermé
    return [{ x:ox, y:oy }, ...points, { x:ox, y:oy }];
  }
}

/**
 * Teste si un point est dans un polygone (ray casting)
 */
function isPointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Dessine un polygone de visibilité dans le fogCtx (découpe l'obscurité)
 */
function fogCutPolygon(poly) {
  if (!poly || poly.length < 3) return;
  fogCtx.globalCompositeOperation = 'destination-out';
  fogCtx.beginPath();
  let sp = worldToScreen(poly[0].x, poly[0].y);
  fogCtx.moveTo(sp.x, sp.y);
  for (let i = 1; i < poly.length; i++) {
    sp = worldToScreen(poly[i].x, poly[i].y);
    fogCtx.lineTo(sp.x, sp.y);
  }
  fogCtx.closePath();
  fogCtx.fillStyle = 'rgba(0,0,0,1)';
  fogCtx.fill();
}

// ══════════════════════════════════════════════════════════════
// BROUILLARD DE GUERRE
// ══════════════════════════════════════════════════════════════
let fogState = { circles: [], allRevealed: false };
let fogEnabled = false;   // brouillard inactif jusqu'à ce que le MJ l'active
let visionMode = 'all';  // 'all' | 'character' | 'none'
let fogCanvas = null, fogCtx = null;
let fogPainting = false;
let fogBrushRadius = 2; // in grid squares

function initFogCanvas() {
  fogCanvas = document.createElement('canvas');
  fogCanvas.width = canvas.width; fogCanvas.height = canvas.height;
  fogCtx = fogCanvas.getContext('2d');
}

function renderFog() {
  if (!currentMap) return;
  if (!fogEnabled) return;              // brouillard non activé par le MJ
  if (fogState.allRevealed) return;
  if (myRole === 'gm' && currentTool !== 'fog') return; // GM voit tout sauf en mode fog

  if (!fogCanvas || fogCanvas.width !== canvas.width || fogCanvas.height !== canvas.height) initFogCanvas();

  fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
  fogCtx.globalCompositeOperation = 'source-over';
  fogCtx.fillStyle = myRole === 'gm' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.88)';
  fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

  if (fogState.circles.length > 0) {
    fogCtx.globalCompositeOperation = 'destination-out';
    fogState.circles.forEach(({ x, y, r }) => {
      const s = worldToScreen(x, y);
      const rad = r * cam.zoom;
      const grad = fogCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.75, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      fogCtx.fillStyle = grad;
      fogCtx.beginPath();
      fogCtx.arc(s.x, s.y, rad, 0, Math.PI * 2);
      fogCtx.fill();
    });
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(fogCanvas, 0, 0);
  fogCtx.globalCompositeOperation = 'source-over';
}

// Show fog brush preview when hovering in fog mode (GM)
let fogMouseWorld = null;
function drawFogBrushPreview() {
  if (currentTool !== 'fog' || myRole !== 'gm' || !fogMouseWorld) return;
  const gs = currentMap?.grid_size || GRID;
  const s = worldToScreen(fogMouseWorld.x, fogMouseWorld.y);
  const r = fogBrushRadius * gs * cam.zoom;
  ctx.save();
  ctx.beginPath();
  ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,200,50,.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5,3]);
  ctx.stroke();
  ctx.restore();
}

function fogClearAll() {
  fogEnabled = true;
  fogState = { circles: [], allRevealed: true };
  drawMap();
  socket?.emit('fog_clear', { campaign_id: CAMPAIGN_ID, map_id: currentMap?.id });
}

function fogReset() {
  fogEnabled = true;
  fogState = { circles: [], allRevealed: false };
  drawMap();
  socket?.emit('fog_reset', { campaign_id: CAMPAIGN_ID, map_id: currentMap?.id });
}

// ══════════════════════════════════════════════════════════════
// VISION DE PERSONNAGE (avec raycasting si murs définis)
// ══════════════════════════════════════════════════════════════
function renderVisionOverlay() {
  if (!currentMap) return;

  if (visionMode === 'all') return;  // tout visible

  if (visionMode === 'none') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // ── Helpers dessin ───────────────────────────────────────────
  // Trace un polygone (tableau de {x,y} monde) sur ctx principal
  function drawPolyOnCtx(poly) {
    if (!poly || poly.length < 2) return;
    ctx.beginPath();
    const sp = worldToScreen(poly[0].x, poly[0].y);
    ctx.moveTo(sp.x, sp.y);
    for (let i = 1; i < poly.length; i++) {
      const s2 = worldToScreen(poly[i].x, poly[i].y);
      ctx.lineTo(s2.x, s2.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Dessine un cercle ou un cône sur ctx principal (coordonnées écran)
  function drawConeOrCircle(wx, wy, pixR, facingRad, coneAngleDeg) {
    const s = worldToScreen(wx, wy);
    const full = !coneAngleDeg || coneAngleDeg >= 360;
    ctx.beginPath();
    if (full) {
      ctx.arc(s.x, s.y, pixR, 0, Math.PI * 2);
    } else {
      const half = coneAngleDeg * Math.PI / 180 / 2;
      ctx.moveTo(s.x, s.y);
      ctx.arc(s.x, s.y, pixR, facingRad - half, facingRad + half);
      ctx.closePath();
    }
    ctx.stroke();
  }

  // ── Mode 'character' ─────────────────────────────────────────
  if (myRole === 'gm') {
    // GM voit tout, trace juste le contour de vision de chaque token
    const gs = currentMap.grid_size || GRID;
    gameTokens.forEach(t => {
      if (!t.char_vision_radius || t.char_vision_radius <= 0) return;
      const worldR    = t.char_vision_radius * gs;
      const facing    = t.facing ?? 0;
      const coneAngle = t.char_vision_angle || 360;
      ctx.save();
      ctx.strokeStyle = 'rgba(100,200,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      if (mapWalls.length > 0) {
        const poly = _getVisionPoly(t, worldR, facing, coneAngle);
        drawPolyOnCtx(poly);
      } else {
        drawConeOrCircle(t.x, t.y, worldR * cam.zoom, facing, coneAngle);
      }
      ctx.restore();
    });
    // Contour des lumières
    mapLights.forEach(l => {
      if (!mapWalls.length) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,200,80,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      const poly = _getVisionPoly({ id: `light_${l.x}_${l.y}`, x: l.x, y: l.y, facing: 0 }, l.radius, 0, 360);
      drawPolyOnCtx(poly);
      ctx.restore();
    });
    return;
  }

  // ── Joueur : brouillard avec découpe vision + angle ──────────
  const gs = currentMap.grid_size || GRID;
  const playerTokens = gameTokens.filter(t => t.char_user_id);
  if (!playerTokens.length) return;

  const hasUnlimited = playerTokens.some(t => !t.char_vision_radius || t.char_vision_radius <= 0);
  const hasWalls = mapWalls.length > 0;

  if (!fogCanvas || fogCanvas.width !== canvas.width || fogCanvas.height !== canvas.height) initFogCanvas();
  fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
  fogCtx.globalCompositeOperation = 'source-over';
  fogCtx.fillStyle = 'rgba(0,0,0,0.93)';
  fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

  if (hasUnlimited && !hasWalls) {
    // Vision illimitée sans murs → tout visible
    fogCtx.globalCompositeOperation = 'destination-out';
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
  } else {
    playerTokens.forEach(t => {
      const worldR    = (t.char_vision_radius && t.char_vision_radius > 0) ? t.char_vision_radius * gs : (hasWalls ? 4000 : 0);
      const facing    = t.facing ?? 0;
      const coneAngle = t.char_vision_angle || 360;

      if (hasWalls) {
        const poly = _getVisionPoly(t, worldR, facing, coneAngle);
        fogCutPolygon(poly);
        mapLights.forEach(l => {
          if (isPointInPolygon(l.x, l.y, poly)) {
            const lPoly = _getVisionPoly({ id: `light_${l.x}_${l.y}`, x: l.x, y: l.y, facing: 0 }, l.radius, 0, 360);
            fogCutPolygon(lPoly);
          }
        });
      } else {
        // Pas de murs : cône ou cercle dessiné directement
        if (!worldR) {
          fogCtx.globalCompositeOperation = 'destination-out';
          fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
        } else {
          const s      = worldToScreen(t.x, t.y);
          const pixR   = worldR * cam.zoom;
          const full   = coneAngle >= 360;
          const half   = coneAngle * Math.PI / 180 / 2;
          fogCtx.globalCompositeOperation = 'destination-out';
          fogCtx.fillStyle = 'rgba(0,0,0,1)';
          fogCtx.beginPath();
          if (full) {
            // Cercle avec dégradé sur le bord
            const grad = fogCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, pixR);
            grad.addColorStop(0,   'rgba(0,0,0,1)');
            grad.addColorStop(0.8, 'rgba(0,0,0,1)');
            grad.addColorStop(1,   'rgba(0,0,0,0)');
            fogCtx.fillStyle = grad;
            fogCtx.arc(s.x, s.y, pixR, 0, Math.PI * 2);
          } else {
            // Cône en forme de secteur
            fogCtx.moveTo(s.x, s.y);
            fogCtx.arc(s.x, s.y, pixR, facing - half, facing + half);
            fogCtx.closePath();
          }
          fogCtx.fill();

          // Lumières à portée
          mapLights.forEach(l => {
            if (Math.hypot(l.x-t.x, l.y-t.y) < (worldR + l.radius)) {
              const ls = worldToScreen(l.x, l.y);
              const lR = l.radius * cam.zoom;
              fogCtx.fillStyle = 'rgba(0,0,0,1)';
              fogCtx.beginPath();
              fogCtx.arc(ls.x, ls.y, lR, 0, Math.PI * 2);
              fogCtx.fill();
            }
          });
        }
      }
    });
  }

  fogCtx.globalCompositeOperation = 'source-over';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(fogCanvas, 0, 0);
  drawLights(true);
}
