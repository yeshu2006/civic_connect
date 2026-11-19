import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBriefcase,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiEdit,
  FiFilter,
  FiShield
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusUpdateModal from '../components/StatusUpdateModal.jsx';
import { getAdminDashboard, getAdminIssues, updateIssueSeverity } from '../services/adminService.js';
import { STATUSES, SEVERITIES } from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function DepartmentOverviewPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Status Modal
  const [selectedIssueForUpdate, setSelectedIssueForUpdate] = useState(null);

  const fetchDepartmentData = async () => {
    setLoading(true);
    try {
      const [dashRes, issuesRes] = await Promise.all([
        getAdminDashboard(),
        getAdminIssues({
          status: statusFilter,
          severity: severityFilter,
          search,
          limit: 25
        })
      ]);

      if (dashRes.success) setStats(dashRes.stats);
      if (issuesRes.success) setIssues(issuesRes.issues);
    } catch (err) {
      console.error('Failed to load department admin dashboard:', err);
      error(err.response?.data?.message || 'Failed to load department records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentData();
  }, [statusFilter, severityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDepartmentData();
  };

  const handleQuickSeverity = async (issueId, newSev) => {
    try {
      await updateIssueSeverity(issueId, newSev);
      success(`Severity updated to ${newSev}`);
      setIssues((prev) =>
        prev.map((i) => (i._id === issueId ? { ...i, severity: newSev } : i))
      );
    } catch (err) {
      error(err.response?.data?.message || 'Failed to update severity');
    }
  };

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 600, fontSize: '13px', marginBottom: 4 }}>
          <FiShield size={15} />
          <span>Department Operations Control</span>
        </div>
        <h1 style={{ marginBottom: 4 }}>
          {user?.department || 'Department'} Queue & Administration
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Manage incident intake, assign priority, verify evidence, and log remedial repairs for {user?.department || 'your sector'}.
        </p>
      </div>

      {/* Department KPI Stats */}
      {stats && (
        <div className="grid-5" style={{ marginBottom: 24 }}>
          <StatCard
            label="Total Dept Tickets"
            value={stats.total}
            icon={FiBriefcase}
            subtext="Department workload"
          />
          <StatCard
            label="Pending Action"
            value={stats.reported + stats.verified}
            icon={FiClock}
            color="var(--info)"
            subtext="Requires verification"
          />
          <StatCard
            label="Active Works"
            value={stats.inProgress}
            icon={FiClock}
            color="var(--warning)"
            subtext="Field crews dispatched"
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            icon={FiCheckCircle}
            color="var(--success)"
            subtext={`${stats.resolutionRate}% department clearance`}
          />
          <StatCard
            label="Critical / High"
            value={stats.critical + stats.high}
            icon={FiAlertTriangle}
            color="var(--danger)"
            subtext="Urgent public hazards"
          />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: 240, display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search tickets by title, address, or reporter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '13px' }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              <FiSearch size={13} />
            </button>
          </form>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '12.5px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '12.5px' }}
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              {SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {sev}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Issues Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ticket & Issue</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Location</th>
              <th>Reported</th>
              <th>Votes</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                  Loading department queue...
                </td>
              </tr>
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                  No tickets found matching the specified filters.
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                <tr key={issue._id}>
                  <td style={{ maxWidth: 280 }}>
                    <Link
                      to={`/issues/${issue._id}`}
                      style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}
                      className="hover-underline"
                    >
                      {issue.title}
                    </Link>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Reporter: {issue.reportedBy?.name || 'Citizen'}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={issue.status} />
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ padding: '3px 8px', fontSize: '11.5px', width: 'auto' }}
                      value={issue.severity}
                      onChange={(e) => handleQuickSeverity(issue._id, e.target.value)}
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {issue.address || 'GPS Coordinate Pinned'}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {formatDate(issue.createdAt)}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '12.5px' }}>
                    {issue.votes || 0}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        onClick={() => setSelectedIssueForUpdate(issue)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title="Update status"
                      >
                        <FiEdit size={12} /> Status
                      </button>
                      <Link
                        to={`/issues/${issue._id}`}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Status Update Modal */}
      {selectedIssueForUpdate && (
        <StatusUpdateModal
          isOpen={Boolean(selectedIssueForUpdate)}
          issue={selectedIssueForUpdate}
          onClose={() => setSelectedIssueForUpdate(null)}
          onUpdated={(updated) => {
            setIssues((prev) =>
              prev.map((i) => (i._id === updated._id ? updated : i))
            );
            fetchDepartmentData();
          }}
        />
      )}
    </div>
  );
}
