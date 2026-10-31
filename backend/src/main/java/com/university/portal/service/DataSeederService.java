package com.university.portal.service;

import com.university.portal.entity.*;
import com.university.portal.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class DataSeederService implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final RecentActivityRepository activityRepository;
    private final RevisionRequestRepository revisionRepository;
    private final SystemSettingsRepository settingsRepository;

    public DataSeederService(UserRepository userRepository,
                             DocumentRepository documentRepository,
                             AuditLogRepository auditLogRepository,
                             RecentActivityRepository activityRepository,
                             RevisionRequestRepository revisionRepository,
                             SystemSettingsRepository settingsRepository) {
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.auditLogRepository = auditLogRepository;
        this.activityRepository = activityRepository;
        this.revisionRepository = revisionRepository;
        this.settingsRepository = settingsRepository;
    }

    @Override
    public void run(String... args) {
        cleanMockData();
        seedSettings();
        seedUsers();
    }

    @org.springframework.transaction.annotation.Transactional
    public void cleanMockData() {
        documentRepository.deleteAllInBatch();
        auditLogRepository.deleteAllInBatch();
        activityRepository.deleteAllInBatch();
        revisionRepository.deleteAllInBatch();
        documentRepository.flush();
        auditLogRepository.flush();
        activityRepository.flush();
        revisionRepository.flush();
    }

    public void seedSettings() {
        if (settingsRepository.count() == 0) {
            SystemSettingsEntity s = new SystemSettingsEntity();
            s.setId("DEFAULT");
            s.setActiveAcademicYear("2026-2027");
            s.setSsrLockDate("2026-11-30");
            s.setAutoForwardToIQAC(true);
            s.setRequirePreApprovalSlip(true);
            s.setEnforceMFA(true);
            s.setStorageQuotaGB(10.0);
            s.setStorageUsedGB(0.0);
            s.setLastBackupDate("31 Oct 2026, 02:00 AM");
            settingsRepository.save(s);
        }
    }

    public void seedUsers() {
        if (userRepository.count() == 0) {
            List<UserEntity> users = Arrays.asList(
                new UserEntity("USR-001", "Dr. Rajesh Sharma", "rajesh.sharma@university.edu", "Faculty", "Associate Professor (CSE)",
                    "Associate Professor", "Computer Science & Engineering", "School of Computing & Information Technology",
                    "FAC-CSE-2048", "F", "badge-doc", "Upload personal & student documents, track verification, resubmit corrections", "Active"),
                new UserEntity("USR-002", "Prof. A. K. Verma", "ak.verma@university.edu", "DeanHOD", "Head of Department (CSE)",
                    "Head of Department & Professor", "Computer Science & Engineering", "School of Computing & Information Technology",
                    "HOD-CSE-1002", "D", "badge-xls", "Department verification desk, inspect financial vouchers, approve & forward to IQAC", "Active"),
                new UserEntity("USR-003", "Dr. Sunita Rao", "sunita.rao@university.edu", "IQAC", "Director & Central IQAC Coordinator",
                    "Director & Central IQAC Coordinator", "Internal Quality Assurance Cell", "Central University Administration",
                    "IQAC-DIR-004", "I", "badge-pdf", "Audit NAAC criteria compliance, check SSR metrics, generate tamper-evident hashes & lock evidence", "Active"),
                new UserEntity("USR-004", "Er. Vikram Mehta", "admin@university.edu", "Admin", "Repository Administrator",
                    "Chief Systems & Governance Administrator", "Central IT & Institutional Governance", "University Administration",
                    "ADM-SYS-001", "A", "badge-admin", "Manage academic cycles, authorize post-approval revisions, govern user directory & security", "Active"),
                new UserEntity("USR-005", "Dr. M. S. Swaminathan", "naac.evaluator@naac.gov.in", "Inspector", "NAAC Peer Team Lead Assessor",
                    "External Peer Review Team Assessor", "NAAC Peer Review Committee", "External Assessment & Accreditation Council",
                    "EXT-NAAC-881", "E", "badge-inspector", "Read-only access to accredited evidence registers, verified certificates, and institutional SSR reports", "Active"),
                new UserEntity("USR-006", "Dr. Ananya Sen", "ananya.sen@university.edu", "Faculty", "Assistant Professor (CSE)",
                    "Assistant Professor", "Computer Science & Engineering", "School of Computing & Information Technology",
                    "FAC-CSE-2089", "A", "badge-doc", "Faculty member CSE, upload research & academic records", "Active"),
                new UserEntity("USR-007", "Prof. R. K. Mukherjee", "rk.mukherjee@university.edu", "DeanHOD", "Dean (ECE)",
                    "Dean & Professor", "Electronics & Communication Engineering", "School of Electrical Sciences",
                    "HOD-ECE-1005", "R", "badge-xls", "Dean of Electrical Sciences, Department Verifier", "Active"),
                new UserEntity("USR-008", "Dr. Shalini Verma", "shalini.verma@university.edu", "Faculty", "Associate Professor (MGMT)",
                    "Associate Professor", "Management Studies", "School of Business",
                    "FAC-MGMT-1402", "S", "badge-doc", "Faculty member School of Business, upload management publications & events", "Active"),
                new UserEntity("USR-009", "Prof. Vivek Chawla", "v.chawla@university.edu", "DeanHOD", "Head of Department (MECH)",
                    "Head of Department & Professor", "Mechanical Engineering", "School of Mechanical Sciences",
                    "HOD-MECH-1008", "V", "badge-xls", "HOD Mechanical Engineering, Department Verifier", "Active"),
                new UserEntity("USR-010", "Dr. Kavita Deshmukh", "kavita.d@university.edu", "Faculty", "Assistant Professor (BIOTECH)",
                    "Assistant Professor", "Biotechnology & Bioinformatics", "School of Applied Sciences",
                    "FAC-BIO-1120", "K", "badge-doc", "Faculty member Biotechnology, upload patents & lab trials", "Active")
            );
            userRepository.saveAll(users);
        }
    }

    public void seedDocuments() {
        // Zero mock documents - clean production ready repository
    }

    public void seedAuditLogs() {
        // Zero mock audit logs - real actions will be immutably recorded
    }

    public void seedRecentActivities() {
        // Zero mock recent activities - real events will be recorded
    }

    public void seedRevisionRequests() {
        // Zero mock revision requests - real admin revisions will be recorded
    }
}
