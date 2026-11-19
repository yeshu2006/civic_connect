import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiMapPin,
  FiClock,
  FiUser,
  FiThumbsUp,
  FiEdit,
  FiTrash2,
  FiCheckCircle,
  FiArrowLeft,
  FiShield,
  FiLayers
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import LeafletMap from '../components/LeafletMap.jsx';
import StatusUpdateModal from '../components/StatusUpdateModal.jsx';
import { getIssueById, voteIssue, unvoteIssue, deleteIssue } from '../services/issueService.js';
import { updateIssueSeverity } from '../services/adminService.js';
import { SEVERITIES } from '../utils/constants.js';
import { formatDate, formatDateTime, getAssetUrl } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isSuperAdmin, isDeptAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [voting, setVoting] = useState(false);

  const fetchIssue = async () => {
    try {
      const res = await getIssueById(id);
      if (res.success) {
        setIssue(res.issue);
      }
    } catch (err) {
      console.error('Failed to load issue:', err);
      error('Could not load issue ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [id]);

  const handleVoteToggle = async () => {
    if (!isAuthenticated) {
      info('Please sign in to support this civic issue.');
      return;
    }
    if (voting) return;
    setVoting(true);

    try {
      if (issue.hasVoted) {
        const res = await unvoteIssue(issue._id);
        setIssue((prev) => ({ ...prev, votes: res.votes, hasVoted: false }));
        success('Support removed.');
      } else {
        const res = await voteIssue(issue._id);
        setIssue((prev) => ({ ...prev, votes: res.votes, hasVoted: true }));
        success('You supported this issue!');
      }
    } catch (err) {
      error(err.response?.data?.message || 'Vote failed');
    } finally {
      setVoting(false);
    }
  };

  const handleSeverityChange = async (e) => {
    const newSeverity = e.target.value;
    try {
      await updateIssueSeverity(issue._id, newSeverity);
      success(`Severity updated to ${newSeverity}`);
      fetchIssue();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to update severity');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this civic report? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteIssue(issue._id);
      success('Issue ticket deleted successfully.');
      navigate('/issues');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to delete issue');
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        Loading issue report details...
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h3>Civic issue not found</h3>
        <Link to="/issues" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
          Back to All Issues
        </Link>
      </div>
    );
  }

  const isReporter = user?._id && issue.reportedBy?._id && user._id === issue.reportedBy._id;
  const canManage = isSuperAdmin || (isDeptAdmin && user.department === issue.department);
  const canDelete = isSuperAdmin || (isReporter && issue.status === 'Reported');
  const [lon, lat] = issue.location?.coordinates || [-122.4194, 37.7749];

  return (
    <div className="page-container" style={{ maxWidth: 1040 }}>
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/issues"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '13px',
            color: 'var(--text-secondary)'
          }}
        >
          <FiArrowLeft size={14} /> Back to all issues
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <FiLayers size={14} /> {issue.department}
            </span>
            <span style={{ color: 'var(--border-dark)' }}>•</span>
            <StatusBadge status={issue.status} />
            <SeverityBadge severity={issue.severity} />
          </div>

          {/* Voting Action */}
          <button
            onClick={handleVoteToggle}
            disabled={voting}
            className="btn btn-sm"
            style={{
              border: issue.hasVoted ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: issue.hasVoted ? 'var(--primary-light)' : '#FFFFFF',
              color: issue.hasVoted ? 'var(--primary)' : 'var(--text-main)',
              fontWeight: 600
            }}
          >
            <FiThumbsUp size={13} />
            <span>{issue.hasVoted ? 'Supported' : 'Support Issue'}</span>
            <span style={{ opacity: 0.8 }}>({issue.votes || 0})</span>
          </button>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
          {issue.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '12.5px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <FiClock size={13} />
            <span>Reported {formatDate(issue.createdAt)}</span>
          </div>
          {issue.reportedBy?.name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <FiUser size={13} />
              <span>By {issue.reportedBy.name}</span>
            </div>
          )}
          {issue.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <FiMapPin size={13} />
              <span>{issue.address}</span>
            </div>
          )}
        </div>

        {/* Visual Progress Bar (Reported -> Verified -> In Progress -> Resolved) */}
        <ProgressBar status={issue.status} />
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
        {/* Left Column: Description, Media & Location */}
        <div>
          {/* Photos */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div className="card-title">Incident Evidence</div>
            </div>

            {issue.imageUrl ? (
              <img
                src={getAssetUrl(issue.imageUrl)}
                alt={issue.title}
                style={{
                  width: '100%',
                  maxHeight: 380,
                  objectFit: 'cover',
                  borderRadius: 8,
                  marginBottom: 16
                }}
              />
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No photo attached with report.
              </div>
            )}

            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 6 }}>Description</div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {issue.description}
            </p>

            {/* AI Analysis Badges if available */}
            {issue.aiAnalysis?.confidence > 0 && (
              <div
                style={{
                  marginTop: 18,
                  padding: '12px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>
                  <FiShield size={14} /> AI Classification Diagnostic
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Detected category: <strong>{issue.aiAnalysis.suggestedDepartment || issue.department}</strong> ({Math.round(issue.aiAnalysis.confidence * 100)}% match confidence).
                </div>
              </div>
            )}
          </div>

          {/* Location Map */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Geographical Location</div>
                <div className="card-subtitle">GPS: [{lat.toFixed(5)}, {lon.toFixed(5)}]</div>
              </div>
            </div>

            <LeafletMap
              height="240px"
              center={[lat, lon]}
              zoom={15}
              issues={[issue]}
              selectedIssue={issue}
            />

            {issue.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                <FiMapPin size={14} style={{ color: 'var(--primary)' }} />
                <span>{issue.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timeline & Admin Controls */}
        <div>
          {/* Admin Action Box */}
          {canManage && (
            <div
              className="card"
              style={{
                marginBottom: 24,
                border: '1px solid var(--primary-border)',
                background: '#FFFBF7'
              }}
            >
              <div className="card-header" style={{ borderBottomColor: 'var(--primary-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiShield size={16} style={{ color: 'var(--primary)' }} />
                  <span className="card-title" style={{ color: 'var(--primary)' }}>
                    Municipal Administration
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={() => setStatusModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  <FiEdit size={14} /> Update Issue Status & Timeline
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Modify Severity:</label>
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                    value={issue.severity}
                    onChange={handleSeverityChange}
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Resolution Evidence Box (if resolved) */}
          {issue.status === 'Resolved' && (
            <div
              className="card"
              style={{
                marginBottom: 24,
                border: '1px solid var(--success-border)',
                background: '#F0FDF4'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success-text)', fontWeight: 600, marginBottom: 8 }}>
                <FiCheckCircle size={16} /> Official Resolution Details
              </div>
              <p style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5, marginBottom: 10 }}>
                {issue.resolutionNotes || 'Remedial works completed by municipal maintenance staff.'}
              </p>
              {issue.resolutionImageUrl && (
                <img
                  src={getAssetUrl(issue.resolutionImageUrl)}
                  alt="Resolution proof"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6 }}
                />
              )}
            </div>
          )}

          {/* Status Timeline History */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Status Audit Timeline</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
              {(issue.statusHistory || []).map((hist, idx) => (
                <div
                  key={hist._id || idx}
                  style={{
                    display: 'flex',
                    gap: 12,
                    fontSize: '12.5px',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      marginTop: 4,
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {hist.status}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {formatDateTime(hist.timestamp)}
                      </span>
                    </div>
                    {hist.note && (
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4, margin: '2px 0 4px' }}>
                        {hist.note}
                      </p>
                    )}
                    {hist.updatedByName && (
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Updated by {hist.updatedByName}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delete Action (if authorized) */}
          {canDelete && (
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <button
                onClick={handleDelete}
                className="btn btn-danger btn-sm"
              >
                <FiTrash2 size={13} /> Delete Issue Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={statusModalOpen}
        issue={issue}
        onClose={() => setStatusModalOpen(false)}
        onUpdated={(updated) => setIssue(updated)}
      />
    </div>
  );
}
