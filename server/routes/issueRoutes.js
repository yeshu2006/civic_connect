import express from 'express';
import {
  createIssue,
  getIssues,
  getNearbyIssues,
  checkDuplicates,
  getIssueById,
  updateIssue,
  deleteIssue
} from '../controllers/issueController.js';
import { voteIssue, unvoteIssue, getVoteStatus } from '../controllers/voteController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { uploadOptionalImage } from '../middleware/upload.js';

const router = express.Router();

// Specific routes before :id
router.get('/nearby', getNearbyIssues);
router.post('/check-duplicates', checkDuplicates);

// Base issue routes
router.get('/', optionalAuth, getIssues);
router.post('/', authenticate, uploadOptionalImage, createIssue);

// Single issue routes
router.get('/:id', optionalAuth, getIssueById);
router.put('/:id', authenticate, updateIssue);
router.delete('/:id', authenticate, deleteIssue);

// Voting routes
router.post('/:id/vote', authenticate, voteIssue);
router.delete('/:id/vote', authenticate, unvoteIssue);
router.get('/:id/vote-status', authenticate, getVoteStatus);

export default router;
