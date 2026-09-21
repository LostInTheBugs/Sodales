/**
 * Sodales — outils du MJ (partie extraite de game.html)
 * Tables aléatoires (frontend), panneau GM.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
const DND5E_HIT_DICE_FE = {
  'barbare':12,'barbarian':12,
  'guerrier':10,'fighter':10,'paladin':10,
  'rodeur':10,'ranger':10,
  'barde':8,'bard':8,'clerc':8,'cleric':8,
  'druide':8,'druid':8,'moine':8,'monk':8,
  'roublard':8,'rogue':8,'sorcelier':8,'occultiste':8,'warlock':8,
  'ensorceleur':6,'sorcerer':6,'magicien':6,'wizard':6,
};
function lvlupHitDie(cls) {
  const c = (cls||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  for (const [k,v] of Object.entries(DND5E_HIT_DICE_FE)) { if (c.includes(k)) return v; }
  return 8;
}
function lvlupConMod(char) {
  const con = char?.stats?.con ?? 10;
  return Math.floor((con - 10) / 2);
}

// ── État de la modale ─────────────────────────────────────────
let _lvlupState = { method:'average', roll:null, char:null, pendingRequestId:null };

function openLevelUpRequestModal() {
  const char = editingChar;
  if (!char) return;
  if (char.level >= 20) return lvlupToast('Le personnage est déjà au niveau maximum (20).', 'error');

  _lvlupState = { method:'average', roll:null, char, pendingRequestId: char._pendingLvlup || null };

  if (_lvlupState.pendingRequestId) {
    return lvlupToast('Une demande est déjà en attente pour ce personnage.', 'error');
  }

  const hitDie = lvlupHitDie(char.class);
  const conmod = lvlupConMod(char);
  const avg    = Math.max(1, Math.floor(hitDie/2) + 1 + conmod);
  const oldLvl = char.level || 1;
  const newLvl = oldLvl + 1;

  document.getElementById('lvlupOldLv').textContent = oldLvl;
  document.getElementById('lvlupNewLv').textContent = newLvl;
  document.getElementById('lvlupReqSub').textContent = `${char.name} — ${char.class || '?'} (d${hitDie})`;
  document.getElementById('lvlupAvgVal').textContent = `+${avg}`;
  document.getElementById('lvlupDieLabel').textContent = `d${hitDie}`;
  document.getElementById('lvlupDieResult').textContent = '';
  document.getElementById('lvlupHpPreview').textContent = `PV gagnés : +${avg} (moyenne d${hitDie} + CON ${conmod >= 0 ? '+' : ''}${conmod})`;
  document.getElementById('lvlupBtnAvg').classList.add('selected');
  document.getElementById('lvlupBtnRoll').classList.remove('selected');
  document.getElementById('lvlupConfirmBtn').disabled = false;

  document.getElementById('lvlupRequestOverlay').style.display = 'flex';
}

function closeLevelUpRequestModal() {
  document.getElementById('lvlupRequestOverlay').style.display = 'none';
}

function selectLvlupMethod(method) {
  _lvlupState.method = method;
  document.getElementById('lvlupBtnAvg').classList.toggle('selected', method === 'average');
  document.getElementById('lvlupBtnRoll').classList.toggle('selected', method === 'roll');

  const char   = _lvlupState.char;
  const hitDie = lvlupHitDie(char?.class);
  const conmod = lvlupConMod(char);

  if (method === 'average') {
    const avg = Math.max(1, Math.floor(hitDie/2) + 1 + conmod);
    document.getElementById('lvlupDieResult').textContent = '';
    document.getElementById('lvlupHpPreview').textContent = `Estimation : +${avg} PV (moyenne d${hitDie} + CON ${conmod >= 0 ? '+' : ''}${conmod})`;
  } else {
    // Le dé sera lancé côté serveur à la validation du MJ
    document.getElementById('lvlupDieResult').textContent = '🎲';
    document.getElementById('lvlupHpPreview').textContent = `Le serveur lancera 1d${hitDie} + CON ${conmod >= 0 ? '+' : ''}${conmod} lors de la validation`;
  }
  document.getElementById('lvlupConfirmBtn').disabled = false;
}

function submitLevelUpRequest() {
  const char = _lvlupState.char;
  if (!char) return;
  document.getElementById('lvlupConfirmBtn').disabled = true;
  socket.emit('level_up_request', {
    campaign_id: CAMPAIGN_ID,
    character_id: char.id,
    hp_method: _lvlupState.method,
  });
  closeLevelUpRequestModal();
}

// ── Panneau GM ────────────────────────────────────────────────
let _lvlupPendingCount = 0;

function openLevelUpPanel() {
  document.getElementById('lvlupPanelOverlay').style.display = 'flex';
  document.getElementById('lvlupPanelList').innerHTML = '<div class="lvlup-empty">Chargement…</div>';
  socket.emit('level_up_requests_list', { campaign_id: CAMPAIGN_ID });
}

function closeLevelUpPanel() {
  document.getElementById('lvlupPanelOverlay').style.display = 'none';
}

function renderLevelUpPanel(requests) {
  const list = document.getElementById('lvlupPanelList');
  if (!requests || requests.length === 0) {
    list.innerHTML = '<div class="lvlup-empty">Aucune demande en attente.</div>';
    return;
  }
  list.innerHTML = requests.map(r => {
    const conSign = (r.con_mod >= 0 ? '+' : '') + r.con_mod;
    const methodLabel = r.hp_method === 'roll'
      ? `Jet de d${r.hit_die} + CON ${conSign} <em>(résultat au moment de la validation)</em>`
      : `Moyenne → <strong>+${r.avg_hp} PV</strong> (d${r.hit_die} + CON ${conSign})`;
    return `<div class="lvlup-card" id="lvlcard-${r.id}">
      <div class="lvlup-card-header">
        <span class="lvlup-card-name">${esc(r.character_name)}</span>
        <span class="lvlup-card-player">👤 ${esc(r.player_name)}</span>
      </div>
      <div class="lvlup-card-info">
        ${esc(r.character_class||'?')} — Niveau <span>${r.old_level}</span> → <span>${r.new_level}</span> &nbsp;|&nbsp; ${methodLabel}
      </div>
      <div class="lvlup-card-actions">
        <textarea placeholder="Raison du refus (optionnel)" id="lvlreject-${r.id}"></textarea>
        <button class="btn-approve" data-act="resolveLevel" data-a='["${r.id}", true]'>✓ Approuver</button>
        <button class="btn-reject"  data-act="resolveLevel" data-a='["${r.id}", false]'>✗ Refuser</button>
      </div>
    </div>`;
  }).join('');
}

function resolveLevel(requestId, approved) {
  const reason = document.getElementById(`lvlreject-${requestId}`)?.value || null;
  socket.emit('level_up_resolve', {
    campaign_id: CAMPAIGN_ID,
    request_id: requestId,
    approved,
    reject_reason: approved ? null : reason,
  });
  // Retire la carte immédiatement
  const card = document.getElementById(`lvlcard-${requestId}`);
  if (card) card.remove();
  updateLvlupBadge(-1);
  if (!document.querySelector('.lvlup-card')) {
    document.getElementById('lvlupPanelList').innerHTML = '<div class="lvlup-empty">Aucune demande en attente.</div>';
  }
}

function updateLvlupBadge(delta) {
  _lvlupPendingCount = Math.max(0, _lvlupPendingCount + delta);
  const badge = document.getElementById('lvlupBadge');
  if (!badge) return;
  if (_lvlupPendingCount > 0) {
    badge.style.display = 'inline-flex';
    badge.textContent = _lvlupPendingCount;
  } else {
    badge.style.display = 'none';
  }
}
