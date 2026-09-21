/**
 * Sodales — sélecteur d'objets (partie extraite de game.html)
 * Modale de sélection d'objets pour la fiche de personnage.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
let _ipActiveRar  = '';   // '' = toutes
let _ipActiveType = '';   // '' = tous

function openItemPicker() {
  _ipActiveRar  = '';
  _ipActiveType = '';
  document.getElementById('ipSearch').value = '';
  buildIpFilters();
  filterItems();
  document.getElementById('itemPickerOverlay').classList.add('open');
  setTimeout(() => document.getElementById('ipSearch').focus(), 80);
}
function closeItemPicker() {
  document.getElementById('itemPickerOverlay').classList.remove('open');
}

function buildIpFilters() {
  const c = document.getElementById('ipFilters');
  c.innerHTML = '';
  // Raretés
  const allR = document.createElement('button');
  allR.className = 'sp-filter-btn on'; allR.textContent = 'Toutes raretés'; allR.dataset.rar = '__all';
  allR.onclick = () => { _ipActiveRar = ''; refreshIpBtns(); filterItems(); };
  c.appendChild(allR);
  ['C','PC','R','TR','L','A'].forEach(r => {
    const b = document.createElement('button');
    b.className = 'sp-filter-btn'; b.dataset.rar = r;
    b.textContent = ITEM_RARITIES[r];
    b.style.setProperty('--rar-c', ITEM_RARITY_COLORS[r]);
    b.onclick = () => { _ipActiveRar = r; refreshIpBtns(); filterItems(); };
    c.appendChild(b);
  });
  // Séparateur
  const sep = document.createElement('span');
  sep.style.cssText = 'width:1px;background:var(--border);height:18px;margin:0 .1rem;';
  c.appendChild(sep);
  // Types
  const allT = document.createElement('button');
  allT.className = 'sp-filter-btn'; allT.textContent = 'Tous types'; allT.dataset.typ = '__all';
  allT.onclick = () => { _ipActiveType = ''; refreshIpBtns(); filterItems(); };
  c.appendChild(allT);
  Object.entries(ITEM_TYPES).forEach(([code, label]) => {
    const b = document.createElement('button');
    b.className = 'sp-filter-btn'; b.dataset.typ = code; b.textContent = label;
    b.onclick = () => { _ipActiveType = code; refreshIpBtns(); filterItems(); };
    c.appendChild(b);
  });
  refreshIpBtns();
}

function refreshIpBtns() {
  document.querySelectorAll('#ipFilters .sp-filter-btn').forEach(b => {
    if (b.dataset.rar !== undefined) {
      b.classList.toggle('on', b.dataset.rar === '__all' ? _ipActiveRar === '' : _ipActiveRar === b.dataset.rar);
    }
    if (b.dataset.typ !== undefined) {
      b.classList.toggle('on', b.dataset.typ === '__all' ? _ipActiveType === '' : _ipActiveType === b.dataset.typ);
    }
  });
}

function filterItems() {
  const q = (document.getElementById('ipSearch').value || '').toLowerCase().trim();
  const list = document.getElementById('ipList');
  const results = (typeof ITEMS_DB !== 'undefined' ? ITEMS_DB : []).filter(([name, rar, typ]) => {
    if (_ipActiveRar  && rar !== _ipActiveRar)  return false;
    if (_ipActiveType && typ !== _ipActiveType) return false;
    if (q && !name.toLowerCase().includes(q))   return false;
    return true;
  });
  if (!results.length) {
    list.innerHTML = `<div class="sp-empty">Aucun objet trouvé.<br><span style="font-size:.78rem">Utilisez la saisie manuelle ci-dessous.</span></div>`;
    if (q) document.getElementById('ipManualName').value = q.charAt(0).toUpperCase() + q.slice(1);
    return;
  }
  list.innerHTML = '';
  results.slice(0, 150).forEach(([name, rar, typ]) => {
    const color   = ITEM_RARITY_COLORS[rar] || '#9990a8';
    const rarLbl  = ITEM_RARITIES[rar]      || rar;
    const typLbl  = ITEM_TYPES[typ]         || typ;
    const w       = lookupItemWeight(name);
    const div = document.createElement('div');
    div.className = 'ip-item';
    div.innerHTML = `
      <span class="ip-item-rar" style="color:${color};background:${color}22;">${rarLbl}</span>
      <span class="ip-item-name">${name}</span>
      <span class="ip-item-type">${typLbl}</span>
      ${w != null ? `<span class="ip-item-weight">${w} kg</span>` : ''}`;
    div.addEventListener('click', () => selectItem(name, rar, typ, w));
    list.appendChild(div);
  });
}

function selectItem(name, rar, typ, weight) {
  const rarLbl = ITEM_RARITIES[rar] || '';
  const typLbl = ITEM_TYPES[typ]    || '';
  const note   = [rarLbl, typLbl].filter(Boolean).join(' — ');
  addItemRow(name + (note ? ` (${note})` : ''), 1, weight ?? null);
  closeItemPicker();
}

function addItemManual() {
  const name = document.getElementById('ipManualName').value.trim();
  if (!name) return;
  addItemRow(name, 1, null); // tryFillItemWeight will fill on focus-out if name matches
  document.getElementById('ipManualName').value = '';
  closeItemPicker();
}

// ══════════════════════════════════════════════════════════════
// MONTÉE DE NIVEAU — D&D 5e
// ══════════════════════════════════════════════════════════════
