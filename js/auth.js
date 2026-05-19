// ===== ORGABOOK — AUTH PARTAGÉ =====
// Salutation + bouton déconnexion sur toutes les pages (sauf login)

(function () {
  const SESSION_KEY = 'orgabook_session';

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }

  const session = getSession();

  // Salutation dans la nav (index uniquement)
  const greeting = document.getElementById('nav-greeting');
  if (greeting && session) {
    greeting.textContent = 'Bonjour, ' + session.username + ' ✦';
  }

  // Bouton "Se connecter" : masqué si déjà connecté
  const btnConnect = document.getElementById('btn-connect');
  if (btnConnect) {
    btnConnect.style.display = session ? 'none' : '';
  }

  // Bouton "Se déconnecter" : masqué si pas connecté
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    if (!session) {
      btnLogout.style.display = 'none';
    } else {
      btnLogout.style.display = '';
    }
  }

  // Bouton déconnexion
  const btn = document.getElementById('btn-logout');
  if (btn) {
    btn.addEventListener('click', () => {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = '/Orgabooks/html/login.html';
    });
  }
})();