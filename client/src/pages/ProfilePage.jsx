import React, { useState } from 'react';
import { FiUser, FiMail, FiPhone, FiShield, FiSave } from 'react-icons/fi';
import api from '../services/api.js';
import { formatDate } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ProfilePage() {
  const { user, updateUser, isAuthenticated } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h3>Sign in required</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          Please sign in to view and manage your profile settings.
        </p>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { name, phone });
      if (res.data.success) {
        updateUser(res.data.user);
        success('Profile updated successfully.');
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Account Settings & Profile</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Manage your contact credentials and view municipal role authorization.
        </p>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--primary-light)',
                border: '1.5px solid var(--primary-border)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{user?.name}</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Member since {formatDate(user?.createdAt)}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Read-only)</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="+1 555-0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div
            style={{
              marginTop: 18,
              padding: '14px',
              borderRadius: '8px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                Access Level & Sector
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Role: <strong style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</strong>
                {user?.department && ` • Department: ${user.department}`}
              </div>
            </div>
            <FiShield size={18} style={{ color: 'var(--primary)' }} />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 20 }}
            disabled={saving}
          >
            <FiSave size={14} />
            {saving ? 'Saving changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
