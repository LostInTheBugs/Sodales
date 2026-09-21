/**
 * Sodales — règles de fiche (partie extraite de game.html)
 * Encombrement D&D 5e, vision en mètres, capacités de classe, helpers PF2e.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function getEncumbranceInfo(char) {
  const str = (char.stats?.str || 10);
  const maxKg = str * 6.75;                // STR × 15 lbs = STR × 6.75 kg
  const encThresh = str * 2.25;            // STR × 5 lbs
  const heavyThresh = str * 4.5;           // STR × 10 lbs
  const bodyKg = parseFloat(char.body_weight) || 0;
  const items = char.inventory?.items || [];
  const itemsKg = items.reduce((sum, it) => {
    const qty = it.qty || 1;
    const w = parseFloat(it.weight) || 0;
    return sum + qty * w;
  }, 0);
  const carried = bodyKg + itemsKg;
  let status = 'normal';
  if (carried > maxKg)       status = 'over';
  else if (carried > heavyThresh) status = 'heavy';
  else if (carried > encThresh)   status = 'enc';
  return { carried: Math.round(carried * 10) / 10, max: Math.round(maxKg * 10) / 10, bodyKg, itemsKg: Math.round(itemsKg * 10) / 10, status, encThresh: Math.round(encThresh*10)/10, heavyThresh: Math.round(heavyThresh*10)/10 };
}

function updateEncumbranceStat(char) {
  if (!char) return;
  const enc = getEncumbranceInfo(char);
  const stat = document.getElementById('encumbranceStat');
  const lbl = document.getElementById('encumbranceLabel');
  const val = document.getElementById('charCarry');
  if (!stat || !lbl || !val) return;
  val.textContent = `${enc.carried} kg`;
  const labels = { normal: '⚖ Normal', enc: '⚖ Encombré', heavy: '⚖ Très enc.', over: '⛔ Dépassé' };
  lbl.textContent = labels[enc.status];
  stat.className = `mini-stat enc-${enc.status}`;
}

function lookupItemWeight(name) {
  if (typeof ITEMS_WEIGHT === 'undefined') return null;
  const key = name.toLowerCase().trim();
  if (ITEMS_WEIGHT[key] !== undefined) return ITEMS_WEIGHT[key];
  // Fuzzy: try to find a key that the name contains or is contained in
  for (const [k, v] of Object.entries(ITEMS_WEIGHT)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

function addItemRow(name='', qty=1, weight=null) {
  const list = document.getElementById('mcs-items');
  const div = document.createElement('div');
  div.className = 'item-row';
  // Auto-lookup weight if not provided
  const autoW = weight !== null ? weight : (lookupItemWeight(name) ?? '');
  const wVal  = autoW !== '' ? autoW : '';
  div.innerHTML = `<span class="item-name"><input type="text" style="background:none;border:none;color:var(--text);width:100%;outline:none;" placeholder="Nom de l'objet" value="${esc(name)}" oninput="tryFillItemWeight(this)"/></span>
    <input type="number" class="item-qty" min="1" value="${qty}" title="Quantité"/>
    <input type="number" class="item-weight-inp" min="0" step="0.5" value="${wVal}" placeholder="kg" title="Poids (kg)"/>
    <span class="item-weight-unit">kg</span>
    <button class="item-del" onclick="this.parentElement.remove()">🗑</button>`;
  list.appendChild(div);
}

function tryFillItemWeight(nameInput) {
  const row = nameInput.closest('.item-row');
  if (!row) return;
  const wInput = row.querySelector('.item-weight-inp');
  if (!wInput || wInput.value !== '') return; // Don't overwrite manual entry
  const w = lookupItemWeight(nameInput.value);
  if (w !== null) wInput.value = w;
}

function addAttackRow(name='', atk_bonus=0, dmg_formula='1d6', dmg_type='') {
  const list = document.getElementById('mcs-attacks');
  const row = document.createElement('div');
  row.className = 'atk-row';
  row.innerHTML = `
    <input type="text"   placeholder="Épée longue"  value="${esc(String(name))}"       maxlength="40"/>
    <input type="number" placeholder="+5"            value="${atk_bonus}"               step="1" min="-10" max="30"/>
    <input type="text"   placeholder="1d8+3"         value="${esc(String(dmg_formula))}" maxlength="30"/>
    <input type="text"   placeholder="tranchant"     value="${esc(String(dmg_type))}"   maxlength="20"/>
    <button class="atk-row-del" onclick="this.closest('.atk-row').remove()">✕</button>`;
  list.appendChild(row);
}

// ── Vision en mètres ─────────────────────────────────────────
function updateVisionMeter() {
  const val = parseInt(document.getElementById('mcs-vision-radius')?.value) || 0;
  const hint = document.getElementById('visionMeterHint');
  if (!hint) return;
  if (val <= 0) { hint.textContent = '0 case = illimitée'; }
  else { hint.textContent = `${val} case${val>1?'s':''} = ${(val*1.5).toFixed(1)} m`; }
}

// ── Capacités de classe ──────────────────────────────────────
function addCapRow(name='', level='', desc='') {
  const list = document.getElementById('mcs-caps');
  const row = document.createElement('div');
  row.className = 'cap-row';
  row.innerHTML = `
    <input type="text" placeholder="Nom de la capacité" value="${esc(String(name))}" maxlength="80" style="grid-column:1/3"/>
    <input type="number" placeholder="Niv" value="${level}" min="1" max="20" title="Niveau requis" style=""/>
    <button class="cap-del-btn" onclick="this.closest('.cap-row').remove()" title="Supprimer">🗑</button>
    <textarea placeholder="Description brève…" style="grid-column:1/-1">${esc(String(desc))}</textarea>`;
  list.appendChild(row);
}

function addSpellRow(name='', level=0) {
  const list = document.getElementById('mcs-spells');
  const div = document.createElement('div');
  div.className = 'item-row';
  div.innerHTML = `<span class="item-name"><input type="text" style="background:none;border:none;color:var(--text);width:100%;outline:none;" placeholder="Nom du sort" value="${esc(name)}"/></span>
    <input type="number" class="item-qty" min="0" max="9" value="${level}" title="Niveau du sort"/>
    <button class="item-del" onclick="this.parentElement.remove()">🗑</button>`;
  list.appendChild(div);
}

// ── PF2e helpers ─────────────────────────────────────────────
const PF2E_SKILLS = [
  'Acrobaties','Arcanes','Athlétisme','Artisanat','Duperie','Diplomatie',
  'Intimidation','Médecine','Nature','Occultisme','Représentation',
  'Religion','Société','Discrétion','Survie','Larcin'
];
const PF2E_PROF_RANKS = [
  { rank:0, label:'I',  title:'Inexpérimenté' },
  { rank:2, label:'E',  title:'Entraîné' },
  { rank:4, label:'Ex', title:'Expert' },
  { rank:6, label:'M',  title:'Maître' },
  { rank:8, label:'L',  title:'Légendaire' },
];

function isPF2e() {
  return (typeof campaign !== 'undefined' && campaign?.system === 'Pathfinder 2e');
}

// Build 5 rank-picker buttons into container element
function buildProfRankPicker(containerId, key, currentRank) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = PF2E_PROF_RANKS.map(({ rank, label, title }) => {
    const active = currentRank === rank ? `active active-${rank || 'none'}` : '';
    return `<button class="prof-rank-btn ${active}" title="${title}"
      onclick="setProfRank(this,'${key}',${rank})">${label}</button>`;
  }).join('');
}

function setProfRank(btn, key, rank) {
  // Update button states
  const container = btn.parentElement;
  container.querySelectorAll('.prof-rank-btn').forEach(b => b.className = 'prof-rank-btn');
  btn.className = `prof-rank-btn active active-${rank || 'none'}`;
  // Store in editingChar system_data
  if (!editingChar) return;
  editingChar.system_data = editingChar.system_data || {};
  editingChar.system_data.pf2e = editingChar.system_data.pf2e || {};
  editingChar.system_data.pf2e.profs = editingChar.system_data.pf2e.profs || {};
  editingChar.system_data.pf2e.profs[key] = rank;
  // Recompute Class DC (fortitude/reflex/will/perception ranks can also affect?)
  updatePF2eClassDC();
}

function populatePF2eProfs(char) {
  const profs = char?.system_data?.pf2e?.profs || {};
  // Perception
  buildProfRankPicker('pf2e-prof-perception', 'perception', profs.perception ?? 0);
  // Saves
  buildProfRankPicker('pf2e-prof-fortitude', 'fortitude', profs.fortitude ?? 0);
  buildProfRankPicker('pf2e-prof-reflex',    'reflex',    profs.reflex    ?? 0);
  buildProfRankPicker('pf2e-prof-will',      'will',      profs.will      ?? 0);
  // Skills
  const skillContainer = document.getElementById('pf2e-skill-profs');
  if (!skillContainer) return;
  skillContainer.innerHTML = PF2E_SKILLS.map(sk => {
    const key = sk.toLowerCase().replace('é','e').replace('è','e').replace('â','a');
    const rank = profs[key] ?? 0;
    const btns = PF2E_PROF_RANKS.map(({ rank: r, label, title }) => {
      const active = rank === r ? `active active-${r || 'none'}` : '';
      return `<button class="prof-rank-btn ${active}" title="${title}"
        onclick="setProfRank(this,'${key}',${r})">${label}</button>`;
    }).join('');
    return `<div class="prof-row">
      <span class="prof-name">${sk}</span>
      <div class="prof-ranks">${btns}</div>
    </div>`;
  }).join('');
}

function updatePF2eClassDC() {
  const display = document.getElementById('pf2e-class-dc-display');
  if (!display || !editingChar) return;
  const level = parseInt(document.getElementById('mcs-level')?.value) || 1;
  const classProfRank = parseInt(document.getElementById('mcs-pf2e-class-prof')?.value) || 0;
  // Use key ability modifier (from stats, default to highest mental stat)
  const stats = editingChar.stats || {};
  const statVals = ['str','dex','con','int','wis','cha'].map(k => parseInt(document.getElementById(`mcs-stat-${k}`)?.value) || stats[k] || 10);
  // For class DC typically uses the class's key ability — default to best of INT/WIS/CHA
  const keyMod = Math.max(...[statVals[3],statVals[4],statVals[5]].map(v => Math.floor((v-10)/2)));
  const dc = 10 + level + keyMod + classProfRank;
  display.textContent = dc;
}

function applySystemToSheet(system) {
  const isPf2e = system === 'Pathfinder 2e';
  // Toggle class on <body>
  document.body.classList.toggle('pf2e-campaign', isPf2e);
  // Update tab label
  const skillTab = document.getElementById('mct-skills');
  if (skillTab) skillTab.textContent = isPf2e ? 'Maîtrises' : 'Compétences';
  // Update race/background labels
  const raceLabel = document.getElementById('mcs-race-label');
  if (raceLabel) raceLabel.textContent = isPf2e ? 'Ascendance' : 'Race';
  const bgLabel = document.getElementById('mcs-bg-label');
  if (bgLabel) bgLabel.textContent = isPf2e ? 'Background' : 'Background / Alignement';
  // Rebuild race and class combo options for the active system
  const curRace  = getComboValue('race');
  const curClass = getComboValue('class');
  buildComboOptions('mcs-race-sel',  getSystemRaces(currentSystemName()),  curRace);
  buildComboOptions('mcs-class-sel', getSystemClasses(currentSystemName()), curClass);
  loadComboValue('race',  curRace);
  loadComboValue('class', curClass);
  updateSubclassOptions();
  // Build PF2e prof pickers
  if (isPf2e && editingChar) {
    populatePF2eProfs(editingChar);
    // Restore class-prof selection
    const classProfSel = document.getElementById('mcs-pf2e-class-prof');
    if (classProfSel) {
      classProfSel.value = String(editingChar.system_data?.pf2e?.class_prof ?? 0);
    }
    // Restore heritage
    const heritageEl = document.getElementById('mcs-heritage');
    if (heritageEl) heritageEl.value = editingChar.system_data?.pf2e?.heritage || '';
    updatePF2eClassDC();
  }
}

async function saveCharSheet() {
  if (!editingChar) return;
  const btn = document.getElementById('mcs-save-btn');
  const alertEl = document.getElementById('mcs-alert');
  alertEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Sauvegarde…';

  // Collecter les stats
  const stats = {};
  currentSystemStats().forEach(s => { stats[s.key] = parseInt(document.getElementById(`mcs-stat-${s.key}`).value) || 10; });

  // Compétences
  const skills = {};
  currentSystemSkills().forEach((sk, i) => { if (document.getElementById(`mcs-sk-${i}`)?.checked) skills[sk.name] = true; });

  // Attaques
  const attacks = [...document.getElementById('mcs-attacks').querySelectorAll('.atk-row')].map(row => {
    const inputs = row.querySelectorAll('input');
    return {
      name:        inputs[0]?.value.trim() || '',
      atk_bonus:   parseInt(inputs[1]?.value) || 0,
      dmg_formula: inputs[2]?.value.trim() || '1d6',
      dmg_type:    inputs[3]?.value.trim() || '',
    };
  }).filter(a => a.name);

  // Inventaire items
  const items = [...document.getElementById('mcs-items').querySelectorAll('.item-row')].map(row => {
    const inputs = row.querySelectorAll('input');
    const w = parseFloat(row.querySelector('.item-weight-inp')?.value);
    return {
      name: row.querySelector('input[type=text]').value.trim(),
      qty: parseInt(row.querySelector('.item-qty')?.value) || 1,
      ...(isNaN(w) ? {} : { weight: w }),
    };
  }).filter(it => it.name);

  // Sorts
  const slots = {}; const slots_used = {};
  for (let lvl=1;lvl<=9;lvl++) {
    const mx = parseInt(document.getElementById(`mcs-slot-${lvl}`)?.value)||0;
    const us = parseInt(document.getElementById(`mcs-slot-used-${lvl}`)?.value)||0;
    if (mx) slots[lvl] = mx;
    if (us) slots_used[lvl] = us;
  }
  const spellItems = [...document.getElementById('mcs-spells').querySelectorAll('.item-row')].map(row => ({
    name: row.querySelector('input[type=text]').value.trim(),
    level: parseInt(row.querySelector('input[type=number]').value)||0,
  })).filter(sp => sp.name);

  // Capacités
  const abilities = [...document.getElementById('mcs-caps').querySelectorAll('.cap-row')].map(row => {
    const inputs = row.querySelectorAll('input');
    return { name: inputs[0]?.value.trim()||'', level: parseInt(inputs[1]?.value)||1, desc: row.querySelector('textarea')?.value.trim()||'' };
  }).filter(a => a.name);

  // PF2e system_data
  let system_data = editingChar.system_data || null;
  if (isPF2e()) {
    const existingProfs = editingChar.system_data?.pf2e?.profs || {};
    system_data = {
      pf2e: {
        heritage:   document.getElementById('mcs-heritage')?.value.trim() || '',
        class_prof: parseInt(document.getElementById('mcs-pf2e-class-prof')?.value) || 0,
        profs:      existingProfs,
      }
    };
  }

  const payload = {
    name: document.getElementById('mcs-name').value.trim(),
    level: parseInt(document.getElementById('mcs-level').value)||1,
    race: getComboValue('race'),
    class: getComboValue('class'),
    portrait_url: document.getElementById('mcs-portrait').value.trim(),
    background: document.getElementById('mcs-background').value.trim(),
    hp_max: parseInt(document.getElementById('mcs-hp-max').value)||1,
    hp_current: parseInt(document.getElementById('mcs-hp-cur').value)||0,
    ac: parseInt(document.getElementById('mcs-ac').value)||10,
    speed: parseInt(document.getElementById('mcs-speed').value)||30,
    body_weight: parseFloat(document.getElementById('mcs-body-weight').value)||0,
    proficiency_bonus: parseInt(document.getElementById('mcs-proficiency').value)||2,
    stats,
    skills,
    inventory: {
      gp: parseInt(document.getElementById('mcs-gp').value)||0,
      sp: parseInt(document.getElementById('mcs-sp').value)||0,
      cp: parseInt(document.getElementById('mcs-cp').value)||0,
      items,
    },
    attacks,
    spells: { slots, slots_used, list: spellItems },
    notes: document.getElementById('mcs-notes').value,
    abilities,
    subclass: getComboValue('subclass'),
    vision_radius: parseInt(document.getElementById('mcs-vision-radius').value) || 0,
    vision_angle: parseInt(document.getElementById('mcs-vision-angle').value) || 360,
    ...(system_data !== null ? { system_data } : {}),
  };

  try {
    const updated = await API.characters.update(CAMPAIGN_ID, editingChar.id, payload);
    // Mettre à jour myChars en local
    const idx = myChars.findIndex(c => c.id === editingChar.id);
    if (idx >= 0) myChars[idx] = { ...myChars[idx], ...payload };
    activeChar = myChars[idx] || activeChar;
    selectChar(activeChar.id);
    // Sync vision en temps réel via socket
    socket?.emit('character_vision_set', {
      campaign_id: CAMPAIGN_ID,
      char_id: editingChar.id,
      vision_radius: payload.vision_radius,
    });
    closeCharSheetModal();
  } catch (err) {
    alertEl.textContent = err.message;
    alertEl.style.display = 'block';
  }
  btn.disabled = false; btn.textContent = '💾 Sauvegarder';
}

// ══════════════════════════════════════════════════════════════
// MURS & LUMIÈRES
// ══════════════════════════════════════════════════════════════
let mapWalls  = [];   // [{id, x1, y1, x2, y2}] en coordonnées monde
let mapLights = [];   // [{id, x, y, radius, color}] en coordonnées monde
let wallDrawStart  = null;
let wallPreviewEnd = null;
