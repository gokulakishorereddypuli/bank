/* ============================================================
   db.js — IndexedDB storage service layer (CRUD for all entities)
   Stores: customers, accounts, transactions, loans, creditcards
   ============================================================ */
const DB_NAME = 'bankAppDB';
const DB_VERSION = 1;
const STORES = ['customers', 'accounts', 'transactions', 'loans', 'creditcards'];

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('customers')) {
        const s = db.createObjectStore('customers', { keyPath: 'id' });
        s.createIndex('email', 'email', { unique: true });
      }
      if (!db.objectStoreNames.contains('accounts')) {
        const s = db.createObjectStore('accounts', { keyPath: 'id' });
        s.createIndex('customerId', 'customerId', { unique: false });
        s.createIndex('accountNumber', 'accountNumber', { unique: true });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        const s = db.createObjectStore('transactions', { keyPath: 'id' });
        s.createIndex('accountId', 'accountId', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('loans')) {
        const s = db.createObjectStore('loans', { keyPath: 'id' });
        s.createIndex('customerId', 'customerId', { unique: false });
      }
      if (!db.objectStoreNames.contains('creditcards')) {
        const s = db.createObjectStore('creditcards', { keyPath: 'id' });
        s.createIndex('customerId', 'customerId', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

const Store = {
  async add(storeName, obj) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((res, rej) => {
      const r = store.add(obj);
      r.onsuccess = () => res(obj);
      r.onerror = () => rej(r.error);
    });
  },
  async put(storeName, obj) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((res, rej) => {
      const r = store.put(obj);
      r.onsuccess = () => res(obj);
      r.onerror = () => rej(r.error);
    });
  },
  async get(storeName, id) {
    const store = await tx(storeName);
    return new Promise((res, rej) => {
      const r = store.get(id);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    });
  },
  async getAll(storeName) {
    const store = await tx(storeName);
    return new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  },
  async getByIndex(storeName, indexName, value) {
    const store = await tx(storeName);
    return new Promise((res, rej) => {
      const r = store.index(indexName).getAll(value);
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  },
  async getOneByIndex(storeName, indexName, value) {
    const store = await tx(storeName);
    return new Promise((res, rej) => {
      const r = store.index(indexName).get(value);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    });
  },
  async delete(storeName, id) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((res, rej) => {
      const r = store.delete(id);
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    });
  },
  async clear(storeName) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((res, rej) => {
      const r = store.clear();
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    });
  }
};

/* ---------------- Seeding ---------------- */
async function seedIfEmpty() {
  const customers = await Store.getAll('customers');
  if (customers.length > 0) return;

  const adminPass = await Security.hashPassword('admin123');
  const custPass = await Security.hashPassword('demo123');

  const admin = {
    id: Util.uid(), name: 'Bank Admin', email: 'admin@bank.com', phone: '9999900000',
    passwordHash: adminPass, role: 'admin', status: 'active', createdAt: new Date().toISOString()
  };
  const demoCustomer = {
    id: Util.uid(), name: 'Asha Rao', email: 'demo@bank.com', phone: '9876543210',
    passwordHash: custPass, role: 'customer', status: 'active', createdAt: new Date().toISOString()
  };
  await Store.add('customers', admin);
  await Store.add('customers', demoCustomer);

  const savAcc = {
    id: Util.uid(), accountNumber: Util.genAccountNumber(), customerId: demoCustomer.id,
    type: 'savings', balance: 45250, status: 'active', createdAt: new Date().toISOString()
  };
  const curAcc = {
    id: Util.uid(), accountNumber: Util.genAccountNumber(), customerId: demoCustomer.id,
    type: 'current', balance: 12000, status: 'active', createdAt: new Date().toISOString()
  };
  await Store.add('accounts', savAcc);
  await Store.add('accounts', curAcc);

  const now = Date.now();
  const sampleTx = [
    { acc: savAcc, type: 'CR', amount: 50000, desc: 'Initial deposit', daysAgo: 40 },
    { acc: savAcc, type: 'DR', amount: 3200, desc: 'ATM withdrawal', daysAgo: 21 },
    { acc: savAcc, type: 'CR', amount: 1500, desc: 'Interest credit', daysAgo: 15 },
    { acc: savAcc, type: 'DR', amount: 3050, desc: 'Electricity bill payment', daysAgo: 9 },
    { acc: curAcc, type: 'CR', amount: 12000, desc: 'Initial deposit', daysAgo: 12 },
    { acc: savAcc, type: 'DR', amount: 1000, desc: 'Grocery store', daysAgo: 2 }
  ];
  for (const t of sampleTx) {
    await Store.add('transactions', {
      id: Util.uid(), refNo: Util.genRefNo(), accountId: t.acc.id, type: t.type,
      amount: t.amount, balanceAfter: t.acc.balance, description: t.desc,
      relatedAccountId: null, createdAt: new Date(now - t.daysAgo * 86400000).toISOString()
    });
  }

  await Store.add('loans', {
    id: Util.uid(), customerId: demoCustomer.id, type: 'personal', principal: 200000,
    rateAPR: 12, tenureMonths: 24, emi: Util.calcEMI(200000, 12, 24),
    status: 'approved', outstandingPrincipal: 160000,
    appliedAt: new Date(now - 90 * 86400000).toISOString(),
    approvedAt: new Date(now - 85 * 86400000).toISOString()
  });
  await Store.add('loans', {
    id: Util.uid(), customerId: demoCustomer.id, type: 'vehicle', principal: 350000,
    rateAPR: 9.5, tenureMonths: 48, emi: Util.calcEMI(350000, 9.5, 48),
    status: 'pending', outstandingPrincipal: 350000,
    appliedAt: new Date(now - 3 * 86400000).toISOString(), approvedAt: null
  });

  await Store.add('creditcards', {
    id: Util.uid(), customerId: demoCustomer.id, cardNumber: Util.genCardNumber(),
    limit: 100000, outstanding: 8450, status: 'active', billCycleDay: 5,
    currentBill: 8450, dueDate: new Date(now + 10 * 86400000).toISOString(),
    createdAt: new Date(now - 60 * 86400000).toISOString()
  });
}
