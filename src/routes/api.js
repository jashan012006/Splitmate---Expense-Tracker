const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, param, query } = require('express-validator');
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const auth = require('../middleware/auth');
const { validate } = require('../middleware/errors');
const { ok, fail } = require('../utils/http');
const { makeShares, getBalances, suggestTransfers, id } = require('../services/finance');
const router = express.Router();
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const validId = param('id').isMongoId().withMessage('Invalid identifier.');
const memberOf = async (groupId, userId) => {
  const group = await Group.findById(groupId).populate('members', 'name email').populate('owner', 'name email');
  if (!group) throw fail('Group not found.', 404);
  if (!group.members.some(m => id(m) === id(userId))) throw fail('You are not a member of this group.', 403);
  return group;
};
const isOwner = (group, userId) => id(group.owner) === id(userId);
const paiseFromAmount = amount => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0 || Math.round(n * 100) !== n * 100) throw fail('Amount must be positive and have at most two decimal places.');
  return Math.round(n * 100);
};
const userView = user => ({ id: id(user), name: user.name, email: user.email });

// Authentication
router.post('/auth/register', [body('name').trim().isLength({ min: 2, max: 60 }), body('email').trim().isEmail().normalizeEmail(), body('password').isLength({ min: 8, max: 72 }), validate], asyncRoute(async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email }); if (exists) throw fail('An account with this email already exists.', 409);
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
  const token = jwt.sign({ sub: id(user) }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
  ok(res, { user: userView(user), token }, 'Account created.', 201);
}));
router.post('/auth/login', [body('email').trim().isEmail().normalizeEmail(), body('password').isString().notEmpty(), validate], asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) throw fail('Email or password is incorrect.', 401);
  const token = jwt.sign({ sub: id(user) }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
  ok(res, { user: userView(user), token }, 'Logged in.');
}));
router.get('/auth/me', auth, asyncRoute(async (req, res) => ok(res, { user: userView(req.user) })));
router.patch('/users/me', [auth, body('name').optional().trim().isLength({ min: 2, max: 60 }), validate], asyncRoute(async (req, res) => {
  if (req.body.name) req.user.name = req.body.name; await req.user.save(); ok(res, { user: userView(req.user) }, 'Profile updated.');
}));
router.get('/users/search', [auth, query('q').trim().isLength({ min: 2, max: 80 }), validate], asyncRoute(async (req, res) => {
  const q = req.query.q; const users = await User.find({ $and: [{ _id: { $ne: req.user._id } }, { $or: [{ email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }] }] }).select('name email').limit(8);
  ok(res, { users: users.map(userView) });
}));

// Groups
router.get('/groups', auth, asyncRoute(async (req, res) => {
  const groups = await Group.find({ members: req.user._id }).populate('owner', 'name email').populate('members', 'name email').sort({ updatedAt: -1 });
  const result = await Promise.all(groups.map(async g => { const [expenseCount, spend] = await Promise.all([Expense.countDocuments({ group: g._id }), Expense.aggregate([{ $match: { group: g._id } }, { $group: { _id: null, total: { $sum: '$amountPaise' } } }])]); return { ...g.toObject(), expenseCount, totalSpendPaise: spend[0]?.total || 0 }; }));
  ok(res, { groups: result });
}));
router.post('/groups', [auth, body('name').trim().isLength({ min: 2, max: 80 }), body('type').optional().isIn(['Trip', 'Home', 'College', 'Event', 'Other']), body('description').optional().trim().isLength({ max: 240 }), validate], asyncRoute(async (req, res) => {
  const group = await Group.create({ name: req.body.name, type: req.body.type || 'Other', description: req.body.description || '', owner: req.user._id, members: [req.user._id] });
  await group.populate(['owner', 'members']); ok(res, { group }, 'Group created.', 201);
}));
router.get('/groups/:id', [auth, validId, validate], asyncRoute(async (req, res) => { const group = await memberOf(req.params.id, req.user._id); const [expenseCount, spend] = await Promise.all([Expense.countDocuments({ group: group._id }), Expense.aggregate([{ $match: { group: group._id } }, { $group: { _id: null, total: { $sum: '$amountPaise' } } }])]); ok(res, { group, expenseCount, totalSpendPaise: spend[0]?.total || 0 }); }));
router.post('/groups/:id/members', [auth, validId, body('email').trim().isEmail().normalizeEmail(), validate], asyncRoute(async (req, res) => {
  const group = await Group.findById(req.params.id); if (!group) throw fail('Group not found.', 404); if (!isOwner(group, req.user._id)) throw fail('Only the group owner can add members.', 403);
  const user = await User.findOne({ email: req.body.email }); if (!user) throw fail('No registered user found with that email.', 404); if (group.members.some(m => id(m) === id(user))) throw fail('This user is already a member.');
  group.members.push(user._id); await group.save(); await group.populate(['owner', 'members']); ok(res, { group }, 'Member added.', 201);
}));
router.delete('/groups/:id/members/:userId', auth, asyncRoute(async (req, res) => {
  const group = await Group.findById(req.params.id); if (!group) throw fail('Group not found.', 404); if (!isOwner(group, req.user._id)) throw fail('Only the group owner can remove members.', 403);
  if (!/^[a-f\d]{24}$/i.test(req.params.userId)) throw fail('Invalid user identifier.'); if (id(group.owner) === req.params.userId) throw fail('The group owner cannot be removed.');
  const hasHistory = await Expense.exists({ group: group._id, $or: [{ payer: req.params.userId }, { participants: req.params.userId }, { 'shares.user': req.params.userId }] }); if (hasHistory) throw fail('Cannot remove a member with expense history.');
  group.members = group.members.filter(m => id(m) !== req.params.userId); await group.save(); ok(res, { group }, 'Member removed.');
}));
router.delete('/groups/:id', [auth, validId, validate], asyncRoute(async (req, res) => { const group = await Group.findById(req.params.id); if (!group) throw fail('Group not found.', 404); if (!isOwner(group, req.user._id)) throw fail('Only the owner can delete this group.', 403); await Promise.all([Expense.deleteMany({ group: group._id }), Settlement.deleteMany({ group: group._id })]); await group.deleteOne(); ok(res, {}, 'Group deleted.'); }));

// Expenses
router.get('/groups/:id/expenses', [auth, validId, query('category').optional().isIn(['Food', 'Transport', 'Stay', 'Shopping', 'Bills', 'Entertainment', 'Other']), query('from').optional().isISO8601(), query('to').optional().isISO8601(), validate], asyncRoute(async (req, res) => {
  await memberOf(req.params.id, req.user._id); const filter = { group: req.params.id }; if (req.query.category) filter.category = req.query.category; if (req.query.from || req.query.to) { filter.date = {}; if (req.query.from) filter.date.$gte = new Date(req.query.from); if (req.query.to) filter.date.$lte = new Date(req.query.to); }
  const expenses = await Expense.find(filter).populate('payer', 'name email').populate('participants', 'name email').populate('shares.user', 'name email').populate('createdBy', 'name').sort({ date: -1, createdAt: -1 }); ok(res, { expenses });
}));
router.post('/groups/:id/expenses', [auth, validId, body('title').trim().isLength({ min: 2, max: 120 }), body('amount').isNumeric(), body('payer').isMongoId(), body('participants').isArray({ min: 1 }), body('participants.*').isMongoId(), body('category').optional().isIn(['Food', 'Transport', 'Stay', 'Shopping', 'Bills', 'Entertainment', 'Other']), body('date').optional().isISO8601(), body('note').optional().trim().isLength({ max: 500 }), validate], asyncRoute(async (req, res) => {
  const group = await memberOf(req.params.id, req.user._id); const participants = [...new Set(req.body.participants.map(id))];
  if (!group.members.some(m => id(m) === id(req.body.payer))) throw fail('Payer must be a group member.'); if (participants.some(uid => !group.members.some(m => id(m) === uid))) throw fail('Every participant must be a group member.');
  const amountPaise = paiseFromAmount(req.body.amount); const shares = makeShares(amountPaise, participants, req.body.shares);
  const expense = await Expense.create({ title: req.body.title, amountPaise, payer: req.body.payer, participants, shares, category: req.body.category || 'Other', date: req.body.date ? new Date(req.body.date) : new Date(), note: req.body.note || '', group: group._id, createdBy: req.user._id });
  await expense.populate(['payer', 'participants', 'shares.user', 'createdBy']); ok(res, { expense }, 'Expense added.', 201);
}));
router.get('/expenses/:id', [auth, validId, validate], asyncRoute(async (req, res) => { const expense = await Expense.findById(req.params.id).populate('payer', 'name email').populate('participants', 'name email').populate('shares.user', 'name email').populate('createdBy', 'name'); if (!expense) throw fail('Expense not found.', 404); await memberOf(expense.group, req.user._id); ok(res, { expense }); }));
router.patch('/expenses/:id', [auth, validId, body('title').optional().trim().isLength({ min: 2, max: 120 }), body('amount').optional().isNumeric(), body('payer').optional().isMongoId(), body('participants').optional().isArray({ min: 1 }), body('category').optional().isIn(['Food', 'Transport', 'Stay', 'Shopping', 'Bills', 'Entertainment', 'Other']), body('date').optional().isISO8601(), validate], asyncRoute(async (req, res) => {
  const expense = await Expense.findById(req.params.id); if (!expense) throw fail('Expense not found.', 404); const group = await memberOf(expense.group, req.user._id); if (!isOwner(group, req.user._id) && id(expense.createdBy) !== id(req.user._id)) throw fail('Only the group owner or expense creator can edit this expense.', 403);
  const participants = (req.body.participants || expense.participants).map(id); const payer = id(req.body.payer || expense.payer); if (!group.members.some(m => id(m) === payer) || participants.some(uid => !group.members.some(m => id(m) === uid))) throw fail('Payer and participants must be group members.');
  const amountPaise = req.body.amount !== undefined ? paiseFromAmount(req.body.amount) : expense.amountPaise; const shares = makeShares(amountPaise, participants, req.body.shares);
  Object.assign(expense, { title: req.body.title ?? expense.title, amountPaise, payer, participants, shares, category: req.body.category ?? expense.category, date: req.body.date ? new Date(req.body.date) : expense.date, note: req.body.note ?? expense.note }); await expense.save(); await expense.populate(['payer', 'participants', 'shares.user', 'createdBy']); ok(res, { expense }, 'Expense updated.');
}));
router.delete('/expenses/:id', [auth, validId, validate], asyncRoute(async (req, res) => { const expense = await Expense.findById(req.params.id); if (!expense) throw fail('Expense not found.', 404); const group = await memberOf(expense.group, req.user._id); if (!isOwner(group, req.user._id) && id(expense.createdBy) !== id(req.user._id)) throw fail('Only the group owner or expense creator can delete this expense.', 403); await expense.deleteOne(); ok(res, {}, 'Expense deleted.'); }));

// Balances and settlement
router.get('/groups/:id/balances', [auth, validId, validate], asyncRoute(async (req, res) => { const group = await memberOf(req.params.id, req.user._id); const { balances } = await getBalances(group._id); const members = group.members.map(user => ({ user: userView(user), netPaise: balances.get(id(user)) || 0 })); ok(res, { members, transfers: suggestTransfers(balances) }); }));
router.get('/groups/:id/settlements', [auth, validId, validate], asyncRoute(async (req, res) => { await memberOf(req.params.id, req.user._id); const settlements = await Settlement.find({ group: req.params.id }).populate('from', 'name email').populate('to', 'name email').populate('recordedBy', 'name').sort({ createdAt: -1 }); ok(res, { settlements }); }));
router.post('/groups/:id/settlements', [auth, validId, body('from').isMongoId(), body('to').isMongoId(), body('amount').isNumeric(), body('note').optional().trim().isLength({ max: 200 }), validate], asyncRoute(async (req, res) => {
  const group = await memberOf(req.params.id, req.user._id); const from = id(req.body.from), to = id(req.body.to); if (from === to) throw fail('Payer and recipient must be different people.'); if (!group.members.some(m => id(m) === from) || !group.members.some(m => id(m) === to)) throw fail('Both people must be group members.'); const amountPaise = paiseFromAmount(req.body.amount);
  const { balances } = await getBalances(group._id); if ((balances.get(from) || 0) >= 0) throw fail('Selected payer does not currently owe money.'); if ((balances.get(to) || 0) <= 0) throw fail('Selected recipient is not currently owed money.'); if (amountPaise > Math.min(-(balances.get(from) || 0), balances.get(to) || 0)) throw fail('Settlement exceeds the current debt or credit.');
  const settlement = await Settlement.create({ group: group._id, from, to, amountPaise, recordedBy: req.user._id, note: req.body.note || '' }); await settlement.populate(['from', 'to', 'recordedBy']); ok(res, { settlement }, 'Settlement recorded and balances recalculated.', 201);
}));
router.get('/dashboard', auth, asyncRoute(async (req, res) => {
  const groups = await Group.find({ members: req.user._id }).select('name members owner type'); const groupIds = groups.map(g => g._id);
  const [spendAgg, recent, categoryAgg, monthlyAgg, settlementRows] = await Promise.all([
    Expense.aggregate([{ $match: { group: { $in: groupIds } } }, { $group: { _id: null, total: { $sum: '$amountPaise' }, count: { $sum: 1 } } }]),
    Expense.find({ group: { $in: groupIds } }).populate('payer', 'name').populate('group', 'name').sort({ date: -1 }).limit(6),
    Expense.aggregate([{ $match: { group: { $in: groupIds } } }, { $group: { _id: '$category', total: { $sum: '$amountPaise' } } }, { $sort: { total: -1 } }]),
    Expense.aggregate([{ $match: { group: { $in: groupIds }, date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amountPaise' } } }, { $sort: { _id: 1 } }]),
    Settlement.find({ group: { $in: groupIds } }).select('group from to amountPaise')
  ]);
  let owedPaise = 0; for (const g of groups) { const { balances } = await getBalances(g._id); owedPaise += balances.get(id(req.user)) < 0 ? -(balances.get(id(req.user))) : 0; }
  ok(res, { summary: { groupCount: groups.length, totalSpendPaise: spendAgg[0]?.total || 0, expenseCount: spendAgg[0]?.count || 0, outstandingPaise: owedPaise }, groups, recentExpenses: recent, byCategory: categoryAgg.map(x => ({ category: x._id, totalPaise: x.total })), monthly: monthlyAgg.map(x => ({ month: x._id, totalPaise: x.total })) });
}));
module.exports = router;
