/* Sodales — logique de page extraite de campaign-settings.html (CSP : plus de script inline) */
// ── Auth ──────────────────────────────────────────────────────
const TOKEN_KEY = 'rpg_token';
const USER_KEY  = 'rpg_user';
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getUser()  { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }

const params = new URLSearchParams(location.search);
const CAMPAIGN_ID = params.get('campaign');

if (!getToken() || !CAMPAIGN_ID) { location.href = '/lobby.html'; }

// ── API ───────────────────────────────────────────────────────
const API_BASE = '/rpg/api';
async function apiFetch(path, opts = {}) {
  const r = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), ...(opts.headers||{}) },
    ...opts,
  });
  if (r.status === 401) { location.href = '/login.html'; throw new Error('Unauthorized'); }
  return r.json();
}

// ── Helpers ───────────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function userColor(u) {
  const hues=[210,160,280,30,340,0,120,50,240,195];
  let h=0; for(const c of String(u)) h=(h*31+c.charCodeAt(0))&0xffff;
  return `hsl(${hues[h%hues.length]},65%,55%)`;
}

// ── State ─────────────────────────────────────────────────────
let campaign = null;

// ── Load ──────────────────────────────────────────────────────
(async () => {
  campaign = await apiFetch(`/campaigns/${CAMPAIGN_ID}`);
  if (campaign.role !== 'gm') {
    document.getElementById('pageContent').innerHTML =
      '<div style="text-align:center;padding:3rem;color:var(--danger);">⛔ Accès réservé au MJ</div>';
    return;
  }
  document.getElementById('headerTitle').textContent = campaign.name + ' — Réglages';
  render();
})();

function render() {
  const s = campaign.settings || {};
  const hp = s.hp_display || { pc_mode:'bar', npc_mode:'none', threshold_high:70, threshold_low:30 };
  const vm = s.vision_mode || 'all';
  const dm = s.display_mode || 'normal';

  document.getElementById('pageContent').innerHTML = `
  <!-- Informations générales -->
  <div class="section">
    <div class="section-title">📋 Informations générales</div>
    <div class="form-grid">
      <div class="fg">
        <label>Nom de la campagne</label>
        <input type="text" id="inp-name" value="${esc(campaign.name)}" maxlength="255" placeholder="Ma campagne…"/>
      </div>
      <div class="fg-row">
        <div class="fg">
          <label>Système de jeu</label>
          <input type="text" id="inp-system" value="${esc(campaign.system||'D&D 5e')}" maxlength="100" list="system-list" data-act="showSystemDescSettings"/>
          <div id="sysDescSettings" style="font-size:.73rem;color:var(--text2);padding:.3rem 0;"></div>
          <datalist id="system-list">
            <option value="D&amp;D 5e"/><option value="Pathfinder 2e"/>
            <option value="Warhammer Fantasy"/><option value="Call of Cthulhu"/>
            <option value="Starfinder"/><option value="Shadowrun"/>
            <option value="Vampire: The Masquerade"/><option value="Cyberpunk Red"/>
            <option value="Savage Worlds"/><option value="Cats! La Mascarade"/>
            <option value="Dune"/><option value="Star Wars"/>
            <option value="Le Seigneur des Anneaux"/><option value="Paranoia"/>
            <option value="Tomorrow City"/><option value="Autre"/>
          </datalist>
        </div>
        <div class="fg">
          <label>Code d'invitation</label>
          <div class="invite-row">
            <input type="text" id="inp-invite" value="${esc(campaign.invite_code||'')}" readonly style="cursor:default;"/>
            <button class="btn-sm" data-act="copyInvite" title="Copier">📋</button>
            <button class="btn-sm danger" data-act="regenInvite" title="Régénérer">🔄</button>
          </div>
          <div class="hint">Partagez ce code pour inviter des joueurs</div>
        </div>
      </div>
      <div class="fg">
        <label>Description</label>
        <textarea id="inp-desc" placeholder="Résumé de la campagne…">${esc(campaign.description||'')}</textarea>
      </div>
    </div>
  </div>

  <!-- Vision -->
  <div class="section">
    <div class="section-title">👁 Mode de vision par défaut</div>
    <div class="hint" style="margin-bottom:.9rem;">Détermine ce que les joueurs voient sur la carte au démarrage de la session.</div>
    <div class="radio-group">
      <div class="radio-pill">
        <input type="radio" name="vision" id="vm-all" value="all" ${vm==='all'?'checked':''}>
        <label for="vm-all">👁 Tout visible</label>
      </div>
      <div class="radio-pill">
        <input type="radio" name="vision" id="vm-character" value="character" ${vm==='character'?'checked':''}>
        <label for="vm-character">🧝 Vision personnage</label>
      </div>
      <div class="radio-pill">
        <input type="radio" name="vision" id="vm-none" value="none" ${vm==='none'?'checked':''}>
        <label for="vm-none">🌑 Rien visible</label>
      </div>
    </div>
  </div>

  <!-- Mode d'affichage -->
  <div class="section">
    <div class="section-title">🖥 Mode d'affichage</div>
    <div class="hint" style="margin-bottom:.9rem;">
      <strong>Normal</strong> — chaque joueur voit la carte sur son écran.<br>
      <strong>Map unique</strong> — les joueurs voient uniquement la fiche perso et le chat ;
      la carte s'affiche sur un écran central dédié.
    </div>
    <div class="radio-group">
      <div class="radio-pill">
        <input type="radio" name="display" id="dm-normal" value="normal" ${dm==='normal'?'checked':''}>
        <label for="dm-normal">📋 Normal</label>
      </div>
      <div class="radio-pill">
        <input type="radio" name="display" id="dm-map_unique" value="map_unique" ${dm==='map_unique'?'checked':''}>
        <label for="dm-map_unique">🖥 Map unique</label>
      </div>
    </div>
    <div id="displayModeHint" style="margin-top:.6rem;padding:.5rem .7rem;background:rgba(201,162,39,.08);border-radius:8px;font-size:.78rem;color:var(--text2);${dm==='map_unique'?'':'display:none'}">
      💡 Les joueurs verront un bouton <strong>🖥 Carte</strong> dans le lobby pour ouvrir l'écran central.
    </div>
  </div>

  <!-- HP Display -->
  <div class="section">
    <div class="section-title">❤ Affichage des points de vie</div>
    <div class="form-grid">
      <div class="fg">
        <label>Personnages joueurs (PJ)</label>
        <div class="radio-group">
          <div class="radio-pill"><input type="radio" name="hp-pc" id="hp-pc-none" value="none" ${hp.pc_mode==='none'?'checked':''}><label for="hp-pc-none">🚫 Masqué</label></div>
          <div class="radio-pill"><input type="radio" name="hp-pc" id="hp-pc-bar" value="bar" ${hp.pc_mode==='bar'?'checked':''}><label for="hp-pc-bar">▮▮▯ Barre couleur</label></div>
          <div class="radio-pill"><input type="radio" name="hp-pc" id="hp-pc-exact" value="exact" ${hp.pc_mode==='exact'?'checked':''}><label for="hp-pc-exact">🔢 Nombre exact</label></div>
        </div>
      </div>
      <div class="fg">
        <label>Ennemis / PNJ</label>
        <div class="radio-group">
          <div class="radio-pill"><input type="radio" name="hp-npc" id="hp-npc-none" value="none" ${hp.npc_mode==='none'?'checked':''}><label for="hp-npc-none">🚫 Masqué</label></div>
          <div class="radio-pill"><input type="radio" name="hp-npc" id="hp-npc-bar" value="bar" ${hp.npc_mode==='bar'?'checked':''}><label for="hp-npc-bar">▮▮▯ Barre couleur</label></div>
          <div class="radio-pill"><input type="radio" name="hp-npc" id="hp-npc-exact" value="exact" ${hp.npc_mode==='exact'?'checked':''}><label for="hp-npc-exact">🔢 Nombre exact</label></div>
        </div>
      </div>
      <div class="fg">
        <label>Seuils de couleur</label>
        <div class="threshold-row">
          <div class="threshold-item">🟢 Vert ≥ <input type="number" id="thr-high" value="${hp.threshold_high}" min="1" max="99" data-act="updateBarPreview"/> %</div>
          <div class="threshold-item">🔴 Rouge ≤ <input type="number" id="thr-low" value="${hp.threshold_low}" min="1" max="99" data-act="updateBarPreview"/> %</div>
        </div>
        <div class="bar-preview">
          <span style="font-size:.72rem;color:var(--text2);white-space:nowrap;">Aperçu :</span>
          <div class="bar-seg" id="bar-green" style="background:#4ade80;"></div>
          <div class="bar-seg" id="bar-orange" style="background:#fb923c;"></div>
          <div class="bar-seg" id="bar-red" style="background:#ef4444;"></div>
        </div>
        <div class="hint" id="bar-hint">Au dessus de ${hp.threshold_high}% = vert · Entre ${hp.threshold_low}% et ${hp.threshold_high}% = orange · En dessous de ${hp.threshold_low}% = rouge</div>
      </div>
    </div>
  </div>

  <!-- Membres -->
  <div class="section">
    <div class="section-title">👥 Membres de la campagne</div>
    <div class="members-grid">
      ${(campaign.members||[]).map(m => `
        <div class="member-row">
          <div class="member-avatar" style="background:${userColor(m.username)}">${m.username[0].toUpperCase()}</div>
          <span class="member-name">${esc(m.username)}</span>
          <span class="member-role ${m.role==='gm'?'role-gm':'role-player'}">${m.role==='gm'?'👑 MJ':'⚔ Joueur'}</span>
        </div>`).join('')}
    </div>
  </div>

  <!-- Zone dangereuse -->
  <div class="section danger-section">
    <div class="section-title">🗑 Zone dangereuse</div>
    <p style="font-size:.82rem;color:var(--text2);margin-bottom:.8rem;">Supprimer définitivement cette campagne et toutes ses données (personnages, cartes, messages…). Cette action est <strong>irréversible</strong>.</p>
    <button class="btn-save" id="btnDelete" data-act="deleteCampaign" style="background:linear-gradient(135deg,var(--danger),#a00000);color:#fff;">🗑 Supprimer cette campagne</button>
  </div>

  <!-- Sauvegarde -->
  <div class="save-row">
    <button class="btn-save" id="btnSave" data-act="saveSettings">💾 Enregistrer les réglages</button>
    <span class="save-status" id="saveStatus"></span>
  </div>
  `;
  updateBarPreview();
  // Afficher/masquer l'aide en fonction du mode d'affichage
  document.querySelectorAll('input[name="display"]').forEach(el => {
    el.addEventListener('change', () => {
      const hint = document.getElementById('displayModeHint');
      if (hint) hint.style.display = document.querySelector('input[name="display"]:checked')?.value === 'map_unique' ? '' : 'none';
    });
  });
}

function updateBarPreview() {
  const high = parseInt(document.getElementById('thr-high')?.value) || 70;
  const low  = parseInt(document.getElementById('thr-low')?.value)  || 30;
  const hint = document.getElementById('bar-hint');
  if (hint) hint.textContent = `Au dessus de ${high}% = vert · Entre ${low}% et ${high}% = orange · En dessous de ${low}% = rouge`;
  // Ajuster les largeurs de l'aperçu
  const green  = document.getElementById('bar-green');
  const orange = document.getElementById('bar-orange');
  const red    = document.getElementById('bar-red');
  if (green && orange && red) {
    const gPct = 100 - high;
    const oPct = high - low;
    const rPct = low;
    green.style.flex  = gPct  + ' 1 0';
    orange.style.flex = oPct  + ' 1 0';
    red.style.flex    = rPct  + ' 1 0';
  }
}

function copyInvite() {
  const val = document.getElementById('inp-invite')?.value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => showStatus('Code copié !', false));
}

async function regenInvite() {
  if (!confirm('Régénérer le code d\'invitation ? L\'ancien ne fonctionnera plus.')) return;
  try {
    const r = await apiFetch(`/campaigns/${CAMPAIGN_ID}`, {
      method: 'PUT',
      body: JSON.stringify({ regenerate_invite: true }),
    });
    campaign.invite_code = r.invite_code;
    document.getElementById('inp-invite').value = r.invite_code;
    showStatus('Nouveau code généré !', false);
  } catch (e) {
    showStatus('Erreur lors de la régénération', true);
  }
}

async function deleteCampaign() {
  if (!confirm('⚠️ Supprimer définitivement cette campagne ?\\n\\nTous les personnages, cartes, messages et tokens seront perdus. Cette action est irréversible.')) return;
  if (!confirm('🔴 Confirmer la suppression de "' + campaign.name + '" ?')) return;
  const btn = document.getElementById('btnDelete');
  btn.disabled = true; btn.textContent = '⏳ Suppression…';
  try {
    await apiFetch('/campaigns/' + CAMPAIGN_ID, { method: 'DELETE' });
    window.location.href = '/lobby.html';
  } catch (e) {
    document.getElementById('saveStatus').textContent = 'Erreur : ' + e.message;
    document.getElementById('saveStatus').className = 'save-status visible error';
    btn.disabled = false; btn.textContent = '🗑 Supprimer cette campagne';
  }
}

function showSystemDescSettings() {
  const inp = document.getElementById('inp-system');
  const descEl = document.getElementById('sysDescSettings');
  if (!inp || !descEl) return;
  const sys = getSystem(inp.value);
  if (sys && sys.desc) {
    descEl.innerHTML = `<span style="font-size:1.2rem;margin-right:.4rem;">${sys.logo || '🎲'}</span><span><strong>${sys.label}</strong> — ${sys.desc}</span>`;
  } else {
    descEl.innerHTML = '';
  }
}

async function saveSettings() {
  const btn = document.getElementById('btnSave');
  btn.disabled = true;

  const visionMode  = document.querySelector('input[name="vision"]:checked')?.value || 'all';
  const pcMode      = document.querySelector('input[name="hp-pc"]:checked')?.value  || 'bar';
  const npcMode     = document.querySelector('input[name="hp-npc"]:checked')?.value || 'none';
  const thrHigh     = parseInt(document.getElementById('thr-high')?.value)  || 70;
  const thrLow      = parseInt(document.getElementById('thr-low')?.value)   || 30;
  const displayMode = document.querySelector('input[name="display"]:checked')?.value || 'normal';

  const payload = {
    name:        document.getElementById('inp-name')?.value?.trim()   || campaign.name,
    system:      document.getElementById('inp-system')?.value?.trim() || campaign.system,
    description: document.getElementById('inp-desc')?.value || '',
    settings: {
      vision_mode: visionMode,
      hp_display: { pc_mode: pcMode, npc_mode: npcMode, threshold_high: thrHigh, threshold_low: thrLow },
      display_mode: displayMode,
    },
  };

  try {
    const r = await apiFetch(`/campaigns/${CAMPAIGN_ID}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    campaign = { ...campaign, ...r };
    showStatus('✓ Réglages enregistrés', false);
  } catch (e) {
    showStatus('Erreur lors de la sauvegarde', true);
  } finally {
    btn.disabled = false;
  }
}

function showStatus(msg, isError) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'save-status visible' + (isError ? ' error' : '');
  setTimeout(() => { el.className = 'save-status'; }, 3000);
}
