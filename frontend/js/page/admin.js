/* Sodales — logique de page extraite de admin.html (CSP : plus de script inline) */
// ══════════════════════════════════════════════════════════════
// CAPTCHA
// ══════════════════════════════════════════════════════════════
let _adminCaptchaAnswer = 0;
function buildAdminCaptcha() {
  const a = Math.floor(Math.random() * 9) + 2;
  const b = Math.floor(Math.random() * 9) + 2;
  const ops = ['+', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  _adminCaptchaAnswer = op === '+' ? a + b : a * b;
  const el = document.getElementById('adminCaptcha');
  if (!el) return;
  const cv = document.createElement('canvas');
  cv.width = 120; cv.height = 40;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#1e1e2a';
  cx.beginPath(); cx.roundRect(0, 0, 120, 40, 6); cx.fill();
  cx.strokeStyle = '#2a2a3a';
  cx.lineWidth = 1;
  cx.beginPath(); cx.roundRect(0, 0, 120, 40, 6); cx.stroke();
  const colors = ['#c9a227','#8b5cf6','#22c55e','#ef4444','#3b82f6'];
  cx.font = 'bold 20px Inter, sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
  cx.transform(1, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, 1, 0, 0);
  cx.fillText(`${a} ${op} ${b} = ?`, 60, 22);
  cx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 10; i++) {
    cx.fillStyle = `rgba(200,200,200,${Math.random() * 0.3})`;
    cx.beginPath(); cx.arc(Math.random() * 120, Math.random() * 40, 1, 0, Math.PI * 2); cx.fill();
  }
  el.innerHTML = '';
  el.appendChild(cv);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '↻';
  btn.style.cssText = 'background:none;border:1px solid var(--border);color:var(--text2);border-radius:6px;padding:.2rem .5rem;cursor:pointer;font-size:.85rem;';
  btn.onclick = buildAdminCaptcha;
  el.appendChild(btn);
}

// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════
const API = '/rpg/api';
let token = localStorage.getItem('admin_token') || '';
let currentUser = null;
let allUsers = [];
let allCampaigns = [];

// ══════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function fmt(dateStr) {
  if (!dateStr) return '<span class="text-muted">—</span>';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}) + ' ' +
         d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
}

function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = (type==='success' ? '✓ ' : '✗ ') + msg;
  el.className = type;
  el.style.display = 'block';
  setTimeout(() => el.style.display='none', 3000);
}

async function apiFetch(path, opts={}) {
  const r = await fetch(API + path, {
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...(opts.headers||{}) },
    ...opts,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Erreur');
  return data;
}

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const pwd   = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginErr');
  errEl.style.display = 'none';
  // CAPTCHA check
  const captchaEl = document.getElementById('loginCaptchaInput');
  const captchaVal = parseInt(captchaEl?.value);
  if (captchaVal !== _adminCaptchaAnswer) {
    errEl.textContent = 'CAPTCHA incorrect'; errEl.style.display = 'block';
    buildAdminCaptcha(); if (captchaEl) captchaEl.value = '';
    return;
  }
  try {
    // 1. Login
    const r = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pwd }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Erreur de connexion');

    // 2. Vérification admin côté serveur (plus fiable que lire le champ user)
    const adminTest = await fetch(API + '/admin/stats', {
      headers: { 'Authorization': 'Bearer ' + data.token },
    });
    if (adminTest.status === 403) throw new Error('Accès réservé aux administrateurs');
    if (!adminTest.ok) throw new Error('Erreur de vérification admin');

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('admin_token', token);
    initAdmin();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') doLogin();
});

function doLogout() {
  token = '';
  localStorage.removeItem('admin_token');
  document.getElementById('adminUI').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  buildAdminCaptcha();
}

async function initAdmin() {
  // Vérifier que le token est encore valide et donne accès à l'admin
  try {
    const [me, stats] = await Promise.all([
      apiFetch('/auth/me'),
      apiFetch('/admin/stats'),
    ]);
    currentUser = me;
  } catch {
    doLogout();
    return;
  }
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminUI').style.display = 'flex';
  document.getElementById('adminUser').textContent = currentUser.username;
  loadStats();
  loadOnline();
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  btn.classList.add('active');
  // Charger au premier affichage
  if (id === 'users' && !allUsers.length) loadUsers();
  if (id === 'campaigns' && !allCampaigns.length) loadCampaigns();
  if (id === 'online')      loadOnline();
  if (id === 'activity')    loadActivity();
  if (id === 'invitations') loadInvitations();
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
async function loadStats() {
  try {
    const s = await apiFetch('/admin/stats');
    document.getElementById('st-users').textContent    = s.users;
    document.getElementById('st-new').textContent      = s.new_users_7d;
    document.getElementById('st-locked').textContent   = s.locked_accounts;
    document.getElementById('st-campaigns').textContent= s.campaigns;
    document.getElementById('st-chars').textContent    = s.characters;
    document.getElementById('st-maps').textContent     = s.maps;
    document.getElementById('st-tokens').textContent   = s.tokens;
    document.getElementById('st-messages').textContent = s.messages;
  } catch(e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
// UTILISATEURS
// ══════════════════════════════════════════════════════════════
async function loadUsers() {
  try {
    allUsers = await apiFetch('/admin/users');
    renderUsers(allUsers);
  } catch(e) { toast(e.message, 'error'); }
}

function filterUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  renderUsers(allUsers.filter(u =>
    u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  ));
}

function renderUsers(users) {
  const tbody = document.getElementById('usersTbody');
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:2rem">Aucun utilisateur</td></tr>'; return; }
  tierName = {player:'👤 Joueur',creator:'🛠 Créateur',ai_gm:'🤖 MJ Virtuel',admin:'🛡 Admin'};
  tbody.innerHTML = users.map(u => {
    const isMe = u.id === currentUser?.id;
    const badgeTier = tierName[u.tier] || u.tier || '👤 Joueur';
    const lockBadge  = u.is_locked ? '<span class="badge badge-locked">🔒 Bloqué</span>' : '<span class="badge badge-ok">✓ OK</span>';
    return `<tr>
      <td><strong>${esc(u.username)}</strong>${isMe ? ' <span style="color:var(--text3);font-size:.7rem">(vous)</span>' : ''}</td>
      <td class="text-sm text-muted">${esc(u.email)}</td>
      <td><span class="badge" style="background:${u.tier==='admin'?'var(--danger)':u.tier==='ai_gm'?'var(--accent2)':u.tier==='creator'?'var(--accent)':'var(--text3)'}">${badgeTier}</span></td>
      <td>${lockBadge}</td>
      <td class="text-sm">${u.owned_campaigns} MJ · ${u.campaign_count} total</td>
      <td class="text-sm text-muted">${fmt(u.last_login)}</td>
      <td class="text-sm text-muted">${fmtDate(u.created_at)}</td>
      <td>
        <div class="btn-row">
          <button class="btn-xs btn-primary" onclick='openEditUser(${JSON.stringify(u)})'>✏</button>
          ${!isMe ? `<select class="btn-xs" data-act="setTier" data-a='["${u.id}", "${esc(u.username)}", "$value"]' style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:.15rem .3rem;border-radius:4px;font-size:.7rem;">
            <option value="player" ${u.tier==='player'?'selected':''}>👤 Joueur</option>
            <option value="creator" ${u.tier==='creator'?'selected':''}>🛠 Créateur</option>
            <option value="ai_gm" ${u.tier==='ai_gm'?'selected':''}>🤖 MJ Virtuel</option>
            <option value="admin" ${u.tier==='admin'?'selected':''}>🛡 Admin</option>
          </select>` : ''}
          ${u.is_locked ? `<button class="btn-xs btn-success" data-act="unlockUser" data-a='["${u.id}", "${esc(u.username)}"]'>🔓</button>` : ''}
          ${!isMe ? `<button class="btn-xs btn-danger" data-act="deleteUser" data-a='["${u.id}", "${esc(u.username)}"]'>🗑</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openEditUser(u) {
  document.getElementById('editUserId').value    = u.id;
  document.getElementById('editUsername').value  = u.username;
  document.getElementById('editEmail').value     = u.email;
  document.getElementById('editUserModal').classList.add('open');
}
function closeEditModal() { document.getElementById('editUserModal').classList.remove('open'); }
async function saveEditUser() {
  const id = document.getElementById('editUserId').value;
  const username = document.getElementById('editUsername').value.trim();
  const email    = document.getElementById('editEmail').value.trim();
  try {
    await apiFetch(`/admin/users/${id}`, { method:'PUT', body: JSON.stringify({ username, email }) });
    toast('Utilisateur modifié');
    closeEditModal();
    await loadUsers();
  } catch(e) { toast(e.message, 'error'); }
}

async function unlockUser(id, name) {
  if (!confirm(`Débloquer le compte de ${name} ?`)) return;
  try {
    await apiFetch(`/admin/users/${id}/unlock`, { method:'PUT' });
    toast(`Compte de ${name} débloqué`);
    await loadUsers();
  } catch(e) { toast(e.message, 'error'); }
}

async function setTier(id, username, tier) {
  if (!confirm(`Définir le niveau de "${username}" à "${tier}" ?`)) return;
  try {
    await apiFetch(`/admin/users/${id}/set-tier`, { method: 'PUT', body: JSON.stringify({ tier }) });
    toast(`Niveau de ${username} mis à jour → ${tier}`);
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

async function toggleAdmin(id, name, isAdmin) {
  const msg = isAdmin ? `Rétrograder ${name} (retirer le statut admin) ?` : `Promouvoir ${name} en administrateur ?`;
  if (!confirm(msg)) return;
  try {
    await apiFetch(`/admin/users/${id}/toggle-admin`, { method:'PUT' });
    toast(`Statut admin de ${name} modifié`);
    await loadUsers();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteUser(id, name) {
  if (!confirm(`⚠ Supprimer définitivement le compte de ${name} ?\nToutes ses données seront effacées.`)) return;
  try {
    await apiFetch(`/admin/users/${id}`, { method:'DELETE' });
    toast(`Compte de ${name} supprimé`);
    await loadUsers();
  } catch(e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
// CAMPAGNES
// ══════════════════════════════════════════════════════════════
async function loadCampaigns() {
  try {
    allCampaigns = await apiFetch('/admin/campaigns');
    renderCampaigns(allCampaigns);
  } catch(e) { toast(e.message, 'error'); }
}

function filterCampaigns() {
  const q = document.getElementById('campSearch').value.toLowerCase();
  renderCampaigns(allCampaigns.filter(c =>
    c.name.toLowerCase().includes(q) || (c.owner_name||'').toLowerCase().includes(q)
  ));
}

function renderCampaigns(camps) {
  const tbody = document.getElementById('campsTbody');
  if (!camps.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:2rem">Aucune campagne</td></tr>'; return; }
  tbody.innerHTML = camps.map(c => `
    <tr>
      <td><strong>${esc(c.name)}</strong>${c.description ? `<br><span class="text-sm text-muted">${esc(c.description.substring(0,60))}${c.description.length>60?'…':''}</span>` : ''}</td>
      <td><span class="badge badge-gm">MJ</span> ${esc(c.owner_name||'—')}<br><span class="text-sm text-muted">${esc(c.owner_email||'')}</span></td>
      <td class="text-sm">${c.member_count}</td>
      <td class="text-sm">${c.character_count}</td>
      <td class="text-sm">${c.map_count}</td>
      <td class="text-sm">${c.message_count}</td>
      <td class="text-sm text-muted">${fmt(c.last_activity)}</td>
      <td class="text-sm text-muted">${fmtDate(c.created_at)}</td>
      <td>
        <div class="btn-row">
          <button class="btn-xs btn-primary" data-act="loadMembers" data-a='["${c.id}", "$el"]'>👥 Membres</button>
          <button class="btn-xs btn-danger"  data-act="deleteCampaign" data-a='["${c.id}", "${esc(c.name)}"]'>🗑</button>
        </div>
      </td>
    </tr>
    <tr class="members-row" id="mem-${c.id}"><td colspan="9"><div class="members-list" id="memlist-${c.id}">Chargement…</div></td></tr>
  `).join('');
}

async function loadMembers(campId, btn) {
  const row = document.getElementById(`mem-${campId}`);
  if (row.style.display === 'table-row') { row.style.display = 'none'; return; }
  row.style.display = 'table-row';
  try {
    const members = await apiFetch(`/admin/campaigns/${campId}/members`);
    const list = document.getElementById(`memlist-${campId}`);
    list.innerHTML = members.length ? members.map(m =>
      `<div class="member-chip">
        <span class="badge ${m.role==='gm'?'badge-gm':'badge-player'}">${m.role.toUpperCase()}</span>
        ${esc(m.username)}
      </div>`
    ).join('') : '<span class="text-muted" style="font-size:.8rem">Aucun membre</span>';
  } catch(e) { document.getElementById(`memlist-${campId}`).textContent = 'Erreur'; }
}

async function deleteCampaign(id, name) {
  if (!confirm(`⚠ Supprimer définitivement la campagne "${name}" ?\nToutes les cartes, tokens et messages seront effacés.`)) return;
  try {
    await apiFetch(`/admin/campaigns/${id}`, { method:'DELETE' });
    toast(`Campagne "${name}" supprimée`);
    await loadCampaigns();
  } catch(e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
// EN LIGNE
// ══════════════════════════════════════════════════════════════
async function loadOnline() {
  try {
    const data = await apiFetch('/admin/online');
    const count = data.count || 0;
    document.getElementById('onlineCount').innerHTML =
      `<span class="online-dot"></span> ${count} en ligne`;
    // Dashboard summary
    document.getElementById('dashOnline').innerHTML = count === 0
      ? '<span class="text-muted">Personne connecté pour l\'instant</span>'
      : `<span class="online-pill"><span class="online-dot"></span> ${count} utilisateur${count>1?'s':''} connecté${count>1?'s':''}</span>`;
    // Online section
    const grid = document.getElementById('onlineGrid');
    if (!data.users || !data.users.length) {
      grid.innerHTML = '<div style="color:var(--text3);font-size:.85rem">Personne connecté pour l\'instant.</div>';
      return;
    }
    grid.innerHTML = data.users.map(u =>
      `<div class="online-card">
        <div class="online-dot-small"></div>
        <div>
          <div style="font-weight:600">${esc(u.username)}</div>
          ${u.campaign_id ? `<div class="text-sm text-muted">En campagne</div>` : `<div class="text-sm text-muted">Lobby</div>`}
        </div>
      </div>`
    ).join('');
  } catch(e) { console.error(e); }
}

// ══════════════════════════════════════════════════════════════
// ACTIVITÉ
// ══════════════════════════════════════════════════════════════
async function loadActivity() {
  try {
    const data = await apiFetch('/admin/activity');
    // Logins
    const loginsEl = document.getElementById('actLogins');
    loginsEl.innerHTML = (data.recent_logins || []).map(u =>
      `<div class="activity-item">
        <div class="activity-avatar">${u.username.substring(0,2).toUpperCase()}</div>
        <div>
          <div>${esc(u.username)}</div>
          <div class="activity-meta">${fmt(u.last_login)}</div>
        </div>
      </div>`
    ).join('') || '<div class="text-muted text-sm">Aucune connexion récente</div>';
    // Messages
    const msgsEl = document.getElementById('actMessages');
    msgsEl.innerHTML = (data.recent_messages || []).map(m =>
      `<div class="activity-item">
        <div class="activity-avatar">${m.username.substring(0,2).toUpperCase()}</div>
        <div>
          <div><strong>${esc(m.username)}</strong> <span class="text-sm text-muted">dans ${esc(m.campaign_name)}</span></div>
          <div class="activity-meta">${esc(m.content.substring(0,60))}${m.content.length>60?'…':''}</div>
          <div class="activity-meta">${fmt(m.created_at)}</div>
        </div>
      </div>`
    ).join('') || '<div class="text-muted text-sm">Aucun message récent</div>';
  } catch(e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
// INVITATIONS
// ══════════════════════════════════════════════════════════════
async function loadInvitations() {
  const el = document.getElementById('invTree');
  el.innerHTML = '<div class="text-muted text-sm">Chargement…</div>';
  try {
    const rows = await apiFetch('/admin/invitations');
    // Construire un arbre : parrain → liste d'invités
    const roots = rows.filter(u => !u.inviter_id);
    const byInviter = {};
    rows.forEach(u => {
      if (u.inviter_id) {
        if (!byInviter[u.inviter_id]) byInviter[u.inviter_id] = [];
        byInviter[u.inviter_id].push(u);
      }
    });

    function renderNode(u, depth) {
      const children = byInviter[u.id] || [];
      const indent = depth * 28;
      const invitedLabel = u.invited_count > 0
        ? `<span style="background:rgba(201,162,39,.15);color:var(--accent);padding:.1rem .4rem;border-radius:4px;font-size:.72rem;">${u.invited_count} invité(s)</span>`
        : '';
      const codeHtml = `<span style="font-family:monospace;background:var(--surface2);padding:.1rem .4rem;border-radius:4px;font-size:.75rem;color:var(--text2);letter-spacing:.08em;">${esc(u.invite_code)}</span>`;
      const row = `<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem .6rem;border-radius:7px;margin-bottom:.2rem;${depth>0?'background:rgba(255,255,255,.02);':''}margin-left:${indent}px;">
        ${depth > 0 ? '<span style="color:var(--text2);font-size:.8rem;">└</span>' : ''}
        <div style="width:30px;height:30px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:600;flex-shrink:0;">${u.username.substring(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0;">
          <span style="font-weight:500;">${esc(u.username)}</span>
          <span style="color:var(--text2);font-size:.75rem;margin-left:.4rem;">${esc(u.email)}</span>
        </div>
        ${codeHtml}
        ${invitedLabel}
        <span style="font-size:.72rem;color:var(--text2);">${fmt(u.created_at)}</span>
      </div>`;
      return row + children.map(child => renderNode(child, depth + 1)).join('');
    }

    if (!rows.length) {
      el.innerHTML = '<div class="text-muted text-sm">Aucun utilisateur.</div>';
      return;
    }

    // Afficher les comptes fondateurs (sans parrain) + leurs invités
    let html = `<div style="margin-bottom:1rem;font-size:.78rem;color:var(--text2);">${rows.length} compte(s) au total</div>`;
    html += roots.map(u => renderNode(u, 0)).join('');
    // Comptes sans parrain connu (migration, si inviter_id est null mais pas fondateur)
    const orphans = rows.filter(u => u.inviter_id && !rows.find(r => r.id === u.inviter_id));
    if (orphans.length) {
      html += `<div style="margin-top:1rem;padding-top:.8rem;border-top:1px solid var(--border);font-size:.75rem;color:var(--text2);margin-bottom:.5rem;">Comptes sans parrain tracé</div>`;
      html += orphans.map(u => renderNode(u, 0)).join('');
    }
    el.innerHTML = html;
  } catch(e) { el.innerHTML = `<div class="text-muted text-sm text-danger">${esc(e.message)}</div>`; }
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
if (token) {
  initAdmin();
} else {
  document.getElementById('loginScreen').style.display = 'flex';
}

// Initialiser le CAPTCHA sur l'écran de login au chargement
document.addEventListener('DOMContentLoaded', () => buildAdminCaptcha());

// Refresh automatique des utilisateurs connectés toutes les 30s
setInterval(() => {
  if (document.getElementById('sec-online').classList.contains('active') ||
      document.getElementById('sec-dashboard').classList.contains('active')) {
    loadOnline();
  }
}, 30000);
