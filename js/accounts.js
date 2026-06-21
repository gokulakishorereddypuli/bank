/* ============================================================
   accounts.js — account creation, listing, status management
   ============================================================ */
const Accounts = {
  async create(customerId, type) {
    if (!['savings', 'current'].includes(type)) throw new Error('Invalid account type.');
    const acc = {
      id: Util.uid(), accountNumber: Util.genAccountNumber(), customerId,
      type, balance: 0, status: 'active', createdAt: new Date().toISOString()
    };
    return Store.add('accounts', acc);
  },
  async listForCustomer(customerId) {
    const accs = await Store.getByIndex('accounts', 'customerId', customerId);
    return accs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },
  async get(accountId) {
    return Store.get('accounts', accountId);
  },
  async all() {
    return Store.getAll('accounts');
  },
  async setStatus(accountId, status) {
    const acc = await Store.get('accounts', accountId);
    if (!acc) throw new Error('Account not found.');
    acc.status = status;
    return Store.put('accounts', acc);
  },
  async totalBalance(customerId) {
    const accs = await Accounts.listForCustomer(customerId);
    return accs.filter(a => a.status === 'active').reduce((sum, a) => sum + a.balance, 0);
  }
};
