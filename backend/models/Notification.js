const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['Issue Assigned', 'Issue Resolved', 'Duplicate Found', 'Comment Added', 'Status Updated', 'System'], default: 'System' },
  isRead: { type: Boolean, default: false },
  link: { type: String }, // Optional link (e.g., to issue)
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
