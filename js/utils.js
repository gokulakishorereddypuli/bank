/* ============================================================
   utils.js — shared helpers (security, formatting, validation)
   ============================================================ */
const Util = {
  uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  },
  genAccountNumber() {
    const n = Math.floor(1000000000 + Math.random() * 8999999999);
    return 'AC' + n;
  },
  genCardNumber() {
    let parts = [];
    for (let i = 0; i < 4; i++) parts.push(Math.floor(1000 + Math.random() * 8999));
    return parts.join(' ');
  },
  genRefNo() {
    return 'TXN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  },
  formatCurrency(n) {
    const v = Number(n || 0);
    return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  formatDate(iso, withTime = true) {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!withTime) return date;
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  },
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  calcEMI(principal, annualRatePct, months) {
    const r = (annualRatePct / 12) / 100;
    if (r === 0) return Math.round(principal / months);
    const emi = principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
    return Math.round(emi);
  },
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  isValidPhone(phone) {
    return /^[0-9]{10}$/.test(phone);
  },
  toast(message, type = 'success') {
    const region = document.getElementById('toastRegion') || (() => {
      const d = document.createElement('div');
      d.id = 'toastRegion';
      d.className = 'toast-region';
      document.body.appendChild(d);
      return d;
    })();
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${Util.escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    region.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
};

/* ---------------- Security helpers ---------------- */
const Security = {
  async hashPassword(password) {
    const enc = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },
  async verifyPassword(password, hash) {
    const h = await Security.hashPassword(password);
    return h === hash;
  },
  // Simple CSRF-style token for state-changing forms in this client-only demo
  getCsrfToken() {
    let t = sessionStorage.getItem('csrfToken');
    if (!t) {
      t = Util.uid();
      sessionStorage.setItem('csrfToken', t);
    }
    return t;
  }
};
