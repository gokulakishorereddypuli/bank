/* ============================================================
   loans.js — application, approval workflow, EMI, tracking
   ============================================================ */
const LOAN_RATES = { personal: 12, home: 8.5, vehicle: 9.5 };
const LOAN_LIMITS = { personal: 1500000, home: 20000000, vehicle: 5000000 };

const Loans = {
  rateFor(type) { return LOAN_RATES[type] || 12; },
  maxFor(type) { return LOAN_LIMITS[type] || 1000000; },

  async apply(customerId, type, principal, tenureMonths) {
    if (!['personal', 'home', 'vehicle'].includes(type)) throw new Error('Invalid loan type.');
    principal = Number(principal); tenureMonths = Number(tenureMonths);
    if (!principal || principal <= 0) throw new Error('Enter a valid loan amount.');
    if (principal > Loans.maxFor(type)) throw new Error(`Maximum ${type} loan amount is ${Util.formatCurrency(Loans.maxFor(type))}.`);
    if (!tenureMonths || tenureMonths < 6 || tenureMonths > 360) throw new Error('Tenure must be between 6 and 360 months.');

    const rateAPR = Loans.rateFor(type);
    const emi = Util.calcEMI(principal, rateAPR, tenureMonths);
    return Store.add('loans', {
      id: Util.uid(), customerId, type, principal, rateAPR, tenureMonths, emi,
      status: 'pending', outstandingPrincipal: principal,
      appliedAt: new Date().toISOString(), approvedAt: null
    });
  },

  async listForCustomer(customerId) {
    const list = await Store.getByIndex('loans', 'customerId', customerId);
    return list.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
  },

  async all() {
    const list = await Store.getAll('loans');
    return list.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
  },

  async approve(loanId) {
    const loan = await Store.get('loans', loanId);
    if (!loan) throw new Error('Loan not found.');
    if (loan.status !== 'pending') throw new Error('Only pending loans can be approved.');
    loan.status = 'approved';
    loan.approvedAt = new Date().toISOString();
    return Store.put('loans', loan);
  },

  async reject(loanId) {
    const loan = await Store.get('loans', loanId);
    if (!loan) throw new Error('Loan not found.');
    if (loan.status !== 'pending') throw new Error('Only pending loans can be rejected.');
    loan.status = 'rejected';
    return Store.put('loans', loan);
  },

  async close(loanId) {
    const loan = await Store.get('loans', loanId);
    if (!loan) throw new Error('Loan not found.');
    loan.status = 'closed';
    loan.outstandingPrincipal = 0;
    return Store.put('loans', loan);
  }
};
