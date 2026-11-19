import React, { useState } from 'react';
import {
  FiCheck,
  FiRefreshCw,
  FiAlertTriangle,
  FiEdit3,
  FiCpu,
  FiChevronDown,
  FiChevronUp,
  FiInfo
} from 'react-icons/fi';
import { CIVIC_CATEGORIES } from '../config/issueCategories.js';

export default function ClassificationResult({
  result,
  isLoading,
  loadingProgress,
  isClassifying,
  error,
  confirmedCategory,
  onConfirmCategory,
  onSelectCategory,
  onReclassify
}) {
  const [showManualPicker, setShowManualPicker] = useState(false);

  // 1. Model Loading / Download State (only if no prediction result yet)
  if (!result && (isLoading || isClassifying)) {
    const progressPct = loadingProgress?.progress || 0;
    const isDownloading = loadingProgress?.status === 'downloading';

    return (
      <div
        className="card"
        style={{
          marginTop: 14,
          padding: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md, 8px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <FiCpu className="spin" size={18} style={{ color: 'var(--primary)' }} />
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
            {isDownloading
              ? `Downloading CLIP Model (${progressPct}%)...`
              : isClassifying
              ? 'Analyzing image with CLIP ViT-B/32...'
              : 'Initializing AI Engine...'}
          </div>
        </div>

        {/* Progress Bar */}
        {isDownloading && (
          <div
            style={{
              width: '100%',
              height: 6,
              background: 'var(--bg-subtle)',
              borderRadius: 3,
              overflow: 'hidden',
              marginTop: 6
            }}
          >
            <div
              style={{
                width: `${Math.min(Math.max(progressPct, 5), 100)}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width 0.2s ease'
              }}
            />
          </div>
        )}

        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: 6 }}>
          {isDownloading
            ? 'One-time download from Hugging Face. Cached in browser for future sessions.'
            : 'Running zero-shot image classification locally on your device.'}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div
        style={{
          marginTop: 14,
          padding: '14px',
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: 'var(--radius-md, 8px)',
          fontSize: '12.5px',
          color: '#991B1B'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 4 }}>
          <FiAlertTriangle size={16} style={{ color: '#DC2626' }} />
          <span>AI Classification Notice</span>
        </div>
        <div style={{ marginBottom: 10, lineHeight: 1.4 }}>{error}</div>

        <div style={{ display: 'flex', gap: 8 }}>
          {onReclassify && (
            <button
              type="button"
              onClick={onReclassify}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              <FiRefreshCw size={12} /> Retry AI
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowManualPicker(true)}
            className="btn btn-sm"
            style={{
              fontSize: '11.5px',
              padding: '4px 10px',
              background: '#fff',
              border: '1px solid var(--border)'
            }}
          >
            Select Category Manually
          </button>
        </div>

        {/* Manual Category Grid when opened */}
        {showManualPicker && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: 6 }}>
              Choose Civic Category:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
              {CIVIC_CATEGORIES.filter((c) => c.isCivicIssue).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat);
                    setShowManualPicker(false);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: '#fff',
                    textAlign: 'left',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. No result yet
  if (!result) return null;

  // 4. Non-Civic Image Detected Alert
  if (!result.isCivicIssue) {
    return (
      <div
        style={{
          marginTop: 14,
          padding: '16px',
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: 'var(--radius-md, 8px)',
          fontSize: '12.5px',
          color: '#991B1B'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '13px' }}>
          <FiAlertTriangle size={18} style={{ color: '#DC2626' }} />
          <span>Non-Civic Image Detected ({result.similarityPercent}% Similarity)</span>
        </div>
        <p style={{ margin: '8px 0', lineHeight: 1.45 }}>
          The AI classifier identified this image as a non-civic scene (such as a personal selfie, food plate, pet, or indoor screenshot).
        </p>
        <div style={{ fontSize: '12px', color: '#7F1D1D', marginBottom: 12 }}>
          CivicConnect is intended for reporting public infrastructure defects like potholes, damaged streetlights, and water leaks.
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onReclassify && (
            <button
              type="button"
              onClick={onReclassify}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11.5px' }}
            >
              <FiRefreshCw size={12} /> Reclassify
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowManualPicker((prev) => !prev)}
            className="btn btn-sm"
            style={{ fontSize: '11.5px', background: '#fff', border: '1px solid #FCA5A5' }}
          >
            Override & Choose Category Manually
          </button>
        </div>

        {showManualPicker && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: 6 }}>
              Select Actual Issue Category:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
              {CIVIC_CATEGORIES.filter((c) => c.isCivicIssue).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat);
                    setShowManualPicker(false);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: '#fff',
                    textAlign: 'left',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. Successful Civic Classification Result
  const isConfirmed = confirmedCategory === result.predictedCategory;

  const getConfidenceBadge = () => {
    switch (result.similarityLevel) {
      case 'high':
        return (
          <span
            style={{
              background: '#DCFCE7',
              color: '#15803D',
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            🟢 High Similarity
          </span>
        );
      case 'medium':
        return (
          <span
            style={{
              background: '#FEF3C7',
              color: '#B45309',
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            🟡 Moderate Similarity
          </span>
        );
      default:
        return (
          <span
            style={{
              background: '#FEE2E2',
              color: '#B91C1C',
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            🟠 Low Similarity (Verify)
          </span>
        );
    }
  };

  return (
    <div
      style={{
        marginTop: 14,
        padding: '16px',
        borderRadius: 'var(--radius-md, 8px)',
        background: isConfirmed ? '#F0FDF4' : 'var(--bg-card)',
        border: `1px solid ${isConfirmed ? '#BBF7D0' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-subtle)',
        fontSize: '12.5px',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '20px' }}>{result.predictedIcon}</span>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
              {result.predictedCategory}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              AI Match: <strong>{result.similarityPercent}%</strong>
              <span style={{ marginLeft: 6, fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                ({result.modelName?.includes('clip') ? 'CLIP ViT-B/32' : '⚡ Edge Vision AI'})
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {getConfidenceBadge()}
          {isConfirmed && (
            <span
              style={{
                background: '#16A34A',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <FiCheck size={12} /> Confirmed
            </span>
          )}
        </div>
      </div>

      {/* Suggested Routing */}
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--bg-subtle)',
          borderRadius: 6,
          marginBottom: 12,
          lineHeight: 1.45,
          color: 'var(--text-main)'
        }}
      >
        <span>Suggested Department: </span>
        <strong>{result.suggestedDepartment || 'Roads and Infrastructure'}</strong>
        <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>•</span>
        <span>Severity: </span>
        <strong>{result.suggestedSeverity || 'Medium'}</strong>
      </div>

      {/* Confirmation & Reclassify Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {!isConfirmed ? (
          <button
            type="button"
            onClick={() => onConfirmCategory(result.predictedCategory, result.suggestedDepartment, result.suggestedSeverity)}
            className="btn btn-sm btn-primary"
            style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <FiCheck size={14} /> Confirm This Category
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: '#DCFCE7',
              color: '#15803D',
              border: '1px solid #BBF7D0',
              fontWeight: 600,
              cursor: 'default'
            }}
          >
            <FiCheck size={14} /> Category Confirmed
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowManualPicker((prev) => !prev)}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <FiEdit3 size={13} />
          <span>{showManualPicker ? 'Hide Options' : 'Change Category'}</span>
          {showManualPicker ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
        </button>

        {onReclassify && (
          <button
            type="button"
            onClick={onReclassify}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '11.5px', padding: '4px 8px', color: 'var(--text-secondary)' }}
            title="Re-run CLIP model classification"
          >
            <FiRefreshCw size={12} /> Reclassify
          </button>
        )}
      </div>

      {/* Top Alternative Categories */}
      {result.topAlternatives && result.topAlternatives.length > 0 && !showManualPicker && (
        <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
            Top Alternative Matches:
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {result.topAlternatives.map((alt) => (
              <button
                key={alt.id}
                type="button"
                onClick={() => onSelectCategory(alt)}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  fontSize: '11.5px',
                  color: 'var(--text-main)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer'
                }}
              >
                <span>{alt.icon}</span>
                <span>{alt.name}</span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  ({alt.similarityPercent}%)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Full Category Selector */}
      {showManualPicker && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Choose Different Category:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {CIVIC_CATEGORIES.filter((c) => c.isCivicIssue).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectCategory(cat);
                  setShowManualPicker(false);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: confirmedCategory === cat.name ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: confirmedCategory === cat.name ? 'var(--primary-light)' : 'var(--bg-card)',
                  color: confirmedCategory === cat.name ? 'var(--primary)' : 'var(--text-main)',
                  textAlign: 'left',
                  fontSize: '11.5px',
                  fontWeight: confirmedCategory === cat.name ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{cat.icon}</span>
                <span style={{ lineHeight: 1.2 }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CLIP Cosine Similarity Clarification Note */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: '10.5px',
          color: 'var(--text-tertiary)'
        }}
      >
        <FiInfo size={11} />
        <span>
          {result.modelName?.includes('clip')
            ? `Scores represent CLIP ViT-B/32 zero-shot cosine similarity in your browser (${result.deviceUsed?.toUpperCase() || 'WASM'}). Always verify before submitting.`
            : `Classified instantly via in-browser Local Edge Vision (${result.deviceUsed || 'WASM'}). Always verify before submitting.`}
        </span>
      </div>
    </div>
  );
}
