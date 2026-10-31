import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import './styles.css';

export default function App() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState('Faculty');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getState();
      setState(data);
    } catch (e) {
      console.error('Error fetching portal data:', e);
      showToast('Backend offline or connecting to Neon PostgreSQL...', 'info');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filteredDocs = (state?.documents || []).filter(doc => {
    if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && doc.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return doc.title.toLowerCase().includes(q) || doc.ownerName?.toLowerCase().includes(q);
    }
    return true;
  });

  const kpis = state?.kpis || {
    total: filteredDocs.length,
    underVerification: filteredDocs.filter(d => d.status === 'Under Verification').length,
    returned: filteredDocs.filter(d => d.status === 'Returned').length,
    approved: filteredDocs.filter(d => d.status === 'Approved').length
  };

  return (
    <div className="app-layout">
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          background: toast.type === 'danger' ? '#ef4444' : '#2563eb',
          color: '#fff', padding: '12px 20px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
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

          <nav className="sidebar-nav">
            <a className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <span>Dashboard</span>
            </a>
            <a className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
              <span>My Documents</span>
              <span className="nav-badge">{state?.documents?.length || 0}</span>
            </a>
            <a className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => setActiveTab('queue')}>
              <span>Verification Queue</span>
              <span className="nav-badge danger">{kpis.underVerification}</span>
            </a>
            <a className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
              <span>Audit Trail</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="top-navbar">
          <div className="top-navbar-left">
            <div className="search-box-container">
              <input
                type="text"
                className="global-search-input"
                placeholder="Search documents, criteria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="navbar-actions">
            <div className="role-switcher-badge" onClick={() => {
              const roles = ['Faculty', 'DeanHOD', 'IQAC', 'Admin', 'Inspector'];
              const nextIdx = (roles.indexOf(currentRole) + 1) % roles.length;
              setCurrentRole(roles[nextIdx]);
              showToast(`Role switched to ${roles[nextIdx]}`, 'info');
            }}>
              <span className="role-tag-pill">Role:</span>
              <span>{currentRole}</span>
            </div>
          </div>
        </header>

        <main className="main-content" style={{ padding: 24 }}>
          {/* Header */}
          <div className="dashboard-header">
            <div>
              <h1>Welcome, {currentRole}</h1>
              <p>Connected to Spring Boot REST Backend & Neon PostgreSQL Database</p>
            </div>
          </div>

          {/* 4 KPI Cards */}
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
              <div className="kpi-label">Approved & Locked</div>
            </div>
          </div>

          {/* Table */}
          <div className="table-card" style={{ marginTop: 24 }}>
            <div className="table-card-header">
              <div className="table-card-title">Accreditation Evidence Records</div>
              <div className="table-filters-group">
                <select
                  className="select-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  <option value="Academic">Academic</option>
                  <option value="Co-curricular">Co-curricular</option>
                  <option value="Research">Research</option>
                  <option value="NAAC">NAAC</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Student">Student</option>
                </select>

                <select
                  className="select-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="Under Verification">Under Verification</option>
                  <option value="Returned">Returned</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Document Title</th>
                    <th>Category</th>
                    <th>Owner / Submitter</th>
                    <th>Submitted On</th>
                    <th>Status</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc, idx) => (
                    <tr key={doc.id}>
                      <td>{doc.displayNum || idx + 1}</td>
                      <td>
                        <strong>{doc.title}</strong>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{doc.id}</div>
                      </td>
                      <td>{doc.category}</td>
                      <td>{doc.ownerName}</td>
                      <td>{doc.submittedOn}</td>
                      <td>
                        <span className={`status-pill status-${doc.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td>{doc.currentStage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

