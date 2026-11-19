import mongoose from 'mongoose';
import { DEPARTMENTS } from './User.js';

export { DEPARTMENTS };
export const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
export const STATUSES = ['Reported', 'Verified', 'In Progress', 'Resolved', 'Rejected'];

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: STATUSES,
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedByName: {
      type: String,
      default: ''
    },
    note: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      maxlength: [160, 'Title cannot exceed 160 characters']
    },
    description: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true
    },
    imageUrl: {
      type: String,
      default: ''
    },
    cloudinaryPublicId: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    department: {
      type: String,
      enum: DEPARTMENTS,
      required: [true, 'Department is required']
    },
    severity: {
      type: String,
      enum: SEVERITIES,
      default: 'Medium'
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'Reported'
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      // GeoJSON: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: [true, 'Location coordinates are required'],
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message: 'Coordinates must be [longitude (-180..180), latitude (-90..90)]'
        }
      }
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required']
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    votes: {
      type: Number,
      default: 0,
      min: 0
    },
    supporters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    statusHistory: [statusHistorySchema],
    resolutionNotes: {
      type: String,
      default: ''
    },
    resolutionImageUrl: {
      type: String,
      default: ''
    },
    aiAnalysis: {
      model: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      confidenceScore: { type: Number, default: 0 },
      similarityPercent: { type: Number, default: 0 },
      similarityLevel: { type: String, default: '' },
      predictedCategory: { type: String, default: '' },
      isConfirmedByUser: { type: Boolean, default: false },
      deviceUsed: { type: String, default: '' },
      suggestedTitle: { type: String, default: '' },
      suggestedDepartment: { type: String, default: '' },
      suggestedSeverity: { type: String, default: '' },
      summary: { type: String, default: '' },
      detectedTags: [{ type: String }]
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance and geospatial queries
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ department: 1, status: 1 });
issueSchema.index({ status: 1 });
issueSchema.index({ severity: 1 });
issueSchema.index({ votes: -1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ reportedBy: 1 });

const Issue = mongoose.model('Issue', issueSchema);
export default Issue;
