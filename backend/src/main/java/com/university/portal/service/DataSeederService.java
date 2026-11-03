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
                    "School of Computing & Information Technology", null, "Unassigned",
                    "Active", "Computing, software engineering, AI/ML, and cyber security.", "2005"),
            new DepartmentEntity("DEPT-ECE", "ECE", "Electronics & Communication Engineering",
                    "School of Electrical Sciences", null, "Unassigned",
                    "Active", "VLSI design, embedded systems, communication networks, and robotics.", "2006"),
            new DepartmentEntity("DEPT-MECH", "MECH", "Mechanical Engineering",
                    "School of Mechanical Sciences", null, "Unassigned",
                    "Active", "Thermal dynamics, fluid mechanics, industrial automation, and CAD/CAM.", "2007"),
            new DepartmentEntity("DEPT-MGMT", "MGMT", "Management Studies",
                    "School of Business", null, "Unassigned",
                    "Active", "Strategic management, financial analytics, operations, and MBA curriculum.", "2010"),
            new DepartmentEntity("DEPT-BIOTECH", "BIOTECH", "Biotechnology & Bioinformatics",
                    "School of Applied Sciences", null, "Unassigned",
                    "Active", "Genetic engineering, computational biology, drug discovery, and lab trials.", "2012"),
            new DepartmentEntity("DEPT-CIVIL", "CIVIL", "Civil Engineering",
                    "School of Infrastructure & Environment", null, "Unassigned",
                    "Active", "Structural analysis, geotechnical engineering, hydrology, and green architecture.", "2008"),
            new DepartmentEntity("DEPT-EE", "EE", "Electrical Engineering",
                    "School of Electrical Sciences", null, "Unassigned",
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

        if (userRepository.count() > 0) return;

        List<UserEntity> users = List.of(
            user("USR-004", "Er. Vikram Mehta",      "admin@university.edu",
                 "Admin",     "Repository Administrator",
                 "Chief Systems & Governance Administrator", null,
                 "Central Administration", "ADM-SYS-001", "A", "badge-admin",
                 "Manage academic cycles, authorize post-approval revisions, govern user directory"),

            user("USR-003", "Dr. Sunita Rao",        "sunita.rao@university.edu",
                 "IQAC",      "Director & Central IQAC Coordinator",
                 "Director & Central IQAC Coordinator", null,
                 "Central Administration", "IQAC-DIR-004", "I", "badge-pdf",
                 "Audit NAAC criteria compliance, generate tamper-evident hashes & lock evidence"),

            user("USR-005", "Dr. M. S. Swaminathan", "naac.evaluator@naac.gov.in",
                 "Inspector", "NAAC Peer Team Lead Assessor",
                 "External Peer Review Team Assessor", null,
                 "External Assessment & Accreditation Council", "EXT-NAAC-881", "E", "badge-inspector",
                 "Read-only access to accredited evidence registers and institutional SSR reports")
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
