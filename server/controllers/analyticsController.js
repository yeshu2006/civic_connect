import Issue, { DEPARTMENTS, SEVERITIES, STATUSES } from '../models/Issue.js';

/**
 * @route   GET /api/analytics/overview
 * @desc    Get high-level platform analytics
 * @access  Public / Authenticated
 */
export const getAnalyticsOverview = async (req, res, next) => {
  try {
    const [
      totalIssues,
      resolvedIssues,
      inProgressIssues,
      reportedIssues,
      verifiedIssues,
      rejectedIssues,
      criticalIssues,
      highIssues,
      topVotedIssues
    ] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ status: 'Resolved' }),
      Issue.countDocuments({ status: 'In Progress' }),
      Issue.countDocuments({ status: 'Reported' }),
      Issue.countDocuments({ status: 'Verified' }),
      Issue.countDocuments({ status: 'Rejected' }),
      Issue.countDocuments({ severity: 'Critical' }),
      Issue.countDocuments({ severity: 'High' }),
      Issue.find()
        .sort({ votes: -1 })
        .limit(5)
        .select('title department severity votes status createdAt location address')
        .lean()
    ]);

    const pendingIssues = reportedIssues + verifiedIssues;
    const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    res.status(200).json({
      success: true,
      overview: {
        totalIssues,
        resolvedIssues,
        inProgressIssues,
        pendingIssues,
        reportedIssues,
        verifiedIssues,
        rejectedIssues,
        criticalIssues,
        highIssues,
        resolutionRate
      },
      topVotedIssues
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/analytics/departments
 * @desc    Department-wise issue statistics & performance
 * @access  Public / Authenticated
 */
export const getDepartmentAnalytics = async (req, res, next) => {
  try {
    const rawStats = await Issue.aggregate([
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
          reported: {
            $sum: { $cond: [{ $eq: ['$status', 'Reported'] }, 1, 0] }
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'Verified'] }, 1, 0] }
          },
          critical: {
            $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
          },
          totalVotes: { $sum: '$votes' }
        }
      }
    ]);

    const statsMap = {};
    rawStats.forEach((s) => {
      statsMap[s._id] = s;
    });

    const departmentBreakdown = DEPARTMENTS.map((dept) => {
      const s = statsMap[dept] || {
        total: 0,
        resolved: 0,
        inProgress: 0,
        reported: 0,
        verified: 0,
        critical: 0,
        totalVotes: 0
      };
      return {
        department: dept,
        total: s.total,
        resolved: s.resolved,
        inProgress: s.inProgress,
        pending: s.reported + s.verified,
        critical: s.critical,
        totalVotes: s.totalVotes,
        resolutionRate: s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0
      };
    });

    res.status(200).json({
      success: true,
      departmentBreakdown
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/analytics/trends
 * @desc    Monthly reporting and resolution trends
 * @access  Public / Authenticated
 */
export const getMonthlyTrends = async (req, res, next) => {
  try {
    const now = new Date();
    const months = [];

    // Generate past 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });

      months.push({
        label,
        start: d,
        end: nextD
      });
    }

    const trends = await Promise.all(
      months.map(async (m) => {
        const [reportedCount, resolvedCount] = await Promise.all([
          Issue.countDocuments({
            createdAt: { $gte: m.start, $lt: m.end }
          }),
          Issue.countDocuments({
            'statusHistory.status': 'Resolved',
            'statusHistory.timestamp': { $gte: m.start, $lt: m.end }
          })
        ]);

        return {
          month: m.label,
          reported: reportedCount,
          resolved: resolvedCount
        };
      })
    );

    res.status(200).json({
      success: true,
      trends
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/analytics/status-distribution
 * @desc    Status and severity distributions
 * @access  Public / Authenticated
 */
export const getDistributions = async (req, res, next) => {
  try {
    const [statusData, severityData] = await Promise.all([
      Issue.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Issue.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const statusMap = {};
    statusData.forEach((d) => (statusMap[d._id] = d.count));

    const severityMap = {};
    severityData.forEach((d) => (severityMap[d._id] = d.count));

    const statusDistribution = STATUSES.map((s) => ({
      status: s,
      count: statusMap[s] || 0
    }));

    const severityDistribution = SEVERITIES.map((s) => ({
      severity: s,
      count: severityMap[s] || 0
    }));

    res.status(200).json({
      success: true,
      statusDistribution,
      severityDistribution
    });
  } catch (err) {
    next(err);
  }
};
