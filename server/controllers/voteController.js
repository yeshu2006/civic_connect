import Vote from '../models/Vote.js';
import Issue from '../models/Issue.js';

/**
 * @route   POST /api/issues/:id/vote
 * @desc    Upvote/support an issue
 * @access  Private (citizens & users)
 */
export const voteIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const userId = req.user._id;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    // Check if user has already voted
    const existingVote = await Vote.findOne({ user: userId, issue: issueId });
    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already supported this civic issue.'
      });
    }

    // Create vote record
    await Vote.create({ user: userId, issue: issueId });

    // Atomically increment votes and add to supporters array
    const updatedIssue = await Issue.findByIdAndUpdate(
      issueId,
      {
        $inc: { votes: 1 },
        $addToSet: { supporters: userId }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Support added to issue.',
      votes: updatedIssue.votes,
      hasVoted: true
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/issues/:id/vote
 * @desc    Remove support/upvote from an issue
 * @access  Private
 */
export const unvoteIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const userId = req.user._id;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    const vote = await Vote.findOneAndDelete({ user: userId, issue: issueId });
    if (!vote) {
      return res.status(400).json({
        success: false,
        message: 'You have not voted for this issue yet.'
      });
    }

    // Decrement votes (not below 0) and remove from supporters
    const updatedIssue = await Issue.findByIdAndUpdate(
      issueId,
      {
        $inc: { votes: -1 },
        $pull: { supporters: userId }
      },
      { new: true }
    );

    // Ensure votes does not drop below 0
    if (updatedIssue.votes < 0) {
      updatedIssue.votes = 0;
      await updatedIssue.save();
    }

    res.status(200).json({
      success: true,
      message: 'Support removed from issue.',
      votes: updatedIssue.votes,
      hasVoted: false
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/issues/:id/vote-status
 * @desc    Check if current user has voted for issue
 * @access  Private
 */
export const getVoteStatus = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const userId = req.user._id;

    const vote = await Vote.findOne({ user: userId, issue: issueId });
    res.status(200).json({
      success: true,
      hasVoted: Boolean(vote)
    });
  } catch (err) {
    next(err);
  }
};
