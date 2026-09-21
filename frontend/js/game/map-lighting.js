/**
 * Sodales — éclairage (partie extraite de game.html)
 * Rendu des lumières, éclairage dynamique et mode nuit.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
// ── Éclairage dynamique ──────────────────────────────────────
let nightMode = false;
let nightCanvas, nightCtx;
let lightFlickerAnimId = null;
let _lightT = 0;

function hexToRgb(hex) {
  const h = hex.replace('#','');
  return {
    r: parseInt(h.slice(0,2),16),
    g: parseInt(h.slice(2,4),16),
    b: parseInt(h.slice(4,6),16)
  };
}

function toggleNightMode(newState) {
  nightMode = (newState !== undefined) ? newState : !nightMode;
  const btn = document.getElementById('nightModeBtn');
  if (btn) {
    btn.textContent = nightMode ? '🌙 Nuit ON' : '🌙 Nuit';
    btn.style.borderColor = nightMode ? '#fbbf24' : '';
    btn.style.color       = nightMode ? '#fbbf24' : '';
  }
  if (nightMode) startLightFlicker();
  else { stopLightFlicker(); drawMap(); }
}

function toggleNightModeGM() {
  toggleNightMode();
  // Broadcast to players
  if (socket && myRole === 'gm') {
    socket.emit('night_mode_set', { campaign_id: CAMPAIGN_ID, enabled: nightMode });
  }
}

function startLightFlicker() {
  if (lightFlickerAnimId) return;
  function loop(ts) {
    _lightT = ts / 1000;
    drawMap();
    lightFlickerAnimId = requestAnimationFrame(loop);
  }
  lightFlickerAnimId = requestAnimationFrame(loop);
}

function stopLightFlicker() {
  if (lightFlickerAnimId) { cancelAnimationFrame(lightFlickerAnimId); lightFlickerAnimId = null; }
}

function getLightFlicker(lightId, idx) {
  // Smooth, per-light flicker using multiple sine harmonics
  const s1 = Math.sin(_lightT * 2.4 + idx * 1.7) * 0.06;
  const s2 = Math.sin(_lightT * 5.1 + idx * 0.9) * 0.03;
  return 1 + s1 + s2;
}

function initNightCanvas() {
  nightCanvas = document.createElement('canvas');
  nightCanvas.width  = canvas.width;
  nightCanvas.height = canvas.height;
  nightCtx = nightCanvas.getContext('2d');
}

function renderNightOverlay() {
  if (!nightMode) return;
  if (!nightCanvas || nightCanvas.width !== canvas.width || nightCanvas.height !== canvas.height) initNightCanvas();

  nightCtx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
  nightCtx.globalCompositeOperation = 'source-over';

  const darkness = myRole === 'gm' ? 'rgba(0,0,28,0.78)' : 'rgba(0,0,16,0.94)';
  nightCtx.fillStyle = darkness;
  nightCtx.fillRect(0, 0, nightCanvas.width, nightCanvas.height);

  // Cut out lit areas with gradient
  nightCtx.globalCompositeOperation = 'destination-out';
  mapLights.forEach((l, idx) => {
    const s = worldToScreen(l.x, l.y);
    const flicker = getLightFlicker(l.id, idx);
    const pixR = l.radius * cam.zoom * flicker;
    const grad = nightCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, pixR);
    grad.addColorStop(0,    'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.95)');
    grad.addColorStop(0.8,  'rgba(0,0,0,0.5)');
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    nightCtx.fillStyle = grad;
    nightCtx.beginPath();
    nightCtx.arc(s.x, s.y, pixR, 0, Math.PI * 2);
    nightCtx.fill();
  });

  nightCtx.globalCompositeOperation = 'source-over';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(nightCanvas, 0, 0);
}

function drawLights(clipped) {
  mapLights.forEach((l, idx) => {
    const s     = worldToScreen(l.x, l.y);
    const flicker = (nightMode || lightFlickerAnimId) ? getLightFlicker(l.id, idx) : 1;
    const pixR  = l.radius * cam.zoom * flicker;
    const col   = l.color || '#ffb84d';
    const { r, g, b } = hexToRgb(col);
    // Halo lumineux radial avec couleur correcte
    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, pixR);
    grad.addColorStop(0,    `rgba(${r},${g},${b},0.32)`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},0.18)`);
    grad.addColorStop(0.65, `rgba(${r},${g},${b},0.07)`);
    grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, pixR, 0, Math.PI * 2);
    ctx.fill();
  });
}
