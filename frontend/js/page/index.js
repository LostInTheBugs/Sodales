/* Sodales — logique de page extraite de index.html (CSP : plus de script inline) */
// ── CAPTCHA ──────────────────────────────────────────────────
let _captchaAnswer = 0;

function buildCaptcha(containerId) {
  const a = Math.floor(Math.random() * 9) + 2; // 2-10
  const b = Math.floor(Math.random() * 9) + 2; // 2-10
  const ops = ['+', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  _captchaAnswer = op === '+' ? a + b : a * b;
  const el = document.getElementById(containerId);
  if (!el) return;
  // Generate a small canvas with the operation
  const cv = document.createElement('canvas');
  cv.width = 120; cv.height = 40;
  const cx = cv.getContext('2d');
  // Background
  cx.fillStyle = '#1e1e2a';
  cx.beginPath(); cx.roundRect(0, 0, 120, 40, 6); cx.fill();
  // Border
  cx.strokeStyle = '#2a2a3a';
  cx.lineWidth = 1;
  cx.beginPath(); cx.roundRect(0, 0, 120, 40, 6); cx.stroke();
  // Distorted text
  const colors = ['#c9a227','#8b5cf6','#22c55e','#ef4444','#3b82f6'];
  const text = `${a} ${op} ${b} = ?`;
  cx.font = 'bold 20px Inter, sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
  cx.transform(1, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, 1, 0, 0);
  cx.fillText(text, 60, 22);
  cx.setTransform(1, 0, 0, 1, 0, 0);
  // Noise dots
  for (let i = 0; i < 15; i++) {
    cx.fillStyle = `rgba(200,200,200,${Math.random() * 0.3})`;
    cx.beginPath(); cx.arc(Math.random() * 120, Math.random() * 40, 1, 0, Math.PI * 2); cx.fill();
  }
  el.innerHTML = '';
  el.appendChild(cv);
  // Refresh button
  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.textContent = '↻';
  refreshBtn.style.cssText = 'background:none;border:1px solid var(--border);color:var(--text2);border-radius:6px;padding:.25rem .5rem;cursor:pointer;font-size:.85rem;';
  refreshBtn.onclick = () => buildCaptcha(containerId);
  el.appendChild(refreshBtn);
}

function validateCaptcha(inputId) {
  const val = parseInt(document.getElementById(inputId)?.value);
  return val === _captchaAnswer;
}

// Rediriger si déjà connecté
(async () => {
  const token = getToken();
  if (token) {
    try { await API.auth.me(); window.location.href = '/lobby.html'; } catch { clearToken(); }
  }
  buildCaptcha('loginCaptcha');
  buildCaptcha('registerCaptcha');
})();

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='register')));
  document.getElementById('panel-login').classList.toggle('active', tab==='login');
  document.getElementById('panel-register').classList.toggle('active', tab==='register');
  hideAlert();
}

function showAlert(msg, type='error') {
  const el = document.getElementById('alert');
  el.textContent = msg; el.className = `alert ${type}`; el.style.display = 'block';
}
function hideAlert() {
  document.getElementById('alert').style.display = 'none';
}

async function doLogin(e) {
  e.preventDefault(); hideAlert();
  if (!validateCaptcha('l-captcha')) { showAlert('CAPTCHA incorrect, veuillez réessayer.'); buildCaptcha('loginCaptcha'); document.getElementById('l-captcha').value = ''; return; }
  const btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    const { user, token } = await API.auth.login(
      document.getElementById('l-email').value,
      document.getElementById('l-password').value,
      document.getElementById('l-website').value   // honeypot
    );
    setToken(token); setUser(user);
    window.location.href = '/lobby.html';
  } catch (err) {
    showAlert(err.message);
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
}

async function doRegister(e) {
  e.preventDefault(); hideAlert();
  if (!validateCaptcha('r-captcha')) { showAlert('CAPTCHA incorrect, veuillez réessayer.'); buildCaptcha('registerCaptcha'); document.getElementById('r-captcha').value = ''; return; }
  const btn = document.getElementById('btn-register');
  btn.disabled = true; btn.textContent = 'Création…';
  try {
    const { user, token } = await API.auth.register(
      document.getElementById('r-username').value,
      document.getElementById('r-email').value,
      document.getElementById('r-password').value,
      document.getElementById('r-invite').value.trim(),
      document.getElementById('r-website').value   // honeypot
    );
    setToken(token); setUser(user);
    window.location.href = '/lobby.html';
  } catch (err) {
    showAlert(err.message);
    btn.disabled = false; btn.textContent = 'Créer mon compte';
  }
}
