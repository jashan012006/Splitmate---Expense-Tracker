const id = value => String(value?._id || value);
function makeShares(amountPaise, participantIds, customShares) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 1) throw new Error('Amount must be a positive number with at most two decimal places.');
  const ids = [...new Set(participantIds.map(id))];
  if (!ids.length) throw new Error('Select at least one participant.');
  if (customShares && customShares.length) {
    const shares = customShares.map(s => ({ user: id(s.user), amountPaise: Number(s.amountPaise) }));
    if (shares.some(s => !ids.includes(s.user) || !Number.isSafeInteger(s.amountPaise) || s.amountPaise < 0)) throw new Error('Each custom share must be a non-negative whole number of paise for a selected participant.');
    if (new Set(shares.map(s => s.user)).size !== shares.length || shares.length !== ids.length) throw new Error('Provide exactly one custom share for every participant.');
    if (shares.reduce((sum, s) => sum + s.amountPaise, 0) !== amountPaise) throw new Error('Custom shares must add up to the total amount exactly.');
    return shares;
  }
  const base = Math.floor(amountPaise / ids.length), remainder = amountPaise % ids.length;
  return ids.map((user, index) => ({ user, amountPaise: base + (index < remainder ? 1 : 0) }));
}
// Greedy matching pairs the largest debtor with the largest creditor. Practical, not globally transaction-minimal.
function suggestTransfers(balanceMap) {
  const debtors = [], creditors = [];
  for (const [user, net] of balanceMap.entries()) { if (net < 0) debtors.push({ user, amount: -net }); else if (net > 0) creditors.push({ user, amount: net }); }
  debtors.sort((a,b) => b.amount - a.amount); creditors.sort((a,b) => b.amount - a.amount);
  const transfers = []; let d = 0, c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amountPaise = Math.min(debtors[d].amount, creditors[c].amount);
    if (amountPaise > 0) transfers.push({ from: debtors[d].user, to: creditors[c].user, amountPaise });
    debtors[d].amount -= amountPaise; creditors[c].amount -= amountPaise;
    if (debtors[d].amount === 0) d++; if (creditors[c].amount === 0) c++;
  }
  return transfers;
}
module.exports = { makeShares, suggestTransfers, id };
