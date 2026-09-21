/* Sodales — logique de page extraite de features.html (CSP : plus de script inline) */
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
    if (user.is_admin) {
      document.getElementById('adminLink').style.display = '';
      document.getElementById('adminSep').style.display = '';
    }
  } catch {
    window.location.href = '/';
  }
})();

function toggleDropdown() {
  const m = document.getElementById('dropdownMenu');
  m.classList.toggle('open');
}
document.addEventListener('click', e => {
  if (!document.getElementById('userDropdown').contains(e.target))
    document.getElementById('dropdownMenu').classList.remove('open');
});
function logout() {
  clearToken();
  localStorage.removeItem('rpg_user');
  window.location.href = '/';
}
