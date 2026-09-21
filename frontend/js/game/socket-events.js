/**
 * Sodales — connexion et événements socket (partie extraite de game.html)
 * Connexion temps réel et écoute des événements serveur.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function connectSocket() {
  socket = io({ path: '/rpg/socket.io', auth: { token: getToken() } });

  socket.on('connect', () => {
    socket.emit('join_campaign', { campaign_id: CAMPAIGN_ID });
    // On ajoute soi-même immédiatement ; la liste complète arrivera via online_users
    onlineUsers = {};
    addOnlineUser(getUser());
  });

  initLevelUpSocket();

  // Liste complète envoyée par le serveur après join (sockets déjà présents)
  socket.on('online_users', (users) => {
    users.forEach(u => { if (!onlineUsers[u.id]) addOnlineUser(u); });
    updateTableOnlineCount();
  });

  socket.on('user_joined', (user) => {
    addOnlineUser(user);
    addSystemMessage(`${user.username} a rejoint la session`);
    updateTableOnlineCount();
  });

  socket.on('user_left', (user) => {
    removeOnlineUser(user.id);
    addSystemMessage(`${user.username} a quitté la session`);
    updateTableOnlineCount();
  });

  socket.on('campaign_state', ({ messages, map, tokens }) => {
    messages.forEach(addChatMessage);
    if (map) {
      currentMap = map;
      mapWalls   = Array.isArray(map.walls)   ? map.walls   : [];
      mapObjects = Array.isArray(map.objects) ? map.objects : [];
      // Charger les dessins de la nouvelle carte
      const sd = map.drawings;
      if (sd && Array.isArray(sd)) drawStrokes = sd;
      else if (typeof sd === 'string') { try { drawStrokes = JSON.parse(sd) || []; } catch { drawStrokes = []; } }
      else drawStrokes = [];
      syncLightsFromObjects();
      drawMap();
    }
    if (tokens) { gameTokens = tokens; drawMap(); }
    // Auto-sélectionner le premier personnage si aucun n'est encore actif (sauf display mode)
    if (!DISPLAY_MODE && !activeChar && myChars.length > 0) {
      const sel = document.getElementById('charSelector');
      if (sel) { sel.value = myChars[0].id; selectChar(myChars[0].id); }
    }
  });

  socket.on('message_received', (msg) => addChatMessage(msg));
  socket.on('whisper_received', (msg) => addChatMessage({ ...msg, type: 'whisper' }));

  socket.on('dice_rolled', (data) => {
    if (dice3DEnabled) {
      rollDice3D(data);
    } else {
      showDiceAnimation(data);
    }
    const resultEl = document.getElementById('lastRollResult');
    if (resultEl) resultEl.innerHTML =
      `<strong style="color:var(--accent)">${data.character_name}</strong> → ${data.dice} = <strong>${data.total}</strong>`;
  });

  socket.on('token_moved', ({ token_id, x, y, facing }) => {
    const t = gameTokens.find(t => t.id === token_id);
    if (t) { t.x = x; t.y = y; if (facing != null) t.facing = facing; _invalidateVisionToken(token_id); drawMap(); }
  });

  socket.on('token_created', (token) => { gameTokens.push(token); drawMap(); });
  socket.on('token_deleted', ({ token_id }) => { gameTokens = gameTokens.filter(t => t.id !== token_id); drawMap(); });
  socket.on('map_changed', ({ map, tokens }) => {
    currentMap = map;
    gameTokens = tokens || [];
    mapWalls   = Array.isArray(map.walls)   ? map.walls   : [];
    mapObjects = Array.isArray(map.objects) ? map.objects : [];
    syncLightsFromObjects();
    _invalidateVisionAll();
    fogState = { circles: [], allRevealed: false };
    fogEnabled = false;
    drawMap();
    addSystemMessage('La carte a changé');
    if (myRole === 'gm') loadMaps();
  });
  socket.on('error', (e) => console.error('Socket error:', e));

  setupCombatSocket(socket);
  setupAudioSocket(socket);
  setupGameSocket(socket);
}

function addOnlineUser(user) {
  onlineUsers[user.id] = user;
  renderOnlineUsers();
}
function removeOnlineUser(id) { delete onlineUsers[id]; renderOnlineUsers(); }

// Palette de couleurs par hachage du username
function userColor(username) {
  const hues = [210, 160, 280, 30, 340, 0, 120, 50, 240, 195];
  let h = 0; for (const c of username) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return `hsl(${hues[h % hues.length]},65%,55%)`;
}

function renderOnlineUsers() {
  const users = Object.values(onlineUsers);
  const countEl = document.getElementById('onlineCount');
  if (countEl) countEl.textContent = `${users.length} en ligne`;

  // Dropdown header
  renderPlayersDropdown();
}

function renderPlayersDropdown() {
  const dropdown = document.getElementById('playersDropdown');
  if (!dropdown) return;
  const onlineIds = new Set(Object.values(onlineUsers).map(u => u.id || u.user_id));
  const onlineArr = Object.values(onlineUsers);

  // Membres connus via campaign.members, offline = ceux pas dans onlineUsers
  const offlineArr = allCampaignMembers.filter(m => !Object.values(onlineUsers).some(u =>
    (u.id && u.id === m.user_id) || (u.username && u.username === m.username)
  ));

  let html = '';
  if (onlineArr.length) {
    html += `<div class="pd-section-label">● En ligne</div>`;
    html += onlineArr.map(u => `
      <div class="pd-row">
        <div class="pd-avatar" style="background:${userColor(u.username)}">${u.username[0].toUpperCase()}</div>
        <span class="pd-name">${esc(u.username)}${u.role==='gm'?' 🛡':''}</span>
        <div class="pd-status online"></div>
      </div>`).join('');
  }
  if (offlineArr.length) {
    html += `<div class="pd-section-label" style="margin-top:.3rem;">○ Hors ligne</div>`;
    html += offlineArr.map(m => `
      <div class="pd-row" style="opacity:.45;">
        <div class="pd-avatar" style="background:${userColor(m.username||'?')}">${(m.username||'?')[0].toUpperCase()}</div>
        <span class="pd-name">${esc(m.username||'?')}${m.role==='gm'?' 🛡':''}</span>
        <div class="pd-status offline"></div>
      </div>`).join('');
  }
  if (!html) html = `<div style="font-size:.8rem;color:var(--text2);padding:.3rem .4rem;">Aucun joueur</div>`;
  dropdown.innerHTML = html;
}

function togglePlayersDropdown(e) {
  e.stopPropagation();
  const btn = document.getElementById('onlineUsersBtn');
  const isOpen = btn.classList.toggle('open');
  if (isOpen) {
    renderPlayersDropdown();
    // Fermer si on clique ailleurs
    setTimeout(() => document.addEventListener('click', closePlayersDropdown, { once: true }), 0);
  }
}
function closePlayersDropdown() {
  document.getElementById('onlineUsersBtn')?.classList.remove('open');
}
