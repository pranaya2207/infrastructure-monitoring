// ==========================================================================
// National Infrastructure Monitoring & Project Risk Intelligence System (NIM-PRIS)
// Government Security & Authentication Gateway (RBAC)
// ==========================================================================

const AuthModule = {
  // Pre-configured authorized government credentials registry
  ACCOUNTS: {
    'admin.pmo@nic.in': {
      password: 'Admin@2026',
      name: 'Dr. Rajesh Verma, IAS',
      designation: 'Cabinet Secretary / PMO Nodal Administrator',
      ministry: 'Cabinet Secretariat & PMO',
      clearance: 'Level-3 (Cabinet Confidential)',
      role: 'ADMIN'
    },
    'js.morth@gov.in': {
      password: 'Infra@2026',
      name: 'Amit Singhal, IRSE',
      designation: 'Joint Secretary (Highways & Corridors)',
      ministry: 'Ministry of Road Transport & Highways',
      clearance: 'Level-2 (Secret)',
      role: 'OFFICER'
    },
    'director.infra@gov.in': {
      password: 'Rail@2026',
      name: 'Priya Nambiar, IRTS',
      designation: 'Director (EVM & Mega-Projects)',
      ministry: 'Ministry of Railways & DFCCIL',
      clearance: 'Level-2 (Secret)',
      role: 'OFFICER'
    }
  },

  AUTH_STORAGE_KEY: 'nim_pris_auth_session',

  init() {
    this.setupLoginForm();
    this.checkSession();
  },

  checkSession() {
    const sessionStr = sessionStorage.getItem(this.AUTH_STORAGE_KEY) || localStorage.getItem(this.AUTH_STORAGE_KEY);
    const loginOverlay = document.getElementById('loginGatewayOverlay');
    const appContainer = document.getElementById('mainAppContainer');

    if (sessionStr) {
      try {
        const user = JSON.parse(sessionStr);
        this.renderUserProfile(user);
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (typeof refreshCharts === 'function') {
          setTimeout(() => refreshCharts(), 150);
        }
        return true;
      } catch (e) {
        this.logout();
      }
    }

    // Not authenticated: hide app, show login gateway
    if (appContainer) appContainer.style.display = 'none';
    if (loginOverlay) loginOverlay.style.display = 'flex';
    return false;
  },

  login(email, password, remember = false) {
    const cleanEmail = email.trim().toLowerCase();
    const account = this.ACCOUNTS[cleanEmail];

    const errorBox = document.getElementById('loginErrorMessage');

    if (account && account.password === password) {
      if (errorBox) errorBox.style.display = 'none';

      const sessionData = {
        email: cleanEmail,
        name: account.name,
        designation: account.designation,
        ministry: account.ministry,
        clearance: account.clearance,
        role: account.role,
        loginTime: new Date().toISOString()
      };

      if (remember) {
        localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      } else {
        sessionStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      }

      this.checkSession();
      return true;
    }

    if (errorBox) {
      errorBox.innerText = 'Authentication Failed: Invalid Government ID or Security Password.';
      errorBox.style.display = 'block';
    }
    return false;
  },

  quickDemoLogin(roleKey) {
    let email = 'admin.pmo@nic.in';
    let pass = 'Admin@2026';

    if (roleKey === 'morth') {
      email = 'js.morth@gov.in';
      pass = 'Infra@2026';
    } else if (roleKey === 'railways') {
      email = 'director.infra@gov.in';
      pass = 'Rail@2026';
    }

    document.getElementById('govLoginEmail').value = email;
    document.getElementById('govLoginPassword').value = pass;
    this.login(email, pass, true);
  },

  logout() {
    sessionStorage.removeItem(this.AUTH_STORAGE_KEY);
    localStorage.removeItem(this.AUTH_STORAGE_KEY);

    const appContainer = document.getElementById('mainAppContainer');
    const loginOverlay = document.getElementById('loginGatewayOverlay');
    const errorBox = document.getElementById('loginErrorMessage');

    if (errorBox) errorBox.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    if (loginOverlay) loginOverlay.style.display = 'flex';
  },

  renderUserProfile(user) {
    const profileContainer = document.getElementById('userProfileSection');
    if (!profileContainer) return;

    profileContainer.innerHTML = `
      <div class="user-badge-wrapper">
        <div class="user-avatar-icon"><i class="fa-solid fa-user-shield"></i></div>
        <div class="user-meta-text">
          <span class="user-name-title">${user.name}</span>
          <span class="user-clearance-badge">${user.clearance}</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-xs text-danger" onclick="AuthModule.logout()" title="Secure Session Termination">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    `;
  },

  setupLoginForm() {
    const form = document.getElementById('govLoginForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('govLoginEmail').value;
      const pass = document.getElementById('govLoginPassword').value;
      const remember = document.getElementById('govRememberMe')?.checked || false;
      this.login(email, pass, remember);
    });
  }
};

// Initialize authentication on DOM load
document.addEventListener('DOMContentLoaded', () => {
  AuthModule.init();
});
