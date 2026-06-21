/* ============================================================
   statements.js — mini/monthly/range statements + PDF export
   ============================================================ */
const Statements = {
  async mini(accountId) {
    return Transactions.history(accountId, 10);
  },
  async monthly(accountId, year, month) {
    return Transactions.monthly(accountId, year, month);
  },
  async range(accountId, startDate, endDate) {
    return Transactions.historyInRange(accountId, startDate, endDate);
  },

  async exportPdf(account, customer, txList, title) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 14;
    let y = 18;

    doc.setFontSize(16);
    doc.setTextColor(11, 37, 69);
    doc.text('SecureTrust Bank', margin, y);
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(title, 196 - margin, y, { align: 'right' });

    y += 8;
    doc.setDrawColor(220);
    doc.line(margin, y, 196 - margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text(`Account Holder: ${customer.name}`, margin, y); y += 6;
    doc.text(`Account Number: ${account.accountNumber}`, margin, y); y += 6;
    doc.text(`Account Type: ${account.type.toUpperCase()}`, margin, y); y += 6;
    doc.text(`Statement Generated: ${Util.formatDate(new Date().toISOString())}`, margin, y); y += 6;
    doc.text(`Closing Balance: ${Util.formatCurrency(account.balance)}`, margin, y); y += 10;

    const rows = txList.map(t => [
      Util.formatDate(t.createdAt, false),
      t.refNo,
      t.description,
      t.type,
      Util.formatCurrency(t.amount),
      Util.formatCurrency(t.balanceAfter)
    ]);

    doc.autoTable({
      startY: y,
      head: [['Date', 'Ref No', 'Description', 'Type', 'Amount', 'Balance']],
      body: rows.length ? rows : [['—', '—', 'No transactions in this period', '—', '—', '—']],
      headStyles: { fillColor: [11, 37, 69] },
      styles: { fontSize: 8, cellPadding: 2.5 },
      margin: { left: margin, right: margin }
    });

    doc.save(`statement_${account.accountNumber}.pdf`);
  }
};
