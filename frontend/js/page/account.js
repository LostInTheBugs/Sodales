/* Sodales — logique de page extraite de account.html (CSP : plus de script inline) */
// ── Auth guard + init ─────────────────────────────────────────
let currentUser = null;
let ownedCampaigns = [];
let charDeleteOpt = 'keep'; // 'keep' ou 'delete'
const campaignChoices = {}; // { [campId]: { action: 'transfer'|'delete', transfer_to: uid } }

(async () => {
  const token = getToken();
  if (!token) { window.location.href = '/'; return; }
  try {
    // Utilise /auth/me pour le guard (compatible avec toutes les versions du cache)
    const user = await API.auth.me();
    currentUser = user;
    setUser(user);
    initUI(user);
  } catch (err) {
    // Ne vider le token que sur un vrai 401, pas sur une erreur réseau
    if (err.message && (err.message.includes('401') || err.message.includes('Token'))) {
      clearToken();
    }
    window.location.href = '/';
  }
})();

function initUI(user) {
  // Header
  const av = document.getElementById('userAvatar');
  if (user.avatar_url) {
    av.innerHTML = `<img src="${user.avatar_url}" alt="${user.username}"/>`;
  } else {
    av.textContent = user.username[0].toUpperCase();
  }
  document.getElementById('userName').textContent = user.username;
  document.getElementById('accountSub').textContent = `Connecté en tant que ${user.username} · ${user.email}`;

  // Profil
  document.getElementById('profUsername').value = user.username;
  document.getElementById('profEmail').value = user.email;
  if (user.avatar_url) {
    document.getElementById('avatarUrl').value = user.avatar_url;
    previewAvatar(user.avatar_url);
  } else {
    document.getElementById('avatarPreview').textContent = user.username[0].toUpperCase();
  }

  // Invitation
  document.getElementById('inviteCodeDisplay').textContent = user.invite_code || '—';
  if (user.created_at) {
    document.getElementById('memberSince').textContent = new Date(user.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  }
  if (user.last_login) {
    document.getElementById('lastLogin').textContent = new Date(user.last_login).toLocaleString('fr-FR', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } else {
    document.getElementById('lastLogin').textContent = 'Jamais';
  }
}

// ── Header dropdown ───────────────────────────────────────────
function toggleDropdown() {
  const menu = document.getElementById('dropdownMenu');
  const chevron = document.getElementById('chevronIcon');
  menu.classList.toggle('open');
  chevron.style.transform = menu.classList.contains('open') ? 'rotate(180deg)' : '';
}
document.addEventListener('click', e => {
  const dd = document.getElementById('userDropdown');
  if (!dd.contains(e.target)) {
    document.getElementById('dropdownMenu').classList.remove('open');
    document.getElementById('chevronIcon').style.transform = '';
  }
});
function logout() { clearToken(); window.location.href = '/'; }

// ── Onglets ───────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', ['profile','security','invite','danger'][i] === name);
  });
  document.querySelectorAll('.tab-panel').forEach((p, i) => {
    p.classList.toggle('active', ['tab-profile','tab-security','tab-invite','tab-danger'][i] === 'tab-'+name);
  });
}

// ── Avatar ────────────────────────────────────────────────────
function previewAvatar(url) {
  const prev = document.getElementById('avatarPreview');
  if (url) {
    prev.innerHTML = `<img src="${url}" alt="avatar" data-act="avatarFallback"/>`;
  } else {
    prev.textContent = currentUser ? currentUser.username[0].toUpperCase() : '?';
  }
}

async function uploadAvatarFile(input) {
  if (!input.files[0]) return;
  const btn = document.getElementById('uploadAvatarBtn');
  btn.style.opacity = '.5';
  try {
    const res = await API.upload(input.files[0]);
    document.getElementById('avatarUrl').value = res.url;
    previewAvatar(res.url);
  } catch (err) {
    showAlert('profile-alert', err.message);
  } finally {
    btn.style.opacity = '';
  }
}

async function saveAvatar() {
  const url = document.getElementById('avatarUrl').value.trim();
  const btn = document.getElementById('btnSaveAvatar');
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  try {
    const updated = await API.account.updateProfile({ avatar_url: url || null });
    currentUser = { ...currentUser, ...updated };
    setUser(currentUser);
    // Mettre à jour le header
    const av = document.getElementById('userAvatar');
    if (updated.avatar_url) {
      av.innerHTML = `<img src="${updated.avatar_url}" alt="${updated.username}"/>`;
    } else {
      av.textContent = updated.username[0].toUpperCase();
    }
    showAlert('profile-alert', 'Photo de profil mise à jour !', 'success');
  } catch (err) {
    showAlert('profile-alert', err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Mettre à jour la photo';
  }
}

// ── Profil ────────────────────────────────────────────────────
async function saveProfile() {
  const btn = document.getElementById('btnSaveProfile');
  const username = document.getElementById('profUsername').value.trim();
  const email = document.getElementById('profEmail').value.trim();
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  try {
    const updated = await API.account.updateProfile({ username, email });
    currentUser = { ...currentUser, ...updated };
    setUser(currentUser);
    document.getElementById('userName').textContent = updated.username;
    document.getElementById('accountSub').textContent = `Connecté en tant que ${updated.username} · ${updated.email}`;
    showAlert('profile-alert', 'Profil mis à jour avec succès !', 'success');
  } catch (err) {
    showAlert('profile-alert', err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Enregistrer les modifications';
  }
}

// ── Mot de passe ──────────────────────────────────────────────
async function changePassword() {
  const current = document.getElementById('pwCurrent').value;
  const newPw = document.getElementById('pwNew').value;
  const confirm = document.getElementById('pwConfirm').value;
  if (newPw !== confirm) { showAlert('pw-alert', 'Les mots de passe ne correspondent pas'); return; }
  const btn = document.getElementById('btnChangePw');
  btn.disabled = true; btn.textContent = 'Changement…';
  try {
    const resp = await API.account.changePassword({ current_password: current, new_password: newPw });
        if (resp && resp.token) setToken(resp.token);
    document.getElementById('pwCurrent').value = '';
    document.getElementById('pwNew').value = '';
    document.getElementById('pwConfirm').value = '';
    showAlert('pw-alert', 'Mot de passe changé ! Les autres sessions ont été déconnectées.', 'success');

async function logoutOthers() {
  try {
    const resp = await API.account.logoutOthers();
    if (resp && resp.token) { setToken(resp.token); }
    showAlert('pw-alert', 'Les autres sessions ont été déconnectées.', 'success');
  } catch (err) {
    showAlert('pw-alert', err.message);
  }
}
  } catch (err) {
    showAlert('pw-alert', err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Changer le mot de passe';
  }
}

// ── Copier le code d'invitation ───────────────────────────────
function copyInviteCode() {
  const code = document.getElementById('inviteCodeDisplay').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('btnCopyCode');
    btn.innerHTML = '<span>✓</span> Copié !';
    setTimeout(() => btn.innerHTML = '<span>📋</span> Copier', 2000);
  });
}

// ── Suppression de compte ─────────────────────────────────────
async function startDeleteFlow() {
  const flow = document.getElementById('deleteFlow');
  flow.style.display = 'block';
  document.getElementById('btnStartDelete').style.display = 'none';

  // Charger les campagnes dont on est MJ
  try {
    ownedCampaigns = await API.account.ownedCampaigns();
  } catch { ownedCampaigns = []; }

  const stepCamp = document.getElementById('stepCampaigns');
  const confirmNum = document.getElementById('confirmStepNum');

  if (ownedCampaigns.length > 0) {
    stepCamp.style.display = 'block';
    confirmNum.textContent = '3';
    renderCampaignActions();
  } else {
    stepCamp.style.display = 'none';
    confirmNum.textContent = '2';
  }
}

function renderCampaignActions() {
  const container = document.getElementById('campActionsList');
  container.innerHTML = '';
  for (const camp of ownedCampaigns) {
    if (!campaignChoices[camp.id]) {
      campaignChoices[camp.id] = { action: 'transfer', transfer_to: camp.members[0]?.id || null };
    }
    const choice = campaignChoices[camp.id];
    const memberOptions = camp.members.map(m =>
      `<option value="${m.id}" ${choice.transfer_to === m.id ? 'selected' : ''}>${m.username}</option>`
    ).join('');
    const hasMembers = camp.members.length > 0;

    const card = document.createElement('div');
    card.className = 'camp-action-card';
    card.innerHTML = `
      <div class="camp-action-name">🗺️ ${escHtml(camp.name)}</div>
      <div class="camp-action-opts">
        <div class="camp-action-opt ${choice.action==='transfer' ? 'active' : ''}"
             data-act="setCampAction" data-a='["${camp.id}", "transfer"]' id="opt-t-${camp.id}">
          🔄 Transférer
        </div>
        <div class="camp-action-opt del-opt ${choice.action==='delete' ? 'active' : ''}"
             data-act="setCampAction" data-a='["${camp.id}", "delete"]' id="opt-d-${camp.id}">
          🗑️ Supprimer
        </div>
      </div>
      <div class="transfer-select ${choice.action==='transfer' ? 'visible' : ''}" id="ts-${camp.id}">
        ${hasMembers
          ? `<label>Transférer à</label><select id="sel-${camp.id}" data-act="setTransferTo" data-a='["${camp.id}", "$value"]'>${memberOptions}</select>`
          : `<p style="font-size:.78rem;color:var(--danger);">⚠ Aucun autre membre dans cette campagne — seule la suppression est possible.</p>`
        }
      </div>
    `;
    container.appendChild(card);

    if (!hasMembers && choice.action === 'transfer') {
      setCampAction(camp.id, 'delete');
    }
  }
}

function setCampAction(campId, action) {
  if (!campaignChoices[campId]) campaignChoices[campId] = {};
  campaignChoices[campId].action = action;

  document.getElementById(`opt-t-${campId}`).classList.toggle('active', action === 'transfer');
  document.getElementById(`opt-d-${campId}`).classList.toggle('active', action === 'delete');
  const ts = document.getElementById(`ts-${campId}`);
  if (ts) ts.classList.toggle('visible', action === 'transfer');
}

function setTransferTo(campId, userId) {
  if (!campaignChoices[campId]) campaignChoices[campId] = {};
  campaignChoices[campId].transfer_to = userId;
}

function setCharOpt(opt) {
  charDeleteOpt = opt;
  document.getElementById('optKeepChars').classList.toggle('active', opt === 'keep');
  document.getElementById('optDelChars').classList.toggle('active', opt === 'delete');
  document.getElementById('charOptHint').textContent = opt === 'keep'
    ? 'Les personnages seront conservés dans les campagnes mais ne seront plus associés à votre compte.'
    : 'Tous vos personnages seront définitivement supprimés avec votre compte.';
}

async function confirmDelete() {
  const pw = document.getElementById('deleteConfirmPw').value;
  if (!pw) { showAlert('delete-alert', 'Veuillez saisir votre mot de passe.'); return; }

  // Construire campaign_actions
  const campaign_actions = Object.entries(campaignChoices).map(([campaign_id, c]) => ({
    campaign_id,
    action: c.action,
    transfer_to: c.transfer_to || undefined,
  }));

  const btn = document.getElementById('btnConfirmDelete');
  btn.disabled = true; btn.textContent = 'Suppression en cours…';

  try {
    await API.account.deleteAccount({
      password: pw,
      keep_characters: charDeleteOpt === 'keep',
      campaign_actions,
    });
    clearToken();
    // Redirection avec message
    window.location.href = '/?deleted=1';
  } catch (err) {
    showAlert('delete-alert', err.message);
    btn.disabled = false; btn.textContent = 'Supprimer définitivement mon compte';
  }
}

// ── Utilitaires ───────────────────────────────────────────────
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert ${type}`;
  el.style.display = 'block';
  if (type === 'success') setTimeout(() => el.style.display = 'none', 4000);
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
