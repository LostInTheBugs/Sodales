/**
 * Sodales — listeners socket finaux (partie extraite de game.html)
 * Toast et derniers événements temps réel.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function lvlupToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `lvlup-toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

// ── Socket listeners ──────────────────────────────────────────
function initLevelUpSocket() {
  // Joueur : demande envoyée avec succès
  socket.on('level_up_requested', ({ character_name, new_level }) => {
    lvlupToast(`Demande envoyée pour ${character_name} (niveau ${new_level}). En attente du MJ.`, 'info');
    // Marquer le personnage comme ayant une demande en attente
    if (editingChar && editingChar.name === character_name) {
      editingChar._pendingLvlup = true;
      const btn = document.getElementById('lvlupRequestBtn');
      if (btn) { btn.disabled = true; btn.title = 'Demande en attente…'; }
    }
  });

  // MJ : nouvelle demande reçue
  socket.on('level_up_pending', ({ request_id, character_name, player, old_level, new_level, hp_method, hit_die, con_mod, avg_hp }) => {
    updateLvlupBadge(1);
    const methodHint = hp_method === 'roll'
      ? `jet de d${hit_die}`
      : `+${avg_hp} PV (moy.)`;
    lvlupToast(`⬆ ${character_name} (${player}) demande le niveau ${new_level} — ${methodHint}.`, 'info');
    // Si le panneau est ouvert, rafraîchir
    if (document.getElementById('lvlupPanelOverlay').style.display !== 'none') {
      socket.emit('level_up_requests_list', { campaign_id: CAMPAIGN_ID });
    }
  });

  // Liste des demandes (réponse serveur)
  socket.on('level_up_requests_list', ({ requests }) => {
    _lvlupPendingCount = requests.length;
    updateLvlupBadge(0); // recalc since we set count directly
    const badge = document.getElementById('lvlupBadge');
    if (badge) { badge.style.display = _lvlupPendingCount > 0 ? 'inline-flex' : 'none'; badge.textContent = _lvlupPendingCount; }
    renderLevelUpPanel(requests);
  });

  // Broadcast résolution (joueur ET MJ)
  socket.on('level_up_resolved_broadcast', (data) => {
    const { approved, character_id, character_name, new_level, hp_gained, hp_roll, hit_die, con_mod,
            new_hp_max, new_prof, new_slots, updated_char, request_id, reject_reason, notes, hp_method } = data;

    if (approved) {
      const conSign = (con_mod >= 0 ? '+' : '') + con_mod;
      const hpDetail = hp_method === 'roll' && hp_roll != null
        ? `🎲 ${hp_roll} sur d${hit_die} + CON ${conSign} = +${hp_gained} PV`
        : `+${hp_gained} PV (moyenne d${hit_die} + CON ${conSign})`;
      lvlupToast(`🎉 ${character_name} passe au niveau ${new_level} ! ${hpDetail}`, 'success');
      // Notes spéciales (ASI, bonus de maîtrise…)
      if (notes && notes.length) {
        setTimeout(() => {
          notes.forEach(n => lvlupToast(`📋 ${character_name} : ${n}`, 'info'));
        }, 800);
      }
      // Mettre à jour activeChar si c'est lui
      if (activeChar && activeChar.id === character_id) {
        activeChar.level           = new_level;
        activeChar.hp_max          = new_hp_max;
        activeChar.hp_current      = Math.min(activeChar.hp_current + hp_gained, new_hp_max);
        activeChar.proficiency_bonus = new_prof;
        if (new_slots && activeChar.spells) {
          activeChar.spells.slots = new_slots;
        }
        renderCharSidebarStats();
      }
      // Mettre à jour editingChar si ouvert
      if (editingChar && editingChar.id === character_id) {
        editingChar.level            = new_level;
        editingChar.hp_max           = new_hp_max;
        editingChar.proficiency_bonus = new_prof;
        editingChar._pendingLvlup   = false;
        // Rafraîchir les champs de la fiche
        const lvlEl = document.getElementById('mcs-level');
        if (lvlEl) lvlEl.value = new_level;
        const lvlBtn = document.getElementById('lvlupRequestBtn');
        if (lvlBtn) { lvlBtn.disabled = false; lvlBtn.title = 'Demander une montée de niveau au MJ'; }
        // Recalcul des emplacements de sorts dans la fiche
        if (new_slots && updated_char?.spells) {
          editingChar.spells = updated_char.spells;
          populateMCSSpells(editingChar);
        }
      }
      // Mettre à jour myChars
      const ci = myChars.findIndex(c => c.id === character_id);
      if (ci >= 0 && updated_char) myChars[ci] = { ...myChars[ci], ...updated_char };
      // Mettre à jour le mini-stat sidebar
      const lvlEl = document.getElementById('charLevel');
      if (lvlEl && activeChar?.id === character_id) lvlEl.textContent = new_level;
    } else {
      const reason = reject_reason ? ` — ${reject_reason}` : '';
      lvlupToast(`Montée de niveau refusée pour ${character_name||'le personnage'}${reason}.`, 'error');
      // Débloquer le bouton
      if (editingChar && editingChar.id === character_id) {
        editingChar._pendingLvlup = false;
        const btn = document.getElementById('lvlupRequestBtn');
        if (btn) { btn.disabled = false; btn.title = 'Demander une montée de niveau au MJ'; }
      }
    }
  });

  socket.on('level_up_error', ({ message }) => {
    lvlupToast(message, 'error');
    const btn = document.getElementById('lvlupRequestBtn');
    if (btn) btn.disabled = false;
  });
}

// Helper: peupler les emplacements de sorts dans la fiche (réutilise logique existante)
function populateMCSSpells(char) {
  const spells = char?.spells || {};
  const slotsEl = document.getElementById('mcs-slots');
  if (!slotsEl) return;
  slotsEl.innerHTML = [1,2,3,4,5,6,7,8,9].map(lvl => {
    const maxVal  = (spells.slots||{})[lvl] || 0;
    const usedVal = (spells.slots_used||{})[lvl] || 0;
    return `<div class="slot-box"><label>Niv ${lvl}</label>
      <div class="slot-box-inputs">
        <input type="number" min="0" max="${maxVal}" value="${usedVal}" data-slot-used="${lvl}" onchange="onSlotChange(this,${lvl},'used')"/>
        <span>/</span>
        <input type="number" min="0" max="9" value="${maxVal}" data-slot-max="${lvl}" onchange="onSlotChange(this,${lvl},'max')"/>
      </div></div>`;
  }).join('');
}
