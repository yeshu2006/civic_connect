import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiAlertCircle, FiFileText } from 'react-icons/fi';
import IssueCard from '../components/IssueCard.jsx';
import { getIssues } from '../services/issueService.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function MyReportsPage() {
  const { user, isAuthenticated } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMyIssues = async () => {
      setLoading(true);
      try {
        const res = await getIssues({ myReports: 'true', limit: 20 });
        if (res.success) {
          setIssues(res.issues);
        }
      } catch (err) {
        console.error('Failed to load user reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyIssues();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h3>Sign in required</h3>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
          Please sign in to view and track your submitted civic issue reports.
        </p>
        <Link to="/login" className="btn btn-primary btn-sm">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>My Civic Reports</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Issues you have submitted to municipal authorities ({issues.length} reports).
          </p>
        </div>
        <Link to="/report" className="btn btn-primary btn-sm">
          <FiPlus size={14} /> Report New Issue
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Loading your reports...
        </div>
      ) : issues.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--text-secondary)'
          }}
        >
          <FiFileText size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
          <h3 style={{ fontSize: '15px', color: 'var(--text-main)', marginBottom: 4 }}>
            You haven't submitted any reports yet
          </h3>
          <p style={{ fontSize: '13px', marginBottom: 16 }}>
            Notice a pothole, broken streetlight, or water leak? Submit your first report with photo and GPS location.
          </p>
          <Link to="/report" className="btn btn-primary btn-sm">
            <FiPlus size={14} /> Report an Issue
          </Link>
        </div>
      ) : (
        <div className="grid-4">
          {issues.map((issue) => (
            <IssueCard key={issue._id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
