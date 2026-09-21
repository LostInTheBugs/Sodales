/**
 * Sodales — bibliothèque de PNJ D&D 5e (partie extraite de game.html)
 * Données CR 0 → CR 20+ et modale de sélection.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
const DND5E_IMG = 'https://www.dnd5eapi.co/api/2014/images/monsters/';
function dndImg(slug) { return DND5E_IMG + slug + '.png'; }

const NPC_TYPE_COLOR = {
  'Humanoïde':    '#c9a227', 'Mort-vivant': '#7c3aed', 'Bête':         '#16a34a',
  'Monstruosité': '#92400e', 'Dragon':      '#dc2626', 'Fiélon':       '#9f1239',
  'Élémentaire':  '#ea580c', 'Géant':       '#78350f', 'Aberration':   '#1d4ed8',
  'Céleste':      '#eab308', 'Fée':         '#a855f7', 'Vase':         '#0d9488',
  'Plante':       '#15803d', 'Artificiel':  '#6b7280',
};
const NPC_TYPE_ICON = {
  'Humanoïde':'👤','Mort-vivant':'💀','Bête':'🐺','Monstruosité':'👾',
  'Dragon':'🐉','Fiélon':'😈','Élémentaire':'🔥','Géant':'🏔',
  'Aberration':'🦑','Céleste':'✨','Fée':'🌿','Vase':'🫧',
  'Plante':'🌵','Artificiel':'🤖',
};
function crLabel(cr) {
  if (cr === 0.125) return '1/8';
  if (cr === 0.25)  return '1/4';
  if (cr === 0.5)   return '1/2';
  return String(cr);
}
function crSort(cr) { return cr; }

const NPC_LIBRARY = [
  // ── CR 0 ──
  {name:'Rat',              type:'Bête',         cr:0,     hp:1,  ac:10, size:1, icon:'🐀', img:dndImg('rat')},
  {name:'Araignée',         type:'Bête',         cr:0,     hp:1,  ac:12, size:1, icon:'🕷', img:dndImg('spider')},
  {name:'Corbeau',          type:'Bête',         cr:0,     hp:1,  ac:12, size:1, icon:'🐦', img:dndImg('raven')},
  {name:'Crapaud',          type:'Bête',         cr:0,     hp:1,  ac:11, size:1, icon:'🐸', img:dndImg('frog')},
  {name:'Chat',             type:'Bête',         cr:0,     hp:2,  ac:12, size:1, icon:'🐱', img:dndImg('cat')},
  // ── CR 1/8 ──
  {name:'Bandit',           type:'Humanoïde',    cr:0.125, hp:11, ac:12, size:1, img:dndImg('bandit')},
  {name:'Roturier',         type:'Humanoïde',    cr:0,     hp:4,  ac:10, size:1, img:dndImg('commoner')},
  {name:'Garde',            type:'Humanoïde',    cr:0.125, hp:11, ac:16, size:1, img:dndImg('guard')},
  {name:'Kobold',           type:'Humanoïde',    cr:0.125, hp:5,  ac:12, size:1, icon:'🦎', img:dndImg('kobold')},
  {name:'Gobelin',          type:'Humanoïde',    cr:0.125, hp:7,  ac:15, size:1, icon:'👺', img:dndImg('goblin')},
  {name:'Cultiste',         type:'Humanoïde',    cr:0.125, hp:9,  ac:12, size:1, img:dndImg('cultist')},
  {name:'Acolyte',          type:'Humanoïde',    cr:0.25,  hp:9,  ac:10, size:1, img:dndImg('acolyte')},
  // ── CR 1/4 ──
  {name:'Squelette',        type:'Mort-vivant',  cr:0.25,  hp:13, ac:13, size:1, icon:'💀', img:dndImg('skeleton')},
  {name:'Zombie',           type:'Mort-vivant',  cr:0.25,  hp:22, ac:8,  size:1, icon:'🧟', img:dndImg('zombie')},
  {name:'Loup',             type:'Bête',         cr:0.25,  hp:11, ac:13, size:1, icon:'🐺', img:dndImg('wolf')},
  {name:'Éclaireur',        type:'Humanoïde',    cr:0.5,   hp:16, ac:13, size:1, img:dndImg('scout')},
  {name:'Rat géant',        type:'Bête',         cr:0.125, hp:7,  ac:12, size:1, icon:'🐀', img:dndImg('giant-rat')},
  {name:'Araignée géante',  type:'Bête',         cr:1,     hp:26, ac:14, size:1, icon:'🕷', img:dndImg('giant-spider')},
  {name:'Troglodyte',       type:'Humanoïde',    cr:0.25,  hp:13, ac:11, size:1, img:dndImg('troglodyte')},
  // ── CR 1/2 ──
  {name:'Orc',              type:'Humanoïde',    cr:0.5,   hp:15, ac:13, size:1, img:dndImg('orc')},
  {name:'Capitaine bandit', type:'Humanoïde',    cr:2,     hp:65, ac:15, size:1, img:dndImg('bandit-captain')},
  {name:'Worg',             type:'Bête',         cr:0.5,   hp:26, ac:13, size:1, icon:'🐺', img:dndImg('worg')},
  {name:'Gnoll',            type:'Humanoïde',    cr:0.5,   hp:22, ac:15, size:1, img:dndImg('gnoll')},
  {name:'Hobgobelin',       type:'Humanoïde',    cr:0.5,   hp:11, ac:18, size:1, img:dndImg('hobgoblin')},
  // ── CR 1 ──
  {name:'Bugbear',          type:'Humanoïde',    cr:1,     hp:27, ac:16, size:1, icon:'🧌', img:dndImg('bugbear')},
  {name:'Goule',            type:'Mort-vivant',  cr:1,     hp:22, ac:12, size:1, icon:'💀', img:dndImg('ghoul')},
  {name:'Harpie',           type:'Monstruosité', cr:1,     hp:38, ac:11, size:1, icon:'🦅', img:dndImg('harpy')},
  {name:'Chef gobelin',     type:'Humanoïde',    cr:1,     hp:21, ac:17, size:1, icon:'👺', img:dndImg('goblin-boss')},
  {name:'Diablotin',        type:'Fiélon',       cr:1,     hp:10, ac:13, size:1, icon:'😈', img:dndImg('imp')},
  {name:'Spectre',          type:'Mort-vivant',  cr:1,     hp:22, ac:12, size:1, icon:'👻', img:dndImg('specter')},
  {name:'Espion',           type:'Humanoïde',    cr:1,     hp:27, ac:12, size:1, img:dndImg('spy')},
  {name:'Loup géant',       type:'Bête',         cr:1,     hp:37, ac:14, size:1, icon:'🐺', img:dndImg('dire-wolf')},
  {name:'Dryade',           type:'Fée',          cr:1,     hp:22, ac:11, size:1, icon:'🌿', img:dndImg('dryad')},
  {name:'Satyre',           type:'Fée',          cr:0.5,   hp:31, ac:14, size:1, icon:'🌿', img:dndImg('satyr')},
  {name:'Fantôme',          type:'Mort-vivant',  cr:4,     hp:45, ac:11, size:1, icon:'👻', img:dndImg('ghost')},
  // ── CR 2 ──
  {name:'Berserker',        type:'Humanoïde',    cr:2,     hp:67, ac:13, size:1, img:dndImg('berserker')},
  {name:'Cube gélatineux',  type:'Vase',         cr:2,     hp:84, ac:6,  size:2, icon:'🫧', img:dndImg('gelatinous-cube')},
  {name:'Ettercap',         type:'Monstruosité', cr:2,     hp:44, ac:13, size:1, icon:'🕷', img:dndImg('ettercap')},
  {name:'Gargouille',       type:'Élémentaire',  cr:2,     hp:52, ac:15, size:1, icon:'🗿', img:dndImg('gargoyle')},
  {name:'Ghast',            type:'Mort-vivant',  cr:2,     hp:36, ac:13, size:1, icon:'💀', img:dndImg('ghast')},
  {name:'Ogre',             type:'Géant',        cr:2,     hp:59, ac:11, size:2, icon:'🏔', img:dndImg('ogre')},
  {name:'Ankheg',           type:'Monstruosité', cr:2,     hp:39, ac:14, size:2, icon:'🦂', img:dndImg('ankheg')},
  {name:'Nothique',         type:'Aberration',   cr:2,     hp:45, ac:15, size:1, icon:'🦑', img:dndImg('nothic')},
  // ── CR 3 ──
  {name:'Doppelganger',     type:'Monstruosité', cr:3,     hp:52, ac:14, size:1, icon:'👤', img:dndImg('doppelganger')},
  {name:'Sorcière verte',   type:'Fée',          cr:3,     hp:82, ac:17, size:1, icon:'🌿', img:dndImg('green-hag')},
  {name:'Manticore',        type:'Monstruosité', cr:3,     hp:68, ac:14, size:2, icon:'🦁', img:dndImg('manticore')},
  {name:'Minotaure',        type:'Monstruosité', cr:3,     hp:114,ac:14, size:2, icon:'🐂', img:dndImg('minotaur')},
  {name:'Hibours',          type:'Monstruosité', cr:3,     hp:114,ac:13, size:2, icon:'🐻', img:dndImg('owlbear')},
  {name:'Phase Spider',     type:'Monstruosité', cr:3,     hp:32, ac:13, size:2, icon:'🕷', img:dndImg('phase-spider')},
  {name:'Larve vampire',    type:'Mort-vivant',  cr:5,     hp:82, ac:15, size:1, icon:'💀', img:dndImg('vampire-spawn')},
  {name:'Revenant',         type:'Mort-vivant',  cr:5,     hp:136,ac:13, size:1, icon:'👻', img:dndImg('revenant')},
  {name:'Yuan-ti',          type:'Monstruosité', cr:1,     hp:40, ac:11, size:1, icon:'🐍', img:dndImg('yuan-ti-pureblood')},
  {name:'Loup-garou',       type:'Humanoïde',    cr:3,     hp:58, ac:12, size:1, icon:'🐺', img:dndImg('werewolf')},
  {name:'Momie',            type:'Mort-vivant',  cr:3,     hp:58, ac:11, size:1, icon:'💀', img:dndImg('mummy')},
  // ── CR 4 ──
  {name:'Banshee',          type:'Mort-vivant',  cr:4,     hp:58, ac:12, size:1, icon:'👻', img:dndImg('banshee')},
  {name:'Chuul',            type:'Aberration',   cr:4,     hp:93, ac:16, size:2, icon:'🦑', img:dndImg('chuul')},
  {name:'Ettin',            type:'Géant',        cr:4,     hp:85, ac:12, size:2, icon:'🏔', img:dndImg('ettin')},
  {name:'Lamie',            type:'Monstruosité', cr:4,     hp:97, ac:13, size:2, icon:'🐍', img:dndImg('lamia')},
  // ── CR 5 ──
  {name:'Élémentaire Air',  type:'Élémentaire',  cr:5,     hp:90, ac:15, size:2, icon:'💨', img:dndImg('air-elemental')},
  {name:'Élémentaire Eau',  type:'Élémentaire',  cr:5,     hp:114,ac:14, size:2, icon:'💧', img:dndImg('water-elemental')},
  {name:'Élémentaire Feu',  type:'Élémentaire',  cr:5,     hp:102,ac:13, size:2, icon:'🔥', img:dndImg('fire-elemental')},
  {name:'Élémentaire Terre',type:'Élémentaire',  cr:5,     hp:126,ac:17, size:2, icon:'🪨', img:dndImg('earth-elemental')},
  {name:'Golem de chair',   type:'Artificiel',   cr:5,     hp:93, ac:9,  size:2, icon:'🤖', img:dndImg('flesh-golem')},
  {name:'Géant des collines',type:'Géant',       cr:5,     hp:105,ac:13, size:3, icon:'🏔', img:dndImg('hill-giant')},
  {name:'Troll',            type:'Géant',        cr:5,     hp:84, ac:15, size:2, icon:'🧌', img:dndImg('troll')},
  {name:'Méduse',           type:'Monstruosité', cr:6,     hp:127,ac:15, size:1, img:dndImg('medusa')},
  // ── CR 6 ──
  {name:'Chimère',          type:'Monstruosité', cr:6,     hp:114,ac:12, size:2, icon:'🦁', img:dndImg('chimera')},
  {name:'Cyclope',          type:'Géant',        cr:6,     hp:138,ac:14, size:3, icon:'🏔', img:dndImg('cyclops')},
  {name:'Drider',           type:'Monstruosité', cr:6,     hp:123,ac:19, size:2, icon:'🕷', img:dndImg('drider')},
  {name:'Wyverne',          type:'Dragon',       cr:6,     hp:110,ac:13, size:2, icon:'🐉', img:dndImg('wyvern')},
  // ── CR 7–8 ──
  {name:'Oni',              type:'Géant',        cr:7,     hp:110,ac:16, size:2, icon:'👹', img:dndImg('oni')},
  {name:'Géant de pierre',  type:'Géant',        cr:7,     hp:126,ac:17, size:3, icon:'🏔', img:dndImg('stone-giant')},
  {name:'Géant du givre',   type:'Géant',        cr:8,     hp:138,ac:15, size:3, icon:'❄️', img:dndImg('frost-giant')},
  // ── CR 8–10 ──
  {name:'Flagelleur mental',type:'Aberration',   cr:7,     hp:71, ac:15, size:1, icon:'🦑', img:dndImg('mind-flayer')},
  {name:'Géant de nuage',   type:'Géant',        cr:9,     hp:200,ac:14, size:3, icon:'☁️', img:dndImg('cloud-giant')},
  {name:'Géant du feu',     type:'Géant',        cr:9,     hp:162,ac:18, size:3, icon:'🔥', img:dndImg('fire-giant')},
  {name:'Golem de pierre',  type:'Artificiel',   cr:10,    hp:178,ac:17, size:2, icon:'🤖', img:dndImg('stone-golem')},
  {name:'Golem d\'argile',  type:'Artificiel',   cr:9,     hp:133,ac:14, size:2, icon:'🤖', img:dndImg('clay-golem')},
  {name:'Golem de fer',     type:'Artificiel',   cr:16,    hp:210,ac:20, size:2, icon:'🤖', img:dndImg('iron-golem')},
  // ── CR 11–13 ──
  {name:'Djinn',            type:'Élémentaire',  cr:11,    hp:161,ac:17, size:2, icon:'💨', img:dndImg('djinni')},
  {name:'Éfrit',            type:'Élémentaire',  cr:11,    hp:200,ac:17, size:2, icon:'🔥', img:dndImg('efreeti')},
  {name:'Marid',            type:'Élémentaire',  cr:11,    hp:229,ac:17, size:2, icon:'💧', img:dndImg('marid')},
  {name:'Diable barbu',     type:'Fiélon',       cr:5,     hp:110,ac:13, size:1, icon:'😈', img:dndImg('bearded-devil')},
  {name:'Diable cornu',     type:'Fiélon',       cr:11,    hp:148,ac:18, size:2, icon:'😈', img:dndImg('horned-devil')},
  {name:'Archimage',        type:'Humanoïde',    cr:12,    hp:99, ac:15, size:1, img:dndImg('archmage')},
  {name:'Géant des tempêtes',type:'Géant',       cr:13,    hp:230,ac:16, size:3, icon:'⚡', img:dndImg('storm-giant')},
  {name:'Vampire',          type:'Mort-vivant',  cr:13,    hp:144,ac:16, size:1, icon:'🧛', img:dndImg('vampire')},
  {name:'Nalfeshnée',       type:'Fiélon',       cr:13,    hp:184,ac:18, size:2, icon:'😈', img:dndImg('nalfeshnee')},
  // ── Dragons ──
  {name:'Jeune dragon rouge',type:'Dragon',      cr:10,    hp:178,ac:18, size:2, icon:'🐉', img:dndImg('young-red-dragon')},
  {name:'Jeune dragon vert', type:'Dragon',      cr:8,     hp:136,ac:18, size:2, icon:'🐉', img:dndImg('young-green-dragon')},
  {name:'Jeune dragon bleu', type:'Dragon',      cr:9,     hp:152,ac:18, size:2, icon:'🐉', img:dndImg('young-blue-dragon')},
  {name:'Jeune dragon blanc',type:'Dragon',      cr:6,     hp:133,ac:17, size:2, icon:'🐉', img:dndImg('young-white-dragon')},
  {name:'Jeune dragon or',   type:'Dragon',      cr:10,    hp:178,ac:18, size:2, icon:'🐉', img:dndImg('young-gold-dragon')},
  {name:'Dragon adulte rouge',type:'Dragon',     cr:17,    hp:256,ac:19, size:3, icon:'🐉', img:dndImg('adult-red-dragon')},
  {name:'Dragon adulte vert', type:'Dragon',     cr:15,    hp:207,ac:19, size:3, icon:'🐉', img:dndImg('adult-green-dragon')},
  {name:'Dragon adulte or',   type:'Dragon',     cr:17,    hp:256,ac:19, size:3, icon:'🐉', img:dndImg('adult-gold-dragon')},
  {name:'Dragon ancien rouge',type:'Dragon',     cr:24,    hp:546,ac:22, size:3, icon:'🐉', img:dndImg('ancient-red-dragon')},
  {name:'Dragon ancien or',   type:'Dragon',     cr:24,    hp:546,ac:22, size:3, icon:'🐉', img:dndImg('ancient-gold-dragon')},
  // ── CR 20+ ──
  {name:'Liche',            type:'Mort-vivant',  cr:21,    hp:135,ac:17, size:1, icon:'💀', img:dndImg('lich')},
  {name:'Pit fiend',        type:'Fiélon',       cr:20,    hp:300,ac:19, size:2, icon:'😈', img:dndImg('pit-fiend')},
  {name:'Balor',            type:'Fiélon',       cr:19,    hp:262,ac:19, size:2, icon:'😈', img:dndImg('balor')},
  {name:'Marilith',         type:'Fiélon',       cr:16,    hp:189,ac:18, size:2, icon:'😈', img:dndImg('marilith')},
  {name:'Tarrasque',        type:'Monstruosité', cr:30,    hp:676,ac:25, size:3, icon:'👾', img:dndImg('tarrasque')},
];

let npcLibFiltered = [...NPC_LIBRARY];

function openNpcLib() {
  document.getElementById('npcSearch').value = '';
  document.getElementById('npcFilterCR').value = '';
  document.getElementById('npcFilterType').value = '';
  filterNpcLib();
  document.getElementById('modal-npc-lib').classList.add('open');
}

function closeNpcLib() {
  document.getElementById('modal-npc-lib').classList.remove('open');
}

function filterNpcLib() {
  const q    = document.getElementById('npcSearch').value.toLowerCase();
  const crF  = document.getElementById('npcFilterCR').value;
  const typeF= document.getElementById('npcFilterType').value;

  npcLibFiltered = NPC_LIBRARY.filter(n => {
    if (q && !n.name.toLowerCase().includes(q) && !n.type.toLowerCase().includes(q)) return false;
    if (typeF && n.type !== typeF) return false;
    if (crF !== '') {
      const crVal = parseFloat(crF);
      if (crVal === 0 && n.cr !== 0) return false;
      if (crVal === 0.125 && n.cr !== 0.125) return false;
      if (crVal === 0.25  && n.cr !== 0.25)  return false;
      if (crVal === 0.5   && n.cr !== 0.5)   return false;
      if (crVal === 1  && n.cr !== 1)  return false;
      if (crVal === 2  && n.cr !== 2)  return false;
      if (crVal === 3  && n.cr !== 3)  return false;
      if (crVal === 4  && n.cr !== 4)  return false;
      if (crVal === 5  && n.cr !== 5)  return false;
      if (crVal === 6  && (n.cr < 6  || n.cr > 8))  return false;
      if (crVal === 9  && (n.cr < 9  || n.cr > 12)) return false;
      if (crVal === 13 && n.cr < 13) return false;
    }
    return true;
  });
  renderNpcGrid();
}

function renderNpcGrid() {
  const grid = document.getElementById('npcGrid');
  if (!npcLibFiltered.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text2);padding:2rem;font-size:.85rem;">Aucun résultat</div>';
    return;
  }
  grid.innerHTML = npcLibFiltered.map((n, i) => {
    const color = NPC_TYPE_COLOR[n.type] || '#c9a227';
    const icon  = n.icon || NPC_TYPE_ICON[n.type] || '👤';
    return `<div class="npc-card" data-act="selectNpcFromLib" data-a='[${i}]'>
      <div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.3rem;">
        <div class="npc-card-icon" style="background:${color}22;font-size:1rem;width:28px;height:28px;min-width:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;">${icon}</div>
        <div>
          <div class="npc-card-name">${esc(n.name)}</div>
          <span class="npc-card-cr">CR ${crLabel(n.cr)}</span>
        </div>
      </div>
      <div class="npc-card-meta">${esc(n.type)}<br/>❤ ${n.hp} · 🛡 ${n.ac}</div>
    </div>`;
  }).join('');
}

function selectNpcFromLib(idx) {
  const n = npcLibFiltered[idx];
  if (!n) return;
  document.getElementById('tk-label').value = n.name;
  document.getElementById('tk-hp').value    = n.hp;
  document.getElementById('tk-image').value = n.img || '';
  document.getElementById('tk-color').value = NPC_TYPE_COLOR[n.type] || '#c9a227';
  document.getElementById('tk-size').value  = String(Math.min(3, n.size || 1));
  closeNpcLib();
}

function closeTokenModal() {
  document.getElementById('modal-token').classList.remove('open');
  placingToken = false;
  canvas.classList.remove('placing');
  canvas.onclick = null;
}

function onTkCharChange() {
  const charId = document.getElementById('tk-char').value;
  document.getElementById('tk-npc-fields').style.display = charId ? 'none' : '';
  if (charId) {
    // Pré-remplir label depuis le nom du perso
    const char = (myRole === 'gm' ? (campaign?.characters || []) : myChars).find(c => c.id === charId)
      || { name: document.getElementById('tk-char').selectedOptions[0]?.text };
    if (char) document.getElementById('tk-label').value = char.name || '';
  }
}

function doPlaceToken(e) {
  e.preventDefault();
  if (!placingPos || !socket) return;
  const charId = document.getElementById('tk-char').value || null;
  const hpRaw  = document.getElementById('tk-hp').value;
  const hpNum  = hpRaw !== '' ? parseInt(hpRaw) : null;
  socket.emit('token_create', {
    campaign_id: CAMPAIGN_ID,
    map_id: currentMap?.id,
    character_id: charId,
    label: document.getElementById('tk-label').value || 'Token',
    color: document.getElementById('tk-color').value,
    size: parseInt(document.getElementById('tk-size').value),
    image_url: document.getElementById('tk-image').value || null,
    hp_current: hpNum,
    hp_max: hpNum,   // au placement, PV max = PV actuels (pleine santé)
    x: placingPos.x, y: placingPos.y,
  });
  closeTokenModal();
  placingPos = null;
  // Reset champs NPC pour la prochaine fois
  document.getElementById('tk-hp').value = '';
  document.getElementById('tk-image').value = '';
}

// ── Utilitaires ───────────────────────────────────────────────
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Flash "C'est ton tour !" ───────────────────────────────────
let _turnFlashTimer = null;
function showTurnFlash(charName) {
  let el = document.getElementById('turnFlash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'turnFlash';
    el.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(201,162,39,.18);border:2px solid var(--accent);border-radius:14px;padding:.9rem 2rem;font-family:\'Cinzel\',serif;font-size:1.1rem;color:var(--accent);text-align:center;z-index:50;pointer-events:none;transition:opacity .5s;backdrop-filter:blur(6px);';
    document.getElementById('gameCanvas')?.parentElement?.appendChild(el);
  }
  el.textContent = `⚔ C'est ton tour, ${charName} !`;
  el.style.opacity = '1';
  if (_turnFlashTimer) clearTimeout(_turnFlashTimer);
  _turnFlashTimer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// ── Centrer la caméra sur un token ────────────────────────────
function focusCombatant(combatantName, charId) {
  const token = charId
    ? gameTokens.find(t => t.character_id === charId)
    : gameTokens.find(t => (t.label || t.char_name || '') === combatantName);
  if (!token) return;
  const gs = currentMap?.grid_size || GRID;
  cam.x = token.x;
  cam.y = token.y;
  drawMap();
}

// ── Modal fiche personnage ────────────────────────────────────
// Les définitions sont chargées dynamiquement depuis systems.js
// via les helpers currentSystemStats() / currentSystemSkills()
