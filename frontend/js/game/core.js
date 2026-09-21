/* Sodales — logique de page extraite de game.html (CSP : plus de script inline) */
// ── State ────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const CAMPAIGN_ID = params.get('campaign');
const DISPLAY_MODE = params.get('mode') === 'display';
const TABLE_MODE = params.get('table') === '1';
let socket, campaign, myChars = [], myRole = 'player';
let activeChar = null;
let onlineUsers = {};
let allCampaignMembers = [];
let hpDisplay = { pc_mode: 'bar', npc_mode: 'none', threshold_high: 70, threshold_low: 30 };

// ── Mode affichage central ──
if (DISPLAY_MODE) document.body.classList.add('display-mode');
if (TABLE_MODE) document.body.classList.add('table-mode');

// ── Ciblage (global, accessible par drawTargetLines) ──
const campaignTargets = []; // { from_token_id, to_token_id, to_token_name, player_id, player_name, revealed }
let myTargets = [];

// ── Mode table : écran tactile verrouillé ──
let tableLocked = TABLE_MODE;

function unlockTable() {
  if (tableLocked && confirm('Déverrouiller l\'écran tactile ? Attention : les figurines sur l\'écran peuvent déclencher des actions.')) {
    tableLocked = false;
    updateTableUI();
  }
}

function lockTable() {
  tableLocked = true;
  updateTableUI();
}

function updateTableUI() {
  const overlay = document.getElementById('tableOverlay');
  if (!overlay) return;
  overlay.classList.toggle('visible', tableLocked);
  const lockInfo = document.getElementById('tableLockInfo');
  if (lockInfo) {
    lockInfo.className = 'lock-info' + (tableLocked ? '' : ' unlocked');
    lockInfo.innerHTML = tableLocked ? '🔒 Verrouillé' : '🔓 Déverrouillé';
  }
}

// Créer et injecter l'overlay table (appelé après loadCampaign)
function initTableOverlay() {
  if (!TABLE_MODE) return;
  const div = document.createElement('div');
  div.id = 'tableOverlay';
  div.className = 'visible';
  const cName = (campaign && campaign.name) || 'Partie en cours';
  div.innerHTML = `
    <div class="lock-info" id="tableLockInfo">🔒 Verrouillé</div>
    <div class="qr-wrap">
      <div id="tableQr" class="qr-box"></div>
      <div class="qr-label">Scannez pour rejoindre</div>
    </div>
    <div class="to-bottom">
      <span class="camp-name">${cName}</span>
      <span>·</span>
      <span id="tableOnlineCount">0 en ligne</span>
      <button class="tool-btn" data-act="unlockTable" style="font-size:.7rem;padding:.15rem .5rem;" title="Déverrouiller l'écran">🔓 Déverrouiller</button>
      <button class="tool-btn" data-act="lockTable" style="font-size:.7rem;padding:.15rem .5rem;" title="Verrouiller">🔒</button>
      <a class="tool-btn" href="${location.origin + '/game.html?campaign=' + CAMPAIGN_ID + '&mode=display'}" style="font-size:.7rem;padding:.15rem .5rem;text-decoration:none;">↻ Reconnecter</a>
    </div>
  `;
  document.body.appendChild(div);
  const qrBox = document.getElementById('tableQr');
  if (qrBox && typeof qrcode === 'function') {
    try {
      const q = qrcode(0, 'M');
      q.addData(location.origin + '/lobby.html');
      q.make();
      qrBox.innerHTML = q.createImgTag(4, 8);
    } catch (e) { console.warn('[QR] génération locale impossible :', e); }
  }
}

function updateTableOnlineCount() {
  const el = document.getElementById('tableOnlineCount');
  if (el) el.textContent = Object.keys(onlineUsers).length + ' en ligne';
}

// ── Vidéo d'introduction ─────────────────────────────────────
const INTRO_SEEN_KEY = 'rpg_intro_seen_';

function showIntroVideo(videoUrl, title) {
  const overlay = document.getElementById('introOverlay');
  const video = document.getElementById('introVideo');
  const titleEl = document.getElementById('introTitle');
  if (!overlay || !video) return;
  titleEl.textContent = title || 'Introduction';
  video.src = videoUrl;
  video.muted = false;
  video.load();
  overlay.style.display = 'flex';
  // Tenter la lecture avec son — si bloqué par le navigateur, forcer le mute
  const playPromise = video.play();
  if (playPromise) {
    playPromise.catch(() => {
      video.muted = true;
      video.play().catch(() => {});
      // Ajouter un bouton pour activer le son
      const footer = overlay.querySelector('.intro-footer');
      if (footer && !document.getElementById('introUnmuteBtn')) {
        const btn = document.createElement('button');
        btn.id = 'introUnmuteBtn';
        btn.className = 'btn btn-secondary';
        btn.textContent = '🔇 Activer le son';
        btn.onclick = () => { video.muted = !video.muted; btn.textContent = video.muted ? '🔇 Activer le son' : '🔊 Son activé'; };
        footer.insertBefore(btn, footer.firstChild);
      }
    });
  }
  video.onended = () => { closeIntro(); };
}

function closeIntro() {
  const overlay = document.getElementById('introOverlay');
  const video = document.getElementById('introVideo');
  if (overlay) overlay.style.display = 'none';
  if (video) { video.pause(); video.muted = false; video.src = ''; }
  const unmuteBtn = document.getElementById('introUnmuteBtn');
  if (unmuteBtn) unmuteBtn.remove();
}

function checkAndShowIntro() {
  const sys = campaign?.system;
  if (!sys) return;
  const videoUrl = SYSTEM_INTRO_VIDEOS[sys] || SYSTEM_INTRO_VIDEOS[SYSTEM_ALIASES[sys]];
  if (!videoUrl) return;
  const key = INTRO_SEEN_KEY + CAMPAIGN_ID;
  // Si le paramètre intro=1 est présent, on force l'affichage même si déjà vu
  const forceIntro = params.get('intro') === '1';
  if (!forceIntro && localStorage.getItem(key)) return;
  // Vérifier que la vidéo existe
  fetch(videoUrl, { method: 'HEAD' }).then(r => {
    if (r.ok) {
      localStorage.setItem(key, '1');
      showIntroVideo(videoUrl, sys + ' — Introduction');
    }
  }).catch(() => {});
}

// ── Auth guard ───────────────────────────────────────────────
(async () => {
  if (!CAMPAIGN_ID) { window.location.href = '/lobby.html'; return; }
  const token = getToken();
  if (!token) { window.location.href = '/'; return; }
  try {
    const user = await API.auth.me();
    setUser(user);
    await loadCampaign();
    connectSocket();
    // Vérifier la vidéo d'intro après chargement
    setTimeout(checkAndShowIntro, 1500);
  } catch { clearToken(); window.location.href = '/'; }
})();

async function loadCampaign() {
  campaign = await API.campaigns.get(CAMPAIGN_ID);
  myRole = campaign.role;
  document.getElementById('campTitle').textContent = campaign.name;
  const badge = document.getElementById('roleBadge');
  badge.textContent = myRole === 'gm' ? '👑 MJ' : '⚔ Joueur';
  badge.className = `badge badge-${myRole}`;
  if (myRole === 'gm') {
    document.getElementById('btnAddToken').style.display = '';
    const settingsBtn = document.getElementById('btnSettings');
    settingsBtn.style.display = '';
    settingsBtn.href = `/campaign-settings.html?campaign=${CAMPAIGN_ID}`;
    document.getElementById('tool-bg').style.display = '';
    document.getElementById('weatherBtn').style.display = '';
    document.getElementById('nightModeBtn').style.display = '';
  }

  if (myRole === 'gm') {
    document.getElementById('sectionMaps').style.display = '';
    document.getElementById('tool-fog').style.display = '';
    document.getElementById('tool-walls').style.display = '';
    document.getElementById('tool-objects').style.display = '';
    document.getElementById('mct-gm').style.display = '';
    loadMaps();
  }

  allCampaignMembers = campaign.members || [];
  myChars = campaign.characters.filter(c => myRole === 'gm' || c.user_id === getUser().id);
  populateCharSelectors();

  // ── Mode map unique : les joueurs ne voient pas la carte ──
  const displayMode = campaign.settings?.display_mode || 'normal';
  if (displayMode === 'map_unique' && !DISPLAY_MODE) {
    if (myRole === 'gm') {
      // Le MJ voit la carte normalement + lien vers l'écran central
      const displayUrl = `${location.origin}${location.pathname}?campaign=${CAMPAIGN_ID}&mode=display`;
      const header = document.querySelector('header');
      const link = document.createElement('a');
      link.className = 'btn-icon';
      link.href = displayUrl;
      link.target = '_blank';
      link.title = 'Ouvrir l\'écran central (carte seule)';
      link.textContent = '🖥 Carte';
      link.style.background = 'rgba(201,162,39,.15)';
      link.style.borderColor = 'var(--accent)';
      link.style.color = 'var(--accent)';
      // Insérer avant le bouton "← Lobby"
      const lobbyBtn = header.querySelector('button:last-of-type') || header.lastElementChild;
      header.insertBefore(link, lobbyBtn);
    } else {
      // Les joueurs n'ont pas la carte : masquer la zone carte
      const mapArea = document.getElementById('mapArea');
      if (mapArea) mapArea.style.display = 'none';
      // Les sidebars gardent leur largeur d'origine (280px)
      // L'espace du milieu reste vide
    }
  }

  if (DISPLAY_MODE) {
    // Mode écran central : pas besoin des sidebars ni du chargement des personnages
    document.querySelector('.sidebar-left')?.remove();
    document.querySelector('.sidebar-right')?.remove();
    // Mode table : afficher l'overlay verrouillé
    if (TABLE_MODE) initTableOverlay();
    initCanvas();
    // Ne pas appeler connectSocket() ici — ce sera fait après loadCampaign()
    return;
  }

  initCanvas();
  loadMacros();
  loadHandouts();
  if (myRole === 'gm') {
    const tb = document.getElementById('tablesBtn');
    if (tb) tb.style.display = '';
    loadTables();
    const lvlBtn = document.getElementById('lvlupPanelBtn');
    if (lvlBtn) lvlBtn.style.display = '';
  }
  // Le bouton "+" de montée de niveau s'affiche à l'ouverture de la fiche (openCharSheet)
}

function populateCharSelectors() {
  const opts = myChars.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const sel = document.getElementById('charSelector');
  const prev = sel.value;
  sel.innerHTML = `<option value="">— Aucun personnage —</option>` + opts;
  if (prev) sel.value = prev;
  // Remplir le modal token
  const tk = document.getElementById('tk-char');
  tk.innerHTML = '<option value="">— NPC / Libre —</option>' + campaign.characters.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

function selectChar(id) {
  activeChar = myChars.find(c => c.id === id) || null;
  const info = document.getElementById('charInfo');
  if (!activeChar) { info.style.display = 'none'; return; }
  info.style.display = '';
  document.getElementById('charName').textContent = activeChar.name;
  document.getElementById('charSub').textContent = `${activeChar.race||''} ${activeChar.class||''}`.trim() || '—';
  document.getElementById('hpCurrent').value = activeChar.hp_current;
  document.getElementById('hpMax').textContent = activeChar.hp_max;
  document.getElementById('charAC').textContent = activeChar.ac;
  document.getElementById('charLevel').textContent = activeChar.level;
  updateHPBar();
  renderCharSidebarStats(); // also calls updateEncumbranceStat
}

// ── Portrait stats tooltip ────────────────────────────────────

// (code déplacé dans /js/game/char-sidebar.js — outils de la fiche : tooltips, jets rapides, sorts)

// ── Socket.io ────────────────────────────────────────────────

// (code déplacé dans /js/game/socket-events.js — connexion + événements socket)

// ── Chat ─────────────────────────────────────────────────────

// (code déplacé dans /js/game/chat.js — chat + tables aléatoires)

// ── Dés ──────────────────────────────────────────────────────

// (code déplacé dans /js/game/dice.js — dés 2D et 3D (Three.js))

// ── Canvas / Carte ────────────────────────────────────────────
let canvas, ctx, currentMap = null, gameTokens = [];
let cam = { x: 0, y: 0, zoom: 1 };
let drag = { active: false, startX: 0, startY: 0, camX: 0, camY: 0 };
let selectedToken = null, draggingToken = false;
let currentTool = 'select';
let drawStrokes = [], drawCurrentStroke = null, drawColor = '#f59e0b', drawWidth = 3;
let showGrid = true;

// ── Zones de sorts ─────────────────────────────────────────────

// (code déplacé dans /js/game/map-extras.js — zones de sorts, objets, optimisation)

// ── Cache images tokens ───────────────────────────────────────

// (code déplacé dans /js/game/token-render.js — cache des images de tokens)

// ── Grille ────────────────────────────────────────────────────

// (code déplacé dans /js/game/map-render.js — grille + dessin des tokens)

// ── Affichage PV sur les tokens ───────────────────────────────

// (code déplacé dans /js/game/map-overlays.js — PV, pings, son de tour, dessin, ciblage)

// ── Interactions souris ───────────────────────────────────────

// (code déplacé dans /js/game/map-interactions.js — interactions souris (jetons, caméra))

// ── Outils ───────────────────────────────────────────────────

// (code déplacé dans /js/game/map-tools.js — outils de la carte (murs, lumières, brouillard…))

// ── Historique des déplacements (Ctrl+Z) ─────────────────────

// (code déplacé dans /js/game/shortcuts.js — raccourcis clavier + Ctrl+Z)

// ── Créateur de Token ─────────────────────────────────────────

// (code déplacé dans /js/game/token-creator.js — créateur + placement de token)

// ── Bibliothèque PNJ D&D 5e ───────────────────────────────────

// (code déplacé dans /js/game/npc-library.js — PNJ D&D 5e (CR 0 → 20+))

// ── Combo-select helpers ──────────────────────────────────────────

// (code déplacé dans /js/game/combo-select.js — listes déroulantes de la fiche)

// ── Encombrement D&D 5e ──────────────────────────────────────

// (code déplacé dans /js/game/sheet-rules.js — encombrement, vision, capacités, PF2e)

// ── Persistance ──────────────────────────────────────────────
function saveWalls() {
  if (!currentMap) return;
  _invalidateVisionAll(); // murs changés → recalcul polygones de vision
  socket?.emit('walls_save', { campaign_id: CAMPAIGN_ID, map_id: currentMap.id, walls: mapWalls });
}
function saveLights() {
  if (!currentMap) return;
  socket?.emit('lights_save', { campaign_id: CAMPAIGN_ID, map_id: currentMap.id, lights: mapLights });
}

// ── Rendu murs ───────────────────────────────────────────────

// (code déplacé dans /js/game/map-walls.js — murs (ligne de vue) et murs d'objets)

// ── Rendu lumières ───────────────────────────────────────────

// (code déplacé dans /js/game/map-lighting.js — lumières, éclairage dynamique, mode nuit)

// ── Utilitaire géométrique ────────────────────────────────────

// (code déplacé dans /js/game/map-vision.js — géométrie des rayons + brouillard de guerre)

// ── Dropdown Vision ──────────────────────────────────────────

// (code déplacé dans /js/game/map-settings.js — réglages de carte, vision, import UVTT)

// ── Ambiances procédurales (Web Audio API) ────────────────────

// (code déplacé dans /js/game/audio-player.js — audio (ambiances, queue, playlists))

// ── Cartes prédéfinies ────────────────────────────────────────

// (code déplacé dans /js/game/map-presets.js — cartes prédéfinies + fonds de carte)

// ── Toggle visibilité du tracker ──────────────────────────────

// (code déplacé dans /js/game/combat-tracker.js — traqueur de combat + initiative)

// ── Item Picker ──────────────────────────────────────────────

// (code déplacé dans /js/game/item-picker.js — modale de sélection d'objets)

// ── Tables D&D 5e (frontend) ─────────────────────────────────

// (code déplacé dans /js/game/gm-tools.js — tables D&D 5e (frontend) + panneau GM)

// ── Toast ────────────────────────────────────────────────────

// (code déplacé dans /js/game/socket-listeners.js — toast + derniers événements temps réel)
