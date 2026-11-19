import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      success('Logged in successfully!');
      navigate('/dashboard');
    } catch (err) {
      error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setSubmitting(true);
    try {
      await login(demoEmail, demoPassword);
      success(`Signed in as demo user: ${demoEmail}`);
      navigate('/dashboard');
    } catch (err) {
      error(err.response?.data?.message || err.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 6 }}>Welcome back</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 20 }}>
        Sign in to access your civic dashboard and reports.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email address</label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              className="form-input"
              required
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          disabled={submitting}
        >
          {submitting ? 'Authenticating...' : 'Sign In'}
          <FiArrowRight size={14} />
        </button>
      </form>

      {/* Demo Credentials Fast Login */}
      <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 10 }}>
          Quick Demo Sign-In
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('superadmin@civicconnect.org', 'Password123!')}
            style={{ fontSize: '11.5px', justifyContent: 'flex-start' }}
          >
            🛡️ Super Admin
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('yeshwanth3006@gmail.com', 'Password123!')}
            style={{ fontSize: '11.5px', justifyContent: 'flex-start' }}
          >
            ⭐ Yeshwanth (Admin)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('roads.admin@civicconnect.org', 'Password123!')}
            style={{ fontSize: '11.5px', justifyContent: 'flex-start' }}
          >
            🚧 Roads Admin
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('water.admin@civicconnect.org', 'Password123!')}
            style={{ fontSize: '11.5px', justifyContent: 'flex-start' }}
          >
            💧 Water Admin
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('alex.citizen@gmail.com', 'Password123!')}
            style={{ fontSize: '11.5px', justifyContent: 'flex-start' }}
          >
            👤 Citizen Alex
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('citizen@test.com', 'Password123!')}
            style={{ fontSize: '11.5px', justifyContent: 'flex-start' }}
          >
            👤 Test Citizen
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Create an account
        </Link>
      </div>
    </div>
  );
}
