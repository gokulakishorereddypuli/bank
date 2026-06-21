/* ============================================================
   transactions.js — deposit, withdraw, transfer, history
   ============================================================ */
const Transactions = {
  async deposit(accountId, amount, description = 'Cash deposit') {
    amount = Number(amount);
    if (!amount || amount <= 0) throw new Error('Enter a valid deposit amount.');
    const acc = await Store.get('accounts', accountId);
    if (!acc) throw new Error('Account not found.');
    if (acc.status !== 'active') throw new Error('Account is inactive.');

    acc.balance = round2(acc.balance + amount);
    await Store.put('accounts', acc);

    return Store.add('transactions', {
      id: Util.uid(), refNo: Util.genRefNo(), accountId, type: 'CR', amount,
      balanceAfter: acc.balance, description, relatedAccountId: null,
      createdAt: new Date().toISOString()
    });
  },

  async withdraw(accountId, amount, description = 'Cash withdrawal') {
    amount = Number(amount);
    if (!amount || amount <= 0) throw new Error('Enter a valid withdrawal amount.');
    const acc = await Store.get('accounts', accountId);
    if (!acc) throw new Error('Account not found.');
    if (acc.status !== 'active') throw new Error('Account is inactive.');
    if (acc.balance < amount) throw new Error('Insufficient balance.');

    acc.balance = round2(acc.balance - amount);
    await Store.put('accounts', acc);

    return Store.add('transactions', {
      id: Util.uid(), refNo: Util.genRefNo(), accountId, type: 'DR', amount,
      balanceAfter: acc.balance, description, relatedAccountId: null,
      createdAt: new Date().toISOString()
    });
  },

  async transfer(fromAccountId, toAccountNumber, amount, description = 'Fund transfer') {
    amount = Number(amount);
    if (!amount || amount <= 0) throw new Error('Enter a valid transfer amount.');
    const fromAcc = await Store.get('accounts', fromAccountId);
    if (!fromAcc) throw new Error('Source account not found.');
    if (fromAcc.status !== 'active') throw new Error('Source account is inactive.');

    const toAcc = await Store.getOneByIndex('accounts', 'accountNumber', toAccountNumber.trim());
    if (!toAcc) throw new Error('Destination account number not found.');
    if (toAcc.status !== 'active') throw new Error('Destination account is inactive.');
    if (toAcc.id === fromAcc.id) throw new Error('Cannot transfer to the same account.');
    if (fromAcc.balance < amount) throw new Error('Insufficient balance.');

    fromAcc.balance = round2(fromAcc.balance - amount);
    toAcc.balance = round2(toAcc.balance + amount);
    await Store.put('accounts', fromAcc);
    await Store.put('accounts', toAcc);

    const refNo = Util.genRefNo();
    const now = new Date().toISOString();
    await Store.add('transactions', {
      id: Util.uid(), refNo, accountId: fromAcc.id, type: 'DR', amount,
      balanceAfter: fromAcc.balance, description: `${description} to ${toAcc.accountNumber}`,
      relatedAccountId: toAcc.id, createdAt: now
    });
    await Store.add('transactions', {
      id: Util.uid(), refNo, accountId: toAcc.id, type: 'CR', amount,
      balanceAfter: toAcc.balance, description: `${description} from ${fromAcc.accountNumber}`,
      relatedAccountId: fromAcc.id, createdAt: now
    });
    return { refNo };
  },

  async history(accountId, limit = null) {
    let list = await Store.getByIndex('transactions', 'accountId', accountId);
    list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return limit ? list.slice(0, limit) : list;
  },

  async historyInRange(accountId, startDate, endDate) {
    const list = await Transactions.history(accountId);
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 86399999; // include full end day
    return list.filter(t => {
      const ts = new Date(t.createdAt).getTime();
      return ts >= start && ts <= end;
    });
  },

  async monthly(accountId, year, month) {
    const list = await Transactions.history(accountId);
    return list.filter(t => {
      const d = new Date(t.createdAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  },

  async all() {
    const list = await Store.getAll('transactions');
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};

function round2(n) { return Math.round(n * 100) / 100; }
