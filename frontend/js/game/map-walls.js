/**
 * Sodales — murs de la carte (partie extraite de game.html)
 * Dessin et édition des murs (ligne de vue) et murs d'objets.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function drawWalls() {
  if (!mapWalls.length) return;
  ctx.save();
  ctx.strokeStyle = myRole === 'gm' ? 'rgba(239,80,80,0.85)' : 'rgba(50,30,20,0.0)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  mapWalls.forEach(w => {
    const a = worldToScreen(w.x1, w.y1);
    const b = worldToScreen(w.x2, w.y2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // Poignées
    if (myRole === 'gm' && currentTool === 'walls') {
      ctx.fillStyle = 'rgba(239,80,80,0.9)';
      [a, b].forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
      });
    }
  });
  ctx.restore();
}

function drawWallPreview() {
  if (!wallDrawStart || !wallPreviewEnd) return;
  const a = worldToScreen(wallDrawStart.x, wallDrawStart.y);
  const b = worldToScreen(wallPreviewEnd.x, wallPreviewEnd.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(239,80,80,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
// OBJETS (décor, lumières, etc.)
// ══════════════════════════════════════════════════════════════

/**
 * Trouver un objet à la position monde (wx, wy)
 * Retourne l'objet ou null
 */
function findObjectAt(wx, wy) {
  const gs = currentMap?.grid_size || GRID;
  const hitR = gs * 0.6; // zone de clic = 60 % de la case
  return mapObjects.find(o => Math.hypot(o.x - wx, o.y - wy) < hitR) || null;
}

/**
 * Reconstruit mapLights à partir des objets qui émettent de la lumière.
 * Appelé chaque fois que mapObjects change.
 */
function syncLightsFromObjects() {
  mapLights = mapObjects
    .filter(o => {
      const def = MAP_OBJECT_TYPES.find(t => t.id === o.type);
      return def?.light;
    })
    .map(o => {
      const def = MAP_OBJECT_TYPES.find(t => t.id === o.type);
      // Supports per-object overrides (used by UVTT import)
      return {
        id: o.id, x: o.x, y: o.y,
        radius: o.light_radius ?? def.light.radius,
        color:  o.light_color  ?? def.light.color,
      };
    });
}

/**
 * Persiste mapObjects via WebSocket
 */
function saveObjects() {
  if (!currentMap) return;
  socket?.emit('objects_save', { campaign_id: CAMPAIGN_ID, map_id: currentMap.id, objects: mapObjects });
}

/**
 * Dessine les objets sur le canvas
 */
function drawObjects() {
  if (!mapObjects.length) return;
  const gs = currentMap?.grid_size || GRID;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  mapObjects.forEach(o => {
    const def = MAP_OBJECT_TYPES.find(t => t.id === o.type);
    if (!def) return;
    const s = worldToScreen(o.x, o.y);

    // Frustum culling
    const margin = gs * cam.zoom + 20;
    if (s.x + margin < 0 || s.x - margin > canvas.width ||
        s.y + margin < 0 || s.y - margin > canvas.height) return;

    // Halo lumineux si l'objet émet de la lumière
    if (def.light) {
      const pixR = def.light.radius * cam.zoom;
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, pixR);
      // Couleur personnalisée par type de lumière
      const hex = def.light.color;
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      grad.addColorStop(0,   `rgba(${r},${g},${b},0.30)`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},0.16)`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, pixR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Emoji de l'objet
    const fontSize = Math.max(14, Math.round(gs * 0.65 * cam.zoom));
    ctx.font = `${fontSize}px serif`;
    ctx.globalAlpha = 0.92;
    ctx.fillText(def.emoji, s.x, s.y);

    // Contour de sélection (mode objets ou select, MJ)
    if (myRole === 'gm' && (currentTool === 'objects' || currentTool === 'select') && selectedObjectId === o.id) {
      const r2 = gs * 0.55 * cam.zoom;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

/**
 * Remplit le picker d'objets dans la barre d'outils.
 * À appeler une seule fois au démarrage (après le DOM).
 */
function initObjPicker() {
  const grid = document.getElementById('objPickerGrid');
  if (!grid) return;
  grid.innerHTML = '';
  MAP_OBJECT_TYPES.forEach(def => {
    const btn = document.createElement('button');
    btn.title = def.label;
    btn.style.cssText = `
      background:var(--surface2);border:1px solid var(--border);border-radius:8px;
      padding:.3rem .45rem;cursor:pointer;font-size:1.1rem;line-height:1;
      display:flex;flex-direction:column;align-items:center;gap:.1rem;
      transition:.15s;min-width:44px;
    `;
    btn.innerHTML = `${def.emoji}<span style="font-size:.55rem;color:var(--text2);font-family:Inter,sans-serif">${def.label}</span>`;
    btn.addEventListener('click', () => {
      selectedObjectType = def.id;
      grid.querySelectorAll('button').forEach(b => {
        b.style.borderColor = 'var(--border)';
        b.style.background  = 'var(--surface2)';
      });
      btn.style.borderColor = '#fb923c';
      btn.style.background  = 'rgba(251,146,60,.18)';
    });
    grid.appendChild(btn);
  });
  // Sélectionner la torche par défaut
  if (grid.firstChild) grid.firstChild.click();
}
