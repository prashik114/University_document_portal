import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import './styles.css';

// Master users directory matching logins.md
const USERS_DIRECTORY = [
  { id: "USR-001", name: "Dr. Rajesh Sharma", email: "rajesh.sharma@university.edu", role: "Faculty", designation: "Associate Professor", department: "Computer Science & Engineering", employeeId: "FAC-CSE-2048", avatar: "F", password: "Password@123", otp: "1234" },
  { id: "USR-002", name: "Prof. A. K. Verma", email: "ak.verma@university.edu", role: "DeanHOD", designation: "Head of Department & Professor", department: "Computer Science & Engineering", employeeId: "HOD-CSE-1002", avatar: "D", password: "Password@123", otp: "1234" },
  { id: "USR-003", name: "Dr. Sunita Rao", email: "sunita.rao@university.edu", role: "IQAC", designation: "Director & Central IQAC Coordinator", department: "Internal Quality Assurance Cell", employeeId: "IQAC-DIR-004", avatar: "I", password: "Password@123", otp: "1234" },
  { id: "USR-004", name: "Er. Vikram Mehta", email: "admin@university.edu", role: "Admin", designation: "Chief Systems Administrator", department: "Central IT & Institutional Governance", employeeId: "ADM-SYS-001", avatar: "A", password: "Password@123", otp: "1234" },
  { id: "USR-005", name: "Dr. M. S. Swaminathan", email: "naac.evaluator@naac.gov.in", role: "Inspector", designation: "NAAC Peer Team Lead Assessor", department: "External Peer Review Committee", employeeId: "EXT-NAAC-881", avatar: "E", password: "Password@123", otp: "1234" },
  { id: "USR-006", name: "Dr. Ananya Sen", email: "ananya.sen@university.edu", role: "Faculty", designation: "Assistant Professor", department: "Computer Science & Engineering", employeeId: "FAC-CSE-2089", avatar: "A", password: "Password@123", otp: "1234" },
  { id: "USR-007", name: "Prof. R. K. Mukherjee", email: "rk.mukherjee@university.edu", role: "DeanHOD", designation: "Dean & Professor", department: "Electronics & Communication Engineering", employeeId: "HOD-ECE-1005", avatar: "R", password: "Password@123", otp: "1234" },
  { id: "USR-008", name: "Dr. Shalini Verma", email: "shalini.verma@university.edu", role: "Faculty", designation: "Associate Professor", department: "Management Studies", employeeId: "FAC-MGMT-1402", avatar: "S", password: "Password@123", otp: "1234" },
  { id: "USR-009", name: "Prof. Vivek Chawla", email: "v.chawla@university.edu", role: "DeanHOD", designation: "Head of Department", department: "Mechanical Engineering", employeeId: "HOD-MECH-1008", avatar: "V", password: "Password@123", otp: "1234" },
  { id: "USR-010", name: "Dr. Kavita Deshmukh", email: "kavita.d@university.edu", role: "Faculty", designation: "Assistant Professor", department: "Biotechnology & Bioinformatics", employeeId: "FAC-BIO-1120", avatar: "K", password: "Password@123", otp: "1234" },
  { id: "USR-011", name: "Aarav Patel", email: "aarav.p@student.university.edu", role: "Student", designation: "Student Representative (B.Tech)", department: "Computer Science & Engineering", employeeId: "STU-CSE-8842", avatar: "S", password: "Password@123", otp: "1234" },
  { id: "USR-012", name: "Priya Nair", email: "priya.n@student.university.edu", role: "Student", designation: "Research Scholar (Ph.D)", department: "Computer Science & Engineering", employeeId: "STU-CSE-8910", avatar: "P", password: "Password@123", otp: "1234" }
];

const NAAC_CRITERIA_METRICS = [
  { code: "CR-1", name: "Criteria 1: Curricular Aspects", focus: "Syllabus enrichment, BOS minutes, academic flexibility", count: 12, approved: 10, target: "Metric 1.1 - 1.4" },
  { code: "CR-2", name: "Criteria 2: Teaching-Learning & Evaluation", focus: "Faculty awards, mentor-mentee records, pass percentage", count: 18, approved: 15, target: "Metric 2.1 - 2.6" },
  { code: "CR-3", name: "Criteria 3: Research, Innovations & Extension", focus: "Sponsored grants, scopus publications, patent filings", count: 15, approved: 12, target: "Metric 3.1 - 3.7" },
  { code: "CR-4", name: "Criteria 4: Infrastructure & Learning Resources", focus: "Lab stock audit, library automated accession, ICT logs", count: 9, approved: 8, target: "Metric 4.1 - 4.4" },
  { code: "CR-5", name: "Criteria 5: Student Support & Progression", focus: "Placements, scholarships, competitive exam clearing", count: 14, approved: 11, target: "Metric 5.1 - 5.4" },
  { code: "CR-6", name: "Criteria 6: Governance, Leadership & Management", focus: "IQAC review minutes, e-governance ERP, FDP support", count: 11, approved: 9, target: "Metric 6.1 - 6.5" },
  { code: "CR-7", name: "Criteria 7: Institutional Values & Best Practices", focus: "Green audit, energy certs, gender equity events", count: 8, approved: 7, target: "Metric 7.1 - 7.3" }
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
  const [currentPath, setCurrentPath] = useState(() => {
    const p = window.location.pathname.replace(/^\//, '') || '';
    return p;
  });

  const navigateTo = (path) => {
    try {
      window.history.pushState({}, '', `/${path}`);
    } catch (_) {}
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.replace(/^\//, '') || '';
      setCurrentPath(p);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (!currentPath || currentPath === 'login') {
        const targetPath = currentUser.role === 'Student' ? 'student' :
                           currentUser.role === 'DeanHOD' ? 'dean' :
                           currentUser.role === 'IQAC' ? 'iqac' :
                           currentUser.role === 'Inspector' ? 'inspector' :
                           currentUser.role === 'Admin' ? 'admin' : 'faculty';
        navigateTo(targetPath);
      }
    } else {
      if (currentPath !== 'login') {
        navigateTo('login');
      }
    }
  }, [isAuthenticated, currentUser]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [showForgotView, setShowForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(true);

  // Application Data State
  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [myDocsSubTab, setMyDocsSubTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocForModal, setSelectedDocForModal] = useState(null);

  // Form Fields
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
    setLoginError("");

    const emailTrimmed = loginEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
      setLoginError("Please enter a valid institutional email address.");
      showToast("Please enter a valid institutional email address.", "warning");
      return;
    }

    // Strict Institutional Directory Lookup (No auto-fallback to Dr. Rajesh Sharma)
    const matched = USERS_DIRECTORY.find(u => u.email.toLowerCase() === emailTrimmed);
    if (!matched) {
      setLoginError(`Access Denied: No institutional account found for "${emailTrimmed}". Please enter your registered university email.`);
      showToast("Access Denied: Unregistered email address.", "error");
      return;
    }

    // Password / OTP Verification
    const expectedPassword = matched.password || "Password@123";
    if (isOtpMode) {
      if (loginPassword.trim() !== "1234") {
        setLoginError("Access Denied: Invalid Security OTP. Please enter the valid 4-digit code (1234).");
        showToast("Invalid OTP code. Access denied.", "error");
        return;
      }
    } else {
      if (!loginPassword || loginPassword !== expectedPassword) {
        setLoginError("Access Denied: Incorrect password. Please check your credentials and try again.");
        showToast("Incorrect password. Access denied.", "error");
        return;
      }
    }

    setCurrentUser(matched);
    setIsAuthenticated(true);
    localStorage.setItem("portal_auth_user", "true");
    localStorage.setItem("portal_user_profile", JSON.stringify(matched));
    const rolePath = matched.role === 'Student' ? 'student' :
                     matched.role === 'DeanHOD' ? 'dean' :
                     matched.role === 'IQAC' ? 'iqac' :
                     matched.role === 'Inspector' ? 'inspector' :
                     matched.role === 'Admin' ? 'admin' : 'faculty';
    navigateTo(rolePath);
    showToast(`Signed in successfully as ${matched.name} (${matched.role})`, "success");
  };

  const handleLogout = () => {
    setLoginError("");
    setIsAuthenticated(false);
    setUserMenuOpen(false);
    localStorage.removeItem("portal_auth_user");
    localStorage.removeItem("portal_user_profile");
    navigateTo("login");
    showToast("Logged out successfully.", "info");
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    showToast(`Password reset link sent to ${forgotEmail}. Please check your inbox.`, "success");
    setShowForgotView(false);
  };

  const handleUploadSubmit = (isDraft = false) => {
    if (!uploadTitle.trim()) {
      showToast("Please enter a document title.", "warning");
      return;
    }
    const newDoc = {
      id: `DOC-2026-${String(documents.length + 1).padStart(3, '0')}`,
      displayNum: documents.length + 1,
      title: uploadTitle.trim(),
      category: currentUser.role === 'Student' ? 'Student' : uploadCategory,
      subCategory: currentUser.role === 'Student' ? 'Student Achievement' : uploadSubCategory,
      ownerType: currentUser.role === 'Student' ? 'Student' : 'Faculty Member',
      ownerName: currentUser.name,
      ownerId: currentUser.employeeId,
      recordedByFaculty: currentUser.name,
      department: currentUser.department,
      school: "School of Computing & IT",
      academicYear: "2026-2027",
      submittedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: isDraft ? "Draft" : "Under Verification",
      currentStage: isDraft ? "Draft" : (currentUser.role === 'Student' ? "Faculty / HoD Review" : "Dean/HOD"),
      naacCriterion: uploadCriterion,
      fileType: "pdf",
      fileSize: "2.4 MB",
      evidenceFile: uploadFileName || "certificate_evidence.pdf",
      evidenceVerified: !isDraft,
      isLocked: false
    };

    setDocuments(prev => [newDoc, ...prev]);
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadFileName('');
    showToast(isDraft ? `Draft record "${newDoc.title}" saved.` : `Document "${newDoc.title}" submitted successfully for verification!`, "success");
  };

  const handleApproveRecord = (docId) => {
    const isDean = currentUser.role === 'DeanHOD';
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        if (isDean) {
          return { ...d, status: "Under Verification", currentStage: "IQAC" };
        } else {
          return { ...d, status: "Approved", currentStage: "IQAC Certified & Locked", isLocked: true };
        }
      }
      return d;
    }));
    if (selectedDocForModal && selectedDocForModal.id === docId) {
      setSelectedDocForModal(prev => ({
        ...prev,
        status: isDean ? "Under Verification" : "Approved",
        currentStage: isDean ? "IQAC" : "IQAC Certified & Locked",
        isLocked: !isDean
      }));
    }
    const msg = isDean
      ? `Record ${docId} verified by Department and forwarded to Central IQAC Queue!`
      : `Record ${docId} approved and certified for NAAC SSR!`;
    showToast(msg, "success");
  };

  const handleReturnRecord = (docId) => {
    const reason = prompt("Enter required correction reason for submitter:", "Please provide signed HoD recommendation / attendance slip.");
    if (!reason) return;
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        return { ...d, status: "Returned", currentStage: "Returned to Submitter", remarks: reason };
      }
      return d;
    }));
    if (selectedDocForModal && selectedDocForModal.id === docId) {
      setSelectedDocForModal(prev => ({ ...prev, status: "Returned", currentStage: "Returned to Submitter" }));
    }
    showToast(`Record ${docId} returned to submitter for corrections.`, "warning");
  };

  const handleBatchApproveQueue = () => {
    const pendingCount = documents.filter(d => d.status === 'Under Verification').length;
    if (pendingCount === 0) {
      showToast("No pending records in verification queue.", "info");
      return;
    }
    setDocuments(prev => prev.map(d => {
      if (d.status === 'Under Verification') {
        return { ...d, status: "Approved", currentStage: "IQAC Certified & Locked", isLocked: true };
      }
      return d;
    }));
    showToast(`Batch approved & forward completed for ${pendingCount} records!`, "success");
  };

  const handleExportCSV = (recordsList, filename = "Records_Export.csv") => {
    if (!recordsList || recordsList.length === 0) {
      showToast("No records available to export.", "warning");
      return;
    }
    const headers = ["ID", "Title", "Category", "SubCategory", "NAAC Criterion", "Owner", "Department", "Status", "Stage", "File"];
    const rows = recordsList.map(d => [
      `"${d.id || ''}"`,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${d.category || ''}"`,
      `"${d.subCategory || ''}"`,
      `"${d.naacCriterion || ''}"`,
      `"${d.ownerName || ''}"`,
      `"${d.department || ''}"`,
      `"${d.status || ''}"`,
      `"${d.currentStage || ''}"`,
      `"${d.evidenceFile || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${recordsList.length} records to ${filename}`, "success");
  };

  const handleDownloadEvidence = (filename) => {
    showToast(`Downloading secure evidence: ${filename || 'certified_document.pdf'}`, "info");
  };

  // Filtered documents for main table
  const filteredDocs = documents.filter(doc => {
    if (currentUser.role === 'Student') {
      const isOwner = doc.ownerId === currentUser.employeeId || doc.ownerName === currentUser.name || doc.category === 'Student';
      if (!isOwner) return false;
    }
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

  const roleColors = {
    "Faculty": "#2563eb",
    "Student": "#0284c7",
    "DeanHOD": "#059669",
    "IQAC": "#7c3aed",
    "Admin": "#4f46e5",
    "Inspector": "#d97706"
  };
  const roleColor = roleColors[currentUser.role] || "#2563eb";

  const clearanceMap = {
    "Faculty": "Authorized for Self & Student Submissions",
    "Student": "Authorized for Personal Co-Curricular & Student Achievements",
    "DeanHOD": "Authorized for Departmental Verification & Routing",
    "IQAC": "Authorized for Central NAAC SSR Certification & Locking",
    "Admin": "Institutional Master Governance & Security Administration",
    "Inspector": "Official External Peer Review Clearance (Read-Only)"
  };
  const clearanceDesc = clearanceMap[currentUser.role] || "Institutional Verified Access";

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
                {loginError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    lineHeight: '1.4'
                  }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div>{loginError}</div>
                  </div>
                )}
                <div className="login-input-group">
                  <label className="login-label">Official Institutional Email</label>
                  <div className="login-input-wrap">
                    <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input
                      type="email"
                      className="login-input"
                      required
                      value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); setLoginError(""); }}
                      placeholder="e.g. your.name@university.edu"
                    />
                  </div>
                </div>

                <div className="login-input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="login-label">Password</label>
                    <button
                      type="button"
                      className="login-forgot-link"
                      onClick={() => {
                        setIsOtpMode(!isOtpMode);
                        if (!isOtpMode) {
                          setLoginPassword("1234");
                          showToast("OTP sent to your official email (Default: 1234)", "info");
                        } else {
                          setLoginPassword("Password@123");
                        }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {isOtpMode ? "Login with Password" : "Login with OTP"}
                    </button>
                  </div>
                  <div className="login-input-wrap">
                    <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input
                      type={isOtpMode ? "text" : "password"}
                      className="login-input"
                      required
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
                      placeholder={isOtpMode ? "Enter 4-digit Security OTP" : "Enter your institutional password"}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 16px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked /> Remember me
                  </label>
                  <button
                    type="button"
                    className="login-forgot-link"
                    onClick={() => setShowForgotView(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="login-btn-submit" style={{ marginTop: '4px' }}>
                  <span>Sign In to Repository &rarr;</span>
                </button>
              </form>
            ) : (
              <form className="login-body-form" onSubmit={handleForgotPassword}>
                <div style={{ marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Reset Password</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Enter your registered email to receive an institutional reset link.</p>
                </div>
                <div className="login-input-group">
                  <label className="login-label">Registered Email</label>
                  <div className="login-input-wrap">
                    <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input
                      type="email"
                      className="login-input"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. your.name@university.edu"
                    />
                  </div>
                </div>
                <button type="submit" className="login-btn-submit" style={{ marginTop: '8px' }}>
                  Send Password Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotView(false)}
                  style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#64748b', fontSize: '12.5px', cursor: 'pointer' }}
                >
                  &larr; Back to Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MAIN PORTAL APP LAYOUT */}
      {isAuthenticated && (
        <>
          <div
            className={`sidebar-backdrop ${mobileSidebarOpen ? 'active' : ''}`}
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="app-layout">
            {/* SIDEBAR NAVIGATION - Strictly role-restricted */}
            <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
              <div>
                <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="brand-logo-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z"/>
                      </svg>
                    </div>
                    <div className="brand-title">
                      <div>University</div>
                      <span>Repository</span>
                    </div>
                  </div>

                  <button
                    className="sidebar-close-btn"
                    onClick={() => setMobileSidebarOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <nav className="sidebar-nav">
                  {/* Dashboard link for all */}
                  <a className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span>{currentUser.role === 'Student' ? 'Student Portal' : (currentUser.role === 'Inspector' ? 'Inspection Dashboard' : (currentUser.role === 'Admin' ? 'Admin Console' : 'Dashboard'))}</span>
                  </a>

                  {/* Upload Document: Faculty, Student, Dean, Admin (NOT Inspector) */}
                  {['Faculty', 'Student', 'DeanHOD', 'Admin'].includes(currentUser.role) && (
                    <a className="nav-item" onClick={() => { setShowUploadModal(true); setMobileSidebarOpen(false); }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16l-4-4-4 4M12 12v9"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><polyline points="16 16 12 12 8 16"/></svg>
                      <span>{currentUser.role === 'Student' ? 'Submit Achievement' : 'Upload Document'}</span>
                    </a>
                  )}

                  {/* My Documents: Faculty, Student, Dean */}
                  {['Faculty', 'Student', 'DeanHOD'].includes(currentUser.role) && (
                    <a className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => { setActiveTab('documents'); setMobileSidebarOpen(false); }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span>{currentUser.role === 'Student' ? 'My Certificates' : 'My Documents'}</span>
                      <span className="nav-badge">{filteredDocs.length}</span>
                    </a>
                  )}

                  {/* Verification Queue: Dean, IQAC, Admin */}
                  {['DeanHOD', 'IQAC', 'Admin'].includes(currentUser.role) && (
                    <a className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => { setActiveTab('queue'); setMobileSidebarOpen(false); }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>
                      <span>Verification Queue</span>
                      <span className="nav-badge danger">{documents.filter(d => d.status === 'Under Verification').length}</span>
                    </a>
                  )}

                  {/* Document Repository: Faculty, Dean, IQAC, Inspector, Admin (NOT Student) */}
                  {['Faculty', 'DeanHOD', 'IQAC', 'Inspector', 'Admin'].includes(currentUser.role) && (
                    <a className={`nav-item ${activeTab === 'repository' ? 'active' : ''}`} onClick={() => { setActiveTab('repository'); setMobileSidebarOpen(false); }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                      <span>Document Repository</span>
                    </a>
                  )}

                  {/* Reports: Dean, IQAC, Inspector, Admin */}
                  {['DeanHOD', 'IQAC', 'Inspector', 'Admin'].includes(currentUser.role) && (
                    <a className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => { setActiveTab('reports'); setMobileSidebarOpen(false); }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                      <span>Reports</span>
                    </a>
                  )}

                  {/* Audit Trail: IQAC, Inspector, Admin */}
                  {['IQAC', 'Inspector', 'Admin'].includes(currentUser.role) && (
                    <a className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => { setActiveTab('audit'); setMobileSidebarOpen(false); }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 8 14"/></svg>
                      <span>Audit Trail</span>
                    </a>
                  )}
                </nav>
              </div>

              <div className="sidebar-footer">
                <a className="logout-link" onClick={handleLogout} style={{ cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  <span>Logout</span>
                </a>
              </div>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div className="main-wrapper">
              {/* HEADER NAVBAR */}
            <header className="top-navbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="mobile-nav-toggle"
                  onClick={() => setMobileSidebarOpen(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>

                <div className="search-box-container">
                  <svg className="search-icon-nav" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    className="global-search-input"
                    placeholder="Search documents, criteria..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>

              <div className="navbar-actions nav-actions-group" style={{ position: 'relative' }}>
                {/* Notifications Bell */}
                <button
                  className="notification-btn"
                  onClick={() => {
                    setNotifMenuOpen(!notifMenuOpen);
                    setUserMenuOpen(false);
                  }}
                  style={{ position: 'relative' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {hasUnreadNotifs && <span className="notification-dot"></span>}
                </button>

                {/* Notifications Menu Popover */}
                {notifMenuOpen && (
                  <div className="context-menu-popup active" style={{ display: 'block', right: 100, top: 50, width: 320, zIndex: 9999 }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>System Notifications</span>
                      <button
                        onClick={() => {
                          setHasUnreadNotifs(false);
                          showToast("All notifications marked as read.", "success");
                        }}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Mark all as read
                      </button>
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>Annual NAAC Cycle 2026-27 Active</div>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>SSR evidence collection window is open.</div>
                      </div>
                      <div style={{ padding: '12px 16px', fontSize: 12 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>PostgreSQL Ledger Connected</div>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>All accreditation records synchronized.</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Profile Badge */}
                <div
                  className="user-profile-badge"
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setNotifMenuOpen(false);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="user-avatar-circle" style={{ background: roleColor, color: '#fff' }}>
                    {currentUser.avatar || currentUser.name.charAt(0)}
                  </div>
                  <span className="user-role-label">{currentUser.name}</span>
                  <svg className="chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>

                {/* User Profile Dropdown Menu - Strictly confidential */}
                {userMenuOpen && (
                  <div className="context-menu-popup active" style={{ display: 'block', right: 0, top: 50, width: 310, zIndex: 9999 }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '10px 10px 0 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: roleColor, color: '#fff', fontWeight: 700, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {currentUser.avatar || currentUser.name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</div>
                          <div style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{currentUser.designation}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: roleColor, background: '#fff', border: '1px solid #e2e8f0', padding: '1px 7px', borderRadius: 9999 }}>
                              {currentUser.role.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>ID: {currentUser.employeeId}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 6 }}>OFFICIAL CREDENTIALS</div>
                      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, marginBottom: 8 }}>
                        <strong>Department:</strong> {currentUser.department}<br/>
                        <strong>Official Email:</strong> <span style={{ color: '#2563eb' }}>{currentUser.email}</span><br/>
                        <strong>Clearance Scope:</strong> {clearanceDesc}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        256-Bit SSL Encrypted &bull; Central SSO Verified
                      </div>
                    </div>

                    <div style={{ padding: '8px 16px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 10px 10px' }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Session: <strong style={{ color: '#16a34a' }}>Active</strong></span>
                      <button
                        onClick={handleLogout}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 12, cursor: 'pointer', alignItems: 'center', gap: 4 }}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* MAIN CONTENT AREA - DISTINCT FOR EACH ROLE */}
            <main className="main-content">
              {/* ========================================================
                  VIEW: DASHBOARD
                  ======================================================== */}
              {activeTab === 'dashboard' && (
                <div>
                  {/* ROLE-SPECIFIC BANNER */}
                  <div className="dashboard-header">
                    <div>
                      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {currentUser.role === 'Student' ? `Student Portal: Welcome, ${currentUser.name}` :
                         currentUser.role === 'Inspector' ? `NAAC Peer Team Assessment: ${currentUser.name}` :
                         currentUser.role === 'DeanHOD' ? `Department Governance: ${currentUser.name}` :
                         currentUser.role === 'IQAC' ? `Central IQAC Review: ${currentUser.name}` :
                         currentUser.role === 'Admin' ? `Admin Console: ${currentUser.name}` :
                         `Welcome, ${currentUser.name}`}
                      </h1>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                        {currentUser.role === 'Student' ? `${currentUser.designation} • ${currentUser.department} • Roll ID: ${currentUser.employeeId}` :
                         currentUser.role === 'Inspector' ? `External Peer Review Committee • Read-Only Accreditation Dossier` :
                         `${currentUser.designation} • ${currentUser.department} • Cycle 2026-2027`}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      {/* Inspectors get Export / Print; others get Upload */}
                      {currentUser.role === 'Inspector' ? (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={() => window.print()}
                            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                          >
                            Print Inspection Register
                          </button>
                          <button
                            className="primary-btn"
                            onClick={() => handleExportCSV(documents.filter(d => d.status === 'Approved'), "NAAC_Inspection_Dossier.csv")}
                          >
                            <span>Download Full NAAC Dossier (.CSV)</span>
                          </button>
                        </>
                      ) : currentUser.role === 'Student' ? (
                        <button
                          className="primary-btn"
                          onClick={() => setShowUploadModal(true)}
                        >
                          <span>+ Submit Student Certificate</span>
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={() => handleExportCSV(documents, "Accreditation_Master_Export.csv")}
                            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                          >
                            Export CSV
                          </button>
                          <button
                            className="primary-btn"
                            onClick={() => setShowUploadModal(true)}
                          >
                            <span>+ Upload Document</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ROLE-SPECIFIC 4 KPI CARDS */}
                  <div className="kpi-cards-grid">
                    {currentUser.role === 'Student' ? (
                      <>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">{kpis.total}</div>
                          <div className="kpi-label">Total Achievements Submitted</div>
                        </div>
                        <div className="kpi-card kpi-card-amber">
                          <div className="kpi-value">{kpis.underVerification}</div>
                          <div className="kpi-label">Under Faculty Review</div>
                        </div>
                        <div className="kpi-card kpi-card-red">
                          <div className="kpi-value">{kpis.returned}</div>
                          <div className="kpi-label">Needs Clarification</div>
                        </div>
                        <div className="kpi-card kpi-card-green">
                          <div className="kpi-value">{kpis.approved}</div>
                          <div className="kpi-label">Approved & Verified</div>
                        </div>
                      </>
                    ) : currentUser.role === 'Inspector' ? (
                      <>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">{documents.filter(d => d.status === 'Approved').length}</div>
                          <div className="kpi-label">Verified SSR Evidences</div>
                        </div>
                        <div className="kpi-card kpi-card-green">
                          <div className="kpi-value">7 / 7</div>
                          <div className="kpi-label">NAAC Criteria Met</div>
                        </div>
                        <div className="kpi-card kpi-card-amber">
                          <div className="kpi-value">2.4 Days</div>
                          <div className="kpi-label">Average Verification SLA</div>
                        </div>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">100%</div>
                          <div className="kpi-label">Tamper-Evident Ledger Integrity</div>
                        </div>
                      </>
                    ) : currentUser.role === 'DeanHOD' ? (
                      <>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">{documents.length}</div>
                          <div className="kpi-label">Department Total Records</div>
                        </div>
                        <div className="kpi-card kpi-card-amber">
                          <div className="kpi-value">{documents.filter(d => d.status === 'Under Verification').length}</div>
                          <div className="kpi-label">Action Required in Queue</div>
                        </div>
                        <div className="kpi-card kpi-card-red">
                          <div className="kpi-value">{documents.filter(d => d.status === 'Returned').length}</div>
                          <div className="kpi-label">Returned for Correction</div>
                        </div>
                        <div className="kpi-card kpi-card-green">
                          <div className="kpi-value">{documents.filter(d => d.status === 'Approved').length}</div>
                          <div className="kpi-label">Forwarded & Approved</div>
                        </div>
                      </>
                    ) : currentUser.role === 'IQAC' ? (
                      <>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">{documents.length}</div>
                          <div className="kpi-label">Institutional SSR Records</div>
                        </div>
                        <div className="kpi-card kpi-card-amber">
                          <div className="kpi-value">{documents.filter(d => d.status === 'Under Verification').length}</div>
                          <div className="kpi-label">Pending Quality Audit</div>
                        </div>
                        <div className="kpi-card kpi-card-green">
                          <div className="kpi-value">{documents.filter(d => d.status === 'Approved').length}</div>
                          <div className="kpi-label">SSR Locked & Certified</div>
                        </div>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">100%</div>
                          <div className="kpi-label">SSR Window Compliance</div>
                        </div>
                      </>
                    ) : currentUser.role === 'Admin' ? (
                      <>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">{documents.length}</div>
                          <div className="kpi-label">Total Institutional Records</div>
                        </div>
                        <div className="kpi-card kpi-card-green">
                          <div className="kpi-value">{USERS_DIRECTORY.length}</div>
                          <div className="kpi-label">Active University Users</div>
                        </div>
                        <div className="kpi-card kpi-card-amber">
                          <div className="kpi-value">{auditLogs.length || 24}</div>
                          <div className="kpi-label">Audit Trail Entries</div>
                        </div>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">100%</div>
                          <div className="kpi-label">System Security Health</div>
                        </div>
                      </>
                    ) : currentUser.role === 'Faculty' ? (
                      <>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">{kpis.total}</div>
                          <div className="kpi-label">My Faculty Submissions</div>
                        </div>
                        <div className="kpi-card kpi-card-amber">
                          <div className="kpi-value">{kpis.underVerification}</div>
                          <div className="kpi-label">Under HOD / Dean Review</div>
                        </div>
                        <div className="kpi-card kpi-card-red">
                          <div className="kpi-value">{kpis.returned}</div>
                          <div className="kpi-label">Returned for Clarification</div>
                        </div>
                        <div className="kpi-card kpi-card-green">
                          <div className="kpi-value">{kpis.approved}</div>
                          <div className="kpi-label">Approved & Locked in SSR</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="kpi-card kpi-card-blue">
                          <div className="kpi-value">{kpis.total}</div>
                          <div className="kpi-label">Total Submissions</div>
                        </div>
                        <div className="kpi-card kpi-card-amber">
                          <div className="kpi-value">{kpis.underVerification}</div>
                          <div className="kpi-label">Under Verification</div>
                        </div>
                        <div className="kpi-card kpi-card-red">
                          <div className="kpi-value">{kpis.returned}</div>
                          <div className="kpi-label">Needs Revision</div>
                        </div>
                        <div className="kpi-card kpi-card-green">
                          <div className="kpi-value">{kpis.approved}</div>
                          <div className="kpi-label">Approved & Locked in SSR</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Primary Table tailored to role */}
                  <div className="table-card" style={{ marginTop: 24 }}>
                    <div className="table-card-header">
                      <div className="table-card-title">
                        {currentUser.role === 'Student' ? 'My Submitted Student Achievements' :
                         currentUser.role === 'Inspector' ? 'NAAC Accreditation Evidence Dossier (Read-Only Inspection)' :
                         currentUser.role === 'DeanHOD' ? 'Departmental Accreditation Records' :
                         currentUser.role === 'IQAC' ? 'Central Accreditation Evidence Register' :
                         currentUser.role === 'Admin' ? 'Institutional Master Records & User Governance' :
                         'My Faculty Accreditation Submissions'}
                      </div>
                      <div className="table-filters-group">
                        <select
                          className="select-filter"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          style={{ minWidth: 140 }}
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
                          style={{ minWidth: 140 }}
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
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDocs.length === 0 ? (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No records found</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>
                                  {currentUser.role === 'Student' ? 'Upload your certificate using "+ Submit Student Certificate".' : 'Submit new accreditation records using the "+ Upload Document" button.'}
                                </div>
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
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => setSelectedDocForModal(doc)}
                                    className="btn-action-view"
                                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                                  >
                                    {currentUser.role === 'Inspector' ? 'Inspect Evidence' : 'View'}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  VIEW: MY DOCUMENTS
                  ======================================================== */}
              {activeTab === 'documents' && (
                <div>
                  <div className="dashboard-header">
                    <div>
                      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {currentUser.role === 'Student' ? 'My Certificates & Achievements' : 'My Document Repository'}
                      </h1>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                        {currentUser.role === 'Student' ? 'Track personal hackathons, internships, and co-curricular submissions' : 'Manage personal submissions, draft entries, returned corrections, and approved records'}
                      </p>
                    </div>
                    <button className="primary-btn" onClick={() => setShowUploadModal(true)}>
                      <span>{currentUser.role === 'Student' ? '+ Submit Certificate' : '+ Create New Record'}</span>
                    </button>
                  </div>

                  <div className="table-card" style={{ marginTop: 20 }}>
                    <div className="table-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['ALL', 'Under Verification', 'Returned', 'Approved'].map(tab => (
                          <button
                            key={tab}
                            onClick={() => setMyDocsSubTab(tab)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: myDocsSubTab === tab ? '1px solid #2563eb' : '1px solid #e2e8f0',
                              background: myDocsSubTab === tab ? '#eff6ff' : '#fff',
                              color: myDocsSubTab === tab ? '#1d4ed8' : '#64748b',
                              fontWeight: myDocsSubTab === tab ? 700 : 500,
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                          >
                            {tab === 'ALL' ? 'All Records' : tab}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleExportCSV(filteredDocs, "My_Submissions_Export.csv")}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Export CSV
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                            <th style={{ padding: '12px 16px' }}>#</th>
                            <th style={{ padding: '12px 16px' }}>Title</th>
                            <th style={{ padding: '12px 16px' }}>Category</th>
                            <th style={{ padding: '12px 16px' }}>Submitted On</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Current Stage</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDocs
                            .filter(d => myDocsSubTab === 'ALL' || d.status === myDocsSubTab)
                            .map((doc, idx) => (
                              <tr key={doc.id || idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{doc.title}</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>{doc.category}</td>
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
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{doc.currentStage}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => setSelectedDocForModal(doc)}
                                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                                  >
                                    Inspect
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  VIEW: VERIFICATION QUEUE
                  ======================================================== */}
              {activeTab === 'queue' && (
                <div>
                  <div className="dashboard-header">
                    <div>
                      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Institutional Verification Queue</h1>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                        Review submitted evidence, authorize stage progression, and lock records into NAAC SSR dossier
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleExportCSV(documents.filter(d => d.status === 'Under Verification'), "Verification_Queue.csv")}
                        style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        Export Queue CSV
                      </button>
                      <button
                        className="primary-btn"
                        onClick={handleBatchApproveQueue}
                      >
                        <span>Batch Approve Queue</span>
                      </button>
                    </div>
                  </div>

                  <div className="table-card" style={{ marginTop: 20 }}>
                    <div className="table-responsive">
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                            <th style={{ padding: '12px 16px' }}>#</th>
                            <th style={{ padding: '12px 16px' }}>Record Title</th>
                            <th style={{ padding: '12px 16px' }}>Submitter</th>
                            <th style={{ padding: '12px 16px' }}>Department</th>
                            <th style={{ padding: '12px 16px' }}>Criterion</th>
                            <th style={{ padding: '12px 16px' }}>Evidence File</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.filter(d => {
                            if (d.status !== 'Under Verification') return false;
                            if (currentUser.role === 'DeanHOD') {
                              return d.currentStage === 'Dean/HOD' || d.currentStage === 'Faculty / HoD Review' || !d.currentStage || d.currentStage === 'Faculty';
                            }
                            if (currentUser.role === 'IQAC') {
                              return d.currentStage === 'IQAC' || !d.currentStage;
                            }
                            return true;
                          }).length === 0 ? (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Queue is completely clear!</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>All submitted accreditation records have been reviewed.</div>
                              </td>
                            </tr>
                          ) : (
                            documents.filter(d => {
                              if (d.status !== 'Under Verification') return false;
                              if (currentUser.role === 'DeanHOD') {
                                return d.currentStage === 'Dean/HOD' || d.currentStage === 'Faculty / HoD Review' || !d.currentStage || d.currentStage === 'Faculty';
                              }
                              if (currentUser.role === 'IQAC') {
                                return d.currentStage === 'IQAC' || !d.currentStage;
                              }
                              return true;
                            }).map((doc, idx) => (
                              <tr key={doc.id || idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{doc.title}</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>{doc.ownerName}</td>
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{doc.department}</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>{doc.naacCriterion}</td>
                                <td style={{ padding: '12px 16px', color: '#2563eb' }}>{doc.evidenceFile || 'evidence.pdf'}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: 6 }}>
                                    <button
                                      onClick={() => handleApproveRecord(doc.id)}
                                      style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleReturnRecord(doc.id)}
                                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #ef4444', background: '#fee2e2', color: '#dc2626', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                      Return
                                    </button>
                                    <button
                                      onClick={() => setSelectedDocForModal(doc)}
                                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                      Details
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  VIEW: DOCUMENT REPOSITORY
                  ======================================================== */}
              {activeTab === 'repository' && (
                <div>
                  <div className="dashboard-header">
                    <div>
                      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Accreditation Evidence Repository</h1>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                        Master verified register of immutable SSR evidence records locked for peer-review
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => window.print()}
                        style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        Print Register
                      </button>
                      <button
                        className="primary-btn"
                        onClick={() => handleExportCSV(documents.filter(d => d.status === 'Approved'), "NAAC_Accreditation_Register.csv")}
                      >
                        <span>Export Register (.CSV)</span>
                      </button>
                    </div>
                  </div>

                  <div className="table-card" style={{ marginTop: 20 }}>
                    <div className="table-responsive">
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                            <th style={{ padding: '12px 16px' }}>Record ID</th>
                            <th style={{ padding: '12px 16px' }}>Document Title</th>
                            <th style={{ padding: '12px 16px' }}>Criterion</th>
                            <th style={{ padding: '12px 16px' }}>Department</th>
                            <th style={{ padding: '12px 16px' }}>Certified Owner</th>
                            <th style={{ padding: '12px 16px' }}>Integrity Lock</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.filter(d => d.status === 'Approved').length === 0 ? (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No locked records yet</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>Approved records from the verification queue will appear here.</div>
                              </td>
                            </tr>
                          ) : (
                            documents.filter(d => d.status === 'Approved').map((doc, idx) => (
                              <tr key={doc.id || idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{doc.id}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{doc.title}</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>{doc.naacCriterion}</td>
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{doc.department}</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>{doc.ownerName}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                                    &bull; SSR Locked
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => setSelectedDocForModal(doc)}
                                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                                  >
                                    Inspect Evidence
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  VIEW: REPORTS & ANALYTICS
                  ======================================================== */}
              {activeTab === 'reports' && (
                <div>
                  <div className="dashboard-header">
                    <div>
                      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Accreditation Reports & Analytics Workspace</h1>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                        Criteria progress matrices, annual capacity development registers, and institutional SSR summaries
                      </p>
                    </div>

                    <button
                      className="primary-btn"
                      onClick={() => handleExportCSV(documents, "NAAC_Full_SSR_Data.csv")}
                    >
                      <span>Download Full NAAC Data (.CSV)</span>
                    </button>
                  </div>

                  <div className="kpi-cards-grid" style={{ marginTop: 20 }}>
                    <div className="kpi-card kpi-card-blue">
                      <div className="kpi-value">₹50,500</div>
                      <div className="kpi-label">Financial Support Disbursed</div>
                    </div>
                    <div className="kpi-card kpi-card-amber">
                      <div className="kpi-value">2.4 Days</div>
                      <div className="kpi-label">Avg Verification SLA</div>
                    </div>
                    <div className="kpi-card kpi-card-green">
                      <div className="kpi-value">5 National</div>
                      <div className="kpi-label">Awards & Recognitions</div>
                    </div>
                    <div className="kpi-card kpi-card-blue">
                      <div className="kpi-value">7 Criteria</div>
                      <div className="kpi-label">NAAC Indicators Covered</div>
                    </div>
                  </div>

                  <div className="table-card" style={{ marginTop: 24 }}>
                    <div className="table-card-header">
                      <div className="table-card-title">Accreditation Evidence Register (Criteria Breakdown)</div>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                            <th style={{ padding: '12px 16px' }}>Criterion / Metric</th>
                            <th style={{ padding: '12px 16px' }}>Evidence Nature</th>
                            <th style={{ padding: '12px 16px' }}>Total Records</th>
                            <th style={{ padding: '12px 16px' }}>Approved & Locked</th>
                            <th style={{ padding: '12px 16px' }}>Compliance Metric</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {NAAC_CRITERIA_METRICS.map((cm, idx) => (
                            <tr key={cm.code || idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{cm.name}</td>
                              <td style={{ padding: '12px 16px', color: '#475569' }}>{cm.focus}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 600 }}>{cm.count}</td>
                              <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 700 }}>{cm.approved} / {cm.count}</td>
                              <td style={{ padding: '12px 16px', color: '#64748b' }}>{cm.target}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button
                                  onClick={() => {
                                    setActiveTab('dashboard');
                                    showToast(`Navigated to dashboard records for ${cm.name}`, "info");
                                  }}
                                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                                >
                                  View Register
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  VIEW: AUDIT TRAIL
                  ======================================================== */}
              {activeTab === 'audit' && (
                <div>
                  <div className="dashboard-header">
                    <div>
                      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Immutable Audit Trail & Ledger</h1>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                        Cryptographically hashed, tamper-evident log of all submissions, approvals, returns, and portal logins
                      </p>
                    </div>

                    <button
                      className="btn-secondary"
                      onClick={() => handleExportCSV(auditLogs.length > 0 ? auditLogs : [
                        { id: "LOG-001", title: "Record Submission", category: "System", subCategory: "Audit", ownerName: currentUser.name, department: currentUser.department, status: "Verified" }
                      ], "Immutable_Audit_Ledger.csv")}
                      style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                    >
                      Export Audit Log (.CSV)
                    </button>
                  </div>

                  <div className="table-card" style={{ marginTop: 20 }}>
                    <div className="table-responsive">
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                            <th style={{ padding: '12px 16px' }}>Timestamp</th>
                            <th style={{ padding: '12px 16px' }}>Event Action</th>
                            <th style={{ padding: '12px 16px' }}>Actor / User</th>
                            <th style={{ padding: '12px 16px' }}>Target Record</th>
                            <th style={{ padding: '12px 16px' }}>SHA-256 Hash</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.length === 0 ? (
                            [
                              { time: "Today 10:42 AM", event: "DOCUMENT_SUBMITTED", actor: "Dr. Rajesh Sharma (Faculty)", target: "DOC-2026-001", hash: "9e107d9d372bb6826bd81d3542a419d6" },
                              { time: "Today 11:15 AM", event: "VERIFICATION_FORWARD", actor: "Prof. A. K. Verma (Dean)", target: "DOC-2026-001", hash: "e4d909c290d0fb1ca068ffaddf22cbd0" },
                              { time: "Today 12:00 PM", event: "SSR_LOCK_CERTIFIED", actor: "Dr. Sunita Rao (IQAC)", target: "DOC-2026-001", hash: "7c6a58f278061eb0d8b74681640a3f8a" },
                              { time: "Today 01:20 PM", event: "AUTHENTICATION_SUCCESS", actor: "Dr. Rajesh Sharma (Faculty)", target: "PORTAL_LOGIN", hash: "a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c" }
                            ].map((log, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{log.time}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{log.event}</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>{log.actor}</td>
                                <td style={{ padding: '12px 16px', color: '#2563eb' }}>{log.target}</td>
                                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{log.hash}</td>
                              </tr>
                            ))
                          ) : (
                            auditLogs.map((log, idx) => (
                              <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{log.timestamp || 'Today'}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{log.action}</td>
                                <td style={{ padding: '12px 16px', color: '#475569' }}>{log.user || log.performedBy}</td>
                                <td style={{ padding: '12px 16px', color: '#2563eb' }}>{log.documentId || log.details}</td>
                                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{log.hash || 'e3b0c44298fc1c149afbf4c8996fb924'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </main>
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          DOCUMENT DETAIL & INSPECTION MODAL
          ======================================================== */}
      {selectedDocForModal && (
        <div className="modal-overlay active" style={{ display: 'flex', zIndex: 99999 }}>
          <div className="modal-dialog" style={{ maxWidth: '640px', width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Accreditation Evidence Details</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Record ID: {selectedDocForModal.id}</div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedDocForModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>{selectedDocForModal.title}</h3>
                  <div style={{ fontSize: 13, color: '#475569' }}>{selectedDocForModal.category} &bull; {selectedDocForModal.subCategory || 'General'}</div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 700,
                  background: selectedDocForModal.status === 'Approved' ? '#dcfce7' : selectedDocForModal.status === 'Returned' ? '#fee2e2' : '#fef3c7',
                  color: selectedDocForModal.status === 'Approved' ? '#15803d' : selectedDocForModal.status === 'Returned' ? '#b91c1c' : '#b45309'
                }}>
                  {selectedDocForModal.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#f8fafc', padding: 14, borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Owner / Submitter:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedDocForModal.ownerName}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Department:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedDocForModal.department || 'Computer Science'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>NAAC Criterion:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedDocForModal.naacCriterion || 'Criteria 1'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Workflow Stage:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedDocForModal.currentStage}</div>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                    PDF
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{selectedDocForModal.evidenceFile || 'evidence_certificate.pdf'}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>256-bit SHA Certified &bull; 2.4 MB</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadEvidence(selectedDocForModal.evidenceFile)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  Download Evidence
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Print Record
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  {['DeanHOD', 'IQAC', 'Admin'].includes(currentUser.role) && selectedDocForModal.status !== 'Approved' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReturnRecord(selectedDocForModal.id)}
                        style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #ef4444', background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                      >
                        Return for Correction
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveRecord(selectedDocForModal.id)}
                        style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                      >
                        Approve Record
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDocForModal(null)}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          UPLOAD DOCUMENT MODAL
          ======================================================== */}
      {showUploadModal && (
        <div className="modal-overlay active" style={{ display: 'flex', zIndex: 99999 }}>
          <div className="modal-dialog" style={{ maxWidth: '640px', width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div className="modal-title" style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                {currentUser.role === 'Student' ? 'Submit Student Achievement Certificate' : 'Upload Accreditation Document'}
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUploadSubmit(false); }} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  {currentUser.role === 'Student' ? 'Achievement Title / Event Name' : 'Document Title'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className="login-input"
                  placeholder={currentUser.role === 'Student' ? 'e.g. 1st Prize in National Smart India Hackathon 2026' : 'e.g. Workshop on Cloud Architecture & AI (2026)'}
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
                    {currentUser.role === 'Student' ? (
                      <>
                        <option value="Student">Student Co-Curricular</option>
                        <option value="Student">Technical Hackathon</option>
                        <option value="Student">Industry Internship</option>
                        <option value="Student">Research Publication</option>
                        <option value="Student">Sports & Cultural Award</option>
                      </>
                    ) : (
                      <>
                        <option value="Academic">Academic</option>
                        <option value="Research">Research</option>
                        <option value="Co-curricular">Co-curricular</option>
                        <option value="NAAC">NAAC</option>
                        <option value="Faculty">Faculty Publication</option>
                        <option value="Student">Student Achievement</option>
                      </>
                    )}
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
                  type="button"
                  onClick={() => handleUploadSubmit(true)}
                  style={{ padding: '9px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}
                >
                  Save as Draft
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
