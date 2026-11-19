import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Prevent duplicate voting from the same user on the same issue
voteSchema.index({ user: 1, issue: 1 }, { unique: true });
voteSchema.index({ issue: 1 });

const Vote = mongoose.model('Vote', voteSchema);
export default Vote;
