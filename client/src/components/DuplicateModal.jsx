import React from 'react';
import { FiAlertTriangle, FiThumbsUp, FiMapPin, FiX } from 'react-icons/fi';
import StatusBadge from './StatusBadge.jsx';
import SeverityBadge from './SeverityBadge.jsx';
import { formatDistance, getAssetUrl } from '../utils/formatters.js';

export default function DuplicateModal({
  isOpen,
  duplicates = [],
  onSupportExisting,
  onContinueReporting,
  onClose
}) {
  if (!isOpen || duplicates.length === 0) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FiAlertTriangle size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                Similar Issues Detected Nearby ({duplicates.length})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Citizens have already reported similar incidents in this vicinity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ maxHeight: '60vh' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 14 }}>
            Supporting an existing issue increases municipal urgency and avoids duplicate tickets for field crews.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {duplicates.map((dup) => (
              <div
                key={dup._id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '14px',
                  background: 'var(--bg-subtle)',
                  display: 'flex',
                  gap: 14
                }}
              >
                {dup.imageUrl && (
                  <img
                    src={getAssetUrl(dup.imageUrl)}
                    alt={dup.title}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 6,
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <StatusBadge status={dup.status} />
                      <SeverityBadge severity={dup.severity} />
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#FFF7ED',
                        color: 'var(--primary)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 600,
                        border: '1px solid #FED7AA'
                      }}
                    >
                      {dup.similarityScore}% Match
                    </span>
                  </div>

                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      marginBottom: 4,
                      lineHeight: 1.3
                    }}
                  >
                    {dup.title}
                  </h4>

                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      marginBottom: 8,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {dup.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiMapPin size={12} />
                      <span>{formatDistance(dup.distanceMeters)} away</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSupportExisting(dup)}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '4px 10px' }}
                    >
                      <FiThumbsUp size={12} />
                      Support This Issue ({dup.votes || 0})
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Review My Form
          </button>
          <button
            type="button"
            onClick={onContinueReporting}
            className="btn btn-outline btn-sm"
            style={{ borderColor: 'var(--border-dark)' }}
          >
            Continue Reporting as New Issue
          </button>
        </div>
      </div>
    </div>
  );
}
