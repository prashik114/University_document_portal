import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import './styles.css';

// Master users directory matching logins.md
const USERS_DIRECTORY = [
  { id: "USR-001", name: "Dr. Rajesh Sharma", email: "rajesh.sharma@university.edu", role: "Faculty", designation: "Associate Professor", department: "Computer Science & Engineering", employeeId: "FAC-CSE-2048", avatar: "F" },
  { id: "USR-002", name: "Prof. A. K. Verma", email: "ak.verma@university.edu", role: "DeanHOD", designation: "Head of Department & Professor", department: "Computer Science & Engineering", employeeId: "HOD-CSE-1002", avatar: "D" },
  { id: "USR-003", name: "Dr. Sunita Rao", email: "sunita.rao@university.edu", role: "IQAC", designation: "Director & Central IQAC Coordinator", department: "Internal Quality Assurance Cell", employeeId: "IQAC-DIR-004", avatar: "I" },
  { id: "USR-004", name: "Er. Vikram Mehta", email: "admin@university.edu", role: "Admin", designation: "Chief Systems Administrator", department: "Central IT & Institutional Governance", employeeId: "ADM-SYS-001", avatar: "A" },
  { id: "USR-005", name: "Dr. M. S. Swaminathan", email: "naac.evaluator@naac.gov.in", role: "Inspector", designation: "NAAC Peer Team Lead Assessor", department: "External Peer Review Committee", employeeId: "EXT-NAAC-881", avatar: "E" },
  { id: "USR-006", name: "Dr. Ananya Sen", email: "ananya.sen@university.edu", role: "Faculty", designation: "Assistant Professor", department: "Computer Science & Engineering", employeeId: "FAC-CSE-2089", avatar: "A" },
  { id: "USR-007", name: "Prof. R. K. Mukherjee", email: "rk.mukherjee@university.edu", role: "DeanHOD", designation: "Dean & Professor", department: "Electronics & Communication Engineering", employeeId: "HOD-ECE-1005", avatar: "R" },
  { id: "USR-008", name: "Dr. Shalini Verma", email: "shalini.verma@university.edu", role: "Faculty", designation: "Associate Professor", department: "Management Studies", employeeId: "FAC-MGMT-1402", avatar: "S" },
  { id: "USR-009", name: "Prof. Vivek Chawla", email: "v.chawla@university.edu", role: "DeanHOD", designation: "Head of Department", department: "Mechanical Engineering", employeeId: "HOD-MECH-1008", avatar: "V" },
  { id: "USR-010", name: "Dr. Kavita Deshmukh", email: "kavita.d@university.edu", role: "Faculty", designation: "Assistant Professor", department: "Biotechnology & Bioinformatics", employeeId: "FAC-BIO-1120", avatar: "K" },
  { id: "USR-011", name: "Aarav Patel", email: "aarav.p@student.university.edu", role: "Faculty", designation: "Student Representative (B.Tech)", department: "Computer Science & Engineering", employeeId: "STU-CSE-8842", avatar: "S" },
  { id: "USR-012", name: "Priya Nair", email: "priya.n@student.university.edu", role: "Faculty", designation: "Research Scholar (Ph.D)", department: "Computer Science & Engineering", employeeId: "STU-CSE-8910", avatar: "P" }
];

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("portal_user_profile");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return USERS_DIRECTORY[0];
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("portal_auth_user") === "true";
  });
  const [loginEmail, setLoginEmail] = useState("rajesh.sharma@university.edu");
  const [loginPassword, setLoginPassword] = useState("Password@123");
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [showForgotView, setShowForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("rajesh.sharma@university.edu");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Application Data State
  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Upload Document Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Academic');
  const [uploadSubCategory, setUploadSubCategory] = useState('Curriculum Workshop');
  const [uploadCriterion, setUploadCriterion] = useState('Criteria 1: Curricular Aspects');
  const [uploadFileName, setUploadFileName] = useState('');

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    try {
      const data = await api.getState();
      if (data && data.documents) {
        setDocuments(data.documents);
      }
      if (data && data.auditLogs) {
        setAuditLogs(data.auditLogs);
      }
    } catch (e) {
      console.warn("Backend state sync unavailable, running local state mode.");
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const matched = USERS_DIRECTORY.find(u => u.email.toLowerCase() === loginEmail.trim().toLowerCase());
    const userToSet = matched || USERS_DIRECTORY[0];
    setCurrentUser(userToSet);
    setIsAuthenticated(true);
    localStorage.setItem("portal_auth_user", "true");
    localStorage.setItem("portal_user_profile", JSON.stringify(userToSet));
    showToast(`Signed in successfully as ${userToSet.name} (${userToSet.role})`, "success");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserMenuOpen(false);
    localStorage.removeItem("portal_auth_user");
    localStorage.removeItem("portal_user_profile");
    showToast("Logged out successfully.", "info");
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    showToast(`Password reset link sent to ${forgotEmail}. Please check your inbox.`, "success");
    setShowForgotView(false);
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      showToast("Please enter a document title.", "warning");
      return;
    }
    const newDoc = {
      id: `DOC-2026-${String(documents.length + 1).padStart(3, '0')}`,
      displayNum: documents.length + 1,
      title: uploadTitle.trim(),
      category: uploadCategory,
      subCategory: uploadSubCategory,
      ownerType: "Faculty Member",
      ownerName: currentUser.name,
      ownerId: currentUser.employeeId,
      recordedByFaculty: currentUser.name,
      department: currentUser.department,
      school: "School of Computing & IT",
      academicYear: "2026-2027",
      submittedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: "Under Verification",
      currentStage: "Dean/HOD",
      naacCriterion: uploadCriterion,
      fileType: "pdf",
      fileSize: "2.4 MB",
      evidenceFile: uploadFileName || "evidence_document.pdf",
      evidenceVerified: false,
      isLocked: false
    };

    setDocuments(prev => [newDoc, ...prev]);
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadFileName('');
    showToast(`Document "${newDoc.title}" submitted successfully for verification!`, "success");
  };

  const filteredDocs = documents.filter(doc => {
    if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && doc.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return doc.title.toLowerCase().includes(q) || doc.ownerName?.toLowerCase().includes(q) || doc.department?.toLowerCase().includes(q);
    }
    return true;
  });

  const kpis = {
    total: filteredDocs.length,
    underVerification: filteredDocs.filter(d => d.status === 'Under Verification').length,
    returned: filteredDocs.filter(d => d.status === 'Returned').length,
    approved: filteredDocs.filter(d => d.status === 'Approved').length
  };

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999999,
          background: toast.type === 'danger' ? '#ef4444' : toast.type === 'success' ? '#16a34a' : toast.type === 'warning' ? '#d97706' : '#2563eb',
          color: '#fff', padding: '12px 20px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* LOGIN SCREEN OVERLAY */}
      {!isAuthenticated && (
        <div className="login-screen-overlay active" style={{ display: 'flex', background: 'radial-gradient(circle at 50% 25%, #1e293b 0%, #0f172a 100%)', zIndex: 99999 }}>
          <div className="login-container-card" style={{ background: '#ffffff', borderRadius: '14px', maxWidth: '440px', width: '100%', overflow: 'hidden' }}>
            <div className="login-header-banner">
              <div className="login-brand-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z"/>
                </svg>
              </div>
              <div className="login-title">University Repository</div>
              <div className="login-subtitle">Official Institutional Sign-In</div>
            </div>

            {!showForgotView ? (
              <form className="login-body-form" onSubmit={handleLogin}>
                <div className="login-input-group">
                  <label className="login-label">Official Institutional Email</label>
                  <div className="login-input-wrap">
                    <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input
                      type="email"
                      className="login-input"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. rajesh.sharma@university.edu"
                    />
                  </div>
                </div>

                <div className="login-input-group">
                  <label className="login-label">
                    <span>{isOtpMode ? "One-Time Password (OTP)" : "Password"}</span>
                    <a
                      href="javascript:void(0)"
                      onClick={() => {
                        setIsOtpMode(!isOtpMode);
                        if (!isOtpMode) {
                          setLoginPassword("1234");
                          showToast("OTP sent to institutional email (Default: 1234)", "info");
                        } else {
                          setLoginPassword("Password@123");
                        }
                      }}
                      style={{ fontSize: '11.5px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {isOtpMode ? "Login with Password" : "Login with OTP"}
                    </a>
                  </label>
                  <div className="login-input-wrap">
                    <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input
                      type={isOtpMode ? "text" : "password"}
                      className="login-input"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={isOtpMode ? "Enter OTP (Default: 1234)" : "Enter password"}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: '#475569', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: '#2563eb' }} />
                    <span>Remember me</span>
                  </label>
                  <a
                    href="javascript:void(0)"
                    onClick={() => setShowForgotView(true)}
                    style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Forgot Password?
                  </a>
                </div>

                <button type="submit" className="login-btn-submit" style={{ marginTop: '8px' }}>
                  <span>Sign In to Repository</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>

                <div className="login-footer-hint">
                  Protected by Central University Authentication (SSO) &bull; 256-Bit SSL Encrypted
                </div>
              </form>
            ) : (
              <form className="login-body-form" onSubmit={handleForgotPassword}>
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Reset Your Password</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>Enter your registered university email below to receive a secure password reset link.</div>
                </div>

                <div className="login-input-group">
                  <label className="login-label">Official Institutional Email</label>
                  <div className="login-input-wrap">
                    <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input
                      type="email"
                      className="login-input"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. rajesh.sharma@university.edu"
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn-submit" style={{ marginTop: '8px' }}>
                  <span>Send Password Reset Link</span>
                </button>

                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <a
                    href="javascript:void(0)"
                    onClick={() => setShowForgotView(false)}
                    style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                  >
                    &larr; Back to Sign In
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MAIN APPLICATION LAYOUT (When authenticated) */}
      {isAuthenticated && (
        <>
          {/* Mobile Sidebar Backdrop */}
          <div
            className={`sidebar-backdrop ${mobileSidebarOpen ? 'active' : ''}`}
            onClick={() => setMobileSidebarOpen(false)}
          ></div>

          <div className="app-layout">
            {/* SIDEBAR */}
            <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
              <div className="sidebar-top">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <div className="sidebar-brand" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                    <div className="brand-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z"/>
                      </svg>
                    </div>
                    <div className="brand-text">
                      <span className="brand-title">University</span>
                      <span className="brand-subtitle">Repository</span>
                    </div>
                  </div>
                  <button
                    className="sidebar-close-btn"
                    onClick={() => setMobileSidebarOpen(false)}
                    aria-label="Close navigation sidebar"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

              <nav className="sidebar-nav">
                <a className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span>Dashboard</span>
                </a>

                {['Faculty', 'DeanHOD', 'Admin'].includes(currentUser.role) && (
                  <a className="nav-item" onClick={() => setShowUploadModal(true)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16l-4-4-4 4M12 12v9"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><polyline points="16 16 12 12 8 16"/></svg>
                    <span>Upload Document</span>
                  </a>
                )}

                <a className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span>My Documents</span>
                  <span className="nav-badge">{documents.length}</span>
                </a>

                {['DeanHOD', 'IQAC', 'Admin'].includes(currentUser.role) && (
                  <a className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => setActiveTab('queue')}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>
                    <span>Verification Queue</span>
                    <span className="nav-badge danger">{kpis.underVerification}</span>
                  </a>
                )}

                <a className={`nav-item ${activeTab === 'repository' ? 'active' : ''}`} onClick={() => setActiveTab('repository')}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                  <span>Document Repository</span>
                </a>

                <a className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  <span>Reports</span>
                </a>

                <a className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 8 14"/></svg>
                  <span>Audit Trail</span>
                </a>
              </nav>
            </div>

            <div className="sidebar-footer">
              <a className="logout-link" onClick={handleLogout} style={{ cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Logout</span>
              </a>
            </div>
          </aside>

          {/* MAIN WRAPPER */}
          <div className="main-wrapper">
            {/* TOP NAVBAR */}
            <header className="top-navbar">
              <div className="top-navbar-left">
                {/* Mobile Hamburger Drawer Toggle */}
                <button
                  className="mobile-nav-toggle"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open navigation menu"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>

                <div className="search-box-container">
                  <svg className="search-icon-nav" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    className="global-search-input"
                    placeholder="Search documents, criteria, faculty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="navbar-actions" style={{ position: 'relative' }}>
                {/* System Notifications */}
                <button className="notification-btn" onClick={() => showToast("System Notifications: All records up to date.", "info")}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span className="notification-dot"></span>
                </button>

                {/* Official User Profile Badge */}
                <div
                  className="user-profile-badge"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="user-avatar-circle">{currentUser.avatar || currentUser.name.charAt(0)}</div>
                  <span className="user-role-label">{currentUser.name}</span>
                  <svg className="chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>

                {/* User Profile Dropdown Menu */}
                {userMenuOpen && (
                  <div className="context-menu-popup active" style={{ display: 'block', right: 0, top: 50, width: 280, zIndex: 9999 }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{currentUser.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>{currentUser.designation}</div>
                      <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>{currentUser.department}</div>
                    </div>
                    <div style={{ padding: '6px 0' }}>
                      <div className="context-menu-item" onClick={() => { setActiveTab('dashboard'); setUserMenuOpen(false); }}>
                        <span>Dashboard Home</span>
                      </div>
                      <div className="context-menu-item" onClick={() => { setActiveTab('documents'); setUserMenuOpen(false); }}>
                        <span>My Submissions</span>
                      </div>
                      <div className="context-menu-item" onClick={handleLogout} style={{ color: '#dc2626', fontWeight: 600 }}>
                        <span>Sign Out</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="main-content">
              {/* Personalized Header Banner */}
              <div className="dashboard-header">
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Welcome, {currentUser.name}</h1>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                    {currentUser.designation} &bull; {currentUser.department} &bull; Cycle 2026-2027
                  </p>
                </div>

                {['Faculty', 'DeanHOD', 'Admin'].includes(currentUser.role) && (
                  <button
                    className="primary-btn"
                    onClick={() => setShowUploadModal(true)}
                  >
                    <span>+ Upload Document</span>
                  </button>
                )}
              </div>

              {/* 4 Standard Responsive KPI Cards */}
              <div className="kpi-cards-grid">
                <div className="kpi-card kpi-card-blue">
                  <div className="kpi-value">{kpis.total}</div>
                  <div className="kpi-label">Total Documents</div>
                </div>
                <div className="kpi-card kpi-card-amber">
                  <div className="kpi-value">{kpis.underVerification}</div>
                  <div className="kpi-label">Under Verification</div>
                </div>
                <div className="kpi-card kpi-card-red">
                  <div className="kpi-value">{kpis.returned}</div>
                  <div className="kpi-label">Returned</div>
                </div>
                <div className="kpi-card kpi-card-green">
                  <div className="kpi-value">{kpis.approved}</div>
                  <div className="kpi-label">Approved & Locked in SSR</div>
                </div>
              </div>

              {/* Primary Accreditation Evidence Records Table */}
              <div className="table-card" style={{ marginTop: 24 }}>
                <div className="table-card-header">
                  <div className="table-card-title">
                    Accreditation Evidence Records
                  </div>
                  <div className="table-filters-group">
                    <select
                      className="select-filter"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                    >
                      <option value="ALL">All Categories</option>
                      <option value="Academic">Academic</option>
                      <option value="Research">Research</option>
                      <option value="Co-curricular">Co-curricular</option>
                      <option value="NAAC">NAAC</option>
                      <option value="Student">Student</option>
                    </select>

                    <select
                      className="select-filter"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                    >
                      <option value="ALL">All Status</option>
                      <option value="Under Verification">Under Verification</option>
                      <option value="Returned">Returned</option>
                      <option value="Approved">Approved</option>
                    </select>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                        <th style={{ padding: '12px 16px' }}>#</th>
                        <th style={{ padding: '12px 16px' }}>Document Title</th>
                        <th style={{ padding: '12px 16px' }}>Category</th>
                        <th style={{ padding: '12px 16px' }}>Owner / Submitter</th>
                        <th style={{ padding: '12px 16px' }}>Submitted On</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                        <th style={{ padding: '12px 16px' }}>Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No records found</div>
                            <div style={{ fontSize: 12, marginTop: 4 }}>Submit new accreditation records using the "+ Upload Document" button.</div>
                          </td>
                        </tr>
                      ) : (
                        filteredDocs.map((doc, idx) => (
                          <tr key={doc.id || idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{doc.displayNum || idx + 1}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{doc.title}</td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>{doc.category}</td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>{doc.ownerName || currentUser.name}</td>
                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{doc.submittedOn || 'Today'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
                                background: doc.status === 'Approved' ? '#dcfce7' : doc.status === 'Returned' ? '#fee2e2' : '#fef3c7',
                                color: doc.status === 'Approved' ? '#15803d' : doc.status === 'Returned' ? '#b91c1c' : '#b45309'
                              }}>
                                {doc.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{doc.currentStage || 'Dean/HOD'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="modal-overlay active" style={{ display: 'flex', zIndex: 99999 }}>
          <div className="modal-dialog" style={{ maxWidth: '640px', width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div className="modal-title" style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Upload Accreditation Document</div>
              <button
                className="modal-close-btn"
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Document Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className="login-input"
                  placeholder="e.g. Workshop on Cloud Architecture & AI (2026)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Category</label>
                  <select
                    className="select-filter"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  >
                    <option value="Academic">Academic</option>
                    <option value="Research">Research</option>
                    <option value="Co-curricular">Co-curricular</option>
                    <option value="NAAC">NAAC</option>
                    <option value="Faculty">Faculty Publication</option>
                    <option value="Student">Student Achievement</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>NAAC Criterion</label>
                  <select
                    className="select-filter"
                    value={uploadCriterion}
                    onChange={(e) => setUploadCriterion(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  >
                    <option value="Criteria 1: Curricular Aspects">Criteria 1: Curricular Aspects</option>
                    <option value="Criteria 2: Teaching-Learning & Evaluation">Criteria 2: Teaching-Learning</option>
                    <option value="Criteria 3: Research, Innovations & Extension">Criteria 3: Research & Innovations</option>
                    <option value="Criteria 4: Infrastructure & Learning Resources">Criteria 4: Infrastructure</option>
                    <option value="Criteria 5: Student Support & Progression">Criteria 5: Student Support</option>
                    <option value="Criteria 6: Governance, Leadership & Management">Criteria 6: Governance</option>
                    <option value="Criteria 7: Institutional Values & Best Practices">Criteria 7: Best Practices</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Evidence File (.pdf, .xlsx, .docx)</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFileName(e.target.files[0]?.name || '')}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px dashed #cbd5e1', background: '#f8fafc' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{ padding: '9px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
