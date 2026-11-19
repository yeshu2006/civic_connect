import React, { useState } from 'react';

export default function TrendChart({ data = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
        No trend data available
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.reported || 0, d.resolved || 0, 1)), 5);
  const chartHeight = 140;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginBottom: 12, fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: 'var(--primary)', borderRadius: 2 }} />
          <span style={{ color: 'var(--text-secondary)' }}>Reported</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: 'var(--success)', borderRadius: 2 }} />
          <span style={{ color: 'var(--text-secondary)' }}>Resolved</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: chartHeight, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        {data.map((item, idx) => {
          const repHeight = Math.max(4, Math.round(((item.reported || 0) / maxVal) * (chartHeight - 20)));
          const resHeight = Math.max(4, Math.round(((item.resolved || 0) / maxVal) * (chartHeight - 20)));
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.month || idx}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative'
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: Math.max(repHeight, resHeight) + 12,
                    background: '#171717',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    boxShadow: 'var(--shadow-md)',
                    pointerEvents: 'none'
                  }}
                >
                  <div>Reported: {item.reported || 0}</div>
                  <div>Resolved: {item.resolved || 0}</div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '40%',
                    maxWidth: 18,
                    height: `${repHeight}px`,
                    backgroundColor: 'var(--primary)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'all 0.2s'
                  }}
                />
                <div
                  style={{
                    width: '40%',
                    maxWidth: 18,
                    height: `${resHeight}px`,
                    backgroundColor: 'var(--success)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'all 0.2s'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {data.map((item, idx) => (
          <span
            key={item.month || idx}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              fontWeight: 500
            }}
          >
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
}
