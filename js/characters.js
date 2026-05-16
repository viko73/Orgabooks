// Vérification session
if (!localStorage.getItem("storyhub_session")) { window.location.href = "login.html"; }


// --- Clé de stockage par utilisateur ---
function getUsername() {
  try {
    const s = JSON.parse(localStorage.getItem('storyhub_session'));
    return s && s.username ? s.username.toLowerCase() : 'default';
  } catch { return 'default'; }
}
function storageKey() { return 'storyhub_characters' + '_' + getUsername(); }

// ===== STORYHUB — PERSONNAGES =====
// Calqué sur app.js : espaces > personnages


let state = {
  spaces: [],
  currentSpaceId: null,
  currentCharId: null,
};

let saveTimeout = null;
let pendingCoverDataUrl = null;

// --- Utilitaires ---
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function saveState() {
  localStorage.setItem(storageKey(), JSON.stringify(state.spaces));
}

function loadState() {
  const raw = localStorage.getItem(storageKey());
  if (raw) {
    try {
      state.spaces = JSON.parse(raw);
      // Nettoyer les entrées invalides
      state.spaces = state.spaces.filter(s => s && s.id && s.title);
    } catch { state.spaces = []; }
  }
}

function getCurrentSpace() {
  return state.spaces.find(s => s.id === state.currentSpaceId) || null;
}

function getCurrentChar() {
  const space = getCurrentSpace();
  if (!space) return null;
  return (space.chars || []).find(c => c.id === state.currentCharId) || null;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Vues ---
function showView(name) {
  document.getElementById('view-spaces').style.display = name === 'spaces' ? '' : 'none';
  document.getElementById('view-editor').style.display = name === 'editor' ? '' : 'none';
}

// ===== VUE : LISTE DES ESPACES =====

function renderSpaces() {
  const grid = document.getElementById('spaces-grid');
  const empty = document.getElementById('empty-state');
  grid.innerHTML = '';

  if (state.spaces.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  state.spaces.forEach((space, i) => {
    const card = document.createElement('div');
    card.className = 'space-card';
    card.style.animationDelay = `${i * 0.07}s`;

    const count = (space.chars || []).length;
    const meta = count === 0 ? 'Aucun personnage' : count === 1 ? '1 personnage' : `${count} personnages`;

    const coverHtml = space.cover
      ? `<img src="${space.cover}" alt="" />`
      : `<span class="cover-placeholder">${(space.title || '?').charAt(0).toUpperCase()}</span>`;

    card.innerHTML = `
      <div class="space-card-cover">${coverHtml}</div>
      <div class="space-card-body">
        <div class="space-card-title">${escapeHtml(space.title)}</div>
        <div class="space-card-meta">${meta}</div>
      </div>
    `;
    card.addEventListener('click', () => openSpace(space.id));
    grid.appendChild(card);
  });
}

function openSpace(spaceId) {
  state.currentSpaceId = spaceId;
  state.currentCharId = null;
  showView('editor');
  renderEditor();
}

// ===== VUE : ÉDITEUR =====

function renderEditor() {
  const space = getCurrentSpace();
  if (!space) return;

  const coverEl = document.getElementById('editor-cover');
  coverEl.innerHTML = space.cover
    ? `<img src="${space.cover}" alt="" />`
    : `<span class="cover-placeholder">${(space.title || '?').charAt(0).toUpperCase()}</span>`;

  document.getElementById('editor-title').textContent = space.title;

  renderCharsList();

  document.getElementById('no-char-selected').style.display = '';
  document.getElementById('char-editor').style.display = 'none';
}

function renderCharsList() {
  const space = getCurrentSpace();
  const list = document.getElementById('chars-list');
  list.innerHTML = '';
  if (!space) return;

  const query = (document.getElementById('char-search')?.value || '').toLowerCase().trim();

  const sorted = [...(space.chars || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
  );

  const filtered = query
    ? sorted.filter(c => (c.name || '').toLowerCase().includes(query))
    : sorted;

  filtered.forEach(char => {
    const li = document.createElement('li');
    li.className = 'page-item' + (char.id === state.currentCharId ? ' active' : '');
    li.textContent = char.name || 'Sans nom';
    li.addEventListener('click', () => selectChar(char.id));
    list.appendChild(li);
  });
}

function selectChar(charId) {
  state.currentCharId = charId;
  renderCharsList();

  const char = getCurrentChar();
  if (!char) return;

  document.getElementById('no-char-selected').style.display = 'none';
  document.getElementById('char-editor').style.display = 'flex';
  document.getElementById('char-editor').style.flexDirection = 'column';

  document.getElementById('char-name').value = char.name || '';
  document.getElementById('char-age').value = char.age || '';
  document.getElementById('char-role').value = char.role || '';
  document.getElementById('char-physical').value = char.physical || '';
  document.getElementById('char-personality').value = char.personality || '';
  document.getElementById('char-backstory').value = char.backstory || '';
  document.getElementById('char-status').textContent = 'Sauvegardé ✦';

  renderCoverZone();
  renderRelations();
}

// ===== COVER PERSONNAGE =====

function renderCoverZone() {
  const char = getCurrentChar();
  const zone = document.getElementById('char-cover-zone');
  if (!zone) return;

  if (char && char.cover) {
    zone.innerHTML = `<img src="${char.cover}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
    zone.onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.addEventListener('change', handleCharCover);
      inp.click();
    };
  } else {
    zone.innerHTML = `
      <input type="file" id="char-cover-input" accept="image/*" style="display:none;">
      <div class="upload-hint">Clique pour ajouter une image</div>`;
    zone.onclick = () => document.getElementById('char-cover-input').click();
    document.getElementById('char-cover-input').addEventListener('change', handleCharCover);
  }
}

function handleCharCover(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const char = getCurrentChar();
    if (!char) return;
    char.cover = ev.target.result;
    saveState();
    renderCoverZone();
    renderCharsList();
    renderSpaces();
  };
  reader.readAsDataURL(file);
}

// ===== RELATIONS =====

function renderRelations() {
  const char = getCurrentChar();
  if (!char) return;
  const container = document.getElementById('char-relations-list');
  container.innerHTML = '';
  (char.relations || []).forEach((rel, idx) => {
    const tag = document.createElement('div');
    tag.className = 'relation-tag';
    tag.innerHTML = `<span>${escapeHtml(rel)}</span><button>✕</button>`;
    tag.querySelector('button').addEventListener('click', () => {
      char.relations.splice(idx, 1);
      renderRelations();
      scheduleSave();
    });
    container.appendChild(tag);
  });
}

function addRelation() {
  const char = getCurrentChar();
  if (!char) return;
  const input = document.getElementById('char-relation-input');
  const val = input.value.trim();
  if (!val) return;
  if (!char.relations) char.relations = [];
  char.relations.push(val);
  input.value = '';
  renderRelations();
  scheduleSave();
}

// ===== AUTO-SAVE =====

function bindField(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const char = getCurrentChar();
    if (!char) return;
    char[key] = el.value;
    if (key === 'name') renderCharsList();
    scheduleSave();
  });
}

function scheduleSave() {
  const status = document.getElementById('char-status');
  if (status) status.textContent = 'Modification en cours...';
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveState();
    if (status) status.textContent = 'Sauvegardé ✦';
  }, 800);
}

// ===== AJOUTER UN PERSONNAGE =====

function addChar() {
  const space = getCurrentSpace();
  if (!space) return;
  if (!space.chars) space.chars = [];

  if (document.getElementById('new-char-input-row')) return;

  const list = document.getElementById('chars-list');
  const btn = document.getElementById('btn-add-char');

  const row = document.createElement('li');
  row.id = 'new-char-input-row';
  row.style.cssText = 'padding:0; margin-bottom:2px;';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Nom du personnage...';
  input.style.cssText = `
    width: 100%;
    background: var(--card-bg);
    border: 1px solid var(--cyan);
    border-radius: 3px;
    color: var(--white);
    font-family: 'Space Mono', monospace;
    font-size: 0.78rem;
    padding: 5px 8px;
    outline: none;
    box-sizing: border-box;
  `;

  row.appendChild(input);
  list.appendChild(row);
  btn.style.display = 'none';
  input.focus();

  let confirmed = false;

  function confirmAdd() {
    confirmed = true;
    const name = input.value.trim() || 'Sans nom';
    row.remove();
    btn.style.display = '';
    const char = {
      id: uid(), name, age: '', role: '',
      physical: '', personality: '', backstory: '',
      relations: [], cover: null,
    };
    space.chars.push(char);
    saveState();
    renderSpaces();
    renderCharsList();
    selectChar(char.id);
  }

  function cancelAdd() {
    if (confirmed) return;
    row.remove();
    btn.style.display = '';
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmAdd(); }
    if (e.key === 'Escape') cancelAdd();
  });
  input.addEventListener('blur', cancelAdd);
}

// ===== SUPPRIMER =====

function deleteChar() {
  const space = getCurrentSpace();
  if (!space || !state.currentCharId) return;
  if (!confirm('Supprimer ce personnage ?')) return;
  space.chars = space.chars.filter(c => c.id !== state.currentCharId);
  state.currentCharId = null;
  saveState();
  renderSpaces();
  renderCharsList();
  document.getElementById('no-char-selected').style.display = '';
  document.getElementById('char-editor').style.display = 'none';
}

function deleteSpace() {
  if (!confirm('Supprimer cet espace et tous ses personnages ?')) return;
  state.spaces = state.spaces.filter(s => s.id !== state.currentSpaceId);
  state.currentSpaceId = null;
  state.currentCharId = null;
  saveState();
  showView('spaces');
  renderSpaces();
}

// ===== MODAL ESPACE =====

function openModal() {
  pendingCoverDataUrl = null;
  document.getElementById('space-title-input').value = '';
  document.getElementById('image-preview').className = 'image-preview-empty';
  document.getElementById('image-preview').innerHTML = '<span>Clique pour choisir une image</span>';
  document.getElementById('modal-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('space-title-input').focus(), 50);
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function confirmCreateSpace() {
  const title = document.getElementById('space-title-input').value.trim();
  if (!title) {
    document.getElementById('space-title-input').focus();
    document.getElementById('space-title-input').style.borderColor = 'var(--danger)';
    return;
  }
  document.getElementById('space-title-input').style.borderColor = '';

  const space = {
    id: uid(),
    title,
    cover: pendingCoverDataUrl || null,
    chars: [],
  };

  state.spaces.push(space);
  saveState();
  closeModal();
  renderSpaces();
  openSpace(space.id);
}

function onImageSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingCoverDataUrl = ev.target.result;
    const preview = document.getElementById('image-preview');
    preview.className = '';
    preview.innerHTML = `<img src="${pendingCoverDataUrl}" class="image-preview-loaded" alt="" />`;
  };
  reader.readAsDataURL(file);
}

// ===== INIT =====

function init() {
  loadState();
  showView('spaces');
  renderSpaces();

  // Espaces
  document.getElementById('btn-new-space').addEventListener('click', openModal);
  document.getElementById('btn-new-space-empty').addEventListener('click', openModal);

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmCreateSpace);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.getElementById('image-upload-zone').addEventListener('click', () => {
    document.getElementById('space-image-input').click();
  });
  document.getElementById('space-image-input').addEventListener('change', onImageSelected);
  document.getElementById('space-title-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmCreateSpace();
  });

  // Éditeur
  document.getElementById('btn-back').addEventListener('click', () => {
    showView('spaces');
    renderSpaces();
  });
  document.getElementById('char-search').addEventListener('input', renderCharsList);
  document.getElementById('btn-add-char').addEventListener('click', addChar);
  document.getElementById('btn-delete-char').addEventListener('click', deleteChar);
  document.getElementById('btn-delete-space').addEventListener('click', deleteSpace);
  document.getElementById('btn-add-relation').addEventListener('click', addRelation);
  document.getElementById('char-relation-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addRelation(); }
  });

  bindField('char-name', 'name');
  bindField('char-age', 'age');
  bindField('char-role', 'role');
  bindField('char-physical', 'physical');
  bindField('char-personality', 'personality');
  bindField('char-backstory', 'backstory');
}

document.addEventListener('DOMContentLoaded', init);