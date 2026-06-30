const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String },
  role: { type: String, enum: ['Citizen', 'Officer', 'Admin'], default: 'Citizen' },
  phone: { type: String },
  trustScore: { type: Number, default: 100 },
  badges: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
