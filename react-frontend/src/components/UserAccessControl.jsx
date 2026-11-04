/**
 * User Access Control Module
 * Role-aware management of users based on institutional hierarchy:
 *  - Admin: Can create, view, and edit HOD, Faculty, Students (and institutional roles)
 *  - HOD: Can create, view, and edit Faculty and Students only within assigned departments
 *  - Faculty: Can create, view, and edit Students only within their assigned department
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
  employeeId: '', status: 'Active', additionalDepartments: '', password: 'Password@123',
  permissions: PERMISSIONS_MATRIX['Faculty'] || [],
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
  const isAdmin = currentUser?.role === 'Admin';
  const isHOD = currentUser?.role === 'DeanHOD';
  const isFaculty = currentUser?.role === 'Faculty';

  // Allowed departments for HOD
  const hodAllowedDepts = useMemo(() => {
    if (!isHOD) return [];
    const depts = [];
    if (currentUser?.department && currentUser.department.trim()) {
      depts.push(currentUser.department.trim());
    }
    if (currentUser?.additionalDepartments) {
      currentUser.additionalDepartments.split(',').forEach(d => {
        const trimmed = d.trim();
        if (trimmed && !depts.some(x => x.toLowerCase() === trimmed.toLowerCase())) {
          depts.push(trimmed);
        }
      });
    }
    return depts;
  }, [isHOD, currentUser]);

  // Scoped users visible to current role:
  // - Admin: All users (HOD, Faculty, Students, Admin, IQAC, Inspector)
  // - HOD: Faculty and Students only in their assigned departments
  // - Faculty: Students only in their assigned department
  const scopedUsers = useMemo(() => {
    if (isAdmin) {
      return users;
    }
    if (isHOD) {
      return users.filter(u => {
        const isTarget = u.role === 'Faculty' || u.role === 'Student';
        if (!isTarget) return false;
        if (hodAllowedDepts.length === 0) return true;
        return u.department && hodAllowedDepts.some(ad => ad.toLowerCase() === u.department.trim().toLowerCase());
      });
    }
    if (isFaculty) {
      return users.filter(u => {
        if (u.role !== 'Student') return false;
        if (!currentUser?.department) return true;
        return u.department && u.department.trim().toLowerCase() === currentUser.department.trim().toLowerCase();
      });
    }
    return [];
  }, [isAdmin, isHOD, isFaculty, users, hodAllowedDepts, currentUser]);

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

  // Department filter options based on caller
  const deptFilterOptions = useMemo(() => {
    if (isAdmin) {
      return ['ALL', ...new Set(departments.map(d => d.name).filter(Boolean))];
    }
    if (isHOD) {
      return ['ALL', ...hodAllowedDepts];
    }
    return ['ALL', currentUser?.department].filter(Boolean);
  }, [isAdmin, isHOD, departments, hodAllowedDepts, currentUser]);

  const filteredUsers = useMemo(() => {
    return scopedUsers.filter(u => {
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
  }, [scopedUsers, filterRole, filterDept, filterStatus, searchQuery]);

  // Role Counts for Summary Cards
  const roleCounts = useMemo(() => {
    const counts = {};
    ALL_ROLES.forEach(r => { counts[r] = scopedUsers.filter(u => u.role === r).length; });
    return counts;
  }, [scopedUsers]);

  // Check if current user can edit a target user
  const canEditUser = (targetUser) => {
    if (isAdmin) return true;
    if (isHOD) {
      if (targetUser.role !== 'Faculty' && targetUser.role !== 'Student') return false;
      if (hodAllowedDepts.length === 0) return true;
      return targetUser.department && hodAllowedDepts.some(ad => ad.toLowerCase() === targetUser.department.trim().toLowerCase());
    }
    if (isFaculty) {
      if (targetUser.role !== 'Student') return false;
      if (!currentUser?.department) return true;
      return targetUser.department && targetUser.department.trim().toLowerCase() === currentUser.department.trim().toLowerCase();
    }
    return false;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    const defaultRole = isAdmin ? 'DeanHOD' : isHOD ? 'Faculty' : 'Student';
    const defaultDept = isFaculty ? (currentUser?.department || '')
                      : isHOD ? (currentUser?.department || (hodAllowedDepts[0] || ''))
                      : '';

    setForm({
      ...EMPTY_FORM,
      role: defaultRole,
      department: defaultDept,
      password: 'Password@123',
      permissions: [...(PERMISSIONS_MATRIX[defaultRole] || [])],
    });
    setEditUser(null);
    setShowCreateModal(true);
  };

  const openEdit = (user) => {
    if (!canEditUser(user)) {
      showToast('Access Denied: You cannot edit this user account.', 'error');
      return;
    }

    let perms = [];
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      perms = [...user.permissions];
    } else if (user.customPermissions && user.customPermissions.trim()) {
      perms = user.customPermissions.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      perms = [...(PERMISSIONS_MATRIX[user.role] || [])];
    }

    setForm({
      name:                  user.name || '',
      email:                 user.email || '',
      role:                  user.role || (isFaculty ? 'Student' : 'Faculty'),
      designation:           user.designation || '',
      department:            user.department || '',
      employeeId:            user.employeeId || '',
      status:                user.status || 'Active',
      additionalDepartments: user.additionalDepartments || '',
      password:              'Password@123',
      permissions:           perms,
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

    // Role boundary validation
    if (isHOD && form.role !== 'Faculty' && form.role !== 'Student') {
      showToast('Access Denied: HOD can only provision/edit Faculty and Student accounts.', 'error');
      return;
    }
    if (isFaculty && form.role !== 'Student') {
      showToast('Access Denied: Faculty can only provision/edit Student accounts.', 'error');
      return;
    }

    // Department boundary validation
    if (isHOD && form.department && !hodAllowedDepts.some(d => d.toLowerCase() === form.department.trim().toLowerCase())) {
      showToast(`Access Denied: Department must be within your assigned departments (${hodAllowedDepts.join(', ')}).`, 'error');
      return;
    }
    if (isFaculty && form.department && currentUser?.department && form.department.trim().toLowerCase() !== currentUser.department.trim().toLowerCase()) {
      showToast(`Access Denied: You can only provision/edit Students in your department (${currentUser.department}).`, 'error');
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

      const activePerms = form.permissions && form.permissions.length > 0
        ? form.permissions
        : (PERMISSIONS_MATRIX[form.role] || []);

      const assignedDept = isInstitutional ? '' : (isFaculty ? (currentUser?.department || form.department.trim()) : form.department.trim());

      const payload = {
        name:        form.name.trim(),
        email:       form.email.trim().toLowerCase(),
        role:        form.role,
        designation: form.designation.trim(),
        department:  assignedDept,
        employeeId:  form.employeeId.trim(),
        status:      form.status,
        additionalDepartments: (!isInstitutional && form.role === 'DeanHOD' && isAdmin) ? form.additionalDepartments.trim() : '',
        permissions: activePerms,
        customPermissions: activePerms.join(','),
        passwordHash: form.password && form.password.trim() ? form.password.trim() : 'Password@123',
      };

      if (editUser) {
        await onUpdate(editUser.id, payload, currentUser);
        showToast(`${payload.name}'s account updated successfully.`, 'success');
      } else {
        await onProvision(payload, currentUser);
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
    if (!canEditUser(user)) {
      showToast('Access Denied: You cannot change status for this account.', 'error');
      return;
    }
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await onUpdateStatus(user.id, newStatus);
      showToast(`${user.name} account ${newStatus === 'Active' ? 'activated' : 'deactivated'}.`, 'success');
    } catch (err) {
      showToast(err.message || 'Status update failed.', 'error');
    }
  };

  const handleSavePermissions = async (userId, payload) => {
    try {
      await onUpdatePermissions(userId, payload);
      showToast('Permissions updated successfully.', 'success');
      setPermUser(null);
    } catch (err) {
      try {
        await onUpdate(userId, payload, currentUser);
        showToast('Permissions updated successfully.', 'success');
        setPermUser(null);
      } catch (err2) {
        showToast(err2.message || 'Permission update failed.', 'error');
      }
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !confirmDelete) return;
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
            {isAdmin ? 'User Access Control' : isHOD ? 'Department User Management' : 'Student Account Management'}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            {isAdmin && 'Manage institutional user accounts, roles (HOD, Faculty, Students), department assignments, and permissions.'}
            {isHOD && `Provision, view, and edit Faculty and Student accounts for ${currentUser?.department || 'your department'}${hodAllowedDepts.length > 1 ? ` & additional scope (${hodAllowedDepts.slice(1).join(', ')})` : ''}.`}
            {isFaculty && `Provision, view, and edit Student accounts belonging to ${currentUser?.department || 'your department'}.`}
          </p>
        </div>
        <button className="primary-btn" onClick={openCreate}>
          {isAdmin ? '+ Provision New User' : isHOD ? '+ Provision Faculty / Student' : '+ Provision New Student'}
        </button>
      </div>

      {/* ── Role Summary KPI Cards ─────────────────────────────────────────── */}
      {isAdmin ? (
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
      ) : isHOD ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{scopedUsers.length}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginTop: 3 }}>Total Department Members</div>
          </div>
          <button
            onClick={() => setFilterRole(filterRole === 'Faculty' ? 'ALL' : 'Faculty')}
            style={{
              background: filterRole === 'Faculty' ? '#eff6ff' : '#fff',
              padding: '14px 16px', borderRadius: 10,
              border: `2px solid ${filterRole === 'Faculty' ? '#2563eb' : '#e2e8f0'}`,
              textAlign: 'left', cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>
              {scopedUsers.filter(u => u.role === 'Faculty').length}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginTop: 3 }}>Faculty Accounts</div>
          </button>
          <button
            onClick={() => setFilterRole(filterRole === 'Student' ? 'ALL' : 'Student')}
            style={{
              background: filterRole === 'Student' ? '#ecfeff' : '#fff',
              padding: '14px 16px', borderRadius: 10,
              border: `2px solid ${filterRole === 'Student' ? '#0891b2' : '#e2e8f0'}`,
              textAlign: 'left', cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0891b2' }}>
              {scopedUsers.filter(u => u.role === 'Student').length}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginTop: 3 }}>Student Accounts</div>
          </button>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>
              {scopedUsers.filter(u => u.status === 'Active').length}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginTop: 3 }}>Active Accounts</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0891b2' }}>{scopedUsers.length}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginTop: 3 }}>Total Students ({currentUser?.department})</div>
          </div>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>
              {scopedUsers.filter(u => u.status === 'Active').length}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginTop: 3 }}>Active Students</div>
          </div>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>
              {scopedUsers.filter(u => u.status !== 'Active').length}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginTop: 3 }}>Inactive Students</div>
          </div>
        </div>
      )}

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

            {/* Role Filter */}
            {isAdmin ? (
              <select className="select-filter" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="ALL">All Roles</option>
                {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
              </select>
            ) : isHOD ? (
              <select className="select-filter" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="ALL">All Roles (Faculty & Students)</option>
                <option value="Faculty">Faculty Only</option>
                <option value="Student">Student Only</option>
              </select>
            ) : null}

            {/* Department Filter */}
            {(isAdmin || (isHOD && hodAllowedDepts.length > 1)) && (
              <select className="select-filter" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                {deptFilterOptions.map(d => <option key={d} value={d}>{d === 'ALL' ? (isHOD ? 'All Assigned Departments' : 'All Departments') : d}</option>)}
              </select>
            )}

            <select className="select-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', whiteSpace: 'nowrap', alignSelf: 'center' }}>
            {filteredUsers.length} of {scopedUsers.length} users
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
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {isHOD ? 'No Faculty or Student accounts match your search or department filters.' : isFaculty ? 'No Student accounts found in your department.' : 'Try changing filters or search query.'}
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.map(user => {
                const meta = ROLE_META[user.role] || { color: '#475569', bg: '#f1f5f9', label: user.role };
                const isActive = user.status === 'Active';
                const canEdit = canEditUser(user);

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
                      {canEdit ? (
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
                      ) : (
                        <span style={{
                          padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
                          background: isActive ? '#dcfce7' : '#fee2e2',
                          color:      isActive ? '#15803d' : '#b91c1c',
                        }}>
                          {isActive ? '● Active' : '○ Inactive'}
                        </span>
                      )}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {canEdit && (
                          <button
                            onClick={() => openEdit(user)}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => setPermUser(user)}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #7c3aed', background: '#f5f3ff', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Permissions
                          </button>
                        )}
                        {isAdmin && user.id !== currentUser.id && (
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
          currentUser={currentUser}
          hodAllowedDepts={hodAllowedDepts}
          onSubmit={handleFormSubmit}
          onClose={() => setShowCreateModal(false)}
          busy={formBusy}
        />
      )}

      {/* ── Permissions / Access View Modal (Admin only) ───────────────────────── */}
      {permUser && canEditUser(permUser) && (
        <PermissionsModal
          user={permUser}
          departments={departments}
          onSave={handleSavePermissions}
          onClose={() => setPermUser(null)}
        />
      )}

      {/* ── Delete Confirmation (Admin only) ─────────────────────────────────── */}
      {confirmDelete && isAdmin && (
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

function UserFormModal({
  form,
  setForm,
  isEdit,
  editUserId,
  departments,
  users,
  currentUser,
  hodAllowedDepts,
  onSubmit,
  onClose,
  busy,
}) {
  const isCurrentAdmin = currentUser?.role === 'Admin';
  const isCurrentHOD = currentUser?.role === 'DeanHOD';
  const isCurrentFaculty = currentUser?.role === 'Faculty';

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  // Determine which roles this user can select when creating or editing:
  // - Admin: All roles (HOD, Faculty, Student, Admin, IQAC, Inspector)
  // - HOD: Faculty and Student only
  // - Faculty: Student only
  const selectableRoles = useMemo(() => {
    if (isCurrentAdmin) return ALL_ROLES;
    if (isCurrentHOD) return ['Faculty', 'Student'];
    if (isCurrentFaculty) return ['Student'];
    return [];
  }, [isCurrentAdmin, isCurrentHOD, isCurrentFaculty]);

  // Determine which departments this user can select:
  // - Admin: All university departments
  // - HOD: Only primary + additional departments assigned to this HOD
  // - Faculty: Locked to currentUser.department
  const availableDeptOptions = useMemo(() => {
    if (isCurrentAdmin) {
      return departments.map(d => d.name).filter(Boolean);
    }
    if (isCurrentHOD) {
      return hodAllowedDepts;
    }
    if (isCurrentFaculty) {
      return [currentUser?.department].filter(Boolean);
    }
    return [];
  }, [isCurrentAdmin, isCurrentHOD, isCurrentFaculty, departments, hodAllowedDepts, currentUser]);

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
              {isEdit ? 'Update account details and role profile.' : 'Create a new account with institutional credentials.'}
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
              {selectableRoles.length > 1 ? (
                <select
                  value={form.role}
                  onChange={e => {
                    const newRole = e.target.value;
                    f('role', newRole);
                    f('permissions', PERMISSIONS_MATRIX[newRole] || []);
                  }}
                  style={selectStyle}
                  required
                >
                  {selectableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>
                  ))}
                </select>
              ) : (
                <div style={{ ...inputStyle, background: '#f8fafc', color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  {ROLE_META[selectableRoles[0]]?.label || selectableRoles[0]}
                </div>
              )}
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
            <Field label="Designation" value={form.designation} onChange={v => f('designation', v)} placeholder={form.role === 'Student' ? 'e.g. B.Tech Scholar' : 'e.g. Assistant Professor'} />
            <Field label="Employee / Roll ID" value={form.employeeId} onChange={v => f('employeeId', v)} placeholder={form.role === 'Student' ? 'e.g. STU-2026-089' : 'e.g. FAC-CSE-0123'} />
          </div>

          {/* Primary Department */}
          {['Admin', 'IQAC', 'Inspector'].includes(form.role) ? (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534' }}>
              <strong>Institutional Governance / External Role:</strong> This account operates at the central university or external accreditation level and does not belong to any institute department.
            </div>
          ) : isCurrentFaculty ? (
            <div>
              <label style={labelStyle}>Assigned Department *</label>
              <div style={{ ...inputStyle, background: '#f8fafc', color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {currentUser?.department || 'Department Bound'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Locked to your assigned department ({currentUser?.department}).
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Primary Department *</label>
                {form.role === 'DeanHOD' && (
                  <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>Rule: Single HOD per department</span>
                )}
              </div>
              <select
                value={form.department}
                onChange={e => {
                  const newDept = e.target.value;
                  f('department', newDept);
                  if (form.additionalDepartments) {
                    const filtered = form.additionalDepartments.split(',').map(d => d.trim()).filter(d => d && d.toLowerCase() !== newDept.toLowerCase());
                    f('additionalDepartments', filtered.join(', '));
                  }
                }}
                style={selectStyle}
                required
              >
                <option value="">— Select Department —</option>
                {availableDeptOptions.map(d => {
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

          {/* Additional Departments Dropdown (Admin configuring HOD only) */}
          {isCurrentAdmin && form.role === 'DeanHOD' && (() => {
            const currentSelected = form.additionalDepartments
              ? form.additionalDepartments.split(',').map(d => d.trim()).filter(Boolean)
              : [];
            const availableDepts = availableDeptOptions.filter(d => 
              d.toLowerCase() !== (form.department || '').toLowerCase() && !currentSelected.some(s => s.toLowerCase() === d.toLowerCase())
            );

            return (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Additional Department Access (HOD Scope)</label>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{currentSelected.length} granted</span>
                </div>
                
                <select
                  value=""
                  onChange={e => {
                    const toAdd = e.target.value;
                    if (!toAdd) return;
                    const next = [...currentSelected, toAdd];
                    f('additionalDepartments', next.join(', '));
                  }}
                  style={selectStyle}
                >
                  <option value="">+ Select Additional Department from dropdown...</option>
                  {availableDepts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {currentSelected.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {currentSelected.map(dName => (
                      <span
                        key={dName}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: '1px solid #bae6fd'
                        }}
                      >
                        <span>{dName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = currentSelected.filter(x => x.toLowerCase() !== dName.toLowerCase());
                            f('additionalDepartments', next.join(', '));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0284c7',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: 14,
                            lineHeight: 1,
                            fontWeight: 700
                          }}
                          title="Remove clearance"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic', marginTop: 6 }}>
                    No additional departments selected. Choose departments from the dropdown above to grant multi-department verification access.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Password - Always defaults to Password@123 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                {isEdit ? 'Account Password' : 'Initial Password *'}
              </label>
              <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                Default: Password@123
              </span>
            </div>
            <input
              type="text"
              value={form.password !== undefined && form.password !== '' ? form.password : 'Password@123'}
              onChange={e => f('password', e.target.value)}
              placeholder="Password@123"
              required={!isEdit}
              style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}
              autoComplete="new-password"
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              System default initial password is pre-filled as <strong>Password@123</strong>.
            </div>
          </div>

          {/* Permissions Section (Interactive Checkbox List for ALL Portals & Every User) */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Permissions Granted to User ({(form.permissions || []).length} selected)
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => f('permissions', PERMISSIONS_MATRIX[form.role] || [])}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Reset Defaults
                </button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button
                  type="button"
                  onClick={() => {
                    const allRolePerms = PERMISSIONS_MATRIX[form.role] || [];
                    const isAll = (form.permissions || []).length === allRolePerms.length;
                    f('permissions', isAll ? [] : allRolePerms);
                  }}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {(form.permissions || []).length === (PERMISSIONS_MATRIX[form.role] || []).length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(PERMISSIONS_MATRIX[form.role] || []).map(pKey => {
                const checked = (form.permissions || []).includes(pKey);
                return (
                  <label
                    key={pKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      background: checked ? '#eff6ff' : '#ffffff',
                      border: `1px solid ${checked ? '#bfdbfe' : '#e2e8f0'}`,
                      color: checked ? '#1e40af' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        const cur = form.permissions || [];
                        const next = e.target.checked
                          ? [...cur, pKey]
                          : cur.filter(x => x !== pKey);
                        f('permissions', next);
                      }}
                      style={{ accentColor: '#2563eb', width: 15, height: 15, cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: checked ? 600 : 400, userSelect: 'none' }}>
                      {PERM_LABELS[pKey] || pKey}
                    </span>
                  </label>
                );
              })}
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

// ── PermissionsModal (Admin Only) ─────────────────────────────────────────────

function PermissionsModal({ user, departments, onSave, onClose }) {
  const meta = ROLE_META[user.role] || { color: '#475569', bg: '#f1f5f9', label: user.role };
  const rolePerms = PERMISSIONS_MATRIX[user.role] || [];
  const deptOptions = departments.map(d => d.name).filter(Boolean);

  const initialPerms = useMemo(() => {
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      return [...user.permissions];
    }
    if (user.customPermissions && user.customPermissions.trim()) {
      return user.customPermissions.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [...rolePerms];
  }, [user, rolePerms]);

  const [selectedPerms, setSelectedPerms] = useState(initialPerms);
  const [additionalDepts, setAdditionalDepts] = useState(user.additionalDepartments || '');
  const [saving, setSaving] = useState(false);

  const currentSelectedDepts = useMemo(() => {
    return additionalDepts
      ? additionalDepts.split(',').map(d => d.trim()).filter(Boolean)
      : [];
  }, [additionalDepts]);

  const availableDepts = useMemo(() => {
    return deptOptions.filter(d =>
      d.toLowerCase() !== (user.department || '').toLowerCase() &&
      !currentSelectedDepts.some(s => s.toLowerCase() === d.toLowerCase())
    );
  }, [deptOptions, user.department, currentSelectedDepts]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(user.id, {
      additionalDepartments: user.role === 'DeanHOD' ? additionalDepts.trim() : '',
      permissions: selectedPerms,
      customPermissions: selectedPerms.join(','),
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true"
      style={{ display: 'flex', zIndex: 99999 }}>
      <div className="modal-dialog" style={{ maxWidth: 580, width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Access & Permissions</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{user.name} — {meta.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>&times;</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', maxHeight: '70vh' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: meta.bg, borderRadius: 8, border: `1px solid ${meta.color}22` }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: meta.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
              {user.avatar || user.name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{user.designation} · {user.department || 'Institutional'}</div>
            </div>
          </div>

          {user.role === 'DeanHOD' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Additional Department Scope</label>
                <span style={{ fontSize: 11, color: '#64748b' }}>{currentSelectedDepts.length} granted</span>
              </div>
              <select
                value=""
                onChange={e => {
                  const toAdd = e.target.value;
                  if (!toAdd) return;
                  setAdditionalDepts([...currentSelectedDepts, toAdd].join(', '));
                }}
                style={selectStyle}
              >
                <option value="">+ Add Department Scope from dropdown...</option>
                {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {currentSelectedDepts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {currentSelectedDepts.map(dName => (
                    <span key={dName} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #bae6fd' }}>
                      <span>{dName}</span>
                      <button type="button" onClick={() => setAdditionalDepts(currentSelectedDepts.filter(x => x.toLowerCase() !== dName.toLowerCase()).join(', '))} style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: 0, fontSize: 14, fontWeight: 700 }}>&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                Operational Permissions Matrix ({selectedPerms.length} Active)
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setSelectedPerms([...rolePerms])} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Reset Role Defaults</button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button type="button" onClick={() => setSelectedPerms(selectedPerms.length === rolePerms.length ? [] : [...rolePerms])} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  {selectedPerms.length === rolePerms.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {rolePerms.map(pKey => {
                const checked = selectedPerms.includes(pKey);
                return (
                  <label key={pKey} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, fontSize: 12, background: checked ? '#eff6ff' : '#fff', border: `1px solid ${checked ? '#bfdbfe' : '#e2e8f0'}`, color: checked ? '#1e40af' : '#64748b', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checked} onChange={e => setSelectedPerms(e.target.checked ? [...selectedPerms, pKey] : selectedPerms.filter(x => x !== pKey))} style={{ accentColor: '#2563eb', width: 15, height: 15, cursor: 'pointer' }} />
                    <span style={{ fontWeight: checked ? 600 : 400 }}>{PERM_LABELS[pKey] || pKey}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ padding: '9px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ConfirmDeleteModal (Admin Only) ───────────────────────────────────────────

function ConfirmDeleteModal({ user, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true" style={{ display: 'flex', zIndex: 99999 }}>
      <div className="modal-dialog" style={{ maxWidth: 440, width: '100%', background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px' }}>⚠️</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Delete User Account</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
          Are you sure you want to permanently delete <strong>{user.name}</strong> ({user.email})? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Yes, Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Shared Field component ─────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', disabled = false }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ ...inputStyle, background: disabled ? '#f8fafc' : '#ffffff', color: disabled ? '#94a3b8' : '#0f172a' }}
      />
    </div>
  );
}

// ── Shared Styles ──────────────────────────────────────────────────────────────
const labelStyle  = { display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 };
const inputStyle  = { width: '100%', height: 36, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const selectStyle = { width: '100%', height: 36, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' };
