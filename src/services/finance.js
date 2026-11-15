const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const { makeShares, suggestTransfers, id } = require('./finance-core');
async function getBalances(groupId) {
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: groupId }).select('amountPaise payer shares title date'),
    Settlement.find({ group: groupId, status: 'confirmed' }).select('from to amountPaise')
  ]);
  const balances = new Map();
  const ensure = uid => { if (!balances.has(uid)) balances.set(uid, 0); };
  for (const expense of expenses) {
    const payer = id(expense.payer); ensure(payer); balances.set(payer, balances.get(payer) + expense.amountPaise);
    for (const share of expense.shares) { const uid = id(share.user); ensure(uid); balances.set(uid, balances.get(uid) - share.amountPaise); }
  }
  for (const settlement of settlements) {
    const from = id(settlement.from), to = id(settlement.to); ensure(from); ensure(to);
    balances.set(from, balances.get(from) + settlement.amountPaise);
    balances.set(to, balances.get(to) - settlement.amountPaise);
  }
  return { balances, expenses, settlements };
}
module.exports = { makeShares, getBalances, suggestTransfers, id };
