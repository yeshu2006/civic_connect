const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
  status: { type: String, enum: ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Duplicate'], default: 'Pending' },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  address: { type: String },
  images: [{ type: String }], // Cloudinary URLs
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // For Duplicate handling
  
  // AI fields
  aiSummary: { type: String },
  aiCategory: { type: String },
  aiSeverity: { type: String },
  duplicateScore: { type: Number },
  duplicateIssueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
}, { timestamps: true });

issueSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Issue', issueSchema);
