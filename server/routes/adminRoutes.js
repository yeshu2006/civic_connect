import express from 'express';
import {
  getAdminDashboardStats,
  getAdminIssues,
  updateIssueStatus,
  updateIssueSeverity,
  assignIssue,
  getUsers,
  updateUserRole,
  getDepartmentsSummary
} from '../controllers/adminController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { uploadOptionalImage } from '../middleware/upload.js';

const router = express.Router();

// All admin routes require authentication and at least department_admin or super_admin
router.use(authenticate, authorizeRoles('department_admin', 'super_admin'));

router.get('/dashboard', getAdminDashboardStats);
router.get('/issues', getAdminIssues);
router.patch('/issues/:id/status', uploadOptionalImage, updateIssueStatus);
router.patch('/issues/:id/severity', updateIssueSeverity);
router.patch('/issues/:id/assign', assignIssue);
router.get('/departments-summary', getDepartmentsSummary);

// Super admin only routes
router.get('/users', authorizeRoles('super_admin'), getUsers);
router.patch('/users/:id/role', authorizeRoles('super_admin'), updateUserRole);

export default router;
