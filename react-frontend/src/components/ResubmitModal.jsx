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

    setSubmitting(true);
    try {
      let evidenceFile = doc.evidenceFile;
      let fileType = doc.fileType;
      let fileSize = doc.fileSize;

      if (file) {
        const uploaded = await api.uploadFile(file);
        evidenceFile = uploaded.fileName;
        fileType = file.name.split('.').pop().toLowerCase();
        fileSize = `${(file.size / 1048576).toFixed(1)} MB`;
      }

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

  const initialStageName = isStudent ? 'Stage 1 — Faculty Verification Desk' : 'Stage 2 — Department HOD Queue';

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
        style={{ maxWidth: 580, width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 22px', borderBottom: '1px solid #e2e8f0',
        }}>
          <div>
            <div id="resubmit-modal-title" style={{ fontSize: 16.5, fontWeight: 700, color: '#0f172a' }}>
              Re-submit Returned Document
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              ID: {doc.id} &bull; Submitter: {doc.ownerName}
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
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Reason for Return Notice */}
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '12px 14px', fontSize: 12.5, color: '#991b1b', lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span>⚠️ Reviewer Correction Request:</span>
            </div>
            <div style={{ fontStyle: 'italic', color: '#7f1d1d' }}>
              "{returnReason}"
            </div>
          </div>

          {/* Workflow Notice */}
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
            padding: '10px 14px', fontSize: 12, color: '#166534', lineHeight: 1.5,
          }}>
            ℹ️ <strong>Workflow Pipeline Notice:</strong> Upon re-submission, this record will NOT be approved directly. It will be routed through the complete verification pipeline from the start: <strong>{initialStageName}</strong>.
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
          <div style={{ fontSize: 12, color: '#475569' }}>
            <span style={{ fontWeight: 600 }}>Current Evidence File:</span> {doc.evidenceFile || 'None attached'}
          </div>

          {/* Replacement File Upload */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
              Attach Corrected / Updated Evidence File (Optional)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files[0] || null)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 6,
                border: '1.5px dashed #cbd5e1', background: '#f8fafc', fontSize: 12,
              }}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
              Leave blank to retain current evidence file, or choose a new file to replace it.
            </div>
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
              disabled={submitting}
              style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12.5 }}
            >
              {submitting ? 'Re-submitting…' : 'Submit Rectified Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

