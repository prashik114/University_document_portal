-- ==============================================================================
-- University Document & Accreditation Repository - Supabase PostgreSQL Schema
-- Database Host: Supabase (Project: ctagsjgwouysglkrnkay)
-- ==============================================================================

-- 1. Enable UUID Extension (Optional, useful for Supabase auth integration)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLE 1: portal_users (Official Institutional User Directory)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.portal_users (
    id VARCHAR(50) PRIMARY KEY, -- e.g. USR-001
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL, -- Faculty, DeanHOD, IQAC, Admin, Inspector
    role_title VARCHAR(255),
    designation VARCHAR(255),
    department VARCHAR(255),
    school VARCHAR(255),
    employee_id VARCHAR(50),
    avatar VARCHAR(10),
    badge_class VARCHAR(50),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 2: documents (Core Document & Accreditation Repository)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id VARCHAR(50) PRIMARY KEY, -- e.g. DOC-2026-001
    display_num INT,
    title VARCHAR(500) NOT NULL,
    file_type VARCHAR(20), -- pdf, doc, xls, png, jpg
    file_size VARCHAR(50),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    owner_type VARCHAR(50),
    owner_name VARCHAR(255),
    owner_id VARCHAR(50),
    recorded_by_faculty VARCHAR(255),
    department VARCHAR(255),
    school VARCHAR(255),
    academic_year VARCHAR(50),
    submitted_on VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Under Verification', -- Under Verification, Returned, Approved, Draft
    current_stage VARCHAR(50) DEFAULT 'Dean/HOD', -- Faculty, Dean/HOD, IQAC, Finalized
    naac_criterion VARCHAR(100),
    evidence_file VARCHAR(500),
    evidence_verified BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    event_details_json TEXT, -- Or JSONB
    timeline_json TEXT,       -- Or JSONB
    reviewer_comments_json TEXT, -- Or JSONB
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 3: audit_logs (Immutable Accreditation & Audit Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(50) PRIMARY KEY, -- e.g. AUD-9023
    timestamp VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    record_id VARCHAR(50),
    title VARCHAR(500),
    prior_status VARCHAR(50),
    new_status VARCHAR(50),
    comments TEXT,
    hash VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 4: recent_activities (System Notifications & Audit Feed)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.recent_activities (
    id BIGSERIAL PRIMARY KEY,
    icon VARCHAR(50),
    color VARCHAR(50),
    title TEXT NOT NULL,
    timestamp VARCHAR(100),
    role VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 5: revision_requests (Post-Approval Amendment Governance)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.revision_requests (
    id VARCHAR(50) PRIMARY KEY, -- e.g. REV-2026-001
    record_id VARCHAR(50) NOT NULL,
    record_title VARCHAR(500) NOT NULL,
    initiator VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    reason TEXT NOT NULL,
    requested_date VARCHAR(100),
    status VARCHAR(100) DEFAULT 'Pending Admin Approval', -- Pending Admin Approval, Approved for Revision, Rejected by Admin
    original_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 6: system_settings (System Controls, SSR Lock & Quotas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'DEFAULT',
    active_academic_year VARCHAR(50) DEFAULT '2026-2027',
    ssr_lock_date VARCHAR(50) DEFAULT '2026-11-30',
    auto_forward_to_iqac BOOLEAN DEFAULT TRUE,
    require_pre_approval_slip BOOLEAN DEFAULT TRUE,
    enforce_mfa BOOLEAN DEFAULT TRUE,
    storage_quota_gb DOUBLE PRECISION DEFAULT 10.0,
    storage_used_gb DOUBLE PRECISION DEFAULT 0.0,
    last_backup_date VARCHAR(100) DEFAULT '31 Oct 2026, 02:00 AM'
);

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_current_stage ON public.documents(current_stage);
CREATE INDEX IF NOT EXISTS idx_documents_department ON public.documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_record_id ON public.audit_logs(record_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - PUBLIC ACCESS FOR ANON / AUTHENTICATED
-- ==============================================================================
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow full select & insert/update for anon & authenticated roles
CREATE POLICY "Allow all on portal_users" ON public.portal_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recent_activities" ON public.recent_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on revision_requests" ON public.revision_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- 1. Seed System Settings
INSERT INTO public.system_settings (id, active_academic_year, ssr_lock_date, auto_forward_to_iqac, require_pre_approval_slip, enforce_mfa, storage_quota_gb, storage_used_gb, last_backup_date)
VALUES ('DEFAULT', '2026-2027', '2026-11-30', TRUE, TRUE, TRUE, 10.0, 0.0, '31 Oct 2026, 02:00 AM')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Official Institutional Users
INSERT INTO public.portal_users (id, name, email, role, role_title, designation, department, school, employee_id, avatar, badge_class, description, status)
VALUES
('USR-001', 'Dr. Rajesh Sharma', 'rajesh.sharma@university.edu', 'Faculty', 'Associate Professor (CSE)', 'Associate Professor', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'FAC-CSE-2048', 'F', 'badge-doc', 'Upload personal & student documents, track verification, resubmit corrections', 'Active'),
('USR-002', 'Prof. A. K. Verma', 'ak.verma@university.edu', 'DeanHOD', 'Head of Department (CSE)', 'Head of Department & Professor', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'HOD-CSE-1002', 'D', 'badge-xls', 'Department verification desk, inspect financial vouchers, approve & forward to IQAC', 'Active'),
('USR-003', 'Dr. Sunita Rao', 'sunita.rao@university.edu', 'IQAC', 'Director & Central IQAC Coordinator', 'Director & Central IQAC Coordinator', 'Internal Quality Assurance Cell', 'Central University Administration', 'IQAC-DIR-004', 'I', 'badge-pdf', 'Audit NAAC criteria compliance, check SSR metrics, generate tamper-evident hashes & lock evidence', 'Active'),
('USR-004', 'Er. Vikram Mehta', 'admin@university.edu', 'Admin', 'Repository Administrator', 'Chief Systems & Governance Administrator', 'Central IT & Institutional Governance', 'University Administration', 'ADM-SYS-001', 'A', 'badge-admin', 'Manage academic cycles, authorize post-approval revisions, govern user directory & security', 'Active'),
('USR-005', 'Dr. M. S. Swaminathan', 'naac.evaluator@naac.gov.in', 'Inspector', 'NAAC Peer Team Lead Assessor', 'External Peer Review Team Assessor', 'NAAC Peer Review Committee', 'External Assessment & Accreditation Council', 'EXT-NAAC-881', 'E', 'badge-inspector', 'Read-only access to accredited evidence registers, verified certificates, and institutional SSR reports', 'Active'),
('USR-006', 'Dr. Ananya Sen', 'ananya.sen@university.edu', 'Faculty', 'Assistant Professor (CSE)', 'Assistant Professor', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'FAC-CSE-2089', 'A', 'badge-doc', 'Faculty member CSE, upload research & academic records', 'Active'),
('USR-007', 'Prof. R. K. Mukherjee', 'rk.mukherjee@university.edu', 'DeanHOD', 'Dean (ECE)', 'Dean & Professor', 'Electronics & Communication Engineering', 'School of Electrical Sciences', 'HOD-ECE-1005', 'R', 'badge-xls', 'Dean of Electrical Sciences, Department Verifier', 'Active'),
('USR-008', 'Dr. Shalini Verma', 'shalini.verma@university.edu', 'Faculty', 'Associate Professor (MGMT)', 'Associate Professor', 'Management Studies', 'School of Business', 'FAC-MGMT-1402', 'S', 'badge-doc', 'Faculty member School of Business, upload management publications & events', 'Active'),
('USR-009', 'Prof. Vivek Chawla', 'v.chawla@university.edu', 'DeanHOD', 'Head of Department (MECH)', 'Head of Department & Professor', 'Mechanical Engineering', 'School of Mechanical Sciences', 'HOD-MECH-1008', 'V', 'badge-xls', 'HOD Mechanical Engineering, Department Verifier', 'Active'),
('USR-010', 'Dr. Kavita Deshmukh', 'kavita.d@university.edu', 'Faculty', 'Assistant Professor (BIOTECH)', 'Assistant Professor', 'Biotechnology & Bioinformatics', 'School of Applied Sciences', 'FAC-BIO-1120', 'K', 'badge-doc', 'Faculty member Biotechnology, upload bioinformatics project evidence', 'Active'),
('USR-011', 'Aarav Patel', 'aarav.p@student.university.edu', 'Faculty', 'Student Representative (B.Tech)', 'Student Representative (B.Tech)', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'STU-CSE-8842', 'S', 'badge-doc', 'Student contributor for hackathon awards and co-curricular certifications', 'Active'),
('USR-012', 'Priya Nair', 'priya.n@student.university.edu', 'Faculty', 'Research Scholar (Ph.D)', 'Research Scholar', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'STU-CSE-8910', 'P', 'badge-doc', 'Ph.D Scholar, journal publication proofs and conference attendance', 'Active')
ON CONFLICT (id) DO NOTHING;
