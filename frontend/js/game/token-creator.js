/**
 * Sodales — créateur et placement de token (partie extraite de game.html)
 * Modale de création (image, taille, PV, couleur) et placement sur la carte (MJ).
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
let tcImg = null, tcOffX = 0, tcOffY = 0, tcDragging = false, tcDragStart = null;
let tcTargetInputId = 'tk-image';
const TC_SIZE = 200; // canvas display size (CSS) — actual is 400px (retina)
const TC_PX   = 400; // canvas actual pixel size

function openTokenCreator(targetInputId) {
  tcTargetInputId = targetInputId || 'tk-image';
  const overlay = document.getElementById('modal-token-creator');
  overlay.classList.add('open');
  // Wire canvas events
  const cv = document.getElementById('tcCanvas');
  cv.onmousedown  = tcMouseDown;
  cv.onmousemove  = tcMouseMove;
  cv.onmouseup    = tcMouseUp;
  cv.onmouseleave = tcMouseUp;
  cv.onwheel      = tcWheel;
  tcRedraw();
}

function closeTokenCreator() {
  document.getElementById('modal-token-creator').classList.remove('open');
}

function tcLoadUrl() {
  const url = document.getElementById('tcUrlInput').value.trim();
  if (!url) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { tcImg = img; tcReset(); };
  img.onerror = () => alert('Impossible de charger cette image (CORS ou URL invalide). Essayez "Depuis un fichier".');
  img.src = url;
}

function tcLoadFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => { tcImg = img; tcReset(); };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function tcReset() {
  tcOffX = 0; tcOffY = 0;
  document.getElementById('tcZoom').value = 1;
  tcRedraw();
}

function tcRedraw() {
  const cv = document.getElementById('tcCanvas');
  const cx = cv.getContext('2d');
  const z  = parseFloat(document.getElementById('tcZoom').value) || 1;
  const bw = Math.max(0, parseInt(document.getElementById('tcBorderWidth').value) || 0);
  const bc = document.getElementById('tcBorderColor').value;
  const half = TC_PX / 2;
  const r    = half - bw / 2;

  cx.clearRect(0, 0, TC_PX, TC_PX);

  // Clip to circle
  cx.save();
  cx.beginPath();
  cx.arc(half, half, r, 0, Math.PI * 2);
  cx.clip();

  // Background
  cx.fillStyle = '#111';
  cx.fillRect(0, 0, TC_PX, TC_PX);

  if (tcImg) {
    const iw = tcImg.naturalWidth  * z * (TC_PX / TC_SIZE);
    const ih = tcImg.naturalHeight * z * (TC_PX / TC_SIZE);
    const dx = half - iw / 2 + tcOffX * (TC_PX / TC_SIZE);
    const dy = half - ih / 2 + tcOffY * (TC_PX / TC_SIZE);
    cx.drawImage(tcImg, dx, dy, iw, ih);
  } else {
    cx.fillStyle = 'rgba(201,162,39,.12)';
    cx.fillRect(0, 0, TC_PX, TC_PX);
    cx.fillStyle = '#c9a227';
    cx.font = `${TC_PX * 0.18}px Cinzel, serif`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('?', half, half);
  }
  cx.restore();

  // Border ring
  if (bw > 0) {
    cx.beginPath();
    cx.arc(half, half, r, 0, Math.PI * 2);
    cx.strokeStyle = bc;
    cx.lineWidth = bw;
    cx.stroke();
  }
}

function tcMouseDown(e) {
  tcDragging = true;
  tcDragStart = { x: e.offsetX, y: e.offsetY, ox: tcOffX, oy: tcOffY };
}
function tcMouseMove(e) {
  if (!tcDragging || !tcDragStart) return;
  tcOffX = tcDragStart.ox + (e.offsetX - tcDragStart.x);
  tcOffY = tcDragStart.oy + (e.offsetY - tcDragStart.y);
  tcRedraw();
}
function tcMouseUp() { tcDragging = false; tcDragStart = null; }
function tcWheel(e) {
  e.preventDefault();
  const zSlider = document.getElementById('tcZoom');
  let z = parseFloat(zSlider.value);
  z = Math.max(0.2, Math.min(5, z - e.deltaY * 0.002));
  zSlider.value = z;
  tcRedraw();
}

function tcApply() {
  const cv = document.getElementById('tcCanvas');
  const dataUrl = cv.toDataURL('image/jpeg', 0.88);
  const inp = document.getElementById(tcTargetInputId);
  if (inp) inp.value = dataUrl;
  closeTokenCreator();
}

// ── Placement de token (MJ) ───────────────────────────────────
let placingToken = false, placingPos = null;
function startPlaceToken() {
  if (myRole !== 'gm') return;
  placingToken = true;
  canvas.classList.add('placing');
  addSystemMessage('Cliquez sur la carte pour placer le token');

  canvas.onclick = (e) => {
    if (!placingToken) return;
    const world = screenToWorld(e.offsetX, e.offsetY);
    const gs = currentMap?.grid_size || GRID;
    placingPos = { x: Math.round(world.x / gs) * gs, y: Math.round(world.y / gs) * gs };
    canvas.onclick = null;
    placingToken = false;
    canvas.classList.remove('placing');
    document.getElementById('modal-token').classList.add('open');
  };
}
