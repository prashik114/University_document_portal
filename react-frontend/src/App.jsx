import { useState, useMemo, useEffect } from 'react';
import { usePortalData } from './hooks/usePortalData';
import { useToast }      from './hooks/useToast';
import { ROLE_COLORS, ROLE_CLEARANCE, NAAC_CRITERIA } from './constants/users';
import LoginScreen         from './components/LoginScreen';
import Toast               from './components/Toast';
import UploadModal         from './components/UploadModal';
import DocumentDetailModal from './components/DocumentDetailModal';
import ReturnReasonModal   from './components/ReturnReasonModal';
import ResubmitModal       from './components/ResubmitModal';
import StatusBadge         from './components/StatusBadge';
import UserAccessControl   from './components/UserAccessControl';
import AccountSettings     from './components/AccountSettings';
import './styles.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

function exportCSV(records, filename = 'Records_Export.csv') {
  if (!records?.length) return;
  const headers = ['ID','Title','Category','SubCategory','NAAC Criterion','Owner','Department','Status','Stage','File'];
  const rows = records.map(d => [
    `"${d.id||''}"`,
    `"${(d.title||'').replace(/"/g,'""')}"`,
    `"${d.category||''}"`,
    `"${d.subCategory||''}"`,
    `"${d.naacCriterion||''}"`,
    `"${d.ownerName||''}"`,
    `"${d.department||''}"`,
    `"${d.status||''}"`,
    `"${d.currentStage||''}"`,
    `"${d.evidenceFile||''}"`,
  ]);
  const csv  = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = Object.assign(document.createElement('a'), { href: encodeURI(csv), download: filename });
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth: Always require sign-in on fresh portal start ───────────────────
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('portal_user_profile')
        || localStorage.getItem('portal_user_profile')
        || sessionStorage.getItem('portal_current_user')
        || localStorage.getItem('portal_current_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('portal_auth_user') === 'true' ||
           localStorage.getItem('portal_auth_user') === 'true';
  });

  // ── Remote data ───────────────────────────────────────────────────────────
  const {
    documents, auditLogs, recentActivities, kpis,
    users, departments,
    loading, backendOnline,
    submitDocument, resubmitDocument, approveDocument, returnDocument, lockDocument,
    batchForward, batchLock,
    provisionUser, updateUser, updateUserStatus, updateUserPermissions, deleteUser,
  } = usePortalData();

  // ── UI state ──────────────────────────────────────────────────────────────
  const { toast, showToast }   = useToast();
  const [activeTab,            setActiveTab]          = useState('dashboard');
  const [selectedCategory,     setSelectedCategory]   = useState('ALL');
  const [selectedStatus,       setSelectedStatus]     = useState('ALL');
  const [myDocsSubTab,         setMyDocsSubTab]       = useState('ALL');
  const [searchQuery,          setSearchQuery]        = useState('');
  const [mobileSidebarOpen,    setMobileSidebarOpen]  = useState(false);
  const [notifMenuOpen,        setNotifMenuOpen]      = useState(false);
  const [userMenuOpen,         setUserMenuOpen]       = useState(false);
  const [hasUnreadNotifs,      setHasUnreadNotifs]    = useState(true);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showUploadModal,      setShowUploadModal]    = useState(false);
  const [detailDoc,            setDetailDoc]          = useState(null);
  const [returnDoc,            setReturnDoc]          = useState(null);
  const [resubmitDoc,          setResubmitDoc]        = useState(null);

  // ── Document ownership check (survives user rename & employee ID updates) ──
  const isDocOwnedByUser = (doc, user) => {
    if (!doc || !user) return false;
    const matchId = Boolean(user.id && doc.ownerId && doc.ownerId.toLowerCase() === user.id.toLowerCase());
    const matchEmp = Boolean(user.employeeId && doc.ownerId && doc.ownerId.toLowerCase() === user.employeeId.toLowerCase());
    const matchName = Boolean(user.name && doc.ownerName && doc.ownerName.trim().toLowerCase() === user.name.trim().toLowerCase());
    const matchFaculty = Boolean(user.name && doc.recordedByFaculty && doc.recordedByFaculty.trim().toLowerCase() === user.name.trim().toLowerCase());
    return matchId || matchEmp || matchName || matchFaculty;
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const roleColor    = ROLE_COLORS[currentUser?.role]    || '#2563eb';
  const clearanceDesc= ROLE_CLEARANCE[currentUser?.role] || 'Institutional Verified Access';

  const filteredDocs = useMemo(() => {
    if (!isAuthenticated || !currentUser) return [];
    return documents.filter(doc => {
      if (currentUser.role === 'Student') {
        if (!isDocOwnedByUser(doc, currentUser)) return false;
      }
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
      if (selectedStatus   !== 'ALL' && doc.status   !== selectedStatus)   return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          doc.title?.toLowerCase().includes(q) ||
          doc.ownerName?.toLowerCase().includes(q) ||
          doc.department?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, currentUser, isAuthenticated, selectedCategory, selectedStatus, searchQuery]);

  // Personal submissions for the "My Documents" / "My Certificates" view
  const mySubmissions = useMemo(() => {
    if (!isAuthenticated || !currentUser) return [];
    return documents.filter(doc => {
      if (!isDocOwnedByUser(doc, currentUser)) return false;
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
      if (myDocsSubTab !== 'ALL' && doc.status !== myDocsSubTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          doc.title?.toLowerCase().includes(q) ||
          doc.department?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, currentUser, isAuthenticated, myDocsSubTab, selectedCategory, searchQuery]);

  const dashboardKpis = useMemo(() => ({
    total:             filteredDocs.length,
    underVerification: filteredDocs.filter(d => d.status === 'Under Verification').length,
    returned:          filteredDocs.filter(d => d.status === 'Returned').length,
    approved:          filteredDocs.filter(d => d.status === 'Approved').length,
  }), [filteredDocs]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    sessionStorage.setItem('portal_auth_user', 'true');
    sessionStorage.setItem('portal_user_profile', JSON.stringify(user));
    sessionStorage.setItem('portal_current_user', JSON.stringify(user));
    localStorage.setItem('portal_auth_user', 'true');
    localStorage.setItem('portal_user_profile', JSON.stringify(user));
    localStorage.setItem('portal_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserMenuOpen(false);
    sessionStorage.removeItem('portal_auth_user');
    sessionStorage.removeItem('portal_user_profile');
    sessionStorage.removeItem('portal_current_user');
    localStorage.removeItem('portal_auth_user');
    localStorage.removeItem('portal_user_profile');
    localStorage.removeItem('portal_current_user');
    showToast('Logged out successfully.', 'info');
  };

  useEffect(() => {
    if (currentUser && isAuthenticated) {
      const serialized = JSON.stringify(currentUser);
      sessionStorage.setItem('portal_auth_user', 'true');
      sessionStorage.setItem('portal_user_profile', serialized);
      sessionStorage.setItem('portal_current_user', serialized);
      localStorage.setItem('portal_auth_user', 'true');
      localStorage.setItem('portal_user_profile', serialized);
      localStorage.setItem('portal_current_user', serialized);
    }
  }, [currentUser, isAuthenticated]);

  // ── Document action handlers ───────────────────────────────────────────────
  const handleSubmitDocument = async (docPayload, isDraft) => {
    try {
      const saved = await submitDocument(docPayload, currentUser.name, currentUser.role);
      showToast(
        isDraft
          ? `Draft "${saved.title}" saved.`
          : `"${saved.title}" submitted for verification.`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Submission failed.', 'error');
      throw err;
    }
  };

  const handleApprove = async (doc) => {
    try {
      await approveDocument(doc.id, currentUser.name, currentUser.role);
      setDetailDoc(null);
      const isDean = currentUser.role === 'DeanHOD';
      showToast(
        isDean
          ? `"${doc.title}" forwarded to IQAC.`
          : `"${doc.title}" approved and locked in SSR.`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Approval failed.', 'error');
    }
  };

  const handleReturn = async (doc) => {
    setDetailDoc(null);
    setReturnDoc(doc);
  };

  const handleOpenResubmit = (doc) => {
    setDetailDoc(null);
    setResubmitDoc(doc);
  };

  const handleConfirmResubmit = async (docId, updates) => {
    try {
      await resubmitDocument(docId, currentUser.name, currentUser.role, updates);
      showToast('Document re-submitted. Verification process restarted from Stage 1.', 'success');
      setResubmitDoc(null);
    } catch (err) {
      showToast(err.message || 'Re-submission failed.', 'error');
    }
  };

  const handleReturnConfirm = async (reason) => {
    if (!returnDoc) return;
    try {
      await returnDocument(returnDoc.id, currentUser.name, currentUser.role, reason);
      setReturnDoc(null);
      showToast(`"${returnDoc.title}" returned for correction.`, 'warning');
    } catch (err) {
      showToast(err.message || 'Return action failed.', 'error');
    }
  };

  const handleBatchApprove = async () => {
    const isStudentDoc = (d) => d.category === 'Student' || (d.category && d.category.toLowerCase().includes('student')) || d.ownerType === 'Student' || d.ownerType === 'student';
    const studentQueue = documents.filter(d => d.status === 'Under Verification' && isStudentDoc(d) && (!currentUser.department || !d.department || d.department.toLowerCase() === currentUser.department.toLowerCase()));
    const deanQueue = documents.filter(d => d.status === 'Under Verification' && d.currentStage === 'Dean/HOD').length;
    const iqacQueue = documents.filter(d => d.status === 'Under Verification' && d.currentStage === 'IQAC').length;

    if (currentUser.role === 'Faculty') {
      if (studentQueue.length === 0) { showToast('No pending student records to verify.', 'info'); return; }
      try {
        let count = 0;
        for (const doc of studentQueue) {
          await api.verifyDocument(doc.id, currentUser.name, currentUser.role, 'Faculty verified & endorsed');
          count++;
        }
        await refresh();
        showToast(`Batch complete: ${count} student records verified and forwarded to HOD.`, 'success');
      } catch (err) { showToast(err.message || 'Batch verification failed.', 'error'); }
    } else if (currentUser.role === 'DeanHOD') {
      if (deanQueue === 0) { showToast('No records pending in Dean/HOD queue.', 'info'); return; }
      try {
        await batchForward(currentUser.name, currentUser.role);
        showToast(`${deanQueue} records endorsed & forwarded to IQAC.`, 'success');
      } catch (err) { showToast(err.message || 'Batch forward failed.', 'error'); }
    } else if (currentUser.role === 'IQAC') {
      if (iqacQueue === 0) { showToast('No records pending in IQAC queue.', 'info'); return; }
      try {
        await batchLock(currentUser.name, currentUser.role);
        showToast(`${iqacQueue} records approved & locked into SSR Evidence Ledger.`, 'success');
      } catch (err) { showToast(err.message || 'Batch lock failed.', 'error'); }
    } else {
      // Admin — act based on which queue has records
      const pending = deanQueue + iqacQueue;
      if (pending === 0) { showToast('No pending records in verification queue.', 'info'); return; }
      try {
        if (deanQueue > 0) await batchForward(currentUser.name, currentUser.role);
        if (iqacQueue > 0) await batchLock(currentUser.name, currentUser.role);
        showToast(`Batch complete: ${deanQueue} forwarded to IQAC, ${iqacQueue} locked into SSR.`, 'success');
      } catch (err) { showToast(err.message || 'Batch action failed.', 'error'); }
    }
  };

  // ── Render guard ──────────────────────────────────────────────────────────
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <Toast toast={toast} />
        <LoginScreen onLoginSuccess={handleLoginSuccess} showToast={showToast} />
      </>
    );
  }

  // ── Main app layout ───────────────────────────────────────────────────────
  const nav = [
    { id: 'dashboard',      label: currentUser.role === 'Student' ? 'Student Portal' : currentUser.role === 'Inspector' ? 'Inspection Dashboard' : 'Dashboard', roles: null },
    { id: 'documents',      label: currentUser.role === 'Student' ? 'My Certificates' : 'My Documents', roles: ['Faculty','Student','DeanHOD'] },
    { id: 'queue',          label: currentUser.role === 'Faculty' ? 'Student Verification Desk' : 'Verification Queue', roles: ['Faculty','DeanHOD','IQAC','Admin'] },
    { id: 'repository',     label: 'Document Repository', roles: ['Faculty','DeanHOD','IQAC','Inspector','Admin'] },
    { id: 'reports',        label: 'Reports', roles: ['DeanHOD','IQAC','Inspector','Admin'] },
    { id: 'audit',          label: 'Audit Trail', roles: ['IQAC','Inspector','Admin'] },
    { id: 'access-control', label: currentUser.role === 'Faculty' ? 'Student Directory' : currentUser.role === 'DeanHOD' ? 'Department Users' : 'User Access Control', roles: ['Admin', 'DeanHOD', 'Faculty'] },
  ];

  return (
    <div>
      <Toast toast={toast} />

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          currentUser={currentUser}
          onSubmit={handleSubmitDocument}
          onClose={() => setShowUploadModal(false)}
          showToast={showToast}
        />
      )}
      {detailDoc && (
        <DocumentDetailModal
          doc={detailDoc}
          currentUser={currentUser}
          onApprove={handleApprove}
          onReturn={handleReturn}
          onResubmit={(doc) => handleOpenResubmit(doc)}
          onClose={() => setDetailDoc(null)}
        />
      )}
      {returnDoc && (
        <ReturnReasonModal
          docTitle={returnDoc.title}
          onConfirm={handleReturnConfirm}
          onCancel={() => setReturnDoc(null)}
        />
      )}
      {resubmitDoc && (
        <ResubmitModal
          doc={resubmitDoc}
          currentUser={currentUser}
          onConfirm={handleConfirmResubmit}
          onClose={() => setResubmitDoc(null)}
          showToast={showToast}
        />
      )}

      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="app-layout">
        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
          <div>
            <div className="sidebar-brand" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="brand-logo-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z"/>
                  </svg>
                </div>
                <div className="brand-title"><div>University</div><span>Repository</span></div>
              </div>
              <button className="sidebar-close-btn" onClick={() => setMobileSidebarOpen(false)} aria-label="Close sidebar"
                style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:6 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <nav className="sidebar-nav" aria-label="Main navigation">
              {nav
                .filter(item => item.roles === null || item.roles.includes(currentUser.role))
                .map(item => (
                  <button
                    key={item.id}
                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false); }}
                    style={{ background:'none', border:'none', width:'100%', textAlign:'left', cursor:'pointer' }}
                  >
                    <span>{item.label}</span>
                    {item.id === 'queue' && (
                      <span className="nav-badge danger">
                        {documents.filter(d => d.status === 'Under Verification').length}
                      </span>
                    )}
                  </button>
                ))}

              {['Faculty','Student','DeanHOD','Admin'].includes(currentUser.role) && (
                <button
                  className="nav-item"
                  onClick={() => { setShowUploadModal(true); setMobileSidebarOpen(false); }}
                  style={{ background:'none', border:'none', width:'100%', textAlign:'left', cursor:'pointer' }}
                >
                  <span>{currentUser.role === 'Student' ? 'Submit Achievement' : 'Upload Document'}</span>
                </button>
              )}
            </nav>
          </div>

          <div className="sidebar-footer">
            <button
              className={`sidebar-footer-link ${activeTab === 'account-settings' ? 'active' : ''}`}
              onClick={() => { setActiveTab('account-settings'); setMobileSidebarOpen(false); }}
              style={{ marginBottom: 4 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Account Settings</span>
            </button>
            <button className="logout-link" onClick={handleLogout} style={{ background:'none', border:'none', cursor:'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN WRAPPER ─────────────────────────────────────────────────── */}
        <div className="main-wrapper">
          {/* Header */}
          <header className="top-navbar">
            <div className="top-navbar-left">
              <button className="mobile-nav-toggle" onClick={() => setMobileSidebarOpen(true)} aria-label="Open menu"
                style={{ background:'none', border:'none', cursor:'pointer', padding:8, borderRadius:6 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <div className="search-box-container">
                <svg className="search-icon-nav" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="search"
                  className="global-search-input"
                  placeholder="Search documents, criteria…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search documents"
                />
              </div>
            </div>

            <div className="navbar-actions nav-actions-group" style={{ position:'relative' }}>
              {/* Notifications */}
              <button className="notification-btn" aria-label="Notifications"
                onClick={() => { setNotifMenuOpen(p => !p); setUserMenuOpen(false); }}
                style={{ position:'relative' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {hasUnreadNotifs && <span className="notification-dot" aria-hidden="true" />}
              </button>

              {notifMenuOpen && (
                <div className="context-menu-popup active" style={{ display:'block', right:100, top:50, width:300, zIndex:9999 }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:700, fontSize:13 }}>System Notifications</span>
                    <button onClick={() => { setHasUnreadNotifs(false); setNotifMenuOpen(false); showToast('All notifications marked as read.','success'); }}
                      style={{ background:'none', border:'none', color:'#2563eb', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                      Mark all as read
                    </button>
                  </div>
                  <div style={{ padding:'12px 16px', fontSize:12 }}>
                    <div style={{ fontWeight:600, color:'#1e293b' }}>NAAC Cycle 2026-27 Active</div>
                    <div style={{ color:'#64748b', fontSize:11, marginTop:2 }}>SSR evidence collection window is open.</div>
                  </div>
                  {!backendOnline && (
                    <div style={{ padding:'10px 16px', fontSize:12, background:'#fef3c7', color:'#92400e' }}>
                      Backend offline — changes will not persist.
                    </div>
                  )}
                </div>
              )}

              {/* User menu */}
              <div className="user-profile-badge"
                onClick={() => { setUserMenuOpen(p => !p); setNotifMenuOpen(false); }}
                style={{ cursor:'pointer' }}
                role="button"
                aria-expanded={userMenuOpen}
                aria-label="User menu"
              >
                <div className="user-avatar-circle" style={{ background:roleColor, color:'#fff' }}>
                  {currentUser.avatar || currentUser.name.charAt(0)}
                </div>
                <span className="user-role-label">{currentUser.name}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {userMenuOpen && (
                <div className="context-menu-popup active" style={{ display:'block', right:0, top:50, width:300, zIndex:9999 }}>
                  <div style={{ padding:16, borderBottom:'1px solid #e2e8f0', background:'#f8fafc' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:10, background:roleColor, color:'#fff', fontWeight:700, fontSize:17, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {currentUser.avatar || currentUser.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>{currentUser.name}</div>
                        <div style={{ fontSize:11.5, color:'#64748b', marginTop:1 }}>{currentUser.designation}</div>
                        <div style={{ display:'flex', gap:6, marginTop:3 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:roleColor, border:'1px solid #e2e8f0', padding:'1px 7px', borderRadius:9999 }}>
                            {currentUser.role.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:'12px 16px', fontSize:12, color:'#334155', lineHeight:1.6 }}>
                    <strong>Department:</strong> {currentUser.department}<br />
                    <strong>Email:</strong> <span style={{ color:'#2563eb' }}>{currentUser.email}</span><br />
                    <strong>Clearance:</strong> {clearanceDesc}
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0' }}>
                    <button
                      onClick={() => {
                        setActiveTab('account-settings');
                        setUserMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontWeight: 600,
                        fontSize: 12.5,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>⚙️</span>
                      <span>Account Settings</span>
                    </button>
                  </div>
                  <div style={{ padding:'8px 16px', background:'#f8fafc', display:'flex', justifyContent:'flex-end' }}>
                    <button onClick={handleLogout}
                      style={{ background:'none', border:'none', color:'#dc2626', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
          <main className="main-content" id="main-content">

            {/* ═══ DASHBOARD ═══════════════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
              <div>
                <div className="dashboard-header">
                  <div>
                    <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:0 }}>
                      {currentUser.role === 'Student'   ? `Student Portal — ${currentUser.name}` :
                       currentUser.role === 'Inspector' ? `NAAC Peer Review — ${currentUser.name}` :
                       `Welcome, ${currentUser.name}`}
                    </h1>
                    <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>
                      {currentUser.designation} &bull; {currentUser.department} &bull; Academic Year 2026-2027
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    {currentUser.role !== 'Inspector' && (
                      <button className="btn-secondary"
                        onClick={() => exportCSV(documents, 'Master_Export.csv')}
                        style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #cbd5e1', background:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}>
                        Export CSV
                      </button>
                    )}
                    {currentUser.role !== 'Inspector' && (
                      <button className="primary-btn" onClick={() => setShowUploadModal(true)}>
                        <span>{currentUser.role === 'Student' ? '+ Submit Certificate' : '+ Upload Document'}</span>
                      </button>
                    )}
                    {currentUser.role === 'Inspector' && (
                      <button className="primary-btn"
                        onClick={() => exportCSV(documents.filter(d => d.status === 'Approved'), 'NAAC_Dossier.csv')}>
                        <span>Download NAAC Dossier (.CSV)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* KPI cards */}
                <div className="kpi-cards-grid">
                  <div className="kpi-card kpi-card-blue">
                    <div className="kpi-value">{dashboardKpis.total}</div>
                    <div className="kpi-label">Total Records</div>
                  </div>
                  <div className="kpi-card kpi-card-amber">
                    <div className="kpi-value">{dashboardKpis.underVerification}</div>
                    <div className="kpi-label">Under Verification</div>
                  </div>
                  <div className="kpi-card kpi-card-red">
                    <div className="kpi-value">{dashboardKpis.returned}</div>
                    <div className="kpi-label">Returned for Correction</div>
                  </div>
                  <div className="kpi-card kpi-card-green">
                    <div className="kpi-value">{dashboardKpis.approved}</div>
                    <div className="kpi-label">Approved &amp; Locked</div>
                  </div>
                </div>

                {/* Records table */}
                <div className="table-card" style={{ marginTop:24 }}>
                  <div className="table-card-header">
                    <div className="table-card-title">
                      {currentUser.role === 'Student'   ? 'My Submitted Achievements' :
                       currentUser.role === 'Inspector' ? 'NAAC Accreditation Evidence Dossier' :
                       'Accreditation Records'}
                    </div>
                    <div className="table-filters-group">
                      <select className="select-filter" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option value="ALL">All Categories</option>
                        {['Academic','Research','Co-curricular','NAAC','Student'].map(c =>
                          <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="select-filter" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                        <option value="ALL">All Statuses</option>
                        {['Under Verification','Returned','Approved','Draft'].map(s =>
                          <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <DocumentTable docs={filteredDocs} onView={setDetailDoc} onResubmit={handleOpenResubmit} currentUser={currentUser} loading={loading} />
                </div>
              </div>
            )}

            {/* ═══ MY DOCUMENTS ════════════════════════════════════════════════ */}
            {activeTab === 'documents' && (
              <div>
                <div className="dashboard-header">
                  <div>
                    <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:0 }}>
                      {currentUser.role === 'Student' ? 'My Certificates & Achievements' : 'My Document Repository'}
                    </h1>
                    <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>
                      Track personal submissions, drafts, returned corrections, and approved records
                    </p>
                  </div>
                  <button className="primary-btn" onClick={() => setShowUploadModal(true)}>
                    <span>{currentUser.role === 'Student' ? '+ Submit Certificate' : '+ Create New Record'}</span>
                  </button>
                </div>

                <div className="table-card" style={{ marginTop:20 }}>
                  <div className="table-card-header">
                    <div style={{ display:'flex', gap:6 }}>
                      {['ALL','Under Verification','Returned','Approved'].map(tab => (
                        <button key={tab} onClick={() => setMyDocsSubTab(tab)}
                          style={{ padding:'6px 12px', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight: myDocsSubTab===tab?700:500,
                            border: myDocsSubTab===tab?'1px solid #2563eb':'1px solid #e2e8f0',
                            background: myDocsSubTab===tab?'#eff6ff':'#fff',
                            color: myDocsSubTab===tab?'#1d4ed8':'#64748b' }}>
                          {tab === 'ALL' ? 'All Records' : tab}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => exportCSV(mySubmissions,'My_Submissions.csv')}
                      style={{ padding:'6px 12px', borderRadius:6, border:'1px solid #cbd5e1', background:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      Export CSV
                    </button>
                  </div>
                  <DocumentTable
                    docs={mySubmissions}
                    onView={setDetailDoc}
                    onResubmit={handleOpenResubmit}
                    currentUser={currentUser}
                    loading={loading}
                  />
                </div>
              </div>
            )}

            {/* ═══ VERIFICATION QUEUE ══════════════════════════════════════════ */}
            {activeTab === 'queue' && (
              <div>
                <div className="dashboard-header">
                  <div>
                    <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:0 }}>
                      {currentUser.role === 'Faculty' ? 'Stage 1 — Faculty Verification Desk (Student Records)' :
                       currentUser.role === 'DeanHOD' ? 'Stage 2 — Department Verification Desk' :
                       currentUser.role === 'IQAC'    ? 'Stage 3 — Central Quality Certification' :
                       'Verification Queue'}
                    </h1>
                    <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>
                      {currentUser.role === 'Faculty'
                        ? `Verify student achievement certificates and documents submitted within ${currentUser.department || 'your department'}.`
                        : currentUser.role === 'DeanHOD'
                        ? 'Verify & endorse both Faculty and Student evidence across your assigned departments, or return for clarification.'
                        : currentUser.role === 'IQAC'
                        ? 'Approve & apply cryptographic hash to SSR Evidence Ledger, or return non-compliant records to Department.'
                        : 'Review submitted evidence across all workflow stages.'}
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button className="btn-secondary"
                      onClick={() => exportCSV(documents.filter(d => d.status==='Under Verification'),'Queue_Export.csv')}
                      style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #cbd5e1', background:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}>
                      Export Queue CSV
                    </button>
                    <button className="primary-btn" onClick={handleBatchApprove}>
                      <span>
                        {currentUser.role === 'Faculty' ? 'Batch Verify Student Documents' :
                         currentUser.role === 'DeanHOD' ? 'Batch Endorse & Forward to IQAC' :
                         currentUser.role === 'IQAC'    ? 'Batch Approve & Lock SSR' :
                         'Batch Process Queue'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Stage pipeline indicators */}
                <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
                  {[
                    { label:'Faculty Review (Students)', color:'#0891b2', bg:'#ecfeff', count: documents.filter(d=>d.status==='Under Verification'&&d.currentStage==='Faculty').length },
                    { label:'Dean/HOD Review',     color:'#2563eb', bg:'#eff6ff', count: documents.filter(d=>d.status==='Under Verification'&&d.currentStage==='Dean/HOD').length },
                    { label:'IQAC Quality Audit',  color:'#7c3aed', bg:'#f5f3ff', count: documents.filter(d=>d.status==='Under Verification'&&d.currentStage==='IQAC').length },
                    { label:'Returned',            color:'#dc2626', bg:'#fef2f2', count: documents.filter(d=>d.status==='Returned').length },
                    { label:'SSR Locked',          color:'#16a34a', bg:'#f0fdf4', count: documents.filter(d=>d.status==='Approved').length },
                  ].map(pill => (
                    <div key={pill.label} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:9999, background:pill.bg, border:`1px solid ${pill.color}33`, fontSize:12, fontWeight:600, color:pill.color }}>
                      <span style={{ fontSize:15, fontWeight:800 }}>{pill.count}</span>
                      {pill.label}
                    </div>
                  ))}
                </div>

                <div className="table-card">
                  <div className="table-responsive">
                    <table className="data-table" style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', textAlign:'left', fontSize:12, color:'#64748b' }}>
                          <th style={{ padding:'12px 16px' }}>#</th>
                          <th style={{ padding:'12px 16px' }}>Record Title</th>
                          <th style={{ padding:'12px 16px' }}>Submitter</th>
                          <th style={{ padding:'12px 16px' }}>Department</th>
                          <th style={{ padding:'12px 16px' }}>NAAC Criterion</th>
                          <th style={{ padding:'12px 16px' }}>Current Stage</th>
                          <th style={{ padding:'12px 16px', textAlign:'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const isStudentDoc = (d) => d.category === 'Student' || (d.category && d.category.toLowerCase().includes('student')) || d.ownerType === 'Student' || d.ownerType === 'student';
                          const queueDocs = documents.filter(d => {
                            if (d.status !== 'Under Verification') return false;
                            if (currentUser.role === 'Faculty') {
                              if (!isStudentDoc(d)) return false;
                              if (currentUser.department && d.department && currentUser.department.toLowerCase() !== d.department.toLowerCase()) return false;
                              return d.currentStage === 'Faculty';
                            }
                            if (currentUser.role === 'DeanHOD') {
                              const allowed = [currentUser.department, ...(currentUser.allowedDepartments || []), ...(currentUser.additionalDepartments ? currentUser.additionalDepartments.split(',').map(s=>s.trim()) : [])].filter(Boolean).map(s=>s.toLowerCase());
                              if (allowed.length > 0 && d.department && !allowed.includes(d.department.toLowerCase())) return false;
                              return d.currentStage === 'Dean/HOD';
                            }
                            if (currentUser.role === 'IQAC') return d.currentStage === 'IQAC';
                            return true;
                          });
                          if (queueDocs.length === 0) return (
                            <tr key="empty">
                              <td colSpan="7" style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>
                                <div style={{ fontSize:14, fontWeight:600, color:'#334155' }}>Queue is clear</div>
                                <div style={{ fontSize:12, marginTop:4 }}>No records pending at this stage.</div>
                              </td>
                            </tr>
                          );
                          return queueDocs.map((doc, i) => {
                            const isDocStudent = isStudentDoc(doc);
                            const isFac = currentUser.role === 'Faculty';
                            const isDean = doc.currentStage === 'Dean/HOD';
                            const isFacStage = doc.currentStage === 'Faculty';
                            return (
                              <tr key={doc.id} style={{ borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                                <td style={{ padding:'12px 16px', color:'#64748b' }}>{i+1}</td>
                                <td style={{ padding:'12px 16px', fontWeight:600, color:'#0f172a' }}>{doc.title}</td>
                                <td style={{ padding:'12px 16px', color:'#475569' }}>
                                  {doc.ownerName}
                                  {isDocStudent && <span style={{ marginLeft:6, fontSize:10, padding:'2px 6px', borderRadius:4, background:'#ecfeff', color:'#0891b2', fontWeight:700 }}>Student</span>}
                                </td>
                                <td style={{ padding:'12px 16px', color:'#64748b', fontSize:12 }}>{doc.department}</td>
                                <td style={{ padding:'12px 16px', color:'#475569', fontSize:12 }}>{doc.naacCriterion}</td>
                                <td style={{ padding:'12px 16px' }}>
                                  <span style={{
                                    padding:'3px 10px', borderRadius:9999, fontSize:11, fontWeight:700,
                                    background: isFacStage ? '#ecfeff' : isDean ? '#eff6ff' : '#f5f3ff',
                                    color: isFacStage ? '#0891b2' : isDean ? '#2563eb' : '#7c3aed'
                                  }}>
                                    {isFacStage ? '▶ Faculty Review (Student Doc)' : isDean ? (isDocStudent ? '▶ HOD Review (Student Doc)' : '▶ Dean/HOD Review') : '▶ IQAC Quality Audit'}
                                  </span>
                                </td>
                                <td style={{ padding:'12px 16px', textAlign:'right' }}>
                                  <div style={{ display:'inline-flex', gap:6 }}>
                                    <button onClick={() => handleApprove(doc)}
                                      style={{ padding:'5px 10px', borderRadius:6, border:'none', background:'#16a34a', color:'#fff', fontSize:11.5, fontWeight:700, cursor:'pointer' }}>
                                      {isFac ? 'Verify Student Doc' : currentUser.role === 'DeanHOD' ? (isDocStudent ? 'Confirm & Forward to IQAC' : 'Endorse & Forward') : 'Approve & Lock SSR'}
                                    </button>
                                    <button onClick={() => handleReturn(doc)}
                                      style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #ef4444', background:'#fee2e2', color:'#dc2626', fontSize:11.5, fontWeight:700, cursor:'pointer' }}>
                                      {isFac ? 'Return to Student' : currentUser.role === 'DeanHOD' ? 'Return for Clarification' : 'Return to Department'}
                                    </button>
                                    <button onClick={() => setDetailDoc(doc)}
                                      style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #cbd5e1', background:'#fff', color:'#475569', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                                      Details
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {/* ═══ DOCUMENT REPOSITORY ═════════════════════════════════════════ */}
            {activeTab === 'repository' && (
              <div>
                <div className="dashboard-header">
                  <div>
                    <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:0 }}>Accreditation Evidence Repository</h1>
                    <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>
                      Verified SSR evidence records locked for peer-review
                    </p>
                  </div>
                  <button className="primary-btn"
                    onClick={() => exportCSV(documents.filter(d => d.status==='Approved'),'NAAC_Register.csv')}>
                    <span>Export Register (.CSV)</span>
                  </button>
                </div>

                <div className="table-card" style={{ marginTop:20 }}>
                  <div className="table-responsive">
                    <table className="data-table" style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', textAlign:'left', fontSize:12, color:'#64748b' }}>
                          <th style={{ padding:'12px 16px' }}>Record ID</th>
                          <th style={{ padding:'12px 16px' }}>Document Title</th>
                          <th style={{ padding:'12px 16px' }}>Criterion</th>
                          <th style={{ padding:'12px 16px' }}>Department</th>
                          <th style={{ padding:'12px 16px' }}>Owner</th>
                          <th style={{ padding:'12px 16px' }}>Lock Status</th>
                          <th style={{ padding:'12px 16px', textAlign:'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.filter(d => d.status === 'Approved').map((doc, i) => (
                          <tr key={doc.id||i} style={{ borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                            <td style={{ padding:'12px 16px', fontWeight:700, color:'#0f172a' }}>{doc.id}</td>
                            <td style={{ padding:'12px 16px', fontWeight:600, color:'#0f172a' }}>{doc.title}</td>
                            <td style={{ padding:'12px 16px', color:'#475569', fontSize:12 }}>{doc.naacCriterion}</td>
                            <td style={{ padding:'12px 16px', color:'#64748b' }}>{doc.department}</td>
                            <td style={{ padding:'12px 16px', color:'#475569' }}>{doc.ownerName}</td>
                            <td style={{ padding:'12px 16px' }}>
                              <span style={{ padding:'3px 8px', borderRadius:9999, fontSize:11, fontWeight:700, background:'#dcfce7', color:'#15803d' }}>
                                SSR Locked
                              </span>
                            </td>
                            <td style={{ padding:'12px 16px', textAlign:'right' }}>
                              <button onClick={() => setDetailDoc(doc)}
                                style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #cbd5e1', background:'#fff', color:'#2563eb', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                                Inspect Evidence
                              </button>
                            </td>
                          </tr>
                        ))}
                        {documents.filter(d => d.status === 'Approved').length === 0 && (
                          <tr><td colSpan="7" style={{ textAlign:'center', padding:40, color:'#64748b' }}>
                            No locked records yet.
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ REPORTS ═════════════════════════════════════════════════════ */}
            {activeTab === 'reports' && (
              <div>
                <div className="dashboard-header">
                  <div>
                    <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:0 }}>Reports &amp; Analytics</h1>
                    <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>
                      Criteria progress matrices, annual capacity development registers, and SSR summaries
                    </p>
                  </div>
                  <button className="primary-btn" onClick={() => exportCSV(documents,'NAAC_Full_SSR_Data.csv')}>
                    <span>Download Full NAAC Data (.CSV)</span>
                  </button>
                </div>

                {/* Live KPI cards derived from actual documents */}
                <div className="kpi-cards-grid" style={{ marginTop:20 }}>
                  <div className="kpi-card kpi-card-blue">
                    <div className="kpi-value">{documents.length}</div>
                    <div className="kpi-label">Total Evidence Records</div>
                  </div>
                  <div className="kpi-card kpi-card-green">
                    <div className="kpi-value">{documents.filter(d => d.status === 'Approved').length}</div>
                    <div className="kpi-label">Approved &amp; SSR-Locked</div>
                  </div>
                  <div className="kpi-card kpi-card-amber">
                    <div className="kpi-value">{documents.filter(d => d.status === 'Under Verification').length}</div>
                    <div className="kpi-label">Pending Verification</div>
                  </div>
                  <div className="kpi-card kpi-card-blue">
                    <div className="kpi-value">{NAAC_CRITERIA.length}</div>
                    <div className="kpi-label">NAAC Criteria Tracked</div>
                  </div>
                </div>

                <div className="table-card" style={{ marginTop:24 }}>
                  <div className="table-card-header">
                    <div className="table-card-title">Criteria Breakdown — Evidence Register</div>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table" style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', textAlign:'left', fontSize:12, color:'#64748b' }}>
                          <th style={{ padding:'12px 16px' }}>Criterion</th>
                          <th style={{ padding:'12px 16px' }}>Evidence Focus</th>
                          <th style={{ padding:'12px 16px' }}>Total Records</th>
                          <th style={{ padding:'12px 16px' }}>Approved &amp; Locked</th>
                          <th style={{ padding:'12px 16px' }}>Target Metrics</th>
                        </tr>
                      </thead>
                      <tbody>
                        {NAAC_CRITERIA.map(cm => {
                          // Compute counts from real documents matching this criterion name
                          const criterionDocs = documents.filter(d =>
                            d.naacCriterion && d.naacCriterion.toLowerCase().includes(
                              cm.name.split(':')[0].toLowerCase()
                            )
                          );
                          const total    = criterionDocs.length;
                          const approved = criterionDocs.filter(d => d.status === 'Approved').length;
                          return (
                            <tr key={cm.code} style={{ borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                              <td style={{ padding:'12px 16px', fontWeight:700, color:'#0f172a' }}>{cm.name}</td>
                              <td style={{ padding:'12px 16px', color:'#475569', fontSize:12.5 }}>{cm.focus}</td>
                              <td style={{ padding:'12px 16px', fontWeight:600 }}>{total}</td>
                              <td style={{ padding:'12px 16px', color: total > 0 ? '#16a34a' : '#64748b', fontWeight:700 }}>
                                {approved}/{total}
                              </td>
                              <td style={{ padding:'12px 16px', color:'#64748b', fontSize:12 }}>{cm.target}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ AUDIT TRAIL ═════════════════════════════════════════════════ */}
            {activeTab === 'audit' && (
              <div>
                <div className="dashboard-header">
                  <div>
                    <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:0 }}>Audit Trail &amp; Event Ledger</h1>
                    <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>
                      Tamper-evident log of all submissions, approvals, returns, and access events
                    </p>
                  </div>
                  <button className="btn-secondary"
                    onClick={() => exportCSV(
                      auditLogs.map(l => ({ id:l.id, title:l.action, category:'Audit', subCategory:'System', naacCriterion:'—', ownerName:l.actor, department:'—', status:l.newStatus, currentStage:'—', evidenceFile:l.hash })),
                      'Audit_Ledger.csv')}
                    style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #cbd5e1', background:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}>
                    Export Audit Log (.CSV)
                  </button>
                </div>

                <div className="table-card" style={{ marginTop:20 }}>
                  <div className="table-responsive">
                    <table className="data-table" style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', textAlign:'left', fontSize:12, color:'#64748b' }}>
                          <th style={{ padding:'12px 16px' }}>Timestamp</th>
                          <th style={{ padding:'12px 16px' }}>Event Action</th>
                          <th style={{ padding:'12px 16px' }}>Actor</th>
                          <th style={{ padding:'12px 16px' }}>Target Record</th>
                          <th style={{ padding:'12px 16px' }}>Prior Status</th>
                          <th style={{ padding:'12px 16px' }}>New Status</th>
                          <th style={{ padding:'12px 16px' }}>Event Hash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.length === 0 ? (
                          <tr><td colSpan="7" style={{ textAlign:'center', padding:40, color:'#64748b' }}>
                            No audit entries yet. Entries are created automatically when documents are submitted, approved, or returned.
                          </td></tr>
                        ) : auditLogs.map((log, i) => (
                          <tr key={log.id||i} style={{ borderBottom:'1px solid #f1f5f9', fontSize:12.5 }}>
                            <td style={{ padding:'12px 16px', color:'#64748b' }}>{log.timestamp}</td>
                            <td style={{ padding:'12px 16px', fontWeight:600, color:'#0f172a' }}>{log.action}</td>
                            <td style={{ padding:'12px 16px', color:'#475569' }}>{log.actor}</td>
                            <td style={{ padding:'12px 16px', color:'#2563eb' }}>{log.recordId}</td>
                            <td style={{ padding:'12px 16px', color:'#64748b' }}>{log.priorStatus}</td>
                            <td style={{ padding:'12px 16px', color:'#334155' }}>{log.newStatus}</td>
                            <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize:11, color:'#94a3b8' }}>{log.hash}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ USER ACCESS CONTROL ═════════════════════════════════════════ */}
            {activeTab === 'access-control' && ['Admin', 'DeanHOD', 'Faculty'].includes(currentUser.role) && (
              <UserAccessControl
                currentUser={currentUser}
                users={users}
                departments={departments}
                onProvision={provisionUser}
                onUpdate={updateUser}
                onUpdateStatus={updateUserStatus}
                onUpdatePermissions={updateUserPermissions}
                onDelete={deleteUser}
                showToast={showToast}
              />
            )}

            {/* ═══ ACCOUNT SETTINGS (ALL USERS) ══════════════════════════════ */}
            {activeTab === 'account-settings' && (
              <AccountSettings
                currentUser={currentUser}
                onUpdateProfile={async (payload) => {
                  const updated = await updateUser(currentUser.id, payload, currentUser);
                  setCurrentUser(updated);
                  return updated;
                }}
                showToast={showToast}
              />
            )}

          </main>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DocumentTable({ docs, onView, onResubmit, currentUser, loading }) {
  if (loading) {
    return <div style={{ textAlign:'center', padding:40, color:'#64748b' }}>Loading records…</div>;
  }
  return (
    <div className="table-responsive">
      <table className="data-table" style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', textAlign:'left', fontSize:12, color:'#64748b' }}>
            <th style={{ padding:'12px 16px' }}>#</th>
            <th style={{ padding:'12px 16px' }}>Document Title</th>
            <th style={{ padding:'12px 16px' }}>Category</th>
            <th style={{ padding:'12px 16px' }}>Owner</th>
            <th style={{ padding:'12px 16px' }}>Submitted</th>
            <th style={{ padding:'12px 16px' }}>Status</th>
            <th style={{ padding:'12px 16px' }}>Stage</th>
            <th style={{ padding:'12px 16px', textAlign:'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#334155' }}>No records found</div>
                <div style={{ fontSize:12, marginTop:4 }}>
                  {currentUser.role === 'Student'
                    ? 'Submit a certificate using "+ Submit Certificate".'
                    : 'Upload a document using "+ Upload Document".'}
                </div>
              </td>
            </tr>
          ) : docs.map((doc, i) => (
            <tr key={doc.id||i} style={{ borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
              <td style={{ padding:'12px 16px', color:'#64748b' }}>{doc.displayNum || i+1}</td>
              <td style={{ padding:'12px 16px', fontWeight:600, color:'#0f172a' }}>{doc.title}</td>
              <td style={{ padding:'12px 16px', color:'#475569' }}>{doc.category}</td>
              <td style={{ padding:'12px 16px', color:'#475569' }}>{doc.ownerName}</td>
              <td style={{ padding:'12px 16px', color:'#64748b' }}>{doc.submittedOn || '—'}</td>
              <td style={{ padding:'12px 16px' }}><StatusBadge status={doc.status} /></td>
              <td style={{ padding:'12px 16px', color:'#64748b' }}>{doc.currentStage}</td>
              <td style={{ padding:'12px 16px', textAlign:'right' }}>
                <div style={{ display:'inline-flex', gap:6 }}>
                  <button onClick={() => onView(doc)}
                    style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #cbd5e1', background:'#fff', color:'#2563eb', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                    {currentUser.role === 'Inspector' ? 'Inspect' : 'View'}
                  </button>
                  {doc.status === 'Returned' && ['Faculty','Student'].includes(currentUser.role) && onResubmit && (
                    <button onClick={() => onResubmit(doc)}
                      style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'#2563eb', color:'#fff', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                      Re-submit
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}