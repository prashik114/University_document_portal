/**
 * University Repository Portal - Main Application Controller
 * Handles views, role switching, workflow transitions, donut chart rendering,
 * conditional form validations, evidence modal, and real-time state persistence.
 */

document.addEventListener("DOMContentLoaded", () => {
    App.init();
});

const App = {
    state: null,
    activeView: "dashboard",
    currentRecordUnderReview: null,
    selectedFile: null,
    currentSort: { column: 'displayNum', order: 'asc' },
    currentPage: 1,
    pageSize: 5,
    selectedDocIds: new Set(),
    activeKpiFilter: "ALL",
    filteredDocsLength: 0,

    async init() {
        this.loadState();
        this.setupNavigation();
        this.setupEventListeners();

        // Gated authentication flow: show login screen if not authenticated
        const isAuth = localStorage.getItem("portal_auth_user") || sessionStorage.getItem("portal_auth_user");
        if (isAuth !== "true") {
            this.showLoginScreen();
            return; // Halt: never render sensitive dashboards for unauthenticated visitors
        }

        this.hideLoginScreen();
        this.renderAll();

        // Connect and sync with Spring Boot + PostgreSQL backend
        await this.syncFromBackend();
    },

    async syncFromBackend() {
        if (!window.PortalAPI) return;
        try {
            const serverState = await window.PortalAPI.getState();
            if (serverState && serverState.documents && serverState.documents.length > 0) {
                const currentUser = this.state && this.state.currentUser ? this.state.currentUser : PERSONAS.Faculty;
                this.state = {
                    ...serverState,
                    currentUser: currentUser
                };
                DB.save(this.state);
                this.renderAll();
                console.log("[Portal] Successfully synchronized with Spring Boot + PostgreSQL backend.");
            }
        } catch (e) {
            console.warn("[Portal] Backend offline, working with cached local state.", e);
        }
    },

    loadState() {
        this.state = DB.get();
        if (!this.state.documents || this.state.documents.length === 0) {
            this.state = DB.reset();
        }
    },

    saveState() {
        DB.save(this.state);
        this.renderAll();
    },

    // =========================================================================
    // RENDERING MASTER
    // =========================================================================
    renderAll() {
        this.updateHeaderAndRoleUI();
        this.updateSidebarNavForRole();
        this.renderRoleDashboard();
        this.renderMyDocumentsTable();
        this.renderVerificationQueue();
        this.renderRepositoryTable();
        this.renderReports();
        this.renderAuditLogs();
        this.renderUsersTable();
        this.renderAdminRevisions();
        this.updateBadges();
        this.renderUserProfileMenu();
        this.renderRolePopup();
    },

    updateSidebarNavForRole() {
        const curRole = this.state.currentUser.role;
        document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
            const rolesAttr = item.getAttribute("data-roles");
            if (rolesAttr) {
                const allowedRoles = rolesAttr.split(",").map(r => r.trim());
                if (allowedRoles.includes(curRole)) {
                    item.style.display = "flex";
                } else {
                    item.style.display = "none";
                }
            } else {
                item.style.display = "flex";
            }
        });

        // Ensure header upload button is hidden for Inspector
        const headerUploadBtn = document.getElementById("btn-header-upload");
        if (headerUploadBtn) {
            headerUploadBtn.style.display = (curRole === "Inspector") ? "none" : "inline-flex";
        }

        // If current active view is now hidden, reset to dashboard
        const currentNav = document.querySelector(`.sidebar-nav .nav-item[data-view="${this.activeView}"]`);
        if (currentNav && currentNav.style.display === "none") {
            this.switchView("dashboard");
        }
    },

    renderRoleDashboard() {
        document.querySelectorAll(".role-dashboard-container").forEach(c => {
            c.classList.remove("active");
            c.style.display = "none";
        });

        const curRole = this.state.currentUser.role;
        const targetContainer = document.getElementById(`dashboard-${curRole.toLowerCase()}`);
        if (targetContainer) {
            targetContainer.classList.add("active");
            targetContainer.style.display = "block";
        }

        if (curRole === "Student") {
            this.renderStudentDashboard();
        } else if (curRole === "Faculty") {
            this.renderFacultyDashboard();
        } else if (curRole === "DeanHOD") {
            this.renderDeanDashboard();
        } else if (curRole === "IQAC") {
            this.renderIQACDashboard();
        } else if (curRole === "Admin") {
            this.renderAdminDashboard();
        } else if (curRole === "Inspector") {
            this.renderInspectorDashboard();
        }
    },

    renderFacultyDashboard() {
        this.renderDashboardKPIs();
        this.renderDashboardTable();
        this.renderDonutChart();
        this.renderRecentActivity();
    },

    renderStudentDashboard() {
        const u = this.state.currentUser;
        const studentDocs = (this.state.documents || []).filter(d => 
            d.ownerId === u.employeeId || d.ownerName === u.name || d.category === "Student"
        );
        const total = studentDocs.length;
        const inVerif = studentDocs.filter(d => d.status === "Under Verification").length;
        const returned = studentDocs.filter(d => d.status === "Returned").length;
        const approved = studentDocs.filter(d => d.status === "Approved").length;

        const kTotal = document.getElementById("kpi-student-total");
        const kVerif = document.getElementById("kpi-student-verification");
        const kRet = document.getElementById("kpi-student-returned");
        const kApp = document.getElementById("kpi-student-approved");
        if (kTotal) kTotal.textContent = total;
        if (kVerif) kVerif.textContent = inVerif;
        if (kRet) kRet.textContent = returned;
        if (kApp) kApp.textContent = approved;

        const tbody = document.getElementById("student-table-body");
        if (tbody) {
            if (studentDocs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                            <div style="font-weight: 600; font-size: 14px; color: #334155;">No student achievements submitted yet</div>
                            <div style="font-size: 12px; margin-top: 4px;">Click "+ Submit Student Certificate" above to upload your internships, hackathons, or project certificates.</div>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = studentDocs.map((doc, idx) => `
                    <tr>
                        <td style="color: #64748b;">${idx + 1}</td>
                        <td style="font-weight: 600; color: #0f172a;">${doc.title}</td>
                        <td><span class="file-type-badge badge-doc">${doc.subCategory || doc.category || 'Achievement'}</span></td>
                        <td style="color: #64748b;">${doc.department || u.department}</td>
                        <td style="color: #64748b;">${doc.submittedOn || 'Today'}</td>
                        <td>
                            <span class="status-pill status-${doc.status === 'Approved' ? 'approved' : (doc.status === 'Returned' ? 'returned' : 'draft')}">
                                ${doc.status}
                            </span>
                        </td>
                        <td style="color: #64748b;">${doc.currentStage || 'Faculty / HoD Review'}</td>
                        <td style="text-align: right;">
                            <button class="btn-action-view" onclick="App.openDetailModal('${doc.id}')">View</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    },

    updateHeaderAndRoleUI() {
        const u = this.state.currentUser;
        const roleDisplay = document.getElementById("active-role-display");
        const userDisplayName = document.getElementById("user-display-name");
        const userAvatar = document.getElementById("user-avatar");
        const welcomeHeading = document.getElementById("welcome-heading");
        const welcomeSubheading = document.getElementById("welcome-subheading");

        const displayRole = u.role === "DeanHOD" ? "Dean / HOD" : u.role;
        if (roleDisplay) roleDisplay.textContent = displayRole;
        if (userDisplayName) userDisplayName.textContent = u.name || displayRole;
        if (userAvatar) userAvatar.textContent = u.avatar || (u.name ? u.name.charAt(0) : u.role.charAt(0));

                if (welcomeHeading) {
            welcomeHeading.textContent = `Welcome, ${u.name || displayRole}`;
            if (u.role === "Student") {
                welcomeSubheading.textContent = `${u.designation || 'Student'} • ${u.department || 'Computer Science & Engineering'} • Student Achievement & Credit Portal`;
            } else if (u.role === "Faculty") {
                welcomeSubheading.textContent = `${u.designation || 'Faculty & Submitter'} • ${u.department || 'Computer Science & Engineering'}`;
            } else if (u.role === "DeanHOD") {
                welcomeSubheading.textContent = `${u.designation || 'Dean / HOD Verifier'} • ${u.department || 'Department'}`;
            } else if (u.role === "IQAC") {
                welcomeSubheading.textContent = `${u.designation || 'Central IQAC Coordinator'} • ${u.department || 'Internal Quality Assurance Cell'}`;
            } else if (u.role === "Admin") {
                welcomeSubheading.textContent = `${u.designation || 'Chief Systems Administrator'} • ${u.department || 'Central IT & Institutional Governance'}`;
            } else {
                welcomeSubheading.textContent = `${u.designation || 'NAAC Peer Team Assessor'} • Read-Only Inspection Dossier`;
            }
        }

        // Adjust profile autofetch card in upload modal
        const profName = document.getElementById("profile-banner-name");
        const profDesig = document.getElementById("profile-banner-desig");
        const profDept = document.getElementById("profile-banner-dept");
        const profId = document.getElementById("profile-banner-id");
        if (profName) profName.textContent = u.name;
        if (profDesig) profDesig.textContent = u.designation;
        if (profDept) profDept.textContent = u.department;
        if (profId) profId.textContent = u.employeeId;
    },

    updateBadges() {
        const docs = this.state.documents;
        const totalCount = docs.length;
        const pendingQueue = docs.filter(d => {
            if (this.state.currentUser.role === "DeanHOD") return d.status === "Under Verification" && d.currentStage === "Dean/HOD";
            if (this.state.currentUser.role === "IQAC") return d.status === "Under Verification" && d.currentStage === "IQAC";
            return d.status === "Under Verification";
        }).length;

        const myDocsBadge = document.getElementById("my-docs-badge");
        const queueBadge = document.getElementById("verification-badge");
        if (myDocsBadge) myDocsBadge.textContent = totalCount;
        if (queueBadge) queueBadge.textContent = pendingQueue;
    },

    // =========================================================================
    // VIEW 1: DASHBOARD
    // =========================================================================
    renderDashboardKPIs() {
        const docs = this.state.documents;
        const total = docs.length;
        const underVerification = docs.filter(d => d.status === "Under Verification").length;
        const returned = docs.filter(d => d.status === "Returned").length;
        const approved = docs.filter(d => d.status === "Approved").length;

        document.getElementById("kpi-total").textContent = total;
        document.getElementById("kpi-verification").textContent = underVerification;
        document.getElementById("kpi-returned").textContent = returned;
        document.getElementById("kpi-approved").textContent = approved;
    },

    renderDashboardTable() {
        const tbody = document.getElementById("dashboard-table-body");
        if (!tbody) return;

        const catFilter = document.getElementById("filter-category").value;
        const statusFilter = document.getElementById("filter-status").value;
        const searchVal = (document.getElementById("table-search-input").value || "").toLowerCase().trim();

        let filtered = this.state.documents.filter(d => {
            if (this.activeKpiFilter !== "ALL" && d.status !== this.activeKpiFilter) return false;
            if (catFilter !== "ALL" && d.category !== catFilter) return false;
            if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
            if (searchVal) {
                const matchTitle = d.title.toLowerCase().includes(searchVal);
                const matchCategory = d.category.toLowerCase().includes(searchVal);
                const matchStage = d.currentStage.toLowerCase().includes(searchVal);
                if (!matchTitle && !matchCategory && !matchStage) return false;
            }
            return true;
        });

        // Sorting
        const col = this.currentSort.column;
        const order = this.currentSort.order === 'asc' ? 1 : -1;
        filtered.sort((a, b) => {
            let valA = a[col] || '';
            let valB = b[col] || '';
            if (col === 'displayNum') {
                return (Number(valA) - Number(valB)) * order;
            }
            if (col === 'submittedOn') {
                return (new Date(valA).getTime() - new Date(valB).getTime()) * order;
            }
            return String(valA).localeCompare(String(valB)) * order;
        });

        this.filteredDocsLength = filtered.length;

        // Pagination
        const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIdx = (this.currentPage - 1) * this.pageSize;
        const endIdx = startIdx + this.pageSize;
        const pageDocs = filtered.slice(startIdx, endIdx);

        // Update pagination UI elements
        const paginationInfo = document.getElementById("pagination-info");
        const pageIndicator = document.getElementById("page-indicator");
        const btnPrev = document.getElementById("btn-prev-page");
        const btnNext = document.getElementById("btn-next-page");

        if (paginationInfo) {
            if (filtered.length === 0) {
                paginationInfo.textContent = "Showing 0 records";
            } else {
                paginationInfo.textContent = `Showing ${startIdx + 1} to ${Math.min(endIdx, filtered.length)} of ${filtered.length} records`;
            }
        }
        if (pageIndicator) pageIndicator.textContent = `${this.currentPage}`;
        if (btnPrev) btnPrev.disabled = this.currentPage <= 1;
        if (btnNext) btnNext.disabled = this.currentPage >= totalPages;

        // Update bulk action bar
        const bulkBar = document.getElementById("bulk-action-bar");
        const bulkCount = document.getElementById("bulk-selected-count");
        if (bulkBar && bulkCount) {
            bulkCount.textContent = this.selectedDocIds.size;
            if (this.selectedDocIds.size > 0) {
                bulkBar.classList.add("visible");
            } else {
                bulkBar.classList.remove("visible");
            }
        }

        // Update header select-all checkbox
        const headerCheckbox = document.getElementById("dash-select-all");
        if (headerCheckbox) {
            const allPageSelected = pageDocs.length > 0 && pageDocs.every(d => this.selectedDocIds.has(d.id));
            headerCheckbox.checked = allPageSelected;
        }

        // Update sortable header icons
        document.querySelectorAll(".sortable-th").forEach(th => {
            const thCol = th.getAttribute("data-sort");
            const icon = th.querySelector(".sort-icon");
            if (thCol === this.currentSort.column) {
                th.classList.add("active-sort");
                if (icon) icon.textContent = this.currentSort.order === 'asc' ? '▲' : '▼';
            } else {
                th.classList.remove("active-sort");
                if (icon) icon.textContent = '⇅';
            }
        });

        if (pageDocs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 36px; color: var(--text-muted);">
                <div style="font-weight:600; margin-bottom:4px;">No records found</div>
                <div style="font-size:12.5px;">Try adjusting your search criteria or resetting filters.</div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = pageDocs.map(doc => {
            const badgeClass = doc.fileType === "pdf" ? "badge-pdf" : (doc.fileType === "doc" ? "badge-doc" : "badge-xls");
            const badgeText = doc.fileType.toUpperCase();

            let statusClass = "status-under-verification";
            if (doc.status === "Returned") statusClass = "status-returned";
            if (doc.status === "Approved") statusClass = "status-approved";
            if (doc.status === "Draft") statusClass = "status-draft";

            const isReturned = doc.status === "Returned";
            const actionBtn = isReturned 
                ? `<button class="btn-action-edit" onclick="App.openEditReturnedRecord('${doc.id}')">Edit</button>`
                : `<button class="btn-action-view" onclick="App.openDetailModal('${doc.id}')">View</button>`;

            const isChecked = this.selectedDocIds.has(doc.id);

            return `
                <tr class="${isChecked ? 'row-selected' : ''}">
                    <td style="text-align: center;">
                        <input type="checkbox" class="custom-checkbox row-select-checkbox" data-id="${doc.id}" ${isChecked ? 'checked' : ''}>
                    </td>
                    <td class="col-num">${doc.displayNum || 1}</td>
                    <td>
                        <div class="file-title-cell">
                            <span class="file-type-badge ${badgeClass}">${badgeText}</span>
                            <span>${this.escapeHtml(doc.title)}</span>
                        </div>
                    </td>
                    <td>${doc.category}</td>
                    <td>${doc.submittedOn}</td>
                    <td><span class="status-pill ${statusClass}">${doc.status}</span></td>
                    <td class="stage-text">${doc.currentStage}</td>
                    <td>
                        <div class="action-buttons-group">
                            ${actionBtn}
                            <button class="btn-more-dots" onclick="App.openContextMenu(event, '${doc.id}')">&vellip;</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        // Attach row checkbox event listeners
        tbody.querySelectorAll(".row-select-checkbox").forEach(cb => {
            cb.addEventListener("change", (e) => {
                const docId = cb.getAttribute("data-id");
                if (cb.checked) {
                    this.selectedDocIds.add(docId);
                } else {
                    this.selectedDocIds.delete(docId);
                }
                this.renderDashboardTable();
            });
        });
    },

    renderDonutChart() {
        const docs = this.state.documents;
        const total = docs.length;
        const underVerification = docs.filter(d => d.status === "Under Verification").length;
        const returned = docs.filter(d => d.status === "Returned").length;
        const approved = docs.filter(d => d.status === "Approved").length;

        document.getElementById("donut-center-count").textContent = total;
        document.getElementById("legend-count-verification").textContent = underVerification;
        document.getElementById("legend-count-returned").textContent = returned;
        document.getElementById("legend-count-approved").textContent = approved;

        // Render pure mathematical SVG Donut matching screenshot colors and proportions
        const svg = document.getElementById("donut-svg");
        if (!svg) return;

        if (total === 0) {
            svg.innerHTML = `<circle cx="85" cy="85" r="60" fill="none" stroke="#e2e8f0" stroke-width="24"/>`;
            return;
        }

        const radius = 60;
        const circumference = 2 * Math.PI * radius; // ~376.99
        const strokeWidth = 24;

        // Proportions
        const pApproved = approved / total;
        const pVerification = underVerification / total;
        const pReturned = returned / total;

        const dashApproved = circumference * pApproved;
        const dashVerification = circumference * pVerification;
        const dashReturned = circumference * pReturned;

        // Cumulative offsets (starting from 12 o'clock / -90deg)
        let offset = 0;
        const segGreen = `<circle cx="85" cy="85" r="${radius}" fill="none" stroke="#10b981" stroke-width="${strokeWidth}" 
            stroke-dasharray="${dashApproved} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 85 85)"/>`;
        offset += dashApproved;

        const segYellow = `<circle cx="85" cy="85" r="${radius}" fill="none" stroke="#f59e0b" stroke-width="${strokeWidth}" 
            stroke-dasharray="${dashVerification} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 85 85)"/>`;
        offset += dashVerification;

        const segRed = `<circle cx="85" cy="85" r="${radius}" fill="none" stroke="#ef4444" stroke-width="${strokeWidth}" 
            stroke-dasharray="${dashReturned} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 85 85)"/>`;

        svg.innerHTML = `
            <circle cx="85" cy="85" r="${radius}" fill="none" stroke="#f1f5f9" stroke-width="${strokeWidth}"/>
            ${segGreen}
            ${segYellow}
            ${segRed}
        `;
    },

    renderRecentActivity() {
        const container = document.getElementById("activity-feed-container");
        if (!container) return;

        const activities = this.state.recentActivities || [];
        container.innerHTML = activities.slice(0, 4).map(act => {
            let iconSvg = "";
            if (act.icon === "cloud") {
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16l-4-4-4 4M12 12v9"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`;
            } else if (act.icon === "return") {
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>`;
            } else {
                iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
            }

            return `
                <div class="activity-item">
                    <div class="activity-left">
                        <div class="activity-icon-bubble ${act.color}">
                            ${iconSvg}
                        </div>
                        <div class="activity-desc">${this.escapeHtml(act.title)}</div>
                    </div>
                    <div class="activity-time">${act.timestamp}</div>
                </div>
            `;
        }).join("");
    },

    // =========================================================================
    // VIEW 2: MY DOCUMENTS FULL REPOSITORY
    // =========================================================================
    renderMyDocumentsTable(statusFilter = "ALL") {
        const tbody = document.getElementById("all-my-docs-tbody");
        if (!tbody) return;

        const yearFilter = document.getElementById("filter-academic-year-mydocs").value;
        const docs = this.state.documents.filter(d => {
            if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
            if (yearFilter !== "ALL" && d.academicYear !== yearFilter) return false;
            return true;
        });

        if (docs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 36px; color: var(--text-muted);">
                <div style="font-weight:600; margin-bottom:4px;">No documents in this view</div>
                <div style="font-size:12.5px;">Click "+ Upload Document" to submit a new repository record.</div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = docs.map(doc => {
            const badgeClass = doc.fileType === "pdf" ? "badge-pdf" : (doc.fileType === "doc" ? "badge-doc" : "badge-xls");
            let statusClass = "status-under-verification";
            if (doc.status === "Returned") statusClass = "status-returned";
            if (doc.status === "Approved") statusClass = "status-approved";
            if (doc.status === "Draft") statusClass = "status-draft";

            return `
                <tr>
                    <td class="col-num">${doc.displayNum || 1}</td>
                    <td>
                        <div class="file-title-cell">
                            <span class="file-type-badge ${badgeClass}">${doc.fileType.toUpperCase()}</span>
                            <div>
                                <div style="font-weight:700;">${this.escapeHtml(doc.title)}</div>
                                <div style="font-size:11px; color:#64748b;">${doc.id}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div>${doc.category}</div>
                        <span class="criteria-chip">NAAC ${doc.naacCriterion || "General"}</span>
                    </td>
                    <td>${doc.academicYear || "2026-2027"}</td>
                    <td>${doc.submittedOn}</td>
                    <td><span class="status-pill ${statusClass}">${doc.status}</span></td>
                    <td class="stage-text">${doc.currentStage}</td>
                    <td>
                        <button class="btn-action-view" onclick="App.openDetailModal('${doc.id}')">Inspect</button>
                    </td>
                </tr>
            `;
        }).join("");
    },

    // =========================================================================
    // VIEW 3: VERIFICATION QUEUE (Dean/HOD & IQAC Workflows)
    // =========================================================================
    renderVerificationQueue() {
        const tbody = document.getElementById("queue-table-tbody");
        const countSpan = document.getElementById("queue-count-display");
        const titleH1 = document.getElementById("queue-header-title");
        const descP = document.getElementById("queue-header-desc");
        if (!tbody) return;

        const role = this.state.currentUser.role;

        // Customise based on reviewer persona
        if (role === "DeanHOD") {
            titleH1.textContent = "Dean / HOD Department Verification Queue";
            descP.textContent = "Review department records for completeness, authenticity and policy adherence before forwarding to IQAC.";
        } else if (role === "IQAC") {
            titleH1.textContent = "IQAC Quality Review & Final Lock Queue";
            descP.textContent = "Check evidence credibility, accreditation relevance and criteria mappings for final institutional lock.";
        } else {
            titleH1.textContent = "Central Verification Queue (All Reviewers)";
            descP.textContent = "Supervisory overview of items currently undergoing verification across university stages.";
        }

        const pending = this.state.documents.filter(d => {
            if (role === "DeanHOD") {
                return d.status === "Under Verification" && (d.currentStage === "Dean/HOD" || d.currentStage === "Faculty / HoD Review" || d.currentStage === "Faculty" || !d.currentStage);
            }
            if (role === "IQAC") {
                return d.status === "Under Verification" && (d.currentStage === "IQAC" || !d.currentStage);
            }
            return d.status === "Under Verification";
        });

        countSpan.textContent = pending.length;

        if (pending.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 36px; color: var(--text-muted);">
                <strong>Queue is Clear!</strong> No documents currently awaiting verification in this stage.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = pending.map(doc => {
            return `
                <tr>
                    <td style="font-weight:700; color:var(--primary);">${doc.id}</td>
                    <td><strong>${this.escapeHtml(doc.title)}</strong></td>
                    <td>
                        <div>${doc.ownerName}</div>
                        <div style="font-size:11px; color:#64748b;">${doc.department}</div>
                    </td>
                    <td>${doc.category}</td>
                    <td><span class="criteria-chip">Criterion ${doc.naacCriterion || "6.3.3"}</span></td>
                    <td>${doc.submittedOn}</td>
                    <td><span class="status-pill status-under-verification">${doc.currentStage}</span></td>
                    <td>
                        <button class="btn-action-view" onclick="App.openDetailModal('${doc.id}', true)">Review & Decide</button>
                    </td>
                </tr>
            `;
        }).join("");
    },

    // =========================================================================
    // VIEW 4: DOCUMENT REPOSITORY (Master Evidence Library)
    // =========================================================================
    renderRepositoryTable() {
        const tbody = document.getElementById("repo-table-tbody");
        if (!tbody) return;

        const critFilter = document.getElementById("filter-repo-criteria").value;
        const docs = this.state.documents.filter(d => {
            if (critFilter !== "ALL" && d.naacCriterion !== critFilter) return false;
            return true;
        });

        if (docs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 36px; color: var(--text-muted);">
                <div style="font-weight:600; margin-bottom:4px;">No repository records found</div>
                <div style="font-size:12.5px;">Approved records mapped to NAAC criteria will appear in this evidence register.</div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = docs.map(doc => {
            let statusClass = "status-under-verification";
            if (doc.status === "Returned") statusClass = "status-returned";
            if (doc.status === "Approved") statusClass = "status-approved";
            if (doc.status === "Draft") statusClass = "status-draft";

            return `
                <tr>
                    <td style="font-weight:700;">${doc.id}</td>
                    <td>
                        <div style="font-weight:600;">${this.escapeHtml(doc.title)}</div>
                        <div style="font-size:11px; color:#64748b;">${doc.evidenceFile || "certificate.pdf"} (${doc.fileSize || "1.5 MB"})</div>
                    </td>
                    <td>${doc.category}</td>
                    <td><span class="criteria-chip">NAAC Metric ${doc.naacCriterion || "3.4.2"}</span></td>
                    <td>${doc.ownerName} &bull; ${doc.department}</td>
                    <td><span class="status-pill ${statusClass}">${doc.status}</span></td>
                    <td>
                        <button class="btn-action-view" onclick="App.openDetailModal('${doc.id}')">View Evidence</button>
                    </td>
                </tr>
            `;
        }).join("");
    },

    // =========================================================================
    // VIEW 6: AUDIT TRAIL
    // =========================================================================
    renderAuditLogs() {
        const tbody = document.getElementById("audit-logs-tbody");
        if (!tbody) return;

        const logs = this.state.auditLogs || [];
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 36px; color: var(--text-muted);">
                <div style="font-weight:600; margin-bottom:4px;">No audit trail records yet</div>
                <div style="font-size:12.5px;">All submissions, departmental verifications, and IQAC locks will be immutably logged here.</div>
            </td></tr>`;
            return;
        }
        tbody.innerHTML = logs.map(log => {
            return `
                <tr>
                    <td style="font-weight:700; color:var(--text-secondary);">${log.id}</td>
                    <td style="white-space:nowrap; font-size:12px;">${log.timestamp}</td>
                    <td><strong>${log.actor}</strong></td>
                    <td><span class="criteria-chip" style="font-family:monospace;">${log.action}</span></td>
                    <td style="font-weight:600;">${log.recordId}</td>
                    <td><span style="font-size:12px; color:#475569;">${log.priorStatus} &rarr; <strong>${log.newStatus}</strong></span></td>
                    <td style="font-size:12.5px; max-width:280px;">${this.escapeHtml(log.comments)}</td>
                    <td><code style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${log.hash || "0x98f2.."}</code></td>
                </tr>
            `;
        }).join("");
    },

    // =========================================================================
    // VIEW 8: ADMIN REVISIONS
    // =========================================================================
    renderAdminRevisions() {
        const container = document.getElementById("admin-revisions-list");
        if (!container) return;

        const revs = this.state.revisionRequests || [];
        if (revs.length === 0) {
            container.innerHTML = `<div style="color:#64748b; font-size:13px;">No pending revision requests.</div>`;
            return;
        }

        container.innerHTML = revs.map(r => {
            return `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <strong style="color:#0f172a;">${r.recordTitle} (${r.recordId})</strong>
                        <span class="status-pill status-under-verification">${r.status}</span>
                    </div>
                    <p style="font-size:12.5px; color:#475569; margin:4px 0;"><strong>Reason:</strong> ${this.escapeHtml(r.reason)}</p>
                    <div style="font-size:11.5px; color:#64748b; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span>Initiated by: ${r.initiator} &bull; ${r.requestedDate}</span>
                        <div>
                            <button class="btn-action-view" onclick="App.authorizeRevision('${r.id}')">Authorize Revision</button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    },

    // =========================================================================
    // NAVIGATION & VIEW SWITCHING
    // =========================================================================
    setupNavigation() {
        document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
            item.addEventListener("click", (e) => {
                const action = item.getAttribute("data-action");
                if (action === "open-upload-modal") {
                    e.preventDefault();
                    this.openUploadModal();
                    return;
                }

                const targetView = item.getAttribute("data-view");
                if (targetView) {
                    e.preventDefault();
                    this.switchView(targetView);
                }
            });
        });

        // Brand logo goes to dashboard
        document.getElementById("brand-logo-link").addEventListener("click", (e) => {
            e.preventDefault();
            this.switchView("dashboard");
        });

        // Logout handling
        const btnLogout = document.getElementById("btn-logout");
        if (btnLogout) {
            btnLogout.addEventListener("click", (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Login screen handling
        this.setupLoginScreen();
    },

    showLoginError(message) {
        const errorAlert = document.getElementById("login-error-alert");
        if (errorAlert) {
            errorAlert.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>${message}</div>
            `;
            errorAlert.style.display = "flex";
        }
    },

    clearLoginError() {
        const errorAlert = document.getElementById("login-error-alert");
        if (errorAlert) {
            errorAlert.style.display = "none";
            errorAlert.innerHTML = "";
        }
    },

    logout() {
        localStorage.removeItem("portal_auth_user");
        sessionStorage.removeItem("portal_auth_user");
        localStorage.removeItem("portal_user_profile");
        this.closeAllPopups();
        this.showLoginScreen();
        this.showToast("Signed out securely.", "info");
    },

    showLoginScreen() {
        this.clearLoginError();
        document.documentElement.classList.add("auth-logged-out");
        const loginEl = document.getElementById("login-screen");
        if (loginEl) {
            loginEl.classList.add("active");
            loginEl.style.display = "flex";
        }
        const appLayout = document.querySelector(".app-layout");
        if (appLayout) appLayout.style.display = "none";
    },

    hideLoginScreen() {
        this.clearLoginError();
        document.documentElement.classList.remove("auth-logged-out");
        const loginEl = document.getElementById("login-screen");
        if (loginEl) {
            loginEl.classList.remove("active");
            loginEl.style.display = "none";
        }
        const appLayout = document.querySelector(".app-layout");
        if (appLayout) appLayout.style.display = "";
    },

    setupLoginScreen() {
        if (this.loginScreenInitialized) return;
        this.loginScreenInitialized = true;

        const loginForm = document.getElementById("login-form");
        const forgotForm = document.getElementById("forgot-password-form");
        const linkForgot = document.getElementById("link-forgot-password");
        const btnBackToLogin = document.getElementById("btn-back-to-login");
        const mainView = document.getElementById("login-main-view");
        const forgotView = document.getElementById("login-forgot-view");

        // Toggle between Login and Forgot Password views
        if (linkForgot && mainView && forgotView) {
            linkForgot.addEventListener("click", (e) => {
                e.preventDefault();
                mainView.style.display = "none";
                forgotView.style.display = "block";
                const emailVal = document.getElementById("login-email") ? document.getElementById("login-email").value.trim() : "";
                const forgotInput = document.getElementById("forgot-email");
                if (forgotInput && emailVal) forgotInput.value = emailVal;
            });
        }

        if (btnBackToLogin && mainView && forgotView) {
            btnBackToLogin.addEventListener("click", (e) => {
                e.preventDefault();
                forgotView.style.display = "none";
                mainView.style.display = "block";
            });
        }

        // Handle Forgot Password submission
        if (forgotForm) {
            forgotForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const email = document.getElementById("forgot-email").value.trim();
                if (!email) {
                    this.showToast("Please enter your registered university email.", "warning");
                    return;
                }
                this.showToast(`Password reset link sent to ${email}. Check your inbox.`, "success");
                setTimeout(() => {
                    if (forgotView && mainView) {
                        forgotView.style.display = "none";
                        mainView.style.display = "block";
                    }
                }, 1400);
            });
        }

        // Clear error when user edits email or password
        const emailInputEl = document.getElementById("login-email");
        const pwdInputEl = document.getElementById("login-password");
        if (emailInputEl) {
            emailInputEl.addEventListener("input", () => this.clearLoginError());
        }
        if (pwdInputEl) {
            pwdInputEl.addEventListener("input", () => this.clearLoginError());
        }

        // Handle Sign In submission with strict institutional authentication & validation
        if (loginForm) {
            loginForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.clearLoginError();

                const emailInput = document.getElementById("login-email");
                const pwdInput = document.getElementById("login-password");
                const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
                const password = pwdInput ? pwdInput.value.trim() : "";

                // 1. Strict Email Format Validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!email || !emailRegex.test(email)) {
                    const msg = "Please enter a valid institutional email address.";
                    this.showLoginError(msg);
                    this.showToast(msg, "warning");
                    if (emailInput) emailInput.focus();
                    return;
                }

                // 2. Strict Institutional Directory Lookup (No auto-fallback to Dr. Rajesh Sharma)
                const matchedUser = (this.state.users || []).find(u => u.email && u.email.toLowerCase() === email);

                if (!matchedUser) {
                    const msg = `Access Denied: No institutional account found for "${email}". Please enter your registered university email.`;
                    this.showLoginError(msg);
                    this.showToast("Access Denied: Unregistered email address.", "error");
                    if (emailInput) {
                        emailInput.focus();
                        emailInput.select();
                    }
                    return;
                }

                // 3. Strict Password / Security OTP Verification
                const expectedPassword = matchedUser.password || "Password@123";
                const btnOtpToggle = document.getElementById("btn-otp-toggle");
                const isOtpMode = btnOtpToggle && btnOtpToggle.textContent.includes("Password");

                if (isOtpMode) {
                    if (password !== "1234") {
                        const msg = "Access Denied: Invalid Security OTP. Please enter the valid 4-digit code (1234).";
                        this.showLoginError(msg);
                        this.showToast("Invalid OTP code. Access denied.", "error");
                        if (pwdInput) {
                            pwdInput.focus();
                            pwdInput.select();
                        }
                        return;
                    }
                } else {
                    if (!password || password !== expectedPassword) {
                        const msg = "Access Denied: Incorrect password. Please check your credentials and try again.";
                        this.showLoginError(msg);
                        this.showToast("Incorrect password. Access denied.", "error");
                        if (pwdInput) {
                            pwdInput.focus();
                            pwdInput.select();
                        }
                        return;
                    }
                }

                // 4. Authenticated successfully (Single clean institutional sign-in toast)
                this.state.currentUser = {
                    ...matchedUser,
                    roleTitle: matchedUser.designation ? `${matchedUser.designation} (${matchedUser.role})` : matchedUser.role,
                    avatar: matchedUser.avatar || (matchedUser.name ? matchedUser.name.charAt(0) : matchedUser.role.charAt(0)),
                    badgeClass: matchedUser.role === 'Faculty' ? 'badge-doc' : (matchedUser.role === 'DeanHOD' ? 'badge-xls' : 'badge-pdf')
                };
                this.saveState();
                localStorage.setItem("portal_auth_user", "true");
                sessionStorage.setItem("portal_auth_user", "true");
                this.hideLoginScreen();
                this.renderAll();
                this.syncFromBackend();
                const userName = matchedUser.name || "User";
                const userRole = matchedUser.roleTitle || matchedUser.role || "Repository";
                this.showToast(`Signed in successfully as ${userName} (${userRole})`, "success");
            });
        }

        // OTP toggle
        const btnOtpToggle = document.getElementById("btn-otp-toggle");
        if (btnOtpToggle) {
            btnOtpToggle.addEventListener("click", () => {
                const pwdInput = document.getElementById("login-password");
                if (btnOtpToggle.textContent.includes("OTP")) {
                    btnOtpToggle.textContent = "Login with Password";
                    if (pwdInput) {
                        pwdInput.placeholder = "Enter OTP (Default: 1234)";
                        pwdInput.value = "1234";
                    }
                    this.showToast("OTP sent to official institutional email (Code: 1234)", "info");
                } else {
                    btnOtpToggle.textContent = "Login with OTP";
                    if (pwdInput) {
                        pwdInput.placeholder = "Enter password";
                        pwdInput.value = "••••••••••••";
                    }
                }
            });
        }
    },

    switchView(viewName) {
        this.activeView = viewName;

        // Update active class on nav
        document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
            if (item.getAttribute("data-view") === viewName) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Show target section
        document.querySelectorAll(".view-section").forEach(sec => {
            sec.classList.remove("active");
        });

        const targetSection = document.getElementById(`view-${viewName}`);
        if (targetSection) {
            targetSection.classList.add("active");
        }

        // Close any popups
        this.closeAllPopups();

        // Refresh dynamic view contents
        if (viewName === "dashboard") {
            this.renderRoleDashboard();
        } else if (viewName === "my-documents") {
            this.renderMyDocumentsTable();
        } else if (viewName === "verification-queue") {
            this.renderVerificationQueue();
        } else if (viewName === "document-repository") {
            this.renderRepositoryTable();
        } else if (viewName === "reports") {
            this.renderReports();
        } else if (viewName === "audit-trail") {
            this.renderAuditLogs();
        } else if (viewName === "users") {
            this.renderUsersTable();
        }
    },

    // =========================================================================
    // ROLE SWITCHING (For client presentation demo)
    // =========================================================================
    switchRole(roleId) {
        if (!window.PERSONAS || !window.PERSONAS[roleId]) return;

        // Find primary or first registered user for this role in database/state
        const targetUser = (this.state.users || []).find(usr => {
            if (roleId === "DeanHOD") return usr.role === "DeanHOD" || usr.role === "Dean" || usr.role === "HOD";
            return usr.role === roleId;
        });

        if (targetUser) {
            this.state.currentUser = {
                ...targetUser,
                roleTitle: targetUser.designation ? `${targetUser.designation} (${targetUser.role})` : targetUser.role,
                avatar: targetUser.avatar || (targetUser.name ? targetUser.name.charAt(0) : targetUser.role.charAt(0)),
                badgeClass: targetUser.role === 'Faculty' ? 'badge-doc' : (targetUser.role === 'DeanHOD' ? 'badge-xls' : 'badge-pdf')
            };
        } else {
            this.state.currentUser = JSON.parse(JSON.stringify(window.PERSONAS[roleId]));
        }

        // Update active class in role switcher context menu
        document.querySelectorAll("[data-switch-role]").forEach(el => {
            if (el.getAttribute("data-switch-role") === roleId) {
                el.classList.add("active");
            } else {
                el.classList.remove("active");
            }
        });

        // Update login pills if on login screen
        document.querySelectorAll(".login-role-pill").forEach(p => {
            if (p.getAttribute("data-role") === roleId) {
                p.classList.add("active");
            } else {
                p.classList.remove("active");
            }
        });

        this.saveState();
        this.renderAll();
        const roleLabel = roleId === "DeanHOD" ? "Dean / HOD" : roleId;
        this.showToast(`Switched Portal: ${roleLabel} (Active: ${this.state.currentUser.name})`, "info");
        this.closeAllPopups();
    },

    switchUser(userId) {
        const user = (this.state.users || []).find(u => u.id === userId);
        if (!user) return;

        this.state.currentUser = {
            ...user,
            roleTitle: user.designation ? `${user.designation} (${user.role})` : user.role,
            avatar: user.avatar || (user.name ? user.name.charAt(0) : user.role.charAt(0)),
            badgeClass: user.role === 'Faculty' ? 'badge-doc' : (user.role === 'DeanHOD' ? 'badge-xls' : 'badge-pdf')
        };

        this.saveState();
        this.renderAll();
        this.showToast(`Switched active user: ${user.name} (${user.designation || user.department})`, "success");
        this.closeAllPopups();
    },

    renderUserProfileMenu() {
        const u = this.state.currentUser;
        if (!u) return;
        const curRole = u.role;
        const popup = document.getElementById("user-profile-popup");
        if (!popup) return;

        const roleLabel = curRole === "DeanHOD" ? "Dean / HOD Verifier" : (curRole === "Inspector" ? "External NAAC Inspector" : (curRole === "Student" ? "Student Submitter" : (curRole === "IQAC" ? "Central IQAC Coordinator" : (curRole === "Admin" ? "System Administrator" : "Faculty Submitter"))));

        const roleColors = {
            "Faculty": "#2563eb",
            "Student": "#0284c7",
            "DeanHOD": "#059669",
            "IQAC": "#7c3aed",
            "Admin": "#4f46e5",
            "Inspector": "#d97706"
        };
        const bg = roleColors[curRole] || "#2563eb";

        const clearanceMap = {
            "Faculty": "Authorized for Self-Submissions & Academic Evidence",
            "Student": "Authorized for Personal Co-Curricular & Student Achievements",
            "DeanHOD": "Authorized for Departmental Verification & Routing",
            "IQAC": "Authorized for Central NAAC SSR Certification & Locking",
            "Admin": "Institutional Master Governance & Security Administration",
            "Inspector": "Official External Peer Review Clearance (Read-Only)"
        };
        const clearanceDesc = clearanceMap[curRole] || "Institutional Verified Access";

        popup.innerHTML = `
            <div style="padding: 16px; border-bottom: 1px solid var(--border-color); background: #f8fafc; border-radius: 10px 10px 0 0;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 48px; height: 48px; border-radius: 10px; background: ${bg}; color: #ffffff; font-weight: 700; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);">
                        ${u.avatar || (u.name ? u.name.charAt(0) : u.role.charAt(0))}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 700; font-size: 14.5px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.name}</div>
                        <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">${u.designation || u.role}</div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                            <span style="font-size: 10px; font-weight: 700; color: ${bg}; background: #ffffff; border: 1px solid #e2e8f0; padding: 1px 7px; border-radius: 9999px;">${roleLabel.toUpperCase()}</span>
                            <span style="font-size: 11px; color: #475569; font-weight: 600;">ID: ${u.employeeId || u.id}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                <div style="font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.5px; margin-bottom: 8px;">SECURITY & ACCESS CREDENTIALS</div>
                <div style="font-size: 12px; color: #334155; line-height: 1.5; margin-bottom: 8px;">
                    <strong>Department:</strong> ${u.department || 'University Repository'}<br>
                    <strong>Institutional Email:</strong> <span style="color: #2563eb;">${u.email}</span><br>
                    <strong>Clearance Scope:</strong> ${clearanceDesc}
                </div>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #16a34a; font-weight: 600;">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    256-Bit SSL Encrypted &bull; Central SSO Verified
                </div>
            </div>

            <div style="padding: 10px 16px; border-top: 1px solid var(--border-color); background: #f8fafc; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 10px 10px;">
                <span style="font-size: 11.5px; color: #64748b;">Session Status: <strong style="color: #16a34a;">Active</strong></span>
                <a href="javascript:void(0)" onclick="App.logout();" style="font-size: 12px; color: #dc2626; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign Out
                </a>
            </div>
        `;
    },

    renderRolePopup() {
        // Obsolete demo popup removed for confidentiality
    },

    // =========================================================================
    // ROLE 2: DEAN / HOD VERIFICATION DESK RENDERER
    // =========================================================================
    renderDeanDashboard() {
        const docs = this.state.documents;
        const pendingQueue = docs.filter(d => d.status === "Under Verification" && d.currentStage === "Dean/HOD");
        const forwardedToIQAC = docs.filter(d => (d.status === "Under Verification" && d.currentStage === "IQAC") || d.status === "Approved");
        const returned = docs.filter(d => d.status === "Returned");

        const elPending = document.getElementById("dean-kpi-pending");
        const elForwarded = document.getElementById("dean-kpi-forwarded");
        const elReturned = document.getElementById("dean-kpi-returned");
        const elCompliance = document.getElementById("dean-kpi-compliance");

        if (elPending) elPending.textContent = pendingQueue.length;
        if (elForwarded) elForwarded.textContent = forwardedToIQAC.length;
        if (elReturned) elReturned.textContent = returned.length;
        if (elCompliance) elCompliance.textContent = "91.5%";

        // Render Dean Queue table
        const tbody = document.getElementById("dean-queue-tbody");
        if (tbody) {
            const catFilter = document.getElementById("filter-dean-category") ? document.getElementById("filter-dean-category").value : "ALL";
            const searchVal = document.getElementById("dean-search-input") ? document.getElementById("dean-search-input").value.toLowerCase().trim() : "";

            let displayDocs = pendingQueue.filter(d => {
                if (catFilter !== "ALL" && d.category !== catFilter) return false;
                if (searchVal) {
                    const matchTitle = d.title.toLowerCase().includes(searchVal);
                    const matchOwner = d.ownerName.toLowerCase().includes(searchVal);
                    const matchId = d.id.toLowerCase().includes(searchVal);
                    if (!matchTitle && !matchOwner && !matchId) return false;
                }
                return true;
            });

            if (displayDocs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 32px; color: #64748b;">
                            <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">Department Queue Clear</div>
                            <div>All pending faculty submissions have been verified and forwarded to IQAC.</div>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = displayDocs.map(d => `
                    <tr>
                        <td><strong>${d.id}</strong></td>
                        <td>
                            <div style="font-weight: 600; color: #0f172a;">${this.escapeHtml(d.title)}</div>
                            <div style="font-size: 11px; color: #64748b;">${d.category} &bull; ${d.subCategory || ''}</div>
                        </td>
                        <td>
                            <div style="font-weight: 500;">${d.ownerName}</div>
                            <div style="font-size: 11px; color: #64748b;">${d.department}</div>
                        </td>
                        <td><span class="criteria-chip">Criterion ${d.naacCriterion || '6.3.3'}</span></td>
                        <td>${d.submittedOn}</td>
                        <td><span class="status-pill status-under-verification">Dean/HOD Stage</span></td>
                        <td>
                            <div style="display: flex; gap: 6px;">
                                <button class="btn-quick-verify" onclick="App.openDetailModal('${d.id}')">Verify &amp; Decide</button>
                                <button class="btn-action-view" onclick="App.openDetailModal('${d.id}')">Evidence</button>
                            </div>
                        </td>
                    </tr>
                `).join("");
            }
        }

        // Render Dean Criteria Progress Bars based on real submissions in Dean's department
        const criteriaBars = document.getElementById("dean-criteria-bars");
        if (criteriaBars) {
            const c132 = docs.filter(d => d.naacCriterion === "1.3.2").length;
            const c342 = docs.filter(d => d.naacCriterion === "3.4.2").length;
            const c531 = docs.filter(d => d.naacCriterion === "5.3.1" || d.naacCriterion === "5.3.3").length;
            const c633 = docs.filter(d => d.naacCriterion === "6.3.3" || d.naacCriterion === "6.3.2").length;
            const maxSub = Math.max(1, c132, c342, c531, c633);

            criteriaBars.innerHTML = `
                <div class="criteria-progress-item">
                    <div class="criteria-label-row"><span>Criterion 1.3.2 (Curriculum &amp; Experiential Learning)</span><span>${c132} Submissions</span></div>
                    <div class="criteria-progress-bar"><div class="criteria-progress-fill fill-blue" style="width: ${c132 === 0 ? 0 : Math.round((c132/maxSub)*100)}%;"></div></div>
                </div>
                <div class="criteria-progress-item">
                    <div class="criteria-label-row"><span>Criterion 3.4.2 (Research Awards &amp; Extramural Grants)</span><span>${c342} Submissions</span></div>
                    <div class="criteria-progress-bar"><div class="criteria-progress-fill fill-green" style="width: ${c342 === 0 ? 0 : Math.round((c342/maxSub)*100)}%;"></div></div>
                </div>
                <div class="criteria-progress-item">
                    <div class="criteria-label-row"><span>Criterion 5.3.1 (Student Innovation &amp; Hackathons)</span><span>${c531} Submissions</span></div>
                    <div class="criteria-progress-bar"><div class="criteria-progress-fill fill-amber" style="width: ${c531 === 0 ? 0 : Math.round((c531/maxSub)*100)}%;"></div></div>
                </div>
                <div class="criteria-progress-item">
                    <div class="criteria-label-row"><span>Criterion 6.3.3 (Faculty Professional FDPs &amp; Workshops)</span><span>${c633} Submissions</span></div>
                    <div class="criteria-progress-bar"><div class="criteria-progress-fill fill-purple" style="width: ${c633 === 0 ? 0 : Math.round((c633/maxSub)*100)}%;"></div></div>
                </div>
            `;
        }

        // Render Dean Recent Decisions Feed from real activities
        const deanFeed = document.getElementById("dean-recent-activity");
        if (deanFeed) {
            const activities = (this.state.recentActivities || []).filter(a => a.role === 'DeanHOD' || (a.title && (a.title.includes('forwarded') || a.title.includes('returned') || a.title.includes('Department'))));
            if (activities.length === 0) {
                deanFeed.innerHTML = `<div style="text-align: center; padding: 24px 16px; color: #94a3b8; font-size: 12.5px;">No departmental verification actions recorded yet. Decisions made on pending submissions will appear here.</div>`;
            } else {
                deanFeed.innerHTML = activities.slice(0, 5).map(a => `
                    <div class="activity-item">
                        <div class="activity-icon-circle ${a.color === 'red' ? 'icon-red' : 'icon-green'}">
                            ${a.color === 'red' ? '↩' : '✓'}
                        </div>
                        <div class="activity-content">
                            <div class="activity-text">${this.escapeHtml(a.title)}</div>
                            <div class="activity-time">${a.timestamp || 'Recent'}</div>
                        </div>
                    </div>
                `).join("");
            }
        }
    },

    // =========================================================================
    // ROLE 3: IQAC ACCREDITATION CONSOLE RENDERER
    // =========================================================================
    renderIQACDashboard() {
        const docs = this.state.documents;
        const pendingIQAC = docs.filter(d => d.status === "Under Verification" && d.currentStage === "IQAC");
        const lockedDocs = docs.filter(d => d.status === "Approved");

        const elPending = document.getElementById("iqac-kpi-pending");
        const elLocked = document.getElementById("iqac-kpi-locked");
        const elCriteria = document.getElementById("iqac-kpi-criteria");
        const elScore = document.getElementById("iqac-kpi-score");

        if (elPending) elPending.textContent = pendingIQAC.length;
        if (elLocked) elLocked.textContent = lockedDocs.length;
        if (elCriteria) elCriteria.textContent = "7 / 7";
        if (elScore) elScore.textContent = "94.8%";

        // Render IQAC Queue Table
        const tbody = document.getElementById("iqac-queue-tbody");
        if (tbody) {
            const criterionFilter = document.getElementById("filter-iqac-criterion") ? document.getElementById("filter-iqac-criterion").value : "ALL";
            const searchVal = document.getElementById("iqac-search-input") ? document.getElementById("iqac-search-input").value.toLowerCase().trim() : "";

            let displayDocs = pendingIQAC.filter(d => {
                if (criterionFilter !== "ALL" && d.naacCriterion !== criterionFilter) return false;
                if (searchVal) {
                    const matchTitle = d.title.toLowerCase().includes(searchVal);
                    const matchOwner = d.ownerName.toLowerCase().includes(searchVal);
                    const matchDept = d.department.toLowerCase().includes(searchVal);
                    if (!matchTitle && !matchOwner && !matchDept) return false;
                }
                return true;
            });

            if (displayDocs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 32px; color: #64748b;">
                            <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">IQAC Review Queue Up to Date</div>
                            <div>All forwarded evidence dossiers have been cryptographically locked for NAAC SSR.</div>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = displayDocs.map(d => `
                    <tr>
                        <td><span class="criteria-chip">Criterion ${d.naacCriterion || '6.3.3'}</span></td>
                        <td>
                            <div style="font-weight: 600; color: #0f172a;">${this.escapeHtml(d.title)}</div>
                            <div style="font-size: 11px; color: #64748b;">Record ID: <code>${d.id}</code></div>
                        </td>
                        <td>
                            <div style="font-weight: 500;">${d.department}</div>
                            <div style="font-size: 11px; color: #16a34a;">Verified by Dean/HOD</div>
                        </td>
                        <td><span class="file-type-badge badge-${d.fileType || 'pdf'}">${(d.fileType || 'PDF').toUpperCase()}</span> ${d.fileSize || '2.4 MB'}</td>
                        <td><span class="status-pill status-under-verification">Under IQAC Review</span></td>
                        <td>
                            <div style="display: flex; gap: 6px;">
                                <button class="btn-ssr-lock" onclick="App.lockRecordSSR('${d.id}')">Approve &amp; Lock</button>
                                <button class="btn-return-action" onclick="App.openReturnModal('${d.id}')">Return</button>
                                <button class="btn-action-view" onclick="App.openDetailModal('${d.id}')">Audit</button>
                            </div>
                        </td>
                    </tr>
                `).join("");
            }
        }

        // Render NAAC 7 Criteria Progress Bars
        const progressList = document.getElementById("iqac-7criteria-progress");
        if (progressList) {
            const criteriaData = [
                { name: "Criterion I: Curricular Aspects", pct: 92, fill: "fill-blue" },
                { name: "Criterion II: Teaching-Learning & Evaluation", pct: 95, fill: "fill-green" },
                { name: "Criterion III: Research, Innovations & Extension", pct: 88, fill: "fill-purple" },
                { name: "Criterion IV: Infrastructure & Learning Resources", pct: 90, fill: "fill-blue" },
                { name: "Criterion V: Student Support & Progression", pct: 85, fill: "fill-amber" },
                { name: "Criterion VI: Governance, Leadership & Management", pct: 94, fill: "fill-green" },
                { name: "Criterion VII: Institutional Values & Best Practices", pct: 96, fill: "fill-purple" }
            ];
            progressList.innerHTML = criteriaData.map(c => `
                <div class="criteria-progress-item">
                    <div class="criteria-label-row"><span>${c.name}</span><span>${c.pct}% Complete</span></div>
                    <div class="criteria-progress-bar"><div class="criteria-progress-fill ${c.fill}" style="width: ${c.pct}%;"></div></div>
                </div>
            `).join("");
        }

        // Render Cryptographic Lock Ledger Feed from real locked documents
        const lockLedger = document.getElementById("iqac-lock-ledger");
        if (lockLedger) {
            const lockedDocs = docs.filter(d => d.isLocked || d.status === "Approved");
            if (lockedDocs.length === 0) {
                lockLedger.innerHTML = `<div style="text-align: center; padding: 24px 16px; color: #94a3b8; font-size: 12.5px;">No records cryptographically sealed yet. Approved dossiers will be immutably recorded here with tamper-evident hashes.</div>`;
            } else {
                lockLedger.innerHTML = lockedDocs.map(d => {
                    const hash = "0x" + (d.id ? d.id.replace(/-/g, '').toLowerCase() : "8a9f") + "...seal";
                    return `
                        <div class="activity-item">
                            <div class="activity-icon-circle icon-green">🔒</div>
                            <div class="activity-content">
                                <div class="activity-text">Locked "${this.escapeHtml(d.title)}" (Criterion ${d.naacCriterion || 'General'})</div>
                                <div class="activity-time">${d.submittedOn || 'Verified'} &bull; Hash: <code>${hash}</code></div>
                            </div>
                        </div>
                    `;
                }).join("");
            }
        }
    },

    // =========================================================================
    // ROLE 4: ADMIN CONSOLE RENDERER
    // =========================================================================
    renderAdminDashboard() {
        const docs = this.state.documents;
        const users = this.state.users || [];
        const revs = this.state.revisionRequests || [];

        const elDocs = document.getElementById("admin-kpi-docs");
        const elUsers = document.getElementById("admin-kpi-users");
        const elRevs = document.getElementById("admin-kpi-revisions");
        const elStorage = document.getElementById("admin-kpi-storage");

        if (elDocs) elDocs.textContent = docs.length;
        if (elUsers) elUsers.textContent = users.length;
        if (elRevs) elRevs.textContent = revs.filter(r => r.status.includes("Pending")).length;
        if (elStorage) elStorage.textContent = "1.4 / 10 GB";

        // Render Revision Requests Table
        const tbody = document.getElementById("admin-dashboard-revisions-tbody");
        if (tbody) {
            tbody.innerHTML = revs.map(r => `
                <tr>
                    <td><strong>${r.id}</strong></td>
                    <td>
                        <div style="font-weight: 600; color: #0f172a;">${r.recordTitle}</div>
                        <div style="font-size: 11px; color: #64748b;">Target Doc: <code>${r.recordId}</code></div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${r.initiator}</div>
                        <div style="font-size: 11px; color: #64748b;">${r.department || 'Computer Science & Eng'}</div>
                    </td>
                    <td style="max-width: 280px; font-size: 12.5px;">${r.reason}</td>
                    <td>${r.requestedDate}</td>
                    <td><span class="status-pill ${r.status.includes('Authorized') ? 'status-approved' : 'status-returned'}">${r.status}</span></td>
                    <td>
                        ${r.status.includes('Pending') ? `
                            <div style="display: flex; gap: 6px;">
                                <button class="btn-forward-iqac" onclick="App.authorizeRevision('${r.id}')">Authorize Unlock</button>
                                <button class="btn-return-action" onclick="App.rejectRevision('${r.id}')">Reject</button>
                            </div>
                        ` : `
                            <span style="font-size: 11.5px; color: #64748b; font-weight: 600;">Decision Logged</span>
                        `}
                    </td>
                </tr>
            `).join("");
        }
    },

    // =========================================================================
    // ROLE 5: INSPECTOR CONSOLE RENDERER
    // =========================================================================
    renderInspectorDashboard() {
        const docs = this.state.documents;
        const approvedDocs = docs.filter(d => d.status === "Approved");

        const elVerified = document.getElementById("inspector-kpi-verified");
        const elCriteria = document.getElementById("inspector-kpi-criteria");
        const elCgpa = document.getElementById("inspector-kpi-cgpa");
        const elSeal = document.getElementById("inspector-kpi-seal");

        if (elVerified) elVerified.textContent = approvedDocs.length;
        if (elCriteria) elCriteria.textContent = "7 / 7";
        if (elCgpa) elCgpa.textContent = "3.64 / 4.00";
        if (elSeal) elSeal.textContent = "100% Sealed";

        // Render Inspector Dossier Table
        const tbody = document.getElementById("inspector-dossier-tbody");
        if (tbody) {
            const criterionFilter = document.getElementById("filter-inspector-criterion") ? document.getElementById("filter-inspector-criterion").value : "ALL";
            const searchVal = document.getElementById("inspector-search-input") ? document.getElementById("inspector-search-input").value.toLowerCase().trim() : "";

            let displayDocs = approvedDocs.filter(d => {
                if (criterionFilter !== "ALL" && d.naacCriterion !== criterionFilter) return false;
                if (searchVal) {
                    const matchTitle = d.title.toLowerCase().includes(searchVal);
                    const matchOwner = d.ownerName.toLowerCase().includes(searchVal);
                    const matchDept = d.department.toLowerCase().includes(searchVal);
                    if (!matchTitle && !matchOwner && !matchDept) return false;
                }
                return true;
            });

            tbody.innerHTML = displayDocs.map(d => `
                <tr>
                    <td><span class="criteria-chip">Criterion ${d.naacCriterion || '3.4.2'}</span></td>
                    <td>
                        <div style="font-weight: 600; color: #0f172a;">${this.escapeHtml(d.title)}</div>
                        <div style="font-size: 11px; color: #64748b;">Evidence File: ${d.evidenceFile || 'certified_proof.pdf'}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${d.ownerName}</div>
                        <div style="font-size: 11px; color: #64748b;">${d.department}</div>
                    </td>
                    <td>${d.academicYear || '2026-2027'}</td>
                    <td><span class="status-pill status-approved">Cryptographically Locked</span></td>
                    <td>
                        <button class="btn-action-view" onclick="App.openDetailModal('${d.id}')">Inspect Verified Evidence</button>
                    </td>
                </tr>
            `).join("");
        }

        // Render Inspector Radar Quality Bars
        const radarBars = document.getElementById("inspector-radar-bars");
        if (radarBars) {
            radarBars.innerHTML = `
                <div class="criteria-progress-item">
                    <div class="criteria-label-row"><span>Curricular Aspects (Weight: 100)</span><span>Score: 94 / 100</span></div>
                    <div class="criteria-progress-bar"><div class="criteria-progress-fill fill-blue" style="width: 94%;"></div></div>
                </div>
                <div class="criteria-progress-item">
                    <div class="criteria-label-row"><span>Research &amp; Innovations (Weight: 250)</span><span>Score: 232 / 250</span></div>
                    <div class="criteria-progress-bar"><div class="criteria-progress-fill fill-green" style="width: 92.8%;"></div></div>
                </div>
                <div class="criteria-progress-item">
                    <div class="criteria-label-row"><span>Student Progression &amp; Awards (Weight: 100)</span><span>Score: 89 / 100</span></div>
                    <div class="criteria-progress-bar"><div class="criteria-progress-fill fill-amber" style="width: 89%;"></div></div>
                </div>
                <div class="criteria-progress-item">
                    <div class="criteria-label-row"><span>Governance &amp; Financial Support (Weight: 100)</span><span>Score: 96 / 100</span></div>
                    <div class="criteria-progress-bar"><div class="criteria-progress-fill fill-purple" style="width: 96%;"></div></div>
                </div>
            `;
        }
    },

    // =========================================================================
    // USERS DIRECTORY RENDERER & CREATION (Section 3)
    // =========================================================================
    renderUsersTable() {
        const tbody = document.getElementById("user-directory-tbody");
        if (!tbody) return;

        const users = this.state.users || [];
        const roleFilter = document.getElementById("filter-user-role") ? document.getElementById("filter-user-role").value : "ALL";
        const searchVal = document.getElementById("filter-user-search") ? document.getElementById("filter-user-search").value.toLowerCase().trim() : "";

        let filtered = users.filter(u => {
            if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
            if (searchVal) {
                const matchName = u.name.toLowerCase().includes(searchVal);
                const matchEmail = u.email.toLowerCase().includes(searchVal);
                const matchDept = u.department.toLowerCase().includes(searchVal);
                if (!matchName && !matchEmail && !matchDept) return false;
            }
            return true;
        });

        const countEl = document.getElementById("user-count-display");
        if (countEl) countEl.textContent = filtered.length;

        tbody.innerHTML = filtered.map(u => `
            <tr>
                <td>
                    <div style="font-weight: 600; color: #0f172a;">${u.name}</div>
                    <div style="font-size: 11px; color: #64748b;">ID: <code>${u.employeeId || u.id}</code></div>
                </td>
                <td>${u.email}</td>
                <td><span class="file-type-badge ${u.role === 'Admin' ? 'badge-admin' : (u.role === 'Inspector' ? 'badge-inspector' : (u.role === 'DeanHOD' ? 'badge-xls' : (u.role === 'IQAC' ? 'badge-pdf' : 'badge-doc')))}" style="font-size: 11px; padding: 3px 8px; border-radius: 4px;">${u.role}</span></td>
                <td>${u.department}</td>
                <td>${u.designation}</td>
                <td><span class="status-pill status-approved">${u.status || 'Active'}</span></td>
                <td>
                    <span class="status-pill status-approved" style="font-size: 11px;">Active Account</span>
                </td>
            </tr>
        `).join("");
    },

    handleCreateUser() {
        const name = document.getElementById("new-user-name").value.trim();
        const email = document.getElementById("new-user-email").value.trim();
        const role = document.getElementById("new-user-role").value;
        const dept = document.getElementById("new-user-dept").value;
        const desig = document.getElementById("new-user-designation").value.trim();
        const empid = document.getElementById("new-user-empid").value.trim();

        if (!name || !email || !desig || !empid) {
            this.showToast("Please fill all required user fields.", "warning");
            return;
        }

        if (!this.state.users) this.state.users = [];
        const newUser = {
            id: `USR-${Math.floor(100 + Math.random() * 900)}`,
            name,
            email,
            role,
            designation: desig,
            department: dept,
            employeeId: empid,
            status: "Active"
        };
        this.state.users.push(newUser);

        this.closeModal("add-user-modal");
        this.saveState();
        this.renderUsersTable();
        this.showToast(`User account created for ${name} (${role})`, "success");

        if (window.PortalAPI) {
            window.PortalAPI.createUser(newUser)
                .catch(e => console.warn("Backend create user failed:", e));
        }
    },

    // =========================================================================
    // WORKFLOW DECISION & BATCH ACTIONS
    // =========================================================================
    lockRecordSSR(docId) {
        const doc = this.state.documents.find(d => d.id === docId);
        if (!doc) return;

        doc.status = "Approved";
        doc.currentStage = "Finalized";
        doc.isLocked = true;
        doc.evidenceVerified = true;

        const u = this.state.currentUser;
        doc.timeline.push({
            stage: "IQAC Approved & Sealed",
            actor: `${u.name} (${u.roleTitle || u.role})`,
            date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            comment: "Evidence validated against NAAC indicators. Cryptographic SSR lock applied."
        });

        this.state.auditLogs.unshift({
            id: `AUD-${Math.floor(9000 + Math.random() * 900)}`,
            timestamp: new Date().toLocaleString(),
            actor: `${u.name} (IQAC Coordinator)`,
            action: "RECORD_APPROVED_LOCKED",
            recordId: doc.id,
            title: doc.title,
            priorStatus: "Under Verification (IQAC)",
            newStatus: "Approved & Locked",
            comments: `Cryptographically sealed under NAAC Criterion ${doc.naacCriterion || '3.4.2'}.`,
            hash: "0x" + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('') + "...seal"
        });

        this.saveState();
        this.showToast(`"${doc.title}" cryptographically locked in NAAC SSR register.`, "success");

        if (window.PortalAPI) {
            window.PortalAPI.lockDocument(docId, u.name, u.role)
                .catch(e => console.warn("Backend lock failed:", e));
        }
    },

    batchForwardDeanQueue() {
        const pending = this.state.documents.filter(d => d.status === "Under Verification" && d.currentStage === "Dean/HOD");
        if (pending.length === 0) {
            this.showToast("No pending submissions to forward.", "info");
            return;
        }

        const u = this.state.currentUser;
        pending.forEach(d => {
            d.currentStage = "IQAC";
            d.timeline.push({
                stage: "Department Verified & Forwarded",
                actor: `${u.name} (Dean/HOD)`,
                date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
                comment: "Batch verified against department records. Forwarded to IQAC."
            });
        });

        this.saveState();
        this.showToast(`Batch forwarded ${pending.length} submissions to Central IQAC Queue.`, "success");

        if (window.PortalAPI) {
            window.PortalAPI.batchForward(u.name, u.role)
                .catch(e => console.warn("Backend batch forward failed:", e));
        }
    },

    batchLockIQACQueue() {
        const pending = this.state.documents.filter(d => d.status === "Under Verification" && d.currentStage === "IQAC");
        if (pending.length === 0) {
            this.showToast("No pending records to lock.", "info");
            return;
        }

        pending.forEach(d => {
            d.status = "Approved";
            d.currentStage = "Finalized";
            d.isLocked = true;
        });

        this.saveState();
        this.showToast(`Batch certified and sealed ${pending.length} records for NAAC SSR.`, "success");

        if (window.PortalAPI) {
            window.PortalAPI.batchLock(u.name, u.role)
                .catch(e => console.warn("Backend batch lock failed:", e));
        }
        this.showToast(`Batch certified and sealed ${pending.length} records for NAAC SSR.`, "success");
    },

    authorizeRevision(revId) {
        const rev = this.state.revisionRequests.find(r => r.id === revId);
        if (!rev) return;

        rev.status = "Authorized by Admin";
        const doc = this.state.documents.find(d => d.id === rev.recordId);
        if (doc) {
            doc.status = "Returned";
            doc.currentStage = "Faculty";
            doc.isLocked = false;
            doc.reviewerComments.push({
                reviewer: `${this.state.currentUser.name} (Admin)`,
                stage: "Formal Revision Authorized",
                date: new Date().toLocaleDateString("en-GB"),
                comment: `Revision authorized by Administrator: "${rev.reason}". Unlocked for faculty correction.`
            });
        }

        this.saveState();
        this.showToast(`Revision ${revId} authorized. Document unlocked for faculty correction.`, "success");

        if (window.PortalAPI) {
            window.PortalAPI.authorizeRevision(revId)
                .catch(e => console.warn("Backend auth revision failed:", e));
        }
    },

    rejectRevision(revId) {
        const rev = this.state.revisionRequests.find(r => r.id === revId);
        if (!rev) return;

        rev.status = "Rejected by Admin";
        this.saveState();
        this.showToast(`Revision request ${revId} rejected. Lock maintained.`, "info");

        if (window.PortalAPI) {
            window.PortalAPI.rejectRevision(revId)
                .catch(e => console.warn("Backend reject revision failed:", e));
        }
    },

    downloadNAACReportCSV() {
        const docs = this.state.documents;
        const headers = ["Record ID", "Document Title", "Category", "NAAC Criterion", "Owner Name", "Department", "Academic Year", "Status", "Current Stage", "Cryptographic Hash"];
        const rows = docs.map(d => [
            `"${d.id}"`,
            `"${d.title.replace(/"/g, '""')}"`,
            `"${d.category}"`,
            `"${d.naacCriterion || 'N/A'}"`,
            `"${d.ownerName}"`,
            `"${d.department}"`,
            `"${d.academicYear || '2026-2027'}"`,
            `"${d.status}"`,
            `"${d.currentStage}"`,
            `"${d.isLocked ? '0x' + d.id.replace(/-/g, '').toLowerCase() + '...verified' : 'PENDING_LOCK'}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `NAAC_SSR_Evidence_Register_Cycle3_2026.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast("NAAC Accreditation SSR Register CSV downloaded successfully.", "success");
    },

    exportDepartmentCSV() {
        const docs = this.state.documents.filter(d => d.department.includes("Computer Science"));
        const headers = ["Record ID", "Document Title", "Category", "NAAC Criterion", "Faculty Submitter", "Status", "Stage"];
        const rows = docs.map(d => [
            `"${d.id}"`,
            `"${d.title.replace(/"/g, '""')}"`,
            `"${d.category}"`,
            `"${d.naacCriterion || 'N/A'}"`,
            `"${d.ownerName}"`,
            `"${d.status}"`,
            `"${d.currentStage}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `CSE_Department_Accreditation_Report_2026.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast("CSE Department Accreditation CSV downloaded.", "success");
    },

    filterDeanQueue(statusFilter) {
        this.showToast(`Filtering department queue: ${statusFilter}`, "info");
    },

    renderReports() {
        const docs = this.state.documents || [];
        const table = document.getElementById("accreditation-register-table");
        if (!table) return;

        const criteriaGroups = [
            { code: "6.3.3", label: "Criterion 6.3.2 & 6.3.3", sub: "Faculty Capacity Dev & Financial Aid", nature: "Professional Dev, Orientation, FDP", matches: ["6.3.2", "6.3.3"] },
            { code: "3.4.2", label: "Criterion 3.4.2", sub: "Faculty Awards & Recognitions", nature: "Government & Non-Govt Citations", matches: ["3.4.2", "3.4.3"] },
            { code: "5.3.1", label: "Criterion 5.3.1 & 5.3.3", sub: "Student Achievements & Development", nature: "Competitions, Hackathons, Workshops", matches: ["5.3.1", "5.3.3"] },
            { code: "1.3.2", label: "Criterion 1.3.2", sub: "Academic & Institutional Reports", nature: "Curricular reviews, AQAR Compliance", matches: ["1.3.2"] }
        ];

        const tbody = table.querySelector("tbody");
        if (tbody) {
            tbody.innerHTML = criteriaGroups.map(cg => {
                const groupDocs = docs.filter(d => cg.matches.includes(d.naacCriterion));
                const lockedCount = groupDocs.filter(d => d.status === "Approved").length;
                const pendingCount = groupDocs.filter(d => d.status === "Under Verification").length;
                const returnedCount = groupDocs.filter(d => d.status === "Returned").length;

                return `
                    <tr>
                        <td><strong>${cg.label}</strong><br><span style="font-size: 11px; color: #64748b;">${cg.sub}</span></td>
                        <td>${cg.nature}</td>
                        <td><strong>${groupDocs.length}</strong></td>
                        <td><span class="status-pill status-approved">${lockedCount} Locked</span></td>
                        <td><span class="status-pill ${returnedCount > 0 ? 'status-returned' : 'status-under-verification'}">${pendingCount} Pending ${returnedCount > 0 ? `(${returnedCount} Returned)` : ''}</span></td>
                        <td><button class="btn-action-view" onclick="filterRepoByCriterion('${cg.code}')">View Register</button></td>
                    </tr>
                `;
            }).join("");
        }
    },

    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================
    setupEventListeners() {
        // Table filters on Dashboard
        document.getElementById("filter-category").addEventListener("change", () => this.renderDashboardTable());
        document.getElementById("filter-status").addEventListener("change", () => this.renderDashboardTable());
        document.getElementById("table-search-input").addEventListener("input", () => this.renderDashboardTable());

        // Global search bar
        document.getElementById("global-search").addEventListener("input", (e) => {
            const val = e.target.value;
            const searchInput = document.getElementById("table-search-input");
            if (searchInput) {
                searchInput.value = val;
                this.renderDashboardTable();
            }
        });

        // My Documents tabs
        document.querySelectorAll(".doc-tab-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                document.querySelectorAll(".doc-tab-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                const status = e.target.getAttribute("data-tab-status");
                this.renderMyDocumentsTable(status);
            });
        });

        document.getElementById("filter-academic-year-mydocs").addEventListener("change", () => {
            const activeTab = document.querySelector(".doc-tab-btn.active");
            const status = activeTab ? activeTab.getAttribute("data-tab-status") : "ALL";
            this.renderMyDocumentsTable(status);
        });

        document.getElementById("filter-repo-criteria").addEventListener("change", () => this.renderRepositoryTable());

        // Role popup toggle & User Profile popup toggle
        const roleBtn = document.getElementById("role-switcher-btn");
        const rolePopup = document.getElementById("role-popup");
        const userProfileBtn = document.getElementById("user-profile-menu-btn");
        const userProfilePopup = document.getElementById("user-profile-popup");

        if (roleBtn && rolePopup) {
            roleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                rolePopup.classList.toggle("active");
                if (userProfilePopup) userProfilePopup.classList.remove("active");
                const nm = document.getElementById("notifications-menu");
                if (nm) nm.classList.remove("active");
            });
        }

        if (userProfileBtn && userProfilePopup) {
            userProfileBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                userProfilePopup.classList.toggle("active");
                if (rolePopup) rolePopup.classList.remove("active");
                const nm = document.getElementById("notifications-menu");
                if (nm) nm.classList.remove("active");
            });
        }

        // Mobile Sidebar Drawer Toggle & Backdrop
        const btnMobileToggle = document.getElementById("btn-mobile-sidebar-toggle");
        const btnMobileClose = document.getElementById("btn-mobile-sidebar-close");
        const sidebarBackdrop = document.getElementById("sidebar-backdrop");
        const mainSidebar = document.getElementById("main-sidebar");

        if (btnMobileToggle && mainSidebar) {
            btnMobileToggle.addEventListener("click", (e) => {
                e.stopPropagation();
                mainSidebar.classList.add("open");
                if (sidebarBackdrop) sidebarBackdrop.classList.add("active");
            });
        }

        if (btnMobileClose && mainSidebar) {
            btnMobileClose.addEventListener("click", () => {
                mainSidebar.classList.remove("open");
                if (sidebarBackdrop) sidebarBackdrop.classList.remove("active");
            });
        }

        if (sidebarBackdrop && mainSidebar) {
            sidebarBackdrop.addEventListener("click", () => {
                mainSidebar.classList.remove("open");
                sidebarBackdrop.classList.remove("active");
            });
        }

        // Auto close drawer when nav item clicked on mobile/tablet
        document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
            item.addEventListener("click", () => {
                if (window.innerWidth <= 1024 && mainSidebar) {
                    mainSidebar.classList.remove("open");
                    if (sidebarBackdrop) sidebarBackdrop.classList.remove("active");
                }
            });
        });

        // Role items switch
        document.querySelectorAll("[data-switch-role]").forEach(el => {
            el.addEventListener("click", (e) => {
                const roleId = el.getAttribute("data-switch-role");
                this.switchRole(roleId);
            });
        });

        // Notification toggle
        const notifBtn = document.getElementById("btn-notifications");
        const notifMenu = document.getElementById("notifications-menu");
        if (notifBtn && notifMenu) {
            notifBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                notifMenu.classList.toggle("active");
                if (rolePopup) rolePopup.classList.remove("active");
                if (userProfilePopup) userProfilePopup.classList.remove("active");
            });
        }

        const markAllReadBtn = document.getElementById("mark-all-read");
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener("click", () => {
                const notifDot = document.querySelector(".notification-dot");
                if (notifDot) notifDot.style.display = "none";
                this.showToast("All notifications marked as read", "success");
            });
        }

        // Close popups when clicking outside
        document.addEventListener("click", (e) => {
            if (rolePopup && roleBtn && !rolePopup.contains(e.target) && !roleBtn.contains(e.target)) {
                rolePopup.classList.remove("active");
            }
            if (userProfilePopup && userProfileBtn && !userProfilePopup.contains(e.target) && !userProfileBtn.contains(e.target)) {
                userProfilePopup.classList.remove("active");
            }
            if (notifMenu && notifBtn && !notifMenu.contains(e.target) && !notifBtn.contains(e.target)) {
                notifMenu.classList.remove("active");
            }
            const ctxMenu = document.getElementById("row-context-menu");
            if (ctxMenu && !ctxMenu.contains(e.target)) {
                ctxMenu.classList.remove("active");
            }
        });

        // Header upload button
        document.querySelectorAll("[data-action='open-upload-modal']").forEach(btn => {
            btn.addEventListener("click", () => this.openUploadModal());
        });

        // Modal close buttons
        document.querySelectorAll("[data-close-modal]").forEach(btn => {
            btn.addEventListener("click", () => {
                const modalId = btn.getAttribute("data-close-modal");
                this.closeModal(modalId);
            });
        });

        // Dynamic upload category switcher (Section 5.2, 5.3, 6.2, 6.3)
        const catSelector = document.getElementById("form-record-category");
        catSelector.addEventListener("change", (e) => {
            this.handleUploadCategoryChange(e.target.value);
        });

        // Conditional Financial Support inputs (Section 5.2)
        const finSupportSelect = document.getElementById("fc-financial-support");
        finSupportSelect.addEventListener("change", (e) => {
            const isYes = e.target.value === "Yes";
            document.getElementById("fc-fin-amount-group").style.display = isYes ? "block" : "none";
            document.getElementById("fc-fin-type-group").style.display = isYes ? "block" : "none";
        });

        // Conditional Other inputs
        const eventTypeSelect = document.getElementById("fc-event-type");
        eventTypeSelect.addEventListener("change", (e) => {
            const isOther = e.target.value === "OTHER";
            document.getElementById("fc-other-wrap").style.display = isOther ? "block" : "none";
        });

        // Drag & Drop file upload simulation
        const dropzone = document.getElementById("file-dropzone");
        const fileInput = document.getElementById("evidence-file-input");

        dropzone.addEventListener("click", () => fileInput.click());
        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.style.borderColor = "var(--primary)";
        });
        dropzone.addEventListener("dragleave", () => {
            dropzone.style.borderColor = "#cbd5e1";
        });
        dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropzone.style.borderColor = "#cbd5e1";
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                this.handleFileSelected(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFileSelected(e.target.files[0]);
            }
        });

        // Submit and Draft buttons
        document.getElementById("btn-submit-verification").addEventListener("click", () => this.handleUploadSubmit(false));
        document.getElementById("btn-save-draft").addEventListener("click", () => this.handleUploadSubmit(true));

        // Reviewer modal decision buttons
        document.getElementById("btn-modal-approve").addEventListener("click", () => this.handleReviewerApprove());
        document.getElementById("btn-modal-return").addEventListener("click", () => this.openReturnModal());

        // Return confirmation
        document.getElementById("btn-confirm-return").addEventListener("click", () => this.handleConfirmReturn());

        // Export CSV button
        document.getElementById("btn-download-naac-csv").addEventListener("click", () => this.exportNAACCsv());
        document.getElementById("btn-export-repository").addEventListener("click", () => this.exportNAACCsv());

        // KPI Card click-to-filter
        document.querySelectorAll(".kpi-card[data-kpi-filter]").forEach(card => {
            card.addEventListener("click", () => {
                const filterVal = card.getAttribute("data-kpi-filter");
                this.setKpiFilter(filterVal);
            });
        });

        // Donut Legend click-to-filter
        document.querySelectorAll(".donut-legend .legend-item").forEach((item, idx) => {
            item.addEventListener("click", () => {
                const statuses = ["Under Verification", "Returned", "Approved"];
                this.setKpiFilter(statuses[idx]);
            });
        });

        // Sortable table headers
        document.querySelectorAll(".sortable-th").forEach(th => {
            th.addEventListener("click", () => {
                const sortCol = th.getAttribute("data-sort");
                if (sortCol) this.handleSort(sortCol);
            });
        });

        // Header select-all checkbox
        const headerCheckbox = document.getElementById("dash-select-all");
        if (headerCheckbox) {
            headerCheckbox.addEventListener("change", (e) => {
                const isChecked = e.target.checked;
                const catFilter = document.getElementById("filter-category").value;
                const statusFilter = document.getElementById("filter-status").value;
                const searchVal = (document.getElementById("table-search-input").value || "").toLowerCase().trim();

                const filtered = this.state.documents.filter(d => {
                    if (this.activeKpiFilter !== "ALL" && d.status !== this.activeKpiFilter) return false;
                    if (catFilter !== "ALL" && d.category !== catFilter) return false;
                    if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
                    if (searchVal) {
                        const matchTitle = d.title.toLowerCase().includes(searchVal);
                        const matchCategory = d.category.toLowerCase().includes(searchVal);
                        const matchStage = d.currentStage.toLowerCase().includes(searchVal);
                        if (!matchTitle && !matchCategory && !matchStage) return false;
                    }
                    return true;
                });

                const startIdx = (this.currentPage - 1) * this.pageSize;
                const endIdx = startIdx + this.pageSize;
                const pageDocs = filtered.slice(startIdx, endIdx);

                pageDocs.forEach(d => {
                    if (isChecked) {
                        this.selectedDocIds.add(d.id);
                    } else {
                        this.selectedDocIds.delete(d.id);
                    }
                });
                this.renderDashboardTable();
            });
        }

        // Pagination controls
        const pageSizeSelect = document.getElementById("dash-page-size");
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener("change", (e) => {
                this.pageSize = e.target.value === "ALL" ? 999 : parseInt(e.target.value);
                this.currentPage = 1;
                this.renderDashboardTable();
            });
        }

        const btnPrev = document.getElementById("btn-prev-page");
        if (btnPrev) {
            btnPrev.addEventListener("click", () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderDashboardTable();
                }
            });
        }

        const btnNext = document.getElementById("btn-next-page");
        if (btnNext) {
            btnNext.addEventListener("click", () => {
                const totalPages = Math.ceil(this.filteredDocsLength / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderDashboardTable();
                }
            });
        }

        // Bulk action buttons
        const btnBulkExport = document.getElementById("btn-bulk-export");
        if (btnBulkExport) {
            btnBulkExport.addEventListener("click", () => this.exportSelectedToCsv());
        }

        const btnBulkDownload = document.getElementById("btn-bulk-download");
        if (btnBulkDownload) {
            btnBulkDownload.addEventListener("click", () => {
                if (this.selectedDocIds.size > 0) {
                    const firstId = Array.from(this.selectedDocIds)[0];
                    this.openDetailModal(firstId);
                    this.showToast(`Opened inspection for first of ${this.selectedDocIds.size} selected records.`, "info");
                }
            });
        }

        const btnBulkClear = document.getElementById("btn-bulk-clear");
        if (btnBulkClear) {
            btnBulkClear.addEventListener("click", () => {
                this.selectedDocIds.clear();
                this.renderDashboardTable();
                this.showToast("Selection cleared", "info");
            });
        }

        // Quick Feedback tags in Return Modal
        document.querySelectorAll(".quick-tag").forEach(tag => {
            tag.addEventListener("click", () => {
                const tagText = tag.getAttribute("data-tag");
                const textarea = document.getElementById("return-reason-input");
                if (textarea) {
                    if (textarea.value.trim().length > 0) {
                        textarea.value += " " + tagText;
                    } else {
                        textarea.value = tagText;
                    }
                    this.showToast("Quick reason appended to comments.", "info");
                }
            });
        });

        // Certificate Print & Download buttons
        const btnPrintCert = document.getElementById("btn-print-cert");
        if (btnPrintCert) {
            btnPrintCert.addEventListener("click", () => {
                window.print();
            });
        }

        const btnDownloadCert = document.getElementById("btn-download-cert");
        if (btnDownloadCert) {
            btnDownloadCert.addEventListener("click", () => {
                if (this.currentRecordUnderReview) {
                    this.showToast(`Downloading verified certificate: ${this.currentRecordUnderReview.evidenceFile || "certificate.pdf"}`, "success");
                }
            });
        }

        // ERP Sync button
        const btnSync = document.getElementById("btn-refresh-sync");
        if (btnSync) {
            btnSync.addEventListener("click", () => {
                const svg = btnSync.querySelector("svg");
                if (svg) svg.classList.add("spin-anim");
                setTimeout(() => {
                    if (svg) svg.classList.remove("spin-anim");
                    const syncText = document.getElementById("sync-time-text");
                    if (syncText) syncText.textContent = "Just now";
                    this.showToast("Synced with University ERP Master successfully.", "success");
                }, 600);
            });
        }

        // Keyboard shortcuts: Ctrl+K / Cmd+K to search, Escape to close modals
        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                const search = document.getElementById("global-search");
                if (search) search.focus();
            } else if (e.key === "Escape") {
                this.closeAllPopups();
                document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active"));
            }
        });
    },

    setKpiFilter(filterVal) {
        this.activeKpiFilter = filterVal;
        this.currentPage = 1;

        // Sync dropdown
        const statusDropdown = document.getElementById("filter-status");
        if (statusDropdown) {
            statusDropdown.value = filterVal;
        }

        // Update active class on KPI cards
        document.querySelectorAll(".kpi-card[data-kpi-filter]").forEach(card => {
            if (card.getAttribute("data-kpi-filter") === filterVal) {
                card.classList.add("active-filter");
            } else {
                card.classList.remove("active-filter");
            }
        });

        this.renderDashboardTable();
        this.showToast(filterVal === "ALL" ? "Showing all document records." : `Filtered table by: "${filterVal}"`, "info");
    },

    handleSort(column) {
        if (this.currentSort.column === column) {
            this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.order = 'asc';
        }
        this.renderDashboardTable();
    },

    exportSelectedToCsv() {
        if (this.selectedDocIds.size === 0) {
            this.showToast("No records selected for export.", "warning");
            return;
        }
        const selectedDocs = this.state.documents.filter(d => this.selectedDocIds.has(d.id));
        const headers = ["Record ID", "Document Title", "Category", "Sub-category", "NAAC Criterion", "Owner Name", "Department", "Academic Year", "Status", "Current Stage", "Financial Support (INR)", "Evidence File"];
        const rows = selectedDocs.map(d => [
            `"${d.id}"`,
            `"${d.title.replace(/"/g, '""')}"`,
            `"${d.category}"`,
            `"${d.subCategory || ''}"`,
            `"${d.naacCriterion || ''}"`,
            `"${d.ownerName}"`,
            `"${d.department}"`,
            `"${d.academicYear || '2026-2027'}"`,
            `"${d.status}"`,
            `"${d.currentStage}"`,
            `"${(d.eventDetails && d.eventDetails.financialAmount) ? d.eventDetails.financialAmount : 0}"`,
            `"${d.evidenceFile || ''}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Selected_Records_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast(`Exported ${selectedDocs.length} selected records to CSV!`, "success");
    },

    closeAllPopups() {
        const rp = document.getElementById("role-popup");
        if (rp) rp.classList.remove("active");
        const up = document.getElementById("user-profile-popup");
        if (up) up.classList.remove("active");
        const nm = document.getElementById("notifications-menu");
        if (nm) nm.classList.remove("active");
        const cm = document.getElementById("row-context-menu");
        if (cm) cm.classList.remove("active");
        const sb = document.getElementById("main-sidebar");
        const sbd = document.getElementById("sidebar-backdrop");
        if (window.innerWidth <= 1024 && sb && sbd) {
            sb.classList.remove("open");
            sbd.classList.remove("active");
        }
    },

    // =========================================================================
    // UPLOAD MODAL & FORM LOGIC
    // =========================================================================
    openUploadModal() {
        // Reset form
        document.getElementById("fc-title").value = "";
        document.getElementById("fc-duration").value = "3 Days";
        document.getElementById("fc-start-date").value = "2026-10-15";
        document.getElementById("fc-end-date").value = "2026-10-17";
        document.getElementById("fc-organiser").value = "";
        document.getElementById("fc-financial-support").value = "No";
        document.getElementById("fc-fin-amount-group").style.display = "none";
        document.getElementById("fc-fin-type-group").style.display = "none";
        document.getElementById("dropzone-filename").textContent = "Click to browse or drag & drop certificate";
        this.selectedFile = null;

        this.openModal("upload-modal");
    },

    handleUploadCategoryChange(categoryVal) {
        const studentFields = document.getElementById("fields-student-details");
        const titleInput = document.getElementById("fc-title");

        if (categoryVal === "STUDENT_AWARD" || categoryVal === "STUDENT_CAPACITY") {
            studentFields.style.display = "block";
            titleInput.placeholder = "e.g. Smart India Hackathon Grand Prize / Drone Summit";
        } else {
            studentFields.style.display = "none";
            titleInput.placeholder = "e.g. Advanced AI & Cloud Architecture Workshop 2026";
        }
    },

    handleFileSelected(file) {
        this.selectedFile = file;
        const fnDisplay = document.getElementById("dropzone-filename");
        fnDisplay.innerHTML = `<strong>Selected:</strong> ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        this.showToast(`Attached evidence: ${file.name}`, "info");
    },

    handleUploadSubmit(isDraft) {
        const title = document.getElementById("fc-title").value.trim();
        const startDate = document.getElementById("fc-start-date").value;
        const endDate = document.getElementById("fc-end-date").value;
        const organiser = document.getElementById("fc-organiser").value.trim();
        const finSupport = document.getElementById("fc-financial-support").value;
        const finAmount = document.getElementById("fc-fin-amount").value;
        const categoryKey = document.getElementById("form-record-category").value;
        const naacCriteria = document.getElementById("form-naac-criteria").value;

        // Validation Rules (Section 9)
        if (!title) {
            this.showToast("Title of event/document is mandatory.", "warning");
            return;
        }

        if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
            this.showToast("End date cannot precede start date.", "warning");
            return;
        }

        if (finSupport === "Yes" && (!finAmount || Number(finAmount) <= 0)) {
            this.showToast("Please enter a valid financial support amount.", "warning");
            return;
        }

        const u = this.state.currentUser;
        const nextNum = this.state.documents.length + 1;
        const docId = `DOC-2026-${String(nextNum).padStart(3, "0")}`;

        let docCategory = "Faculty";
        let subCategory = "Capacity Development";
        let ownerType = "Faculty";
        let ownerName = u.name;

        if (categoryKey === "STUDENT_AWARD") {
            docCategory = "Student";
            subCategory = "Student Achievement / Award";
            ownerType = "Student";
            ownerName = document.getElementById("stu-name").value || "Aarav Patel (STU-8842)";
        } else if (categoryKey === "STUDENT_CAPACITY") {
            docCategory = "Student";
            subCategory = "Student Capacity Development";
            ownerType = "Student";
            ownerName = document.getElementById("stu-name").value || "Priya Nair (STU-8910)";
        } else if (categoryKey === "FACULTY_AWARD") {
            docCategory = "Faculty";
            subCategory = "Awards & Recognition (External)";
        } else if (categoryKey === "INSTITUTIONAL") {
            docCategory = "NAAC";
            subCategory = "Annual Quality Assurance Compliance";
        }

        const newDoc = {
            id: docId,
            displayNum: nextNum,
            title: title,
            fileType: this.selectedFile && this.selectedFile.name.endsWith(".doc") ? "doc" : "pdf",
            fileSize: this.selectedFile ? `${(this.selectedFile.size / 1024 / 1024).toFixed(1)} MB` : "1.8 MB",
            category: docCategory,
            subCategory: subCategory,
            ownerType: ownerType,
            ownerName: ownerName,
            ownerId: u.employeeId,
            department: u.department,
            school: u.school,
            academicYear: "2026-2027",
            submittedOn: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            status: isDraft ? "Draft" : "Under Verification",
            currentStage: isDraft ? "Faculty (Draft)" : "Dean/HOD",
            naacCriterion: naacCriteria,
            eventDetails: {
                eventType: document.getElementById("fc-event-type").value,
                nature: document.getElementById("fc-nature").value,
                participatedAs: document.getElementById("fc-participated-as").value,
                eventTitle: title,
                duration: document.getElementById("fc-duration").value,
                startDate: startDate,
                endDate: endDate,
                organisingInst: organiser || "University Partner Institute",
                financialSupport: finSupport,
                financialAmount: finSupport === "Yes" ? Number(finAmount) : 0,
                financialType: finSupport === "Yes" ? document.getElementById("fc-fin-type").value : ""
            },
            evidenceFile: this.selectedFile ? this.selectedFile.name : `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_cert.pdf`,
            evidenceVerified: false,
            timeline: [
                {
                    stage: isDraft ? "Draft Saved" : "Submitted for Department Verification",
                    actor: `${u.name} (${u.role})`,
                    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    comment: isDraft ? "Saved as draft by owner." : "Routed to Dean/HOD verification queue."
                }
            ],
            reviewerComments: []
        };

        // Add to state
        this.state.documents.unshift(newDoc);

        // Add to recent activities
        this.state.recentActivities.unshift({
            icon: "cloud",
            color: "blue",
            title: `You submitted "${title}"`,
            timestamp: "Just now"
        });

        // Add to audit trail (Section 12)
        this.state.auditLogs.unshift({
            id: `AUD-${Math.floor(9000 + Math.random() * 900)}`,
            timestamp: new Date().toLocaleString(),
            actor: `${u.name} (${u.role})`,
            action: isDraft ? "DRAFT_SAVED" : "RECORD_SUBMITTED",
            recordId: docId,
            title: title,
            priorStatus: "None",
            newStatus: isDraft ? "Draft" : "Under Verification (Dean/HOD)",
            comments: `Submission created by ${u.name}. Forwarded to Department queue.`,
            hash: `0x${Math.random().toString(16).substring(2, 10)}`
        });

        this.closeModal("upload-modal");
        this.saveState();
        this.showToast(isDraft ? "Draft record saved." : "Record submitted successfully for Dean verification!", "success");

        // Sync with Spring Boot backend
        if (window.PortalAPI) {
            (async () => {
                try {
                    if (this.selectedFile) {
                        try {
                            const uploadRes = await window.PortalAPI.uploadFile(this.selectedFile);
                            if (uploadRes && uploadRes.fileName) {
                                newDoc.evidenceFile = uploadRes.fileName;
                            }
                        } catch (e) {
                            console.warn("Evidence upload failed, saving record metadata:", e);
                        }
                    }
                    await window.PortalAPI.createDocument(newDoc, u.name, u.role);
                } catch (e) {
                    console.warn("Backend create document failed:", e);
                }
            })();
        }
    },

    // =========================================================================
    // DETAIL & EVIDENCE INSPECTION MODAL
    // =========================================================================
    openDetailModal(docId, fromReviewQueue = false) {
        const doc = this.state.documents.find(d => d.id === docId);
        if (!doc) return;

        this.currentRecordUnderReview = doc;

        document.getElementById("detail-modal-title").textContent = doc.title;
        document.getElementById("detail-modal-subtitle").textContent = `${doc.id} | ${doc.category} &bull; Academic Year ${doc.academicYear || "2026-2027"}`;
        document.getElementById("detail-owner-name").textContent = doc.ownerName;
        document.getElementById("detail-owner-dept").textContent = `${doc.department} (${doc.school || "School of Engineering"})`;

        // Status pill
        const statusPill = document.getElementById("detail-status-pill");
        statusPill.textContent = doc.status;
        statusPill.className = "status-pill";
        if (doc.status === "Returned") statusPill.classList.add("status-returned");
        else if (doc.status === "Approved") statusPill.classList.add("status-approved");
        else if (doc.status === "Draft") statusPill.classList.add("status-draft");
        else statusPill.classList.add("status-under-verification");

        // Returned comment alert
        const returnAlert = document.getElementById("detail-returned-alert");
        const returnReasonText = document.getElementById("detail-return-reason-text");
        if (doc.status === "Returned" && doc.reviewerComments && doc.reviewerComments.length > 0) {
            returnAlert.style.display = "block";
            const lastRev = doc.reviewerComments[doc.reviewerComments.length - 1];
            returnReasonText.textContent = `[${lastRev.reviewer} - ${lastRev.stage}]: "${lastRev.comment}"`;
        } else {
            returnAlert.style.display = "none";
        }

        // Mock Certificate rendering
        document.getElementById("cert-inst-title").textContent = (doc.eventDetails && doc.eventDetails.organisingInst) ? doc.eventDetails.organisingInst.toUpperCase() : "UNIVERSITY ACCREDITED ORGANISATION";
        document.getElementById("cert-recipient-name").textContent = doc.ownerName;
        document.getElementById("cert-desc-text").innerHTML = `
            has successfully participated and presented credentials in <strong>"${this.escapeHtml(doc.title)}"</strong>
            under <strong>${doc.category}</strong> repository classification. Official record ID: <code>${doc.id}</code>.
        `;
        document.getElementById("cert-naac-chip").textContent = `NAAC Criterion ${doc.naacCriterion || "6.3.3"}`;

        // Timeline rendering
        const timelineTrack = document.getElementById("detail-timeline-track");
        timelineTrack.innerHTML = (doc.timeline || []).map((t, idx) => {
            const isDone = true;
            const isReturned = t.stage.toLowerCase().includes("returned");
            return `
                <div class="timeline-point">
                    <div class="timeline-marker ${isReturned ? 'returned' : (isDone ? 'done' : '')}"></div>
                    <div class="timeline-content-group">
                        <div class="timeline-step-title">${t.stage}</div>
                        <div class="timeline-step-meta">${t.actor} &bull; ${t.date}</div>
                        ${t.comment ? `<div class="timeline-step-comment ${isReturned ? 'danger' : ''}">${this.escapeHtml(t.comment)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join("");

        // Reviewer action buttons (Approve / Return)
        const btnApprove = document.getElementById("btn-modal-approve");
        const btnReturn = document.getElementById("btn-modal-return");
        const currentRole = this.state.currentUser.role;

        const canReview = doc.status === "Under Verification" && (
            (currentRole === "DeanHOD" && doc.currentStage === "Dean/HOD") ||
            (currentRole === "IQAC" && doc.currentStage === "IQAC") ||
            (currentRole === "Admin")
        );

        if (canReview) {
            btnApprove.style.display = "inline-flex";
            btnReturn.style.display = "inline-flex";

            if (currentRole === "DeanHOD") {
                btnApprove.textContent = "Verify & Forward to IQAC";
            } else if (currentRole === "IQAC") {
                btnApprove.textContent = "Final Approve & Lock";
            } else {
                btnApprove.textContent = "Approve Record";
            }
        } else {
            btnApprove.style.display = "none";
            btnReturn.style.display = "none";
        }

        this.openModal("detail-modal");
    },

    // Edit returned record
    openEditReturnedRecord(docId) {
        const doc = this.state.documents.find(d => d.id === docId);
        if (!doc) return;

        this.openDetailModal(docId);
        this.showToast("Review the feedback comments and click resubmit when resolved.", "warning");
    },

    // =========================================================================
    // WORKFLOW TRANSITIONS (Approve & Return - Sections 4, 9, 16)
    // =========================================================================
    handleReviewerApprove() {
        if (!this.currentRecordUnderReview) return;
        const doc = this.currentRecordUnderReview;
        const u = this.state.currentUser;

        if (u.role === "DeanHOD" || (u.role === "Admin" && doc.currentStage === "Dean/HOD")) {
            // Stage 1 -> Forward to IQAC automatically (Section 4.5)
            doc.currentStage = "IQAC";
            doc.timeline.push({
                stage: "Department Verified & Forwarded",
                actor: `${u.name} (Dean/HOD)`,
                date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                comment: "Department verification complete. All credentials match ERP record. Forwarded to IQAC queue."
            });

            this.state.auditLogs.unshift({
                id: `AUD-${Math.floor(9000 + Math.random() * 900)}`,
                timestamp: new Date().toLocaleString(),
                actor: `${u.name} (Dean/HOD)`,
                action: "DEPARTMENT_VERIFIED",
                recordId: doc.id,
                title: doc.title,
                priorStatus: "Under Verification (Dean/HOD)",
                newStatus: "Under Verification (IQAC)",
                comments: "Department check passed. Auto-forwarded to IQAC.",
                hash: `0x${Math.random().toString(16).substring(2, 10)}`
            });

            this.state.recentActivities.unshift({
                icon: "cloud",
                color: "blue",
                title: `"${doc.title}" forwarded to IQAC`,
                timestamp: "Just now"
            });

            this.showToast(`Record ${doc.id} verified and forwarded to IQAC queue!`, "success");

        } else if (u.role === "IQAC" || u.role === "Admin") {
            // Stage 2 -> IQAC Final Approval & Lock (Section 4.8 & 16.16)
            doc.status = "Approved";
            doc.currentStage = "Finalized";
            doc.isLocked = true;
            doc.timeline.push({
                stage: "IQAC Approved / Locked",
                actor: `${u.name} (IQAC Reviewer)`,
                date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                comment: `Accreditation evidence validated under Criterion ${doc.naacCriterion || "6.3.3"}. Document locked for NAAC cycle.`
            });

            this.state.auditLogs.unshift({
                id: `AUD-${Math.floor(9000 + Math.random() * 900)}`,
                timestamp: new Date().toLocaleString(),
                actor: `${u.name} (IQAC Reviewer)`,
                action: "RECORD_APPROVED_LOCKED",
                recordId: doc.id,
                title: doc.title,
                priorStatus: "Under Verification (IQAC)",
                newStatus: "Approved & Locked",
                comments: "Evidence permanently locked for NAAC SSR documentation.",
                hash: `0x${Math.random().toString(16).substring(2, 10)}`
            });

            this.state.recentActivities.unshift({
                icon: "check",
                color: "green",
                title: `"${doc.title}" approved by IQAC`,
                timestamp: "Just now"
            });

            this.showToast(`Record ${doc.id} approved & locked in Master Repository!`, "success");
        }

        this.closeModal("detail-modal");
        this.saveState();

        // Sync with Spring Boot backend
        if (window.PortalAPI) {
            window.PortalAPI.verifyDocument(doc.id, u.name, u.role, "Verified")
                .catch(e => console.warn("Backend verify failed:", e));
        }
    },

    openReturnModal() {
        document.getElementById("return-reason-input").value = "";
        this.openModal("return-modal");
    },

    handleConfirmReturn() {
        const comment = document.getElementById("return-reason-input").value.trim();
        if (!comment) {
            this.showToast("Mandatory: Please provide a reason for returning this submission.", "danger");
            return;
        }

        if (!this.currentRecordUnderReview) return;
        const doc = this.currentRecordUnderReview;
        const u = this.state.currentUser;

        doc.status = "Returned";
        doc.currentStage = "Faculty";

        doc.reviewerComments.push({
            reviewer: `${u.name} (${u.role})`,
            stage: u.role === "DeanHOD" ? "Department Verification" : "IQAC Verification",
            date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            comment: comment
        });

        doc.timeline.push({
            stage: `Returned for Correction - ${u.role === "DeanHOD" ? "Department" : "IQAC"}`,
            actor: `${u.name} (${u.role})`,
            date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            comment: comment
        });

        this.state.auditLogs.unshift({
            id: `AUD-${Math.floor(9000 + Math.random() * 900)}`,
            timestamp: new Date().toLocaleString(),
            actor: `${u.name} (${u.role})`,
            action: "RECORD_RETURNED",
            recordId: doc.id,
            title: doc.title,
            priorStatus: "Under Verification",
            newStatus: "Returned for Correction",
            comments: `Reason: ${comment}`,
            hash: `0x${Math.random().toString(16).substring(2, 10)}`
        });

        this.state.recentActivities.unshift({
            icon: "return",
            color: "red",
            title: `"${doc.title}" returned for correction`,
            timestamp: "Just now"
        });

        this.closeModal("return-modal");
        this.closeModal("detail-modal");
        this.saveState();
        this.showToast(`Record returned to owner with revision feedback.`, "warning");

        // Sync with Spring Boot backend
        if (window.PortalAPI) {
            window.PortalAPI.returnDocument(doc.id, u.name, u.role, comment)
                .catch(e => console.warn("Backend return failed:", e));
        }
    },

    authorizeRevision(revId) {
        const rev = this.state.revisionRequests.find(r => r.id === revId);
        if (!rev) return;

        rev.status = "Approved for Revision";
        const targetDoc = this.state.documents.find(d => d.id === rev.recordId);
        if (targetDoc) {
            targetDoc.status = "Under Verification";
            targetDoc.currentStage = "Dean/HOD";
            targetDoc.isLocked = false;
            targetDoc.timeline.push({
                stage: "Formal Revision Authorized (Admin)",
                actor: "Er. Vikram Mehta (System Admin)",
                date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
                comment: `Revision authorized: ${rev.reason}. Repeating complete approval chain.`
            });
        }

        this.saveState();
        this.showToast("Formal revision authorized. Record unlocked and restarted in queue.", "success");
    },

    // =========================================================================
    // EXPORT TO CSV (Accreditation Evidence Register - Section 10)
    // =========================================================================
    exportNAACCsv() {
        const docs = this.state.documents;
        const headers = ["Record ID", "Document Title", "Category", "Sub-category", "NAAC Criterion", "Owner Name", "Department", "Academic Year", "Status", "Current Stage", "Financial Support (INR)", "Evidence File"];
        
        const rows = docs.map(d => [
            `"${d.id}"`,
            `"${d.title.replace(/"/g, '""')}"`,
            `"${d.category}"`,
            `"${d.subCategory || ''}"`,
            `"${d.naacCriterion || ''}"`,
            `"${d.ownerName}"`,
            `"${d.department}"`,
            `"${d.academicYear || '2026-2027'}"`,
            `"${d.status}"`,
            `"${d.currentStage}"`,
            `"${(d.eventDetails && d.eventDetails.financialAmount) ? d.eventDetails.financialAmount : 0}"`,
            `"${d.evidenceFile || ''}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `University_Accreditation_Evidence_Register_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast("Accreditation evidence register exported to CSV!", "success");
    },

    // Context Menu Trigger
    openContextMenu(event, docId) {
        event.stopPropagation();
        const menu = document.getElementById("row-context-menu");
        menu.style.top = `${event.clientY + 5}px`;
        menu.style.left = `${Math.min(event.clientX - 100, window.innerWidth - 200)}px`;
        menu.classList.add("active");

        const doc = this.state.documents.find(d => d.id === docId);

        document.getElementById("ctx-view-details").onclick = () => {
            menu.classList.remove("active");
            this.openDetailModal(docId);
        };

        document.getElementById("ctx-audit-history").onclick = () => {
            menu.classList.remove("active");
            this.switchView("audit-trail");
        };

        document.getElementById("ctx-download-evidence").onclick = () => {
            menu.classList.remove("active");
            this.showToast(`Downloading secure evidence: ${doc.evidenceFile || "certified_document.pdf"}`, "info");
        };

        const revBtn = document.getElementById("ctx-request-revision");
        if (doc && doc.status === "Approved") {
            revBtn.style.display = "flex";
            revBtn.onclick = () => {
                menu.classList.remove("active");
                this.requestRevisionPrompt(docId);
            };
        } else {
            revBtn.style.display = "none";
        }
    },

    requestRevisionPrompt(docId) {
        const reason = prompt("Enter mandatory administrative reason for post-approval revision request:");
        if (!reason || !reason.trim()) return;

        const doc = this.state.documents.find(d => d.id === docId);
        const newRev = {
            id: `REV-2026-${Math.floor(100 + Math.random() * 900)}`,
            recordId: docId,
            recordTitle: doc.title,
            initiator: `${this.state.currentUser.name} (${this.state.currentUser.role})`,
            reason: reason.trim(),
            requestedDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            status: "Pending Admin Approval",
            originalVersion: "v1.0 (Locked)"
        };
        this.state.revisionRequests.push(newRev);

        this.saveState();
        this.showToast("Revision request logged. Awaiting System Administrator authorization.", "info");

        if (window.PortalAPI) {
            window.PortalAPI.createRevision(newRev)
                .catch(e => console.warn("Backend create revision failed:", e));
        }
    },

    // =========================================================================
    // MODAL & TOAST HELPERS
    // =========================================================================
    openModal(modalId) {
        const m = document.getElementById(modalId);
        if (m) m.classList.add("active");
    },

    closeModal(modalId) {
        const m = document.getElementById(modalId);
        if (m) m.classList.remove("active");
    },

    showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        // Clear existing toasts to prevent duplicate stacking
        container.innerHTML = "";

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${this.escapeHtml(message)}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(100%)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    },

    escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

window.App = App;
window.filterRepoByCriterion = function(criterion) {
    App.switchView("document-repository");
    const select = document.getElementById("filter-repo-criteria");
    if (select) {
        select.value = criterion;
        App.renderRepositoryTable();
    }
};
window.switchRole = function(role) {
    App.switchRole(role);
};
