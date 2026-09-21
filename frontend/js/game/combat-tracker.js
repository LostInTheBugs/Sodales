/**
 * Sodales — traqueur de combat (partie extraite de game.html)
 * Configuration, contrôles, HP inline, rendu du traqueur, bandeau initiative
 * joueurs et synchronisation socket du combat.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function toggleCombatPanel() {
  if (!combatActive && myRole === 'gm') {
    openCombatSetup();
    return;
  }
  trackerVisible = !trackerVisible;
  document.getElementById('combatTracker').classList.toggle('visible', trackerVisible);
}

// ── Ouvrir modal config combat ────────────────────────────────
function openCombatSetup() {
  if (myRole !== 'gm') return;
  paletteIdx = 0;

  // Vider les ennemis
  document.getElementById('mc2-enemies').innerHTML = '';

  document.getElementById('modal-combat').classList.add('open');
}

function closeCombatModal() {
  document.getElementById('modal-combat').classList.remove('open');
}

function rollD20() { return Math.floor(Math.random() * 20) + 1; }


function addEnemyRow(name='', ini=10, hp=10, color='') {
  const list = document.getElementById('mc2-enemies');
  const id = newCombatId();
  const c = color || nextColor();
  const div = document.createElement('div');
  div.className = 'enemy-row';
  div.dataset.id = id;
  div.innerHTML = `
    <input type="color" value="${c}" style="width:22px;height:22px;border:none;border-radius:50%;cursor:pointer;padding:0;flex-shrink:0;"/>
    <input type="text" placeholder="Gobelin A" value="${esc(name)}" style="flex:1;background:none;border:none;color:var(--text);font-size:.82rem;outline:none;"/>
    <input type="number" class="ini-val" value="${ini}" min="1" max="40" title="Initiative" style="width:38px;"/>
    <span style="font-size:.7rem;color:var(--text2);">PV</span>
    <input type="number" class="enemy-hp-in" value="${hp}" min="1" title="PV max"/>
    <button onclick="this.closest('.enemy-row').remove()" class="ini-roll-btn" style="color:var(--danger)">🗑</button>`;
  list.appendChild(div);
}

function startCombat() {
  // Ennemis/PNJ seulement — les PJs lanceront leur propre initiative
  const combatants = [];
  document.querySelectorAll('#mc2-enemies .enemy-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const color = inputs[0].value;
    const name = inputs[1].value.trim() || 'Ennemi';
    const ini = parseInt(inputs[2].value) || 10;
    const hp = parseInt(inputs[3].value) || 10;
    combatants.push({
      id: row.dataset.id || newCombatId(),
      name, initiative: ini, hp, hp_max: hp, color, is_pc: false,
    });
  });
  closeCombatModal();
  socket?.emit('combat_start', { campaign_id: CAMPAIGN_ID, combatants });
}

// ── Contrôles combat ──────────────────────────────────────────
function combatNext() {
  if (myRole !== 'gm' || !combatActive) return;
  socket?.emit('combat_next', { campaign_id: CAMPAIGN_ID });
}
function combatPrev() {
  if (myRole !== 'gm' || !combatActive) return;
  socket?.emit('combat_prev', { campaign_id: CAMPAIGN_ID });
}
function endCombat() {
  if (myRole !== 'gm') return;
  if (!confirm('Terminer le combat ?')) return;
  socket?.emit('combat_end', { campaign_id: CAMPAIGN_ID });
}

// ── Ajouter combattant en cours de combat ─────────────────────
function openAddCombatant() {
  if (myRole !== 'gm') return;
  document.getElementById('ac-name').value = '';
  document.getElementById('ac-ini').value = 10;
  document.getElementById('ac-hp').value = 10;
  document.getElementById('modal-add-combatant').classList.add('open');
}
function doAddCombatant() {
  const name = document.getElementById('ac-name').value.trim() || 'Ennemi';
  const ini = parseInt(document.getElementById('ac-ini').value) || 10;
  const hp = parseInt(document.getElementById('ac-hp').value) || 10;
  const color = document.getElementById('ac-color').value;
  const combatant = { id: newCombatId(), name, initiative: ini, hp, hp_max: hp, color, is_pc: false };
  socket?.emit('combat_add', { campaign_id: CAMPAIGN_ID, combatant });
  document.getElementById('modal-add-combatant').classList.remove('open');
}

// ── Mise à jour HP inline ─────────────────────────────────────
function editCombatantHP(id, currentHp, maxHp, el) {
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.className = 'ct-hp-input';
  inp.value = currentHp;
  inp.min = 0;
  inp.max = maxHp;
  el.replaceWith(inp);
  inp.focus(); inp.select();

  const commit = () => {
    const newHp = Math.max(0, Math.min(maxHp, parseInt(inp.value) || 0));
    socket?.emit('combat_hp', { campaign_id: CAMPAIGN_ID, combatant_id: id, hp: newHp });
  };
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); inp.blur(); } });
}

function removeCombatant(id) {
  if (myRole !== 'gm') return;
  socket?.emit('combat_remove', { campaign_id: CAMPAIGN_ID, combatant_id: id });
}

// ── Rendu du tracker ──────────────────────────────────────────
function renderTracker(state) {
  combatState = state;
  combatActive = true;
  trackerVisible = true;

  document.getElementById('combatTracker').classList.add('visible');
  document.getElementById('ctRound').textContent = `R${state.round}`;

  // Contrôles MJ seulement
  const isGm = myRole === 'gm';
  document.getElementById('ctPrevBtn').style.display = isGm ? '' : 'none';
  document.getElementById('ctNextBtn').style.display = isGm ? '' : 'none';
  document.getElementById('ctEndBtn').style.display = isGm ? '' : 'none';
  document.getElementById('ctConfigBtn').style.display = isGm ? '' : 'none';
  document.getElementById('ctFooter').style.display = isGm ? '' : 'none';

  const list = document.getElementById('ctList');
  list.innerHTML = state.combatants.map((c, i) => {
    const isCurrent = i === state.current_turn;
    const hpPct = c.hp_max > 0 ? c.hp / c.hp_max : 0;
    const barClass = hpPct > 0.5 ? '' : hpPct > 0.25 ? ' low' : ' critical';
    const dead = c.hp <= 0;
    return `<div class="ct-row${isCurrent ? ' current' : ''}${dead ? ' dead' : ''}" onclick="focusCombatant('${esc(c.name)}', ${c.char_id ? `'${c.char_id}'` : 'null'})" title="Centrer la vue sur ce combattant" style="cursor:pointer;">
      <span class="ct-arrow">${isCurrent ? '▶' : ''}</span>
      <span class="ct-ini">${c.initiative}</span>
      <span class="ct-dot" style="background:${c.color || '#888'}"></span>
      <span class="ct-name" title="${esc(c.name)}">${esc(c.name)}</span>
      <span class="ct-hp" onclick="event.stopPropagation();editCombatantHP('${c.id}', ${c.hp}, ${c.hp_max}, this)" title="Cliquer pour modifier">${c.hp}/${c.hp_max}</span>
      ${isGm ? `<button class="ct-remove" onclick="event.stopPropagation();removeCombatant('${c.id}')" title="Retirer">✕</button>` : ''}
      <div class="ct-hp-bar${barClass}" style="width:${Math.max(0,hpPct)*100}%"></div>
    </div>`;
  }).join('');
}

function clearTracker() {
  combatActive = false;
  combatState = null;
  trackerVisible = false;
  document.getElementById('combatTracker').classList.remove('visible');
  document.getElementById('ctList').innerHTML = '';
}

// ── Bandeau initiative joueurs ────────────────────────────────
let pendingRollChars = []; // personnages du joueur qui n'ont pas encore lancé

function showIniBanner(characters) {
  const me = getUser();
  // Filtrer les persos de CE joueur qui ne sont pas encore dans le tracker
  const alreadyIn = (combatState?.combatants || []).map(c => c.char_id);
  pendingRollChars = characters.filter(c =>
    c.user_id === me.id && !alreadyIn.includes(c.id)
  );
  if (!pendingRollChars.length) return; // rien à faire pour ce joueur

  const banner = document.getElementById('iniBanner');
  const container = document.getElementById('iniBannerChars');
  container.innerHTML = pendingRollChars.map((c, i) => {
    const dexMod = c.stats?.dex ? Math.floor((c.stats.dex - 10) / 2) : 0;
    const defIni = rollD20() + dexMod;
    const modStr = dexMod >= 0 ? `DEX +${dexMod}` : `DEX ${dexMod}`;
    return `<div class="ini-char-roll-row" data-idx="${i}">
      <span class="name">${esc(c.name)}</span>
      <span class="mod">${modStr}</span>
      <button class="roll-btn" onclick="rerollIni(${i}, ${dexMod})">🎲</button>
      <input type="number" id="ini-banner-val-${i}" value="${defIni}" min="1" max="40"/>
    </div>`;
  }).join('');
  banner.classList.add('visible');
}

function rerollIni(idx, dexMod) {
  const inp = document.getElementById(`ini-banner-val-${idx}`);
  if (inp) inp.value = rollD20() + dexMod;
}

function submitInitiatives() {
  if (!pendingRollChars.length) return;
  pendingRollChars.forEach((c, i) => {
    const ini = parseInt(document.getElementById(`ini-banner-val-${i}`)?.value) || 10;
    const dexMod = c.stats?.dex ? Math.floor((c.stats.dex - 10) / 2) : 0;
    socket?.emit('combat_roll_initiative', {
      campaign_id: CAMPAIGN_ID,
      combatant: {
        id: newCombatId(),
        char_id: c.id,
        name: c.name,
        initiative: ini,
        hp: c.hp_current || c.hp_max || 10,
        hp_max: c.hp_max || 10,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        is_pc: true,
      }
    });
  });
  pendingRollChars = [];
  document.getElementById('iniBanner').classList.remove('visible');
}

// ── Socket listeners combat ───────────────────────────────────
function setupCombatSocket(socket) {
  socket.on('combat_state', (state) => {
    // Détecter si c'est maintenant mon tour
    if (state && myRole !== 'gm') {
      const prevTurn = combatState?.current_turn;
      const prevRound = combatState?.round;
      if (prevTurn !== state.current_turn || prevRound !== state.round) {
        const active = state.combatants[state.current_turn];
        if (active) {
          const myCharIds = (myChars || []).map(c => c.id);
          if (myCharIds.includes(active.char_id)) {
            playTurnBell();
            // Flash visuel "C'est ton tour !"
            showTurnFlash(active.name);
          }
        }
      }
    }
    renderTracker(state);
    // Masquer le bandeau si tous les persos du joueur ont été intégrés
    if (pendingRollChars.length) {
      const alreadyIn = state.combatants.map(c => c.char_id);
      pendingRollChars = pendingRollChars.filter(c => !alreadyIn.includes(c.id));
      if (!pendingRollChars.length) {
        document.getElementById('iniBanner').classList.remove('visible');
      }
    }
  });

  socket.on('combat_roll_needed', ({ characters }) => {
    // Le MJ ne lance pas sa propre initiative
    if (myRole === 'gm') return;
    showIniBanner(characters);
  });

  socket.on('combat_ended', () => {
    clearTracker();
    pendingRollChars = [];
    document.getElementById('iniBanner').classList.remove('visible');
    addSystemMessage('🏳 Le combat est terminé.');
  });
}

function setupGameSocket(socket) {
  socket.on('fog_update', ({ map_id, circles, allRevealed }) => {
    if (currentMap?.id !== map_id) return;
    fogEnabled = true;  // le MJ a activé le brouillard sur cette carte
    fogState = { circles: circles || [], allRevealed: !!allRevealed };
    drawMap();
  });

  socket.on('token_conditions_updated', ({ token_id, conditions }) => {
    const t = gameTokens.find(t => t.id === token_id);
    if (t) { t.conditions = conditions; drawMap(); }
  });

  socket.on('token_hp_updated', ({ token_id, hp_current }) => {
    const t = gameTokens.find(t => t.id === token_id);
    if (t) { t.hp_current = hp_current; drawMap(); }
  });

  socket.on('vision_mode', ({ mode }) => {
    visionMode = mode || 'all';
    updateVisionModeUI(visionMode);
    drawMap();
  });

  socket.on('character_vision_updated', ({ char_id, vision_radius }) => {
    gameTokens.forEach(t => {
      if (t.character_id === char_id) t.char_vision_radius = vision_radius;
    });
    drawMap();
  });

  // Réglages affichage PV
  socket.on('hp_display_state', (state) => {
    hpDisplay = { ...hpDisplay, ...state };
    // Synchroniser les contrôles du panneau (MJ)
    const pcSel  = document.getElementById('hpd-pc-mode');
    const npcSel = document.getElementById('hpd-npc-mode');
    const hiInp  = document.getElementById('hpd-threshold-high');
    const loInp  = document.getElementById('hpd-threshold-low');
    if (pcSel)  pcSel.value  = hpDisplay.pc_mode;
    if (npcSel) npcSel.value = hpDisplay.npc_mode;
    if (hiInp)  hiInp.value  = hpDisplay.threshold_high;
    if (loInp)  loInp.value  = hpDisplay.threshold_low;
    drawMap();
  });

  // Réassignation de propriétaire d'un personnage (MJ → joueur)
  socket.on('character_reassigned', ({ character_id, new_user_id }) => {
    // Mettre à jour les tokens locaux
    gameTokens.forEach(t => {
      if (t.character_id === character_id) t.char_user_id = new_user_id || null;
    });
    // Mettre à jour myChars si c'est un de nos personnages qui change de propriétaire
    const me = getUser();
    if (me) {
      myChars = (campaign?.characters || []).filter(c =>
        myRole === 'gm' || c.user_id === me.id || (c.id === character_id && new_user_id === me.id)
      );
      // Mettre à jour user_id dans campaign.characters
      const cc = (campaign?.characters || []).find(c => c.id === character_id);
      if (cc) cc.user_id = new_user_id;
    }
    drawMap();
  });

  socket.on('walls_updated', ({ map_id, walls }) => {
    if (currentMap?.id !== map_id) return;
    mapWalls = walls || [];
    _invalidateVisionAll();
    drawMap();
  });

  socket.on('lights_updated', ({ map_id, lights }) => {
    if (currentMap?.id !== map_id) return;
    mapLights = lights || [];
    drawMap();
  });

  socket.on('objects_updated', ({ map_id, objects }) => {
    if (currentMap?.id !== map_id) return;
    mapObjects = objects || [];
    syncLightsFromObjects();
    _invalidateVisionAll();
    drawMap();
  });

  socket.on('map_ping', ({ x, y, username }) => {
    // Ne pas afficher le propre ping (déjà affiché localement)
    if (username !== getUser()?.username) {
      addMapPing(x, y, username);
    }
  });

  // ── Ciblage ──
  socket.on('targets_state', (targets) => {
    campaignTargets.length = 0;
    if (!myRole || myRole === 'gm') {
      // MJ voit tout
      campaignTargets.push(...targets);
    } else {
      // Joueur : ne voit que les cibles révélées ou les siennes
      const myId = getUser()?.id;
      campaignTargets.push(...targets.filter(t => t.revealed || t.player_id === myId));
      myTargets = targets.filter(t => t.player_id === myId);
    }
    drawMap();
  });

  // ── Réception dessins distants ──
  socket.on('draw_stroke', ({ stroke }) => {
    drawStrokes.push(stroke);
    drawMap();
  });

  socket.on('draw_undo', ({ removed }) => {
    // Retirer le dernier stroke (correspond au pop distant)
    if (drawStrokes.length > 0) drawStrokes.pop();
    drawMap();
  });

  socket.on('draw_clear', () => {
    drawStrokes = [];
    drawMap();
  });

  socket.on('measure_show', ({ points, username }) => {
    if (username !== getUser()?.username) {
      remoteMeasure = { points, username };
      drawMap();
    }
  });

  socket.on('measure_clear', ({ username }) => {
    if (username !== getUser()?.username) {
      remoteMeasure = null;
      drawMap();
    }
  });

  socket.on('zone_added', ({ zone }) => {
    if (!spellZones.find(z => z.id === zone.id)) {
      spellZones.push(zone);
      drawMap();
    }
  });

  socket.on('zone_removed', ({ zone_id }) => {
    spellZones = spellZones.filter(z => z.id !== zone_id);
    drawMap();
  });

  socket.on('zone_moved', ({ zone }) => {
    const idx = spellZones.findIndex(z => z.id === zone.id);
    if (idx !== -1) { spellZones[idx] = zone; drawMap(); }
  });

  socket.on('zones_cleared', () => {
    spellZones = [];
    drawMap();
  });

  socket.on('handout_shared', ({ handout }) => {
    // Mettre à jour la liste locale
    const idx = handouts.findIndex(h => h.id === handout.id);
    if (idx >= 0) handouts[idx] = handout;
    else handouts.unshift(handout);
    renderJournalList();
    // Notification toast
    showHandoutToast(handout);
    // Badge sur le bouton journal
    journalNewCount++;
    const badge = document.getElementById('journalBadge');
    if (badge) { badge.textContent = journalNewCount > 9 ? '!' : journalNewCount; badge.classList.add('show'); }
  });

  socket.on('handout_unshared', ({ handout_id }) => {
    handouts = handouts.filter(h => h.id !== handout_id);
    if (activeHandoutId === handout_id) closeJournalEdit();
    renderJournalList();
  });

  socket.on('handout_deleted', ({ handout_id }) => {
    handouts = handouts.filter(h => h.id !== handout_id);
    if (activeHandoutId === handout_id) closeJournalEdit();
    renderJournalList();
  });

  // ── Mode nuit : synchronisation joueurs ─────────────────────
  socket.on('night_mode_state', ({ enabled }) => {
    if (myRole === 'gm') return; // GM already toggled locally
    toggleNightMode(!!enabled);
  });

  // ── Météo : synchronisation joueurs ──────────────────────────
  socket.on('weather_state', ({ type, intensity }) => {
    // Ignorer si on est le MJ (on a déjà appliqué localement)
    if (myRole === 'gm') return;
    setWeather(type || 'none', intensity ?? 5, false);
    const intSlider = document.getElementById('weatherIntensity');
    if (intSlider) {
      intSlider.value = intensity ?? 5;
      const lbl = document.getElementById('weatherIntLabel');
      if (lbl) lbl.textContent = intensity ?? 5;
    }
  });
}


let _spActiveLvl = -1;    // -1 = tous
let _spActiveClass = '';  // '' = toutes

function openSpellPicker() {
  _spActiveLvl = -1;
  _spActiveClass = '';
  document.getElementById('spSearch').value = '';
  buildSpFilters();
  filterSpells();
  document.getElementById('spellPickerOverlay').classList.add('open');
  setTimeout(() => document.getElementById('spSearch').focus(), 80);
}

function closeSpellPicker() {
  document.getElementById('spellPickerOverlay').classList.remove('open');
}

function buildSpFilters() {
  const c = document.getElementById('spFilters');
  c.innerHTML = '';
  // Filtres niveaux
  const allLvl = document.createElement('button');
  allLvl.className = 'sp-filter-btn on'; allLvl.textContent = 'Tous niveaux';
  allLvl.onclick = () => { _spActiveLvl = -1; refreshSpFilterBtns(); filterSpells(); };
  c.appendChild(allLvl);
  for (let l = 0; l <= 9; l++) {
    const b = document.createElement('button');
    b.className = 'sp-filter-btn';
    b.textContent = l === 0 ? 'Cantrip' : `Niv ${l}`;
    b.dataset.lvl = l;
    b.onclick = () => { _spActiveLvl = l; refreshSpFilterBtns(); filterSpells(); };
    c.appendChild(b);
  }
  // Séparateur visuel
  const sep = document.createElement('span');
  sep.style.cssText = 'width:1px;background:var(--border);height:18px;margin:0 .1rem;';
  c.appendChild(sep);
  // Filtres classes
  const allCls = document.createElement('button');
  allCls.className = 'sp-filter-btn'; allCls.textContent = 'Toutes classes';
  allCls.dataset.cls = '';
  allCls.onclick = () => { _spActiveClass = ''; refreshSpFilterBtns(); filterSpells(); };
  c.appendChild(allCls);
  SP_CLASSES.forEach(cl => {
    const b = document.createElement('button');
    b.className = 'sp-filter-btn';
    b.textContent = SP_CLASS_NAMES[cl];
    b.dataset.cls = cl;
    b.onclick = () => { _spActiveClass = cl; refreshSpFilterBtns(); filterSpells(); };
    c.appendChild(b);
  });
  refreshSpFilterBtns();
}

function refreshSpFilterBtns() {
  document.querySelectorAll('#spFilters .sp-filter-btn').forEach(b => {
    const isLvl = b.dataset.lvl !== undefined;
    const isCls = b.dataset.cls !== undefined;
    if (isLvl) {
      const bLvl = b.dataset.lvl !== undefined ? parseInt(b.dataset.lvl) : -1;
      b.classList.toggle('on', _spActiveLvl === parseInt(b.dataset.lvl));
    }
    if (isCls) b.classList.toggle('on', _spActiveClass === b.dataset.cls);
    // Bouton "Tous niveaux"
    if (!isLvl && !isCls) b.classList.toggle('on', _spActiveLvl === -1);
    if (b.textContent === 'Toutes classes') b.classList.toggle('on', _spActiveClass === '');
    if (b.textContent === 'Tous niveaux') b.classList.toggle('on', _spActiveLvl === -1);
  });
}

function filterSpells() {
  const q = (document.getElementById('spSearch').value || '').toLowerCase().trim();
  const list = document.getElementById('spList');
  const results = SPELLS_DB.filter(([name, lvl, school, classes]) => {
    if (_spActiveLvl !== -1 && lvl !== _spActiveLvl) return false;
    if (_spActiveClass && !classes.includes(_spActiveClass)) return false;
    if (q && !name.toLowerCase().includes(q)) return false;
    return true;
  });
  if (!results.length) {
    list.innerHTML = `<div class="sp-empty">Aucun sort trouvé.<br><span style="font-size:.78rem">Utilisez la saisie manuelle ci-dessous.</span></div>`;
    if (q) document.getElementById('spManualName').value = q.charAt(0).toUpperCase() + q.slice(1);
    return;
  }
  list.innerHTML = '';
  results.slice(0, 120).forEach(([name, lvl, school, classes]) => {
    const lvlLabel = lvl === 0 ? 'Cntrp' : `Niv ${lvl}`;
    const classNames = classes.split('').map(c => SP_CLASS_NAMES[c] || c).join(', ');
    const div = document.createElement('div');
    div.className = 'sp-item';
    div.dataset.name = name;
    div.dataset.lvl  = lvl;
    div.innerHTML = `<span class="sp-item-lvl">${lvlLabel}</span>
      <span class="sp-item-name">${name}</span>
      <span class="sp-item-school">${SP_SCHOOL_NAMES[school] || school}</span>
      <span class="sp-item-classes">${classNames}</span>`;
    div.addEventListener('click', () => selectSpell(name, lvl));
    list.appendChild(div);
  });
}

function selectSpell(name, level) {
  addSpellRow(name, level);
  closeSpellPicker();
}

function addSpellManual() {
  const name = document.getElementById('spManualName').value.trim();
  const level = parseInt(document.getElementById('spManualLvl').value) || 0;
  if (!name) return;
  addSpellRow(name, level);
  document.getElementById('spManualName').value = '';
  closeSpellPicker();
}
