// Vérification session
if (!localStorage.getItem("storyhub_session")) { window.location.href = "login.html"; }


// --- Clé de stockage par utilisateur ---
function getUsername() {
  try {
    const s = JSON.parse(localStorage.getItem('storyhub_session'));
    return s && s.username ? s.username.toLowerCase() : 'default';
  } catch { return 'default'; }
}
function storageKey() { return 'storyhub_worlds' + '_' + getUsername(); }

// ===== STORYHUB — MONDES =====


let state = {
  worlds: [],
  currentId: null,
};

let saveTimeout = null;
let subModalMode = null; // 'place' | 'faction'
let subEditIdx = null;   // index de l'item en cours d'édition (null = création)

// --- Utilitaires ---
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function saveState() {
  localStorage.setItem(storageKey(), JSON.stringify(state.worlds));
}

function loadState() {
  const raw = localStorage.getItem(storageKey());
  if (raw) {
    try { state.worlds = JSON.parse(raw); } catch { state.worlds = []; }
  }
}

function getCurrent() {
  return state.worlds.find(w => w.id === state.currentId) || null;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Vues ---
function showView(name) {
  document.getElementById('view-list').style.display = name === 'list' ? '' : 'none';
  document.getElementById('view-detail').style.display = name === 'detail' ? '' : 'none';
}

// ===== LISTE =====

function renderGrid() {
  const grid = document.getElementById('worlds-grid');
  const empty = document.getElementById('empty-state');
  grid.innerHTML = '';

  if (state.worlds.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  state.worlds.forEach((world, i) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.animationDelay = `${i * 0.06}s`;

    let coverHtml = world.cover
      ? `<img src="${world.cover}" alt="" />`
      : `<span class="cover-placeholder">${(world.name || '?').charAt(0).toUpperCase()}</span>`;

    const placesCount = (world.places || []).length;
    const factionsCount = (world.factions || []).length;
    const meta = [
      placesCount ? `${placesCount} lieu${placesCount > 1 ? 'x' : ''}` : '',
      factionsCount ? `${factionsCount} faction${factionsCount > 1 ? 's' : ''}` : '',
    ].filter(Boolean).join(' · ') || 'Monde vide';

    card.innerHTML = `
      <div class="item-card-cover">${coverHtml}</div>
      <div class="item-card-body">
        <div class="item-card-title">${escapeHtml(world.name || 'Sans nom')}</div>
        <div class="item-card-meta">${escapeHtml(meta)}</div>
      </div>
    `;
    card.addEventListener('click', () => openWorld(world.id));
    grid.appendChild(card);
  });
}

function openWorld(id) {
  state.currentId = id;
  showView('detail');
  renderDetail();
  renderSidebarList();
}

// ===== DÉTAIL =====

function renderDetail() {
  const world = getCurrent();
  if (!world) return;

  document.getElementById('world-name').value = world.name || '';
  document.getElementById('world-desc').value = world.desc || '';
  document.getElementById('world-era').value = world.era || '';
  document.getElementById('world-tone').value = world.tone || '';
  document.getElementById('world-rules').value = world.rules || '';
  document.getElementById('world-status').textContent = 'Sauvegardé ✦';

  // Cover
  const zone = document.getElementById('world-cover-zone');
  if (world.cover) {
    zone.innerHTML = `<img src="${world.cover}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    zone.innerHTML = `
      <input type="file" id="world-cover-input" accept="image/*" style="display:none;">
      <div id="world-cover-preview" class="upload-hint">Clique pour ajouter<br>une carte ou image</div>`;
  }
  bindCoverUpload();

  renderPlaces();
  renderFactions();
}

function renderSidebarList() {
  const list = document.getElementById('worlds-sidebar-list');
  list.innerHTML = '';
  state.worlds.forEach(world => {
    const li = document.createElement('li');
    li.className = 'page-item' + (world.id === state.currentId ? ' active' : '');
    li.textContent = world.name || 'Sans nom';
    li.addEventListener('click', () => openWorld(world.id));
    list.appendChild(li);
  });
}

function renderPlaces() {
  const world = getCurrent();
  if (!world) return;
  const container = document.getElementById('world-places-list');
  container.innerHTML = '';
  (world.places || []).forEach((place, idx) => {
    container.appendChild(makeSubItem(place, idx, 'place'));
  });
}

function renderFactions() {
  const world = getCurrent();
  if (!world) return;
  const container = document.getElementById('world-factions-list');
  container.innerHTML = '';
  (world.factions || []).forEach((faction, idx) => {
    container.appendChild(makeSubItem(faction, idx, 'faction'));
  });
}

function makeSubItem(item, idx, type) {
  const div = document.createElement('div');
  div.className = 'sub-item';

  const descHtml = item.desc
    ? `<div class="sub-item-desc">${escapeHtml(item.desc)}</div>`
    : `<div class="sub-item-desc" style="font-style:italic;opacity:0.4;">Aucune description</div>`;

  div.innerHTML = `
    <div class="sub-item-content">
      <div class="sub-item-name">${escapeHtml(item.name)}</div>
      ${descHtml}
    </div>
    <div class="sub-item-actions">
      <button class="sub-item-edit" title="Modifier">✎</button>
      <button class="sub-item-del" title="Supprimer">✕</button>
    </div>
  `;

  div.querySelector('.sub-item-edit').addEventListener('click', () => openEditSubModal(idx, type));
  div.querySelector('.sub-item-del').addEventListener('click', () => removeSubItem(idx, type));
  return div;
}

function openEditSubModal(idx, type) {
  const world = getCurrent();
  if (!world) return;
  const list = type === 'place' ? world.places : world.factions;
  const item = list[idx];
  if (!item) return;

  subModalMode = type;
  subEditIdx = idx;

  document.getElementById('sub-modal-title').textContent = type === 'place' ? 'Modifier le lieu' : 'Modifier la faction';
  document.getElementById('sub-name-input').value = item.name || '';
  document.getElementById('sub-desc-input').value = item.desc || '';
  document.getElementById('sub-name-input').placeholder = type === 'place' ? 'Ex : La Forêt Maudite' : "Ex : L'Ordre des Ombres";
  document.getElementById('sub-desc-input').placeholder = type === 'place' ? 'Description du lieu...' : 'Description de la faction...';
  document.getElementById('sub-modal-confirm').textContent = 'Enregistrer';
  document.getElementById('sub-modal-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('sub-name-input').focus(), 50);
}

function removeSubItem(idx, type) {
  const world = getCurrent();
  if (!world) return;
  if (type === 'place') {
    world.places.splice(idx, 1);
    renderPlaces();
  } else {
    world.factions.splice(idx, 1);
    renderFactions();
  }
  saveState();
  renderGrid();
}

function bindCoverUpload() {
  const zone = document.getElementById('world-cover-zone');
  const input = document.getElementById('world-cover-input');
  if (!zone) return;
  zone.addEventListener('click', () => input && input.click());
  if (input) {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const world = getCurrent();
        if (!world) return;
        world.cover = ev.target.result;
        saveState();
        zone.innerHTML = `<img src="${world.cover}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
        renderGrid();
        renderSidebarList();
      };
      reader.readAsDataURL(file);
    });
  }
}

function bindField(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const world = getCurrent();
    if (!world) return;
    world[key] = el.value;
    if (key === 'name') { renderSidebarList(); renderGrid(); }
    scheduleSave();
  });
}

function scheduleSave() {
  const status = document.getElementById('world-status');
  if (status) status.textContent = 'Modification en cours...';
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveState();
    if (status) status.textContent = 'Sauvegardé ✦';
  }, 800);
}

// ===== MODAL LIEU / FACTION =====

function openSubModal(mode) {
  subModalMode = mode;
  subEditIdx = null;
  document.getElementById('sub-modal-title').textContent = mode === 'place' ? 'Nouveau lieu' : 'Nouvelle faction';
  document.getElementById('sub-name-input').placeholder = mode === 'place' ? 'Ex : La Forêt Maudite' : "Ex : L'Ordre des Ombres";
  document.getElementById('sub-desc-input').placeholder = mode === 'place' ? 'Description du lieu...' : 'Description de la faction...';
  document.getElementById('sub-name-input').value = '';
  document.getElementById('sub-desc-input').value = '';
  document.getElementById('sub-modal-confirm').textContent = 'Ajouter';
  document.getElementById('sub-modal-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('sub-name-input').focus(), 50);
}

function closeSubModal() {
  document.getElementById('sub-modal-overlay').style.display = 'none';
  subModalMode = null;
}

function confirmSubModal() {
  const name = document.getElementById('sub-name-input').value.trim();
  if (!name) {
    document.getElementById('sub-name-input').style.borderColor = 'var(--danger)';
    return;
  }
  document.getElementById('sub-name-input').style.borderColor = '';

  const desc = document.getElementById('sub-desc-input').value.trim();
  const world = getCurrent();
  if (!world) return;

  const list = subModalMode === 'place'
    ? (world.places = world.places || [])
    : (world.factions = world.factions || []);

  if (subEditIdx !== null) {
    // Mode édition : on met à jour l'item existant
    list[subEditIdx].name = name;
    list[subEditIdx].desc = desc;
  } else {
    // Mode création
    list.push({ id: uid(), name, desc });
  }

  saveState();
  renderGrid();
  if (subModalMode === 'place') renderPlaces();
  else renderFactions();
  closeSubModal();
}

// ===== NOUVEAU MONDE =====

function createWorld() {
  const world = {
    id: uid(),
    name: '',
    desc: '',
    era: '',
    tone: '',
    rules: '',
    places: [],
    factions: [],
    cover: null,
  };
  state.worlds.push(world);
  saveState();
  renderGrid();
  openWorld(world.id);
  setTimeout(() => document.getElementById('world-name').focus(), 50);
}

function deleteWorld() {
  if (!confirm('Supprimer ce monde ?')) return;
  state.worlds = state.worlds.filter(w => w.id !== state.currentId);
  state.currentId = null;
  saveState();
  showView('list');
  renderGrid();
}

// ===== INIT =====
function init() {
  loadState();
  showView('list');
  renderGrid();

  document.getElementById('btn-new-world').addEventListener('click', createWorld);
  document.getElementById('btn-new-world-empty').addEventListener('click', createWorld);
  document.getElementById('btn-back').addEventListener('click', () => {
    showView('list');
    renderGrid();
  });
  document.getElementById('btn-delete-world').addEventListener('click', deleteWorld);

  document.getElementById('btn-add-place').addEventListener('click', () => openSubModal('place'));
  document.getElementById('btn-add-faction').addEventListener('click', () => openSubModal('faction'));

  document.getElementById('sub-modal-close').addEventListener('click', closeSubModal);
  document.getElementById('sub-modal-cancel').addEventListener('click', closeSubModal);
  document.getElementById('sub-modal-confirm').addEventListener('click', confirmSubModal);
  document.getElementById('sub-modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('sub-modal-overlay')) closeSubModal();
  });
  document.getElementById('sub-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmSubModal(); }
    if (e.key === 'Escape') closeSubModal();
  });

  bindField('world-name', 'name');
  bindField('world-desc', 'desc');
  bindField('world-era', 'era');
  bindField('world-tone', 'tone');
  bindField('world-rules', 'rules');
}

document.addEventListener('DOMContentLoaded', init);