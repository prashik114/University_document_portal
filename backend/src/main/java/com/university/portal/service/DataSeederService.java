package com.university.portal.service;

import com.university.portal.entity.*;
import com.university.portal.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DataSeederService implements CommandLineRunner {

    public static final String DEMO_PASSWORD_HASH = "Password@123";
    public static final String DEMO_OTP           = "1234";

    private final UserRepository            userRepository;
    private final SystemSettingsRepository  settingsRepository;
    private final DepartmentRepository      departmentRepository;

    public DataSeederService(UserRepository userRepository,
                             SystemSettingsRepository settingsRepository,
                             DepartmentRepository departmentRepository) {
        this.userRepository   = userRepository;
        this.settingsRepository = settingsRepository;
        this.departmentRepository = departmentRepository;
    }

    @Override
    public void run(String... args) {
        seedSettings();
        seedDepartments();
        seedUsers();
    }

    // ── Settings ─────────────────────────────────────────────────────────────

    private void seedSettings() {
        if (settingsRepository.count() > 0) return;

        SystemSettingsEntity s = new SystemSettingsEntity();
        s.setId("DEFAULT");
        s.setInstituteName("National Institute of Science & Technology");
        s.setInstituteCode("UNIV-2026");
        s.setAccreditationCycle("NAAC Cycle 3 (2026-2031)");
        s.setActiveAcademicYear("2026-2027");
        s.setSsrLockDate("2026-11-30");
        s.setAutoForwardToIQAC(true);
        s.setRequirePreApprovalSlip(true);
        s.setEnforceMFA(true);
        s.setStorageQuotaGB(10.0);
        s.setStorageUsedGB(1.4);
        s.setLastBackupDate("03 Nov 2026, 12:00 AM");
        settingsRepository.save(s);
    }

    // ── Departments ──────────────────────────────────────────────────────────

    private void seedDepartments() {
        if (departmentRepository.count() > 0) return;

        List<DepartmentEntity> depts = List.of(
            new DepartmentEntity("DEPT-CSE", "CSE", "Computer Science & Engineering",
                    "School of Computing & Information Technology", "USR-002", "Prof. A. K. Verma",
                    "Active", "Computing, software engineering, AI/ML, and cyber security.", "2005"),
            new DepartmentEntity("DEPT-ECE", "ECE", "Electronics & Communication Engineering",
                    "School of Electrical Sciences", "USR-007", "Prof. R. K. Mukherjee",
                    "Active", "VLSI design, embedded systems, communication networks, and robotics.", "2006"),
            new DepartmentEntity("DEPT-MECH", "MECH", "Mechanical Engineering",
                    "School of Mechanical Sciences", "USR-009", "Prof. Vivek Chawla",
                    "Active", "Thermal dynamics, fluid mechanics, industrial automation, and CAD/CAM.", "2007"),
            new DepartmentEntity("DEPT-MGMT", "MGMT", "Management Studies",
                    "School of Business", null, "Unassigned (Acting Dean)",
                    "Active", "Strategic management, financial analytics, operations, and MBA curriculum.", "2010"),
            new DepartmentEntity("DEPT-BIOTECH", "BIOTECH", "Biotechnology & Bioinformatics",
                    "School of Applied Sciences", null, "Unassigned (Acting Dean)",
                    "Active", "Genetic engineering, computational biology, drug discovery, and lab trials.", "2012"),
            new DepartmentEntity("DEPT-CIVIL", "CIVIL", "Civil Engineering",
                    "School of Infrastructure & Environment", null, "Unassigned (Acting Dean)",
                    "Active", "Structural analysis, geotechnical engineering, hydrology, and green architecture.", "2008"),
            new DepartmentEntity("DEPT-EE", "EE", "Electrical Engineering",
                    "School of Electrical Sciences", null, "Unassigned (Acting Dean)",
                    "Active", "Power systems, renewable energy, microgrids, and electrical machines.", "2007")
        );

        departmentRepository.saveAll(depts);
    }

    // ── Users ─────────────────────────────────────────────────────────────────

    private void seedUsers() {
        // Ensure all existing users have demo password hash set
        List<UserEntity> existing = userRepository.findAll();
        boolean updated = false;
        for (UserEntity u : existing) {
            if (u.getPasswordHash() == null || u.getPasswordHash().isBlank()) {
                u.setPasswordHash(DEMO_PASSWORD_HASH);
                updated = true;
            }
        }
        if (updated) {
            userRepository.saveAll(existing);
        }

        if (userRepository.count() >= 12) return;

        List<UserEntity> users = List.of(
            user("USR-001", "Dr. Rajesh Sharma",     "rajesh.sharma@university.edu",
                 "Faculty",    "Associate Professor (CSE)",
                 "Associate Professor",       "Computer Science & Engineering",
                 "School of Computing & Information Technology", "FAC-CSE-2048", "F", "badge-doc",
                 "Upload personal & student documents, track verification, resubmit corrections"),

            user("USR-002", "Prof. A. K. Verma",     "ak.verma@university.edu",
                 "DeanHOD",   "Head of Department (CSE)",
                 "Head of Department & Professor",   "Computer Science & Engineering",
                 "School of Computing & Information Technology", "HOD-CSE-1002", "D", "badge-xls",
                 "Department verification desk, approve & forward to IQAC"),

            user("USR-003", "Dr. Sunita Rao",        "sunita.rao@university.edu",
                 "IQAC",      "Director & Central IQAC Coordinator",
                 "Director & Central IQAC Coordinator", "Internal Quality Assurance Cell",
                 "Central University Administration", "IQAC-DIR-004", "I", "badge-pdf",
                 "Audit NAAC criteria compliance, generate tamper-evident hashes & lock evidence"),

            user("USR-004", "Er. Vikram Mehta",      "admin@university.edu",
                 "Admin",     "Repository Administrator",
                 "Chief Systems & Governance Administrator", "Central IT & Institutional Governance",
                 "University Administration", "ADM-SYS-001", "A", "badge-admin",
                 "Manage academic cycles, authorize post-approval revisions, govern user directory"),

            user("USR-005", "Dr. M. S. Swaminathan", "naac.evaluator@naac.gov.in",
                 "Inspector", "NAAC Peer Team Lead Assessor",
                 "External Peer Review Team Assessor", "NAAC Peer Review Committee",
                 "External Assessment & Accreditation Council", "EXT-NAAC-881", "E", "badge-inspector",
                 "Read-only access to accredited evidence registers and institutional SSR reports"),

            user("USR-006", "Dr. Ananya Sen",        "ananya.sen@university.edu",
                 "Faculty",   "Assistant Professor (CSE)",
                 "Assistant Professor", "Computer Science & Engineering",
                 "School of Computing & Information Technology", "FAC-CSE-2089", "A", "badge-doc",
                 "Upload research & academic records"),

            user("USR-007", "Prof. R. K. Mukherjee", "rk.mukherjee@university.edu",
                 "DeanHOD",  "Dean (ECE)",
                 "Dean & Professor", "Electronics & Communication Engineering",
                 "School of Electrical Sciences", "HOD-ECE-1005", "R", "badge-xls",
                 "Dean of Electrical Sciences, department verifier"),

            user("USR-008", "Dr. Shalini Verma",     "shalini.verma@university.edu",
                 "Faculty",   "Associate Professor (MGMT)",
                 "Associate Professor", "Management Studies",
                 "School of Business", "FAC-MGMT-1402", "S", "badge-doc",
                 "Upload management publications & events"),

            user("USR-009", "Prof. Vivek Chawla",    "v.chawla@university.edu",
                 "DeanHOD",  "Head of Department (MECH)",
                 "Head of Department & Professor", "Mechanical Engineering",
                 "School of Mechanical Sciences", "HOD-MECH-1008", "V", "badge-xls",
                 "HOD Mechanical Engineering, department verifier"),

            user("USR-010", "Dr. Kavita Deshmukh",   "kavita.d@university.edu",
                 "Faculty",   "Assistant Professor (BIOTECH)",
                 "Assistant Professor", "Biotechnology & Bioinformatics",
                 "School of Applied Sciences", "FAC-BIO-1120", "K", "badge-doc",
                 "Upload patents & lab trials"),

            user("USR-011", "Aarav Patel",           "aarav.p@student.university.edu",
                 "Student",  "Student Representative (B.Tech)",
                 "Student Representative", "Computer Science & Engineering",
                 "School of Computing & IT", "STU-CSE-8842", "S", "badge-doc",
                 "Student submitter: hackathons, co-curricular awards, and internships"),

            user("USR-012", "Priya Nair",            "priya.n@student.university.edu",
                 "Student",  "Research Scholar (Ph.D)",
                 "Research Scholar", "Computer Science & Engineering",
                 "School of Computing & IT", "STU-CSE-8910", "P", "badge-doc",
                 "Journal papers, seminar attendance, and scholar grants")
        );

        userRepository.saveAll(users);
    }

    // ── builder helper ────────────────────────────────────────────────────────

    private static UserEntity user(String id, String name, String email,
                                   String role, String roleTitle,
                                   String designation, String department, String school,
                                   String employeeId, String avatar, String badgeClass,
                                   String description) {
        return new UserEntity(id, name, email, role, roleTitle,
                designation, department, school, employeeId,
                avatar, badgeClass, description, "Active",
                DEMO_PASSWORD_HASH);
    }
}
