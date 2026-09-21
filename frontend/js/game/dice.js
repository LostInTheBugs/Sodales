/**
 * Sodales — dés (partie extraite de game.html)
 * Sélecteur de style, dés 3D (Three.js) et animation 2D.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function rollDie(dice) {
  if (!socket) return;
  const mod = parseInt(document.getElementById('diceModifier').value) || 0;
  socket.emit('dice_roll', { campaign_id: CAMPAIGN_ID, dice, modifier: mod, character_name: activeChar?.name });
}

// ── Dés 3D (Three.js r128) ────────────────────────────────────
let dice3DEnabled = false;
let dice3DScene, dice3DCamera, dice3DRenderer, dice3DMeshes = [], dice3DAnimId;

function buildDiceStylePicker() {
  const el = document.getElementById('diceStylePicker');
  if (!el) return;
  const currentStyle = localStorage.getItem('rpg_dice_style') || 'classic';
  const cur = DICE_STYLES.find(s => s.id === currentStyle);
  let html = '<span style="font-size:.65rem;color:var(--text2);margin-right:.15rem;">Style :</span>';
  html += `<span style="font-size:.65rem;color:var(--text);margin-right:.2rem;">${cur ? cur.name : 'Classique'}</span>`;
  DICE_STYLES.forEach(s => {
    const hex = '#' + s.body.toString(16).padStart(6, '0');
    const active = s.id === currentStyle ? '1' : '0';
    html += `<button class="dice-style-btn" data-style="${s.id}" data-act="selectDiceStyle" data-a='["${s.id}"]' title="${s.name} — ${s.desc}" style="background:${hex}" data-active="${active}"></button>`;
  });
  el.innerHTML = html;
}

function toggle3DDice() {
  dice3DEnabled = !dice3DEnabled;
  const btn = document.getElementById('btn3dToggle');
  if (btn) {
    btn.textContent = `🎲 Dés 3D : ${dice3DEnabled ? 'ON' : 'OFF'}`;
    btn.classList.toggle('on', dice3DEnabled);
  }
  if (dice3DEnabled) buildDiceStylePicker();
  const picker = document.getElementById('diceStylePicker');
  if (picker) picker.style.display = dice3DEnabled ? 'flex' : 'none';
  if (dice3DEnabled && !dice3DRenderer) initDice3D();
}

function selectDiceStyle(id) {
  setDiceStyle(id);
  document.querySelectorAll('.dice-style-btn').forEach(btn => {
    btn.dataset.active = btn.dataset.style === id ? '1' : '0';
  });
  // Le nouveau style sera appliqué au prochain lancer
}

function initDice3D() {
  if (!window.THREE) return;
  const cv = document.getElementById('dice3dCanvas');
  if (!cv || dice3DRenderer) return;

  dice3DScene = new THREE.Scene();
  dice3DCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  dice3DCamera.position.set(0, 2.5, 4.5);
  dice3DCamera.lookAt(0, 0, 0);

  dice3DRenderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
  dice3DRenderer.setSize(280, 220);
  dice3DRenderer.setClearColor(0x000000, 0);
  dice3DRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  dice3DRenderer.shadowMap.enabled = false; // keep it fast

  // Table surface (ground plane) — très discret
  const tableGeom = new THREE.PlaneGeometry(7, 5);
  const tableMat = new THREE.MeshPhongMaterial({
    color: 0x0e0e14,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  });
  const table = new THREE.Mesh(tableGeom, tableMat);
  table.rotation.x = -Math.PI / 2;
  table.position.y = -1.2;
  dice3DScene.add(table);

  // Lighting
  const ambLight = new THREE.AmbientLight(0x8888aa, 0.6);
  dice3DScene.add(ambLight);
  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.6);
  dirLight.position.set(2, 6, 4);
  dice3DScene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x8b5cf6, 0.4);
  fillLight.position.set(-3, 1, -2);
  dice3DScene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xc9a227, 0.3);
  rimLight.position.set(-1, 3, -4);
  dice3DScene.add(rimLight);
}

function buildD6Materials(style) {
  style = style || getDiceStyle();
  const mats = [];
  const facePositions = {
    1: [[64, 64]],
    2: [[38, 42], [90, 86]],
    3: [[38, 42], [64, 64], [90, 86]],
    4: [[38, 38], [90, 38], [38, 90], [90, 90]],
    5: [[38, 38], [90, 38], [64, 64], [38, 90], [90, 90]],
    6: [[38, 30], [90, 30], [38, 64], [90, 64], [38, 98], [90, 98]]
  };
  for (let f = 1; f <= 6; f++) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const cx = cv.getContext('2d');
    cx.fillStyle = style.d6Bg || '#13131e';
    if (cx.roundRect) { cx.roundRect(4, 4, 120, 120, 16); cx.fill(); }
    else { cx.fillRect(4, 4, 120, 120); }
    cx.strokeStyle = style.d6Border || '#c9a227';
    cx.lineWidth = 3;
    if (cx.roundRect) { cx.roundRect(4, 4, 120, 120, 16); cx.stroke(); }
    else { cx.strokeRect(4, 4, 120, 120); }
    cx.fillStyle = style.d6Dot || '#c9a227';
    (facePositions[f] || []).forEach(([px, py]) => {
      cx.beginPath(); cx.arc(px, py, 9, 0, Math.PI * 2); cx.fill();
    });
    mats.push(new THREE.MeshPhongMaterial({ map: new THREE.CanvasTexture(cv) }));
  }
  return mats;
}

function buildDiceGeometry(faces) {
  // Slightly smaller so multiple dice fit on the table
  switch (faces) {
    case 4:   return new THREE.TetrahedronGeometry(0.9);
    case 6:   return new THREE.BoxGeometry(1.0, 1.0, 1.0);
    case 8:   return new THREE.OctahedronGeometry(0.9);
    case 10:  return new THREE.ConeGeometry(0.8, 1.3, 5);
    case 12:  return new THREE.DodecahedronGeometry(0.9);
    case 20:  return new THREE.IcosahedronGeometry(0.95);
    default:  return new THREE.IcosahedronGeometry(0.95);
  }
}

function rollDice3D({ dice, rolls, total, character_name, label }) {
  if (!window.THREE || !dice3DEnabled) return;
  if (!dice3DRenderer) initDice3D();
  if (!dice3DRenderer) return;

  // Parse: "2d6" -> count=2, faces=6
  const match = dice.match(/^(\d*)d(\d+)/i);
  const count = match ? (parseInt(match[1]) || 1) : 1;
  const faces = match ? parseInt(match[2]) : 20;
  const overlay = document.getElementById('dice3dOverlay');
  if (!overlay) return;

  // Remove old dice
  dice3DMeshes.forEach(m => { dice3DScene.remove(m.mesh); });
  dice3DMeshes = [];

  const style = getDiceStyle();
  const groundY = -1.2;
  const GRAVITY = -12;
  const RESTITUTION = 0.45;
  const FRICTION = 0.85;
  const GROUND_ANGLE_DAMP = 0.7;

  for (let i = 0; i < count; i++) {
    const geom = buildDiceGeometry(faces);
    let mat;
    if (faces === 6) {
      mat = buildD6Materials(style);
    } else {
      const edgeHex = '#' + (style.edge || 0xc9a227).toString(16).padStart(6, '0');
      const bgHex = '#' + style.body.toString(16).padStart(6, '0');
      const idx = geom.getIndex();
      const uv = geom.attributes.uv;
      const strs = 3; // stride = 3 per face
      const triCount = idx ? idx.count / 3 : geom.attributes.position.count / 3;
      const mats = [];
      for (let f = 0; f < Math.min(triCount, faces); f++) {
        // Compute UV center for this face
        const i0 = idx ? idx.getX(f * 3) : f * 3;
        const i1 = idx ? idx.getX(f * 3 + 1) : f * 3 + 1;
        const i2 = idx ? idx.getX(f * 3 + 2) : f * 3 + 2;
        let ux = 0, uy = 0;
        if (uv) {
          ux = (uv.getX(i0) + uv.getX(i1) + uv.getX(i2)) / 3;
          uy = (uv.getY(i0) + uv.getY(i1) + uv.getY(i2)) / 3;
        } else {
          ux = 0.5; uy = 0.5;
        }
        // Canvas for this face
        const cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        const cx = cv.getContext('2d');
        cx.fillStyle = bgHex;
        cx.fillRect(0, 0, 128, 128);
        cx.strokeStyle = edgeHex;
        cx.lineWidth = 2;
        if (cx.roundRect) { cx.roundRect(4, 4, 120, 120, 8); cx.stroke(); }
        else { cx.strokeRect(4, 4, 120, 120); }
        cx.fillStyle = edgeHex;
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        const fontSize = f + 1 > 9 ? 36 : 44;
        cx.font = `bold ${fontSize}px Inter, sans-serif`;
        // Draw number at UV center of canvas
        const cxPos = Math.round(ux * 128);
        const cyPos = Math.round(uy * 128);
        cx.fillText(String(f + 1), Math.max(20, Math.min(108, cxPos)), Math.max(20, Math.min(108, cyPos)));
        mats.push(new THREE.MeshPhongMaterial({
          map: new THREE.CanvasTexture(cv),
          polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
        }));
      }
      if (triCount >= faces) {
        geom.clearGroups();
        for (let f = 0; f < faces; f++) {
          geom.addGroup(f * 3, 3, f);
        }
      }
      mat = mats;
    }
    const mesh = new THREE.Mesh(geom, mat);
    if (faces !== 6) {
      const edges = new THREE.EdgesGeometry(geom);
      const lineMat = new THREE.LineBasicMaterial({ color: style.edge || 0xc9a227 });
      mesh.add(new THREE.LineSegments(edges, lineMat));
    }
    // Spread dice in a fan
    const spread = (i - (count - 1) / 2) * 0.6;
    mesh.position.set(spread, 2.0 + Math.random() * 1.0, (Math.random() - 0.5) * 0.8);
    // Random initial rotation
    mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    dice3DScene.add(mesh);

    // Physics state
    dice3DMeshes.push({
      mesh,
      vx: spread * 0.15 + (Math.random() - 0.5) * 0.2,
      vy: 2.5 + Math.random() * 2.0,
      vz: (Math.random() - 0.5) * 0.3,
      angVx: (Math.random() - 0.5) * 12,
      angVy: (Math.random() - 0.5) * 12,
      angVz: (Math.random() - 0.5) * 12,
    });
  }

  // Result display
  const resultEl = document.getElementById('dice3dResult');
  const labelEl  = document.getElementById('dice3dLabel');
  if (resultEl) { resultEl.textContent = ''; resultEl.className = 'dice3d-result'; }
  if (labelEl)  { labelEl.textContent = ''; labelEl.className = 'dice3d-label'; }
  overlay.style.display = 'flex';

  if (dice3DAnimId) cancelAnimationFrame(dice3DAnimId);

  let settled = false;
  let settleTimer = 0;
  const settleTimeout = 3.5;
  let lastTime = performance.now();

  function physicsFrame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Collision entre dés
    const COLLIDE_DIST = 1.0;
    for (let i = 0; i < dice3DMeshes.length; i++) {
      for (let j = i + 1; j < dice3DMeshes.length; j++) {
        const a = dice3DMeshes[i];
        const b = dice3DMeshes[j];
        const dx = b.mesh.position.x - a.mesh.position.x;
        const dz = b.mesh.position.z - a.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < COLLIDE_DIST && dist > 0.001) {
          const overlap = (COLLIDE_DIST - dist) / 2;
          const pushX = (dx / dist) * overlap;
          const pushZ = (dz / dist) * overlap;
          a.mesh.position.x -= pushX;
          a.mesh.position.z -= pushZ;
          b.mesh.position.x += pushX;
          b.mesh.position.z += pushZ;
          // Exchange velocities for a bounce effect
          const relV = (a.vx - b.vx) * (dx / dist) + (a.vz - b.vz) * (dz / dist);
          if (relV > 0) {
            const impulse = relV * 0.4;
            a.vx -= impulse * (dx / dist);
            a.vz -= impulse * (dz / dist);
            b.vx += impulse * (dx / dist);
            b.vz += impulse * (dz / dist);
          }
        }
      }
    }

    let allSettled = true;
    for (const d of dice3DMeshes) {
      // Gravity
      d.vy += GRAVITY * dt;
      // Apply velocity
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      // Angular velocity
      d.mesh.rotation.x += d.angVx * dt;
      d.mesh.rotation.y += d.angVy * dt;
      d.mesh.rotation.z += d.angVz * dt;

      // Ground collision
      if (d.mesh.position.y <= groundY) {
        d.mesh.position.y = groundY;
        d.vy = -d.vy * RESTITUTION;
        d.vx *= FRICTION;
        d.vz *= FRICTION;
        d.angVx *= GROUND_ANGLE_DAMP;
        d.angVy *= GROUND_ANGLE_DAMP;
        d.angVz *= GROUND_ANGLE_DAMP;
        if (Math.abs(d.vy) < 0.1) d.vy = 0;
      }
      // Check if settled
      const speed = Math.abs(d.vx) + Math.abs(d.vy) + Math.abs(d.vz) +
                    Math.abs(d.angVx) + Math.abs(d.angVy) + Math.abs(d.angVz);
      if (speed > 0.05) allSettled = false;
    }

    // Slow zoom oscillation
    dice3DCamera.position.x = Math.sin(now * 0.001) * 0.1;
    dice3DCamera.position.y = 2.5 + Math.abs(Math.sin(now * 0.0008)) * 0.05;
    dice3DCamera.lookAt(0, 0, 0);
    dice3DRenderer.render(dice3DScene, dice3DCamera);

    if (!settled) {
      if (allSettled) {
        settled = true;
        settleTimer = now;
        // Reveal result
        if (resultEl) {
          resultEl.textContent = total;
          let cls = 'dice3d-result visible';
          if (faces === 20 && rolls && rolls[0] === 20) cls += ' critical';
          else if (faces === 20 && rolls && rolls[0] === 1) cls += ' fumble';
          resultEl.className = cls;
        }
        if (labelEl) {
          labelEl.textContent = `${character_name} — ${(label || dice)}`;
          labelEl.className = 'dice3d-label visible';
        }
      }
      dice3DAnimId = requestAnimationFrame(physicsFrame);
    } else {
      // Show settled dice for a moment, then auto-hide
      if (now - settleTimer > 2200) {
        overlay.style.display = 'none';
        if (resultEl) resultEl.className = 'dice3d-result';
        if (labelEl)  labelEl.className = 'dice3d-label';
        dice3DMeshes.forEach(d => { dice3DScene.remove(d.mesh); });
        dice3DMeshes = [];
        return;
      }
      // Gentle idle rotation
      for (const d of dice3DMeshes) {
        d.mesh.rotation.y += 0.003;
        d.mesh.position.y = groundY + Math.sin(now * 0.001 + d.mesh.position.x) * 0.02;
      }
      dice3DAnimId = requestAnimationFrame(physicsFrame);
    }
  }

  dice3DAnimId = requestAnimationFrame(physicsFrame);
}

// ── Dé 2D animé ───────────────────────────────────────────────
let diceAnimTimer;
function showDiceAnimation({ dice, rolls, total, character_name, label }) {
  clearTimeout(diceAnimTimer);
  const faces = parseInt(dice.replace(/^\d*d/,''), 10) || 20;
  const svg = buildDieSvg(faces);
  document.getElementById('dieSvg').innerHTML = svg;

  const resultEl = document.getElementById('diceResult');
  resultEl.textContent = total;
  resultEl.className = 'dice-result';
  if (faces === 20) {
    if (rolls[0] === 20) resultEl.classList.add('critical');
    else if (rolls[0] === 1) resultEl.classList.add('fumble');
  }

  const modEl = document.getElementById('diceModifier');
  const modVal = modEl ? (parseInt(modEl.value) || 0) : 0;
  document.getElementById('diceLabel').textContent = `${character_name} — ${dice}${modVal > 0 ? '+' + modVal : ''}`;

  // Sparks
  const overlay = document.getElementById('diceAnimOverlay');
  overlay.querySelectorAll('.spark').forEach(s => s.remove());
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const angle = (i / 16) * Math.PI * 2;
    const dist = 60 + Math.random() * 60;
    s.style.cssText = `--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;background:${Math.random()>.5?'var(--accent)':'var(--accent2)'}`;
    overlay.appendChild(s);
  }

  document.getElementById('diceAnim').classList.add('show');
  diceAnimTimer = setTimeout(() => document.getElementById('diceAnim').classList.remove('show'), 2500);
}

function buildDieSvg(faces) {
  const shapes = {
    4: '<polygon points="40,5 75,70 5,70" fill="none" stroke="#c9a227" stroke-width="3"/><text x="40" y="62" text-anchor="middle" fill="#c9a227" font-size="18" font-family="Cinzel">d4</text>',
    6: '<rect x="8" y="8" width="64" height="64" rx="10" fill="none" stroke="#c9a227" stroke-width="3"/><text x="40" y="48" text-anchor="middle" fill="#c9a227" font-size="22" font-family="Cinzel">d6</text>',
    8: '<polygon points="40,4 74,40 40,76 6,40" fill="none" stroke="#c9a227" stroke-width="3"/><text x="40" y="48" text-anchor="middle" fill="#c9a227" font-size="18" font-family="Cinzel">d8</text>',
    10: '<polygon points="40,5 72,28 65,68 15,68 8,28" fill="none" stroke="#c9a227" stroke-width="3"/><text x="40" y="50" text-anchor="middle" fill="#c9a227" font-size="16" font-family="Cinzel">d10</text>',
    12: '<polygon points="40,4 62,16 74,40 62,64 40,76 18,64 6,40 18,16" fill="none" stroke="#c9a227" stroke-width="3"/><text x="40" y="48" text-anchor="middle" fill="#c9a227" font-size="15" font-family="Cinzel">d12</text>',
    20: '<polygon points="40,3 76,25 76,55 40,77 4,55 4,25" fill="none" stroke="#c9a227" stroke-width="3"/><text x="40" y="50" text-anchor="middle" fill="#c9a227" font-size="15" font-family="Cinzel">d20</text>',
    100: '<ellipse cx="40" cy="40" rx="35" ry="35" fill="none" stroke="#c9a227" stroke-width="3"/><text x="40" y="47" text-anchor="middle" fill="#c9a227" font-size="14" font-family="Cinzel">d%</text>',
  };
  return shapes[faces] || shapes[20];
}
