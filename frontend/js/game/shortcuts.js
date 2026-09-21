/**
 * Sodales — raccourcis clavier et historique (partie extraite de game.html)
 * Raccourcis clavier et annulation des déplacements (Ctrl+Z).
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
const tokenMoveHistory = [];  // [{token_id, x, y}]
function pushTokenHistory(token_id, x, y) {
  tokenMoveHistory.push({ token_id, x, y });
  if (tokenMoveHistory.length > 20) tokenMoveHistory.shift();
}

// ── Raccourcis clavier ────────────────────────────────────────
function hotkeyHandler(e) {
  // Ignorer si focus sur un champ de saisie
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  // Ignorer si une modal est ouverte
  if (document.querySelector('.modal-overlay.open, .modal-overlay-char.open, .modal-tables.open, .modal-journal.open')) return;

  const key = e.key;
  const ctrl = e.ctrlKey || e.metaKey;

  // Escape — annuler l'outil courant / désélectionner
  if (key === 'Escape') {
    if (currentTool === 'measure') {
      measurePoints = []; measureCursor = null; measureActive = false;
      if (socket) socket.emit('measure_clear', { campaign_id: CAMPAIGN_ID });
      drawMap();
    } else if (currentTool === 'zones' && zoneDrawing) {
      zoneDrawing = null; drawMap();
    } else {
      selectedToken = null; drawMap();
    }
    return;
  }

  // Ctrl+Z — annuler dernier déplacement de token (MJ uniquement)
  if (ctrl && key === 'z' && myRole === 'gm') {
    e.preventDefault();
    const last = tokenMoveHistory.pop();
    if (last && socket) {
      socket.emit('token_move', { campaign_id: CAMPAIGN_ID, token_id: last.token_id, x: last.x, y: last.y, facing: null });
      const t = gameTokens.find(tk => tk.id === last.token_id);
      if (t) { t.x = last.x; t.y = last.y; }
      drawMap();
    }
    return;
  }
  if (ctrl) return; // Ne pas capturer d'autres Ctrl+X

  // Delete / Backspace — supprimer token sélectionné (MJ)
  if ((key === 'Delete' || key === 'Backspace') && myRole === 'gm' && selectedToken) {
    e.preventDefault();
    const tid = selectedToken;
    selectedToken = null;
    socket?.emit('token_delete', { campaign_id: CAMPAIGN_ID, token_id: tid });
    return;
  }

  // M — outil mesure
  if (key === 'm' || key === 'M') { setTool('measure'); return; }
  // Z — outil zones
  if (key === 'z' || key === 'Z') { setTool('zones'); return; }
  // D — outil dessin
  if (key === 'd' || key === 'D') { setTool('draw'); return; }
  // S — outil select
  if (key === 's' || key === 'S') { setTool('select'); return; }
  // F — outil fog (MJ)
  if ((key === 'f' || key === 'F') && myRole === 'gm') { setTool('fog'); return; }
  // W — outil murs (MJ)
  if ((key === 'w' || key === 'W') && myRole === 'gm') { setTool('walls'); return; }

  // G — toggle grille
  if (key === 'g' || key === 'G') {
    showGrid = !showGrid;
    const btn = document.getElementById('toggleGridBtn');
    if (btn) btn.classList.toggle('active', showGrid);
    drawMap();
    return;
  }

  // + / = — zoom in
  if (key === '+' || key === '=') { e.preventDefault(); zoomIn(); return; }
  // - — zoom out
  if (key === '-' || key === '_') { e.preventDefault(); zoomOut(); return; }
  // 0 — reset vue
  if (key === '0') { resetView(); return; }

  // Espace — centrer la vue sur le token sélectionné (ou token du joueur)
  if (key === ' ') {
    e.preventDefault();
    let target = selectedToken
      ? gameTokens.find(t => t.id === selectedToken)
      : gameTokens.find(t => t.character_id && myCharacters?.some(c => c.id === t.character_id));
    if (target) { cam.x = target.x; cam.y = target.y; drawMap(); }
    return;
  }

  // Tab — token suivant dans l'initiative
  if (key === 'Tab' && combatState?.combatants?.length) {
    e.preventDefault();
    const idx = combatState.current_turn ?? 0;
    const next = (idx + 1) % combatState.combatants.length;
    const c = combatState.combatants[next];
    const t = gameTokens.find(tk => tk.character_id === c?.char_id || tk.id === c?.token_id);
    if (t) { selectedToken = t.id; cam.x = t.x; cam.y = t.y; drawMap(); }
    return;
  }

  // Flèches — déplacer token sélectionné case par case
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key) && selectedToken && myRole !== null) {
    e.preventDefault();
    const gs = currentMap?.grid_size || GRID;
    const t = gameTokens.find(tk => tk.id === selectedToken);
    if (!t) return;
    // Vérifier que le joueur peut bouger ce token
    const canMove = myRole === 'gm' || myCharacters?.some(c => c.id === t.character_id);
    if (!canMove) return;
    pushTokenHistory(t.id, t.x, t.y);
    const step = e.shiftKey ? gs / 2 : gs;
    if (key === 'ArrowUp')    t.y -= step;
    if (key === 'ArrowDown')  t.y += step;
    if (key === 'ArrowLeft')  t.x -= step;
    if (key === 'ArrowRight') t.x += step;
    socket?.emit('token_move', { campaign_id: CAMPAIGN_ID, token_id: t.id, x: t.x, y: t.y, facing: t.facing ?? 0 });
    drawMap();
    return;
  }
}
