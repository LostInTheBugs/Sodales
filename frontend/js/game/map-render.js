/**
 * Sodales — rendu de la carte (partie extraite de game.html)
 * Grille et dessin des tokens (avec et sans image).
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
let gridType = 'square'; // 'square' | 'hex'

function toggleHexGrid() {
  gridType = gridType === 'hex' ? 'square' : 'hex';
  const btn = document.getElementById('toggleHexBtn');
  if (btn) {
    btn.style.opacity = gridType === 'hex' ? '1' : '.5';
    btn.style.borderColor = gridType === 'hex' ? 'var(--accent)' : '';
    btn.style.color       = gridType === 'hex' ? 'var(--accent)' : '';
  }
  drawMap();
}

function drawGrid() {
  if (gridType === 'hex') { drawHexGrid(); return; }
  const gs = (currentMap.grid_size || GRID) * cam.zoom;
  const offX = (-cam.x * cam.zoom + canvas.width / 2) % gs;
  const offY = (-cam.y * cam.zoom + canvas.height / 2) % gs;

  ctx.strokeStyle = 'rgba(201,162,39,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = offX; x < canvas.width; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
  for (let y = offY; y < canvas.height; y += gs) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
  ctx.stroke();
}

function drawHexGrid() {
  // Pointy-top hexagons
  const gs       = (currentMap?.grid_size || GRID);
  const hexSize  = gs * cam.zoom / 2;   // circumradius
  const W        = Math.sqrt(3) * hexSize; // horizontal spacing
  const H        = 2 * hexSize;           // full height
  const rowH     = H * 0.75;             // vertical spacing = 3/4 H

  // Camera offset in screen space
  const camSX = -cam.x * cam.zoom + canvas.width  / 2;
  const camSY = -cam.y * cam.zoom + canvas.height / 2;

  const margin   = hexSize * 3;
  const startRow = Math.floor((-margin - camSY) / rowH)   - 1;
  const endRow   = Math.ceil((canvas.height + margin - camSY) / rowH) + 1;
  const startCol = Math.floor((-margin - camSX) / W) - 2;
  const endCol   = Math.ceil((canvas.width + margin - camSX) / W)  + 2;

  ctx.strokeStyle = 'rgba(201,162,39,0.13)';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cx = camSX + col * W + (row % 2 !== 0 ? W / 2 : 0);
      const cy = camSY + row * rowH;
      // 6 vertices for pointy-top hex (offset angle = 30°)
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 6 + i * Math.PI / 3;
        const vx = cx + hexSize * Math.cos(angle);
        const vy = cy + hexSize * Math.sin(angle);
        if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    }
  }
  ctx.stroke();
}

// Snap world coords to nearest hex center (pointy-top axial system)
function snapToHex(wx, wy) {
  const gs = currentMap?.grid_size || GRID;
  const s  = gs / 2; // hex circumradius
  // World → fractional axial
  const fq = (Math.sqrt(3) / 3 * wx - 1 / 3 * wy) / s;
  const fr = (2 / 3 * wy) / s;
  // Cube rounding
  let q = fq, r = fr, sc = -fq - fr;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(sc);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - sc);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds)        rr = -rq - rs;
  // Axial → world
  return {
    x: s * Math.sqrt(3) * (rq + rr / 2),
    y: s * 3 / 2 * rr
  };
}

// Cache des images de fond déjà chargées
const bgCache = {};
function drawBackground() {
  const url = currentMap?.background_url;
  if (!url) return;
  if (!bgCache[url]) {
    const img = new Image();
    img.src = url;
    img.onload = () => { bgCache[url] = img; drawMap(); };
    return;
  }
  const img = bgCache[url];
  const gs = (currentMap.grid_size || GRID) * cam.zoom;
  const cols = currentMap.width  || 2000;
  const rows = currentMap.height || 1500;
  const sw = cols * cam.zoom;
  const sh = rows * cam.zoom;
  const sx = -cam.x * cam.zoom + canvas.width  / 2 - sw / 2;
  const sy = -cam.y * cam.zoom + canvas.height / 2 - sh / 2;
  ctx.drawImage(img, sx, sy, sw, sh);
}

function drawToken(t) {
  const gs = (currentMap?.grid_size || GRID) * cam.zoom;
  const s = worldToScreen(t.x, t.y);
  const r = gs * (t.size || 1) / 2;

  // Frustum culling : skip si le token est hors du viewport (avec marge)
  const margin = r * 2 + 20;
  if (s.x + margin < 0 || s.x - margin > canvas.width ||
      s.y + margin < 0 || s.y - margin > canvas.height) return;

  const imgUrl = t.char_portrait || t.image_url || null;
  const img    = imgUrl ? getTokenImage(imgUrl) : null;
  const hasImg = img && img !== 'error';

  // Épaisseurs de l'anneau selon le zoom et la taille du token
  const ringW   = Math.max(3, r * 0.13);   // anneau externe sombre
  const innerW  = Math.max(1.5, r * 0.05); // filet intérieur coloré
  const imgR    = r - ringW - innerW;       // rayon de l'image (en dessous des anneaux)

  ctx.save();

  if (hasImg) {
    // ── Token avec image : style VTT classique ─────────────
    // 1. Ombre portée (profondeur)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = r * 0.3;
    ctx.shadowOffsetY = r * 0.08;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();

    // 2. Image clippée dans le cercle intérieur — recadrage "tête"
    //    On prend un carré depuis le haut-centre du portrait (là où se trouve le visage)
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, imgR, 0, Math.PI * 2);
    ctx.clip();
    const iw   = img.naturalWidth  || img.width  || 1;
    const ih   = img.naturalHeight || img.height || 1;
    // Carré = min(largeur, 60% de la hauteur) pour cadrer la tête
    const side = Math.min(iw, ih * 0.65);
    const sx   = (iw - side) / 2;           // centré horizontalement
    const sy   = ih * 0.02;                 // très légèrement en dessous du bord haut
    ctx.drawImage(img, sx, sy, side, side, s.x - imgR, s.y - imgR, imgR * 2, imgR * 2);
    ctx.restore();

    // 3. Filet intérieur coloré (couleur du token)
    ctx.beginPath();
    ctx.arc(s.x, s.y, imgR + innerW / 2, 0, Math.PI * 2);
    ctx.strokeStyle = t.color || '#c9a227';
    ctx.lineWidth = innerW;
    ctx.stroke();

    // 4. Anneau sombre externe (look token physique)
    ctx.beginPath();
    ctx.arc(s.x, s.y, r - ringW / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = ringW;
    ctx.stroke();

    // 5. Reflet léger sur le dessus (brillance)
    const grad = ctx.createRadialGradient(s.x, s.y - r * 0.3, 0, s.x, s.y, r);
    grad.addColorStop(0,   'rgba(255,255,255,0.12)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0)');
    grad.addColorStop(1,   'rgba(0,0,0,0.15)');
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

  } else {
    // ── Token sans image : cercle coloré + initiales ──────
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur  = r * 0.25;
    ctx.shadowOffsetY = r * 0.06;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fillStyle = t.color || '#c9a227';
    ctx.fill();
    ctx.restore();

    // Gradient sur le cercle
    const cg = ctx.createRadialGradient(s.x, s.y - r * 0.2, 0, s.x, s.y, r);
    cg.addColorStop(0, 'rgba(255,255,255,0.18)');
    cg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.fill();

    // Initiales
    const label = t.char_name || t.label || '?';
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(10, r * 0.5)}px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur  = 3;
    ctx.fillText(label.substring(0, 3).toUpperCase(), s.x, s.y);
    ctx.shadowBlur = 0;

    // Anneau sombre externe
    ctx.beginPath();
    ctx.arc(s.x, s.y, r - ringW / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = ringW * 0.7;
    ctx.stroke();
  }

  // HP bar si token a des HP
  if (t.hp_current != null) {
    const hp_pct = Math.max(0, Math.min(1, t.hp_current / (t.hp_max || t.hp_current || 1)));
    ctx.fillStyle = hp_pct > 0.5 ? '#22c55e' : hp_pct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(s.x - r, s.y + r + 3, r * 2 * hp_pct, 4);
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - r, s.y + r + 3, r * 2, 4);
  }

  // Flèche de direction — visible uniquement quand le token est sélectionné
  const showArrow = visionMode === 'character' && t.char_vision_angle && t.char_vision_angle < 360
    && selectedToken === t.id
    && (myRole === 'gm' || t.char_user_id === getUser()?.id);
  if (showArrow) {
    const facing2   = t.facing ?? 0;
    const arrowLen  = r * 1.6;
    const isRotMode = rotatingToken && selectedToken === t.id;
    const tipX = s.x + Math.cos(facing2) * arrowLen;
    const tipY = s.y + Math.sin(facing2) * arrowLen;
    ctx.save();
    // Halo pulse en mode rotation
    if (isRotMode) {
      ctx.shadowBlur  = 12;
      ctx.shadowColor = 'rgba(100,200,255,0.7)';
    }
    ctx.strokeStyle = isRotMode ? 'rgba(100,220,255,1)' : 'rgba(100,200,255,0.85)';
    ctx.lineWidth = isRotMode ? 3 : 2;
    ctx.lineCap  = 'round';
    // Tige
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    // Tête de flèche
    const headLen = Math.max(6, r * 0.4);
    const angle   = facing2;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - headLen*Math.cos(angle-0.45), tipY - headLen*Math.sin(angle-0.45));
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - headLen*Math.cos(angle+0.45), tipY - headLen*Math.sin(angle+0.45));
    ctx.stroke();
    // Cercle de rotation (hint interactif)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isRotMode ? 'rgba(100,220,255,0.4)' : 'rgba(100,200,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, arrowLen, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  const s2 = worldToScreen(t.x, t.y);
  const r2 = (currentMap?.grid_size || GRID) * cam.zoom * (t.size || 1) / 2;
  drawTokenConditions(t, s2.x, s2.y, r2);
}

function drawTokenHighlight(t) {
  const gs = (currentMap?.grid_size || GRID) * cam.zoom;
  const s = worldToScreen(t.x, t.y);
  const r = gs * (t.size || 1) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = var_css('--accent2');
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 3]);
  ctx.stroke();
  ctx.restore();
}
