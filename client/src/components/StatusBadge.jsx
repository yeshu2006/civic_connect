import React from 'react';

const statusClassMap = {
  Reported: 'badge-status-reported',
  Verified: 'badge-status-verified',
  'In Progress': 'badge-status-inprogress',
  Resolved: 'badge-status-resolved',
  Rejected: 'badge-status-rejected'
};

export default function StatusBadge({ status = 'Reported' }) {
  const className = statusClassMap[status] || 'badge-status-reported';

  return (
    <span className={`badge ${className}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
