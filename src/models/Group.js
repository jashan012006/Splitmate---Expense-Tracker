const mongoose = require('mongoose');
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 240, default: '' },
  type: { type: String, enum: ['Trip','Home','College','Event','Other'], default: 'Other' },
  currency: { type: String, default: 'INR', enum: ['INR'] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true, versionKey: false });
module.exports = mongoose.model('Group', groupSchema);
