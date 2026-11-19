import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiActivity,
  FiArrowRight,
  FiLayers,
  FiTrendingUp,
  FiPlus
} from 'react-icons/fi';
import StatCard from '../components/StatCard.jsx';
import IssueCard from '../components/IssueCard.jsx';
import TrendChart from '../components/TrendChart.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { getAnalyticsOverview, getDepartmentAnalytics, getMonthlyTrends } from '../services/analyticsService.js';
import { getIssues } from '../services/issueService.js';
import { formatRelativeTime } from '../utils/formatters.js';

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [trends, setTrends] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [overviewRes, deptsRes, trendsRes, issuesRes] = await Promise.all([
          getAnalyticsOverview(),
          getDepartmentAnalytics(),
          getMonthlyTrends(),
          getIssues({ limit: 4, sortBy: 'newest' })
        ]);

        if (overviewRes.success) setOverview(overviewRes.overview);
        if (deptsRes.success) setDepartments(deptsRes.departmentBreakdown);
        if (trendsRes.success) setTrends(trendsRes.trends);
        if (issuesRes.success) setRecentIssues(issuesRes.issues);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading municipal dashboard metrics...</div>
      </div>
    );
  }

  const o = overview || {
    totalIssues: 0,
    reportedIssues: 0,
    pendingIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
    criticalIssues: 0,
    resolutionRate: 0
  };

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Civic Operations Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time municipal performance, issue tracking, and community reporting.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/map" className="btn btn-secondary btn-sm">
            Interactive Heatmap
          </Link>
          <Link to="/report" className="btn btn-primary btn-sm">
            <FiPlus size={14} /> Report an Issue
          </Link>
        </div>
      </div>

      {/* 5 Real MongoDB Metric Cards */}
      <div className="grid-5" style={{ marginBottom: 24 }}>
        <StatCard
          label="Total Issues"
          value={o.totalIssues}
          icon={FiActivity}
          subtext="Total tickets recorded"
        />
        <StatCard
          label="Reported"
          value={o.reportedIssues}
          icon={FiClock}
          color="var(--text-secondary)"
          subtext="Awaiting initial verification"
        />
        <StatCard
          label="Pending / Verified"
          value={o.pendingIssues}
          icon={FiAlertCircle}
          color="var(--info)"
          subtext="Scheduled for field work"
        />
        <StatCard
          label="In Progress"
          value={o.inProgressIssues}
          icon={FiActivity}
          color="var(--warning)"
          subtext="Active repair crews"
        />
        <StatCard
          label="Resolved"
          value={o.resolvedIssues}
          icon={FiCheckCircle}
          color="var(--success)"
          subtext={`${o.resolutionRate}% resolution efficiency`}
        />
      </div>

      {/* Visualizations Grid: Trends + Department Breakdown */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Monthly Trend Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Reporting & Resolution Trends</div>
              <div className="card-subtitle">Volume of newly logged issues vs municipal resolutions</div>
            </div>
            <FiTrendingUp size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <TrendChart data={trends} />
        </div>

        {/* Department Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Department Workload Distribution</div>
              <div className="card-subtitle">Resolution rate and volume by civic department</div>
            </div>
            <FiLayers size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {departments.slice(0, 5).map((dept) => {
              const maxDeptTotal = Math.max(...departments.map((d) => d.total), 1);
              const barPercent = Math.round((dept.total / maxDeptTotal) * 100);

              return (
                <div key={dept.department} style={{ fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                      {dept.department}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {dept.total} tickets ({dept.resolutionRate}% resolved)
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'var(--bg-subtle)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${barPercent}%`,
                        height: '100%',
                        backgroundColor: 'var(--primary)',
                        borderRadius: 3,
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Reported Issues Section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Recent Community Reports</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Latest civic incident reports submitted by citizens
            </p>
          </div>
          <Link to="/issues" className="btn btn-secondary btn-sm">
            View All Issues <FiArrowRight size={13} />
          </Link>
        </div>

        {recentIssues.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            No civic reports submitted yet.
          </div>
        ) : (
          <div className="grid-4">
            {recentIssues.map((issue) => (
              <IssueCard key={issue._id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
