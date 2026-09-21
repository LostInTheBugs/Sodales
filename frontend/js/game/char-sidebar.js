/**
 * Sodales — panneau de fiche (partie extraite de game.html)
 * Tooltips (portrait, objets, sorts), jets rapides et lancement de sorts.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
let _portraitTipBound = false;
function showPortraitStatsTip(e) {
  if (!activeChar) return;
  let tip = document.getElementById('charStatsTip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'charStatsTip';
    tip.className = 'char-stats-tip';
    document.body.appendChild(tip);
  }
  const stats  = activeChar.stats || {};
  const sysStats = currentSystemStats();
  const STATS  = sysStats.map(s => s.key);
  const LABELS = sysStats.map(s => s.label);
  const inner  = STATS.map((s,i) => {
    const val = stats[s] || sysStats[i]?.default || 10;
    const statDef = sysStats.find(st => st.key === s);
    const base = statDef?.default || 10;
    const isStandard = !['Warhammer Fantasy','Call of Cthulhu','Shadowrun','Vampire: The Masquerade','Cyberpunk Red','Savage Worlds'].includes(currentSystemName());
    const mod = isStandard ? Math.floor((val - 10) / 2) : Math.floor((val - base) / 10);
    const ms  = (mod >= 0 ? '+' : '') + mod;
    return `<div class="stat-box" data-act="quickStatRoll" data-a='["${s}", "${LABELS[i]}"]' title="Jet de ${LABELS[i]} (1d20${ms})">
      <div class="stat-val">${val}</div>
      <div class="stat-mod-disp">${ms}</div>
      <div class="stat-lbl">${LABELS[i]}</div>
    </div>`;
  }).join('');
  const enc = getEncumbranceInfo(activeChar);
  const encLabels = { normal: '⚖ Normal', enc: '⚖ Encombré', heavy: '⚖ Très encombré', over: '⛔ Capacité dépassée' };
  const encColors = { normal: 'var(--success)', enc: '#f59e0b', heavy: '#ef4444', over: '#ef4444' };
  const speedVal = activeChar.speed || 30;
  const encHtml = `<div style="margin-top:.5rem;padding-top:.5rem;border-top:1px solid var(--border);font-size:.7rem;color:var(--text2);">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span>Charge portée</span>
      <span style="color:var(--text);font-weight:600;">${enc.carried} kg / ${enc.max} kg</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.15rem;">
      <span>Vitesse</span><span style="color:var(--text);">${speedVal} m</span>
    </div>
    <div style="margin-top:.3rem;font-weight:600;color:${encColors[enc.status]}">${encLabels[enc.status]}</div>
    <div style="margin-top:.3rem;height:5px;background:var(--surface2);border-radius:3px;overflow:hidden;">
      <div style="height:5px;width:${Math.min(100,enc.carried/enc.max*100)}%;background:${encColors[enc.status]};border-radius:3px;transition:.3s;"></div>
    </div>
  </div>`;
  tip.innerHTML = `<div class="char-stats-tip-grid">${inner}</div>${encHtml}`;
  // Position: just to the right of the portrait
  const r = e.currentTarget.getBoundingClientRect();
  tip.style.left = (r.right + 10) + 'px';
  tip.style.top  = r.top + 'px';
  tip.classList.add('show');
}
function hidePortraitStatsTip() {
  const tip = document.getElementById('charStatsTip');
  if (tip) tip.classList.remove('show');
}

function currentSystemName() {
  return (campaign && campaign.system) || 'D&D 5e';
}
function currentSystemStats() {
  return getSystemStats(currentSystemName());
}
function currentSystemSkills() {
  return getSystemSkills(currentSystemName());
}

function renderCharSidebarStats() {
  if (!activeChar) return;
  const stats = activeChar.stats || {};
  const sysStats = currentSystemStats();
  const STATS = sysStats.map(s => s.key);
  const LABELS = sysStats.map(s => s.label);
  const prof = activeChar.proficiency_bonus || 2;

  // Bind portrait hover (once per char change)
  const portrait = document.getElementById('charPortrait');
  if (portrait && !portrait._statsTipBound) {
    portrait.addEventListener('mouseenter', showPortraitStatsTip);
    portrait.addEventListener('mouseleave', hidePortraitStatsTip);
    portrait._statsTipBound = true;
  }

  // Ajouter section jets rapides sous les stats (si pas déjà présente)
  let qroll = document.getElementById('quickRollSection');
  if (!qroll) {
    qroll = document.createElement('div');
    qroll.id = 'quickRollSection';
    qroll.style.cssText = 'margin-top:.5rem;';
    const btn = document.querySelector('.btn-edit-char');
    if (btn && btn.parentNode) btn.parentNode.insertBefore(qroll, btn);
  }
  // Jets de sauvegarde (adaptés au système)
  const sysSavingStats = currentSystemStats();
  const savingLabels = sysSavingStats.map(s => s.label);
  const savingAttrs  = sysSavingStats.map(s => s.key);
  const proficiencies = activeChar.saving_throws || {};
  const savingHtml = `<div style="font-size:.65rem;color:var(--text2);margin:.3rem 0 .2rem;text-transform:uppercase;letter-spacing:.05em;">Jets de sauvegarde</div>
    <div style="display:flex;flex-wrap:wrap;gap:.3rem;">
    ${savingAttrs.map((a,i) => {
      const sysSaveStats = currentSystemStats();
    const statDef = sysSaveStats.find(st => st.key === a);
    const base = statDef?.default || 10;
    const isStandard = !['Warhammer Fantasy','Call of Cthulhu','Shadowrun','Vampire: The Masquerade','Cyberpunk Red','Savage Worlds'].includes(currentSystemName());
    const mod = Math.floor(((stats[a]||base) - base) / (isStandard ? 2 : 10)) + (proficiencies[a] ? prof : 0);
      const ms = (mod>=0?'+':'')+mod;
      return `<div data-act="quickSaveRoll" data-a='["${a}", "${savingLabels[i]}"]' style="background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:.2rem .4rem;font-size:.65rem;cursor:pointer;color:var(--text2)" title="JS ${savingLabels[i]} (1d20${ms})"><span style="color:var(--accent)">${ms}</span> ${savingLabels[i]}</div>`;
    }).join('')}
    </div>`;
  // Sorts du personnage
  const rawSpells = activeChar.spells;
  let spellEntries = [];
  if (Array.isArray(rawSpells)) {
    // Format lobby : ["Boule de feu (niv.3)", ...]
    spellEntries = rawSpells.map(s => {
      if (typeof s !== 'string') return { name: String(s), level: 0 };
      const m = s.match(/^(.+?)\s*\((?:niv\.?(\d)|cantrip)\)$/i);
      return m ? { name: m[1].trim(), level: m[2] ? parseInt(m[2]) : 0 } : { name: s, level: 0 };
    });
  } else if (rawSpells && Array.isArray(rawSpells.list)) {
    spellEntries = rawSpells.list;
  }
  let spellsHtml = `<div style="font-size:.65rem;color:var(--text2);margin:.35rem 0 .2rem;text-transform:uppercase;letter-spacing:.05em;">Sorts <span style="font-size:.6rem;color:var(--text2);text-transform:none;">(clic gauche = lancer · droit = infos)</span></div>`;
  if (!spellEntries.length) {
    spellsHtml += `<div style="font-size:.72rem;color:var(--text2);padding:.2rem .3rem;">Aucun sort</div>`;
  } else {
    spellsHtml += `<div id="sidebarSpellList" style="max-height:130px;overflow-y:auto;">`;
    spellEntries.forEach((sp, i) => {
      const name = sp.name || String(sp);
      const lvl  = typeof sp.level === 'number' ? sp.level : (parseInt(sp.level) || 0);
      const lvlLabel = lvl === 0 ? 'Cntrp' : `Niv.${lvl}`;
      spellsHtml += `<div class="sidebar-spell-row" data-idx="${i}">
        <span class="sidebar-spell-lvl">${lvlLabel}</span>
        <span class="sidebar-spell-name" title="${name}">${name}</span>
      </div>`;
    });
    spellsHtml += `</div>`;
  }
  // Inventaire
  const invItems = (activeChar.inventory?.items || []).filter(it => it.name);
  let invHtml = `<div style="font-size:.65rem;color:var(--text2);margin:.35rem 0 .2rem;text-transform:uppercase;letter-spacing:.05em;">Inventaire</div>`;
  if (!invItems.length) {
    invHtml += `<div style="font-size:.72rem;color:var(--text2);padding:.2rem .3rem;">Aucun objet</div>`;
  } else {
    invHtml += `<div id="sidebarInvList" style="max-height:90px;overflow-y:auto;">`;
    invItems.forEach((it, i) => {
      const w = it.weight != null ? it.weight : (lookupItemWeight(it.name) ?? null);
      const wTxt = w != null ? `${w * (it.qty||1)} kg` : '';
      invHtml += `<div class="sidebar-inv-row" data-inv-idx="${i}">
        <span class="sidebar-inv-qty">${it.qty||1}×</span>
        <span class="sidebar-inv-name">${esc(it.name)}</span>
        ${wTxt ? `<span class="sidebar-inv-w">${wTxt}</span>` : ''}
      </div>`;
    });
    invHtml += `</div>`;
  }

  qroll.innerHTML = savingHtml + spellsHtml + invHtml;

  // Bind spell row events (after innerHTML set)
  qroll.querySelectorAll('.sidebar-spell-row').forEach(row => {
    const idx = parseInt(row.dataset.idx);
    const sp = spellEntries[idx];
    if (!sp) return;
    const name = sp.name || String(sp);
    const lvl  = typeof sp.level === 'number' ? sp.level : (parseInt(sp.level) || 0);
    row.addEventListener('click', () => handleSpellClick(name, lvl));
    row.addEventListener('mouseenter', e => showSpellHoverTip(name, lvl, e));
    row.addEventListener('mouseleave', () => hideSpellHoverTip());
    row.addEventListener('contextmenu', e => { e.preventDefault(); showSpellInfoTip(name, lvl, e); });
  });

  // Bind inventory tooltip events
  qroll.querySelectorAll('.sidebar-inv-row').forEach(row => {
    const i = parseInt(row.dataset.invIdx);
    const it = invItems[i];
    if (!it) return;
    row.addEventListener('mouseenter', e => showItemTip(it, e));
    row.addEventListener('mouseleave', hideItemTip);
  });

  // Bind modal inventory items tooltip (re-bind each render)
  bindModalInvTooltips();

  // Update encumbrance indicator
  updateEncumbranceStat(activeChar);
}

// ── Item tooltip ──────────────────────────────────────────────
function showItemTip(it, e) {
  let tip = document.getElementById('itemTip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'itemTip';
    tip.className = 'item-tip';
    document.body.appendChild(tip);
  }
  const w = it.weight != null ? it.weight : (lookupItemWeight(it.name) ?? null);
  const totalW = w != null ? w * (it.qty || 1) : null;
  tip.innerHTML = `<div class="item-tip-name">${esc(it.name)}</div>
    <div class="item-tip-detail">
      Quantité : ${it.qty || 1}
      ${w != null ? `<br>Poids unitaire : ${w} kg` : ''}
      ${totalW != null ? `<br>Poids total : <strong style="color:var(--accent)">${Math.round(totalW*10)/10} kg</strong>` : ''}
    </div>`;
  const x = Math.min(e.clientX + 12, window.innerWidth - 260);
  const y = Math.min(e.clientY + 12, window.innerHeight - 100);
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
  tip.classList.add('show');
}
function hideItemTip() {
  const tip = document.getElementById('itemTip');
  if (tip) tip.classList.remove('show');
}

function bindModalInvTooltips() {
  document.querySelectorAll('#mcs-items .item-row').forEach(row => {
    if (row._tipBound) return;
    row._tipBound = true;
    row.addEventListener('mouseenter', e => {
      const name = row.querySelector('input[type=text]')?.value.trim() || '';
      const qty  = parseInt(row.querySelector('.item-qty')?.value) || 1;
      const w    = parseFloat(row.querySelector('.item-weight-inp')?.value);
      showItemTip({ name, qty, weight: isNaN(w) ? null : w }, e);
    });
    row.addEventListener('mouseleave', hideItemTip);
  });
}

// ── Jets rapides depuis la fiche ─────────────────────────────
function quickStatRoll(attr, label) {
  if (!activeChar) return;
  const val = activeChar.stats?.[attr] || 10;
  const mod = Math.floor((val - 10) / 2);
  sendQuickRoll(`Jet de ${label}`, 20, mod, activeChar.name);
}
function quickSaveRoll(attr, label) {
  if (!activeChar) return;
  const val = activeChar.stats?.[attr] || 10;
  const base = Math.floor((val - 10) / 2);
  const prof = activeChar.proficiency_bonus || 2;
  const hasSaveMastery = activeChar.saving_throws?.[attr];
  const mod = base + (hasSaveMastery ? prof : 0);
  sendQuickRoll(`JS ${label}`, 20, mod, activeChar.name);
}
function quickSkillRoll(skillName, attr) {
  if (!activeChar) return;
  const val = activeChar.stats?.[attr] || 10;
  const base = Math.floor((val - 10) / 2);
  const prof = activeChar.proficiency_bonus || 2;
  const hasMastery = activeChar.skills?.[skillName];
  const mod = base + (hasMastery ? prof : 0);
  sendQuickRoll(skillName, 20, mod, activeChar.name);
}

// Determine spellcasting ability modifier for a given class
function getSpellcastingMod(char) {
  const cls = (char.class || '').toLowerCase();
  const stats = char.stats || {};
  if (/magicien|artificier|enquêteur/.test(cls)) return Math.floor(((stats.int||10)-10)/2);
  if (/clerc|druide|rôdeur|rodeur/.test(cls))    return Math.floor(((stats.wis||10)-10)/2);
  return Math.floor(((stats.cha||10)-10)/2);
}
// Healing modifier: same logic but healing uses spellcasting stat
function getHealingMod(char) { return getSpellcastingMod(char); }

// ── Gestion du clic sur un sort (avec ou sans upcast) ──────────
function handleSpellClick(name, baseLevel) {
  if (!socket || !activeChar) return;
  const descEntry = typeof SPELLS_DESC !== 'undefined' ? SPELLS_DESC[name] : null;
  const diceEntry = typeof SPELLS_DICE  !== 'undefined' ? SPELLS_DICE[name]  : null;

  // Cantrips : pas d'upcast, lancer directement
  if (baseLevel === 0 || !descEntry?.upcast_dice) {
    castSidebarSpell(name, baseLevel, baseLevel);
    return;
  }

  // Sort avec upcast possible → ouvrir la modale de sélection de niveau
  openUpcastModal(name, baseLevel, diceEntry, descEntry);
}

function openUpcastModal(name, baseLevel, diceEntry, descEntry) {
  const overlay = document.getElementById('upcastOverlay');
  if (!overlay) return;

  // Remplir le header
  overlay.querySelector('.upcast-head h3').textContent = name;
  const lvlLabel = `Niveau ${baseLevel} · ${descEntry?.upcast || ''}`;
  overlay.querySelector('.upcast-head p').textContent = lvlLabel.slice(0, 80);

  // Construire les boutons de niveau
  const slotsEl = overlay.querySelector('.upcast-slots');
  slotsEl.innerHTML = '';

  const slots     = activeChar.spells?.slots      || {};
  const slotsUsed = activeChar.spells?.slots_used || {};

  for (let lvl = baseLevel; lvl <= 9; lvl++) {
    const total     = parseInt(slots[lvl]) || 0;
    const used      = parseInt(slotsUsed[lvl]) || 0;
    const available = total - used;

    // Calculer les dés à ce niveau
    let diceDisplay = '';
    if (diceEntry) {
      const [type, baseDice] = diceEntry.split(':');
      if (descEntry?.upcast_dice && lvl > baseLevel) {
        const extra = lvl - baseLevel;
        // Parse base dice (e.g. "8d6") and add extra dice
        const m = baseDice?.match(/^(\d+)d(\d+)$/);
        const upM = descEntry.upcast_dice.match(/^(\d+)d(\d+)$/);
        if (m && upM && m[2] === upM[2]) {
          const totalDice = parseInt(m[1]) + extra * parseInt(upM[1]);
          diceDisplay = `${totalDice}d${m[2]}`;
        } else if (m && upM) {
          diceDisplay = `${baseDice} + ${extra}×${descEntry.upcast_dice}`;
        } else {
          diceDisplay = baseDice || '';
        }
      } else {
        diceDisplay = baseDice || '';
      }
      const typeLabel = type === 'atk' ? '🎯' : type === 'sav' ? '🛡' : type === 'heal' ? '💚' : '✨';
      diceDisplay = `${typeLabel} ${diceDisplay}`;
    }

    const btn = document.createElement('button');
    btn.className = 'upcast-slot-btn' + (lvl === baseLevel ? ' base-level' : '');
    btn.disabled  = available <= 0 && total > 0; // disable if no slots
    btn.innerHTML = `<span class="upcast-slot-lvl">Niveau ${lvl}</span>
      <span class="upcast-slot-dice">${diceDisplay || '— utilitaire —'}</span>
      <span class="upcast-slot-avail">${total > 0 ? `${available}/${total}` : '∞'}</span>`;
    btn.addEventListener('click', () => {
      closeUpcastModal();
      castSidebarSpell(name, baseLevel, lvl);
    });
    slotsEl.appendChild(btn);
  }

  overlay.classList.add('open');
}

function closeUpcastModal() {
  const overlay = document.getElementById('upcastOverlay');
  if (overlay) overlay.classList.remove('open');
}

function castSidebarSpell(name, baseLevel, slotLevel) {
  if (!socket || !activeChar) return;
  const sl = slotLevel ?? baseLevel;
  const lvlLabel  = sl === 0 ? 'cantrip' : `niveau ${sl}`;
  const diceEntry = typeof SPELLS_DICE !== 'undefined' ? SPELLS_DICE[name] : null;
  const descEntry = typeof SPELLS_DESC !== 'undefined' ? SPELLS_DESC[name] : null;
  const spellMod  = getSpellcastingMod(activeChar);
  const prof      = activeChar.proficiency_bonus || 2;

  // Compute actual dice (accounting for upcast)
  let finalDice = null;
  if (diceEntry) {
    const [type, baseDice] = diceEntry.split(':');
    let dice = baseDice || null;
    if (descEntry?.upcast_dice && sl > baseLevel && baseDice) {
      const extra = sl - baseLevel;
      const m  = baseDice.match(/^(\d+)d(\d+)$/);
      const um = descEntry.upcast_dice.match(/^(\d+)d(\d+)$/);
      if (m && um && m[2] === um[2]) {
        dice = `${parseInt(m[1]) + extra * parseInt(um[1])}d${m[2]}`;
      }
    }
    finalDice = { type, dice };
  }

  // Determine chat suffix
  let chatSuffix = '';
  if (finalDice) {
    if (finalDice.type === 'atk')  chatSuffix = ' — *jet d\'attaque*';
    else if (finalDice.type === 'heal') chatSuffix = ' — *soin*';
    // sav : pas de suffixe — le DD est affiché séparément, le MJ gère le jet de la cible
  }
  const upcastNote = sl > baseLevel ? ` ↑ niv.${sl}` : '';

  // Announce cast in chat
  socket.emit('chat_message', {
    campaign_id: CAMPAIGN_ID,
    content: `✨ lance **${name}** (${lvlLabel}${upcastNote})${chatSuffix}`,
    character_name: activeChar.name,
  });

  // Post spell description if available
  if (descEntry?.desc) {
    let descMsg = `*${descEntry.desc}*`;
    if (descEntry.upcast && sl > baseLevel) {
      descMsg += `\n\n⬆ *${descEntry.upcast}*`;
    }
    socket.emit('chat_message', {
      campaign_id: CAMPAIGN_ID,
      content: descMsg,
      character_name: activeChar.name,
    });
  }

  if (!finalDice) return;
  const { type, dice } = finalDice;

  if (type === 'atk') {
    socket.emit('dice_roll', {
      campaign_id: CAMPAIGN_ID, dice: '1d20', modifier: spellMod + prof,
      character_name: activeChar.name, label: `Attaque — ${name}`,
    });
    if (dice) socket.emit('dice_roll', {
      campaign_id: CAMPAIGN_ID, dice, modifier: 0,
      character_name: activeChar.name, label: `Dégâts — ${name}`,
    });
  } else if (type === 'sav') {
    const dc = 8 + prof + spellMod;
    socket.emit('chat_message', {
      campaign_id: CAMPAIGN_ID,
      content: `*DD de sauvegarde : ${dc}${descEntry?.save ? ` (${descEntry.save})` : ''}*`,
      character_name: activeChar.name,
    });
    if (dice) socket.emit('dice_roll', {
      campaign_id: CAMPAIGN_ID, dice, modifier: 0,
      character_name: activeChar.name, label: `Dégâts (échec sauvegarde) — ${name}`,
    });
  } else if (type === 'heal') {
    const healMod = getHealingMod(activeChar);
    socket.emit('dice_roll', {
      campaign_id: CAMPAIGN_ID, dice, modifier: healMod,
      character_name: activeChar.name, label: `Soin — ${name}`,
    });
  } else if (type === 'hit') {
    if (dice) socket.emit('dice_roll', {
      campaign_id: CAMPAIGN_ID, dice, modifier: 0,
      character_name: activeChar.name, label: `Dégâts — ${name}`,
    });
  }
  revealTargetsAfterRoll();
}

// ── Spell info tooltip (right-click) ──────────────────────────
let _spellTipTimeout = null;
function showSpellInfoTip(name, level, e) {
  let tip = document.getElementById('spellInfoTip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'spellInfoTip';
    tip.className = 'spell-info-tip';
    document.body.appendChild(tip);
    document.addEventListener('click', () => hideSpellInfoTip(), { once: false });
  }
  // Lookup in SPELLS_DB
  const SP_SCHOOL_NAMES = {Abj:'Abjuration',Invo:'Invocation',Div:'Divination',Ench:'Enchantement',Évoc:'Évocation',Illu:'Illusion',Nécr:'Nécromancie',Tran:'Transmutation'};
  const SP_CLASS_NAMES  = {B:'Barde',C:'Clerc',D:'Druide',E:'Ensorceleur',M:'Magicien',O:'Occultiste',P:'Paladin',R:'Rôdeur'};
  const entry = SPELLS_DB.find(([n]) => n.toLowerCase() === name.toLowerCase());
  const lvlLabel  = level === 0 ? 'Cantrip' : `Niveau ${level}`;
  const school    = entry ? (SP_SCHOOL_NAMES[entry[2]] || entry[2]) : '';
  const classes   = entry ? entry[3].split('').map(c => SP_CLASS_NAMES[c] || c).join(', ') : '';
  const descEntry = typeof SPELLS_DESC !== 'undefined' ? SPELLS_DESC[name] : null;
  tip.innerHTML = `<div class="tip-name">${esc(name)}</div>
    <div class="tip-lvl">${lvlLabel}${school ? ' · ' + school : ''}</div>
    ${classes ? `<div class="tip-classes">${classes}</div>` : ''}
    ${descEntry?.desc ? `<div class="tip-desc">${esc(descEntry.desc)}</div>` : ''}
    ${descEntry?.upcast ? `<div class="tip-upcast">⬆ ${esc(descEntry.upcast)}</div>` : ''}`;
  // Position near cursor
  const x = Math.min(e.clientX + 10, window.innerWidth - 230);
  const y = Math.min(e.clientY + 10, window.innerHeight - 100);
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
  tip.classList.add('show');
  if (_spellTipTimeout) clearTimeout(_spellTipTimeout);
  _spellTipTimeout = setTimeout(() => hideSpellInfoTip(), 4000);
}
function hideSpellInfoTip() {
  const tip = document.getElementById('spellInfoTip');
  if (tip) tip.classList.remove('show');
}

// ── Spell hover tooltip (mouseenter) ─────────────────────
let _hoverTipDelay = null;
function showSpellHoverTip(name, level, e) {
  // Only show if there is a description
  const descEntry = typeof SPELLS_DESC !== 'undefined' ? SPELLS_DESC[name] : null;
  if (!descEntry?.desc) return;

  if (_hoverTipDelay) clearTimeout(_hoverTipDelay);
  _hoverTipDelay = setTimeout(() => {
    let tip = document.getElementById('spellHoverTip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'spellHoverTip';
      tip.className = 'spell-info-tip hover-full';
      document.body.appendChild(tip);
    }
    const lvlLabel = level === 0 ? 'Cantrip' : `Niveau ${level}`;
    tip.innerHTML = `<div class="tip-name">${esc(name)}</div>
      <div class="tip-lvl">${lvlLabel}</div>
      <div class="tip-desc">${esc(descEntry.desc)}</div>
      ${descEntry.upcast ? `<div class="tip-upcast">⬆ ${esc(descEntry.upcast)}</div>` : ''}`;
    const x = Math.min(e.clientX + 14, window.innerWidth - 310);
    const y = Math.min(e.clientY + 14, window.innerHeight - 160);
    tip.style.left = x + 'px';
    tip.style.top  = y + 'px';
    tip.classList.add('show');
  }, 350);
}
function hideSpellHoverTip() {
  if (_hoverTipDelay) { clearTimeout(_hoverTipDelay); _hoverTipDelay = null; }
  const tip = document.getElementById('spellHoverTip');
  if (tip) tip.classList.remove('show');
}

function revealTargetsAfterRoll() {
  if (!socket || !selectedToken || !campaignTargets?.length) return;
  // Vérifier si on a des cibles et révéler
  const myTarget = myTargets?.find(t => t.from_token_id === selectedToken);
  if (!myTarget) return;
  // Vérifier si d'autres ennemis sont adjacents
  const toToken = gameTokens.find(tk => tk.id === myTarget.to_token_id);
  if (!toToken) return;
  const gs = currentMap?.grid_size || 50;
  const nearbyEnemy = gameTokens.some(tk =>
    tk.id !== myTarget.to_token_id &&
    Math.abs(tk.x - toToken.x) <= gs * 1.5 &&
    Math.abs(tk.y - toToken.y) <= gs * 1.5
  );
  if (!nearbyEnemy) {
    socket.emit('reveal_targets_on_roll', {
      campaign_id: CAMPAIGN_ID,
      from_token_id: selectedToken,
      dice_data: {},
    });
  }
}

function sendQuickRoll(label, dice, modifier, charName) {
  if (!socket) return;
  socket.emit('dice_roll', {
    campaign_id: CAMPAIGN_ID,
    dice, modifier,
    character_name: charName,
    label,
  });
  revealTargetsAfterRoll();
}

function updateHPBar() {
  if (!activeChar) return;
  const cur = parseInt(document.getElementById('hpCurrent').value) || 0;
  const max = activeChar.hp_max || 1;
  const pct = Math.max(0, Math.min(100, cur / max * 100));
  const fill = document.getElementById('hpFill');
  fill.style.width = pct + '%';
  fill.className = 'hp-fill' + (pct < 30 ? ' low' : '');
}

async function updateHP() {
  if (!activeChar) return;
  updateHPBar();
  const val = parseInt(document.getElementById('hpCurrent').value) || 0;
  try {
    await API.characters.update(CAMPAIGN_ID, activeChar.id, { hp_current: val });
    activeChar.hp_current = val;
  } catch {}
}
