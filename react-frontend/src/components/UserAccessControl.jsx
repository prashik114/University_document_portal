/**
 * User Access Control Module
 * Admin-only tab for managing all portal users:
 *  - View all users with role/dept/status filters & search
 *  - Provision new users (all 6 roles)
 *  - Edit user details and designation
 *  - Activate / Deactivate accounts
 *  - Configure HOD department permissions (primary + additional)
 *  - Reset passwords
 *  - Delete accounts (with confirmation)
 */

import { useState, useMemo } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_ROLES = ['Admin', 'DeanHOD', 'Faculty', 'Student', 'IQAC', 'Inspector'];

const ROLE_META = {
  Admin:     { label: 'IT Admin',          color: '#4f46e5', bg: '#eef2ff' },
  DeanHOD:   { label: 'HOD / Dean',        color: '#059669', bg: '#ecfdf5' },
  Faculty:   { label: 'Faculty',           color: '#2563eb', bg: '#eff6ff' },
  Student:   { label: 'Student',           color: '#0891b2', bg: '#ecfeff' },
  IQAC:      { label: 'IQAC Officer',      color: '#7c3aed', bg: '#f5f3ff' },
  Inspector: { label: 'NAAC Inspector',    color: '#d97706', bg: '#fffbeb' },
};

const PERMISSIONS_MATRIX = {
  Admin:     ['manage_users', 'manage_departments', 'manage_settings', 'view_all_docs', 'delete_docs', 'reset_data', 'configure_hod_scope'],
  DeanHOD:   ['create_faculty', 'create_students', 'verify_docs', 'forward_to_iqac', 'return_docs', 'view_dept_docs', 'generate_dept_reports'],
  Faculty:   ['upload_docs', 'create_students', 'view_dept_docs', 'resubmit_docs', 'view_own_docs'],
  Student:   ['upload_docs', 'view_own_docs', 'resubmit_docs'],
  IQAC:      ['final_approve', 'lock_docs', 'view_all_docs', 'generate_reports', 'return_to_dept', 'batch_lock'],
  Inspector: ['view_approved_docs', 'download_approved_docs', 'view_reports', 'view_audit_logs'],
};

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

const EMPTY_FORM = {
  name: '', email: '', role: 'Faculty', designation: '', department: '',
  employeeId: '', status: 'Active', additionalDepartments: '', password: '',
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function UserAccessControl({
  currentUser,
  users,
  departments,
  onProvision,
  onUpdate,
  onUpdateStatus,
  onUpdatePermissions,
  onDelete,
  showToast,
}) {
  // ── Filters & search ──────────────────────────────────────────────────────
  const [filterRole,   setFilterRole]   = useState('ALL');
  const [filterDept,   setFilterDept]   = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery,  setSearchQuery]  = useState('');

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showCreateModal,  setShowCreateModal]  = useState(false);
  const [editUser,         setEditUser]         = useState(null);       // user being edited
  const [permUser,         setPermUser]         = useState(null);       // user for permissions view
  const [confirmDelete,    setConfirmDelete]    = useState(null);       // user to delete
  const [form,             setForm]             = useState(EMPTY_FORM);
  const [formBusy,         setFormBusy]         = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const deptNames = useMemo(() =>
    ['ALL', ...new Set(departments.map(d => d.name).filter(Boolean))],
    [departments]
  );

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (filterRole   !== 'ALL' && u.role       !== filterRole)   return false;
      if (filterDept   !== 'ALL' && u.department !== filterDept)   return false;
      if (filterStatus !== 'ALL' && u.status     !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          u.name?.toLowerCase().includes(q)       ||
          u.email?.toLowerCase().includes(q)      ||
          u.employeeId?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, filterRole, filterDept, filterStatus, searchQuery]);

  const roleCounts = useMemo(() => {
    const counts = {};
    ALL_ROLES.forEach(r => { counts[r] = users.filter(u => u.role === r).length; });
    return counts;
  }, [users]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditUser(null);
    setShowCreateModal(true);
  };

  const openEdit = (user) => {
    setForm({
      name:                  user.name || '',
      email:                 user.email || '',
      role:                  user.role || 'Faculty',
      designation:           user.designation || '',
      department:            user.department || '',
      employeeId:            user.employeeId || '',
      status:                user.status || 'Active',
      additionalDepartments: user.additionalDepartments || '',
      password:              '',
    });
    setEditUser(user);
    setShowCreateModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      showToast('Name and email are required.', 'warning');
      return;
    }
    if (!editUser && !form.password.trim()) {
      showToast('Password is required when creating a new user.', 'warning');
      return;
    }
    setFormBusy(true);
    try {
      const isInstitutional = ['Admin', 'IQAC', 'Inspector'].includes(form.role);

      if (form.role === 'DeanHOD' && form.department) {
        const existingHod = users.find(u => u.role === 'DeanHOD' && u.status === 'Active' && (!editUser || u.id !== editUser.id) && u.department && u.department.trim().toLowerCase() === form.department.trim().toLowerCase());
        if (existingHod) {
          showToast(`Department '${form.department}' already has an assigned Head of Department (${existingHod.name}). Each department can only have a single HOD.`, 'error');
          setFormBusy(false);
          return;
        }
      }

      const payload = {
        name:        form.name.trim(),
        email:       form.email.trim().toLowerCase(),
        role:        form.role,
        designation: form.designation.trim(),
        department:  isInstitutional ? '' : form.department.trim(),
        employeeId:  form.employeeId.trim(),
        status:      form.status,
        additionalDepartments: (!isInstitutional && form.role === 'DeanHOD') ? form.additionalDepartments.trim() : '',
        ...(form.password.trim() ? { passwordHash: form.password.trim() } : {}),
      };

      if (editUser) {
        await onUpdate(editUser.id, payload);
        showToast(`${payload.name}'s account updated successfully.`, 'success');
      } else {
        await onProvision(payload);
        showToast(`${payload.name} provisioned as ${payload.role}.`, 'success');
      }
      setShowCreateModal(false);
    } catch (err) {
      showToast(err.message || 'Operation failed. Please try again.', 'error');
    } finally {
      setFormBusy(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await onUpdateStatus(user.id, newStatus);
      showToast(`${user.name} account ${newStatus === 'Active' ? 'activated' : 'deactivated'}.`, 'success');
    } catch (err) {
      showToast(err.message || 'Status update failed.', 'error');
    }
  };

  const handleSavePermissions = async (userId, additionalDepts) => {
    try {
      await onUpdatePermissions(userId, { additionalDepartments: additionalDepts });
      showToast('Department permissions updated.', 'success');
      setPermUser(null);
    } catch (err) {
      showToast(err.message || 'Permission update failed.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await onDelete(confirmDelete.id);
      showToast(`${confirmDelete.name}'s account has been deleted.`, 'info');
      setConfirmDelete(null);
    } catch (err) {
      showToast(err.message || 'Delete failed.', 'error');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            User Access Control
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Manage institutional user accounts, roles, department assignments, and access permissions.
          </p>
        </div>
        <button className="primary-btn" onClick={openCreate}>
          + Provision New User
        </button>
      </div>

      {/* ── Role Summary Cards ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        {ALL_ROLES.map(role => {
          const meta = ROLE_META[role];
          return (
            <button
              key={role}
              onClick={() => setFilterRole(filterRole === role ? 'ALL' : role)}
              style={{
                padding: '14px 12px',
                borderRadius: 10,
                border: `2px solid ${filterRole === role ? meta.color : '#e2e8f0'}`,
                background: filterRole === role ? meta.bg : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all .15s ease',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: meta.color }}>{roleCounts[role] || 0}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginTop: 3 }}>{meta.label}</div>
            </button>
          );
        })}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-card-header">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: 15, height: 15, pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="search"
                placeholder="Search by name, email, ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 30, height: 34, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none', width: 230, fontFamily: 'inherit' }}
              />
            </div>
            <select className="select-filter" value={filterRole}   onChange={e => setFilterRole(e.target.value)}>
              <option value="ALL">All Roles</option>
              {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
            </select>
            <select className="select-filter" value={filterDept}   onChange={e => setFilterDept(e.target.value)}>
              {deptNames.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>)}
            </select>
            <select className="select-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', whiteSpace: 'nowrap', alignSelf: 'center' }}>
            {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* ── User Table ──────────────────────────────────────────────────────── */}
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                <th style={{ padding: '12px 16px' }}>User</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Employee ID</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No users found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Try changing filters or search query.</div>
                  </td>
                </tr>
              ) : filteredUsers.map(user => {
                const meta = ROLE_META[user.role] || { color: '#475569', bg: '#f1f5f9', label: user.role };
                const isActive = user.status === 'Active';
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    {/* User cell */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: meta.bg, color: meta.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, flexShrink: 0,
                          border: `1px solid ${meta.color}33`,
                        }}>
                          {user.avatar || user.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{user.name}</div>
                          <div style={{ fontSize: 11.5, color: '#64748b' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                    {/* Department */}
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: 12.5 }}>
                      {['Admin', 'IQAC', 'Inspector'].includes(user.role) ? (
                        <div style={{ color: '#64748b', fontSize: 11.5, fontStyle: 'italic' }}>Institutional Scope</div>
                      ) : (
                        <>
                          <div>{user.department || '—'}</div>
                          {user.additionalDepartments && (
                            <div style={{ fontSize: 11, color: '#0284c7', marginTop: 2 }}>
                              +{user.additionalDepartments.split(',').length} additional
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    {/* Employee ID */}
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>
                      {user.employeeId || '—'}
                    </td>
                    {/* Status toggle */}
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        style={{
                          padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          border: 'none',
                          background: isActive ? '#dcfce7' : '#fee2e2',
                          color:      isActive ? '#15803d' : '#b91c1c',
                        }}
                        title={`Click to ${isActive ? 'deactivate' : 'activate'}`}
                      >
                        {isActive ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => openEdit(user)}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        {(user.role === 'DeanHOD') && (
                          <button
                            onClick={() => setPermUser(user)}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #7c3aed', background: '#f5f3ff', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Permissions
                          </button>
                        )}
                        <button
                          onClick={() => setPermUser(user)}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Access
                        </button>
                        {user.id !== currentUser.id && (
                          <button
                            onClick={() => setConfirmDelete(user)}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ────────────────────────────────────────────────── */}
      {showCreateModal && (
        <UserFormModal
          form={form}
          setForm={setForm}
          isEdit={!!editUser}
          editUserId={editUser?.id}
          departments={departments}
          users={users}
          onSubmit={handleFormSubmit}
          onClose={() => setShowCreateModal(false)}
          busy={formBusy}
        />
      )}

      {/* ── Permissions / Access View Modal ────────────────────────────────────── */}
      {permUser && (
        <PermissionsModal
          user={permUser}
          departments={departments}
          onSave={handleSavePermissions}
          onClose={() => setPermUser(null)}
        />
      )}

      {/* ── Delete Confirmation ─────────────────────────────────────────────── */}
      {confirmDelete && (
        <ConfirmDeleteModal
          user={confirmDelete}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── UserFormModal ──────────────────────────────────────────────────────────────

function UserFormModal({ form, setForm, isEdit, editUserId, departments, users, onSubmit, onClose, busy }) {
  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));
  const deptOptions = departments.map(d => d.name).filter(Boolean);

  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true"
      style={{ display: 'flex', zIndex: 99999 }}>
      <div className="modal-dialog" style={{ maxWidth: 580, width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              {isEdit ? 'Edit User Account' : 'Provision New User'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {isEdit ? 'Update account details and assignments.' : 'Create a new institutional account and assign role.'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>&times;</button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '70vh' }}>

          {/* Name + Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Full Name *" value={form.name} onChange={v => f('name', v)} placeholder="e.g. Dr. Priya Sharma" />
            <Field label="Official Email *" type="email" value={form.email} onChange={v => f('email', v)} placeholder="name@university.edu" disabled={isEdit} />
          </div>

          {/* Role + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Role *</label>
              <select value={form.role} onChange={e => f('role', e.target.value)} style={selectStyle} required>
                {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Account Status</label>
              <select value={form.status} onChange={e => f('status', e.target.value)} style={selectStyle}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Designation + Employee ID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Designation" value={form.designation} onChange={v => f('designation', v)} placeholder="e.g. Associate Professor" />
            <Field label="Employee / Roll ID" value={form.employeeId} onChange={v => f('employeeId', v)} placeholder="e.g. FAC-CSE-0123" />
          </div>

          {/* Primary Department (Excluded for Admin, IQAC, Inspector) */}
          {['Admin', 'IQAC', 'Inspector'].includes(form.role) ? (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534' }}>
              <strong>Institutional Governance / External Role:</strong> This account operates at the central university or external accreditation level and does not belong to any institute department.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Primary Department *</label>
                {form.role === 'DeanHOD' && (
                  <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>Rule: Single HOD per department</span>
                )}
              </div>
              <select value={form.department} onChange={e => f('department', e.target.value)} style={selectStyle} required>
                <option value="">— Select Department —</option>
                {deptOptions.map(d => {
                  const existingHod = (form.role === 'DeanHOD' && users)
                    ? users.find(u => u.role === 'DeanHOD' && (u.status || 'Active') === 'Active' && (!isEdit || u.id !== editUserId) && u.department && u.department.trim().toLowerCase() === d.trim().toLowerCase())
                    : null;
                  return (
                    <option key={d} value={d} disabled={Boolean(existingHod)}>
                      {d} {existingHod ? `(HOD: ${existingHod.name} - Occupied)` : ' (Available)'}
                    </option>
                  );
                })}
              </select>
              {form.role === 'DeanHOD' && form.department && users && users.find(u => u.role === 'DeanHOD' && (u.status || 'Active') === 'Active' && (!isEdit || u.id !== editUserId) && u.department && u.department.trim().toLowerCase() === form.department.trim().toLowerCase()) && (
                <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                  ⚠️ This department already has an assigned HOD. Each department can only have a single HOD.
                </div>
              )}
            </div>
          )}

          {/* Additional Departments (HOD only) */}
          {form.role === 'DeanHOD' && (
            <div>
              <label style={labelStyle}>Additional Departments (HOD Scope)</label>
              <input
                type="text"
                value={form.additionalDepartments}
                onChange={e => f('additionalDepartments', e.target.value)}
                placeholder="e.g. Electronics & Communication Engineering, Mechanical Engineering"
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Comma-separated. HOD will have verification authority over these departments in addition to their primary.
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label style={labelStyle}>{isEdit ? 'New Password (leave blank to keep current)' : 'Initial Password *'}</label>
            <input
              type="password"
              value={form.password}
              onChange={e => f('password', e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep unchanged' : 'Set initial password'}
              required={!isEdit}
              style={inputStyle}
              autoComplete="new-password"
            />
          </div>

          {/* Role permissions preview */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .4 }}>
              Permissions granted to {ROLE_META[form.role]?.label || form.role}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(PERMISSIONS_MATRIX[form.role] || []).map(p => (
                <span key={p} style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: '#e0f2fe', color: '#075985' }}>
                  {PERM_LABELS[p] || p}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} disabled={busy}
              style={{ padding: '9px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={busy}
              style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Provision Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PermissionsModal ───────────────────────────────────────────────────────────

function PermissionsModal({ user, departments, onSave, onClose }) {
  const meta = ROLE_META[user.role] || { color: '#475569', bg: '#f1f5f9', label: user.role };
  const rolePerms = PERMISSIONS_MATRIX[user.role] || [];
  const [additionalDepts, setAdditionalDepts] = useState(user.additionalDepartments || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(user.id, additionalDepts);
    setSaving(false);
  };

  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true"
      style={{ display: 'flex', zIndex: 99999 }}>
      <div className="modal-dialog" style={{ maxWidth: 560, width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Access & Permissions</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{user.name} — {meta.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>&times;</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', maxHeight: '70vh' }}>
          {/* User info strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: meta.bg, borderRadius: 8, border: `1px solid ${meta.color}22` }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: meta.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
              {user.avatar || user.name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{user.email} · {user.employeeId}</div>
            </div>
            <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
              {meta.label}
            </span>
          </div>

          {/* Role permissions (read-only) */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
              Role-Based Permissions ({rolePerms.length} granted)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {rolePerms.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize: 11.5, color: '#15803d', fontWeight: 600 }}>{PERM_LABELS[p] || p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Restrictions (read-only display) */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
              Access Restrictions
            </div>
            <RestrictionsList role={user.role} />
          </div>

          {/* HOD: Additional department scope (editable by Admin) */}
          {user.role === 'DeanHOD' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                Additional Department Scope
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                Primary department: <strong style={{ color: '#0f172a' }}>{user.department || '—'}</strong>
              </div>
              <input
                type="text"
                value={additionalDepts}
                onChange={e => setAdditionalDepts(e.target.value)}
                placeholder="e.g. Mechanical Engineering, Management Studies"
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Comma-separated department names. HOD will have verification authority over these departments.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {saving ? 'Saving…' : 'Save Scope'}
                </button>
              </div>
            </div>
          )}

          {user.role !== 'DeanHOD' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ConfirmDeleteModal ─────────────────────────────────────────────────────────

function ConfirmDeleteModal({ user, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true"
      style={{ display: 'flex', zIndex: 100000 }}>
      <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 12, padding: '28px 28px 24px', margin: '20px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Delete User Account</div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
              You are about to permanently delete <strong>{user.name}</strong>'s account ({user.role} · {user.department || 'No dept'}). This action cannot be undone.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Delete Account</button>
        </div>
      </div>
    </div>
  );
}

// ── RestrictionsList ───────────────────────────────────────────────────────────

function RestrictionsList({ role }) {
  const RESTRICTIONS = {
    Admin:     ['No role can override the Central IT Admin.'],
    DeanHOD:   ['Cannot create HOD, Admin, IQAC, or Inspector accounts.', 'Cannot access departments not assigned by IT Admin.', 'Cannot approve documents on behalf of IQAC.', 'Cannot unlock IQAC-locked documents.'],
    Faculty:   ['Cannot access other departments.', 'Cannot approve documents as HOD or IQAC.', 'Cannot modify IQAC-locked documents.'],
    Student:   ['Cannot view or modify another student\'s account or documents.', 'Cannot approve documents.', 'Cannot modify approved and locked documents.'],
    IQAC:      ['Approved documents must not be directly editable.', 'Corrections must use a controlled correction process.'],
    Inspector: ['Cannot create, edit, delete, approve, reject, or modify any record.', 'Cannot access records outside assigned audit scope.', 'All downloads are logged in the audit trail.'],
  };
  const list = RESTRICTIONS[role] || ['No additional restrictions defined.'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {list.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '6px 10px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.4 }}>{r}</span>
        </div>
      ))}
    </div>
  );
}

// ── Shared form helpers ────────────────────────────────────────────────────────

const labelStyle = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 };
const inputStyle  = { width: '100%', height: 38, padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle, appearance: 'none', cursor: 'pointer', paddingRight: 28, background: '#fff url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E") no-repeat right 8px center / 13px' };

function Field({ label, value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ ...inputStyle, ...(disabled ? { background: '#f8fafc', color: '#94a3b8' } : {}) }}
      />
    </div>
  );
}
