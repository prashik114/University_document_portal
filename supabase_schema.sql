-- ==============================================================================
-- UNIVERSITY ACCREDITATION & DOCUMENT REPOSITORY - COMPLETE DATABASE SCHEMA
-- Compatible with: PostgreSQL 14+, Neon Database, Supabase
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLE 1: portal_users (Institutional User Directory & Authentication)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.portal_users (
    id VARCHAR(50) PRIMARY KEY,                  -- e.g. USR-001
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL DEFAULT 'Password@123',
    otp VARCHAR(10) DEFAULT '1234',
    role VARCHAR(50) NOT NULL,                   -- Student, Faculty, DeanHOD, IQAC, Admin, Inspector
    role_title VARCHAR(255),
    designation VARCHAR(255),
    department VARCHAR(255),
    school VARCHAR(255),
    employee_id VARCHAR(50),
    avatar VARCHAR(10),
    badge_class VARCHAR(50),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 2: documents (Accreditation Evidence & Submissions Master)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id VARCHAR(50) PRIMARY KEY,                  -- e.g. DOC-2026-001
    display_num INT,
    title VARCHAR(500) NOT NULL,
    file_type VARCHAR(20),                       -- pdf, doc, xls, png, jpg
    file_size VARCHAR(50),
    category VARCHAR(100),                       -- Student, Academic, Research, Event, Infrastructure
    sub_category VARCHAR(100),
    owner_type VARCHAR(50),                      -- Student, Faculty Member, Department
    owner_name VARCHAR(255),
    owner_id VARCHAR(50),
    recorded_by_faculty VARCHAR(255),
    department VARCHAR(255),
    school VARCHAR(255),
    academic_year VARCHAR(50) DEFAULT '2026-2027',
    submitted_on VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Under Verification', -- Draft, Under Verification, Returned, Approved
    current_stage VARCHAR(50) DEFAULT 'Dean/HOD',    -- Faculty, Dean/HOD, IQAC, Locked in SSR
    naac_criterion VARCHAR(100),
    evidence_file VARCHAR(500),
    evidence_verified BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    event_details_json TEXT,                     -- Additional event metadata in JSON
    timeline_json TEXT,                          -- Document stage transitions audit
    reviewer_comments_json TEXT,                  -- Feedback & return reasons
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 3: audit_logs (Immutable Cryptographic Audit Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(50) PRIMARY KEY,                  -- e.g. AUD-9023
    timestamp VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,                -- UPLOAD, VERIFY, FORWARD, RETURN, LOCK
    record_id VARCHAR(50),
    title VARCHAR(500),
    prior_status VARCHAR(50),
    new_status VARCHAR(50),
    comments TEXT,
    hash VARCHAR(255),                           -- Cryptographic SHA-256 Ledger Hash
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 4: recent_activities (Live Institutional Feed)
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
-- TABLE 5: revision_requests (Post-Approval Modification Control)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.revision_requests (
    id VARCHAR(50) PRIMARY KEY,                  -- e.g. REV-2026-001
    record_id VARCHAR(50) NOT NULL,
    record_title VARCHAR(500) NOT NULL,
    initiator VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    reason TEXT NOT NULL,
    requested_date VARCHAR(100),
    status VARCHAR(100) DEFAULT 'Pending Admin Approval',
    original_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 6: system_settings (Institutional Academic Cycles & Controls)
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
-- TABLE 7: departments (Academic Schools & Department Taxonomy)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    school VARCHAR(255) NOT NULL
);

-- ==============================================================================
-- TABLE 8: naac_criteria (Accreditation Metrics Registry)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.naac_criteria (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    focus TEXT,
    target_metric VARCHAR(100)
);

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.portal_users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.portal_users(role);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_current_stage ON public.documents(current_stage);
CREATE INDEX IF NOT EXISTS idx_documents_department ON public.documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_record_id ON public.audit_logs(record_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) FOR SUPABASE
-- ==============================================================================
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naac_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all" ON public.portal_users FOR SELECT USING (true);
CREATE POLICY "Allow modify for all" ON public.portal_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recent_activities" ON public.recent_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on revision_requests" ON public.revision_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on naac_criteria" ON public.naac_criteria FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SEED DATA INSERTS
-- ==============================================================================

-- 1. Seed System Settings
INSERT INTO public.system_settings (id, active_academic_year, ssr_lock_date, auto_forward_to_iqac, require_pre_approval_slip, enforce_mfa, storage_quota_gb, storage_used_gb, last_backup_date)
VALUES ('DEFAULT', '2026-2027', '2026-11-30', TRUE, TRUE, TRUE, 10.0, 0.0, '01 Nov 2026, 02:00 AM')
ON CONFLICT (id) DO UPDATE SET
    active_academic_year = EXCLUDED.active_academic_year,
    ssr_lock_date = EXCLUDED.ssr_lock_date;

-- 2. Seed University Departments
INSERT INTO public.departments (code, name, school) VALUES
('CSE', 'Computer Science & Engineering', 'School of Computing & IT'),
('ECE', 'Electronics & Communication Engineering', 'School of Electrical Sciences'),
('MECH', 'Mechanical Engineering', 'School of Mechanical Sciences'),
('MGMT', 'Management Studies', 'School of Business'),
('BIOTECH', 'Biotechnology & Bioinformatics', 'School of Applied Sciences')
ON CONFLICT (code) DO NOTHING;

-- 3. Seed NAAC Criteria
INSERT INTO public.naac_criteria (code, name, focus, target_metric) VALUES
('CR-1', 'Criteria 1: Curricular Aspects', 'Syllabus enrichment, BOS minutes, academic flexibility', 'Metric 1.1 - 1.4'),
('CR-2', 'Criteria 2: Teaching-Learning & Evaluation', 'Faculty awards, mentor-mentee records, pass percentage', 'Metric 2.1 - 2.6'),
('CR-3', 'Criteria 3: Research, Innovations & Extension', 'Scopus publications, funded projects, patent filings, MoU outreach', 'Metric 3.1 - 3.7'),
('CR-4', 'Criteria 4: Infrastructure & Learning Resources', 'Lab stock audit, library automated accession, ICT logs', 'Metric 4.1 - 4.4'),
('CR-5', 'Criteria 5: Student Support & Progression', 'Placements, scholarships, competitive exam clearing', 'Metric 5.1 - 5.4'),
('CR-6', 'Criteria 6: Governance, Leadership & Management', 'IQAC review minutes, e-governance ERP, FDP support', 'Metric 6.1 - 6.5'),
('CR-7', 'Criteria 7: Institutional Values & Best Practices', 'Green audit, energy certs, gender equity events', 'Metric 7.1 - 7.3')
ON CONFLICT (code) DO NOTHING;

-- 4. Seed Official Institutional Users (With Password: Password@123 & OTP: 1234)
INSERT INTO public.portal_users (id, name, email, password, otp, role, role_title, designation, department, school, employee_id, avatar, badge_class, description, status)
VALUES
('USR-001', 'Dr. Rajesh Sharma', 'rajesh.sharma@university.edu', 'Password@123', '1234', 'Faculty', 'Associate Professor (CSE)', 'Associate Professor', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'FAC-CSE-2048', 'F', 'badge-doc', 'Faculty submitter: upload research, curriculum and student mentorship records', 'Active'),
('USR-002', 'Prof. A. K. Verma', 'ak.verma@university.edu', 'Password@123', '1234', 'DeanHOD', 'Head of Department (CSE)', 'Head of Department & Professor', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'HOD-CSE-1002', 'D', 'badge-xls', 'Department verifier: verify departmental submissions, approve and forward to IQAC', 'Active'),
('USR-003', 'Dr. Sunita Rao', 'sunita.rao@university.edu', 'Password@123', '1234', 'IQAC', 'Director & Central IQAC Coordinator', 'Director & Central IQAC Coordinator', 'Internal Quality Assurance Cell', 'Central University Administration', 'IQAC-DIR-004', 'I', 'badge-pdf', 'Central quality coordinator: audit accreditation relevance, certify evidence and lock in SSR', 'Active'),
('USR-004', 'Er. Vikram Mehta', 'admin@university.edu', 'Password@123', '1234', 'Admin', 'Repository Administrator', 'Chief Systems & Governance Administrator', 'Central IT & Institutional Governance', 'University Administration', 'ADM-SYS-001', 'A', 'badge-admin', 'System administrator: user governance, security controls, immutable audit logs', 'Active'),
('USR-005', 'Dr. M. S. Swaminathan', 'naac.evaluator@naac.gov.in', 'Password@123', '1234', 'Inspector', 'NAAC Peer Team Lead Assessor', 'External Peer Review Team Assessor', 'External Peer Review Committee', 'External Assessment & Accreditation Council', 'EXT-NAAC-881', 'E', 'badge-inspector', 'NAAC Inspector: strictly read-only evaluation of verified evidence registers and SSR metrics', 'Active'),
('USR-006', 'Dr. Ananya Sen', 'ananya.sen@university.edu', 'Password@123', '1234', 'Faculty', 'Assistant Professor (CSE)', 'Assistant Professor', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'FAC-CSE-2089', 'A', 'badge-doc', 'Faculty member CSE: upload workshops, journal publications, and student project records', 'Active'),
('USR-007', 'Prof. R. K. Mukherjee', 'rk.mukherjee@university.edu', 'Password@123', '1234', 'DeanHOD', 'Dean (ECE)', 'Dean & Professor', 'Electronics & Communication Engineering', 'School of Electrical Sciences', 'HOD-ECE-1005', 'R', 'badge-xls', 'Dean of Electrical Sciences: Department verification desk and stage routing', 'Active'),
('USR-008', 'Dr. Shalini Verma', 'shalini.verma@university.edu', 'Password@123', '1234', 'Faculty', 'Associate Professor (MGMT)', 'Associate Professor', 'Management Studies', 'School of Business', 'FAC-MGMT-1402', 'S', 'badge-doc', 'Faculty member Management: upload conference proceedings and industry MOUs', 'Active'),
('USR-009', 'Prof. Vivek Chawla', 'v.chawla@university.edu', 'Password@123', '1234', 'DeanHOD', 'Head of Department (MECH)', 'Head of Department & Professor', 'Mechanical Engineering', 'School of Mechanical Sciences', 'HOD-MECH-1008', 'V', 'badge-xls', 'HOD Mechanical Engineering: Department verification desk and stage routing', 'Active'),
('USR-010', 'Dr. Kavita Deshmukh', 'kavita.d@university.edu', 'Password@123', '1234', 'Faculty', 'Assistant Professor (BIOTECH)', 'Assistant Professor', 'Biotechnology & Bioinformatics', 'School of Applied Sciences', 'FAC-BIO-1120', 'K', 'badge-doc', 'Faculty member Biotechnology: upload patent filings and laboratory documentation', 'Active'),
('USR-011', 'Aarav Patel', 'aarav.p@student.university.edu', 'Password@123', '1234', 'Student', 'Student Representative (B.Tech)', 'Student Representative (B.Tech)', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'STU-CSE-8842', 'S', 'badge-doc', 'Student submitter: hackathon achievements, co-curricular awards, and internships', 'Active'),
('USR-012', 'Priya Nair', 'priya.n@student.university.edu', 'Password@123', '1234', 'Student', 'Research Scholar (Ph.D)', 'Research Scholar', 'Computer Science & Engineering', 'School of Computing & Information Technology', 'STU-CSE-8910', 'P', 'badge-doc', 'Student / Scholar: Ph.D journal papers, seminar attendance, and scholar grants', 'Active')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    designation = EXCLUDED.designation;
