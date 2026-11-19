import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { DEPARTMENTS } from '../utils/constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function SignupPage() {
  const { signup } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'citizen',
    department: '',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.role === 'department_admin' && !formData.department) {
      error('Please select an assigned department for administrator registration.');
      return;
    }

    setSubmitting(true);
    try {
      await signup(formData);
      success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      error(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 6 }}>Create an account</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 20 }}>
        Join your community to report and track municipal civic issues.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            name="name"
            className="form-input"
            required
            placeholder="Jane Doe"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email address</label>
          <input
            type="email"
            name="email"
            className="form-input"
            required
            placeholder="jane@domain.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            name="password"
            className="form-input"
            required
            minLength={6}
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Account Role</label>
          <select
            name="role"
            className="form-select"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="citizen">Citizen / Resident</option>
            <option value="department_admin">Department Administrator</option>
          </select>
        </div>

        {formData.role === 'department_admin' && (
          <div className="form-group">
            <label className="form-label">Assigned Department</label>
            <select
              name="department"
              className="form-select"
              required
              value={formData.department}
              onChange={handleChange}
            >
              <option value="">Select your municipal department...</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Contact Phone (Optional)</label>
          <input
            type="tel"
            name="phone"
            className="form-input"
            placeholder="+1 555-0123"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          disabled={submitting}
        >
          {submitting ? 'Creating account...' : 'Create Account'}
          <FiArrowRight size={14} />
        </button>
      </form>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
