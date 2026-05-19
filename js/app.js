// Vérification session
if (!localStorage.getItem("orgabook_session")) { window.location.href = "/Orgabooks/html/login.html"; }


// --- Clé de stockage par utilisateur ---
function getUsername() {
  try {
    const s = JSON.parse(localStorage.getItem('orgabook_session'));
    return s && s.username ? s.username.toLowerCase() : 'default';
  } catch { return 'default'; }
}
function storageKey() { return 'orgabook_data' + '_' + getUsername(); }

// ===== ORGABOOK APP =====
// Gestion des espaces et pages avec localStorage


// --- État global ---
let state = {
  spaces: [],         // [{ id, title, cover, pages: [{ id, title, content }] }]
  currentSpaceId: null,
  currentPageId: null,
};

let saveTimeout = null;

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
    try { state.spaces = JSON.parse(raw); } catch { state.spaces = []; }
  }
}

function getCurrentSpace() {
  return state.spaces.find(s => s.id === state.currentSpaceId) || null;
}

function getCurrentPage() {
  const space = getCurrentSpace();
  if (!space) return null;
  return space.pages.find(p => p.id === state.currentPageId) || null;
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

    const pagesCount = space.pages.length;
    const pagesLabel = pagesCount === 0 ? 'Aucune page' : pagesCount === 1 ? '1 page' : `${pagesCount} pages`;

    let coverHtml = '';
    if (space.cover) {
      coverHtml = `<img src="${space.cover}" alt="Couverture" />`;
    } else {
      const initial = space.title.charAt(0).toUpperCase();
      coverHtml = `<span class="cover-placeholder">${initial}</span>`;
    }

    card.innerHTML = `
      <div class="space-card-cover">${coverHtml}</div>
      <div class="space-card-body">
        <div class="space-card-title">${escapeHtml(space.title)}</div>
        <div class="space-card-meta">${pagesLabel}</div>
      </div>
    `;

    card.addEventListener('click', () => openSpace(space.id));
    grid.appendChild(card);
  });
}

function openSpace(spaceId) {
  state.currentSpaceId = spaceId;
  state.currentPageId = null;
  showView('editor');
  renderEditor();
}

// ===== VUE : ÉDITEUR =====

function renderEditor() {
  const space = getCurrentSpace();
  if (!space) return;

  // Cover
  const coverEl = document.getElementById('editor-cover');
  if (space.cover) {
    coverEl.innerHTML = `<img src="${space.cover}" alt="" />`;
  } else {
    const initial = space.title.charAt(0).toUpperCase();
    coverEl.innerHTML = `<span class="cover-placeholder">${initial}</span>`;
  }

  // Title
  document.getElementById('editor-title').textContent = space.title;

  // Pages list
  renderPagesList();

  // Reset zone d'écriture
  if (!state.currentPageId) {
    document.getElementById('no-page-selected').style.display = '';
    document.getElementById('page-editor').style.display = 'none';
  }
}

function renderPagesList() {
  const space = getCurrentSpace();
  const list = document.getElementById('pages-list');
  list.innerHTML = '';

  if (!space) return;

  space.pages.forEach(page => {
    const li = document.createElement('li');
    li.className = 'page-item' + (page.id === state.currentPageId ? ' active' : '');
    li.textContent = page.title || 'Sans titre';
    li.addEventListener('click', () => selectPage(page.id));
    list.appendChild(li);
  });
}

function selectPage(pageId) {
  state.currentPageId = pageId;
  renderPagesList();

  const page = getCurrentPage();
  if (!page) return;

  document.getElementById('no-page-selected').style.display = 'none';
  document.getElementById('page-editor').style.display = 'flex';

  document.getElementById('page-title-input').value = page.title || '';
  document.getElementById('page-content').value = page.content || '';
  document.getElementById('editor-status').textContent = 'Sauvegardé ✦';
  updateLineNumbers();

  // Synchroniser le scroll entre textarea et numéros de ligne
  const textarea = document.getElementById('page-content');
  const lineNumbers = document.getElementById('line-numbers');
  textarea.onscroll = () => { lineNumbers.scrollTop = textarea.scrollTop; };
}

function addPage() {
  const space = getCurrentSpace();
  if (!space) return;

  // Si un champ est déjà ouvert, on l'ignore
  if (document.getElementById('new-page-input-row')) return;

  const list = document.getElementById('pages-list');
  const btn = document.getElementById('btn-add-page');

  // Créer la ligne de saisie inline
  const row = document.createElement('li');
  row.id = 'new-page-input-row';
  row.style.cssText = 'padding:0; margin-bottom:2px;';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Nom de la page...';
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

  function confirmNewPage() {
    confirmed = true;
    const title = input.value.trim() || 'Sans titre';
    row.remove();
    btn.style.display = '';
    const page = { id: uid(), title, content: '' };
    space.pages.push(page);
    saveState();
    renderPagesList();
    selectPage(page.id);
  }

  function cancelNewPage() {
    if (confirmed) return;
    row.remove();
    btn.style.display = '';
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmNewPage(); }
    if (e.key === 'Escape') cancelNewPage();
  });

  input.addEventListener('blur', cancelNewPage);
}

function deleteCurrentPage() {
  const space = getCurrentSpace();
  if (!space || !state.currentPageId) return;

  if (!confirm('Supprimer cette page ?')) return;

  space.pages = space.pages.filter(p => p.id !== state.currentPageId);
  state.currentPageId = null;
  saveState();
  renderPagesList();

  document.getElementById('no-page-selected').style.display = '';
  document.getElementById('page-editor').style.display = 'none';
}

function deleteCurrentSpace() {
  if (!confirm('Supprimer cet espace et toutes ses pages ?')) return;

  state.spaces = state.spaces.filter(s => s.id !== state.currentSpaceId);
  state.currentSpaceId = null;
  state.currentPageId = null;
  saveState();
  showView('spaces');
  renderSpaces();
}

// Auto-save sur frappe
function onPageTitleChange(e) {
  const page = getCurrentPage();
  if (!page) return;
  page.title = e.target.value;
  renderPagesList();
  scheduleSave();
}

function updateLineNumbers() {
  const textarea = document.getElementById('page-content');
  const lineNumbers = document.getElementById('line-numbers');
  if (!textarea || !lineNumbers) return;

  const lines = textarea.value.split('\n').length;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) =>
    `<span>${i + 1}</span>`
  ).join('');

  // Synchroniser le scroll
  lineNumbers.scrollTop = textarea.scrollTop;
}

function onPageContentChange(e) {
  const page = getCurrentPage();
  if (!page) return;
  page.content = e.target.value;
  updateLineNumbers();
  scheduleSave();
}

function scheduleSave() {
  document.getElementById('editor-status').textContent = 'Modification en cours...';
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveState();
    document.getElementById('editor-status').textContent = 'Sauvegardé ✦';
  }, 800);
}

// ===== MODAL : CRÉER UN ESPACE =====

let pendingCoverDataUrl = null;

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
    pages: [],
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
    preview.innerHTML = `<img src="${pendingCoverDataUrl}" class="image-preview-loaded" alt="Aperçu" />`;
  };
  reader.readAsDataURL(file);
}

// ===== UTILITAIRES =====
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== INITIALISATION =====
function init() {
  loadState();
  showView('spaces');
  renderSpaces();

  // Boutons espaces
  document.getElementById('btn-new-space').addEventListener('click', openModal);
  document.getElementById('btn-new-space-empty').addEventListener('click', openModal);

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmCreateSpace);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Image upload
  document.getElementById('image-upload-zone').addEventListener('click', () => {
    document.getElementById('space-image-input').click();
  });
  document.getElementById('space-image-input').addEventListener('change', onImageSelected);

  // Éditeur
  document.getElementById('btn-back').addEventListener('click', () => {
    showView('spaces');
    renderSpaces();
  });
  document.getElementById('btn-add-page').addEventListener('click', addPage);
  document.getElementById('btn-delete-page').addEventListener('click', deleteCurrentPage);
  document.getElementById('btn-delete-space').addEventListener('click', deleteCurrentSpace);
  document.getElementById('page-title-input').addEventListener('input', onPageTitleChange);
  document.getElementById('page-content').addEventListener('input', onPageContentChange);

  // Raccourci clavier : Enter dans le champ titre du modal
  document.getElementById('space-title-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmCreateSpace();
  });
}

document.addEventListener('DOMContentLoaded', init);