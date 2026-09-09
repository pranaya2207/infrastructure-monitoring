// ==========================================================================
// National Infrastructure Monitoring & Project Risk Intelligence System (NIM-PRIS)
// Dual-Tier Security & Authentication Gateway (Public Citizen vs Official RBAC)
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
  CUSTOM_ACCOUNTS_KEY: 'nim_pris_custom_accounts',
  currentUserType: 'public', // 'public' | 'official'

  init() {
    this.setupPublicForm();
    this.setupLoginForm();
    this.setupRegisterForm();
    this.checkSession();
  },

  // Toggle between Public Citizen and Government Official views
  switchUserType(type) {
    this.currentUserType = type;
    const publicBtn = document.getElementById('typePublicBtn');
    const officialBtn = document.getElementById('typeOfficialBtn');
    const publicContainer = document.getElementById('publicAuthContainer');
    const officialContainer = document.getElementById('officialAuthContainer');

    // Reset error messages
    const errs = document.querySelectorAll('.login-error-alert, .login-success-alert');
    errs.forEach(el => el.style.display = 'none');

    if (type === 'official') {
      if (publicBtn) publicBtn.classList.remove('active');
      if (officialBtn) officialBtn.classList.add('active');
      if (publicContainer) publicContainer.style.display = 'none';
      if (officialContainer) {
        officialContainer.style.display = 'block';
        officialContainer.style.animation = 'fadeIn 0.25s ease';
      }
      this.switchTab('login');
    } else {
      if (officialBtn) officialBtn.classList.remove('active');
      if (publicBtn) publicBtn.classList.add('active');
      if (officialContainer) officialContainer.style.display = 'none';
      if (publicContainer) {
        publicContainer.style.display = 'block';
        publicContainer.style.animation = 'fadeIn 0.25s ease';
      }
    }
  },

  // Switch between Official Sign In and Official Create Account tabs
  switchTab(tab) {
    const loginTabBtn = document.getElementById('tabSignInBtn');
    const regTabBtn = document.getElementById('tabRegisterBtn');
    const loginContainer = document.getElementById('govLoginFormContainer');
    const regContainer = document.getElementById('govRegisterFormContainer');

    const loginErr = document.getElementById('loginErrorMessage');
    const regErr = document.getElementById('registerErrorMessage');
    const regSuccess = document.getElementById('registerSuccessMessage');

    if (loginErr) loginErr.style.display = 'none';
    if (regErr) regErr.style.display = 'none';
    if (regSuccess) regSuccess.style.display = 'none';

    if (tab === 'register') {
      if (loginTabBtn) loginTabBtn.classList.remove('active');
      if (regTabBtn) regTabBtn.classList.add('active');
      if (loginContainer) loginContainer.style.display = 'none';
      if (regContainer) {
        regContainer.style.display = 'block';
        regContainer.style.animation = 'fadeIn 0.25s ease';
      }
    } else {
      if (regTabBtn) regTabBtn.classList.remove('active');
      if (loginTabBtn) loginTabBtn.classList.add('active');
      if (regContainer) regContainer.style.display = 'none';
      if (loginContainer) {
        loginContainer.style.display = 'block';
        loginContainer.style.animation = 'fadeIn 0.25s ease';
      }
    }
  },

  // Toggle password field visibility (eye icon)
  togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  },

  // Password strength meter calculation
  checkPasswordStrength(val) {
    const bar = document.getElementById('passwordStrengthBar');
    const txt = document.getElementById('passwordStrengthText');
    if (!bar || !txt) return;

    if (!val) {
      bar.style.width = '0%';
      bar.style.backgroundColor = 'transparent';
      txt.innerText = 'Password Strength';
      txt.style.color = 'var(--text-muted)';
      return;
    }

    let score = 0;
    if (val.length >= 6) score += 25;
    if (val.length >= 10) score += 25;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 25;
    if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) score += 25;

    bar.style.width = `${score}%`;

    if (score <= 25) {
      bar.style.backgroundColor = '#ef4444';
      txt.innerText = 'Weak (Use 6+ chars, mix letters & numbers)';
      txt.style.color = '#f87171';
    } else if (score <= 50) {
      bar.style.backgroundColor = '#f59e0b';
      txt.innerText = 'Fair (Add uppercase letters or symbols)';
      txt.style.color = '#fbbf24';
    } else if (score <= 75) {
      bar.style.backgroundColor = '#3b82f6';
      txt.innerText = 'Good (Strong government credential)';
      txt.style.color = '#60a5fa';
    } else {
      bar.style.backgroundColor = '#10b981';
      txt.innerText = 'Very Secure (Meets high-security standards)';
      txt.style.color = '#34d399';
    }
  },

  // Retrieve locally saved custom accounts
  getCustomAccounts() {
    try {
      const data = localStorage.getItem(this.CUSTOM_ACCOUNTS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  // Save custom account locally for offline & PWA execution
  saveCustomAccount(account) {
    try {
      const accounts = this.getCustomAccounts();
      accounts[account.email.toLowerCase()] = account;
      localStorage.setItem(this.CUSTOM_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Could not persist account locally:', e);
    }
  },

  // Check whether active user is a verified Government Official
  isOfficial() {
    const sessionStr = sessionStorage.getItem(this.AUTH_STORAGE_KEY) || localStorage.getItem(this.AUTH_STORAGE_KEY);
    if (!sessionStr) return false;
    try {
      const user = JSON.parse(sessionStr);
      return user.role === 'OFFICER' || user.role === 'ADMIN';
    } catch (e) {
      return false;
    }
  },

  checkSession() {
    const sessionStr = sessionStorage.getItem(this.AUTH_STORAGE_KEY) || localStorage.getItem(this.AUTH_STORAGE_KEY);
    const loginOverlay = document.getElementById('loginGatewayOverlay');
    const appContainer = document.getElementById('mainAppContainer');

    if (sessionStr) {
      try {
        const user = JSON.parse(sessionStr);
        this.renderUserProfile(user);
        this.applyRolePermissions(user);

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

  // Apply visual & action restrictions based on role (Public Citizen vs Official)
  applyRolePermissions(user) {
    const isOfficialUser = user.role === 'OFFICER' || user.role === 'ADMIN';
    const readOnlyBanner = document.getElementById('citizenReadOnlyBanner');
    const sanctionBtns = document.querySelectorAll('.official-only-action');

    if (isOfficialUser) {
      // Show official actions
      sanctionBtns.forEach(btn => btn.style.display = '');
      if (readOnlyBanner) readOnlyBanner.style.display = 'none';
    } else {
      // Hide official actions for Public Citizens
      sanctionBtns.forEach(btn => btn.style.display = 'none');
      if (readOnlyBanner) readOnlyBanner.style.display = 'flex';
    }

    // Refresh projects table if loaded
    if (typeof renderProjectsTable === 'function' && typeof activeGovProjects !== 'undefined') {
      renderProjectsTable(activeGovProjects);
    }
  },

  // Public Citizen Login (Name & Email only, no password needed)
  async publicLogin(name, email, remember = false) {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const errorBox = document.getElementById('publicErrorMessage');
    const submitBtn = document.getElementById('publicSubmitBtn');

    if (errorBox) errorBox.style.display = 'none';

    if (!cleanName || !cleanEmail) {
      if (errorBox) {
        errorBox.innerText = 'Please provide both your Name and Email Address to enter the Public Portal.';
        errorBox.style.display = 'block';
      }
      return false;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      if (errorBox) {
        errorBox.innerText = 'Please provide a valid email address.';
        errorBox.style.display = 'block';
      }
      return false;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entering Citizen Portal...';
    }

    const publicUser = {
      id: `citizen_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      designation: 'Citizen Observer',
      ministry: 'Citizen Public Transparency Portal',
      clearance: 'Public Citizen (View Only)',
      role: 'PUBLIC',
      loginTime: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/auth/public-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          Object.assign(publicUser, data.user);
        }
      }
    } catch (e) {
      // Offline fallback works seamlessly
    }

    setTimeout(() => {
      this.setSession(publicUser, remember);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Enter Citizen Portal (View Progress)';
      }
    }, 400);

    return true;
  },

  // Quick 1-Click Citizen Demo Login
  quickCitizenLogin() {
    const name = 'Aarav Sharma';
    const email = 'aarav.sharma@gmail.com';
    const nameInput = document.getElementById('publicLoginName');
    const emailInput = document.getElementById('publicLoginEmail');
    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = email;
    this.publicLogin(name, email, true);
  },

  // Official Login with Name, Official Email, and Security Password
  async login(name, email, password, remember = false) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const errorBox = document.getElementById('loginErrorMessage');
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (errorBox) errorBox.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying Credentials...';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password: password })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const sessionData = {
            ...data.user,
            name: cleanName || data.user.name
          };
          this.setSession(sessionData, remember);
          return true;
        }
      } else if (res.status === 401 || res.status === 400) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Authentication Failed: Invalid Email or Security Password.');
      }
    } catch (err) {
      if (err.message && err.message.includes('Authentication Failed')) {
        if (errorBox) {
          errorBox.innerText = err.message;
          errorBox.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Authenticate & Enter System';
        }
        return false;
      }

      // Offline / Static fallback check
      const customAccounts = this.getCustomAccounts();
      const localAccount = customAccounts[cleanEmail] || this.ACCOUNTS[cleanEmail];

      if (localAccount && localAccount.password === password) {
        const sessionData = {
          email: cleanEmail,
          name: cleanName || localAccount.name,
          designation: localAccount.designation || 'Authorized Officer',
          ministry: localAccount.ministry || 'National Infrastructure',
          clearance: localAccount.clearance || 'Level-2 (Authorized)',
          role: localAccount.role || 'OFFICER',
          loginTime: new Date().toISOString()
        };
        this.setSession(sessionData, remember);
        return true;
      }

      if (errorBox) {
        errorBox.innerText = 'Authentication Failed: Invalid Email or Security Password.';
        errorBox.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Authenticate & Enter System';
      }
      return false;
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Authenticate & Enter System';
    }
  },

  // Register a new Government Official Account
  async register(formData) {
    const { name, email, ministry, designation, clearanceVal, password, confirmPassword } = formData;
    const errorBox = document.getElementById('registerErrorMessage');
    const successBox = document.getElementById('registerSuccessMessage');
    const submitBtn = document.getElementById('regSubmitBtn');

    if (errorBox) errorBox.style.display = 'none';
    if (successBox) successBox.style.display = 'none';

    if (!name || !email || !password) {
      if (errorBox) {
        errorBox.innerText = 'Please complete all required fields: Name, Official Email, and Password.';
        errorBox.style.display = 'block';
      }
      return false;
    }

    if (password !== confirmPassword) {
      if (errorBox) {
        errorBox.innerText = 'Passwords do not match. Please verify both password entries.';
        errorBox.style.display = 'block';
      }
      return false;
    }

    if (password.length < 6) {
      if (errorBox) {
        errorBox.innerText = 'Security password must be at least 6 characters long.';
        errorBox.style.display = 'block';
      }
      return false;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Official Account...';
    }

    let clearance = 'Level-2: Authorized Officer / Project Director';
    let role = 'OFFICER';
    if (clearanceVal && clearanceVal.includes('|')) {
      const parts = clearanceVal.split('|');
      clearance = parts[0];
      role = parts[1];
    }

    const newAccountData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      ministry: (ministry || 'National Infrastructure').trim(),
      designation: (designation || 'Project Officer').trim(),
      clearance: clearance,
      role: role,
      password: password
    };

    let registeredUser = null;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccountData.name,
          email: newAccountData.email,
          password: newAccountData.password,
          ministry: newAccountData.ministry,
          designation: newAccountData.designation,
          clearance: newAccountData.clearance,
          role: newAccountData.role
        })
      });

      if (res.ok) {
        const data = await res.json();
        registeredUser = data.user;
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error && data.error.includes('already exists')) {
          throw new Error(data.error);
        }
      }
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        if (errorBox) {
          errorBox.innerText = err.message;
          errorBox.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Register Account & Enter Portal';
        }
        return false;
      }
    }

    this.saveCustomAccount(newAccountData);

    const activeUser = registeredUser || {
      id: Date.now(),
      name: newAccountData.name,
      email: newAccountData.email,
      ministry: newAccountData.ministry,
      designation: newAccountData.designation,
      clearance: newAccountData.clearance,
      role: newAccountData.role,
      loginTime: new Date().toISOString()
    };

    if (successBox) {
      successBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> Official account created for <strong>${activeUser.name}</strong>! Access granted.`;
      successBox.style.display = 'block';
    }

    setTimeout(() => {
      this.setSession(activeUser, true);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Register Account & Enter Portal';
      }
    }, 750);

    return true;
  },

  setSession(user, remember = false) {
    const sessionData = JSON.stringify({
      ...user,
      loginTime: user.loginTime || new Date().toISOString()
    });

    if (remember) {
      localStorage.setItem(this.AUTH_STORAGE_KEY, sessionData);
    } else {
      sessionStorage.setItem(this.AUTH_STORAGE_KEY, sessionData);
    }

    this.checkSession();
  },

  quickDemoLogin(roleKey) {
    let name = 'Dr. Rajesh Verma, IAS';
    let email = 'admin.pmo@nic.in';
    let pass = 'Admin@2026';

    if (roleKey === 'morth') {
      name = 'Amit Singhal, IRSE';
      email = 'js.morth@gov.in';
      pass = 'Infra@2026';
    } else if (roleKey === 'railways') {
      name = 'Priya Nambiar, IRTS';
      email = 'director.infra@gov.in';
      pass = 'Rail@2026';
    }

    this.switchUserType('official');
    this.switchTab('login');

    const nameInput = document.getElementById('govLoginName');
    const emailInput = document.getElementById('govLoginEmail');
    const passInput = document.getElementById('govLoginPassword');

    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = email;
    if (passInput) passInput.value = pass;

    this.login(name, email, pass, true);
  },

  // Switch to Official Login directly from Public Citizen mode
  promptSwitchToOfficial() {
    this.logout();
    this.switchUserType('official');
  },

  logout() {
    sessionStorage.removeItem(this.AUTH_STORAGE_KEY);
    localStorage.removeItem(this.AUTH_STORAGE_KEY);

    const appContainer = document.getElementById('mainAppContainer');
    const loginOverlay = document.getElementById('loginGatewayOverlay');
    const errorBox = document.getElementById('loginErrorMessage');
    const regError = document.getElementById('registerErrorMessage');
    const regSuccess = document.getElementById('registerSuccessMessage');
    const publicError = document.getElementById('publicErrorMessage');

    if (errorBox) errorBox.style.display = 'none';
    if (regError) regError.style.display = 'none';
    if (regSuccess) regSuccess.style.display = 'none';
    if (publicError) publicError.style.display = 'none';

    if (appContainer) appContainer.style.display = 'none';
    if (loginOverlay) loginOverlay.style.display = 'flex';

    this.switchUserType('public');
  },

  renderUserProfile(user) {
    const profileContainer = document.getElementById('userProfileSection');
    if (!profileContainer) return;

    if (user.role === 'PUBLIC') {
      profileContainer.innerHTML = `
        <div class="user-badge-wrapper" style="border-color: rgba(59, 130, 246, 0.35);">
          <div class="user-avatar-icon" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa;" title="Public Citizen Access">
            <i class="fa-solid fa-users"></i>
          </div>
          <div class="user-meta-text">
            <span class="user-name-title">${user.name}</span>
            <span class="user-clearance-badge" style="color: #60a5fa;"><i class="fa-solid fa-eye"></i> Public (View Only)</span>
          </div>
        </div>
        <button class="btn btn-secondary btn-xs" onclick="AuthModule.promptSwitchToOfficial()" title="Switch to Government Official Login">
          <i class="fa-solid fa-building-columns"></i> Official Login
        </button>
        <button class="btn btn-secondary btn-xs text-danger" onclick="AuthModule.logout()" title="Exit Portal">
          <i class="fa-solid fa-right-from-bracket"></i> Exit
        </button>
      `;
    } else {
      profileContainer.innerHTML = `
        <div class="user-badge-wrapper" style="border-color: rgba(16, 185, 129, 0.35);">
          <div class="user-avatar-icon" style="background: rgba(16, 185, 129, 0.2); color: #34d399;" title="${user.role || 'OFFICER'}">
            <i class="fa-solid fa-user-shield"></i>
          </div>
          <div class="user-meta-text">
            <span class="user-name-title">${user.name}</span>
            <span class="user-clearance-badge" style="color: #34d399;">${user.designation ? user.designation + ' • ' : ''}${user.clearance || 'Authorized Official'}</span>
          </div>
        </div>
        <button class="btn btn-secondary btn-xs text-danger" onclick="AuthModule.logout()" title="Secure Session Termination">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      `;
    }
  },

  setupPublicForm() {
    const form = document.getElementById('publicLoginForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('publicLoginName')?.value || '';
      const email = document.getElementById('publicLoginEmail')?.value || '';
      const remember = document.getElementById('publicRememberMe')?.checked || false;
      this.publicLogin(name, email, remember);
    });
  },

  setupLoginForm() {
    const form = document.getElementById('govLoginForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('govLoginName')?.value || '';
      const email = document.getElementById('govLoginEmail')?.value || '';
      const pass = document.getElementById('govLoginPassword')?.value || '';
      const remember = document.getElementById('govRememberMe')?.checked || false;
      this.login(name, email, pass, remember);
    });
  },

  setupRegisterForm() {
    const form = document.getElementById('govRegisterForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('govRegName')?.value || '';
      const email = document.getElementById('govRegEmail')?.value || '';
      const ministry = document.getElementById('govRegMinistry')?.value || '';
      const designation = document.getElementById('govRegDesignation')?.value || '';
      const clearanceVal = document.getElementById('govRegClearance')?.value || '';
      const password = document.getElementById('govRegPassword')?.value || '';
      const confirmPassword = document.getElementById('govRegConfirmPassword')?.value || '';

      this.register({
        name,
        email,
        ministry,
        designation,
        clearanceVal,
        password,
        confirmPassword
      });
    });
  }
};

// Initialize authentication on DOM load
document.addEventListener('DOMContentLoaded', () => {
  AuthModule.init();
});
