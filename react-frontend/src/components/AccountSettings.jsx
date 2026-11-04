import { useState, useMemo, useEffect } from 'react';
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
  Faculty:   ['upload_docs', 'create_students', 'verify_docs', 'view_dept_docs', 'resubmit_docs', 'view_own_docs'],
  Student:   ['upload_docs', 'view_own_docs', 'resubmit_docs'],
  IQAC:      ['final_approve', 'lock_docs', 'view_all_docs', 'generate_reports', 'return_to_dept', 'batch_lock'],
  Inspector: ['view_approved_docs', 'download_approved_docs', 'view_reports', 'view_audit_logs'],
};

export default function AccountSettings({ currentUser, onUpdateProfile, showToast }) {
  const roleColor = ROLE_COLORS[currentUser?.role] || '#2563eb';
  const clearanceDesc = ROLE_CLEARANCE[currentUser?.role] || 'Institutional Verified Access';

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'preferences', 'rbac'

  // Profile Edit State (Name and Email)
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name || '');
      setEditEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Change Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState(currentUser?.email || '');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [resetSentNotice, setResetSentNotice] = useState(null);

  // Preferences State
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
      autoSaveDrafts: true,
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

  // Granted permissions list
  const userPerms = useMemo(() => {
    if (currentUser?.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0) {
      return currentUser.permissions;
    }
    if (currentUser?.customPermissions) {
      return currentUser.customPermissions.split(',').map(s => s.trim()).filter(Boolean);
    }
    return DEFAULT_ROLE_PERMS[currentUser?.role] || [];
  }, [currentUser]);

  // Additional departments
  const additionalDepts = useMemo(() => {
    if (!currentUser?.additionalDepartments) return [];
    return currentUser.additionalDepartments.split(',').map(d => d.trim()).filter(Boolean);
  }, [currentUser]);

  // Handle Save Profile (Name & Email)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Please enter your full name.', 'warning');
      return;
    }
    if (!editEmail.trim() || !editEmail.includes('@')) {
      showToast('Please enter a valid official university email address.', 'warning');
      return;
    }

    setSavingProfile(true);
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({
          name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
        });
      } else {
        await api.updateUser(currentUser.id, {
          name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
        }, currentUser);
      }
      showToast('Profile information updated successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Change Password Submit
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      showToast('Please enter your current password.', 'warning');
      return;
    }
    if (!newPassword.trim()) {
      showToast('Please enter your new password.', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }
    if (newPassword === oldPassword) {
      showToast('New password must be different from current password.', 'warning');
      return;
    }

    setChangingPwd(true);
    try {
      const userId = currentUser.id || currentUser.employeeId || currentUser.email;
      await api.changePassword(userId, oldPassword.trim(), newPassword.trim());
      showToast('Your password has been changed successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message || 'Failed to change password. Please verify current password.', 'error');
    } finally {
      setChangingPwd(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const targetEmail = (forgotEmail || currentUser?.email || '').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      showToast('Please specify a valid institutional email address.', 'warning');
      return;
    }

    setForgotBusy(true);
    try {
      const res = await api.forgotPassword(targetEmail);
      setResetSentNotice({
        email: res.email || targetEmail,
        token: res.resetToken || ('RST-' + Date.now()),
        time: new Date().toLocaleTimeString(),
      });
      showToast(res.message || 'Password reset link sent to your registered email.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send password reset link.', 'error');
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: 40 }}>
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="dashboard-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Account Settings</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0284c7', background: '#e0f2fe', padding: '3px 10px', borderRadius: 9999 }}>
              Private User Settings
            </span>
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Manage your personal profile, credentials, security password, and private workspace preferences.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '4px 12px', borderRadius: 9999, border: '1px solid #bbf7d0' }}>
            ● Active Institutional Session
          </span>
        </div>
      </div>

      {/* ── Profile Summary Card ────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 22, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: roleColor, color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, flexShrink: 0,
            boxShadow: `0 4px 12px ${roleColor}33`,
            border: '3px solid #ffffff'
          }}>
            {currentUser?.avatar || currentUser?.name?.charAt(0) || 'U'}
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
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
              <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 4 }}>
                Active
              </span>
            </div>

            <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
              {currentUser?.designation || 'Institutional Member'} · <span style={{ color: '#2563eb', fontWeight: 500 }}>{currentUser?.email}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 12, color: '#475569', flexWrap: 'wrap' }}>
              <span>
                <strong>ID:</strong> <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{currentUser?.employeeId || currentUser?.id || '—'}</code>
              </span>
              <span>·</span>
              <span>
                <strong>Primary Department:</strong> {['Admin', 'IQAC', 'Inspector'].includes(currentUser?.role) ? (
                  <span style={{ color: '#166534', fontWeight: 600 }}>Central University Scope (No Dept Binding)</span>
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

      {/* ── Sub-Tab Navigation Bar ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: 6, marginBottom: 24, overflowX: 'auto' }}>
        {[
          { id: 'profile',     label: 'Profile & Identity',        icon: '👤', editable: true },
          { id: 'security',    label: 'Password & Recovery',       icon: '🔑', editable: true },
          { id: 'preferences', label: 'Preferences',               icon: '⚙️', editable: true },
          { id: 'rbac',        label: 'Roles, Rules & Permissions',icon: '🔒', locked: true },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '11px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${roleColor}` : '2px solid transparent',
              color: activeTab === tab.id ? roleColor : '#64748b',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.locked && (
              <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                LOCKED
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: PROFILE & IDENTITY (EDITABLE + LOCKED GOVERNANCE) ════════ */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Editable Section */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Editable Profile Details
                </h3>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>
                  Editable by You
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
                You can customize your displayed Full Name / Username and your official institutional email address.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>
                    Full Name / Username <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    style={inputStyle}
                  />
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                    Shown on your submitted documents, verification queues, and audit logs.
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Official Email ID <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="username@university.edu"
                    required
                    style={inputStyle}
                  />
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                    Used for portal login, security notifications, and reset dispatch.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 6 }}>
                <button
                  type="submit"
                  disabled={savingProfile || (editName === currentUser?.name && editEmail === currentUser?.email)}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 6,
                    border: 'none',
                    background: (editName === currentUser?.name && editEmail === currentUser?.email) ? '#cbd5e1' : '#2563eb',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: (editName === currentUser?.name && editEmail === currentUser?.email) ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {savingProfile ? 'Saving Changes…' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Locked Section: Things the user CANNOT change */}
          <div style={{ ...cardStyle, border: '1px solid #fecaca', background: '#fffbfa' }}>
            <div style={{ marginBottom: 16, borderBottom: '1px solid #fee2e2', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#991b1b' }}>
                    Institutional Department & Identity Assignments (Strictly Locked)
                  </h3>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 4 }}>
                  Cannot Be Changed by User
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#7f1d1d' }}>
                Under university governance policies, the following fields are locked and can only be modified by the Central IT Administrator.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Primary Department (Locked) */}
              <div style={lockedFieldStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={lockedLabelStyle}>Assigned Primary Department</span>
                  <span style={lockedBadgeStyle}>🔒 Locked</span>
                </div>
                <div style={lockedValueStyle}>
                  {['Admin', 'IQAC', 'Inspector'].includes(currentUser?.role) ? (
                    <span style={{ color: '#166534' }}>Institutional Wide Scope (No Department Binding)</span>
                  ) : (
                    currentUser?.department || 'Not Assigned'
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Department transfers require official clearance from University Academic Affairs.
                </div>
              </div>

              {/* Additional Departments / HOD Scope (Locked) */}
              <div style={lockedFieldStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={lockedLabelStyle}>Secondary Additional Departments (HOD Scope)</span>
                  <span style={lockedBadgeStyle}>🔒 Locked</span>
                </div>
                <div style={lockedValueStyle}>
                  {additionalDepts.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {additionalDepts.map(d => (
                        <span key={d} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: 600 }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#64748b' }}>None Assigned (Isolated to Primary Department)</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Configured exclusively under Rule 3 by Central IT Administrator.
                </div>
              </div>

              {/* Institutional Role (Locked) */}
              <div style={lockedFieldStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={lockedLabelStyle}>Assigned Institutional Role</span>
                  <span style={lockedBadgeStyle}>🔒 Locked</span>
                </div>
                <div style={lockedValueStyle}>
                  <span style={{ color: roleColor, fontWeight: 700 }}>{currentUser?.role}</span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Determines your verification queues, SSR lock authority, and report access.
                </div>
              </div>

              {/* Employee / Roll ID (Locked) */}
              <div style={lockedFieldStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={lockedLabelStyle}>Employee / Roll Identification ID</span>
                  <span style={lockedBadgeStyle}>🔒 Locked</span>
                </div>
                <div style={{ ...lockedValueStyle, fontFamily: 'monospace' }}>
                  {currentUser?.employeeId || currentUser?.id || '—'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Unique institutional registry ID assigned at provisioning.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: PASSWORD & RECOVERY (CHANGE PASSWORD + FORGET PASSWORD) ═══ */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Change Password Card */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Change Account Password
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
                Update your login password. Passwords are encrypted and protected under institutional security policies.
              </p>
            </div>

            <form onSubmit={handleChangePassword} style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Current Password */}
              <div>
                <label style={labelStyle}>Current Password <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Enter your current password"
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
                  Initial default password for newly provisioned accounts is <strong>Password@123</strong>.
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={labelStyle}>New Password <span style={{ color: '#dc2626' }}>*</span></label>
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
                  Minimum 6 characters. Must differ from your current password.
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={labelStyle}>Confirm New Password <span style={{ color: '#dc2626' }}>*</span></label>
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

              <div style={{ paddingTop: 4 }}>
                <button
                  type="submit"
                  disabled={changingPwd}
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
                  }}
                >
                  {changingPwd ? 'Updating Password…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Forgot Password Section */}
          <div style={{ ...cardStyle, border: '1px solid #bfdbfe', background: '#f8fafc' }}>
            <div style={{ marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0369a1' }}>
                  Forgot Password & Account Recovery
                </h3>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
                  Self-Service Reset
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
                If you forgot your password or need an official recovery email, request a secure reset dispatch link sent to your registered address.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Registered University Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={forgotBusy}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 6,
                    border: '1px solid #0284c7',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {forgotBusy ? 'Sending Reset Link…' : 'Send Password Reset Link'}
                </button>
              </div>

              {resetSentNotice && (
                <div style={{ marginTop: 10, padding: 14, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', color: '#166534', fontSize: 12.5 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Reset Link Dispatched Successfully</div>
                  <div>An official reset link with security token has been emailed to <strong>{resetSentNotice.email}</strong> at {resetSentNotice.time}.</div>
                  <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 11.5, color: '#15803d' }}>
                    Token Reference: {resetSentNotice.token}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ═══ TAB 3: USER PREFERENCES ══════════════════════════════════════════ */}
      {activeTab === 'preferences' && (
        <div style={cardStyle}>
          <div style={{ marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Private Preferences & Workspace Settings
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
              Configure your personal workspace and alert preferences. These settings apply only to your private user session.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                id: 'emailAlerts',
                title: 'Email Notifications & Alerts',
                desc: 'Receive official university email alerts whenever documents are submitted, endorsed by HOD, approved by IQAC, or returned for correction.',
                active: preferences.emailAlerts
              },
              {
                id: 'workflowNotifications',
                title: 'In-App Notification Bell Alerts',
                desc: 'Show real-time badge counters and alert toasts when records enter your verification or review queues.',
                active: preferences.workflowNotifications
              },
              {
                id: 'twoFactorEnabled',
                title: 'Two-Factor Authentication / OTP Prompt',
                desc: 'Prompt for a 4-digit verification OTP code in addition to password during institutional sign-in.',
                active: preferences.twoFactorEnabled
              },
              {
                id: 'compactView',
                title: 'Compact Density Table View',
                desc: 'Reduce padding in document repository tables and queue lists to display more data rows per screen.',
                active: preferences.compactView
              },
              {
                id: 'autoSaveDrafts',
                title: 'Auto-Save Document Upload Drafts',
                desc: 'Preserve in-progress form inputs locally so you do not lose data if your session is interrupted.',
                active: preferences.autoSaveDrafts
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

      {/* ═══ TAB 4: ROLES, RULES & PERMISSIONS (LOCKED VIEW-ONLY) ═════════════ */}
      {activeTab === 'rbac' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Institutional Governance Banner */}
          <div style={{ padding: '16px 20px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 24 }}>🔒</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>
                Institutional Governance & Security Clearance Policy (Strictly Locked)
              </div>
              <div style={{ fontSize: 12.5, color: '#7f1d1d', marginTop: 4, lineHeight: 1.5 }}>
                Under NAAC SSR Accreditation standards and university bylaws, <strong>Institutional Roles</strong>, <strong>Workflow Validation Rules</strong>, and <strong>Operational Permissions</strong> are strictly governed by Central IT Administration. Standard accounts cannot modify, escalate, or tamper with their assigned privileges.
              </div>
            </div>
          </div>

          {/* Section: Roles and Institutional Rules */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Assigned Role & Accreditation Rules
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
                Summary of the mandatory system constraints enforced on this account.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div style={ruleBoxStyle}>
                <div style={ruleTitleStyle}>Active Role Assignment</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: roleColor, marginTop: 4 }}>
                  {currentUser?.role}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Clearance: <strong>{clearanceDesc}</strong>
                </div>
              </div>

              <div style={ruleBoxStyle}>
                <div style={ruleTitleStyle}>Rule 1: Single HOD per Department</div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                  Each department is strictly restricted to at most one active Head of Department (HOD). Duplicate assignments are rejected by backend constraints.
                </div>
              </div>

              <div style={ruleBoxStyle}>
                <div style={ruleTitleStyle}>Rule 2: Central Role Isolation</div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                  Roles of <strong>Admin</strong>, <strong>IQAC Officer</strong>, and <strong>NAAC Inspector</strong> operate with institutional-wide scope and cannot be bound to individual academic departments.
                </div>
              </div>

              <div style={ruleBoxStyle}>
                <div style={ruleTitleStyle}>Rule 3: Multi-Department HOD Scope</div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                  Additional department review authorities can only be configured by Central Admin through dropdown selection in User Access Control.
                </div>
              </div>
            </div>
          </div>

          {/* Section: Granted Permissions Checklist (Locked) */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Assigned Operational Permissions ({userPerms.length} Active)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Read-only matrix of role-based security clearances granted to this account.
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '3px 9px', borderRadius: 4 }}>
                🔒 Read-Only
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {userPerms.map(pKey => (
                <div
                  key={pKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 6,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#15803d' }}>
                    {PERM_LABELS[pKey] || pKey}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, padding: 12, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>ℹ️</span>
              <span>
                To request additional functional permissions, submit an official RBAC privilege escalation ticket to the Central IT Admin.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared Styles ──────────────────────────────────────────────────────────────
const cardStyle = {
  background: '#ffffff',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const labelStyle = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  height: 38,
  padding: '0 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#ffffff',
  color: '#0f172a',
};

const eyeBtnStyle = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: 4,
};

const lockedFieldStyle = {
  background: '#f8fafc',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
};

const lockedLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const lockedBadgeStyle = {
  fontSize: 10,
  fontWeight: 700,
  color: '#991b1b',
  background: '#fee2e2',
  padding: '1px 6px',
  borderRadius: 4,
};

const lockedValueStyle = {
  fontSize: 13.5,
  fontWeight: 600,
  color: '#0f172a',
  marginTop: 4,
};

const ruleBoxStyle = {
  background: '#f8fafc',
  padding: '14px 16px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
};

const ruleTitleStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#0f172a',
};
