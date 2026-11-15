const test = require('node:test');
const assert = require('node:assert/strict');
const { makeShares, suggestTransfers } = require('../src/services/finance-core');

test('equal split distributes every paise without losing money', () => {
  const shares = makeShares(1001, ['a','b','c']);
  assert.deepEqual(shares.map(s=>s.amountPaise), [334,334,333]);
  assert.equal(shares.reduce((s,x)=>s+x.amountPaise,0),1001);
});
test('custom split must match total exactly', () => {
  assert.throws(()=>makeShares(1000,['a','b'],[{user:'a',amountPaise:400},{user:'b',amountPaise:599}]), /add up to the total/);
  assert.deepEqual(makeShares(1000,['a','b'],[{user:'a',amountPaise:400},{user:'b',amountPaise:600}]).map(s=>s.amountPaise),[400,600]);
});
test('custom split requires each participant exactly once', () => {
  assert.throws(()=>makeShares(1000,['a','b'],[{user:'a',amountPaise:500},{user:'a',amountPaise:500}]), /exactly one custom share/);
});
test('greedy settlement pairs debtors with creditors and clears the balances', () => {
  const transfers = suggestTransfers(new Map([['alice',-700],['bob',-300],['cara',600],['dev',400]]));
  assert.equal(transfers.reduce((s,t)=>s+t.amountPaise,0),1000);
  const residual = new Map([['alice',-700],['bob',-300],['cara',600],['dev',400]]);
  for (const t of transfers) { residual.set(t.from,residual.get(t.from)+t.amountPaise); residual.set(t.to,residual.get(t.to)-t.amountPaise); }
  assert.deepEqual([...residual.values()], [0,0,0,0]);
});
test('already settled balances produce no suggested transfers', () => {
  assert.deepEqual(suggestTransfers(new Map([['alice',0],['bob',0]])), []);
});
