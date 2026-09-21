/* Sodales — logique de page extraite de lobby.html (CSP : plus de script inline) */
// ── Données (maintenant chargées depuis systems.js) ──────────────
let currentCampaignSystem = 'D&D 5e';
function systemStats()  { return getSystemStats(currentCampaignSystem); }
function systemSkills() { return getSystemSkills(currentCampaignSystem); }
function systemRaces()  { return getSystemRaces(currentCampaignSystem); }
function systemClasses() { return getSystemClasses(currentCampaignSystem); }
function systemDef()    { return getSystem(currentCampaignSystem); }

const SYSTEM_RACE_PORTRAITS = {
  "D&D 5e": {
    "Humain": "dnd5e-humain",
    "Elfe": "dnd5e-elfe",
    "Elfe des bois": "dnd5e-elfe-des-bois",
    "Elfe de haute noblesse": "dnd5e-elfe-de-haute-noblesse",
    "Elfe noir (Drow)": "dnd5e-elfe-noir-drow",
    "Nain des collines": "dnd5e-nain-des-collines",
    "Nain des montagnes": "dnd5e-nain-des-montagnes",
    "Halfelin": "dnd5e-halfelin",
    "Gnome des forêts": "dnd5e-gnome-des-forets",
    "Gnome des roches": "dnd5e-gnome-des-roches",
    "Demi-Elfe": "dnd5e-demi-elfe",
    "Demi-Orc": "dnd5e-demi-orc",
    "Tieffelin": "dnd5e-tieffelin",
    "Dragonien": "dnd5e-dragonien",
    "Aasimar": "dnd5e-aasimar",
    "Goliath": "dnd5e-goliath",
    "Triton": "dnd5e-triton",
    "Tabaxi": "dnd5e-tabaxi",
    "Kenku": "dnd5e-kenku",
    "Lizardfolk": "dnd5e-lizardfolk",
    "Tortle": "dnd5e-tortle",
    "Firbolg": "dnd5e-firbolg",
    "Yuan-ti Pureblooded": "dnd5e-yuan-ti-pureblooded",
  },
  "Pathfinder 2e": {
    "Humain": "pf2-humain",
    "Elfe": "pf2-elfe",
    "Nain": "pf2-nain",
    "Halfelin": "pf2-halfelin",
    "Gnome": "pf2-gnome",
    "Orc": "pf2-orc",
    "Gobelin": "pf2-gobelin",
    "Kobold": "pf2-kobold",
    "Ratelin": "pf2-ratelin",
    "Catfolk": "pf2-catfolk",
    "Lézardfolk": "pf2-lezardfolk",
    "Tengu": "pf2-tengu",
    "Demi-Orc": "pf2-demi-orc",
    "Demi-Elfe": "pf2-demi-elfe",
  },
  "Warhammer Fantasy": {
    "Humain": "wh-humain",
    "Nain": "wh-nain",
    "Elfe": "wh-elfe",
    "Halfelin": "wh-halfelin",
    "Haut Elfe": "wh-haut-elfe",
    "Elfe sylvain": "wh-elfe-sylvain",
    "Nain des montagnes": "wh-nain-des-montagnes",
    "Nain des forets": "wh-nain-des-forets",
  },
  "Call of Cthulhu": {
    "Humain": "coc-humain",
  },
  "Starfinder": {
    "Humain": "sf-humain",
    "Androïde": "sf-androide",
    "Ysoki": "sf-ysoki",
    "Kasatha": "sf-kasatha",
    "Shirren": "sf-shirren",
    "Vesk": "sf-vesk",
    "Lashunta": "sf-lashunta",
  },
  "Shadowrun": {
    "Humain": "sr-humain",
    "Elfe": "sr-elfe",
    "Nain": "sr-nain",
    "Orc": "sr-orc",
    "Troll": "sr-troll",
  },
  "Vampire: The Masquerade": {
    "Brujah": "vtm-brujah",
    "Gangrel": "vtm-gangrel",
    "Malkavien": "vtm-malkavien",
    "Nosferatu": "vtm-nosferatu",
    "Toreador": "vtm-toreador",
    "Tremere": "vtm-tremere",
    "Ventrue": "vtm-ventrue",
    "Assamite": "vtm-assamite",
    "Giovanni": "vtm-giovanni",
    "Ravnos": "vtm-ravnos",
    "Setite": "vtm-setite",
    "Tzimisce": "vtm-tzimisce",
    "Lasombra": "vtm-lasombra",
  },
  "Cyberpunk Red": {
    "Humain": "cp-humain",
  },
  "Savage Worlds": {
    "Humain": "sav-humain",
  },
  "Dune": {
    "Humain": "dune-humain",
    "Bene Gesserit": "dune-bene-gesserit",
    "Mentat": "dune-mentat",
    "Sardaukar": "dune-sardaukar",
    "Fremen": "dune-fremen",
    "Navigateur": "dune-navigateur",
    "Ixien": "dune-ixien",
  },
  "Paranoia": {
    "Humain": "paranoia-humain",
    "Clone Alpha": "paranoia-clone-alpha",
    "Clone Beta": "paranoia-clone-beta",
    "Clone Gamma": "paranoia-clone-gamma",
    "Clone Delta": "paranoia-clone-delta",
  },
  "Tomorrow City": {
    "Humain": "tc-humain",
  },
  "Cats! La Mascarade": {
    "Chat de gouttière": "cats-vagabond",
    "Siamois": "cats-siamois",
    "Persan": "cats-persan",
    "Maine Coon": "cats-maine-coon",
    "Bengal": "cats-bengal",
    "Sphynx": "cats-sphynx",
    "Européen": "cats-europeen",
  },
};

const SYSTEM_CLASS_PORTRAITS = {
  "D&D 5e": {
    "Barbare": "dnd5e-barbare",
    "Barde": "dnd5e-barde",
    "Clerc": "dnd5e-clerc",
    "Druide": "dnd5e-druide",
    "Guerrier": "dnd5e-guerrier",
    "Moine": "dnd5e-moine",
    "Paladin": "dnd5e-paladin",
    "Rôdeur": "dnd5e-rodeur",
    "Roublard": "dnd5e-roublard",
    "Ensorceleur": "dnd5e-ensorceleur",
    "Occultiste": "dnd5e-occultiste",
    "Magicien": "dnd5e-magicien",
    "Artificier": "dnd5e-artificier",
    "Sangdragon (Blood Hunter)": "dnd5e-sangdragon-blood-hunter",
  },
  "Pathfinder 2e": {
    "Alchimiste": "pf2-alchimiste",
    "Barbare": "pf2-barbare",
    "Barde": "pf2-barde",
    "Champion": "pf2-champion",
    "Clerc": "pf2-clerc",
    "Druide": "pf2-druide",
    "Ensorceleur": "pf2-ensorceleur",
    "Fighter": "pf2-fighter",
    "Guerrier": "pf2-guerrier",
    "Gourou": "pf2-gourou",
    "Investigator": "pf2-investigator",
    "Magicien": "pf2-magicien",
    "Moine": "pf2-moine",
    "Oracle": "pf2-oracle",
    "Paladin": "pf2-paladin",
    "Rôdeur": "pf2-rodeur",
    "Roublard": "pf2-roublard",
    "Sorcier": "pf2-sorcier",
    "Mage": "pf2-mage",
  },
  "Warhammer Fantasy": {
    "Guerrier": "wh-guerrier",
    "Artisan": "wh-artisan",
    "Roublard": "wh-roublard",
    "Lettré": "wh-lettre",
    "Mystique": "wh-mystique",
    "Roturier": "wh-roturier",
    "Chasseur de primes": "wh-chasseur-de-primes",
    "Mercenaire": "wh-mercenaire",
    "Soldat": "wh-soldat",
    "Templier": "wh-templier",
    "Ingénieur": "wh-ingenieur",
    "Médecin": "wh-medecin",
    "Sorcier": "wh-sorcier",
    "Prêtre": "wh-pretre",
    "Voleur": "wh-voleur",
    "Barde": "wh-barde",
    "Navigateur": "wh-navigateur",
    "Chevalier": "wh-chevalier",
    "Pisteur": "wh-pisteur",
  },
  "Call of Cthulhu": {
    "Archéologue": "coc-archeologue",
    "Artiste": "coc-artiste",
    "Bodyguard": "coc-bodyguard",
    "Chasseur": "coc-chasseur",
    "Détective": "coc-detective",
    "Docteur": "coc-docteur",
    "Écrivain": "coc-ecrivain",
    "Érudit": "coc-erudit",
    "Ingénieur": "coc-ingenieur",
    "Journaliste": "coc-journaliste",
    "Militaire": "coc-militaire",
    "Policier": "coc-policier",
    "Professeur": "coc-professeur",
    "Prêtre": "coc-pretre",
    "Scientifique": "coc-scientifique",
    "Vagabond": "coc-vagabond",
  },
  "Starfinder": {
    "Envoyé": "sf-envoye",
    "Mécaniste": "sf-mecaniste",
    "Mystique": "sf-mystique",
    "Opérateur": "sf-operateur",
    "Solarian": "sf-solarian",
    "Soldat": "sf-soldat",
    "Technomancien": "sf-technomancien",
  },
  "Shadowrun": {
    "Decker": "sr-decker",
    "Mage": "sr-mage",
    "Adepte": "sr-adepte",
    "Face": "sr-face",
    "Samurai": "sr-samurai",
    "Rigger": "sr-rigger",
    "Technomancien": "sr-technomancien",
  },
  "Vampire: The Masquerade": {
    "Ancilla": "vtm-ancilla",
    "Neonate": "vtm-neonate",
    "Elder": "vtm-elder",
    "Primogène": "vtm-primogene",
  },
  "Cyberpunk Red": {
    "Rockeur": "cp-rockeur",
    "Solo": "cp-solo",
    "Netrunner": "cp-netrunner",
    "Tech": "cp-tech",
    "Médic": "cp-medic",
    "Exécutif": "cp-executif",
    "Fixeur": "cp-fixeur",
    "Nomade": "cp-nomade",
  },
  "Savage Worlds": {
    "Combattant": "sav-combattant",
    "Mage": "sav-mage",
    "Voleur": "sav-voleur",
    "Prêtre": "sav-pretre",
    "Noble": "sav-noble",
    "Explorateur": "sav-explorateur",
  },
  "Cats! La Mascarade": {
    "Mascotte": "cats-mascotte",
    "Chasseur": "cats-chasseur",
    "Voyant": "cats-voyant",
    "Protecteur": "cats-protecteur",
    "Espion": "cats-espion",
    "Vagabond": "cats-vagabond",
  },
  "Dune": {
    "Guerrier": "dune-guerrier",
    "Diplomate": "dune-diplomate",
    "Pilote": "dune-pilote",
    "Savant": "dune-savant",
    "Noble": "dune-noble",
    "Mentat": "dune-mentat",
    "Bene Gesserit": "dune-bene-gesserit",
  },
  "Paranoia": {
    "Sécurité": "paranoia-securite",
    "Technologie": "paranoia-technologie",
    "Administration": "paranoia-administration",
    "Médical": "paranoia-medical",
    "Psychique": "paranoia-psychique",
    "Espion": "paranoia-espion",
  },
  "Tomorrow City": {
    "Exécuteur": "tc-executeur",
    "Pirate": "tc-pirate",
    "Médic": "tc-medic",
    "Fixeur": "tc-fixeur",
    "Journaliste": "tc-journaliste",
    "Détective": "tc-detective",
    "Policier": "tc-policier",
  },
};

// ── Combo-select helpers ────────────────────────────────────────
function buildLobbyComboOptions(selId, options, currentVal) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '';
  let hasMatch = false;
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt; o.textContent = opt;
    if (opt === currentVal) { o.selected = true; hasMatch = true; }
    sel.appendChild(o);
  });
  const custom = document.createElement('option');
  custom.value = '__custom__'; custom.textContent = '✏ Saisie libre…';
  if (!hasMatch && currentVal) custom.selected = true;
  sel.appendChild(custom);
}

function onLobbyComboSel(field) {
  const sel   = document.getElementById(`ch-${field}-sel`);
  const input = document.getElementById(`ch-${field}`);
  if (!sel || !input) return;
  if (sel.value === '__custom__') {
    input.style.display = '';
    input.focus();
  } else {
    input.style.display = 'none';
    input.value = '';
  }
  // Auto-portrait + animation quand on sélectionne une race ou une classe
  if ((field === 'race' || field === 'class') && sel.value !== '__custom__' && sel.value) {
    const chosen = sel.value;
    // Carte de correspondance → fichier image (par système de jeu)
    const portraits = field === 'race' ? (SYSTEM_RACE_PORTRAITS[currentCampaignSystem] || {}) : (SYSTEM_CLASS_PORTRAITS[currentCampaignSystem] || {});
    const imgKey = portraits[chosen];
    if (imgKey) {
      const portraitUrl = `/img/${imgKey}-portrait.jpg`;
      const portraitInput = document.getElementById('ch-portrait');
      if (portraitInput) {
        portraitInput.value = portraitUrl;
        updatePortraitPreview();
      }
      // Afficher le lien animation si disponible
      const animLink = document.getElementById('ch-anim-link');
      // Priorité au MP4 Grok (meilleure qualité), puis I2V, fallback GIF
      // (l'I2V de Chat de gouttière montrait un mauvais chat — grok en premier)
      const animPaths = [`/img/${imgKey}-grok.mp4`, `/img/${imgKey}-i2v.mp4`, `/img/${imgKey}-anim.gif`];
      // Cherche l'animation dispo (Grok > I2V > GIF)
      function tryAnim(idx) {
        if (idx >= animPaths.length || !animLink) return;
        fetch(animPaths[idx], { method: 'HEAD' }).then(r => {
          if (r.ok) {
            animLink.style.display = 'inline';
            animLink.href = animPaths[idx];
            const labels = ['🎬 Animation (LTX)', '🎬 Animation (Grok)', '🎬 Voir l\'animation'];
            animLink.textContent = labels[idx] || labels[labels.length-1];
          } else {
            tryAnim(idx + 1);
          }
        }).catch(() => tryAnim(idx + 1));
      }
      tryAnim(0);
    }
  }
}

function loadLobbyComboValue(field, value) {
  const sel   = document.getElementById(`ch-${field}-sel`);
  const input = document.getElementById(`ch-${field}`);
  if (!sel) return;
  if (!value) { sel.selectedIndex = 0; if (input) input.style.display = 'none'; return; }
  let found = false;
  for (const opt of sel.options) {
    if (opt.value === value && opt.value !== '__custom__') { found = true; break; }
  }
  if (found) {
    sel.value = value;
    if (input) { input.style.display = 'none'; input.value = ''; }
  } else {
    sel.value = '__custom__';
    if (input) { input.style.display = ''; input.value = value; }
  }
}

function getLobbyComboValue(field) {
  const sel   = document.getElementById(`ch-${field}-sel`);
  const input = document.getElementById(`ch-${field}`);
  if (!sel) return '';
  if (input && input.style.display !== 'none') return input.value.trim();
  if (sel.value === '__custom__') return input ? input.value.trim() : '';
  return sel.value;
}

let currentCampaignId = null;
let currentCampaignRole = 'player';
let editingCharId = null;
let inventoryItems = [];
let spellItems = [];

// ── Auth ────────────────────────────────────────────────────────
(async () => {
  const token = getToken();
  if (!token) { window.location.href = '/'; return; }
  try {
    const user = await API.auth.me();
    setUser(user);
    document.getElementById('userName').textContent = user.username;
    const av = document.getElementById('userAvatar');
    if (user.avatar_url) { av.innerHTML = `<img src="${user.avatar_url}" alt="${user.username}"/>`; }
    else { av.textContent = user.username[0].toUpperCase(); }
    if (user.is_admin || user.tier === 'admin') {
      document.getElementById('adminLink').style.display = '';
      document.getElementById('adminSep').style.display = '';
    }
    // Masquer le bouton création campagne si le tier est insuffisant
    if (user.tier === 'player') {
      const btn = document.getElementById('createBtn');
      if (btn) btn.style.display = 'none';
    }
  } catch { clearToken(); window.location.href = '/'; }
})();
function logout() { clearToken(); window.location.href = '/'; }

// ── Dropdown header ────────────────────────────────────────────
function toggleDropdown() {
  const menu = document.getElementById('dropdownMenu');
  const chevron = document.getElementById('chevronIcon');
  menu.classList.toggle('open');
  chevron.style.transform = menu.classList.contains('open') ? 'rotate(180deg)' : '';
}
document.addEventListener('click', e => {
  const dd = document.getElementById('userDropdown');
  if (dd && !dd.contains(e.target)) {
    document.getElementById('dropdownMenu').classList.remove('open');
    document.getElementById('chevronIcon').style.transform = '';
  }
});

// ── Modals génériques ──────────────────────────────────────────
function openModal(id) { document.getElementById(`modal-${id}`).classList.add('open'); }
function closeModal(id) { document.getElementById(`modal-${id}`).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); })
);

// ── Charger les campagnes ──────────────────────────────────────
async function loadCampaigns() {
  try {
    const camps = await API.campaigns.list();
    renderCampsList(camps);
  } catch (err) {
    document.getElementById('campsList').innerHTML = `<div class="empty-camps">${err.message}</div>`;
  }
}

function renderCampsList(camps) {
  const el = document.getElementById('campsList');
  if (!camps.length) {
    el.innerHTML = `<div class="empty-camps">Aucune campagne.<br><br>Crée ou rejoins-en une !</div>`;
    return;
  }
  el.innerHTML = camps.map(c => `
    <div class="camp-item" id="camp-item-${c.id}" data-act="selectCampaign" data-a='["${c.id}"]'>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.4rem;">
        <div class="camp-item-name" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.name)}</div>
        <div style="display:flex;align-items:center;gap:.3rem;flex-shrink:0;">
          ${c.role==='gm' ? `<a href="/campaign-settings.html?campaign=${c.id}" data-stop title="Réglages de la campagne" class=\"camp-settings-link\"  >⚙</a>` : ''}
          <span class="role-badge role-${c.role}">${c.role==='gm'?'👑 MJ':'⚔'}</span>
        </div>
      </div>
      <div class="camp-item-meta">
        <span>${esc(c.system)}</span>
        <span>· ${c.member_count} membre${c.member_count>1?'s':''}</span>
      </div>
    </div>`).join('');
}

// ── Sélectionner une campagne ──────────────────────────────────
async function selectCampaign(id) {
  document.querySelectorAll('.camp-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`camp-item-${id}`)?.classList.add('active');
  currentCampaignId = id;
  document.getElementById('detailCol').innerHTML = `<div class="loader" style="padding:3rem;text-align:center"><div class="spinner"></div></div>`;

  try {
    const camp = await API.campaigns.get(id);
    renderCampaignDetail(camp);
  } catch (err) {
    document.getElementById('detailCol').innerHTML = `<div class="detail-empty"><div class="icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function getIntroVideoUrl(systemName) {
  const sys = getSystem(systemName);
  const url = SYSTEM_INTRO_VIDEOS[sys?.label] || SYSTEM_INTRO_VIDEOS[systemName];
  return url || null;
}

function playIntroFromLobby() {
  const url = getIntroVideoUrl(currentCampaignSystem);
  if (url) {
    // Ouvrir la page de jeu avec un paramètre pour forcer l'intro
    window.location.href = `/game.html?campaign=${currentCampaignId}&intro=1`;
  } else {
    alert('Aucune vidéo d\'introduction disponible pour ce système.');
  }
}

function renderCampaignDetail(camp) {
  const isGM = camp.role === 'gm';
  currentCampaignRole = camp.role || 'player';
  currentCampaignSystem = camp.system || 'D&D 5e';
  const myUser = getUser();
  const myChars = camp.characters.filter(c => isGM || c.user_id === myUser.id);

  document.getElementById('detailCol').innerHTML = `
  <div class="detail-wrap">
    <div class="detail-header">
      <div>
        <div class="detail-title">${esc(camp.name)}</div>
        <div class="detail-system">${esc(camp.system)} · <span class="role-badge role-${camp.role}">${camp.role==='gm'?'👑 Maître du jeu':'⚔ Joueur'}</span></div>
        ${camp.description ? `<div class="detail-desc">${esc(camp.description)}</div>` : ''}
      </div>
      ${isGM ? `<span style="font-family:monospace;font-size:.8rem;background:var(--surface2);border:1px solid var(--border);padding:.3rem .7rem;border-radius:6px;color:var(--text2);white-space:nowrap">Code : ${camp.invite_code}</span>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Membres (${camp.members.length})</div>
      <div class="members-row">
        ${camp.members.map(m => `
          <div class="member-chip">
            <div class="member-av">${m.username[0].toUpperCase()}</div>
            <span>${esc(m.username)}</span>
            ${m.role==='gm' ? '<span class="gm-star">👑</span>' : ''}
          </div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">
        Personnages (${myChars.length})
        <button class="btn-xs btn-primary" data-act="openCharModal" data-a='[null]'>＋ Nouveau</button>
      </div>
      <div class="chars-grid" id="charsGrid">
        ${myChars.map(c => renderCharCard(c, isGM || c.user_id === myUser.id)).join('')}
        <div class="char-add-card" data-act="openCharModal" data-a='[null]'>
          <div class="plus">＋</div>
          <span>Nouveau personnage</span>
        </div>
      </div>
    </div>
  </div>

  <div class="enter-game-bar">
    <div style="flex:1;font-size:.85rem;color:var(--text2)">
      ${myChars.length ? `${myChars.length} personnage${myChars.length>1?'s':''} prêt${myChars.length>1?'s':''}` : 'Crée un personnage pour jouer'}
    </div>
    ${(camp.settings?.display_mode === 'map_unique') ? `
      <button class="btn btn-secondary" data-act="open" data-a='["/game.html?campaign=${camp.id}&mode=display", "_blank"]' style="background:rgba(139,92,246,.15);border-color:var(--accent2);color:var(--accent2);">🖥 Carte</button>
    ` : ''}
    ${getIntroVideoUrl(camp.system) ? `<button class="btn btn-secondary" data-act="playIntroFromLobby" style="background:rgba(201,162,39,.1);border-color:var(--accent);color:var(--accent);">🎬 Introduction</button>` : ''}
    <button class="btn btn-primary" data-act="enterGame" data-a='["${camp.id}"]'>⚔ Entrer dans la partie →</button>
  </div>`;
}

function renderCharCard(c, canEdit) {
  const portrait = c.portrait_url
    ? `<img src="${esc(c.portrait_url)}" alt="${esc(c.name)}" data-act="hideSelfShowNext">`
    : '';
  const stats = c.stats || {};
  return `
  <div class="char-card">
    <div class="char-portrait">${portrait}<span style="${c.portrait_url?'display:none':''}display:flex;align-items:center;justify-content:center;width:100%;height:100%">🧙</span></div>
    <div class="char-card-name">${esc(c.name)}</div>
    <div class="char-card-sub">${[c.race, c.class, c.level ? `Niv. ${c.level}` : ''].filter(Boolean).join(' · ')}</div>
    <div class="char-card-stats">
      <span class="char-stat-pill">❤ ${c.hp_current}/${c.hp_max}</span>
      <span class="char-stat-pill">🛡 ${c.ac}</span>
    </div>
    ${canEdit ? `<div class="char-actions">
      <button class="btn-xs btn-secondary" data-act="openCharModal" data-a='["${c.id}"]' data-stop>✏ Éditer</button>
      <button class="btn-xs btn-danger" data-act="deleteChar" data-a='["${c.id}"]' data-stop>🗑</button>
    </div>` : ''}
  </div>`;
}

function enterGame(id) { window.location.href = `/game.html?campaign=${id}`; }

// ── Fiche personnage ──────────────────────────────────────────
function buildStatsGrid() {
  const sys = systemDef();
  document.getElementById('statsGrid').innerHTML = sys.stats.map(s => `
    <div class="stat-box">
      <label>${s.label}</label>
      <input type="number" id="stat-${s.key}" value="${s.default}" min="1" max="99" data-act="updateMod" data-a='["${s.key}"]'/>
      <div class="stat-mod" id="mod-${s.key}">+0</div>
    </div>`).join('');
}

function buildSkillsGrid() {
  document.getElementById('skillsGrid').innerHTML = systemSkills().map(sk => `
    <label class="skill-row">
      <input type="checkbox" id="skill-${sk.name}" value="${sk.name}"/>
      <span>${sk.name}</span>
      <span class="skill-attr">${sk.attr.toUpperCase()}</span>
    </label>`).join('');
}

function updateMod(key) {
  const val = parseInt(document.getElementById(`stat-${key}`).value) || 10;
  const sys = systemDef();
  const statDef = sys.stats.find(s => s.key === key);
  // Certains systèmes (Warhammer, CoC) n'utilisent pas le modificateur (val-10)/2
  const isStandard = !['Warhammer Fantasy','Call of Cthulhu','Shadowrun','Vampire: The Masquerade','Cyberpunk Red','Savage Worlds'].includes(currentCampaignSystem);
  const mod = isStandard ? Math.floor((val - 10) / 2) : Math.floor((val - (statDef?.default || 10)) / 10);
  document.getElementById(`mod-${key}`).textContent = (mod >= 0 ? '+' : '') + mod;
}

function updateAllMods() { systemStats().forEach(s => updateMod(s.key)); }

function switchCharTab(tab) {
  document.querySelectorAll('#charTabs .tab').forEach((t, i) => {
    const tabs = ['identity','stats','skills','inventory','spells','notes'];
    t.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  // Auto-focus le champ de saisie selon l'onglet
  if (tab === 'inventory') setTimeout(() => document.getElementById('inv-input')?.focus(), 50);
}

function openCharModal(charId) {
  editingCharId = charId;
  inventoryItems = [];
  spellItems = [];
  buildStatsGrid();
  buildSkillsGrid();
  switchCharTab('identity');

  const title = charId ? 'Éditer le personnage' : 'Nouveau personnage';
  document.getElementById('char-modal-title').textContent = title;
  document.getElementById('char-alert').style.display = 'none';

  // Initialize combos (reset + build options)
  buildLobbyComboOptions('ch-race-sel',  systemRaces(),   '');
  buildLobbyComboOptions('ch-class-sel', systemClasses(), '');
  // Déclencher le portrait pour la race par défaut (première de la liste)
  setTimeout(() => onLobbyComboSel('race'), 50);
  // Reset
  ['name','portrait'].forEach(f => document.getElementById(`ch-${f}`).value = '');
  document.getElementById('ch-race').value  = '';
  document.getElementById('ch-class').value = '';
  document.getElementById('ch-race').style.display  = 'none';
  document.getElementById('ch-class').style.display = 'none';
  document.getElementById('ch-level').value = 1;
  const _lvlInp = document.getElementById('ch-level');
  const _isPlayer = currentCampaignRole !== 'gm';
  _lvlInp.readOnly = _isPlayer;
  _lvlInp.style.opacity = _isPlayer ? '0.55' : '';
  _lvlInp.style.cursor  = _isPlayer ? 'not-allowed' : '';
  _lvlInp.title = _isPlayer ? 'Le niveau est géré par le MJ via la montée de niveau' : '';
  document.getElementById('ch-hp').value = 10;
  document.getElementById('ch-ac').value = 10;
  document.getElementById('ch-speed').value = 9;
  document.getElementById('ch-init').value = 0;
  document.getElementById('ch-prof').value = 2;
  document.getElementById('ch-gp').value = 0;
  document.getElementById('ch-sp').value = 0;
  document.getElementById('ch-cp').value = 0;
  document.getElementById('ch-notes').value = '';
  document.getElementById('portraitPreview').innerHTML = '🧙';
  renderItemList('inventory');
  renderItemList('spells');

  // ── Adapter le formulaire au système ──
  const sys = systemDef();
  // Afficher/masquer l'onglet sorts
  document.querySelectorAll('#charTabs .tab').forEach((t, i) => {
    const tabs = ['identity','stats','skills','inventory','spells','notes'];
    t.style.display = (tabs[i] === 'spells' && !sys.hasSpells) ? 'none' : '';
  });
  // Masquer le bonus de maîtrise si inutilisé
  const profRow = document.getElementById('ch-prof')?.closest('.form-row');
  if (profRow) profRow.style.display = sys.hasProficiency ? '' : 'none';
  // Adapter les libellés de monnaie
  const money = sys.money || ['po','pa','pc'];
  ['ch-gp','ch-sp','ch-cp'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const label = el.previousElementSibling;
    if (label && money[i]) label.textContent = money[i];
    if (!money[i]) { el.closest('div').style.display = 'none'; }
  });

  if (charId) {
    // Charger les données existantes
    API.characters.list(currentCampaignId).then(chars => {
      const c = chars.find(x => x.id === charId);
      if (!c) return;
      document.getElementById('ch-name').value = c.name || '';
      loadLobbyComboValue('race',  c.race  || '');
      loadLobbyComboValue('class', c.class || '');
      document.getElementById('ch-level').value = c.level || 1;
      document.getElementById('ch-portrait').value = c.portrait_url || '';
      document.getElementById('ch-hp').value     = c.hp_max || 10;
      document.getElementById('ch-ac').value     = c.ac || 10;
      document.getElementById('ch-speed').value  = c.speed || 9;
      document.getElementById('ch-init').value   = c.initiative || 0;
      const stats = c.stats || {};
      const sysDef = systemDef();
      systemStats().forEach(s => {
        const inp = document.getElementById(`stat-${s.key}`);
        const statDef = sysDef.stats.find(st => st.key === s.key);
        if (inp) { inp.value = stats[s.key] || statDef?.default || 10; updateMod(s.key); }
      });
      const skills = c.skills || {};
      Object.keys(skills).forEach(sk => {
        const cb = document.getElementById(`skill-${sk}`);
        if (cb) cb.checked = true;
      });
      // Inventaire : tableau de strings ou objet → normaliser en strings
      const inv = typeof c.inventory === 'string' ? JSON.parse(c.inventory||'[]') : (c.inventory||[]);
      inventoryItems = Array.isArray(inv) ? inv.map(s => typeof s === 'string' ? s : (s.name || '')) : [];

      // Sorts : deux formats possibles
      //   - lobby  : tableau de strings ["Boule de feu", …]
      //   - game   : { list: [{name,level}, …], slots: {…}, slots_used: {…} }
      let rawSpells = typeof c.spells === 'string' ? JSON.parse(c.spells||'[]') : (c.spells||[]);
      if (rawSpells && !Array.isArray(rawSpells) && Array.isArray(rawSpells.list)) {
        rawSpells = rawSpells.list.map(s =>
          typeof s === 'string' ? s : (s.level > 0 ? `${s.name} (niv.${s.level})` : s.name)
        );
      }
      spellItems = Array.isArray(rawSpells) ? rawSpells.map(s => typeof s === 'string' ? s : (s.name || '')) : [];

      renderItemList('inventory'); renderItemList('spells');
      document.getElementById('ch-notes').value = c.notes || '';
      updatePortraitPreview();
    }).catch(() => {});
  }

  openModal('char');
}

function openPortraitPreview() {
  const url = document.getElementById('ch-portrait')?.value.trim();
  if (url) window.open(url, '_blank');
}

function updatePortraitPreview() {
  const url = document.getElementById('ch-portrait').value.trim();
  const preview = document.getElementById('portraitPreview');
  if (url) {
    preview.innerHTML = `<img src="${esc(url)}" alt="Portrait" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" data-act="parentFallback" data-a='["🧙"]'>`;
  } else {
    preview.innerHTML = '🧙';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ch-portrait')?.addEventListener('input', updatePortraitPreview);
});

function addItem(type) {
  // Garantir que les tableaux sont bien des tableaux
  if (!Array.isArray(inventoryItems)) inventoryItems = [];
  if (!Array.isArray(spellItems))     spellItems = [];

  const inputId = type === 'inventory' ? 'inv-input' : 'spell-input';
  const input = document.getElementById(inputId);
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    // Indiquer visuellement que le champ est vide
    input.focus();
    input.style.outline = '2px solid var(--accent)';
    setTimeout(() => { input.style.outline = ''; }, 900);
    return;
  }
  if (type === 'inventory') inventoryItems.push(val);
  else spellItems.push(val);
  renderItemList(type);
  input.value = '';
  input.focus();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'inv-input') { e.preventDefault(); addItem('inventory'); }
});

function removeItem(type, idx) {
  if (type === 'inventory') inventoryItems.splice(idx, 1);
  else spellItems.splice(idx, 1);
  renderItemList(type);
}

function renderItemList(type) {
  const items = type === 'inventory' ? inventoryItems : spellItems;
  const listId = type === 'inventory' ? 'inventoryList' : 'spellList';
  const el = document.getElementById(listId);
  if (!el) return;
  const safeItems = Array.isArray(items) ? items : [];
  el.innerHTML = safeItems.map((item, i) => `
    <div class="item-row">
      <span>${esc(typeof item === 'string' ? item : (item?.name || ''))}</span>
      <button type="button" class="item-del" data-act="removeItem" data-a='["${type}", ${i}]' title="Supprimer">✕</button>
    </div>`).join('');
}

// ── Lobby Spell Picker ──────────────────────────────────────────
let _lspActiveLvl = -1;
let _lspActiveClass = '';

function openLobbySpellPicker() {
  _lspActiveLvl = -1;
  _lspActiveClass = '';
  document.getElementById('lspSearch').value = '';
  buildLobbySpFilters();
  filterLobbySpells();
  document.getElementById('lobbySpellPickerOverlay').classList.add('open');
  setTimeout(() => document.getElementById('lspSearch').focus(), 80);
}

function closeLobbySpellPicker() {
  document.getElementById('lobbySpellPickerOverlay').classList.remove('open');
}

function buildLobbySpFilters() {
  const c = document.getElementById('lspFilters');
  c.innerHTML = '';
  const allLvl = document.createElement('button');
  allLvl.type = 'button';
  allLvl.className = 'sp-filter-btn on'; allLvl.textContent = 'Tous niveaux';
  allLvl.onclick = () => { _lspActiveLvl = -1; refreshLobbySpFilterBtns(); filterLobbySpells(); };
  c.appendChild(allLvl);
  for (let l = 0; l <= 9; l++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sp-filter-btn';
    b.textContent = l === 0 ? 'Cantrip' : `Niv ${l}`;
    b.dataset.lvl = l;
    b.onclick = () => { _lspActiveLvl = l; refreshLobbySpFilterBtns(); filterLobbySpells(); };
    c.appendChild(b);
  }
  const sep = document.createElement('span');
  sep.style.cssText = 'width:1px;background:var(--border);height:18px;margin:0 .1rem;';
  c.appendChild(sep);
  const allCls = document.createElement('button');
  allCls.type = 'button';
  allCls.className = 'sp-filter-btn on'; allCls.textContent = 'Toutes classes';
  allCls.dataset.cls = '';
  allCls.onclick = () => { _lspActiveClass = ''; refreshLobbySpFilterBtns(); filterLobbySpells(); };
  c.appendChild(allCls);
  const SP_CLASSES = ['B','C','D','E','M','O','P','R'];
  const SP_CLASS_NAMES = {B:'Barde',C:'Clerc',D:'Druide',E:'Ensorceleur',M:'Magicien',O:'Occultiste',P:'Paladin',R:'Rôdeur'};
  SP_CLASSES.forEach(cl => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sp-filter-btn';
    b.textContent = SP_CLASS_NAMES[cl];
    b.dataset.cls = cl;
    b.onclick = () => { _lspActiveClass = cl; refreshLobbySpFilterBtns(); filterLobbySpells(); };
    c.appendChild(b);
  });
  refreshLobbySpFilterBtns();
}

function refreshLobbySpFilterBtns() {
  document.querySelectorAll('#lspFilters .sp-filter-btn').forEach(b => {
    if (b.textContent === 'Tous niveaux') { b.classList.toggle('on', _lspActiveLvl === -1); return; }
    if (b.textContent === 'Toutes classes') { b.classList.toggle('on', _lspActiveClass === ''); return; }
    if (b.dataset.lvl !== undefined) b.classList.toggle('on', _lspActiveLvl === parseInt(b.dataset.lvl));
    if (b.dataset.cls !== undefined) b.classList.toggle('on', _lspActiveClass === b.dataset.cls);
  });
}

function filterLobbySpells() {
  const SP_CLASS_NAMES = {B:'Barde',C:'Clerc',D:'Druide',E:'Ensorceleur',M:'Magicien',O:'Occultiste',P:'Paladin',R:'Rôdeur'};
  const SP_SCHOOL_NAMES = {Abj:'Abjuration',Invo:'Invocation',Div:'Divination',Ench:'Enchantement',Évoc:'Évocation',Illu:'Illusion',Nécr:'Nécromancie',Tran:'Transmutation'};
  const q = (document.getElementById('lspSearch').value || '').toLowerCase().trim();
  const list = document.getElementById('lspList');
  const results = SPELLS_DB.filter(([name, lvl, school, classes]) => {
    if (_lspActiveLvl !== -1 && lvl !== _lspActiveLvl) return false;
    if (_lspActiveClass && !classes.includes(_lspActiveClass)) return false;
    if (q && !name.toLowerCase().includes(q)) return false;
    return true;
  });
  if (!results.length) {
    list.innerHTML = `<div class="sp-empty">Aucun sort trouvé.<br><span style="font-size:.78rem">Utilisez la saisie manuelle ci-dessous.</span></div>`;
    if (q) { const mn = document.getElementById('lspManualName'); if (mn) mn.value = q.charAt(0).toUpperCase() + q.slice(1); }
    return;
  }
  list.innerHTML = '';
  results.slice(0, 120).forEach(([name, lvl, school, classes]) => {
    const lvlLabel = lvl === 0 ? 'Cntrp' : `Niv ${lvl}`;
    const classNames = classes.split('').map(c => SP_CLASS_NAMES[c] || c).join(', ');
    const div = document.createElement('div');
    div.className = 'sp-item';
    div.innerHTML = `<span class="sp-item-lvl">${lvlLabel}</span>
      <span class="sp-item-name">${esc(name)}</span>
      <span class="sp-item-school">${SP_SCHOOL_NAMES[school] || school}</span>
      <span class="sp-item-classes">${classNames}</span>`;
    div.addEventListener('click', () => {
      const label = lvl === 0 ? `${name} (cantrip)` : `${name} (niv.${lvl})`;
      if (!Array.isArray(spellItems)) spellItems = [];
      spellItems.push(label);
      renderItemList('spells');
      closeLobbySpellPicker();
    });
    list.appendChild(div);
  });
}

function addLobbySpellManual() {
  const nameEl = document.getElementById('lspManualName');
  const lvlEl  = document.getElementById('lspManualLvl');
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }
  const lvl = parseInt(lvlEl.value) || 0;
  const label = lvl === 0 ? `${name} (cantrip)` : `${name} (niv.${lvl})`;
  if (!Array.isArray(spellItems)) spellItems = [];
  spellItems.push(label);
  renderItemList('spells');
  nameEl.value = '';
  closeLobbySpellPicker();
}

async function saveCharacter() {
  const name = document.getElementById('ch-name').value.trim();
  if (!name) {
    document.getElementById('char-alert').textContent = 'Le nom est obligatoire';
    document.getElementById('char-alert').style.display = 'block';
    switchCharTab('identity');
    return;
  }

  const stats = {};
  systemStats().forEach(s => { stats[s.key] = parseInt(document.getElementById(`stat-${s.key}`)?.value) || 10; });

  const skills = {};
  systemSkills().forEach(sk => {
    if (document.getElementById(`skill-${sk.name}`)?.checked) skills[sk.name] = true;
  });

  const payload = {
    name,
    race:        getLobbyComboValue('race')  || null,
    class:       getLobbyComboValue('class') || null,
    level:       parseInt(document.getElementById('ch-level').value) || 1,
    hp_max:      parseInt(document.getElementById('ch-hp').value) || 10,
    hp_current:  parseInt(document.getElementById('ch-hp').value) || 10,
    ac:          parseInt(document.getElementById('ch-ac').value) || 10,
    speed:       parseInt(document.getElementById('ch-speed').value) || 9,
    initiative:  parseInt(document.getElementById('ch-init').value) || 0,
    stats, skills,
    inventory:   inventoryItems,
    spells:      spellItems,
    notes:       document.getElementById('ch-notes').value.trim() || null,
    portrait_url: document.getElementById('ch-portrait').value.trim() || null,
    system_data: { system: currentCampaignSystem },
  };

  const btn = document.getElementById('btn-save-char');
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  document.getElementById('char-alert').style.display = 'none';

  try {
    if (editingCharId) {
      await API.characters.update(currentCampaignId, editingCharId, payload);
    } else {
      await API.characters.create(currentCampaignId, payload);
    }
    closeModal('char');
    await selectCampaign(currentCampaignId); // Rafraîchir
  } catch (err) {
    document.getElementById('char-alert').textContent = err.message;
    document.getElementById('char-alert').style.display = 'block';
  }
  btn.disabled = false; btn.textContent = 'Enregistrer';
}

async function deleteChar(charId) {
  if (!confirm('Supprimer ce personnage ? Cette action est irréversible.')) return;
  try {
    await API.characters.delete(currentCampaignId, charId);
    await selectCampaign(currentCampaignId);
  } catch (err) { alert(err.message); }
}

// ── Créer campagne ─────────────────────────────────────────────
async function doCreate(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-create');
  const alertEl = document.getElementById('create-alert');
  alertEl.style.display = 'none'; btn.disabled = true; btn.textContent = 'Création…';
  try {
    const camp = await API.campaigns.create({
      name: document.getElementById('c-name').value,
      system: document.getElementById('c-system').value,
      description: document.getElementById('c-desc').value,
    });
    closeModal('create');
    document.getElementById('c-name').value = '';
    document.getElementById('c-desc').value = '';
    await loadCampaigns();
    selectCampaign(camp.id);
  } catch (err) { alertEl.textContent = err.message; alertEl.style.display = 'block'; }
  btn.disabled = false; btn.textContent = 'Créer';
}

// ── Rejoindre campagne ─────────────────────────────────────────
async function doJoin(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-join');
  const alertEl = document.getElementById('join-alert');
  alertEl.style.display = 'none'; btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    const camp = await API.campaigns.join(document.getElementById('j-code').value);
    closeModal('join');
    document.getElementById('j-code').value = '';
    await loadCampaigns();
    selectCampaign(camp.id);
  } catch (err) { alertEl.textContent = err.message; alertEl.style.display = 'block'; }
  btn.disabled = false; btn.textContent = 'Rejoindre';
}

function showSystemDesc() {
  const sel = document.getElementById('c-system');
  const descEl = document.getElementById('sysDesc');
  if (!sel || !descEl) return;
  const sys = getSystem(sel.value);
  if (sys && sys.desc) {
    descEl.innerHTML = `<span class="sys-logo">${sys.logo || '🎲'}</span><span class="sys-text"><strong>${sys.label}</strong> — ${sys.desc}</span>`;
  } else {
    descEl.innerHTML = '<span class="sys-text">Sélectionnez un système pour voir sa description.</span>';
  }
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Upload image générique ──────────────────────────────────────
async function uploadImage(fileInput, urlFieldId, onDone) {
  const file = fileInput.files[0];
  if (!file) return;
  const label = fileInput.previousElementSibling; // le <label> bouton
  label.textContent = '⏳';
  label.classList.add('loading');
  try {
    const { url } = await API.upload(file);
    document.getElementById(urlFieldId).value = url;
    if (onDone) onDone();
  } catch (err) {
    alert('Upload échoué : ' + err.message);
  } finally {
    label.textContent = '📎';
    label.classList.remove('loading');
    fileInput.value = '';
  }
}

loadCampaigns();

// ── Code d'invitation personnel ────────────────────────────
function showInviteCode() {
  const user = getUser();
  if (!user?.invite_code) {
    // Rafraîchir depuis l'API au cas où
    API.auth.me().then(u => {
      setUser(u);
      _showInviteModal(u.invite_code);
    }).catch(() => alert('Impossible de récupérer votre code.'));
    return;
  }
  _showInviteModal(user.invite_code);
}
function _showInviteModal(code) {
  document.getElementById('myInviteCode').textContent = code || '—';
  document.getElementById('modal-invite').classList.add('open');
}
function copyInviteCode() {
  const code = document.getElementById('myInviteCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('btnCopyInvite');
    btn.textContent = '✓ Copié !';
    setTimeout(() => btn.textContent = '📋 Copier', 2000);
  });
}
