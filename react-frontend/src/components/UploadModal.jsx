import { useState } from 'react';
import { api } from '../services/api';

const CATEGORIES_FACULTY = [
  'Capacity Development (External)',
  'Awards & Recognition (External)',
  'Research & Publications',
  'Academic & Curricular',
  'Institutional Governance',
];

const CATEGORIES_STUDENT = [
  'Student Achievement / Award / Recognition',
  'Student Capacity Development / Placements',
  'Technical Hackathon & Project',
  'Industry Internship',
  'Sports & Cultural Award',
];

const NAAC_CRITERIA = [
  'Criteria 1: Curricular Aspects',
  'Criteria 2: Teaching-Learning & Evaluation',
  'Criteria 3: Research, Innovations & Extension',
  'Criteria 4: Infrastructure & Learning Resources',
  'Criteria 5: Student Support & Progression',
  'Criteria 6: Governance, Leadership & Management',
  'Criteria 7: Institutional Values & Best Practices',
];

const CAPACITY_EVENT_TYPES = [
  'Faculty Development Programme (FDP)',
  'Refresher Course',
  'Orientation Programme',
  'Short Term Course',
  'STTP',
  'MOOC / Online Course (NPTEL / Coursera / Swayam)',
  'Workshop',
  'Seminar',
  'Conference',
  'Symposium',
  'Training Programme',
  'Leadership / Management Development Programme',
  'Faculty Induction Programme',
  'Any other',
];

const FACULTY_AWARD_NATURES = [
  'Fellowship',
  'Award',
  'Honour',
  'Patent Granted',
  'Technology Transfer',
  'Book Authored',
  'Policy Document',
  'Other',
];

const STUDENT_ACHIEVEMENT_NATURES = [
  'Hackathon / Coding Competition',
  'Academic Award / Rank',
  'Technical Event / Symposium',
  'Research / Publication',
  'Sports / Games',
  'Cultural / Literary Event',
  'Entrepreneurship / Startup',
  'Innovation / Patent',
  'Social / Community Service',
  'Other',
];

const STUDENT_ACTIVITY_TYPES = [
  'Internship',
  'Placement Offer',
  'Apprenticeship',
  'Competitive Exam Qualified (GATE, CAT, GRE, etc.)',
  'Training / Industry Certification',
  'Workshop',
  'Higher Education Admission',
  'Other',
];

const LEVELS = ['International', 'National', 'State', 'Zonal', 'Inter-University', 'University'];

/**
 * Upload / submit document modal.
 * Implements reference fields from Sections 5.2, 5.3, 6.2, and 6.3 of the Development Specification.
 */
export default function UploadModal({ currentUser, onSubmit, onClose, showToast }) {
  const isStudent = currentUser.role === 'Student';
  const defaultCategory = isStudent ? CATEGORIES_STUDENT[0] : CATEGORIES_FACULTY[0];

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [criterion, setCriterion] = useState(
    isStudent ? 'Criteria 5: Student Support & Progression' : 'Criteria 6: Governance, Leadership & Management'
  );
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Structured event/record fields
  const [eventType, setEventType] = useState(CAPACITY_EVENT_TYPES[0]);
  const [natureOfEvent, setNatureOfEvent] = useState('National');
  const [participatedAs, setParticipatedAs] = useState(isStudent ? 'Participant' : 'Participant');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [organisingBody, setOrganisingBody] = useState('');
  const [hasFinancialSupport, setHasFinancialSupport] = useState('No');
  const [financialAmount, setFinancialAmount] = useState('');
  const [financialNature, setFinancialNature] = useState('Registration Fee');

  // Awards & Recognition fields
  const [awardNature, setAwardNature] = useState(isStudent ? STUDENT_ACHIEVEMENT_NATURES[0] : FACULTY_AWARD_NATURES[0]);
  const [awardingBody, setAwardingBody] = useState('');
  const [bodyType, setBodyType] = useState('Government');
  const [level, setLevel] = useState('National');
  const [positionSecured, setPositionSecured] = useState('1st');
  const [achievementDate, setAchievementDate] = useState('');

  // Student capacity / internship
  const [activityType, setActivityType] = useState(STUDENT_ACTIVITY_TYPES[0]);

  // Handle category change and auto-set criterion
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (newCat.includes('Capacity Development') && !isStudent) {
      setCriterion('Criteria 6: Governance, Leadership & Management');
    } else if (newCat.includes('Awards') || newCat.includes('Research')) {
      setCriterion('Criteria 3: Research, Innovations & Extension');
    } else if (isStudent) {
      setCriterion('Criteria 5: Student Support & Progression');
    }
  };

  const isCapacityDev = category === 'Capacity Development (External)' || category === 'Student Capacity Development / Placements' || category === 'Industry Internship';
  const isAward = category === 'Awards & Recognition (External)' || category === 'Student Achievement / Award / Recognition' || category === 'Sports & Cultural Award' || category === 'Technical Hackathon & Project';

  const handleSubmit = async (isDraft = false) => {
    if (!title.trim()) {
      showToast('Please enter a document title or event name.', 'warning');
      return;
    }

    // Validation: Start / End Date sequence
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      showToast('Validation Error: End Date cannot be earlier than Start Date.', 'error');
      return;
    }

    // Validation: Financial support positive amount
    if (hasFinancialSupport === 'Yes' && financialAmount && Number(financialAmount) < 0) {
      showToast('Financial support amount cannot be negative.', 'error');
      return;
    }

    setUploading(true);
    try {
      let evidenceFile = null;
      if (file) {
        const uploaded = await api.uploadFile(file);
        evidenceFile = uploaded.fileName;
      }

      const eventDetails = {
        category,
        eventType: isCapacityDev ? eventType : undefined,
        activityType: isStudent && isCapacityDev ? activityType : undefined,
        natureOfEvent,
        participatedAs,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        organisingBody: organisingBody.trim() || undefined,
        hasFinancialSupport,
        financialAmount: hasFinancialSupport === 'Yes' ? financialAmount : undefined,
        financialNature: hasFinancialSupport === 'Yes' ? financialNature : undefined,
        awardNature: isAward ? awardNature : undefined,
        awardingBody: isAward ? awardingBody.trim() : undefined,
        bodyType: isAward ? bodyType : undefined,
        level: isAward ? level : undefined,
        positionSecured: isAward && isStudent ? positionSecured : undefined,
        achievementDate: isAward ? achievementDate : undefined,
      };

      const docPayload = {
        title: title.trim(),
        category: isStudent ? 'Student' : category,
        subCategory: category,
        ownerType: isStudent ? 'Student' : (currentUser.role === 'DeanHOD' ? 'DeanHOD' : 'Faculty Member'),
        ownerName: currentUser.name,
        ownerId: currentUser.employeeId || currentUser.id,
        recordedByFaculty: currentUser.name,
        department: currentUser.department,
        school: currentUser.school || 'University',
        academicYear: '2026-2027',
        naacCriterion: criterion,
        fileType: file ? file.name.split('.').pop().toLowerCase() : 'pdf',
        fileSize: file ? `${(file.size / 1048576).toFixed(1)} MB` : '—',
        evidenceFile: evidenceFile || 'pending_upload.pdf',
        status: isDraft ? 'Draft' : 'Under Verification',
        eventDetails,
      };

      await onSubmit(docPayload, isDraft);
      onClose();
    } catch (err) {
      showToast(err.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const labelStyle = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 };
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 };

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
        style={{ maxWidth: 680, width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderBottom: '1px solid #e2e8f0',
        }}>
          <div>
            <div id="upload-modal-title" style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              {isStudent ? 'Submit Student Achievement / Record' : 'Upload Accreditation Evidence Record'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Institutional Repository Entry &bull; {currentUser.department || 'University'}
            </div>
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

        {/* Form Body - Scrollable */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {/* Document Title */}
          <div>
            <label style={labelStyle}>
              {isStudent ? 'Achievement Title / Event Name' : 'Document Title / Programme Name'}{' '}
              <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              style={inputStyle}
              placeholder={isStudent
                ? 'e.g. 1st Prize in National Smart India Hackathon 2026'
                : 'e.g. 5-Day National FDP on Modern Cloud Architectures and AI'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category & Criterion */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Classification Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                style={inputStyle}
              >
                {(isStudent ? CATEGORIES_STUDENT : CATEGORIES_FACULTY).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Accreditation Criterion (NAAC / SSR)</label>
              <select
                value={criterion}
                onChange={(e) => setCriterion(e.target.value)}
                style={inputStyle}
              >
                {NAAC_CRITERIA.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Section: Capacity Development Fields (Section 5.2 / 6.3) */}
          {isCapacityDev && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Programme / Activity Specification
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {!isStudent ? (
                  <div>
                    <label style={labelStyle}>Event Type (FDP / Refresher / STTP)</label>
                    <select value={eventType} onChange={e => setEventType(e.target.value)} style={inputStyle}>
                      {CAPACITY_EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Activity Type</label>
                    <select value={activityType} onChange={e => setActivityType(e.target.value)} style={inputStyle}>
                      {STUDENT_ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Nature of Event / Scope</label>
                  <select value={natureOfEvent} onChange={e => setNatureOfEvent(e.target.value)} style={inputStyle}>
                    <option value="National">National</option>
                    <option value="International">International</option>
                    <option value="State / Regional">State / Regional</option>
                    <option value="Corporate / Industry">Corporate / Industry</option>
                    <option value="Institutional">Institutional</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Participated As / Role</label>
                  <select value={participatedAs} onChange={e => setParticipatedAs(e.target.value)} style={inputStyle}>
                    {isStudent ? (
                      <>
                        <option value="Intern">Intern</option>
                        <option value="Trainee">Trainee</option>
                        <option value="Participant">Participant</option>
                        <option value="Placement Candidate">Placement Candidate</option>
                        <option value="Scholar">Scholar</option>
                      </>
                    ) : (
                      <>
                        <option value="Participant">Participant</option>
                        <option value="Resource Person">Resource Person</option>
                        <option value="Session Chair">Session Chair</option>
                        <option value="Invited Speaker">Invited Speaker</option>
                        <option value="Paper Presenter">Paper Presenter</option>
                        <option value="Panellist">Panellist</option>
                        <option value="Organiser">Organiser</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Organising Institution / Company</label>
                  <input
                    type="text"
                    placeholder="e.g. IIT Bombay / Microsoft India"
                    value={organisingBody}
                    onChange={e => setOrganisingBody(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Start Date & End Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Financial Support Toggle & Conditional Fields (Section 5.2 / 9.2) */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>
                    {isStudent ? 'Stipend / Financial Grant Received?' : 'Financial Support Provided by Institute?'}
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="finSupport"
                        value="No"
                        checked={hasFinancialSupport === 'No'}
                        onChange={() => setHasFinancialSupport('No')}
                      /> No
                    </label>
                    <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="finSupport"
                        value="Yes"
                        checked={hasFinancialSupport === 'Yes'}
                        onChange={() => setHasFinancialSupport('Yes')}
                      /> Yes
                    </label>
                  </div>
                </div>

                {hasFinancialSupport === 'Yes' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                    <div>
                      <label style={labelStyle}>Amount Received (INR) *</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 5000"
                        value={financialAmount}
                        onChange={e => setFinancialAmount(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Nature of Support</label>
                      <select value={financialNature} onChange={e => setFinancialNature(e.target.value)} style={inputStyle}>
                        <option value="Registration Fee">Registration Fee</option>
                        <option value="Travelling & Lodging Allowance">Travelling & Lodging Allowance</option>
                        <option value="Sponsorship">Sponsorship / Fellowship</option>
                        <option value="Partial Support">Partial Support</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dynamic Section: Awards & Recognition Fields (Section 5.3 / 6.2) */}
          {isAward && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Award / Recognition & Achievement Specifics
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nature of Achievement</label>
                  <select value={awardNature} onChange={e => setAwardNature(e.target.value)} style={inputStyle}>
                    {(isStudent ? STUDENT_ACHIEVEMENT_NATURES : FACULTY_AWARD_NATURES).map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Level of Achievement</label>
                  <select value={level} onChange={e => setLevel(e.target.value)} style={inputStyle}>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Awarding Body / Agency Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ministry of Education / IEEE / ACM"
                    value={awardingBody}
                    onChange={e => setAwardingBody(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                {!isStudent ? (
                  <div>
                    <label style={labelStyle}>Awarding Agency Category</label>
                    <select value={bodyType} onChange={e => setBodyType(e.target.value)} style={inputStyle}>
                      <option value="Government">Government / Public Body</option>
                      <option value="Non-Government">Non-Government Organization</option>
                      <option value="International Body">International Body / UN</option>
                      <option value="Professional Body">Professional Body / Society</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Position Secured</label>
                    <select value={positionSecured} onChange={e => setPositionSecured(e.target.value)} style={inputStyle}>
                      <option value="1st Prize / Winner">1st Prize / Winner</option>
                      <option value="2nd Prize / Runner Up">2nd Prize / Runner Up</option>
                      <option value="3rd Prize">3rd Prize</option>
                      <option value="Consolation / Special Mention">Consolation / Special Mention</option>
                      <option value="Participant">Participant / Finalist</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Date of Award / Recognition</label>
                <input
                  type="date"
                  value={achievementDate}
                  onChange={e => setAchievementDate(e.target.value)}
                  style={{ ...inputStyle, width: '50%' }}
                />
              </div>
            </div>
          )}

          {/* Evidence File Upload (Section 8) */}
          <div>
            <label style={labelStyle}>
              Accreditation Evidence File (.pdf, .xlsx, .docx, .png, .jpg)
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
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Supported: PDF certificates, official letters, event brochures, photographs, and spreadsheets. Max 25MB.
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
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
