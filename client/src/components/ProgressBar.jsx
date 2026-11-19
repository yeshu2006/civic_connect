import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

const STEPS = ['Reported', 'Verified', 'In Progress', 'Resolved'];

export default function ProgressBar({ status = 'Reported' }) {
  if (status === 'Rejected') {
    return (
      <div
        style={{
          background: '#FEF2F2',
          border: '1px solid #FEE2E2',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#B91C1C',
          fontSize: '13px',
          fontWeight: 500,
          margin: '14px 0'
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#DC2626',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <FiX size={14} />
        </span>
        <span>This civic report was rejected after municipal inspection.</span>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;
  const fillPercentage = (activeIdx / (STEPS.length - 1)) * 100;

  return (
    <div style={{ margin: '18px 0 10px' }}>
      <div className="progress-stepper">
        <div className="step-connector">
          <div
            className="step-connector-fill"
            style={{ width: `${fillPercentage}%` }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIdx;
          const isActive = idx === activeIdx;

          return (
            <div
              key={step}
              className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
            >
              <div className="step-node">
                {isCompleted ? <FiCheck size={14} /> : idx + 1}
              </div>
              <span className="step-label">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
