import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiGrid,
  FiPlusCircle,
  FiList,
  FiMap,
  FiFileText,
  FiUser,
  FiBriefcase,
  FiCheckSquare,
  FiUsers,
  FiBarChart2,
  FiLayers
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isCitizen, isDeptAdmin, isSuperAdmin } = useAuth();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">C</div>
        <span>CivicConnect</span>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">General</div>

        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <FiGrid size={16} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/report"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <FiPlusCircle size={16} />
          <span>Report an Issue</span>
        </NavLink>

        <NavLink
          to="/issues"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <FiList size={16} />
          <span>All Issues</span>
        </NavLink>

        <NavLink
          to="/map"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <FiMap size={16} />
          <span>Nearby & Heatmap</span>
        </NavLink>

        <NavLink
          to="/my-reports"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <FiFileText size={16} />
          <span>My Reports</span>
        </NavLink>

        {/* Department Admin Section */}
        {isDeptAdmin && (
          <>
            <div className="sidebar-section-title">Department Admin</div>
            <NavLink
              to="/department-overview"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <FiBriefcase size={16} />
              <span>Department Hub</span>
            </NavLink>
            <NavLink
              to="/manage-issues"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <FiCheckSquare size={16} />
              <span>Manage Issues</span>
            </NavLink>
          </>
        )}

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <>
            <div className="sidebar-section-title">Super Admin Portal</div>
            <NavLink
              to="/admin/departments"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <FiLayers size={16} />
              <span>All Departments</span>
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <FiUsers size={16} />
              <span>User Management</span>
            </NavLink>
            <NavLink
              to="/admin/analytics"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <FiBarChart2 size={16} />
              <span>Platform Analytics</span>
            </NavLink>
          </>
        )}

        <div className="sidebar-section-title">Account</div>

        <NavLink
          to="/profile"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <FiUser size={16} />
          <span>Profile</span>
        </NavLink>
      </nav>

      {/* User Footer Profile */}
      {user && (
        <div className="sidebar-footer">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              border: '1px solid var(--primary-border)'
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {user.role.replace('_', ' ')}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
