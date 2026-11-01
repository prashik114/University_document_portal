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
        seedSettings();
        seedUsers();
        seedDocuments();
        seedAuditLogs();
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
            s.setStorageUsedGB(1.8);
            s.setLastBackupDate("31 Oct 2026, 02:00 AM");
            settingsRepository.save(s);
        }
    }

    public void seedUsers() {
        if (userRepository.count() < 12) {
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
                    "FAC-BIO-1120", "K", "badge-doc", "Faculty member Biotechnology, upload patents & lab trials", "Active"),
                new UserEntity("USR-011", "Aarav Patel", "aarav.p@student.university.edu", "Student", "Student Representative (B.Tech)",
                    "Student Representative", "Computer Science & Engineering", "School of Computing & IT",
                    "STU-CSE-8842", "S", "badge-doc", "Student submitter: hackathons, co-curricular awards, and internships", "Active"),
                new UserEntity("USR-012", "Priya Nair", "priya.n@student.university.edu", "Student", "Research Scholar (Ph.D)",
                    "Research Scholar", "Computer Science & Engineering", "School of Computing & IT",
                    "STU-CSE-8910", "P", "badge-doc", "Student / Scholar: journal papers, seminar attendance, and scholar grants", "Active")
            );
            userRepository.saveAll(users);
        }
    }

    public void seedDocuments() {
        if (documentRepository.count() == 0) {
            DocumentEntity d1 = new DocumentEntity();
            d1.setId("DOC-2026-001");
            d1.setDisplayNum(1);
            d1.setTitle("IEEE International Conference on Edge AI Architectures (ICAI 2026)");
            d1.setFileType("pdf");
            d1.setFileSize("2.8 MB");
            d1.setCategory("Research");
            d1.setSubCategory("Conference Publication");
            d1.setOwnerType("Faculty");
            d1.setOwnerName("Dr. Rajesh Sharma");
            d1.setOwnerId("FAC-CSE-2048");
            d1.setRecordedByFaculty("Dr. Rajesh Sharma");
            d1.setDepartment("Computer Science & Engineering");
            d1.setSchool("School of Computing & IT");
            d1.setAcademicYear("2026-2027");
            d1.setSubmittedOn("12 Oct 2026");
            d1.setStatus("Approved");
            d1.setCurrentStage("IQAC Certified & Locked");
            d1.setNaacCriterion("Criterion 3.2 - Research Publications");
            d1.setEvidenceFile("IEEE_ICAI_2026_Proceedings_Certified.pdf");
            d1.setEvidenceVerified(true);
            d1.setIsLocked(true);

            DocumentEntity d2 = new DocumentEntity();
            d2.setId("DOC-2026-002");
            d2.setDisplayNum(2);
            d2.setTitle("National Smart India Hackathon 2026 - 1st Prize Winner Certificate");
            d2.setFileType("pdf");
            d2.setFileSize("1.4 MB");
            d2.setCategory("Student");
            d2.setSubCategory("Co-curricular");
            d2.setOwnerType("Student");
            d2.setOwnerName("Aarav Patel");
            d2.setOwnerId("STU-CSE-8842");
            d2.setRecordedByFaculty("Dr. Rajesh Sharma");
            d2.setDepartment("Computer Science & Engineering");
            d2.setSchool("School of Computing & IT");
            d2.setAcademicYear("2026-2027");
            d2.setSubmittedOn("18 Oct 2026");
            d2.setStatus("Approved");
            d2.setCurrentStage("IQAC Certified & Locked");
            d2.setNaacCriterion("Criterion 5.3 - Student Participation & Activities");
            d2.setEvidenceFile("SIH_2026_Winner_Award_Certificate.pdf");
            d2.setEvidenceVerified(true);
            d2.setIsLocked(true);

            DocumentEntity d3 = new DocumentEntity();
            d3.setId("DOC-2026-003");
            d3.setDisplayNum(3);
            d3.setTitle("Faculty Development Program on Cloud Computing & Microservices");
            d3.setFileType("pdf");
            d3.setFileSize("3.1 MB");
            d3.setCategory("Academic");
            d3.setSubCategory("Faculty Empowerment");
            d3.setOwnerType("Faculty");
            d3.setOwnerName("Dr. Rajesh Sharma");
            d3.setOwnerId("FAC-CSE-2048");
            d3.setRecordedByFaculty("Dr. Rajesh Sharma");
            d3.setDepartment("Computer Science & Engineering");
            d3.setSchool("School of Computing & IT");
            d3.setAcademicYear("2026-2027");
            d3.setSubmittedOn("28 Oct 2026");
            d3.setStatus("Under Verification");
            d3.setCurrentStage("Dean / HoD Review");
            d3.setNaacCriterion("Criterion 6.3 - Faculty Empowerment Strategies");
            d3.setEvidenceFile("FDP_Cloud_Microservices_Report.pdf");
            d3.setEvidenceVerified(false);
            d3.setIsLocked(false);

            DocumentEntity d4 = new DocumentEntity();
            d4.setId("DOC-2026-004");
            d4.setDisplayNum(4);
            d4.setTitle("ACM Journal of Distributed Systems: Fault-Tolerant Consensus Paper");
            d4.setFileType("pdf");
            d4.setFileSize("4.2 MB");
            d4.setCategory("Research");
            d4.setSubCategory("Journal Publication");
            d4.setOwnerType("Faculty");
            d4.setOwnerName("Dr. Ananya Sen");
            d4.setOwnerId("FAC-CSE-2089");
            d4.setRecordedByFaculty("Dr. Ananya Sen");
            d4.setDepartment("Computer Science & Engineering");
            d4.setSchool("School of Computing & IT");
            d4.setAcademicYear("2026-2027");
            d4.setSubmittedOn("29 Oct 2026");
            d4.setStatus("Under Verification");
            d4.setCurrentStage("Dean / HoD Review");
            d4.setNaacCriterion("Criterion 3.1 - Promotion of Research");
            d4.setEvidenceFile("ACM_Distributed_Consensus_Certified.pdf");
            d4.setEvidenceVerified(false);
            d4.setIsLocked(false);

            DocumentEntity d5 = new DocumentEntity();
            d5.setId("DOC-2026-005");
            d5.setDisplayNum(5);
            d5.setTitle("Patent Filing: AI-Assisted Bio-Sensing Nanostructure (App #2026410982)");
            d5.setFileType("pdf");
            d5.setFileSize("5.6 MB");
            d5.setCategory("Research");
            d5.setSubCategory("Patents & IPR");
            d5.setOwnerType("Faculty");
            d5.setOwnerName("Dr. Kavita Deshmukh");
            d5.setOwnerId("FAC-BIO-1120");
            d5.setRecordedByFaculty("Dr. Kavita Deshmukh");
            d5.setDepartment("Biotechnology & Bioinformatics");
            d5.setSchool("School of Applied Sciences");
            d5.setAcademicYear("2026-2027");
            d5.setSubmittedOn("25 Oct 2026");
            d5.setStatus("Under Verification");
            d5.setCurrentStage("IQAC Central Verification");
            d5.setNaacCriterion("Criterion 3.4 - Research & Patents");
            d5.setEvidenceFile("Patent_Office_Application_Filing_Proof.pdf");
            d5.setEvidenceVerified(false);
            d5.setIsLocked(false);

            DocumentEntity d6 = new DocumentEntity();
            d6.setId("DOC-2026-006");
            d6.setDisplayNum(6);
            d6.setTitle("International Ph.D Colloquium Paper & Travel Grant Claim");
            d6.setFileType("pdf");
            d6.setFileSize("1.9 MB");
            d6.setCategory("Student");
            d6.setSubCategory("Research");
            d6.setOwnerType("Student");
            d6.setOwnerName("Priya Nair");
            d6.setOwnerId("STU-CSE-8910");
            d6.setRecordedByFaculty("Dr. Rajesh Sharma");
            d6.setDepartment("Computer Science & Engineering");
            d6.setSchool("School of Computing & IT");
            d6.setAcademicYear("2026-2027");
            d6.setSubmittedOn("30 Oct 2026");
            d6.setStatus("Under Verification");
            d6.setCurrentStage("Dean / HoD Review");
            d6.setNaacCriterion("Criterion 5.1 - Student Support");
            d6.setEvidenceFile("PhD_Colloquium_Invitation_GrantClaim.pdf");
            d6.setEvidenceVerified(false);
            d6.setIsLocked(false);

            DocumentEntity d7 = new DocumentEntity();
            d7.setId("DOC-2026-007");
            d7.setDisplayNum(7);
            d7.setTitle("National Seminar on Strategic Supply Chain Innovations Workshop Voucher");
            d7.setFileType("pdf");
            d7.setFileSize("2.1 MB");
            d7.setCategory("Academic");
            d7.setSubCategory("Faculty Development");
            d7.setOwnerType("Faculty");
            d7.setOwnerName("Dr. Shalini Verma");
            d7.setOwnerId("FAC-MGMT-1402");
            d7.setRecordedByFaculty("Dr. Shalini Verma");
            d7.setDepartment("Management Studies");
            d7.setSchool("School of Business");
            d7.setAcademicYear("2026-2027");
            d7.setSubmittedOn("24 Oct 2026");
            d7.setStatus("Returned");
            d7.setCurrentStage("Returned for Clarification");
            d7.setNaacCriterion("Criterion 6.3 - Financial Support");
            d7.setEvidenceFile("National_Seminar_Invoice_Draft.pdf");
            d7.setEvidenceVerified(false);
            d7.setIsLocked(false);
            d7.setReviewerCommentsJson("[{\"author\":\"Prof. A. K. Verma\",\"date\":\"25 Oct 2026\",\"comment\":\"Please attach signed registration fee voucher and original participation receipt.\"}]");

            DocumentEntity d8 = new DocumentEntity();
            d8.setId("DOC-2026-008");
            d8.setDisplayNum(8);
            d8.setTitle("Institutional Academic Syllabus Revision & BoS Committee Resolution");
            d8.setFileType("pdf");
            d8.setFileSize("4.8 MB");
            d8.setCategory("Academic");
            d8.setSubCategory("Curriculum Enrichment");
            d8.setOwnerType("Faculty");
            d8.setOwnerName("Dr. Rajesh Sharma");
            d8.setOwnerId("FAC-CSE-2048");
            d8.setRecordedByFaculty("Dr. Rajesh Sharma");
            d8.setDepartment("Computer Science & Engineering");
            d8.setSchool("School of Computing & IT");
            d8.setAcademicYear("2026-2027");
            d8.setSubmittedOn("15 Oct 2026");
            d8.setStatus("Approved");
            d8.setCurrentStage("IQAC Certified & Locked");
            d8.setNaacCriterion("Criterion 1.1 - Curricular Planning & Implementation");
            d8.setEvidenceFile("BoS_Minutes_CSE_Syllabus_2026_Approved.pdf");
            d8.setEvidenceVerified(true);
            d8.setIsLocked(true);

            documentRepository.saveAll(Arrays.asList(d1, d2, d3, d4, d5, d6, d7, d8));
        }
    }

    public void seedAuditLogs() {
        if (auditLogRepository.count() == 0) {
            AuditLogEntity a1 = new AuditLogEntity("AUD-9021", "12 Oct 2026, 04:32 PM", "Dr. Sunita Rao (IQAC)", "LOCKED_SSR", "DOC-2026-001", "IEEE International Conference on Edge AI Architectures (ICAI 2026)", "Under Verification", "Approved", "SSR evidence locked with SHA-256 digital stamp.", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
            AuditLogEntity a2 = new AuditLogEntity("AUD-9022", "18 Oct 2026, 02:15 PM", "Dr. Sunita Rao (IQAC)", "LOCKED_SSR", "DOC-2026-002", "National Smart India Hackathon 2026 - 1st Prize Winner Certificate", "Under Verification", "Approved", "Verified student national championship achievement.", "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4");
            AuditLogEntity a3 = new AuditLogEntity("AUD-9023", "25 Oct 2026, 11:20 AM", "Prof. A. K. Verma (DeanHOD)", "RETURNED_CORRECTION", "DOC-2026-007", "National Seminar on Strategic Supply Chain Innovations Workshop Voucher", "Under Verification", "Returned", "Clarification requested: attach signed fee voucher.", "2c624232cdd221771294dfbb310aca000a0df6ac9b66b0d199f43f34f6ffd730");
            AuditLogEntity a4 = new AuditLogEntity("AUD-9024", "28 Oct 2026, 09:10 AM", "Dr. Rajesh Sharma (Faculty)", "SUBMITTED", "DOC-2026-003", "Faculty Development Program on Cloud Computing & Microservices", "Draft", "Under Verification", "Initial submission for Department Level Accreditation Review.", "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a");

            auditLogRepository.saveAll(Arrays.asList(a1, a2, a3, a4));
        }
    }
}
