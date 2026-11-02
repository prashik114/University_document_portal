import { useState } from 'react';
import { api } from '../services/api';

const CATEGORIES_FACULTY = ['Academic', 'Research', 'Co-curricular', 'NAAC', 'Faculty Publication', 'Student Achievement'];
const CATEGORIES_STUDENT = ['Student Co-Curricular', 'Technical Hackathon', 'Industry Internship', 'Research Publication', 'Sports & Cultural Award'];
const NAAC_CRITERIA = [
  'Criteria 1: Curricular Aspects',
  'Criteria 2: Teaching-Learning & Evaluation',
  'Criteria 3: Research, Innovations & Extension',
  'Criteria 4: Infrastructure & Learning Resources',
  'Criteria 5: Student Support & Progression',
  'Criteria 6: Governance, Leadership & Management',
  'Criteria 7: Institutional Values & Best Practices',
];

/**
 * Upload / submit document modal.
 * Calls the backend API directly — submissions are persisted immediately.
 */
export default function UploadModal({ currentUser, onSubmit, onClose, showToast }) {
  const isStudent = currentUser.role === 'Student';
  const [title,     setTitle]     = useState('');
  const [category,  setCategory]  = useState(isStudent ? 'Student Co-Curricular' : 'Academic');
  const [criterion, setCriterion] = useState(NAAC_CRITERIA[0]);
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (isDraft = false) => {
    if (!title.trim()) {
      showToast('Please enter a document title.', 'warning');
      return;
    }

    setUploading(true);
    try {
      let evidenceFile = null;
      if (file) {
        const uploaded = await api.uploadFile(file);
        evidenceFile = uploaded.fileName;
      }

      const docPayload = {
        title:            title.trim(),
        category:         isStudent ? 'Student' : category,
        subCategory:      isStudent ? 'Student Achievement' : category,
        ownerType:        isStudent ? 'Student' : 'Faculty Member',
        ownerName:        currentUser.name,
        ownerId:          currentUser.employeeId,
        recordedByFaculty: currentUser.name,
        department:       currentUser.department,
        school:           currentUser.school || 'University',
        academicYear:     '2026-2027',
        naacCriterion:    criterion,
        fileType:         file ? file.name.split('.').pop().toLowerCase() : 'pdf',
        fileSize:         file ? `${(file.size / 1048576).toFixed(1)} MB` : '—',
        evidenceFile:     evidenceFile || 'pending_upload.pdf',
        status:           isDraft ? 'Draft' : 'Under Verification',
      };

      await onSubmit(docPayload, isDraft);
      onClose();
    } catch (err) {
      showToast(err.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="modal-overlay active"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      style={{ display: 'flex', zIndex: 99999 }}
    >
      <div
        className="modal-dialog"
        style={{ maxWidth: 640, width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
        }}>
          <div id="upload-modal-title" style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            {isStudent ? 'Submit Student Achievement Certificate' : 'Upload Accreditation Document'}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              {isStudent ? 'Achievement Title / Event Name' : 'Document Title'}{' '}
              <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              className="login-input"
              placeholder={isStudent
                ? 'e.g. 1st Prize in National Smart India Hackathon 2026'
                : 'e.g. Workshop on Cloud Architecture & AI (2026)'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category + Criterion */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Category
              </label>
              <select
                className="select-filter"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              >
                {(isStudent ? CATEGORIES_STUDENT : CATEGORIES_FACULTY).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                NAAC Criterion
              </label>
              <select
                className="select-filter"
                value={criterion}
                onChange={(e) => setCriterion(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              >
                {NAAC_CRITERIA.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* File */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Evidence File (.pdf, .xlsx, .docx, .png, .jpg)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files[0] || null)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1.5px dashed #cbd5e1', background: '#f8fafc',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              style={{ padding: '9px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={uploading}
              style={{ padding: '9px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={uploading}
              style={{ padding: '9px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            >
              {uploading ? 'Submitting…' : 'Submit for Verification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
