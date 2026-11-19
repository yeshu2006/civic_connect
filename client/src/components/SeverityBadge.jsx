import React from 'react';

const severityClassMap = {
  Low: 'badge-sev-low',
  Medium: 'badge-sev-medium',
  High: 'badge-sev-high',
  Critical: 'badge-sev-critical'
};

export default function SeverityBadge({ severity = 'Medium' }) {
  const className = severityClassMap[severity] || 'badge-sev-medium';

  return (
    <span className={`badge ${className}`}>
      <span className="badge-dot" />
      {severity}
    </span>
  );
}
