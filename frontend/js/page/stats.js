/* Sodales — logique de page extraite de stats.html (CSP : plus de script inline) */
let _statsData = null;

(async () => {
  const token = getToken();
  if (!token) { window.location.href = '/'; return; }
  try {
    const user = await API.auth.me();
    setUser(user);
    const av = document.getElementById('userAvatar');
    if (user.avatar_url) av.innerHTML = `<img src="${user.avatar_url}" alt="${user.username}"/>`;
    else av.textContent = user.username[0].toUpperCase();
    document.getElementById('userName').textContent = user.username;
    if (user.is_admin || user.tier === 'admin') {
      document.getElementById('adminLink').style.display = '';
      document.getElementById('adminSep').style.display = '';
    }
    await loadStats();
  } catch { window.location.href = '/'; }
})();

async function loadStats() {
  try {
    const r = await fetch('/rpg/api/stats', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    _statsData = await r.json();
    if (!r.ok) throw new Error(_statsData.error || 'Erreur');
    renderStats();
  } catch (e) {
    document.getElementById('loader').innerHTML = `<span style="color:var(--danger)">Erreur : ${e.message}</span>`;
  }
}

function renderStats() {
  const d = _statsData;
  document.getElementById('loader').style.display = 'none';
  document.getElementById('statsContent').style.display = 'block';
  document.getElementById('lastUpdate').textContent = 'Mise à jour en direct — données cumulées depuis le lancement';

  // Totals grid
  const totals = d.totals || {};
  document.getElementById('totalsGrid').innerHTML = [
    { num: totals.users, label: '👥 Joueurs inscrits' },
    { num: totals.campaigns, label: '🗺 Campagnes créées' },
    { num: totals.active_users, label: '🟢 En ligne (24h)' },
    { num: totals.dice_rolls, label: '🎲 Lancés de dés' },
    { num: totals.crit_success, label: '⭐ Critiques (20)' },
    { num: totals.crit_fumble, label: '💀 Fumbles (1)' },
    { num: totals.messages, label: '💬 Messages' },
  ].map(s => `<div class="stat-card"><div class="stat-num">${s.num}</div><div class="stat-label">${s.label}</div></div>`).join('');

  // Daily table
  const daily = d.daily || [];
  document.getElementById('dailyTable').innerHTML = daily.length
    ? daily.map(row => `<tr><td>${row.day}</td><td>${row.messages}</td><td>${row.rolls}</td><td style="color:var(--success)">${row.crits}</td><td style="color:var(--danger)">${row.fumbles}</td></tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--text3);">Aucune donnée</td></tr>';

  // Top users
  const users = d.top_users || [];
  document.getElementById('topUsersTable').innerHTML = users.length
    ? users.map((u, i) => `<tr><td>${i + 1}. ${esc(u.username)}</td><td>${u.messages}</td><td>${u.rolls}</td></tr>`).join('')
    : '<tr><td colspan="3" style="text-align:center;padding:1rem;color:var(--text3);">Aucune donnée</td></tr>';

  // Top campaigns
  const camps = d.top_campaigns || [];
  document.getElementById('topCampaignsTable').innerHTML = camps.length
    ? camps.map(c => `<tr><td>${esc(c.name)}</td><td><span class="sys-tag">${esc(c.system || '—')}</span></td><td>${c.messages}</td><td>${c.rolls}</td></tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--text3);">Aucune donnée</td></tr>';
}

function toggleDropdown() {
  document.getElementById('dropdownMenu').classList.toggle('open');
}
document.addEventListener('click', e => {
  if (!document.getElementById('userDropdown').contains(e.target))
    document.getElementById('dropdownMenu').classList.remove('open');
});
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function logout() { clearToken(); localStorage.removeItem('rpg_user'); window.location.href = '/'; }
