/* ============================================================
   creditcards.js — request, approval, limit, billing, payment
   ============================================================ */
const CreditCards = {
  async request(customerId, requestedLimit) {
    requestedLimit = Number(requestedLimit) || 50000;
    if (requestedLimit < 10000 || requestedLimit > 1000000) throw new Error('Requested limit must be between ₹10,000 and ₹10,00,000.');
    const existing = await Store.getByIndex('creditcards', 'customerId', customerId);
    const hasActive = existing.some(c => ['pending', 'approved', 'active'].includes(c.status));
    if (hasActive) throw new Error('You already have a credit card request in progress or active.');

    return Store.add('creditcards', {
      id: Util.uid(), customerId, cardNumber: Util.genCardNumber(),
      limit: requestedLimit, outstanding: 0, status: 'pending', billCycleDay: 5,
      currentBill: 0, dueDate: null, createdAt: new Date().toISOString()
    });
  },

  async listForCustomer(customerId) {
    const list = await Store.getByIndex('creditcards', 'customerId', customerId);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async all() {
    const list = await Store.getAll('creditcards');
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async approve(cardId) {
    const card = await Store.get('creditcards', cardId);
    if (!card) throw new Error('Card request not found.');
    if (card.status !== 'pending') throw new Error('Only pending requests can be approved.');
    card.status = 'active';
    return Store.put('creditcards', card);
  },

  async reject(cardId) {
    const card = await Store.get('creditcards', cardId);
    if (!card) throw new Error('Card request not found.');
    if (card.status !== 'pending') throw new Error('Only pending requests can be rejected.');
    card.status = 'rejected';
    return Store.put('creditcards', card);
  },

  async setLimit(cardId, newLimit) {
    newLimit = Number(newLimit);
    const card = await Store.get('creditcards', cardId);
    if (!card) throw new Error('Card not found.');
    if (newLimit < card.outstanding) throw new Error('New limit cannot be less than current outstanding balance.');
    card.limit = newLimit;
    return Store.put('creditcards', card);
  },

  async block(cardId) {
    const card = await Store.get('creditcards', cardId);
    if (!card) throw new Error('Card not found.');
    card.status = 'blocked';
    return Store.put('creditcards', card);
  },

  async charge(cardId, amount, description = 'Card purchase') {
    amount = Number(amount);
    const card = await Store.get('creditcards', cardId);
    if (!card) throw new Error('Card not found.');
    if (card.status !== 'active') throw new Error('Card is not active.');
    if (card.outstanding + amount > card.limit) throw new Error('This would exceed your credit limit.');
    card.outstanding = Math.round((card.outstanding + amount) * 100) / 100;
    return Store.put('creditcards', card);
  },

  async generateBill(cardId) {
    const card = await Store.get('creditcards', cardId);
    if (!card) throw new Error('Card not found.');
    card.currentBill = card.outstanding;
    const due = new Date();
    due.setDate(due.getDate() + 20);
    card.dueDate = due.toISOString();
    return Store.put('creditcards', card);
  },

  async makePayment(cardId, amount) {
    amount = Number(amount);
    const card = await Store.get('creditcards', cardId);
    if (!card) throw new Error('Card not found.');
    if (!amount || amount <= 0) throw new Error('Enter a valid payment amount.');
    if (amount > card.outstanding) throw new Error('Payment exceeds outstanding balance.');
    card.outstanding = Math.round((card.outstanding - amount) * 100) / 100;
    card.currentBill = Math.max(0, Math.round((card.currentBill - amount) * 100) / 100);
    return Store.put('creditcards', card);
  }
};
