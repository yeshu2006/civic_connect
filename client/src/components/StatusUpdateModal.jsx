import React, { useState } from 'react';
import { FiX, FiUploadCloud, FiCheck } from 'react-icons/fi';
import { STATUSES } from '../utils/constants.js';
import { updateIssueStatus } from '../services/adminService.js';
import { useToast } from '../context/ToastContext.jsx';

export default function StatusUpdateModal({ isOpen, issue, onClose, onUpdated }) {
  const { success, error } = useToast();
  const [selectedStatus, setSelectedStatus] = useState(issue?.status || 'Verified');
  const [note, setNote] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState(issue?.resolutionNotes || '');
  const [resolutionFile, setResolutionFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(issue?.resolutionImageUrl || '');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !issue) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResolutionFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedStatus === 'Rejected' && !note.trim()) {
      error('Please provide a reason for rejecting this report.');
      return;
    }

    setSubmitting(true);
    try {
      if (resolutionFile) {
        const formData = new FormData();
        formData.append('status', selectedStatus);
        formData.append('note', note);
        if (selectedStatus === 'Resolved') {
          formData.append('resolutionNotes', resolutionNotes);
        }
        formData.append('image', resolutionFile);

        const res = await updateIssueStatus(issue._id, formData, true);
        success(res.message);
        onUpdated(res.issue);
      } else {
        const payload = {
          status: selectedStatus,
          note,
          resolutionNotes: selectedStatus === 'Resolved' ? resolutionNotes : undefined,
          resolutionImageUrl: previewUrl
        };
        const res = await updateIssueStatus(issue._id, payload, false);
        success(res.message);
        onUpdated(res.issue);
      }
      onClose();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to update issue status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Update Issue Status</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Ticket: {issue.title}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">New Status</label>
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Timeline Update Note {selectedStatus === 'Rejected' && <span style={{ color: 'var(--danger)' }}>* (Required)</span>}
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="e.g. Field inspection team dispatched to site..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {selectedStatus === 'Resolved' && (
              <>
                <div className="form-group">
                  <label className="form-label">Official Resolution Notes</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Details of remedial works carried out..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Resolution Evidence (Optional)</label>
                  <div
                    style={{
                      border: '1.5px dashed var(--border)',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                      background: 'var(--bg-subtle)',
                      cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById('resFileInput').click()}
                  >
                    <input
                      id="resFileInput"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    {previewUrl ? (
                      <div>
                        <img
                          src={previewUrl}
                          alt="Resolution preview"
                          style={{ maxHeight: 120, borderRadius: 6, marginBottom: 8 }}
                        />
                        <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                          Change uploaded photo
                        </div>
                      </div>
                    ) : (
                      <div>
                        <FiUploadCloud size={24} style={{ color: 'var(--text-secondary)', marginBottom: 4 }} />
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>
                          Click to upload after-repair photograph
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Updating...' : 'Save Status Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
