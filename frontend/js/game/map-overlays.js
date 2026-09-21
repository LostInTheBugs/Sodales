/**
 * Sodales — calques de la carte (partie extraite de game.html)
 * PV sur les tokens, pings, son de tour, dessin libre, ciblage.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function hpBarColor(pct) {
  if (pct >= hpDisplay.threshold_high) return '#4ade80'; // vert
  if (pct >= hpDisplay.threshold_low)  return '#fb923c'; // orange
  return '#ef4444';                                       // rouge
}

function drawTokenHpBar(t, s, r) {
  const hp    = t.hp_current;
  const hpMax = t.hp_max;
  if (hp === null || hp === undefined || !hpMax || hpMax <= 0) return;

  const isPC = !!t.char_user_id;
  // Le MJ voit toujours (exact)
  const mode = myRole === 'gm' ? 'exact' : (isPC ? hpDisplay.pc_mode : hpDisplay.npc_mode);
  if (mode === 'none') return;

  const pct  = Math.max(0, Math.min(100, (hp / hpMax) * 100));
  const barY = s.y + r + 5;

  if (mode === 'exact') {
    ctx.save();
    const fs = Math.max(9, r * 0.38);
    ctx.font = `600 ${fs}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Halo lisibilité
    ctx.shadowColor = 'rgba(0,0,0,.85)';
    ctx.shadowBlur  = 4;
    ctx.fillStyle   = hpBarColor(pct);
    ctx.fillText(`${hp}/${hpMax}`, s.x, barY);
    ctx.restore();
  } else {
    // Barre colorée
    const bh  = Math.max(5, Math.min(9, r * 0.22));
    const bw  = r * 2;
    ctx.save();
    // Fond sombre arrondi
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.beginPath(); ctx.roundRect(s.x - bw/2, barY, bw, bh, 3); ctx.fill();
    // Remplissage coloré
    if (pct > 0) {
      ctx.fillStyle = hpBarColor(pct);
      ctx.beginPath(); ctx.roundRect(s.x - bw/2, barY, bw * (pct/100), bh, 3); ctx.fill();
    }
    ctx.restore();
  }
}

// Ouvrir/fermer le panneau HP Display (MJ)
function toggleHpDisplayPanel(e) {
  const dd = document.getElementById('hp-display-dropdown');
  const isOpen = dd.classList.toggle('open');
  if (isOpen) {
    setTimeout(() => document.addEventListener('click', closeHpDisplayPanel, { once: true }), 0);
  }
}
function closeHpDisplayPanel() {
  document.getElementById('hp-display-dropdown')?.classList.remove('open');
}

// Envoi des nouveaux réglages au serveur
function updateHpDisplay() {
  const pc_mode        = document.getElementById('hpd-pc-mode')?.value || 'bar';
  const npc_mode       = document.getElementById('hpd-npc-mode')?.value || 'none';
  const threshold_high = parseInt(document.getElementById('hpd-threshold-high')?.value) || 70;
  const threshold_low  = parseInt(document.getElementById('hpd-threshold-low')?.value) || 30;
  socket?.emit('hp_display_update', { campaign_id: CAMPAIGN_ID, pc_mode, npc_mode, threshold_high, threshold_low });
}

// Anneau vert pour les tokens que le joueur contrôle (non-MJ uniquement)
function drawTokenOwnerRing(t) {
  if (myRole === 'gm') return;
  if (!canControlToken(t)) return;
  const gs = (currentMap?.grid_size || GRID) * cam.zoom;
  const s = worldToScreen(t.x, t.y);
  const r = gs * (t.size || 1) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(s.x, s.y, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(74,222,128,0.55)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function drawActiveCombatantGlow(t, color) {
  const gs = (currentMap?.grid_size || GRID) * cam.zoom;
  const s = worldToScreen(t.x, t.y);
  const r = gs * (t.size || 1) / 2;
  const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 300);
  const glowColor = color || '#c9a227';
  ctx.save();
  // Halo extérieur pulsant
  ctx.beginPath();
  ctx.arc(s.x, s.y, r + 6 + 4 * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = glowColor;
  ctx.globalAlpha = 0.85 * pulse;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.stroke();
  // Second anneau plus grand, plus transparent
  ctx.beginPath();
  ctx.arc(s.x, s.y, r + 12 + 6 * pulse, 0, Math.PI * 2);
  ctx.globalAlpha = 0.3 * pulse;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Forcer le ré-rendu pour l'animation
  drawMap();
}

// ── Pings de carte ────────────────────────────────────────────
let mapPings = []; // [{x, y, t0, username, color}]
const PING_DURATION = 2200; // ms

function sendMapPing(wx, wy) {
  if (!socket) return;
  socket.emit('map_ping', { campaign_id: CAMPAIGN_ID, x: wx, y: wy });
  // Afficher localement immédiatement
  addMapPing(wx, wy, getUser()?.username || '?');
}

function addMapPing(wx, wy, username) {
  mapPings.push({ x: wx, y: wy, t0: performance.now(), username });
  drawMap();
}

function drawPathPreview() {
  if (!pathPreview || pathPreview.length < 2) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(139,92,246,0.7)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 5]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const start = worldToScreen(pathPreview[0].x, pathPreview[0].y);
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < pathPreview.length; i++) {
    const s = worldToScreen(pathPreview[i].x, pathPreview[i].y);
    ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();
  // Endpoint marker
  const end = worldToScreen(pathPreview[pathPreview.length-1].x, pathPreview[pathPreview.length-1].y);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(139,92,246,0.85)';
  ctx.beginPath(); ctx.arc(end.x, end.y, 6, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawPings() {
  const now = performance.now();
  mapPings = mapPings.filter(p => now - p.t0 < PING_DURATION);
  for (const p of mapPings) {
    const age = (now - p.t0) / PING_DURATION; // 0→1
    const s = worldToScreen(p.x, p.y);
    const alpha = 1 - age;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Cercle expansif
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10 + 40 * age, 0, Math.PI * 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3 * (1 - age) + 1;
    ctx.stroke();
    // Point central
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5 * (1 - age * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.restore();
    if (age < 1) drawMap(); // maintenir l'animation
  }
}

// ── Son de notification de tour ───────────────────────────────
let _bellCtx = null;
function playTurnBell() {
  try {
    if (!_bellCtx) _bellCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = _bellCtx.createOscillator();
    const gain = _bellCtx.createGain();
    osc.connect(gain); gain.connect(_bellCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, _bellCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, _bellCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, _bellCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _bellCtx.currentTime + 0.8);
    osc.start(_bellCtx.currentTime);
    osc.stop(_bellCtx.currentTime + 0.8);
  } catch (e) { /* audio non disponible */ }
}

// ── Dessin sur la carte ──────────────────────────────────────
function startDrawStroke(wx, wy) {
  drawCurrentStroke = {
    color: drawColor,
    width: drawWidth,
    points: [{ x: wx, y: wy }],
  };
}

function addDrawPoint(wx, wy) {
  if (!drawCurrentStroke) return;
  drawCurrentStroke.points.push({ x: wx, y: wy });
  drawMap();
}

function endDrawStroke() {
  if (!drawCurrentStroke || drawCurrentStroke.points.length < 2) {
    drawCurrentStroke = null;
    return;
  }
  drawStrokes.push(drawCurrentStroke);
  const stroke = JSON.parse(JSON.stringify(drawCurrentStroke));
  drawCurrentStroke = null;
  drawMap();
  // Envoyer via socket
  if (socket && currentMap) {
    socket.emit('draw_stroke', { campaign_id: CAMPAIGN_ID, map_id: currentMap.id, stroke });
  }
}

function drawStrokesOnMap() {
  const allStrokes = drawStrokes.concat(drawCurrentStroke ? [drawCurrentStroke] : []);
  for (const s of allStrokes) {
    if (!s.points || s.points.length < 2) continue;
    ctx.save();
    ctx.strokeStyle = s.color || '#f59e0b';
    ctx.lineWidth = (s.width || 3) * cam.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const p0 = worldToScreen(s.points[0].x, s.points[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < s.points.length; i++) {
      const p = worldToScreen(s.points[i].x, s.points[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function undoLastStroke() {
  if (drawStrokes.length === 0) return;
  drawStrokes.pop();
  drawMap();
  if (socket && currentMap) {
    socket.emit('draw_undo', { campaign_id: CAMPAIGN_ID, map_id: currentMap.id });
  }
}

function clearAllStrokes() {
  drawStrokes = [];
  drawMap();
  if (socket && currentMap) {
    socket.emit('draw_clear', { campaign_id: CAMPAIGN_ID, map_id: currentMap.id });
  }
}

// ── Ciblage ──────────────────────────────────────────────────
function drawTargetLines() {
  if (!campaignTargets?.length) return;
  for (const t of campaignTargets) {
    if (!t.revealed && myRole !== 'gm' && t.player_id !== getUser()?.id) continue;
    const fromToken = gameTokens.find(tk => tk.id === t.from_token_id);
    const toToken = gameTokens.find(tk => tk.id === t.to_token_id);
    if (!fromToken || !toToken) continue;
    const from = worldToScreen(fromToken.x, fromToken.y);
    const to = worldToScreen(toToken.x, toToken.y);
    ctx.save();
    // Line style: solid for GM/revealed, dashed for own targets
    const isOwn = t.player_id === getUser()?.id;
    const alpha = (myRole === 'gm' || t.revealed) ? 0.8 : 0.5;
    ctx.strokeStyle = isOwn ? `rgba(201,162,39,${alpha})` : `rgba(139,92,246,${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(myRole === 'gm' || t.revealed ? [] : [6, 4]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    // Arrow head
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLen = 10;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle - 0.4), to.y - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(to.x - headLen * Math.cos(angle + 0.4), to.y - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = isOwn ? `rgba(201,162,39,${alpha})` : `rgba(139,92,246,${alpha})`;
    ctx.fill();
    // Player label
    if (myRole === 'gm') {
      ctx.font = '9px Inter, sans-serif';
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.textAlign = 'center';
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 10;
      ctx.fillText(t.player_name || '?', midX, midY);
    }
    ctx.restore();
  }
}

// Palette de couleurs pour le dessin
const DRAW_COLORS = ['#f59e0b','#ef4444','#22c55e','#3b82f6','#a855f7','#ffffff','#000000','#ea580c'];
function setDrawColor(color) { drawColor = color; drawMap(); }
function setDrawWidth(w) { drawWidth = Math.max(1, Math.min(20, w)); }

function var_css(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}
