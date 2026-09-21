/**
 * Sodales — combo-select de la fiche (partie extraite de game.html)
 * Helpers de listes déroulantes (races, classes, sous-classes, systèmes).
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function buildComboOptions(selId, options, currentVal) {
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
  if (!hasMatch && currentVal) { custom.selected = true; }
  sel.appendChild(custom);
}

function onComboSel(field) {
  const selId   = `mcs-${field}-sel`;
  const inputId = `mcs-${field}`;
  const sel   = document.getElementById(selId);
  const input = document.getElementById(inputId);
  if (!sel || !input) return;
  if (sel.value === '__custom__') {
    input.style.display = '';
    input.focus();
  } else {
    input.style.display = 'none';
    input.value = '';
  }
  if (field === 'class') updateSubclassOptions();
}

function loadComboValue(field, value) {
  const selId   = `mcs-${field}-sel`;
  const inputId = `mcs-${field}`;
  const sel   = document.getElementById(selId);
  const input = document.getElementById(inputId);
  if (!sel) return;
  if (!value) { sel.value = sel.options[0]?.value || ''; input.style.display = 'none'; return; }
  // Check if value exists in the options
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

function getComboValue(field) {
  const sel   = document.getElementById(`mcs-${field}-sel`);
  const input = document.getElementById(`mcs-${field}`);
  if (!sel) return '';
  // If custom input is visible, always return it (covers case where options not yet built)
  if (input && input.style.display !== 'none') return input.value.trim();
  if (sel.value === '__custom__') return input ? input.value.trim() : '';
  return sel.value;
}

// ── Données de sous-classes (restaurées 2026-09 — supprimées par erreur avec un
//    fragment orphelin en mai 2026 ; les usages ci-dessous les référencent) ──
const SUBCLASSES_DND5E = {
  'Barbare':    ['Voie du Berserker','Voie du Guerrier Totem','Voie du Héraut de la Tempête','Voie du Fanatique','Voie du Héraut des Ancêtres','Voie de la Magie sauvage','Voie du Géant'],
  'Barde':      ['Collège du Savoir','Collège de la Vaillance','Collège des Chuchotements','Collège de la Création','Collège de l\'Éloquence','Collège des Esprits'],
  'Clerc':      ['Domaine de la Vie','Domaine de la Lumière','Domaine de la Tempête','Domaine de la Ruse','Domaine du Savoir','Domaine de la Nature','Domaine de la Guerre','Domaine de la Mort','Domaine de la Forge','Domaine des Tombeaux','Domaine de l\'Ordre','Domaine de la Paix','Domaine du Crépuscule'],
  'Druide':     ['Cercle de la Terre','Cercle de la Lune','Cercle des Rêves','Cercle des Spores','Cercle des Étoiles','Cercle du Berger','Cercle des Feux de la Nature'],
  'Guerrier':   ['Champion','Chevalier Eldritch','Maître de bataille','Archer Arcane','Samouraï','Cavalier','Psi Warrior','Rune Knight'],
  'Moine':      ['Voie de la Main Ouverte','Voie de l\'Ombre','Voie des Quatre Éléments','Voie du Soleil Solaire','Voie du Kensei','Voie de la Miséricorde','Voie du Moi Astral','Voie du Moine Ivre'],
  'Paladin':    ['Serment de Dévotion','Serment des Anciens','Serment de Vengeance','Serment de la Conquête','Serment de la Rédemption','Serment de Gloire','Serment du Guetteur','Serment brisé'],
  'Rôdeur':     ['Chasseur','Maître des Bêtes','Traqueur de Monstres','Horizon Walker','Gloom Stalker','Fey Wanderer','Swarmkeeper'],
  'Roublard':   ['Escroc','Tireur d\'Élite','Assassin','Archétype Arcane','Inquisitif','Scout','Phantôme','Filou Soulard'],
  'Ensorceleur':['Origine de l\'Héritage Draconique','Magie Sauvage','Divine Soul','Âme Fantôme','Storm Sorcery','Clockwork Soul','Aberrant Mind'],
  'Occultiste': ['Archifée','Grand Ancien','Fiélon','Céleste','Fathomless','Genie','Undead'],
  'Magicien':   ['École d\'Abjuration','École de Conjuration','École de Divination','École d\'Enchantement','École d\'Évocation','École d\'Illusion','École de Nécromancie','École de Transmutation','Magie de Guerre','Lames Chantantes','Chronomancien'],
  'Artificier': ['Alchimiste','Artilleur','Forgeron de Bataille','Armure Infusée'],
  'Sangdragon (Blood Hunter)': ['Ordre du Briseur de Mâchoire','Ordre de la Plume d\'Argent','Ordre du Cadavre','Ordre du Traqueur'],
};
const SUBCLASSES_PF2E = {
  'Alchimiste': ['Bombardier','Chirurgien du champ de bataille','Empoisonneur','Mutagéniste'],
  'Barbare':    ['Raging Berserker','Superstition','Totem','Fury','Giant','Spirit'],
  'Barde':      ['Maestro','Warrior','Polymath','Enigma'],
  'Champion':   ['Dévot de la Déesse des Abeilles','Liberateur','Répresseur','Vengeur'],
  'Chasseur':   ['Fletchercher','Scout','Snare Specialist','Outrider'],
  'Clerc':      ['Cloistered Cleric','Warpriest'],
  'Druide':     ['Animal','Leaf','Storm','Wild'],
  'Guerrier':   ['Desarmant','Spirited','Vengeful','Student of the Sword'],
  'Magicien':   ['Abjuration','Conjuration','Divination','Enchantement','Évocation','Illusion','Nécromancie','Transmutation'],
  'Moine':      ['Irori','Wellspring Mage'],
  'Roublard':   ['Scoundrel','Thief','Assassin','Mastermind'],
};

function updateSubclassOptions() {
  const classVal = getComboValue('class');
  const curSubclass = getComboValue('subclass');
  // Determine which subclass map to use based on campaign system
  const isPf2e = document.body.classList.contains('pf2e-campaign');
  const map = isPf2e ? SUBCLASSES_PF2E : SUBCLASSES_DND5E;
  const subs = map[classVal] || [];
  buildComboOptions('mcs-subclass-sel', subs, curSubclass);
  // If no subclasses available, show free input directly
  const sel = document.getElementById('mcs-subclass-sel');
  const input = document.getElementById('mcs-subclass');
  if (subs.length === 0) {
    // Just show the free text input, hide select
    if (sel) sel.style.display = 'none';
    if (input) { input.style.display = ''; }
  } else {
    if (sel) sel.style.display = '';
    // Re-apply loadComboValue to restore correct display
    loadComboValue('subclass', curSubclass);
  }
}

let editingChar = null;

function openCharSheetModal() {
  if (!activeChar) return;
  editingChar = JSON.parse(JSON.stringify(activeChar)); // deep copy
  const char = editingChar;
  const titleEl = document.getElementById('mcs-title');
  titleEl.innerHTML = `Fiche : ${esc(char.name)} <span class="pf2e-badge pf2e-only">Pathfinder 2e</span>`;
  document.getElementById('mcs-alert').style.display = 'none';

  // Identité — build combo options first, then load saved values
  const _isPf2e = (typeof campaign !== 'undefined' && campaign?.system === 'Pathfinder 2e');
  buildComboOptions('mcs-race-sel',  getSystemRaces(currentSystemName()),  char.race  || '');
  buildComboOptions('mcs-class-sel', getSystemClasses(currentSystemName()), char.class || '');
  document.getElementById('mcs-name').value = char.name || '';
  document.getElementById('mcs-level').value = char.level || 1;
  // Bouton "+" montée de niveau : affiché uniquement pour les joueurs sur leur propre perso (D&D 5e)
  const _lvlBtn = document.getElementById('lvlupRequestBtn');
  if (_lvlBtn) {
    const _isDnd = !(typeof campaign !== 'undefined' && campaign?.system === 'Pathfinder 2e');
    const _isOwn = myRole !== 'gm' && char.user_id === getUser()?.id;
    _lvlBtn.style.display = (_isDnd && _isOwn) ? '' : 'none';
    _lvlBtn.disabled = !!char._pendingLvlup || (char.level || 1) >= 20;
    _lvlBtn.title = char._pendingLvlup ? 'Demande en attente…' : 'Demander une montée de niveau au MJ';
  }
  // Champ niveau : lecture seule pour les joueurs (seul le MJ peut l'éditer librement)
  const _lvlInput = document.getElementById('mcs-level');
  if (_lvlInput) {
    const _isPlayer = myRole !== 'gm';
    _lvlInput.readOnly = _isPlayer;
    _lvlInput.style.opacity = _isPlayer ? '0.55' : '';
    _lvlInput.style.cursor  = _isPlayer ? 'not-allowed' : '';
    _lvlInput.title = _isPlayer ? 'Utilisez le bouton + pour demander une montée de niveau' : '';
  }
  loadComboValue('race', char.race || '');
  loadComboValue('class', char.class || '');
  document.getElementById('mcs-portrait').value = char.portrait_url || '';
  document.getElementById('mcs-background').value = char.background || '';
  updatePortraitPreview();

  // Stats
  const statsGrid = document.getElementById('mcs-stats-grid');
  const stats = char.stats || {};
  statsGrid.innerHTML = currentSystemStats().map(s => {
    const val = stats[s.key] || 10;
    const mod = Math.floor((val - 10) / 2);
    return `<div class="stat-edit-box">
      <label>${s.label}</label>
      <input type="number" id="mcs-stat-${s.key}" min="1" max="30" value="${val}" data-act="updateStatMod" data-a='["${s.key}"]'/>
      <div class="stat-mod" id="mcs-mod-${s.key}">${mod>=0?'+':''}${mod}</div>
    </div>`;
  }).join('');

  // Caractéristiques
  document.getElementById('mcs-hp-max').value = char.hp_max || 10;
  document.getElementById('mcs-hp-cur').value = char.hp_current || 10;
  document.getElementById('mcs-ac').value = char.ac || 10;
  document.getElementById('mcs-speed').value = char.speed || 30;
  document.getElementById('mcs-body-weight').value = char.body_weight || 0;
  document.getElementById('mcs-initiative').value = (char.stats?.dex ? Math.floor((char.stats.dex-10)/2) : 0);
  document.getElementById('mcs-proficiency').value = char.proficiency_bonus || 2;

  // Compétences
  const skillsGrid = document.getElementById('mcs-skills-grid');
  const profs = char.skills || {};
  skillsGrid.innerHTML = currentSystemSkills().map((sk, i) => `
    <label class="skill-row">
      <input type="checkbox" id="mcs-sk-${i}" ${profs[sk.name] ? 'checked' : ''}/>
      <span>${sk.name}</span>
      <span class="skill-attr">${sk.attr.toUpperCase()}</span>
    </label>`).join('');

  // Attaques
  const attackList = document.getElementById('mcs-attacks');
  attackList.innerHTML = '';
  (char.attacks || []).forEach(a => addAttackRow(a.name, a.atk_bonus ?? 0, a.dmg_formula || '1d6', a.dmg_type || ''));

  // Inventaire
  const inv = char.inventory || {};
  document.getElementById('mcs-gp').value = inv.gp || 0;
  document.getElementById('mcs-sp').value = inv.sp || 0;
  document.getElementById('mcs-cp').value = inv.cp || 0;
  const itemList = document.getElementById('mcs-items');
  itemList.innerHTML = '';
  (inv.items || []).forEach(it => addItemRow(it.name, it.qty, it.weight ?? null));

  // Sorts
  const spells = char.spells || {};
  const slotsEl = document.getElementById('mcs-slots');
  slotsEl.innerHTML = [1,2,3,4,5,6,7,8,9].map(lvl => {
    const maxVal = (spells.slots||{})[lvl] || 0;
    const usedVal = (spells.slots_used||{})[lvl] || 0;
    return `<div class="slot-box" title="Clic long pour reset les utilisés" data-act="setValueById" data-a='["mcs-slot-used-${lvl}", 0]'>
      <label>Niv. ${lvl}</label>
      <div class="slot-box-inputs">
        <input type="number" id="mcs-slot-used-${lvl}" min="0" max="9" value="${usedVal}" title="Emplacements utilisés" style="color:var(--danger)"/>
        <span>/</span>
        <input type="number" id="mcs-slot-${lvl}" min="0" max="9" value="${maxVal}" title="Emplacements maximum"/>
      </div>
    </div>`;
  }).join('');
  const spellList = document.getElementById('mcs-spells');
  spellList.innerHTML = '';
  (spells.list || []).forEach(sp => addSpellRow(sp.name, sp.level));

  // Notes
  document.getElementById('mcs-notes').value = char.notes || '';

  // Capacités
  const capList = document.getElementById('mcs-caps');
  capList.innerHTML = '';
  (char.abilities || []).forEach(a => addCapRow(a.name, a.level, a.desc));

  // Sous-classe — built after class is loaded
  updateSubclassOptions();
  loadComboValue('subclass', char.subclass || '');

  // Vision (MJ only)
  document.getElementById('mcs-vision-radius').value = char.vision_radius || 0;
  document.getElementById('mcs-vision-angle').value = char.vision_angle || 360;
  updateVisionMeter();

  // PF2e system toggle
  applySystemToSheet(typeof campaign !== 'undefined' ? campaign?.system : null);

  switchMCTab(0);
  document.getElementById('modal-charsheet').classList.add('open');
}

function closeCharSheetModal() {
  document.getElementById('modal-charsheet').classList.remove('open');
  document.body.classList.remove('pf2e-campaign');
  editingChar = null;
}

function switchMCTab(idx) {
  document.querySelectorAll('.mct').forEach((t,i) => t.classList.toggle('active', i===idx));
  document.querySelectorAll('.mc-panel').forEach((p,i) => p.classList.toggle('active', i===idx));
}

function updatePortraitPreview() {
  const url = document.getElementById('mcs-portrait').value.trim();
  const img = document.getElementById('mcs-portrait-preview');
  img.src = url || '';
  img.style.display = url ? 'block' : 'none';
}

function updateStatMod(key) {
  const val = parseInt(document.getElementById(`mcs-stat-${key}`).value) || 10;
  const mod = Math.floor((val - 10) / 2);
  document.getElementById(`mcs-mod-${key}`).textContent = `${mod>=0?'+':''}${mod}`;
}
