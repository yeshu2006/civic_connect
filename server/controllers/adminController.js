import Issue, { DEPARTMENTS, SEVERITIES, STATUSES } from '../models/Issue.js';
import User from '../models/User.js';
import { uploadImageToStorage } from '../config/cloudinary.js';

/**
 * Checks if current user has permission to manage given issue
 */
function checkIssueDepartmentPermission(user, issue) {
  if (user.role === 'super_admin') return true;
  if (user.role === 'department_admin' && user.department === issue.department) return true;
  return false;
}

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics for admin (department scoped for dept admin, platform for super admin)
 * @access  Private (Department Admin, Super Admin)
 */
export const getAdminDashboardStats = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const filter = isSuperAdmin ? {} : { department: req.user.department };

    const [
      total,
      reported,
      verified,
      inProgress,
      resolved,
      rejected,
      critical,
      high,
      departmentStats,
      recentIssues
    ] = await Promise.all([
      Issue.countDocuments(filter),
      Issue.countDocuments({ ...filter, status: 'Reported' }),
      Issue.countDocuments({ ...filter, status: 'Verified' }),
      Issue.countDocuments({ ...filter, status: 'In Progress' }),
      Issue.countDocuments({ ...filter, status: 'Resolved' }),
      Issue.countDocuments({ ...filter, status: 'Rejected' }),
      Issue.countDocuments({ ...filter, severity: 'Critical' }),
      Issue.countDocuments({ ...filter, severity: 'High' }),
      Issue.aggregate([
        ...(isSuperAdmin ? [] : [{ $match: { department: req.user.department } }]),
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
            },
            pending: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['Reported', 'Verified']] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { total: -1 } }
      ]),
      Issue.find(filter)
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('reportedBy', 'name email avatarUrl')
        .populate('assignedTo', 'name')
        .lean()
    ]);

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    res.status(200).json({
      success: true,
      stats: {
        total,
        reported,
        verified,
        inProgress,
        resolved,
        rejected,
        critical,
        high,
        resolutionRate,
        department: isSuperAdmin ? 'All Departments' : req.user.department,
        isSuperAdmin
      },
      departmentStats,
      recentIssues
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/admin/issues
 * @desc    Get admin issues list with role-based department enforcement
 * @access  Private (Department Admin, Super Admin)
 */
export const getAdminIssues = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const {
      status,
      severity,
      search,
      department,
      page = 1,
      limit = 15,
      sortBy = 'newest'
    } = req.query;

    const query = {};

    // Department filtering: enforced strictly for dept admin
    if (!isSuperAdmin) {
      query.department = req.user.department;
    } else if (department && department !== 'all') {
      query.department = department;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { address: searchRegex }
      ];
    }

    let sort = { createdAt: -1 };
    if (sortBy === 'votes') sort = { votes: -1 };
    else if (sortBy === 'severity') sort = { severity: -1, createdAt: -1 };
    else if (sortBy === 'oldest') sort = { createdAt: 1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const [issues, total] = await Promise.all([
      Issue.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('reportedBy', 'name email avatarUrl phone')
        .populate('assignedTo', 'name email department')
        .lean(),
      Issue.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: issues.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      issues
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/admin/issues/:id/status
 * @desc    Update issue status with timeline history & resolution evidence
 * @access  Private (Department Admin, Super Admin)
 */
export const updateIssueStatus = async (req, res, next) => {
  try {
    const { status, note = '', resolutionNotes = '', resolutionImageUrl = '' } = req.body;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${STATUSES.join(', ')}`
      });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    if (!checkIssueDepartmentPermission(req.user, issue)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You only have authority over '${req.user.department}' issues.`
      });
    }

    if (status === 'Rejected' && !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason note is required when rejecting an issue.'
      });
    }

    // Optional resolution image from upload or body
    let finalResolutionImg = resolutionImageUrl || issue.resolutionImageUrl;
    if (req.file) {
      const uploadResult = await uploadImageToStorage(
        req.file.buffer,
        req.file.originalname,
        'civicconnect/resolutions'
      );
      finalResolutionImg = uploadResult.url;
    }

    // Append to status history
    const historyItem = {
      status,
      updatedBy: req.user._id,
      updatedByName: req.user.name,
      note: note.trim() || `Status changed from ${issue.status} to ${status}.`,
      timestamp: new Date()
    };

    issue.status = status;
    issue.statusHistory.push(historyItem);

    if (status === 'Resolved') {
      if (resolutionNotes) issue.resolutionNotes = resolutionNotes.trim();
      if (finalResolutionImg) issue.resolutionImageUrl = finalResolutionImg;
    }

    await issue.save();

    const updatedIssue = await Issue.findById(issue._id)
      .populate('reportedBy', 'name email avatarUrl')
      .populate('assignedTo', 'name email department')
      .populate('statusHistory.updatedBy', 'name role department');

    res.status(200).json({
      success: true,
      message: `Issue status successfully updated to '${status}'.`,
      issue: updatedIssue
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/admin/issues/:id/severity
 * @desc    Update issue severity level
 * @access  Private (Department Admin, Super Admin)
 */
export const updateIssueSeverity = async (req, res, next) => {
  try {
    const { severity } = req.body;

    if (!SEVERITIES.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: `Invalid severity. Must be one of: ${SEVERITIES.join(', ')}`
      });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    if (!checkIssueDepartmentPermission(req.user, issue)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You only have authority over '${req.user.department}' issues.`
      });
    }

    const oldSeverity = issue.severity;
    issue.severity = severity;

    issue.statusHistory.push({
      status: issue.status,
      updatedBy: req.user._id,
      updatedByName: req.user.name,
      note: `Severity reassessed from ${oldSeverity} to ${severity}.`,
      timestamp: new Date()
    });

    await issue.save();

    res.status(200).json({
      success: true,
      message: `Severity successfully updated to ${severity}.`,
      issue
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/admin/issues/:id/assign
 * @desc    Assign issue to an administrator
 * @access  Private (Department Admin, Super Admin)
 */
export const assignIssue = async (req, res, next) => {
  try {
    const { assignedToId } = req.body;

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    if (!checkIssueDepartmentPermission(req.user, issue)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You only have authority over '${req.user.department}' issues.`
      });
    }

    let assignedAdmin = null;
    if (assignedToId) {
      assignedAdmin = await User.findById(assignedToId);
      if (!assignedAdmin) {
        return res.status(404).json({ success: false, message: 'Assigned user not found.' });
      }
    }

    issue.assignedTo = assignedToId || null;

    issue.statusHistory.push({
      status: issue.status,
      updatedBy: req.user._id,
      updatedByName: req.user.name,
      note: assignedAdmin
        ? `Issue assigned to ${assignedAdmin.name} (${assignedAdmin.department || assignedAdmin.role}).`
        : 'Issue unassigned.',
      timestamp: new Date()
    });

    await issue.save();

    const populated = await Issue.findById(issue._id)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email department');

    res.status(200).json({
      success: true,
      message: assignedAdmin ? `Assigned to ${assignedAdmin.name}.` : 'Issue unassigned.',
      issue: populated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/admin/users
 * @desc    Get user management list (Super Admin only)
 * @access  Private (Super Admin)
 */
export const getUsers = async (req, res, next) => {
  try {
    const { role, department, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role && role !== 'all') query.role = role;
    if (department && department !== 'all') query.department = department;
    if (search && search.trim() !== '') {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ name: reg }, { email: reg }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      users
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Change user role and department (Super Admin only)
 * @access  Private (Super Admin)
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { role, department } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (role) user.role = role;
    if (department !== undefined) user.department = department;

    await user.save();

    res.status(200).json({
      success: true,
      message: `User role updated to '${user.role}'${user.department ? ` (${user.department})` : ''}.`,
      user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/admin/departments-summary
 * @desc    Get all departments with their assigned admins and stats (Super Admin)
 * @access  Private (Super Admin, Dept Admin)
 */
export const getDepartmentsSummary = async (req, res, next) => {
  try {
    const deptAdmins = await User.find({ role: 'department_admin' })
      .select('name email department')
      .lean();

    const counts = await Issue.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
          },
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', ['Reported', 'Verified']] }, 1, 0]
            }
          },
          critical: {
            $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
          }
        }
      }
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c;
    });

    const summary = DEPARTMENTS.map((dept) => {
      const c = countMap[dept] || { total: 0, resolved: 0, inProgress: 0, pending: 0, critical: 0 };
      const admins = deptAdmins.filter((a) => a.department === dept);
      return {
        name: dept,
        totalIssues: c.total,
        resolvedIssues: c.resolved,
        inProgressIssues: c.inProgress,
        pendingIssues: c.pending,
        criticalIssues: c.critical,
        resolutionRate: c.total > 0 ? Math.round((c.resolved / c.total) * 100) : 0,
        admins
      };
    });

    res.status(200).json({
      success: true,
      departments: summary
    });
  } catch (err) {
    next(err);
  }
};
