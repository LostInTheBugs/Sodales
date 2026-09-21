/**
 * Sodales — cartes prédéfinies et fonds de carte (partie extraite de game.html)
 * Choix de cartes prédéfinies et de fonds (modal « Fond de carte »).
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
// Tags système pour les cartes prédéfinies
// Permet de trier les cartes par pertinence selon le système de campagne
const MAP_SYSTEM_TAGS = {
  fantasy:  ['D&D 5e','Pathfinder 2e','Warhammer Fantasy','Savage Worlds'],
  desert:   ['Dune','Savage Worlds'],
  urban:    ['Cyberpunk Red','Shadowrun','Vampire: The Masquerade','Tomorrow City','Call of Cthulhu'],
  forest:   ['D&D 5e','Pathfinder 2e','Savage Worlds','Warhammer Fantasy'],
  dungeon:  ['D&D 5e','Pathfinder 2e','Warhammer Fantasy','Paranoia'],
  space:    ['Starfinder','Cyberpunk Red'],
  horror:   ['Call of Cthulhu','Vampire: The Masquerade','Paranoia','Warhammer Fantasy'],
  tavern:   ['D&D 5e','Pathfinder 2e','Warhammer Fantasy','Savage Worlds','Cyberpunk Red'],
};

const PRESET_MAPS = [
  { file: 'map_donjon.jpg',   label: '🏰 Donjon',    tags: ['dungeon','fantasy'] },
  { file: 'map_taverne.jpg',  label: '🍺 Taverne',   tags: ['tavern','fantasy','urban'] },
  { file: 'map_foret.jpg',    label: '🌲 Forêt',    tags: ['forest','fantasy'] },
  { file: 'map_desert.jpg',   label: '🏜️ Désert',  tags: ['desert'] },
  { file: 'map_grotte.jpg',   label: '⛏️ Grotte',  tags: ['dungeon','fantasy'] },
  { file: 'map_village.jpg',  label: '🏘️ Village', tags: ['fantasy','urban'] },
  { file: 'map_port.jpg',     label: '⚓ Port',     tags: ['urban','fantasy'] },
  { file: 'map_montagne.jpg', label: '🏔️ Montagne',tags: ['fantasy','desert'] },
  { file: 'map_crypte.jpg',   label: '💀 Crypte',  tags: ['dungeon','horror','fantasy'] },
  { file: 'map_plaine.jpg',   label: '🌾 Plaine',  tags: ['fantasy','desert'] },
];

function buildPresetGrid() {
  const grid = document.getElementById('preset-maps-grid');
  if (!grid) return;
  grid.innerHTML = '';
  // Trier les cartes par pertinence selon le système de campagne
  const sys = currentSystemName();
  const sorted = [...PRESET_MAPS].sort((a, b) => {
    const aScore = a.tags?.some(t => (MAP_SYSTEM_TAGS[t] || []).includes(sys)) ? 1 : 0;
    const bScore = b.tags?.some(t => (MAP_SYSTEM_TAGS[t] || []).includes(sys)) ? 1 : 0;
    return bScore - aScore;
  });
  sorted.forEach(p => {
    const url = `/uploads/${p.file}`;
    const div = document.createElement('div');
    div.className = 'preset-map';
    div.title = p.label;
    div.dataset.url = url;
    const relevant = p.tags?.some(t => (MAP_SYSTEM_TAGS[t] || []).includes(sys));
    div.style.opacity = relevant ? '1' : '.45';
    div.innerHTML = `<img src="${url}" alt="${p.label}" loading="lazy"/><div class="preset-map-label">${p.label}${relevant ? '' : ' · autre thème'}</div>`;
    div.onclick = () => selectPreset(div, url);
    grid.appendChild(div);
  });
}

function selectPreset(el, url) {
  document.querySelectorAll('.preset-map').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('bg-url').value = url;
  loadBgPreview(url);
}

// ── Fond de carte ─────────────────────────────────────────────
let bgImgNaturalW = 0, bgImgNaturalH = 0;

function openBgModal() {
  if (myRole !== 'gm') return;
  buildPresetGrid();
  const curUrl = currentMap?.background_url || '';
  document.getElementById('bg-url').value = curUrl;
  document.querySelectorAll('.preset-map').forEach(d => {
    d.classList.toggle('selected', d.dataset.url === curUrl);
  });
  document.getElementById('modal-bg').classList.add('open');
  if (curUrl) loadBgPreview(curUrl);
  else showBgNoImage();
}

function closeBgModal() {
  document.getElementById('modal-bg').classList.remove('open');
}

function showBgNoImage() {
  document.getElementById('bg-calibrate-wrap').style.display = 'none';
  document.getElementById('bg-no-image').style.display = 'block';
}

function onBgUrlChange() {
  const url = document.getElementById('bg-url').value.trim();
  if (url) loadBgPreview(url);
  else showBgNoImage();
}

function loadBgPreview(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    bgImgNaturalW = img.naturalWidth;
    bgImgNaturalH = img.naturalHeight;
    document.getElementById('bg-calibrate-wrap').style.display = 'block';
    document.getElementById('bg-no-image').style.display = 'none';
    document.getElementById('bg-imgsize-val').textContent = `${img.naturalWidth}×${img.naturalHeight}`;

    // Pré-remplir le slider avec les cases actuelles si possible
    if (currentMap?.grid_size && currentMap?.width) {
      const currentCols = Math.round(currentMap.width / currentMap.grid_size);
      const slider = document.getElementById('bg-cols-slider');
      slider.max = Math.max(100, currentCols + 10);
      slider.value = currentCols;
    }
    updateBgCalib(img);
  };
  img.onerror = () => showBgNoImage();
  img.src = url;
}

function updateBgCalib(imgArg) {
  const ncols = parseInt(document.getElementById('bg-cols-slider').value) || 20;
  document.getElementById('bg-cols-val').textContent = ncols;
  if (!bgImgNaturalW) return;
  const cellPx = Math.round(bgImgNaturalW / ncols);
  const nrows  = Math.round(bgImgNaturalH / cellPx);
  document.getElementById('bg-rows-val').textContent = nrows;
  document.getElementById('bg-cellsize-val').textContent = cellPx + ' px';
  drawBgCalibPreview(ncols, nrows, cellPx, imgArg || null);
}

function drawBgCalibPreview(ncols, nrows, cellPx, imgArg) {
  const cv  = document.getElementById('bg-preview-canvas');
  const ctx2 = cv.getContext('2d');
  // Taille du canvas = proportionnelle à l'image, max 560 px de large
  const maxW = 560;
  const scale = Math.min(1, maxW / bgImgNaturalW);
  cv.width  = Math.round(bgImgNaturalW * scale);
  cv.height = Math.round(bgImgNaturalH * scale);

  // Dessiner l'image
  const drawImg = (img) => {
    ctx2.clearRect(0, 0, cv.width, cv.height);
    ctx2.drawImage(img, 0, 0, cv.width, cv.height);

    // Grille
    const cellW = cellPx * scale;
    const cellH = cellPx * scale;
    ctx2.strokeStyle = 'rgba(201,162,39,0.55)';
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    for (let c = 0; c <= ncols; c++) {
      const x = Math.round(c * cellW);
      ctx2.moveTo(x, 0); ctx2.lineTo(x, cv.height);
    }
    for (let r = 0; r <= nrows; r++) {
      const y = Math.round(r * cellH);
      ctx2.moveTo(0, y); ctx2.lineTo(cv.width, y);
    }
    ctx2.stroke();

    // Overlay semi-transparent pour lisibilité
    ctx2.fillStyle = 'rgba(0,0,0,0.18)';
    ctx2.fillRect(0, 0, cv.width, cv.height);
    // Re-tracer la grille par-dessus
    ctx2.strokeStyle = 'rgba(201,162,39,0.7)';
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    for (let c = 0; c <= ncols; c++) {
      const x = Math.round(c * cellW);
      ctx2.moveTo(x, 0); ctx2.lineTo(x, cv.height);
    }
    for (let r = 0; r <= nrows; r++) {
      const y = Math.round(r * cellH);
      ctx2.moveTo(0, y); ctx2.lineTo(cv.width, y);
    }
    ctx2.stroke();
  };

  if (imgArg && imgArg.complete) {
    drawImg(imgArg);
  } else {
    const img2 = new Image();
    img2.crossOrigin = 'anonymous';
    img2.onload = () => drawImg(img2);
    img2.src = document.getElementById('bg-url').value.trim();
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#conditionMenu')) hideConditionMenu();
});

async function applyMapBg() {
  if (!currentMap) return;
  const url = document.getElementById('bg-url').value.trim();

  // Calcul dimensions depuis calibration
  let gridSize = currentMap.grid_size || 50;
  let mapW = currentMap.width  || 2000;
  let mapH = currentMap.height || 1500;

  if (bgImgNaturalW > 0) {
    const ncols  = parseInt(document.getElementById('bg-cols-slider').value) || 20;
    const cellPx = Math.round(bgImgNaturalW / ncols);
    const nrows  = Math.round(bgImgNaturalH / cellPx);
    // On garde grid_size = 50 (unité monde fixe) et on adapte les dimensions monde
    gridSize = 50;
    mapW = ncols * gridSize;
    mapH = nrows * gridSize;
  }

  try {
    const updated = await API.maps.update(CAMPAIGN_ID, currentMap.id, {
      background_url: url || null,
      grid_size: gridSize,
      width:  mapW,
      height: mapH,
    });
    Object.assign(currentMap, updated);
    bgImgNaturalW = 0; bgImgNaturalH = 0;
    delete bgCache[url]; // forcer rechargement
    drawMap();
    closeBgModal();
    socket?.emit('map_change', { campaign_id: CAMPAIGN_ID, map_id: currentMap.id });
  } catch (err) {
    alert('Erreur : ' + err.message);
  }
}

// ══════════════════════════════════════════════════════════════
// TRAQUEUR D'INITIATIVE
// ══════════════════════════════════════════════════════════════
let combatActive = false;
let combatState = null; // { combatants, current_turn, round }
let trackerVisible = false;
let idCounter = 0;
function newCombatId() { return 'c_' + (++idCounter) + '_' + Date.now(); }

// Palette de couleurs pour les combattants sans couleur assignée
const PALETTE = ['#c9a227','#8b5cf6','#22c55e','#ef4444','#3b82f6','#f97316','#ec4899','#14b8a6'];
let paletteIdx = 0;
function nextColor() { return PALETTE[(paletteIdx++) % PALETTE.length]; }
