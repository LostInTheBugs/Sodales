/**
 * Sodales — outils de la carte (partie extraite de game.html)
 * Murs, lumières, brouillard, objos, zones — activation et gestes.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => {
    b.classList.remove('active','wall-tool-active','light-tool-active','obj-tool-active');
  });
  const btn = document.getElementById(`tool-${tool}`);
  if (btn) {
    if (tool === 'walls')   btn.classList.add('active','wall-tool-active');
    else if (tool === 'objects') btn.classList.add('active','obj-tool-active');
    else btn.classList.add('active');
  }
  // Picker objets visible seulement en mode objects
  const picker = document.getElementById('objectPicker');
  if (picker) picker.style.display = (tool === 'objects') ? '' : 'none';

  canvas.style.cursor = (tool === 'select') ? 'grab'
    : (tool === 'fog' || tool === 'measure' || tool === 'walls' || tool === 'objects' || tool === 'zones' || tool === 'draw') ? 'crosshair'
    : 'default';
  if (tool !== 'measure') { measurePoints = []; measureCursor = null; measureActive = false; if (socket) socket.emit('measure_clear', { campaign_id: CAMPAIGN_ID }); }
  if (tool !== 'zones') { zoneDrawing = null; zoneMouseDown = false; }
  const zst = document.getElementById('zoneSubtoolbar');
  if (zst) zst.classList.toggle('visible', tool === 'zones');
  const dst = document.getElementById('drawSubtoolbar');
  if (dst) dst.style.display = (tool === 'draw') ? 'flex' : 'none';
  wallDrawStart = null;
  drawMap();
}

function setZoneType(t) {
  zoneType = t;
  ['circle','cone','line'].forEach(id => {
    const b = document.getElementById('zt-' + id);
    if (b) b.classList.toggle('active', id === t);
  });
}
function setZoneColor(idx) {
  zoneColorIdx = idx;
  for (let i = 0; i < 6; i++) {
    const d = document.getElementById('zc-' + i);
    if (d) d.classList.toggle('active', i === idx);
  }
}
function clearAllZones() {
  spellZones = [];
  if (socket) socket.emit('zones_clear', { campaign_id: CAMPAIGN_ID });
  drawMap();
}

function zoomIn() { cam.zoom = Math.min(4, cam.zoom * 1.2); drawMap(); }
function zoomOut() { cam.zoom = Math.max(0.2, cam.zoom / 1.2); drawMap(); }
function resetView() { cam = { x: 0, y: 0, zoom: 1 }; drawMap(); }

function toggleGrid() {
  showGrid = !showGrid;
  const btn = document.getElementById('toggleGridBtn');
  if (btn) { btn.style.opacity = showGrid ? '1' : '0.35'; btn.classList.toggle('active', showGrid); }
  drawMap();
}

// ══════════════════════════════════════════════════════════════
// EFFETS MÉTÉO
// ══════════════════════════════════════════════════════════════
let weatherType = 'none';
let weatherIntensity = 5;
let weatherCanvas2d = null;
let weatherCtx2d = null;
let weatherParticles = [];
let weatherAnimId = null;
let weatherFogOffset = 0;

const WEATHER_PARTICLE_MAX = { rain:600, snow:300, embers:200, stars:120, fog:0 };

function initWeatherCanvas() {
  const wc = document.getElementById('weatherCanvas');
  if (!wc) return;
  weatherCanvas2d = wc;
  weatherCtx2d = wc.getContext('2d');
  // S'assurer que le canvas météo suit la taille de la map-area
  const resizeWC = () => {
    wc.width = wc.parentElement.clientWidth;
    wc.height = wc.parentElement.clientHeight;
  };
  resizeWC();
  window.addEventListener('resize', resizeWC);
}

function spawnParticle(type) {
  const W = weatherCanvas2d.width, H = weatherCanvas2d.height;
  if (type === 'rain') return {
    x: Math.random() * W, y: -10,
    vx: -1 + Math.random() * 0.5, vy: 12 + Math.random() * 8,
    len: 10 + Math.random() * 10, alpha: 0.3 + Math.random() * 0.4,
  };
  if (type === 'snow') return {
    x: Math.random() * W, y: -10,
    vx: (Math.random() - 0.5) * 0.8, vy: 0.8 + Math.random() * 1.5,
    r: 2 + Math.random() * 3, alpha: 0.5 + Math.random() * 0.5,
    wobble: Math.random() * Math.PI * 2, wobbleSpeed: 0.02 + Math.random() * 0.02,
  };
  if (type === 'embers') return {
    x: Math.random() * W, y: H + 5,
    vx: (Math.random() - 0.5) * 1.5, vy: -(1 + Math.random() * 2.5),
    r: 1 + Math.random() * 2, alpha: 0.6 + Math.random() * 0.4,
    life: 1, decay: 0.005 + Math.random() * 0.008,
  };
  if (type === 'stars') return {
    x: Math.random() * W, y: Math.random() * H,
    r: 0.5 + Math.random() * 1.5, alpha: 0, maxAlpha: 0.4 + Math.random() * 0.5,
    twinkleSpeed: 0.01 + Math.random() * 0.02, phase: Math.random() * Math.PI * 2,
  };
  return null;
}

function updateWeatherParticles() {
  const W = weatherCanvas2d.width, H = weatherCanvas2d.height;
  const maxP = Math.round((WEATHER_PARTICLE_MAX[weatherType] || 0) * weatherIntensity / 5);
  // Spawn
  const spawnRate = weatherType === 'stars' ? 2 : Math.ceil(weatherIntensity * 2);
  for (let i = 0; i < spawnRate && weatherParticles.length < maxP; i++) {
    const p = spawnParticle(weatherType);
    if (p) weatherParticles.push(p);
  }
  // Update
  weatherParticles = weatherParticles.filter(p => {
    if (weatherType === 'rain')   { p.x += p.vx; p.y += p.vy; return p.y < H + 20; }
    if (weatherType === 'snow')   { p.wobble += p.wobbleSpeed; p.x += p.vx + Math.sin(p.wobble) * 0.4; p.y += p.vy; return p.y < H + 10; }
    if (weatherType === 'embers') { p.x += p.vx + Math.sin(p.life * 5) * 0.3; p.y += p.vy; p.life -= p.decay; p.alpha = p.life; return p.life > 0 && p.y > -10; }
    if (weatherType === 'stars')  { p.phase += p.twinkleSpeed; p.alpha = p.maxAlpha * (0.5 + 0.5 * Math.sin(p.phase)); return true; }
    return false;
  });
}

function drawWeatherParticles() {
  const W = weatherCanvas2d.width, H = weatherCanvas2d.height;
  weatherCtx2d.clearRect(0, 0, W, H);
  if (weatherType === 'none') return;

  if (weatherType === 'fog') {
    weatherFogOffset = (weatherFogOffset + 0.15 * weatherIntensity / 5) % W;
    const alpha = 0.06 + (weatherIntensity / 10) * 0.25;
    for (let layer = 0; layer < 3; layer++) {
      const grad = weatherCtx2d.createLinearGradient(0, 0, W, 0);
      const off = (weatherFogOffset * (1 + layer * 0.3)) % W;
      grad.addColorStop(0, `rgba(200,220,255,0)`);
      grad.addColorStop(0.3 + layer * 0.1, `rgba(200,220,255,${alpha})`);
      grad.addColorStop(0.7, `rgba(200,220,255,${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(200,220,255,0)`);
      weatherCtx2d.save();
      weatherCtx2d.translate(off - W * layer * 0.15, H * 0.1 * layer);
      weatherCtx2d.fillStyle = grad;
      weatherCtx2d.fillRect(-W, 0, W * 3, H);
      weatherCtx2d.restore();
    }
    // Nappe au sol
    const groundGrad = weatherCtx2d.createLinearGradient(0, H * 0.55, 0, H);
    groundGrad.addColorStop(0, 'rgba(180,210,255,0)');
    groundGrad.addColorStop(1, `rgba(180,210,255,${alpha * 1.5})`);
    weatherCtx2d.fillStyle = groundGrad;
    weatherCtx2d.fillRect(0, 0, W, H);
    return;
  }

  weatherCtx2d.save();
  if (weatherType === 'rain') {
    weatherParticles.forEach(p => {
      weatherCtx2d.beginPath();
      weatherCtx2d.strokeStyle = `rgba(160,200,255,${p.alpha})`;
      weatherCtx2d.lineWidth = 1;
      weatherCtx2d.moveTo(p.x, p.y);
      weatherCtx2d.lineTo(p.x + p.vx * 0.8, p.y + p.len);
      weatherCtx2d.stroke();
    });
  } else if (weatherType === 'snow') {
    weatherCtx2d.fillStyle = '#fff';
    weatherParticles.forEach(p => {
      weatherCtx2d.globalAlpha = p.alpha;
      weatherCtx2d.beginPath();
      weatherCtx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      weatherCtx2d.fill();
    });
  } else if (weatherType === 'embers') {
    weatherParticles.forEach(p => {
      weatherCtx2d.globalAlpha = p.alpha;
      const grad = weatherCtx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2);
      grad.addColorStop(0, '#fff8e0');
      grad.addColorStop(0.4, '#ff8800');
      grad.addColorStop(1, 'rgba(255,60,0,0)');
      weatherCtx2d.fillStyle = grad;
      weatherCtx2d.beginPath();
      weatherCtx2d.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2);
      weatherCtx2d.fill();
    });
  } else if (weatherType === 'stars') {
    weatherParticles.forEach(p => {
      weatherCtx2d.globalAlpha = p.alpha;
      weatherCtx2d.fillStyle = '#e8f0ff';
      weatherCtx2d.beginPath();
      weatherCtx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      weatherCtx2d.fill();
    });
  }
  weatherCtx2d.restore();
}

function weatherLoop() {
  if (weatherType === 'none') {
    if (weatherCtx2d) weatherCtx2d.clearRect(0, 0, weatherCanvas2d.width, weatherCanvas2d.height);
    weatherAnimId = null;
    return;
  }
  updateWeatherParticles();
  drawWeatherParticles();
  weatherAnimId = requestAnimationFrame(weatherLoop);
}

function setWeather(type, intensity, broadcast = true) {
  weatherType = type;
  if (intensity !== undefined) weatherIntensity = intensity;
  weatherParticles = [];
  // UI
  document.querySelectorAll('.weather-opt').forEach(el => el.classList.remove('active'));
  document.getElementById('wopt-' + type)?.classList.add('active');
  // Démarrer / arrêter la boucle
  if (weatherAnimId) { cancelAnimationFrame(weatherAnimId); weatherAnimId = null; }
  if (type !== 'none') weatherLoop();
  else if (weatherCtx2d) weatherCtx2d.clearRect(0, 0, weatherCanvas2d.width, weatherCanvas2d.height);
  if (broadcast && socket && myRole === 'gm') {
    socket.emit('weather_set', { campaign_id: CAMPAIGN_ID, type, intensity: weatherIntensity });
  }
}

function setWeatherIntensity(val) {
  weatherIntensity = parseInt(val);
  document.getElementById('weatherIntLabel').textContent = val;
  if (socket && myRole === 'gm') {
    socket.emit('weather_set', { campaign_id: CAMPAIGN_ID, type: weatherType, intensity: weatherIntensity });
  }
}

function toggleWeatherMenu() {
  const menu = document.getElementById('weatherMenu');
  if (menu) menu.classList.toggle('visible');
}

function showHotkeys() {
  const overlay = document.getElementById('hotkeyOverlay');
  if (overlay) { overlay.classList.toggle('open'); return; }
  const el = document.createElement('div');
  el.id = 'hotkeyOverlay';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:500;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)';
  el.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.4rem 1.8rem;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="font-family:Cinzel,serif;color:var(--accent);font-size:1rem;">Raccourcis clavier</h3>
        <button onclick="document.getElementById('hotkeyOverlay').classList.remove('open')" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:1.1rem;">✕</button>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:.83rem;">
        ${[
          ['Esc', 'Annuler / Désélectionner'],
          ['Ctrl+Z', 'Annuler dernier déplacement de token'],
          ['S', 'Outil Sélection'],
          ['M', 'Outil Mesure'],
          ['Z', 'Outil Zones de sorts'],
          ['F', 'Outil Brouillard (MJ)'],
          ['W', 'Outil Murs (MJ)'],
          ['G', 'Toggle grille'],
          ['Espace', 'Centrer sur token sélectionné'],
          ['Tab', 'Token suivant dans l\'initiative'],
          ['↑↓←→', 'Déplacer token case par case'],
          ['Shift+↑↓←→', 'Déplacer ½ case'],
          ['Delete / ⌫', 'Supprimer token sélectionné (MJ)'],
          ['+  /  -', 'Zoom avant / arrière'],
          ['0', 'Réinitialiser le zoom'],
        ].map(([k,v]) => `<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:.4rem .6rem;"><kbd style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:.15rem .45rem;font-family:monospace;font-size:.8rem;color:var(--accent)">${k}</kbd></td>
          <td style="padding:.4rem .6rem;color:var(--text2);">${v}</td>
        </tr>`).join('')}
      </table>
    </div>`;
  el.addEventListener('click', ev => { if (ev.target === el) el.classList.remove('open'); });
  el.classList.add('open');
  document.body.appendChild(el);
}
