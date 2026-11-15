const mongoose = require('mongoose');
const shareSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, amountPaise: { type: Number, required: true, min: 0 } }, { _id: false });
const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  amountPaise: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['Food','Transport','Stay','Shopping','Bills','Entertainment','Other'], default: 'Other' },
  date: { type: Date, required: true, default: Date.now },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  shares: { type: [shareSchema], required: true },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true, versionKey: false });
module.exports = mongoose.model('Expense', expenseSchema);
