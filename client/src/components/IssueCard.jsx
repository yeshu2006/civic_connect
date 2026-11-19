import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiClock, FiThumbsUp, FiArrowUpRight, FiLayers } from 'react-icons/fi';
import StatusBadge from './StatusBadge.jsx';
import SeverityBadge from './SeverityBadge.jsx';
import { formatRelativeTime, getAssetUrl } from '../utils/formatters.js';
import { voteIssue, unvoteIssue } from '../services/issueService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function IssueCard({ issue, onVoteChange }) {
  const { isAuthenticated } = useAuth();
  const { error, info } = useToast();
  const [hasVoted, setHasVoted] = useState(issue.hasVoted || false);
  const [votesCount, setVotesCount] = useState(issue.votes || 0);
  const [voting, setVoting] = useState(false);

  const handleVoteToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      info('Please sign in to support this civic issue.');
      return;
    }

    if (voting) return;
    setVoting(true);

    try {
      if (hasVoted) {
        const res = await unvoteIssue(issue._id);
        setHasVoted(false);
        setVotesCount(res.votes);
        if (onVoteChange) onVoteChange(issue._id, res.votes, false);
      } else {
        const res = await voteIssue(issue._id);
        setHasVoted(true);
        setVotesCount(res.votes);
        if (onVoteChange) onVoteChange(issue._id, res.votes, true);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to update vote');
    } finally {
      setVoting(false);
    }
  };

  const imageSrc = issue.imageUrl
    ? getAssetUrl(issue.imageUrl)
    : 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&auto=format&fit=crop&q=80';

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 0,
        overflow: 'hidden',
        height: '100%'
      }}
    >
      {/* Image Banner */}
      <div style={{ position: 'relative', width: '100%', height: 160, backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
        <img
          src={imageSrc}
          alt={issue.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, zIndex: 2 }}>
          <StatusBadge status={issue.status} />
          <SeverityBadge severity={issue.severity} />
        </div>
        {issue.aiAnalysis?.isAiGenerated !== false && issue.aiAnalysis?.confidence > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'rgba(23, 23, 23, 0.85)',
              color: '#FFFFFF',
              fontSize: '10.5px',
              padding: '3px 7px',
              borderRadius: '4px',
              fontWeight: 600,
              backdropFilter: 'blur(4px)'
            }}
          >
            AI Verified
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--primary)', fontWeight: 600, marginBottom: 6 }}>
          <FiLayers size={13} />
          <span>{issue.department}</span>
        </div>

        <Link
          to={`/issues/${issue._id}`}
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: 8,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
          className="hover-underline"
        >
          {issue.title}
        </Link>

        <p
          style={{
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            marginBottom: 14,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
            flex: 1
          }}
        >
          {issue.description}
        </p>

        {issue.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: 12 }}>
            <FiMapPin size={13} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {issue.address}
            </span>
          </div>
        )}

        {/* Footer info & voting */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: '1px solid var(--border-light)',
            marginTop: 'auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
            <FiClock size={12} />
            <span>{formatRelativeTime(issue.createdAt)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleVoteToggle}
              disabled={voting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: hasVoted ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: hasVoted ? 'var(--primary-light)' : 'var(--bg-card)',
                color: hasVoted ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={hasVoted ? 'Remove your support' : 'Support this issue'}
            >
              <FiThumbsUp size={13} style={{ transform: hasVoted ? 'scale(1.1)' : 'none' }} />
              <span>{votesCount}</span>
            </button>

            <Link
              to={`/issues/${issue._id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-secondary)'
              }}
              title="View details"
            >
              <FiArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
