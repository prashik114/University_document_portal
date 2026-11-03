import { useState, useMemo } from 'react';
import { api } from '../services/api';
import { ROLE_COLORS, ROLE_CLEARANCE } from '../constants/users';

const PERM_LABELS = {
  manage_users:          'Manage All Users',
  manage_departments:    'Manage Departments',
  manage_settings:       'Manage System Settings',
  view_all_docs:         'View All Institution Documents',
  delete_docs:           'Delete Documents',
  reset_data:            'Reset System Data',
  configure_hod_scope:   'Configure HOD Department Scope',
  create_faculty:        'Provision Faculty Accounts',
  create_students:       'Provision Student Accounts',
  verify_docs:           'Verify & Endorse Documents',
  forward_to_iqac:       'Forward Documents to IQAC',
  return_docs:           'Return Documents for Correction',
  view_dept_docs:        'View Department Documents',
  generate_dept_reports: 'Generate Department Reports',
  upload_docs:           'Upload / Submit Documents',
  view_own_docs:         'View Own Documents',
  resubmit_docs:         'Resubmit Returned Documents',
  final_approve:         'Final IQAC Approval & Lock',
  lock_docs:             'Lock Approved SSR Records',
  generate_reports:      'Generate Institution-Wide Reports',
  return_to_dept:        'Return Records to Department',
  batch_lock:            'Batch-Lock IQAC Queue',
  view_approved_docs:    'View Approved Documents (Read-Only)',
  download_approved_docs:'Download Approved Evidence',
  view_reports:          'View Accreditation Reports',
  view_audit_logs:       'View Audit Trail & Logs',
};

const DEFAULT_ROLE_PERMS = {
  Admin:     ['manage_users', 'manage_departments', 'manage_settings', 'view_all_docs', 'delete_docs', 'reset_data', 'configure_hod_scope'],
  DeanHOD:   ['create_faculty', 'create_students', 'verify_docs', 'forward_to_iqac', 'return_docs', 'view_dept_docs', 'generate_dept_reports'],
  Faculty:   ['upload_docs', 'create_students', 'view_dept_docs', 'resubmit_docs', 'view_own_docs'],
  Student:   ['upload_docs', 'view_own_docs', 'resubmit_docs'],
  IQAC:      ['final_approve', 'lock_docs', 'view_all_docs', 'generate_reports', 'return_to_dept', 'batch_lock'],
  Inspector: ['view_approved_docs', 'download_approved_docs', 'view_reports', 'view_audit_logs'],
};

export default function AccountSettings({ currentUser, showToast }) {
  const roleColor = ROLE_COLORS[currentUser?.role] || '#2563eb';
  const clearanceDesc = ROLE_CLEARANCE[currentUser?.role] || 'Institutional Verified Access';

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState('security');

  // Change password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  // Private preferences state (stored in localStorage keyed by user id)
  const prefKey = `portal_prefs_${currentUser?.id || currentUser?.employeeId || 'default'}`;
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(prefKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      emailAlerts: true,
      workflowNotifications: true,
      twoFactorEnabled: false,
      compactView: false,
      highContrast: false,
    };
  });

  const handlePrefToggle = (key) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(prefKey, JSON.stringify(next));
      } catch (_) {}
      showToast('Preference updated.', 'info');
      return next;
    });
  };

  // User permissions list
  const userPerms = useMemo(() => {
    if (currentUser?.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0) {
      return currentUser.permissions;
    }
    if (currentUser?.customPermissions) {
      return currentUser.customPermissions.split(',').map(s => s.trim()).filter(Boolean);
    }
    return DEFAULT_ROLE_PERMS[currentUser?.role] || [];
  }, [currentUser]);

  // Additional departments (for HOD)
  const additionalDepts = useMemo(() => {
    if (!currentUser?.additionalDepartments) return [];
    return currentUser.additionalDepartments.split(',').map(d => d.trim()).filter(Boolean);
  }, [currentUser]);

  // Handle Change Password Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      showToast('Please enter your current password.', 'warning');
      return;
    }
    if (!newPassword.trim()) {
      showToast('Please enter a new password.', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation password do not match.', 'error');
      return;
    }
    if (newPassword === oldPassword) {
      showToast('New password must be different from your current password.', 'warning');
      return;
    }

    setPwdBusy(true);
    try {
      const userId = currentUser.id || currentUser.employeeId || currentUser.email;
      await api.changePassword(userId, oldPassword.trim(), newPassword.trim());
      showToast('Your password has been updated successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message || 'Failed to update password. Please check your current password.', 'error');
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="dashboard-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Account Settings
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Manage your personal profile, credentials, security password, and notification preferences.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '4px 12px', borderRadius: 9999, border: '1px solid #bbf7d0' }}>
            ● Active Institutional Session
          </span>
        </div>
      </div>

      {/* ── Profile Summary Card ────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%',
            background: roleColor, color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, flexShrink: 0,
            boxShadow: `0 4px 12px ${roleColor}33`,
            border: '3px solid #ffffff'
          }}>
            {currentUser?.avatar || currentUser?.name?.charAt(0) || 'U'}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
                {currentUser?.name}
              </h2>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: roleColor, background: `${roleColor}14`,
                padding: '2px 10px', borderRadius: 9999,
                border: `1px solid ${roleColor}33`,
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>
                {currentUser?.role}
              </span>
            </div>

            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {currentUser?.designation || 'Institutional Member'} · <span style={{ color: '#2563eb', fontWeight: 500 }}>{currentUser?.email}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, fontSize: 12, color: '#475569', flexWrap: 'wrap' }}>
              <span>
                <strong>ID:</strong> <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{currentUser?.employeeId || currentUser?.id || '—'}</code>
              </span>
              <span>·</span>
              <span>
                <strong>Department:</strong> {['Admin', 'IQAC', 'Inspector'].includes(currentUser?.role) ? (
                  <span style={{ color: '#166534', fontWeight: 600 }}>Central University Scope</span>
                ) : (
                  <span>{currentUser?.department || '—'}</span>
                )}
              </span>
              {additionalDepts.length > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: '#0284c7', fontWeight: 600 }}>
                    +{additionalDepts.length} Additional Dept Scope ({additionalDepts.join(', ')})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-Tab Navigation ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: 8, marginBottom: 24 }}>
        {[
          { id: 'security',    label: 'Security & Password',       icon: '🔒' },
          { id: 'profile',     label: 'Account Details & Scope',   icon: '👤' },
          { id: 'preferences', label: 'Preferences & Notifications', icon: '⚙️' },
          { id: 'permissions', label: 'Granted Permissions',       icon: '🛡️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeSubTab === tab.id ? `2px solid ${roleColor}` : '2px solid transparent',
              color: activeSubTab === tab.id ? roleColor : '#64748b',
              fontWeight: activeSubTab === tab.id ? 700 : 500,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: SECURITY & PASSWORD (PRIVATE) ═════════════════════════════ */}
      {activeSubTab === 'security' && (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 26, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Change Account Password
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
              Update your private login password. Passwords are encrypted and cannot be seen by others.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current Password */}
            <div>
              <label style={labelStyle}>Current Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  style={{ ...inputStyle, paddingRight: 40, fontFamily: showOld ? 'inherit' : 'monospace' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  style={eyeBtnStyle}
                  title={showOld ? 'Hide password' : 'Show password'}
                >
                  {showOld ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Default initial institutional password was <strong>Password@123</strong>.
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={labelStyle}>New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  required
                  minLength={6}
                  style={{ ...inputStyle, paddingRight: 40, fontFamily: showNew ? 'inherit' : 'monospace' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={eyeBtnStyle}
                  title={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Minimum 6 characters. Use letters, numbers, and symbols for better security.
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={labelStyle}>Confirm New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  style={{ ...inputStyle, paddingRight: 40, fontFamily: showConfirm ? 'inherit' : 'monospace' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={eyeBtnStyle}
                  title={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {newPassword && confirmPassword && (
                <div style={{ fontSize: 11, marginTop: 4, color: newPassword === confirmPassword ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {newPassword === confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div style={{ paddingTop: 6 }}>
              <button
                type="submit"
                disabled={pwdBusy}
                style={{
                  padding: '10px 22px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                  transition: 'background 0.15s ease'
                }}
              >
                {pwdBusy ? 'Updating Password…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══ TAB 2: PROFILE & INSTITUTIONAL SCOPE ════════════════════════════ */}
      {activeSubTab === 'profile' && (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 26, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Institutional Profile & Access Scope
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
              Official university directory record and assigned accreditation boundary.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={detailBoxStyle}>
              <div style={detailLabelStyle}>Official Full Name</div>
              <div style={detailValStyle}>{currentUser?.name}</div>
            </div>

            <div style={detailBoxStyle}>
              <div style={detailLabelStyle}>University Email Address</div>
              <div style={{ ...detailValStyle, color: '#2563eb' }}>{currentUser?.email}</div>
            </div>

            <div style={detailBoxStyle}>
              <div style={detailLabelStyle}>Institutional Role</div>
              <div style={detailValStyle}>
                <span style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 12, fontWeight: 700, background: `${roleColor}14`, color: roleColor }}>
                  {currentUser?.role}
                </span>
              </div>
            </div>

            <div style={detailBoxStyle}>
              <div style={detailLabelStyle}>Academic Designation / Title</div>
              <div style={detailValStyle}>{currentUser?.designation || 'Institutional Member'}</div>
            </div>

            <div style={detailBoxStyle}>
              <div style={detailLabelStyle}>Employee / Roll ID</div>
              <div style={{ ...detailValStyle, fontFamily: 'monospace' }}>
                {currentUser?.employeeId || currentUser?.id || '—'}
              </div>
            </div>

            <div style={detailBoxStyle}>
              <div style={detailLabelStyle}>Primary Assigned Department</div>
              <div style={detailValStyle}>
                {['Admin', 'IQAC', 'Inspector'].includes(currentUser?.role) ? (
                  <span style={{ color: '#166534', fontWeight: 600 }}>Institutional Governance / External Accreditation</span>
                ) : (
                  currentUser?.department || 'Not Assigned'
                )}
              </div>
            </div>
          </div>

          {/* HOD Additional Scope */}
          {currentUser?.role === 'DeanHOD' && (
            <div style={{ marginTop: 20, padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>
                Additional Department Verification Scope
              </div>
              <div style={{ fontSize: 12, color: '#0c4a6e', marginBottom: 10 }}>
                You have been granted document verification and endorsement authority over the following departments in addition to your primary department:
              </div>
              {additionalDepts.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {additionalDepts.map(d => (
                    <span key={d} style={{ background: '#ffffff', color: '#0284c7', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #7dd3fc' }}>
                      ✓ {d}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                  No additional departments assigned. Your access is isolated strictly to your primary department ({currentUser?.department}).
                </div>
              )}
            </div>
          )}

          {/* Clearance details */}
          <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12.5, color: '#475569' }}>
            <strong>Clearance Level:</strong> {clearanceDesc}
          </div>
        </div>
      )}

      {/* ═══ TAB 3: PREFERENCES & NOTIFICATIONS (PRIVATE) ════════════════════ */}
      {activeSubTab === 'preferences' && (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 26, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Private Preferences & Notifications
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
              Configure your personal workspace options. These settings apply only to your private account session.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                id: 'emailAlerts',
                title: 'Email Notifications',
                desc: 'Receive official university email alerts when documents are assigned, reviewed, endorsed, or returned.',
                active: preferences.emailAlerts
              },
              {
                id: 'workflowNotifications',
                title: 'Workflow Activity Bell Alerts',
                desc: 'Show in-app notification badges when items enter your verification or review queues.',
                active: preferences.workflowNotifications
              },
              {
                id: 'twoFactorEnabled',
                title: 'Two-Factor Authentication / OTP Prompt',
                desc: 'Prompt for 4-digit verification code in addition to password during sign-in.',
                active: preferences.twoFactorEnabled
              },
              {
                id: 'compactView',
                title: 'Compact Table View',
                desc: 'Reduce row padding in document repository and queue tables to fit more items on screen.',
                active: preferences.compactView
              },
            ].map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: item.active ? '#f8fafc' : '#ffffff'
                }}
              >
                <div style={{ paddingRight: 20 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePrefToggle(item.id)}
                  style={{
                    position: 'relative',
                    width: 44,
                    height: 24,
                    borderRadius: 9999,
                    border: 'none',
                    background: item.active ? '#2563eb' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0
                  }}
                  aria-checked={item.active}
                  role="switch"
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: item.active ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s'
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TAB 4: GRANTED PERMISSIONS ══════════════════════════════════════ */}
      {activeSubTab === 'permissions' && (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 26, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Account Permissions & Clearances
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
              These operational permissions are assigned to your account under institutional role-based access control.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {userPerms.map(pKey => (
              <div
                key={pKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#15803d' }}>
                  {PERM_LABELS[pKey] || pKey}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 14, background: '#fefce8', borderRadius: 8, border: '1px solid #fef08a', fontSize: 12, color: '#854d0e', lineHeight: 1.5 }}>
            🔒 <strong>Audit Integrity Notice:</strong> All upload, verification, approval, and data retrieval actions performed by this account are permanently recorded with timestamps and cryptographic verification hashes in the central University Audit Trail.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const labelStyle = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 };
const inputStyle = { width: '100%', height: 38, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const eyeBtnStyle = { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 };
const detailBoxStyle = { background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' };
const detailLabelStyle = { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 };
const detailValStyle = { fontSize: 13.5, fontWeight: 600, color: '#0f172a' };
