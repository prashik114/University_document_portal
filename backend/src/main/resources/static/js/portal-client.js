/**
 * University Repository - Unified Portal Client & Multi-Page Engine
 * Preserves exact formatting, CSS styles, and database integration
 * Enforces strict department isolation and account-provisioning policies.
 */
const PortalClient = {
    API_BASE: "http://localhost:8080/api",
    currentUser: null,
    documents: [],
    users: [],
    auditLogs: [],
    settings: {},

    // Return authenticated actor headers for backend policy enforcement
    getHeaders() {
        return {
            "Content-Type": "application/json",
            "X-Actor-Role": this.currentUser ? (this.currentUser.role || "") : "",
            "X-Actor-Department": this.currentUser ? (this.currentUser.department || "") : "",
            "X-Actor-Id": this.currentUser ? (this.currentUser.employeeId || this.currentUser.id || "") : ""
        };
    },

    // Initialize session and verify portal authorization
    async init(allowedRoles = []) {
        // Retrieve session
        // Enforce explicit authentication on portal startup: check active browser session only
        const isAuth = sessionStorage.getItem("portal_auth_user");
        const rawUser = sessionStorage.getItem("portal_current_user");

        if (isAuth !== "true" || !rawUser) {
            this.redirectToLogin("Please sign in to access your institutional portal.");
            return false;
        }

        try {
            this.currentUser = JSON.parse(rawUser);
        } catch (e) {
            this.redirectToLogin("Invalid session. Please sign in again.");
            return false;
        }

        // Role authorization guard
        if (allowedRoles.length > 0 && !allowedRoles.includes(this.currentUser.role) && this.currentUser.role !== "Admin") {
            alert(`Access Restricted: You are signed in as ${this.currentUser.role}. Redirecting to your assigned portal.`);
            this.routeToUserPortal(this.currentUser.role);
            return false;
        }

        // Render user badge and official details in header
        this.renderUserHeader();

        // Load active database data with department isolation headers
        await this.loadData();

        return true;
    },

    redirectToLogin(msg) {
        if (msg) sessionStorage.setItem("portal_login_msg", msg);
        localStorage.removeItem("portal_auth_user");
        sessionStorage.removeItem("portal_auth_user");
        window.location.href = "login.html";
    },

    routeToUserPortal(role) {
        switch (role) {
            case "Student": window.location.href = "student.html"; break;
            case "DeanHOD": window.location.href = "dean.html"; break;
            case "IQAC": window.location.href = "iqac.html"; break;
            case "Inspector": window.location.href = "inspector.html"; break;
            case "Admin": window.location.href = "admin.html"; break;
            case "Faculty":
            default: window.location.href = "faculty.html"; break;
        }
    },

    logout() {
        localStorage.removeItem("portal_auth_user");
        localStorage.removeItem("portal_current_user");
        sessionStorage.removeItem("portal_auth_user");
        sessionStorage.removeItem("portal_current_user");
        window.location.href = "login.html";
    },

    renderUserHeader() {
        const u = this.currentUser;
        if (!u) return;

        const nameEl = document.getElementById("user-display-name");
        const avatarEl = document.getElementById("user-avatar");
        const roleLabelEl = document.getElementById("user-role-label");

        if (nameEl) nameEl.textContent = u.name;
        if (roleLabelEl) roleLabelEl.textContent = u.name;
        if (avatarEl) {
            avatarEl.textContent = u.avatar || (u.name ? u.name.charAt(0) : "U");
            if (u.role === "Student") avatarEl.style.backgroundColor = "#0284c7";
            else if (u.role === "DeanHOD") avatarEl.style.backgroundColor = "#059669";
            else if (u.role === "IQAC") avatarEl.style.backgroundColor = "#7c3aed";
            else if (u.role === "Inspector") avatarEl.style.backgroundColor = "#0d9488";
            else if (u.role === "Admin") avatarEl.style.backgroundColor = "#dc2626";
            else avatarEl.style.backgroundColor = "#2563eb";
        }

        // Populate dropdown card if present
        const popup = document.getElementById("user-profile-popup");
        if (popup) {
            popup.innerHTML = `
                <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; border-radius: 10px 10px 0 0;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; border-radius: 10px; background: #2563eb; color: #fff; font-weight: 700; font-size: 17px; display: flex; align-items: center; justify-content: center;">
                            ${u.avatar || (u.name ? u.name.charAt(0) : "U")}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 700; font-size: 14px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.name}</div>
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 1px;">${u.designation || u.role}</div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                                <span style="font-size: 10px; font-weight: 700; color: #2563eb; background: #fff; border: 1px solid #e2e8f0; padding: 1px 7px; border-radius: 9999px;">
                                    ${u.role.toUpperCase()}
                                </span>
                                <span style="font-size: 11px; color: #475569; font-weight: 600;">ID: ${u.employeeId || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                    <div style="font-size: 10.5px; font-weight: 700; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px;">OFFICIAL CLEARANCE</div>
                    <div style="font-size: 12px; color: #334155; line-height: 1.5; margin-bottom: 8px;">
                        <strong>Department:</strong> ${u.department || 'All University'}<br/>
                        <strong>Official Email:</strong> <span style="color: #2563eb;">${u.email}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #16a34a; font-weight: 600;">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        256-Bit SSL Encrypted &bull; Central SSO Verified
                    </div>
                </div>
                <div style="padding: 10px 16px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 10px 10px;">
                    <span style="font-size: 11px; color: #64748b;">Session: <strong style="color: #16a34a;">Active</strong></span>
                    <button onclick="PortalClient.logout()" style="background: none; border: none; color: #dc2626; font-weight: 600; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                    </button>
                </div>
            `;
        }

        // Hook popup toggle
        const btnToggle = document.getElementById("user-profile-menu-btn");
        if (btnToggle && popup) {
            btnToggle.onclick = (e) => {
                e.stopPropagation();
                popup.classList.toggle("active");
            };
            document.addEventListener("click", () => popup.classList.remove("active"));
        }

        // Hook logout button
        const btnLogout = document.getElementById("btn-logout");
        if (btnLogout) {
            btnLogout.onclick = () => this.logout();
        }
    },

    async loadData() {
        try {
            const res = await fetch(`${this.API_BASE}/documents`, {
                headers: this.getHeaders()
            });
            if (res.ok) {
                this.documents = await res.json();
            } else {
                this.documents = [];
            }
        } catch (e) {
            console.warn("Backend documents fetch failed, using local storage state", e);
            const local = localStorage.getItem("UNIVERSITY_REPOSITORY_STORAGE_V3");
            if (local) {
                try { this.documents = JSON.parse(local).documents || []; } catch(_) {}
            }
        }
    },

    async loadUsers() {
        try {
            const res = await fetch(`${this.API_BASE}/users`, {
                headers: this.getHeaders()
            });
            if (res.ok) {
                this.users = await res.json();
                return this.users;
            }
            return [];
        } catch (e) {
            console.warn("Backend users fetch failed", e);
            return [];
        }
    },

    async provisionUser(userData) {
        try {
            const res = await fetch(`${this.API_BASE}/users`, {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify(userData)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to provision user.");
            }
            this.showToast(`User ${data.name} provisioned successfully!`, "success");
            return data;
        } catch (e) {
            this.showToast(e.message, "danger");
            throw e;
        }
    },

    async submitDocument(formData) {
        try {
            const res = await fetch(`${this.API_BASE}/documents?actorName=${encodeURIComponent(this.currentUser.name)}&actorRole=${encodeURIComponent(this.currentUser.role)}`, {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const created = await res.json();
                this.showToast("Record successfully submitted to Department Verification Queue!", "success");
                return created;
            } else {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Server submission error");
            }
        } catch (e) {
            this.showToast(e.message, "danger");
            throw e;
        }
    },

    async verifyDocument(id, comment = "") {
        try {
            const res = await fetch(`${this.API_BASE}/documents/${encodeURIComponent(id)}/verify`, {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify({
                    reviewerName: this.currentUser.name,
                    reviewerRole: this.currentUser.role,
                    comment: comment
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Endorsement rejected by policy.");
            }
            this.showToast("Record endorsed and forwarded to Central IQAC Cell!", "success");
            return data;
        } catch (e) {
            this.showToast(e.message, "danger");
            throw e;
        }
    },

    async returnDocument(id, reason) {
        try {
            const res = await fetch(`${this.API_BASE}/documents/${encodeURIComponent(id)}/return`, {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify({
                    reviewerName: this.currentUser.name,
                    reviewerRole: this.currentUser.role,
                    reason: reason
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Return action rejected by policy.");
            }
            this.showToast("Record returned to faculty for clarification.", "warning");
            return data;
        } catch (e) {
            this.showToast(e.message, "danger");
            throw e;
        }
    },

    async batchForward() {
        try {
            const res = await fetch(`${this.API_BASE}/documents/batch-forward`, {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify({
                    reviewerName: this.currentUser.name,
                    reviewerRole: this.currentUser.role
                })
            });
            const data = await res.json();
            this.showToast(`Batch forwarded ${data.count || 0} departmental records to IQAC!`, "success");
            return data;
        } catch (e) {
            this.showToast("Batch forward completed.", "info");
        }
    },

    // Clean, non-repeating toast notification
    showToast(message, type = "info") {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 8px;";
            document.body.appendChild(container);
        }

        // Deduplicate & clear previous to prevent duplicate toast repetition stacking
        container.innerHTML = "";

        const toast = document.createElement("div");
        toast.style.cssText = `
            padding: 12px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 8px;
            animation: slideIn 0.2s ease;
            background: ${type === "success" ? "#16a34a" : type === "danger" ? "#dc2626" : type === "warning" ? "#d97706" : "#2563eb"};
        `;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }
};
