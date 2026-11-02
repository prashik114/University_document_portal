import { useState } from 'react';

/**
 * Modal dialog for entering a return reason.
 * Replaces the old blocking window.prompt() call.
 */
export default function ReturnReasonModal({ docTitle, onConfirm, onCancel }) {
  const [reason, setReason] = useState(
    'Please provide signed HoD recommendation / attendance slip.'
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <div
      className="modal-overlay active"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-modal-title"
      style={{ display: 'flex', zIndex: 100000 }}
    >
      <div
        className="modal-dialog"
        style={{ maxWidth: 480, width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
        }}>
          <div>
            <div id="return-modal-title" style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Return Record for Correction
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {docTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
            Correction Reason <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            autoFocus
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what the submitter needs to correct or provide…"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1px solid #cbd5e1', fontSize: 13, resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px', borderRadius: 6,
                border: '1px solid #cbd5e1', background: '#fff',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 18px', borderRadius: 6,
                border: 'none', background: '#dc2626', color: '#fff',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              Return Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
