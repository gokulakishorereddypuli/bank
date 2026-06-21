/* ============================================================
   auth.js — registration, login/logout, session & role guards
   ============================================================ */
const SESSION_KEY = 'bankapp_session';

const Auth = {
  async register({ name, email, phone, password, confirmPassword }) {
    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    phone = (phone || '').trim();

    if (!name || name.length < 2) throw new Error('Please enter your full name.');
    if (!Util.isValidEmail(email)) throw new Error('Please enter a valid email address.');
    if (!Util.isValidPhone(phone)) throw new Error('Phone number must be 10 digits.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');

    const existing = await Store.getOneByIndex('customers', 'email', email);
    if (existing) throw new Error('An account with this email already exists.');

    const passwordHash = await Security.hashPassword(password);
    const customer = {
      id: Util.uid(), name, email, phone, passwordHash,
      role: 'customer', status: 'active', createdAt: new Date().toISOString()
    };
    await Store.add('customers', customer);

    // Auto-create a savings account for new customers
    await Store.add('accounts', {
      id: Util.uid(), accountNumber: Util.genAccountNumber(), customerId: customer.id,
      type: 'savings', balance: 0, status: 'active', createdAt: new Date().toISOString()
    });
    return customer;
  },

  async login(email, password) {
    email = (email || '').trim().toLowerCase();
    const user = await Store.getOneByIndex('customers', 'email', email);
    if (!user) throw new Error('Invalid email or password.');
    if (user.status !== 'active') throw new Error('This account is inactive. Contact support.');
    const ok = await Security.verifyPassword(password, user.passwordHash);
    if (!ok) throw new Error('Invalid email or password.');

    const session = { userId: user.id, role: user.role, name: user.name, token: Util.uid(), loginAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return user;
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('csrfToken');
    window.location.href = 'index.html';
  },

  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  async getCurrentUser() {
    const s = Auth.getSession();
    if (!s) return null;
    return Store.get('customers', s.userId);
  },

  // Call at top of every protected page
  async requireAuth() {
    const s = Auth.getSession();
    if (!s) { window.location.href = 'index.html'; return null; }
    const user = await Store.get('customers', s.userId);
    if (!user || user.status !== 'active') { Auth.logout(); return null; }
    return user;
  },

  async requireAdmin() {
    const user = await Auth.requireAuth();
    if (!user) return null;
    if (user.role !== 'admin') { window.location.href = 'dashboard.html'; return null; }
    return user;
  }
};
