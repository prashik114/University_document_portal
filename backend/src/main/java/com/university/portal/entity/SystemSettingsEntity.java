package com.university.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "system_settings")
public class SystemSettingsEntity {

    @Id
    private String id = "DEFAULT";

    private String instituteName = "National Institute of Science & Technology";
    private String instituteCode = "UNIV-2026";
    private String accreditationCycle = "NAAC Cycle 3 (2026-2031)";
    private String activeAcademicYear = "2026-2027";
    private String ssrLockDate = "2026-11-30";
    private Boolean autoForwardToIQAC = true;
    private Boolean requirePreApprovalSlip = true;
    private Boolean enforceMFA = true;
    private Double storageQuotaGB = 10.0;
    private Double storageUsedGB = 1.4;
    private String lastBackupDate = "03 Nov 2026, 02:00 AM";

    @Column(columnDefinition = "TEXT")
    private String documentCategories = "Curricular Aspects & Syllabus, Teaching-Learning & Evaluation, Research Publications & Journals, Infrastructure & Learning Resources, Student Support & Progression, Governance Leadership & Management, Institutional Values & Best Practices, Student Certifications & Awards";

    @Column(columnDefinition = "TEXT")
    private String academicYears = "2026-2027, 2025-2026, 2024-2025, 2023-2024";

    public SystemSettingsEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getInstituteName() { return instituteName; }
    public void setInstituteName(String instituteName) { this.instituteName = instituteName; }

    public String getInstituteCode() { return instituteCode; }
    public void setInstituteCode(String instituteCode) { this.instituteCode = instituteCode; }

    public String getAccreditationCycle() { return accreditationCycle; }
    public void setAccreditationCycle(String accreditationCycle) { this.accreditationCycle = accreditationCycle; }

    public String getActiveAcademicYear() { return activeAcademicYear; }
    public void setActiveAcademicYear(String activeAcademicYear) { this.activeAcademicYear = activeAcademicYear; }

    public String getSsrLockDate() { return ssrLockDate; }
    public void setSsrLockDate(String ssrLockDate) { this.ssrLockDate = ssrLockDate; }

    public Boolean getAutoForwardToIQAC() { return autoForwardToIQAC; }
    public void setAutoForwardToIQAC(Boolean autoForwardToIQAC) { this.autoForwardToIQAC = autoForwardToIQAC; }

    public Boolean getRequirePreApprovalSlip() { return requirePreApprovalSlip; }
    public void setRequirePreApprovalSlip(Boolean requirePreApprovalSlip) { this.requirePreApprovalSlip = requirePreApprovalSlip; }

    public Boolean getEnforceMFA() { return enforceMFA; }
    public void setEnforceMFA(Boolean enforceMFA) { this.enforceMFA = enforceMFA; }

    public Double getStorageQuotaGB() { return storageQuotaGB; }
    public void setStorageQuotaGB(Double storageQuotaGB) { this.storageQuotaGB = storageQuotaGB; }

    public Double getStorageUsedGB() { return storageUsedGB; }
    public void setStorageUsedGB(Double storageUsedGB) { this.storageUsedGB = storageUsedGB; }

    public String getLastBackupDate() { return lastBackupDate; }
    public void setLastBackupDate(String lastBackupDate) { this.lastBackupDate = lastBackupDate; }

    public String getDocumentCategories() { return documentCategories; }
    public void setDocumentCategories(String documentCategories) { this.documentCategories = documentCategories; }

    public String getAcademicYears() { return academicYears; }
    public void setAcademicYears(String academicYears) { this.academicYears = academicYears; }
}
