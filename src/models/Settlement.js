const mongoose = require('mongoose');
const settlementSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amountPaise: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  status: { type: String, enum: ['confirmed'], default: 'confirmed' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true, maxlength: 200, default: '' }
}, { timestamps: true, versionKey: false });
module.exports = mongoose.model('Settlement', settlementSchema);
