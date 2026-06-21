# SecureTrust Bank — Frontend-Only Banking Demo

A complete banking web app built with **HTML5 + Bootstrap 5 + vanilla JavaScript**. There is no backend — all data lives in your browser's **IndexedDB**, with **LocalStorage** used only for the lightweight session token. This makes it a single-browser demo: data does not sync across devices and disappears if you clear site data.

## ⚠️ Important limitations (read this first)

Because there is no server:
- **Security is illustrative, not real.** Passwords are hashed with SHA-256 client-side (`crypto.subtle`) before storage, but anyone with devtools access to your browser can read the IndexedDB contents. Do not put real personal or financial data into this app.
- **CSRF protection** is a no-op in a backend-less app (there's no cross-site request to forge against), but the app still issues a per-session token as a stand-in, used to discourage stale-form double submits.
- **Role-based access** is enforced in the UI/JS only, not by a trusted server.
- Data is **per-browser, per-device**. Clearing browser storage deletes everything.

If you need a real multi-user system, swap the storage layer (`js/db.js`) for calls to a backend API — the rest of the app (`accounts.js`, `transactions.js`, `loans.js`, `creditcards.js`, `statements.js`) already separates business logic from storage, so this is a contained change.

## Installation

No build step, no npm install, no server required.

1. Download/unzip the project folder.
2. Open `index.html` directly in a modern browser (Chrome, Edge, Firefox, Safari) — double-click it, or serve it with any static file server, e.g.:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```
3. The app seeds demo data automatically on first load.

## Demo credentials

| Role     | Email            | Password |
|----------|------------------|----------|
| Customer | demo@bank.com    | demo123  |
| Admin    | admin@bank.com   | admin123 |

(Buttons on the login page auto-fill these for you.)

## Project structure

```
bank-app/
├── index.html          Login
├── register.html        Customer registration
├── dashboard.html        Customer dashboard (Chart.js)
├── accounts.html         Open/view accounts
├── transactions.html     Deposit / withdraw / transfer / history
├── statements.html       Mini / monthly / date-range + PDF export
├── loans.html            Apply for loans, EMI calculator, tracking
├── creditcards.html      Request card, view bill, make payments
├── admin.html            Admin console: customers, accounts, txns, approvals, reports
├── css/style.css         Theme & component styles
├── js/
│   ├── db.js              IndexedDB CRUD layer + demo data seeding   (Model/Storage)
│   ├── utils.js            Formatting, validation, hashing, toasts
│   ├── auth.js             Register / login / logout / session & role guards (Controller)
│   ├── nav.js               Shared sidebar + topbar component         (View)
│   ├── accounts.js          Account business logic                    (Controller)
│   ├── transactions.js      Deposit / withdraw / transfer logic        (Controller)
│   ├── statements.js        Statement queries + PDF export             (Controller)
│   ├── loans.js             Loan application/approval/EMI logic        (Controller)
│   └── creditcards.js       Card request/approval/billing logic        (Controller)
└── data/sample-seed.json  Reference copy of the seeded data shape
```

Each HTML page is the "view," each page's inline `<script>` is its page controller, and the `js/*.js` service files under "Model/Storage" and "Controller" above are reused across pages — this mirrors an MVC split without needing a server-side framework.

## Storage schema (IndexedDB, database `bankAppDB`)

| Store          | Key path | Indexes                              |
|----------------|----------|---------------------------------------|
| `customers`    | `id`     | `email` (unique)                      |
| `accounts`     | `id`     | `customerId`, `accountNumber` (unique)|
| `transactions` | `id`     | `accountId`, `createdAt`              |
| `loans`        | `id`     | `customerId`                          |
| `creditcards`  | `id`     | `customerId`                          |

See `data/sample-seed.json` for example records of each shape.

## Module reference (JS service API)

### `Auth`
- `register({name, email, phone, password, confirmPassword})` — validates, hashes password, creates customer + a 0-balance savings account.
- `login(email, password)` — verifies hash, stores session in LocalStorage.
- `logout()` — clears session, redirects to login.
- `requireAuth()` / `requireAdmin()` — call at top of each protected page; redirects if not authorized.

### `Accounts`
- `create(customerId, type)` — `type` is `'savings'` or `'current'`.
- `listForCustomer(customerId)`, `get(accountId)`, `all()`, `setStatus(accountId, status)`.

### `Transactions`
- `deposit(accountId, amount, description?)` — CR entry.
- `withdraw(accountId, amount, description?)` — DR entry, validates sufficient balance.
- `transfer(fromAccountId, toAccountNumber, amount, description?)` — atomic DR+CR pair sharing one reference number.
- `history(accountId, limit?)`, `historyInRange(accountId, start, end)`, `monthly(accountId, year, month)`, `all()`.

### `Statements`
- `mini(accountId)` — last 10 transactions.
- `monthly(accountId, year, month)`.
- `range(accountId, start, end)`.
- `exportPdf(account, customer, txList, title)` — generates a PDF via jsPDF + autotable.

### `Loans`
- `apply(customerId, type, principal, tenureMonths)` — `type` is `personal | home | vehicle`, each with a fixed rate and max amount.
- `approve(loanId)` / `reject(loanId)` / `close(loanId)` — admin workflow.
- `listForCustomer(customerId)`, `all()`.
- EMI is computed via `Util.calcEMI(principal, annualRatePct, months)` (standard reducing-balance formula).

### `CreditCards`
- `request(customerId, requestedLimit)`.
- `approve(cardId)` / `reject(cardId)` / `block(cardId)` — admin workflow.
- `setLimit(cardId, newLimit)`, `charge(cardId, amount, description?)`, `generateBill(cardId)`, `makePayment(cardId, amount)`.

## Security measures implemented (client-side demo level)

- **Password hashing**: SHA-256 via Web Crypto, never stored in plaintext.
- **Input validation**: email format, 10-digit phone, minimum password length, numeric/positive amount checks, balance/limit checks before every transaction.
- **XSS protection**: all user-supplied strings are passed through `Util.escapeHtml()` before being inserted into the DOM.
- **Session management**: a session object (`userId`, `role`, token) is stored in LocalStorage and checked on every protected page load; inactive/missing accounts are logged out automatically.
- **Role-based access**: `Auth.requireAdmin()` redirects non-admins away from `admin.html`; customer pages redirect admins to the admin console.

## Extending to a real backend

To turn this into a true multi-user app:
1. Replace `js/db.js`'s `Store` object with `fetch()` calls to a REST API (keep the same method names/signatures — `add`, `put`, `get`, `getAll`, `getByIndex`, `delete` — so the rest of the app doesn't need to change).
2. Move `Security.hashPassword` server-side (bcrypt/argon2) and never send plaintext passwords except over HTTPS.
3. Replace the LocalStorage session with an HTTP-only cookie + server session, and add real CSRF tokens validated server-side.
4. Enforce role checks server-side, not just in the UI.
