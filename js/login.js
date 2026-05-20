// ===== STORYHUB — AUTH =====
// Gestion connexion / inscription / mot de passe oublié via localStorage

const USERS_KEY = 'storyhub_users';
const SESSION_KEY = 'storyhub_session';

// --- Utilitaires ---

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
  catch { return {}; }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function hashPassword(password) {
  // Hash simple (non cryptographique) pour le stockage local
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) - hash) + password.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

function setSession(username) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, loginAt: Date.now() }));
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Si déjà connecté, rediriger vers l'app
if (getSession()) {
  window.location.href = 'app.html';
}

// --- Navigation entre formulaires ---

function showForm(id) {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  const form = document.getElementById(id);
  if (form) { form.classList.add('active'); clearErrors(); }
}

function clearErrors() {
  document.querySelectorAll('.auth-error, .auth-success').forEach(el => el.textContent = '');
  document.querySelectorAll('.field-input').forEach(el => el.classList.remove('error'));
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// --- Toggle mot de passe ---

document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    const isHidden = target.type === 'password';
    target.type = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '●' : '◎';
  });
});

// --- Force du mot de passe ---

const regPassword = document.getElementById('reg-password');
if (regPassword) {
  regPassword.addEventListener('input', () => {
    const val = regPassword.value;
    const fill = document.getElementById('strength-fill');
    const label = document.getElementById('strength-label');
    if (!fill || !label) return;

    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;

    const levels = [
      { pct: '0%',   color: 'transparent', text: '' },
      { pct: '25%',  color: '#ff4d6d',     text: 'Faible' },
      { pct: '50%',  color: '#ffaa00',     text: 'Moyen' },
      { pct: '75%',  color: '#00e5a0',     text: 'Bon' },
      { pct: '100%', color: '#00e5ff',     text: 'Fort' },
    ];

    const lvl = val.length === 0 ? levels[0] : score <= 1 ? levels[1] : score <= 2 ? levels[2] : score <= 3 ? levels[3] : levels[4];
    fill.style.width = lvl.pct;
    fill.style.background = lvl.color;
    label.textContent = lvl.text;
  });
}

// ===== CONNEXION =====

document.getElementById('btn-login').addEventListener('click', login);
document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

function login() {
  clearErrors();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username) {
    document.getElementById('login-username').classList.add('error');
    showError('login-error', 'Saisis ton nom d\'utilisateur.');
    return;
  }
  if (!password) {
    document.getElementById('login-password').classList.add('error');
    showError('login-error', 'Saisis ton mot de passe.');
    return;
  }

  const users = getUsers();
  const user = users[username.toLowerCase()];

  if (!user) {
    showError('login-error', 'Aucun compte trouvé avec ce nom d\'utilisateur.');
    document.getElementById('login-username').classList.add('error');
    return;
  }

  if (user.password !== hashPassword(password)) {
    showError('login-error', 'Mot de passe incorrect.');
    document.getElementById('login-password').classList.add('error');
    return;
  }

  setSession(username);
  window.location.href = 'index.html';
}

// ===== INSCRIPTION =====

document.getElementById('btn-register').addEventListener('click', register);
document.getElementById('reg-password2').addEventListener('keydown', e => {
  if (e.key === 'Enter') register();
});

function register() {
  clearErrors();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;

  if (!username) {
    document.getElementById('reg-username').classList.add('error');
    showError('register-error', 'Choisis un nom d\'utilisateur.');
    return;
  }
  if (username.length < 3) {
    document.getElementById('reg-username').classList.add('error');
    showError('register-error', 'Le nom d\'utilisateur doit faire au moins 3 caractères.');
    return;
  }
  if (!password) {
    document.getElementById('reg-password').classList.add('error');
    showError('register-error', 'Crée un mot de passe.');
    return;
  }
  if (password.length < 6) {
    document.getElementById('reg-password').classList.add('error');
    showError('register-error', 'Le mot de passe doit faire au moins 6 caractères.');
    return;
  }
  if (password !== password2) {
    document.getElementById('reg-password2').classList.add('error');
    showError('register-error', 'Les mots de passe ne correspondent pas.');
    return;
  }

  const users = getUsers();
  if (users[username.toLowerCase()]) {
    document.getElementById('reg-username').classList.add('error');
    showError('register-error', 'Ce nom d\'utilisateur est déjà pris.');
    return;
  }

  users[username.toLowerCase()] = {
    username,
    password: hashPassword(password),
    createdAt: Date.now(),
  };
  saveUsers(users);

  showSuccess('register-success', 'Compte créé ! Connexion en cours...');
  setTimeout(() => {
    setSession(username);
    window.location.href = 'index.html';
  }, 1000);
}

// ===== MOT DE PASSE OUBLIÉ =====

let forgotVerified = false;

document.getElementById('btn-forgot').addEventListener('click', handleForgot);

function handleForgot() {
  clearErrors();

  if (!forgotVerified) {
    // Étape 1 : vérifier que le compte existe
    const username = document.getElementById('forgot-username').value.trim();
    if (!username) {
      document.getElementById('forgot-username').classList.add('error');
      showError('forgot-error', 'Saisis ton nom d\'utilisateur.');
      return;
    }

    const users = getUsers();
    if (!users[username.toLowerCase()]) {
      document.getElementById('forgot-username').classList.add('error');
      showError('forgot-error', 'Aucun compte trouvé avec ce nom d\'utilisateur.');
      return;
    }

    // Compte trouvé → afficher les champs de réinitialisation
    forgotVerified = true;
    document.getElementById('forgot-step2').style.display = '';
    document.getElementById('btn-forgot').textContent = 'Réinitialiser le mot de passe';
    document.getElementById('forgot-username').disabled = true;
    showSuccess('forgot-success', 'Compte trouvé. Choisis un nouveau mot de passe.');

  } else {
    // Étape 2 : réinitialiser
    const username = document.getElementById('forgot-username').value.trim();
    const password = document.getElementById('forgot-password').value;
    const password2 = document.getElementById('forgot-password2').value;

    if (!password) {
      document.getElementById('forgot-password').classList.add('error');
      showError('forgot-error', 'Saisis un nouveau mot de passe.');
      return;
    }
    if (password.length < 6) {
      document.getElementById('forgot-password').classList.add('error');
      showError('forgot-error', 'Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (password !== password2) {
      document.getElementById('forgot-password2').classList.add('error');
      showError('forgot-error', 'Les mots de passe ne correspondent pas.');
      return;
    }

    const users = getUsers();
    users[username.toLowerCase()].password = hashPassword(password);
    saveUsers(users);

    document.getElementById('forgot-success').textContent = 'Mot de passe mis à jour ! Redirection...';
    setTimeout(() => showForm('form-login'), 1500);
  }
}

// --- Navigation ---
document.getElementById('go-register').addEventListener('click', () => showForm('form-register'));
document.getElementById('go-forgot').addEventListener('click', () => {
  forgotVerified = false;
  document.getElementById('forgot-step2').style.display = 'none';
  document.getElementById('btn-forgot').textContent = 'Vérifier le compte';
  showForm('form-forgot');
});
document.getElementById('go-login-from-register').addEventListener('click', () => showForm('form-login'));
document.getElementById('go-login-from-forgot').addEventListener('click', () => showForm('form-login'));