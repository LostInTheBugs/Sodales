/**
 * Sodales — panneau de chat (partie extraite de game.html)
 * Messages, rendu markdown, et tables aléatoires (PRESET_TABLES + éditeur).
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
function chatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}
function sendChat() {
  const input = document.getElementById('chatInput');
  const content = input.value.trim();
  if (!content || !socket) return;

  // Détection commande /w pseudo message
  const whisperMatch = content.match(/^\/w\s+(\S+)\s+(.+)$/i);
  if (whisperMatch) {
    const toUsername = whisperMatch[1];
    const whisperContent = whisperMatch[2];
    socket.emit('whisper', { campaign_id: CAMPAIGN_ID, to_username: toUsername, content: whisperContent, character_name: activeChar?.name });
    input.value = '';
    return;
  }

  socket.emit('chat_message', { campaign_id: CAMPAIGN_ID, content, character_name: activeChar?.name });
  input.value = '';
}

function addChatMessage(msg) {
  const el = document.getElementById('chatMessages');
  if (!el) return; // mode display : pas de chat
  const time = new Date(msg.created_at).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'});
  let html;
  if (msg.type === 'system') {
    html = `<div class="msg msg-system">${esc(msg.content)}</div>`;
  } else if (msg.type === 'whisper') {
    const dir = msg.from_me ? `→ ${esc(msg.to_username)}` : `${esc(msg.username)} → vous`;
    html = `<div class="msg msg-chat" style="background:rgba(139,92,246,.12);border-left:3px solid var(--accent2);padding-left:.6rem;">
      <div class="msg-name" style="color:var(--accent2);">🤫 ${dir}<span class="msg-time">${time}</span></div>
      <div style="font-style:italic;">${esc(msg.content)}</div>
    </div>`;
  } else if (msg.type === 'combat') {
    // Rendre **bold** et *italic* simplement
    const rendered = esc(msg.content)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = `<div class="msg msg-roll" style="border-left:3px solid #ef4444;background:rgba(239,68,68,.06);">
      <div class="msg-name" style="color:#ef4444;">⚔ Combat<span class="msg-time">${time}</span></div>
      <div style="font-size:.82rem;line-height:1.5;">${rendered}</div>
    </div>`;
  } else if (msg.type === 'roll') {
    const rd = msg.roll_data || {};
    const macroLabel = rd.macro_name ? `<span style="font-size:.72rem;color:var(--text2);margin-left:.3rem;">[${esc(rd.macro_name)}]</span>` : '';
    html = `<div class="msg msg-roll">
      <div class="msg-name">${esc(msg.character_name || msg.username)}${macroLabel}<span class="msg-time">${time}</span></div>
      <div>🎲 ${esc(rd.dice || '')}${rd.modifier ? (rd.modifier>0?`+${rd.modifier}`:rd.modifier) : ''} = <span class="total">${rd.total || '?'}</span></div>
      <div class="roll-details">Dés : [${(rd.rolls||[]).join(', ')}]${rd.modifier ? ` + ${rd.modifier}` : ''}</div>
    </div>`;
  } else {
    const rendered = esc(msg.content).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<em>$1</em>');
    html = `<div class="msg msg-chat">
      <div class="msg-name">${esc(msg.character_name || msg.username)}<span class="msg-time">${time}</span></div>
      <div>${rendered}</div>
    </div>`;
  }
  el.insertAdjacentHTML('beforeend', html);
  el.scrollTop = el.scrollHeight;
}

function addSystemMessage(text) {
  addChatMessage({ type: 'system', content: text, created_at: new Date() });
}

// ══════════════════════════════════════════════════════════════
// TABLES ALÉATOIRES
// ══════════════════════════════════════════════════════════════

// Tables D&D 5e prédéfinies à importer
const PRESET_TABLES = [
  {
    name: 'Rencontres — Forêt',
    description: 'Rencontres aléatoires en forêt (D&D 5e)',
    entries: [
      { text: '1d4 Loups',              weight: 4 },
      { text: '1 Ours brun',             weight: 3 },
      { text: '2d6 Gobelins',            weight: 4 },
      { text: '1 Ogre',                  weight: 2 },
      { text: '1d4 Sylvains (hostiles)', weight: 2 },
      { text: '1 Guiverne (survol)',     weight: 1 },
      { text: 'Groupe de marchands perdus', weight: 3 },
      { text: '1d6 Bandits embusqués',   weight: 4 },
      { text: '1 Druide solitaire',      weight: 2 },
      { text: 'Aucune rencontre',        weight: 5 },
    ],
  },
  {
    name: 'Butin — Donjon',
    description: 'Table de butin pour un donjon standard',
    entries: [
      { text: '2d6 po et une potion de soins',   weight: 5 },
      { text: '1d10 × 10 pa',                    weight: 4 },
      { text: 'Parchemin de sort (niveau 1)',     weight: 3 },
      { text: 'Gemme (25 po)',                    weight: 3 },
      { text: 'Arme +1 (non-magique, de qualité)',weight: 2 },
      { text: 'Potion de soins supérieure',       weight: 2 },
      { text: 'Carte au trésor fragmentée',       weight: 1 },
      { text: 'Objet magique mineur (DMG)',       weight: 1 },
      { text: 'Rien — le conteneur est vide',     weight: 4 },
    ],
  },
  {
    name: 'Météo',
    description: 'Conditions météorologiques du jour',
    entries: [
      { text: 'Ciel clair, beau temps',         weight: 5 },
      { text: 'Nuageux, vent frais',             weight: 4 },
      { text: 'Brume matinale persistante',      weight: 3 },
      { text: 'Pluie légère',                    weight: 4 },
      { text: 'Pluie battante, visibilité réduite', weight: 3 },
      { text: 'Orage violent (foudre possible)', weight: 2 },
      { text: 'Forte chaleur, déshydratation',   weight: 2 },
      { text: 'Neige légère (si altitude/hiver)',weight: 1 },
      { text: 'Tempête de neige / blizzard',     weight: 1 },
    ],
  },
  {
    name: 'Traits de PNJ',
    description: 'Traits de personnalité pour un PNJ rencontré',
    entries: [
      { text: 'Méfiant, parle peu au début',   weight: 3 },
      { text: 'Bavard et curieux',             weight: 4 },
      { text: 'Nerveux, regarde par-dessus son épaule', weight: 3 },
      { text: 'Arrogant mais compétent',       weight: 2 },
      { text: 'Chaleureux et serviable',       weight: 4 },
      { text: 'Triste, en deuil',              weight: 2 },
      { text: 'Obsédé par l\'argent',          weight: 3 },
      { text: 'Étrange, parle par énigmes',    weight: 1 },
      { text: 'Menteur compulsif',             weight: 2 },
      { text: 'Loyal jusqu\'à l\'absurde',     weight: 2 },
    ],
  },
  {
    name: 'Accroche d\'aventure',
    description: 'Événement ou rumeur qui lance une quête',
    entries: [
      { text: 'Un enfant du village a disparu dans la forêt',          weight: 3 },
      { text: 'Une ancienne tombe a été profanée — les morts se lèvent', weight: 2 },
      { text: 'Un marchand offre une grosse récompense pour récupérer une cargaison', weight: 3 },
      { text: 'Une faction cherche des émissaires discrets',           weight: 2 },
      { text: 'Un artefact légendaire vient d\'être mis aux enchères', weight: 1 },
      { text: 'Un noble accusé de sorcellerie demande de l\'aide',     weight: 2 },
      { text: 'Des monstres ravagent les routes commerciales',         weight: 3 },
      { text: 'Une prophétie mentionne les aventuriers par leur description', weight: 1 },
    ],
  },
];

let randomTables   = [];
let activeTableId  = null;
let tableEditing   = false;
let teEntries      = []; // entrées en cours d'édition

function weightedRandom(entries) {
  const total = entries.reduce((s, e) => s + (e.weight || 1), 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= (e.weight || 1);
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

async function loadTables() {
  try {
    randomTables = await API.tables.list(CAMPAIGN_ID);
    renderTablesList();
  } catch { /* silencieux */ }
}

function renderTablesList() {
  const el = document.getElementById('tablesListScroll');
  if (!el) return;
  if (!randomTables.length) {
    el.innerHTML = '<div style="color:var(--text2);font-size:.78rem;padding:.5rem;text-align:center;">Aucune table<br><span style="font-size:.7rem;">Crée-en une ou importe un preset</span></div>';
    return;
  }
  el.innerHTML = randomTables.map(t => `
    <div class="table-item ${activeTableId === t.id ? 'active' : ''}" data-act="selectTable" data-a='["${t.id}"]'>
      <div class="table-item-name">${esc(t.name)}</div>
      <div class="table-item-count">${t.entries.length} entrée${t.entries.length > 1 ? 's' : ''}</div>
    </div>
  `).join('');
}

function selectTable(id) {
  activeTableId = id;
  tableEditing  = false;
  renderTablesList();
  const t = randomTables.find(x => x.id === id);
  if (t) showTableDetail(t);
}

function showTableDetail(t) {
  const detail = document.getElementById('tablesDetail');
  detail.innerHTML = `
    <div class="tables-detail-header">
      <div class="tables-detail-name">${esc(t.name)}</div>
      <button class="journal-new-btn" data-act="showTableEditor" data-a='["${t.id}"]'>✏ Modifier</button>
      <button class="journal-new-btn" data-act="deleteTable" data-a='["${t.id}"]' style="border-color:var(--danger);color:var(--danger);">🗑</button>
    </div>
    <div class="tables-entries" id="tableEntriesView">
      ${t.entries.map(e => `
        <div class="table-entry-row">
          <div class="table-entry-text">${esc(e.text)}</div>
          <div class="table-entry-weight" title="Poids">${e.weight}</div>
        </div>
      `).join('')}
    </div>
    <div class="table-roll-result">
      <div class="table-roll-output" id="tableRollOutput">Appuie sur Rouler…</div>
      <button class="journal-new-btn" data-act="rollTablePrivate" data-a='["${t.id}"]' title="Résultat visible uniquement par toi">👁 Privé</button>
      <button class="btn-primary" data-act="rollTablePublic" data-a='["${t.id}"]' style="padding:.35rem .8rem;">🎲 Rouler</button>
    </div>
  `;
}

function rollTablePrivate(id) {
  const t = randomTables.find(x => x.id === id);
  if (!t || !t.entries.length) return;
  const result = weightedRandom(t.entries);
  document.getElementById('tableRollOutput').textContent = `→ ${result.text}`;
  document.getElementById('tableRollOutput').className = 'table-roll-output rolled';
}

function rollTablePublic(id) {
  const t = randomTables.find(x => x.id === id);
  if (!t || !t.entries.length) return;
  const result = weightedRandom(t.entries);
  document.getElementById('tableRollOutput').textContent = `→ ${result.text}`;
  document.getElementById('tableRollOutput').className = 'table-roll-output rolled';
  // Envoyer dans le chat
  if (socket) {
    socket.emit('chat_message', {
      campaign_id: CAMPAIGN_ID,
      content: `🎲 [${t.name}] → ${result.text}`,
      character_name: null,
    });
  }
}

ACT.teSetText = function (i) { teEntries[i].text = this.value; };
ACT.teSetWeight = function (i) { teEntries[i].weight = Math.max(1, parseInt(this.value) || 1); };
function showTableEditor(id) {
  const t = id ? randomTables.find(x => x.id === id) : null;
  activeTableId = id || null;
  tableEditing  = true;
  teEntries     = t ? t.entries.map(e => ({ ...e })) : [{ text: '', weight: 1 }];
  renderTablesList();
  renderTableEditor(t);
}

function renderTableEditor(t) {
  const detail = document.getElementById('tablesDetail');
  detail.innerHTML = `
    <div class="tables-detail-header">
      <div class="tables-detail-name" style="font-size:.85rem;">${t ? 'Modifier la table' : 'Nouvelle table'}</div>
    </div>
    <div class="table-editor" id="tableEditorBody">
      <input id="teTableName"  placeholder="Nom de la table" value="${esc(t?.name || '')}" maxlength="100">
      <input id="teTableDesc"  placeholder="Description (optionnel)" value="${esc(t?.description || '')}" maxlength="255">
      <div style="font-size:.8rem;font-weight:600;color:var(--text2);display:flex;align-items:center;gap:.5rem;">
        Entrées
        <span style="font-size:.7rem;color:var(--text2);">(texte · poids)</span>
        <button class="journal-new-btn" data-act="teAddEntry" style="margin-left:auto;">＋ Ligne</button>
      </div>
      <div id="teEntriesList"></div>
    </div>
    <div class="journal-actions">
      <button class="btn-primary" data-act="saveTable" data-a='[${t ? `"${t.id}"` : 'null'}]' style="padding:.4rem .9rem;">💾 Enregistrer</button>
      <button class="journal-new-btn" onclick="${t ? `selectTable('${t.id}')` : 'resetTablesDetail()'}">Annuler</button>
    </div>
  `;
  renderTeEntries();
}

function renderTeEntries() {
  const el = document.getElementById('teEntriesList');
  if (!el) return;
  el.innerHTML = teEntries.map((e, i) => `
    <div class="te-entry-row">
      <input value="${esc(e.text)}" placeholder="Résultat…" data-act="teSetText" data-a="[${i}]">
      <input class="te-weight" type="number" min="1" max="99" value="${e.weight}" data-act="teSetWeight" data-a="[${i}]" title="Poids (fréquence relative)">
      <button class="te-del" data-act="teRemoveEntry" data-a='[${i}]'>✕</button>
    </div>
  `).join('');
}

function teAddEntry() {
  teEntries.push({ text: '', weight: 1 });
  renderTeEntries();
  // Focus dernière ligne
  setTimeout(() => {
    const rows = document.querySelectorAll('.te-entry-row input');
    if (rows.length) rows[rows.length - 2]?.focus();
  }, 50);
}

function teRemoveEntry(i) {
  if (teEntries.length <= 1) return;
  teEntries.splice(i, 1);
  renderTeEntries();
}

async function saveTable(id) {
  const name = document.getElementById('teTableName')?.value.trim();
  const description = document.getElementById('teTableDesc')?.value.trim();
  if (!name) return alert('Le nom est requis.');
  const entries = teEntries.filter(e => e.text.trim());
  if (!entries.length) return alert('Au moins une entrée est requise.');
  try {
    let saved;
    const data = { name, description: description || null, entries };
    if (id) {
      saved = await API.tables.update(CAMPAIGN_ID, id, data);
      randomTables = randomTables.map(t => t.id === id ? saved : t);
    } else {
      saved = await API.tables.create(CAMPAIGN_ID, data);
      randomTables.push(saved);
    }
    activeTableId = saved.id;
    tableEditing  = false;
    renderTablesList();
    showTableDetail(saved);
  } catch (e) { alert(e.message); }
}

async function deleteTable(id) {
  if (!confirm('Supprimer cette table ?')) return;
  try {
    await API.tables.delete(CAMPAIGN_ID, id);
    randomTables = randomTables.filter(t => t.id !== id);
    activeTableId = null;
    renderTablesList();
    resetTablesDetail();
  } catch (e) { alert(e.message); }
}

function resetTablesDetail() {
  tableEditing = false;
  document.getElementById('tablesDetail').innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text2);font-size:.88rem;">Sélectionne ou crée une table</div>';
}

function openTablesModal() {
  loadTables();
  document.getElementById('tablesOverlay').classList.add('open');
  renderImportMenu();
}
function closeTablesModal(e) {
  if (!e || e.target === document.getElementById('tablesOverlay')) {
    document.getElementById('tablesOverlay').classList.remove('open');
  }
}

function toggleImportMenu() {
  const m = document.getElementById('importMenu');
  m.style.display = m.style.display === 'none' ? '' : 'none';
}

function renderImportMenu() {
  const m = document.getElementById('importMenu');
  m.innerHTML = PRESET_TABLES.map((t, i) => `
    <div style="padding:.35rem .6rem;cursor:pointer;border-radius:5px;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
         data-act="hoverBgIn" data-act-out="hoverBgOut"
         data-act="importPreset" data-a='[${i}]'>
      ${esc(t.name)}
    </div>
  `).join('');
}

async function importPreset(i) {
  document.getElementById('importMenu').style.display = 'none';
  const preset = PRESET_TABLES[i];
  try {
    const saved = await API.tables.create(CAMPAIGN_ID, preset);
    randomTables.push(saved);
    renderTablesList();
    selectTable(saved.id);
  } catch (e) { alert(e.message); }
}

// ══════════════════════════════════════════════════════════════
// JOURNAL / HANDOUTS
// ══════════════════════════════════════════════════════════════
let handouts        = [];
let journalNewCount = 0;  // handouts non lus
let editingHandout  = null; // null = lecture, objet = édition
let activeHandoutId = null;

async function loadHandouts() {
  try {
    handouts = await API.handouts.list(CAMPAIGN_ID);
    renderJournalList();
  } catch { /* silencieux */ }
}

function renderJournalList() {
  const el = document.getElementById('journalListScroll');
  if (!el) return;
  if (!handouts.length) {
    el.innerHTML = '<div style="color:var(--text2);font-size:.78rem;padding:.5rem;text-align:center;">Aucun document</div>';
    return;
  }
  el.innerHTML = handouts.map(h => `
    <div class="journal-item ${activeHandoutId === h.id ? 'active' : ''}" data-act="selectHandout" data-a='["${h.id}"]'>
      <div class="journal-item-title">${esc(h.title)}</div>
      <div class="journal-item-meta">
        ${h.shared ? '<span class="journal-shared-badge">● Partagé</span>' : '<span style="color:var(--text2)">● Privé</span>'}
        <span>${new Date(h.created_at).toLocaleDateString('fr')}</span>
      </div>
    </div>
  `).join('');
}

function selectHandout(id) {
  activeHandoutId = id;
  editingHandout  = null;
  renderJournalList();
  const h = handouts.find(x => x.id === id);
  if (!h) return;
  showHandoutView(h);
}

function showHandoutView(h) {
  const area = document.getElementById('journalContentArea');
  const imgHtml = h.image_url
    ? `<img src="${esc(h.image_url)}" class="journal-view-image" alt="">`
    : '';
  const textHtml = h.content
    ? `<div class="journal-view-text">${(window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(h.content)) : esc(h.content).replace(/\n/g,'<br>'))}</div>`
    : '';
  const gmActions = myRole === 'gm' ? `
    <div class="journal-actions">
      <button class="journal-new-btn" data-act="showHandoutForm" data-a='["${h.id}"]'>✏ Modifier</button>
      <button class="journal-new-btn" data-act="toggleShareHandout" data-a='["${h.id}"]' style="${h.shared ? 'border-color:var(--danger);color:var(--danger);' : 'border-color:#22c55e;color:#22c55e;'}">
        ${h.shared ? '🔒 Masquer' : '📤 Partager'}
      </button>
      <button class="journal-new-btn" data-act="deleteHandout" data-a='["${h.id}"]' style="border-color:var(--danger);color:var(--danger);margin-left:auto;">🗑 Supprimer</button>
    </div>` : '';
  area.innerHTML = `
    <div class="journal-view">
      <div class="journal-view-title">${esc(h.title)}</div>
      ${imgHtml}${textHtml}
      ${h.content || h.image_url ? '' : '<div style="color:var(--text2);font-size:.85rem;">Document vide.</div>'}
    </div>
    ${gmActions}
  `;
}

function showHandoutForm(id) {
  const h = id ? handouts.find(x => x.id === id) : null;
  editingHandout = h;
  activeHandoutId = id || null;
  renderJournalList();
  const area = document.getElementById('journalContentArea');
  area.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;min-height:0;">
      <div class="journal-edit" style="flex-shrink:0;padding-bottom:.4rem;">
        <div style="font-weight:600;font-size:.9rem;">${h ? 'Modifier' : 'Nouveau document'}</div>
        <input id="heTitle" placeholder="Titre" value="${esc(h?.title || '')}" maxlength="255">
        <div style="font-size:.78rem;color:var(--text2);">Image (URL ou upload)</div>
        <div style="display:flex;gap:.5rem;align-items:center;">
          <input id="heImageUrl" placeholder="https://… ou laisser vide" value="${esc(h?.image_url || '')}" style="flex:1;">
          <label style="cursor:pointer;font-size:.78rem;color:var(--accent);white-space:nowrap;">
            📎 Upload
            <input type="file" accept="image/*" style="display:none" data-act="uploadHandoutImage" data-a='["$el"]'>
          </label>
        </div>
        ${h?.image_url ? `<img src="${esc(h.image_url)}" class="journal-edit-img" id="hePreview">` : '<img style="display:none" class="journal-edit-img" id="hePreview">'}
      </div>
      <!-- Tabs: Édition / Aperçu -->
      <div class="md-tabs">
        <button class="md-tab active" id="mdTabEdit" data-act="switchMdTab" data-a='["edit"]'>✏ Édition</button>
        <button class="md-tab" id="mdTabPreview" data-act="switchMdTab" data-a='["preview"]'>👁 Aperçu</button>
      </div>
      <!-- Markdown toolbar -->
      <div class="md-toolbar" id="mdToolbar">
        <button class="md-tb-btn" data-act="mdInsert" data-a='["**", "**"]' title="Gras">B</button>
        <button class="md-tb-btn" data-act="mdInsert" data-a='["*", "*"]' title="Italique" style="font-style:italic;">I</button>
        <button class="md-tb-btn" data-act="mdInsert" data-a='["# ", ""]' title="Titre H1">H1</button>
        <button class="md-tb-btn" data-act="mdInsert" data-a='["## ", ""]' title="Titre H2">H2</button>
        <button class="md-tb-btn" data-act="mdInsert" data-a='["### ", ""]' title="Titre H3">H3</button>
        <button class="md-tb-btn" data-act="mdInsert" data-a='["- ", ""]' title="Liste">•</button>
        <button class="md-tb-btn" data-act="mdInsert" data-a='["> ", ""]' title="Citation">❝</button>
        <button class="md-tb-btn" data-act="mdInsert" data-a='["\`", "\`"]' title="Code">&lt;/&gt;</button>
        <button class="md-tb-btn" data-act="mdInsert" data-a='["---\\\\n", ""]' title="Séparateur">—</button>
        <button class="md-tb-btn" data-act="mdInsert" data-a='["| Col1 | Col2 |\\\\n| --- | --- |\\\\n| val | val |\\\\n", ""]' title="Tableau">⊞</button>
      </div>
      <!-- Edit area -->
      <div id="mdEditPanel" style="flex:1;display:flex;flex-direction:column;min-height:0;">
        <textarea id="heContent" placeholder="Contenu en Markdown…" style="flex:1;resize:none;min-height:0;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:.45rem .65rem;font-size:.85rem;outline:none;font-family:monospace;line-height:1.5;">${esc(h?.content || '')}</textarea>
      </div>
      <!-- Preview area -->
      <div id="mdPreviewPanel" class="md-preview journal-view-text" style="display:none;"></div>
    </div>
    <div class="journal-actions" style="flex-shrink:0;">
      <button class="btn-primary" data-act="saveHandout" data-a='[${h ? `"${h.id}"` : 'null'}]' style="padding:.4rem .9rem;">💾 Enregistrer</button>
      <button class="journal-new-btn" onclick="${h ? `selectHandout('${h.id}')` : 'closeJournalEdit()'}">Annuler</button>
    </div>
  `;
  // Live preview URL image
  document.getElementById('heImageUrl').addEventListener('input', e => {
    const img = document.getElementById('hePreview');
    if (img) { img.src = e.target.value; img.style.display = e.target.value ? '' : 'none'; }
  });
}

function switchMdTab(tab) {
  const editPanel    = document.getElementById('mdEditPanel');
  const previewPanel = document.getElementById('mdPreviewPanel');
  const toolbar      = document.getElementById('mdToolbar');
  const tabEdit      = document.getElementById('mdTabEdit');
  const tabPrev      = document.getElementById('mdTabPreview');
  if (!editPanel) return;
  if (tab === 'preview') {
    const content = document.getElementById('heContent')?.value || '';
    previewPanel.innerHTML = (window.marked && window.DOMPurify) ? DOMPurify.sanitize(marked.parse(content)) : esc(content).replace(/\n/g,'<br>');
    editPanel.style.display    = 'none';
    previewPanel.style.display = '';
    toolbar.style.display      = 'none';
    tabEdit.classList.remove('active');
    tabPrev.classList.add('active');
  } else {
    editPanel.style.display    = 'flex';
    previewPanel.style.display = 'none';
    toolbar.style.display      = '';
    tabEdit.classList.add('active');
    tabPrev.classList.remove('active');
  }
}

function mdInsert(before, after) {
  const ta = document.getElementById('heContent');
  if (!ta) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const sel   = ta.value.substring(start, end);
  const text  = before + sel + after;
  ta.setRangeText(text, start, end, 'end');
  ta.focus();
  // Place cursor between before/after if no selection
  if (start === end && !sel) {
    ta.selectionStart = ta.selectionEnd = start + before.length;
  }
}

async function uploadHandoutImage(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const { url } = await API.upload(file);
    const field = document.getElementById('heImageUrl');
    if (field) { field.value = url; field.dispatchEvent(new Event('input')); }
  } catch (e) { alert('Erreur upload : ' + e.message); }
}

async function saveHandout(id) {
  const title    = document.getElementById('heTitle')?.value.trim();
  const content  = document.getElementById('heContent')?.value.trim();
  const image_url = document.getElementById('heImageUrl')?.value.trim();
  if (!title) return alert('Le titre est requis.');
  try {
    const data = { title, content: content || null, image_url: image_url || null };
    let saved;
    if (id) {
      saved = await API.handouts.update(CAMPAIGN_ID, id, data);
      handouts = handouts.map(h => h.id === id ? { ...h, ...saved } : h);
    } else {
      saved = await API.handouts.create(CAMPAIGN_ID, data);
      handouts.unshift(saved);
    }
    activeHandoutId = saved.id;
    editingHandout  = null;
    renderJournalList();
    showHandoutView(saved);
  } catch (e) { alert(e.message); }
}

function closeJournalEdit() {
  editingHandout  = null;
  activeHandoutId = null;
  renderJournalList();
  document.getElementById('journalContentArea').innerHTML =
    `<div class="journal-view" style="display:flex;align-items:center;justify-content:center;color:var(--text2);font-size:.88rem;">Sélectionne un document</div>`;
}

async function toggleShareHandout(id) {
  try {
    const updated = await API.handouts.share(CAMPAIGN_ID, id);
    handouts = handouts.map(h => h.id === id ? { ...h, ...updated } : h);
    renderJournalList();
    showHandoutView(handouts.find(h => h.id === id));
    // Broadcast socket
    if (socket) {
      if (updated.shared) {
        socket.emit('handout_share_broadcast', { campaign_id: CAMPAIGN_ID, handout: updated });
      } else {
        socket.emit('handout_unshare_broadcast', { campaign_id: CAMPAIGN_ID, handout_id: id });
      }
    }
  } catch (e) { alert(e.message); }
}

async function deleteHandout(id) {
  if (!confirm('Supprimer ce document ?')) return;
  try {
    await API.handouts.delete(CAMPAIGN_ID, id);
    handouts = handouts.filter(h => h.id !== id);
    activeHandoutId = null;
    renderJournalList();
    closeJournalEdit();
    if (socket) socket.emit('handout_deleted_broadcast', { campaign_id: CAMPAIGN_ID, handout_id: id });
  } catch (e) { alert(e.message); }
}

function openJournal() {
  // Réinitialiser badge
  journalNewCount = 0;
  const badge = document.getElementById('journalBadge');
  if (badge) badge.classList.remove('show');
  // Afficher bouton Nouveau pour le MJ
  const newBtn = document.getElementById('journalNewBtn');
  if (newBtn) newBtn.style.display = myRole === 'gm' ? '' : 'none';
  // Recharger la liste
  loadHandouts().then(() => {
    if (activeHandoutId) selectHandout(activeHandoutId);
  });
  document.getElementById('journalOverlay').classList.add('open');
}
function closeJournal(e) {
  if (!e || e.target === document.getElementById('journalOverlay')) {
    document.getElementById('journalOverlay').classList.remove('open');
  }
}

function showHandoutToast(h) {
  const existing = document.querySelector('.handout-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'handout-toast';
  toast.innerHTML = `
    <div class="handout-toast-text">📜 Nouveau document : <strong>${esc(h.title)}</strong></div>
    <button class="handout-toast-see" data-act="openJournalAndSelect" data-a='["${h.id}"]'>Voir</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 7000);
}

function openJournalAndSelect(id) {
  document.querySelector('.handout-toast')?.remove();
  openJournal();
  setTimeout(() => selectHandout(id), 200);
}

// ══════════════════════════════════════════════════════════════
// MACROS DE JETS RAPIDES
// ══════════════════════════════════════════════════════════════
const MACRO_COLORS = ['#c9a227','#ef4444','#3b82f6','#22c55e','#a855f7','#e2e8f0'];
let userMacros = [];
let macroNewColorIdx = 0;

async function loadMacros() {
  try {
    userMacros = await API.macros.list();
    renderMacroBar();
  } catch { /* silencieux */ }
}

function renderMacroBar() {
  const bar = document.getElementById('macroBar');
  if (!bar) return;
  // Boutons macros (avant le bouton ⚙)
  const editBtn = bar.querySelector('.macro-edit-btn');
  // Supprimer anciens boutons
  bar.querySelectorAll('.macro-btn').forEach(b => b.remove());
  // Insérer avant le bouton edit
  userMacros.slice().sort((a,b) => a.position - b.position).forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'macro-btn';
    btn.title = `${m.name} — ${m.formula}`;
    btn.style.borderColor = m.color + '80';
    btn.style.color = m.color;
    btn.style.background = m.color + '18';
    btn.textContent = m.name;
    btn.onclick = () => rollMacro(m);
    bar.insertBefore(btn, editBtn);
  });
}

function parseMacroFormula(formula) {
  // Accepte: 1d20+5, 2d6, d20, 1d8-2, 1d20 + 5, etc.
  const clean = formula.replace(/\s+/g,'').toLowerCase();
  const m = clean.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!m) return null;
  const count = parseInt(m[1] || '1', 10);
  const faces  = parseInt(m[2], 10);
  const mod    = m[3] ? parseInt(m[3], 10) : 0;
  return { dice: `${count}d${faces}`, modifier: mod };
}

function rollMacro(macro) {
  if (!socket) return;
  const parsed = parseMacroFormula(macro.formula);
  if (!parsed) {
    addSystemMessage(`⚠ Formule invalide : ${macro.formula}`);
    return;
  }
  socket.emit('dice_roll', {
    campaign_id: CAMPAIGN_ID,
    dice: parsed.dice,
    modifier: parsed.modifier,
    character_name: activeChar?.name,
    macro_name: macro.name,
  });
}

function openMacroModal() {
  renderMacroList();
  document.getElementById('macroModalOverlay').classList.add('open');
}
function closeMacroModal(e) {
  if (!e || e.target === document.getElementById('macroModalOverlay')) {
    document.getElementById('macroModalOverlay').classList.remove('open');
  }
}

function renderMacroList() {
  const c = document.getElementById('macroListContainer');
  if (!c) return;
  if (!userMacros.length) {
    c.innerHTML = '<div style="color:var(--text2);font-size:.82rem;text-align:center;padding:.5rem">Aucune macro — ajoutes-en ci-dessous !</div>';
    return;
  }
  c.innerHTML = userMacros.slice().sort((a,b)=>a.position-b.position).map(m => `
    <div class="macro-list-item">
      <div class="macro-swatch" style="background:${m.color}"></div>
      <span class="macro-item-name">${esc(m.name)}</span>
      <span class="macro-item-formula">${esc(m.formula)}</span>
      <button class="macro-del" data-act="deleteMacro" data-a='["${m.id}"]' title="Supprimer">✕</button>
    </div>
  `).join('');
}

function selectMacroColor(idx) {
  macroNewColorIdx = idx;
  for (let i = 0; i < 6; i++) {
    const d = document.getElementById('mcp-' + i);
    if (d) d.classList.toggle('active', i === idx);
  }
}

async function addMacro() {
  const name    = document.getElementById('macroNewName')?.value.trim();
  const formula = document.getElementById('macroNewFormula')?.value.trim();
  if (!name || !formula) return;
  if (!parseMacroFormula(formula)) {
    alert('Formule invalide. Exemples : 1d20+5 · 2d6 · 1d8-1');
    return;
  }
  try {
    const macro = await API.macros.create({
      name,
      formula: formula.toLowerCase().replace(/\s+/g,''),
      color: MACRO_COLORS[macroNewColorIdx],
      position: userMacros.length,
    });
    userMacros.push(macro);
    document.getElementById('macroNewName').value    = '';
    document.getElementById('macroNewFormula').value = '';
    renderMacroBar();
    renderMacroList();
  } catch (e) { alert(e.message); }
}

async function deleteMacro(id) {
  try {
    await API.macros.delete(id);
    userMacros = userMacros.filter(m => m.id !== id);
    renderMacroBar();
    renderMacroList();
  } catch (e) { alert(e.message); }
}
