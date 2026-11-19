import express from 'express';
import {
  getAnalyticsOverview,
  getDepartmentAnalytics,
  getMonthlyTrends,
  getDistributions
} from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/overview', getAnalyticsOverview);
router.get('/departments', getDepartmentAnalytics);
router.get('/trends', getMonthlyTrends);
router.get('/distributions', getDistributions);

export default router;
