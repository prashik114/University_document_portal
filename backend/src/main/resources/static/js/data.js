/**
 * University Repository Portal - Data Model & Local Storage Controller
 * Aligned with Repository Portal Development Specification & Functional Requirements
 */

const PERSONAS = {
    Faculty: {
        id: "USR-001",
        name: "Dr. Rajesh Sharma",
        email: "rajesh.sharma@university.edu",
        role: "Faculty",
        roleTitle: "Faculty & Submitter",
        designation: "Associate Professor",
        department: "Computer Science & Engineering",
        school: "School of Computing & Information Technology",
        employeeId: "FAC-CSE-2048",
        avatar: "F",
        badgeClass: "badge-doc",
        description: "Upload personal & student documents, track verification, resubmit returned corrections"
    },
    DeanHOD: {
        id: "USR-002",
        name: "Prof. A. K. Verma",
        email: "ak.verma@university.edu",
        role: "DeanHOD",
        roleTitle: "Dean / HOD Verifier",
        designation: "Head of Department & Professor",
        department: "Computer Science & Engineering",
        school: "School of Computing & Information Technology",
        employeeId: "HOD-CSE-1002",
        avatar: "D",
        badgeClass: "badge-xls",
        description: "Department verification desk, inspect financial vouchers, approve & forward to IQAC, return with reasons"
    },
    IQAC: {
        id: "USR-003",
        name: "Dr. Sunita Rao",
        email: "sunita.rao@university.edu",
        role: "IQAC",
        roleTitle: "IQAC Accreditation Reviewer",
        designation: "Director & Central IQAC Coordinator",
        department: "Internal Quality Assurance Cell",
        school: "Central University Administration",
        employeeId: "IQAC-DIR-004",
        avatar: "I",
        badgeClass: "badge-pdf",
        description: "Audit NAAC criteria compliance, check SSR metrics, generate tamper-evident hashes & lock evidence"
    },
    Admin: {
        id: "USR-004",
        name: "Er. Vikram Mehta",
        email: "admin@university.edu",
        role: "Admin",
        roleTitle: "Repository Administrator",
        designation: "Chief Systems & Governance Administrator",
        department: "Central IT & Institutional Governance",
        school: "University Administration",
        employeeId: "ADM-SYS-001",
        avatar: "A",
        badgeClass: "badge-admin",
        description: "Manage academic cycles, authorize post-approval revisions, govern user directory & security"
    },
    Inspector: {
        id: "USR-005",
        name: "Dr. M. S. Swaminathan",
        email: "naac.evaluator@naac.gov.in",
        role: "Inspector",
        roleTitle: "NAAC Peer Team Inspector",
        designation: "External Peer Review Team Assessor",
        department: "NAAC Peer Review Committee",
        school: "External Assessment & Accreditation Council",
        employeeId: "EXT-NAAC-881",
        avatar: "E",
        badgeClass: "badge-inspector",
        description: "Read-only access to accredited evidence registers, verified certificates, and institutional SSR reports"
    }
};

const SEED_DATA = {
    currentUser: PERSONAS.Faculty,

    roles: [
        { id: "Faculty", label: "Faculty (Dr. Rajesh Sharma)", badge: "F", desc: "Upload, edit drafts/returned, submit records" },
        { id: "DeanHOD", label: "Dean / HOD (Prof. A. K. Verma)", badge: "D", desc: "Department Verification Queue, Return / Forward to IQAC" },
        { id: "IQAC", label: "IQAC Reviewer (Dr. Sunita Rao)", badge: "I", desc: "Criteria check, accreditation registers, Final Approval & Lock" },
        { id: "Admin", label: "Repository Administrator", badge: "A", desc: "Masters, system config, post-approval revision requests" },
        { id: "Inspector", label: "Inspection / External Auditor", badge: "E", desc: "Read-only access to approved accreditation evidence" }
    ],

    academicYears: [
        { id: "2026-2027", label: "2026-2027 (01 Jul 2026 - 30 Jun 2027)", current: true },
        { id: "2025-2026", label: "2025-2026 (01 Jul 2025 - 30 Jun 2026)", current: false },
        { id: "2024-2025", label: "2024-2025 (01 Jul 2024 - 30 Jun 2025)", current: false },
        { id: "2023-2024", label: "2023-2024 (01 Jul 2023 - 30 Jun 2024)", current: false }
    ],

    departments: [
        { code: "CSE", name: "Computer Science & Engineering", school: "School of Computing & IT" },
        { code: "ECE", name: "Electronics & Communication Engineering", school: "School of Electrical Sciences" },
        { code: "MECH", name: "Mechanical Engineering", school: "School of Mechanical Sciences" },
        { code: "MGMT", name: "Management Studies", school: "School of Business" },
        { code: "BIOTECH", name: "Biotechnology & Bioinformatics", school: "School of Applied Sciences" }
    ],

    naacCriteria: [
        { code: "1.3.2", label: "1.3.2 - Experiential learning through project work/field work/internship" },
        { code: "3.4.2", label: "3.4.2 - Awards and recognitions received for research and extension activities" },
        { code: "3.4.3", label: "3.4.3 - Number of extension and outreach programs conducted" },
        { code: "5.3.1", label: "5.3.1 - Number of awards/medals for outstanding performance in sports/cultural" },
        { code: "5.3.3", label: "5.3.3 - Student participation in capacity development and skill enhancement" },
        { code: "6.3.2", label: "6.3.2 - Financial support to attend conferences / workshops / membership" },
        { code: "6.3.3", label: "6.3.3 - Professional development / administrative training programmes" }
    ],

    settings: {
        activeAcademicYear: "2026-2027",
        ssrLockDate: "2026-11-30",
        autoForwardToIQAC: true,
        requirePreApprovalSlip: true,
        enforceMFA: true,
        storageQuotaGB: 10,
        storageUsedGB: 1.4,
        lastBackupDate: "30 Oct 2026, 02:00 AM"
    },

    users: [
        { id: "USR-001", name: "Dr. Rajesh Sharma", email: "rajesh.sharma@university.edu", role: "Faculty", designation: "Associate Professor", department: "Computer Science & Engineering", employeeId: "FAC-CSE-2048", status: "Active" },
        { id: "USR-002", name: "Prof. A. K. Verma", email: "ak.verma@university.edu", role: "DeanHOD", designation: "Head of Department & Professor", department: "Computer Science & Engineering", employeeId: "HOD-CSE-1002", status: "Active" },
        { id: "USR-003", name: "Dr. Sunita Rao", email: "sunita.rao@university.edu", role: "IQAC", designation: "Director & Central IQAC Coordinator", department: "Internal Quality Assurance Cell", employeeId: "IQAC-DIR-004", status: "Active" },
        { id: "USR-004", name: "Er. Vikram Mehta", email: "admin@university.edu", role: "Admin", designation: "Chief Systems Administrator", department: "Central IT & Institutional Governance", employeeId: "ADM-SYS-001", status: "Active" },
        { id: "USR-005", name: "Dr. M. S. Swaminathan", email: "naac.evaluator@naac.gov.in", role: "Inspector", designation: "NAAC Peer Team Lead Assessor", department: "External Peer Review Committee", employeeId: "EXT-NAAC-881", status: "Active" },
        { id: "USR-006", name: "Dr. Ananya Sen", email: "ananya.sen@university.edu", role: "Faculty", designation: "Assistant Professor", department: "Computer Science & Engineering", employeeId: "FAC-CSE-2089", status: "Active" },
        { id: "USR-007", name: "Prof. R. K. Mukherjee", email: "rk.mukherjee@university.edu", role: "DeanHOD", designation: "Dean & Professor", department: "Electronics & Communication Engineering", employeeId: "HOD-ECE-1005", status: "Active" },
        { id: "USR-008", name: "Dr. Shalini Verma", email: "shalini.verma@university.edu", role: "Faculty", designation: "Associate Professor", department: "Management Studies", employeeId: "FAC-MGMT-1402", status: "Active" },
        { id: "USR-009", name: "Prof. Vivek Chawla", email: "v.chawla@university.edu", role: "DeanHOD", designation: "Head of Department", department: "Mechanical Engineering", employeeId: "HOD-MECH-1008", status: "Active" },
        { id: "USR-010", name: "Dr. Kavita Deshmukh", email: "kavita.d@university.edu", role: "Faculty", designation: "Assistant Professor", department: "Biotechnology & Bioinformatics", employeeId: "FAC-BIO-1120", status: "Active" },
        { id: "USR-011", name: "Aarav Patel", email: "aarav.p@student.university.edu", role: "Faculty", designation: "Student Representative (B.Tech)", department: "Computer Science & Engineering", employeeId: "STU-CSE-8842", status: "Active" },
        { id: "USR-012", name: "Priya Nair", email: "priya.n@student.university.edu", role: "Faculty", designation: "Research Scholar", department: "Computer Science & Engineering", employeeId: "STU-CSE-8910", status: "Active" }
    ],

    documents: [],
    recentActivities: [],
    auditLogs: [],
    revisionRequests: []
};

// Storage helper
const DB = {
    KEY: "UNIVERSITY_REPOSITORY_STORAGE_V2",
    get() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (!raw) {
                this.save(SEED_DATA);
                return JSON.parse(JSON.stringify(SEED_DATA));
            }
            const data = JSON.parse(raw);
            if (!data.users || data.users.length < 10) {
                this.save(SEED_DATA);
                return JSON.parse(JSON.stringify(SEED_DATA));
            }
            // Auto-clean legacy mock data
            if (data.documents && data.documents.some(d => d.id && d.id.startsWith('DOC-2026-00'))) {
                data.documents = [];
                data.auditLogs = [];
                data.recentActivities = [];
                data.revisionRequests = [];
                this.save(data);
            }
            return data;
        } catch (e) {
            console.error("Storage read failed, falling back to seed", e);
            return JSON.parse(JSON.stringify(SEED_DATA));
        }
    },
    save(data) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Storage save failed", e);
        }
    },
    reset() {
        this.save(SEED_DATA);
        return JSON.parse(JSON.stringify(SEED_DATA));
    }
};

// Real Spring Boot + PostgreSQL Backend API Client
const PortalAPI = {
    baseUrl: (typeof window !== 'undefined' && window.location && window.location.port === '8080')
        ? '/api'
        : 'http://localhost:8080/api',
    isOnline: false,

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = options.headers || {};
        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        try {
            const res = await fetch(url, { ...options, headers });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errText}`);
            }
            this.isOnline = true;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return await res.json();
            }
            return await res.text();
        } catch (err) {
            console.warn(`[PortalAPI] Call failed to ${endpoint}:`, err.message);
            throw err;
        }
    },

    async getState() {
        try {
            const data = await this.request('/state');
            this.isOnline = true;
            return data;
        } catch (e) {
            this.isOnline = false;
            return null;
        }
    },

    async login(email, role) {
        return await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, role })
        });
    },

    async createDocument(doc, actorName, actorRole) {
        // Prepare doc payload for Spring Boot DocumentEntity
        const payload = {
            id: doc.id,
            displayNum: doc.displayNum,
            title: doc.title,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            category: doc.category,
            subCategory: doc.subCategory,
            ownerType: doc.ownerType,
            ownerName: doc.ownerName,
            ownerId: doc.ownerId,
            recordedByFaculty: doc.recordedByFaculty,
            department: doc.department,
            school: doc.school,
            academicYear: doc.academicYear,
            submittedOn: doc.submittedOn,
            status: doc.status,
            currentStage: doc.currentStage,
            naacCriterion: doc.naacCriterion,
            evidenceFile: doc.evidenceFile,
            evidenceVerified: doc.evidenceVerified,
            isLocked: doc.isLocked,
            eventDetailsJson: typeof doc.eventDetails === 'object' ? JSON.stringify(doc.eventDetails) : (doc.eventDetailsJson || '{}'),
            timelineJson: Array.isArray(doc.timeline) ? JSON.stringify(doc.timeline) : (doc.timelineJson || '[]'),
            reviewerCommentsJson: Array.isArray(doc.reviewerComments) ? JSON.stringify(doc.reviewerComments) : (doc.reviewerCommentsJson || '[]')
        };
        const query = `?actorName=${encodeURIComponent(actorName || '')}&actorRole=${encodeURIComponent(actorRole || '')}`;
        return await this.request(`/documents${query}`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async verifyDocument(id, reviewerName, reviewerRole, comment) {
        return await this.request(`/documents/${encodeURIComponent(id)}/verify`, {
            method: 'POST',
            body: JSON.stringify({ reviewerName, reviewerRole, comment })
        });
    },

    async returnDocument(id, reviewerName, reviewerRole, reason) {
        return await this.request(`/documents/${encodeURIComponent(id)}/return`, {
            method: 'POST',
            body: JSON.stringify({ reviewerName, reviewerRole, reason })
        });
    },

    async lockDocument(id, reviewerName, reviewerRole) {
        return await this.request(`/documents/${encodeURIComponent(id)}/lock`, {
            method: 'POST',
            body: JSON.stringify({ reviewerName, reviewerRole })
        });
    },

    async batchForward(actorName, actorRole) {
        return await this.request('/documents/batch-forward', {
            method: 'POST',
            body: JSON.stringify({ actorName, actorRole })
        });
    },

    async batchLock(actorName, actorRole) {
        return await this.request('/documents/batch-lock', {
            method: 'POST',
            body: JSON.stringify({ actorName, actorRole })
        });
    },

    async uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file);
        return await this.request('/files/upload', {
            method: 'POST',
            body: formData
        });
    },

    async createUser(user) {
        return await this.request('/users', {
            method: 'POST',
            body: JSON.stringify(user)
        });
    },

    async createRevision(rev) {
        return await this.request('/revisions', {
            method: 'POST',
            body: JSON.stringify(rev)
        });
    },

    async authorizeRevision(id) {
        return await this.request(`/revisions/${encodeURIComponent(id)}/authorize`, {
            method: 'POST'
        });
    },

    async rejectRevision(id) {
        return await this.request(`/revisions/${encodeURIComponent(id)}/reject`, {
            method: 'POST'
        });
    },

    async resetDatabase() {
        return await this.request('/state/reset', {
            method: 'POST'
        });
    }
};

window.PERSONAS = PERSONAS;
window.SEED_DATA = SEED_DATA;
window.DB = DB;
window.PortalAPI = PortalAPI;
