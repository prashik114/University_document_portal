import StatusBadge from './StatusBadge';

const normalizeDept = (dept) => (dept || '').replace(/&/g, 'and').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Read-only document detail inspection modal.
 * Approve / Return actions for Dean/HOD and IQAC per the workflow diagram.
 * Re-submit action for Faculty / Student on returned documents.
 */
export default function DocumentDetailModal({
  doc,
  currentUser,
  onApprove,
  onReturn,
  onResubmit,
  onClose,
}) {
  if (!doc) return null;

  const isStudentDoc = doc.category === 'Student' || (doc.category && doc.category.toLowerCase().includes('student')) || doc.ownerType === 'Student' || doc.ownerType === 'student';

  const canVerify = doc.status === 'Under Verification' && (() => {
    if (currentUser.role === 'Student') return false;
    if (currentUser.role === 'Faculty') {
      if (!isStudentDoc) return false;
      if (doc.currentStage !== 'Faculty') return false;
      const facDept = normalizeDept(currentUser.department);
      const docDept = normalizeDept(doc.department);
      if (facDept && docDept && facDept !== docDept) return false;
      return true;
    }
    if (currentUser.role === 'DeanHOD') {
      if (doc.currentStage !== 'Dean/HOD') return false;
      const allowed = [currentUser.department, ...(currentUser.allowedDepartments || []), ...(currentUser.additionalDepartments ? currentUser.additionalDepartments.split(',').map(s=>s.trim()) : [])].filter(Boolean).map(normalizeDept);
      if (allowed.length > 0 && doc.department && !allowed.includes(normalizeDept(doc.department))) return false;
      return true;
    }
    if (currentUser.role === 'IQAC') return doc.currentStage === 'IQAC';
    if (currentUser.role === 'Admin') return true;
    return false;
  })();

  const isDocOwner = (() => {
    if (!doc || !currentUser) return false;
    const uid = (currentUser.id || '').trim().toLowerCase();
    const emp = (currentUser.employeeId || '').trim().toLowerCase();
    const docOwnerId = (doc.ownerId || '').trim().toLowerCase();
    const docOwnerName = (doc.ownerName || '').trim().toLowerCase();
    const docRecordedBy = (doc.recordedByFaculty || '').trim().toLowerCase();
    const userName = (currentUser.name || '').trim().toLowerCase();
    const userEmail = (currentUser.email || '').trim().toLowerCase();
    const docEmail = (doc.ownerEmail || '').trim().toLowerCase();

    const matchId = Boolean(uid && docOwnerId && (docOwnerId === uid || docOwnerId === emp));
    const matchEmp = Boolean(emp && docOwnerId && (docOwnerId === emp || docOwnerId === uid));
    const matchName = Boolean(userName && docOwnerName && docOwnerName === userName);
    const matchFaculty = Boolean(userName && docRecordedBy && docRecordedBy === userName);
    const matchEmail = Boolean(userEmail && docEmail && docEmail === userEmail);

    return matchId || matchEmp || matchName || matchFaculty || matchEmail;
  })();

  // Resubmission is strictly for the SUBMITTER / OWNER of the returned document:
  // - Students can ONLY re-upload and resubmit their own student records when Returned.
  // - Faculty can ONLY re-upload and resubmit their own faculty records when Returned by HOD.
  // - Faculty examining a student's document can NEVER re-upload/resubmit it!
  // - When a document is re-submitted, its status becomes 'Under Verification', so re-upload is disabled.
  const canResubmit = doc.status === 'Returned' && isDocOwner && (
    (currentUser.role === 'Student' && isStudentDoc) ||
    (currentUser.role === 'Faculty' && !isStudentDoc)
  );
  const isLocked     = doc.status === 'Approved';

  return (
    <div
      className="modal-overlay active"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      style={{ display: 'flex', zIndex: 99999 }}
    >
      <div
        className="modal-dialog"
        style={{
          maxWidth: 680,
          width: '100%',
          maxHeight: '90vh',
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
          flexShrink: 0,
        }}>
          <div>
            <div id="detail-modal-title" style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Accreditation Evidence Details
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Record ID: {doc.id}</div>
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

        {/* Scrollable Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: '1 1 auto',
          minHeight: 0,
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>{doc.title}</h3>
              <div style={{ fontSize: 13, color: '#475569' }}>{doc.category} &bull; {doc.subCategory || 'General'}</div>
            </div>
            <StatusBadge status={doc.status} />
          </div>

          {/* Metadata grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
            background: '#f8fafc', padding: 14, borderRadius: 8, fontSize: 12.5, marginBottom: 16,
          }}>
            {[
              ['Owner / Submitter', doc.ownerName],
              ['Department',        doc.department || 'Computer Science'],
              ['NAAC Criterion',    doc.naacCriterion || '—'],
              ['Workflow Stage',    doc.currentStage],
              ['Academic Year',     doc.academicYear || '2026-2027'],
              ['Submitted On',      doc.submittedOn  || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <span style={{ color: '#64748b' }}>{label}:</span>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Structured Event / Record Details (Sections 5.2, 5.3, 6.2, 6.3) */}
          {(() => {
            const ev = doc.eventDetails || (() => {
              try { return doc.eventDetailsJson ? JSON.parse(doc.eventDetailsJson) : null; } catch { return null; }
            })();
            if (!ev || Object.keys(ev).length === 0) return null;

            const fields = [
              ev.eventType && ['Event Type', ev.eventType],
              ev.activityType && ['Activity Type', ev.activityType],
              ev.awardNature && ['Nature of Achievement', ev.awardNature],
              ev.level && ['Level', ev.level],
              ev.natureOfEvent && ['Scope / Nature', ev.natureOfEvent],
              ev.participatedAs && ['Role / Designation', ev.participatedAs],
              ev.positionSecured && ['Position Secured', ev.positionSecured],
              (ev.startDate || ev.endDate) && ['Duration', `${ev.startDate || '—'} to ${ev.endDate || '—'}`],
              ev.achievementDate && ['Award Date', ev.achievementDate],
              ev.organisingBody && ['Organiser / Institution', ev.organisingBody],
              ev.awardingBody && ['Awarding Body', `${ev.awardingBody} (${ev.bodyType || 'General'})`],
              ev.hasFinancialSupport === 'Yes' && ['Financial Support', `₹${ev.financialAmount || 0} (${ev.financialNature || 'Granted'})`],
            ].filter(Boolean);

            if (fields.length === 0) return null;

            return (
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                padding: 14, fontSize: 12.5, marginBottom: 16,
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Accreditation & Event Reference Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {fields.map(([label, val]) => (
                    <div key={label}>
                      <span style={{ color: '#15803d' }}>{label}:</span>
                      <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 1 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Evidence file */}
          {doc.evidenceFile && (
            <div style={{
              border: '1px solid #e2e8f0', borderRadius: 8, padding: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 6, background: '#fee2e2',
                  color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 11,
                }}>
                  {doc.fileType?.toUpperCase() || 'PDF'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{doc.evidenceFile}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{doc.fileSize || '—'}</div>
                </div>
              </div>
              <a
                href={`/api/files/${doc.evidenceFile}`}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}
              >
                Download Evidence
              </a>
            </div>
          )}

          {/* Timeline */}
          {Array.isArray(doc.timeline) && doc.timeline.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Workflow Timeline
              </div>
              <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                {doc.timeline.map((step, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <strong>{step.stage}</strong> — {step.actor}<br />
                    <span style={{ color: '#64748b', fontSize: 11.5 }}>{step.date}</span>
                    {step.comment && (
                      <div style={{ color: '#475569', marginTop: 2 }}>{step.comment}</div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Pinned Sticky Footer actions (Always visible & accessible) */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
          flexShrink: 0, gap: 10, flexWrap: 'wrap',
        }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Print Record
          </button>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {canVerify && (
              <>
                <button
                  type="button"
                  onClick={() => onReturn(doc)}
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #ef4444', background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  {currentUser.role === 'IQAC' ? 'Return to Department' : currentUser.role === 'Faculty' ? 'Return to Student for Correction' : 'Return for Clarification'}
                </button>
                <button
                  type="button"
                  onClick={() => onApprove(doc)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  ✓ {currentUser.role === 'IQAC'
                    ? 'Approve & Lock SSR'
                    : currentUser.role === 'Faculty'
                    ? 'Verify Student Document & Forward to HOD'
                    : isStudentDoc
                    ? 'Confirm Student Document & Forward to IQAC'
                    : 'Endorse & Forward to IQAC'}
                </button>
              </>
            )}
            {canResubmit && (
              <button
                type="button"
                onClick={() => onResubmit(doc)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>Re-upload Document & Resubmit</span>
              </button>
            )}
            {isLocked && (
              <span style={{ padding: '8px 12px', borderRadius: 6, background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 12 }}>
                ✓ SSR Locked — Immutable
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
