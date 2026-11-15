const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  password: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });
module.exports = mongoose.model('User', userSchema);
