import React, { useRef, useState } from 'react';
import { FiUploadCloud, FiX, FiImage, FiAlertCircle } from 'react-icons/fi';

export default function IssueImageUpload({
  imagePreview,
  onImageSelected,
  onImageCleared,
  compressionInfo,
  disabled = false,
  error = null
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelected(file);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelected(e.target.files[0]);
    }
  };

  const handleTriggerInput = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="issue-image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled}
      />

      {imagePreview ? (
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-md, 8px)',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            background: 'var(--bg-subtle)'
          }}
        >
          <img
            src={imagePreview}
            alt="Selected issue preview"
            style={{
              width: '100%',
              maxHeight: '260px',
              objectFit: 'cover',
              display: 'block'
            }}
          />

          {/* Action Overlay */}
          <div
            style={{
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)',
              borderTop: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-secondary)' }}>
              <FiImage size={14} />
              <span>Photograph loaded</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleTriggerInput}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11.5px', padding: '4px 10px' }}
                disabled={disabled}
              >
                Change Photo
              </button>
              <button
                type="button"
                onClick={onImageCleared}
                className="btn btn-sm"
                style={{
                  fontSize: '11.5px',
                  padding: '4px 8px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5'
                }}
                disabled={disabled}
                title="Remove photo"
              >
                <FiX size={14} /> Remove
              </button>
            </div>
          </div>

          {/* Low Bandwidth Auto-compression Badge */}
          {compressionInfo && (
            <div
              style={{
                padding: '6px 14px',
                background: '#F0FDF4',
                borderTop: '1px solid #DCFCE7',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '11px',
                color: '#15803D'
              }}
            >
              <span className="low-bandwidth-badge">⚡ Bandwidth Optimized</span>
              <span>
                {compressionInfo.origKb} KB → {compressionInfo.compKb} KB ({compressionInfo.savings}% saved)
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleTriggerInput}
          style={{
            border: isDragOver ? '2px dashed var(--primary)' : '2px dashed var(--border)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '28px 16px',
            textAlign: 'center',
            background: isDragOver ? 'var(--primary-light)' : 'var(--bg-subtle)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
              color: 'var(--primary)'
            }}
          >
            <FiUploadCloud size={22} />
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
            Click to upload or drag & drop photo
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Supports JPEG, PNG, WEBP (up to 10MB)
          </div>

          <div style={{ marginTop: 10, fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Instant AI classification runs directly in your browser using Transformers.js
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {error && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm, 6px)',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <FiAlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
