import React from 'react';

export default function StatCard({ label, value, icon: Icon, subtext, color = 'var(--text-main)' }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="stat-icon-wrap">
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
