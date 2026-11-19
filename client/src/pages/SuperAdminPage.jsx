import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiShield,
  FiUsers,
  FiLayers,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiUserCheck,
  FiSearch
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StatCard from '../components/StatCard.jsx';
import { getDepartmentsSummary, getUsers, updateUserRole } from '../services/adminService.js';
import { getAnalyticsOverview } from '../services/analyticsService.js';
import { DEPARTMENTS, ROLES } from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function SuperAdminPage() {
  const { isSuperAdmin } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'users'
  const [departments, setDepartments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, overviewRes, usersRes] = await Promise.all([
        getDepartmentsSummary(),
        getAnalyticsOverview(),
        getUsers({ limit: 50 })
      ]);

      if (deptRes.success) setDepartments(deptRes.departments);
      if (overviewRes.success) setOverview(overviewRes.overview);
      if (usersRes.success) setUsers(usersRes.users);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
      error('Failed to load Super Admin portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const handleRoleChange = async (userId, newRole, dept = '') => {
    try {
      const res = await updateUserRole(userId, { role: newRole, department: dept });
      success(res.message);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole, department: dept } : u))
      );
    } catch (err) {
      error(err.response?.data?.message || 'Failed to update user role');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h3>Restricted Access</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          Only Super Administrators can access the platform governance portal.
        </p>
      </div>
    );
  }

  const o = overview || { totalIssues: 0, resolvedIssues: 0, criticalIssues: 0, resolutionRate: 0 };

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="page-container">
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 600, fontSize: '13px', marginBottom: 4 }}>
          <FiShield size={16} />
          <span>Super Admin Control Center</span>
        </div>
        <h1 style={{ marginBottom: 4 }}>Platform Governance & Municipal Oversight</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          System-wide oversight across all 8 municipal departments, user access control, and resolution SLA tracking.
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          label="Total Municipal Reports"
          value={o.totalIssues}
          icon={FiActivity}
          subtext="City-wide platform total"
        />
        <StatCard
          label="Overall Clearance"
          value={`${o.resolutionRate}%`}
          icon={FiCheckCircle}
          color="var(--success)"
          subtext={`${o.resolvedIssues} tickets resolved`}
        />
        <StatCard
          label="Critical Active Risks"
          value={o.criticalIssues}
          icon={FiAlertTriangle}
          color="var(--danger)"
          subtext="Requires expedited dispatch"
        />
        <StatCard
          label="Platform Users"
          value={users.length}
          icon={FiUsers}
          color="var(--info)"
          subtext="Registered citizens & admins"
        />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('departments')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'departments' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'departments' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'departments' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <FiLayers size={14} /> All Departments Performance
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'users' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <FiUserCheck size={14} /> User & Admin Management
        </button>
      </div>

      {/* Tab 1: Departments Performance Matrix */}
      {activeTab === 'departments' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Assigned Administrators</th>
                <th>Total Tickets</th>
                <th>Pending / Active</th>
                <th>Resolved</th>
                <th>Critical</th>
                <th>Clearance Rate</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.name}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13.5px' }}>
                    {dept.name}
                  </td>
                  <td>
                    {dept.admins && dept.admins.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dept.admins.map((admin) => (
                          <span key={admin._id} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {admin.name} ({admin.email})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11.5px', color: 'var(--warning-text)', background: 'var(--warning-bg)', padding: '2px 6px', borderRadius: 4 }}>
                        No Admin Assigned
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{dept.totalIssues}</td>
                  <td>
                    <span style={{ color: 'var(--warning)', fontWeight: 500 }}>
                      {dept.pendingIssues + dept.inProgressIssues}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {dept.resolvedIssues}
                    </span>
                  </td>
                  <td>
                    {dept.criticalIssues > 0 ? (
                      <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                        {dept.criticalIssues} Critical
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>0</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 80,
                          height: 6,
                          borderRadius: 3,
                          background: 'var(--bg-subtle)',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${dept.resolutionRate}%`,
                            height: '100%',
                            background: dept.resolutionRate > 50 ? 'var(--success)' : 'var(--primary)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {dept.resolutionRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: User & Admin Management */}
      {activeTab === 'users' && (
        <div>
          <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <FiSearch
                size={14}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 34, fontSize: '13px' }}
                placeholder="Search user accounts by name or email address..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User / Email</th>
                  <th>Registered</th>
                  <th>Current Role</th>
                  <th>Assigned Department</th>
                  <th style={{ textAlign: 'right' }}>Role Governance</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{u.email}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          background:
                            u.role === 'super_admin'
                              ? '#171717'
                              : u.role === 'department_admin'
                              ? 'var(--primary-light)'
                              : '#F4F4F5',
                          color:
                            u.role === 'super_admin'
                              ? '#FFFFFF'
                              : u.role === 'department_admin'
                              ? 'var(--primary)'
                              : 'var(--text-secondary)'
                        }}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {u.role === 'department_admin' ? (
                        <select
                          className="form-select"
                          style={{ padding: '3px 8px', fontSize: '11.5px', width: 'auto' }}
                          value={u.department || ''}
                          onChange={(e) => handleRoleChange(u._id, u.role, e.target.value)}
                        >
                          <option value="">Select Dept...</option>
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select
                        className="form-select"
                        style={{ padding: '3px 8px', fontSize: '11.5px', width: 'auto' }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value, u.department)}
                      >
                        <option value="citizen">Citizen</option>
                        <option value="department_admin">Department Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
