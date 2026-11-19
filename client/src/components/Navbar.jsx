import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiPlus, FiLogOut, FiLogIn } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ onToggleSidebar }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', padding: '6px 8px' }}
          aria-label="Toggle Navigation"
        >
          <FiMenu size={16} />
        </button>

        {user?.department && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              border: '1px solid var(--primary-border)'
            }}
          >
            {user.department} Dept
          </span>
        )}

        {user?.role === 'super_admin' && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '20px',
              background: '#171717',
              color: '#FFFFFF',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            Super Admin
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/report" className="btn btn-primary btn-sm">
          <FiPlus size={14} />
          <span>Report Issue</span>
        </Link>

        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            style={{ borderColor: 'var(--border)' }}
            title="Sign out"
          >
            <FiLogOut size={14} />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link to="/login" className="btn btn-secondary btn-sm">
            <FiLogIn size={14} />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
