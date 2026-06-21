/* ============================================================
   nav.js — shared sidebar + topbar, rendered into #appShell
   ============================================================ */
const CUSTOMER_LINKS = [
  { href: 'dashboard.html', icon: 'bi-grid-1x2', label: 'Dashboard' },
  { href: 'accounts.html', icon: 'bi-wallet2', label: 'Accounts' },
  { href: 'transactions.html', icon: 'bi-arrow-left-right', label: 'Transactions' },
  { href: 'statements.html', icon: 'bi-file-earmark-text', label: 'Statements' },
  { href: 'loans.html', icon: 'bi-cash-coin', label: 'Loans' },
  { href: 'creditcards.html', icon: 'bi-credit-card-2-front', label: 'Credit Cards' }
];
const ADMIN_LINKS = [
  { href: 'admin.html', icon: 'bi-speedometer2', label: 'Admin Overview' },
  { href: 'admin.html#customers', icon: 'bi-people', label: 'Customers' },
  { href: 'admin.html#accounts', icon: 'bi-wallet2', label: 'Accounts' },
  { href: 'admin.html#transactions', icon: 'bi-arrow-left-right', label: 'Transactions' },
  { href: 'admin.html#loans', icon: 'bi-cash-coin', label: 'Loan Approvals' },
  { href: 'admin.html#creditcards', icon: 'bi-credit-card-2-front', label: 'Card Approvals' },
  { href: 'admin.html#reports', icon: 'bi-bar-chart-line', label: 'Reports' }
];

function renderShell(user, pageTitle) {
  const links = user.role === 'admin' ? ADMIN_LINKS : CUSTOMER_LINKS;
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  const currentHash = window.location.hash;

  const navHtml = links.map(l => {
    const linkPage = l.href.split('#')[0];
    const linkHash = l.href.includes('#') ? '#' + l.href.split('#')[1] : '';
    const isActive = linkPage === currentPage && (linkHash === '' || linkHash === currentHash || (linkHash === '#customers' && !currentHash && currentPage === 'admin.html' && l.href === ADMIN_LINKS[0].href));
    return `<a href="${l.href}" class="${isActive ? 'active' : ''}"><i class="bi ${l.icon}"></i> ${Util.escapeHtml(l.label)}</a>`;
  }).join('');

  const initials = user.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  document.getElementById('appShell').innerHTML = `
    <div class="sidebar" id="sidebar">
      <div class="brand">SecureTrust Bank<span class="sub">${user.role === 'admin' ? 'Admin Console' : 'Online Banking'}</span></div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-foot">
        <div class="d-flex align-items-center gap-2 mb-2">
          <div class="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center" style="width:34px;height:34px;font-size:.75rem;font-weight:700;">${initials}</div>
          <div class="text-truncate">
            <div class="text-white small fw-semibold text-truncate" style="max-width:140px;">${Util.escapeHtml(user.name)}</div>
            <div class="text-secondary" style="font-size:.7rem;">${Util.escapeHtml(user.role)}</div>
          </div>
        </div>
        <button class="btn btn-outline-light btn-sm w-100" onclick="Auth.logout()"><i class="bi bi-box-arrow-right"></i> Logout</button>
      </div>
    </div>
    <div class="main-wrap">
      <div class="topbar">
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-sm btn-outline-secondary d-lg-none" onclick="document.getElementById('sidebar').classList.toggle('show')"><i class="bi bi-list"></i></button>
          <h5 class="mb-0">${Util.escapeHtml(pageTitle)}</h5>
        </div>
        <div class="text-muted small d-none d-sm-block">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
      <div class="content" id="pageContent"></div>
    </div>
    <div class="toast-region" id="toastRegion"></div>
  `;
}
