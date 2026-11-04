import { useState } from 'react';
import { api } from '../services/api';

/**
 * Resubmit modal for returned accreditation documents.
 * Allows the submitter to review the return reason, rectify metadata,
 * attach a corrected evidence file, and restart the verification workflow from Stage 1.
 */
export default function ResubmitModal({ doc, currentUser, onConfirm, onClose, showToast }) {
  if (!doc) return null;

  const isStudent = currentUser.role === 'Student' || doc.category === 'Student' || doc.ownerType === 'Student';
  const [title, setTitle] = useState(doc.title || '');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Extract return reason from reviewer comments or latest timeline step
  const returnReason = (() => {
    if (doc.reviewerComments && Array.isArray(doc.reviewerComments) && doc.reviewerComments.length > 0) {
      const last = doc.reviewerComments[doc.reviewerComments.length - 1];
      return last.comment || last.feedback || 'Revision requested by reviewer.';
    }
    if (doc.timeline && Array.isArray(doc.timeline)) {
      const returnedStep = [...doc.timeline].reverse().find(s => s.stage && s.stage.toLowerCase().includes('return'));
      if (returnedStep && returnedStep.comment) return returnedStep.comment;
    }
    return 'Document was returned for corrections. Please review and update evidence.';
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please provide a document title.', 'warning');
      return;
    }
    if (!file) {
      showToast('Mandatory: Please select and re-upload the corrected document file before submitting.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await api.uploadFile(file);
      const evidenceFile = uploaded.fileName;
      const fileType = file.name.split('.').pop().toLowerCase();
      const fileSize = `${(file.size / 1048576).toFixed(1)} MB`;

      const updates = {
        title: title.trim(),
        evidenceFile,
        fileType,
        fileSize,
      };

      await onConfirm(doc.id, updates);
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to re-submit document.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const initialStageName = isStudent ? 'Stage 1: Faculty Verification Desk' : 'Stage 2: Department Head of Department (HOD)';

  return (
    <div
      className="modal-overlay active"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resubmit-modal-title"
      style={{ display: 'flex', zIndex: 99999 }}
    >
      <div
        className="modal-dialog"
        style={{ maxWidth: 600, width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 22px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
        }}>
          <div>
            <div id="resubmit-modal-title" style={{ fontSize: 16.5, fontWeight: 700, color: '#0f172a' }}>
              Re-upload Corrected Document & Resubmit
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              ID: {doc.id} &bull; Category: {doc.category} &bull; Submitter: {doc.ownerName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}
          >
            &times;
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Reason for Return Notice */}
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '12px 14px', fontSize: 12.5, color: '#991b1b', lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span>⚠️ Reviewer Correction Feedback:</span>
            </div>
            <div style={{ fontStyle: 'italic', color: '#7f1d1d' }}>
              "{returnReason}"
            </div>
          </div>

          {/* Workflow Pipeline Notice */}
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
            padding: '12px 14px', fontSize: 12, color: '#1e40af', lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔄 Multi-Tier Verification Restart Flow:</span>
            </div>
            <div>
              Direct approval is strictly prohibited. Upon re-submitting with your re-uploaded evidence file, this record starts verification from the beginning:
            </div>
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid #dbeafe', fontFamily: 'monospace', fontSize: 11.5, color: '#1e3a8a' }}>
              {isStudent
                ? '1. Faculty Verification Desk (Stage 1) ➔ 2. Head of Department (HOD) ➔ 3. Central IQAC'
                : '1. Department HOD Queue (Stage 2) ➔ 2. Central IQAC Review (Stage 3)'}
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
              Document Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 6,
                border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
              }}
            />
          </div>

          {/* Existing Evidence File */}
          <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#475569' }}>
            <span style={{ fontWeight: 600, color: '#334155' }}>Previously Returned File:</span> {doc.evidenceFile || 'No file recorded'}
          </div>

          {/* Mandatory Replacement File Upload */}
          <div style={{ background: '#f8fafc', border: '1.5px dashed #3b82f6', borderRadius: 8, padding: '14px' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>
              📁 Re-upload Corrected Evidence Document * (Required)
            </label>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files[0] || null)}
              style={{
                width: '100%', padding: '8px', borderRadius: 6,
                border: '1px solid #cbd5e1', background: '#fff', fontSize: 12.5,
              }}
            />
            <div style={{ fontSize: 11.5, color: '#dc2626', marginTop: 6, fontWeight: 600 }}>
              * Re-uploading the corrected file is mandatory. Direct resubmission without a new file is not permitted.
            </div>
            {file && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                ✓ Selected replacement: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12.5 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !file}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', borderRadius: 6, border: 'none',
                background: !file ? '#94a3b8' : '#2563eb', color: '#fff',
                cursor: !file ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>{submitting ? 'Uploading & Submitting…' : 'Re-upload File & Submit for Verification'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

