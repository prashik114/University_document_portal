package com.university.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "revision_requests")
public class RevisionRequestEntity {

    @Id
    private String id; // e.g. REV-2026-001

    private String recordId;
    private String recordTitle;
    private String initiator;
    private String department;

    @Column(columnDefinition = "TEXT")
    private String reason;

    private String requestedDate;
    private String status; // Pending Admin Approval, Approved for Revision, Rejected by Admin
    private String originalVersion;

    public RevisionRequestEntity() {}

    public RevisionRequestEntity(String id, String recordId, String recordTitle, String initiator,
                                 String department, String reason, String requestedDate,
                                 String status, String originalVersion) {
        this.id = id;
        this.recordId = recordId;
        this.recordTitle = recordTitle;
        this.initiator = initiator;
        this.department = department;
        this.reason = reason;
        this.requestedDate = requestedDate;
        this.status = status;
        this.originalVersion = originalVersion;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRecordId() { return recordId; }
    public void setRecordId(String recordId) { this.recordId = recordId; }

    public String getRecordTitle() { return recordTitle; }
    public void setRecordTitle(String recordTitle) { this.recordTitle = recordTitle; }

    public String getInitiator() { return initiator; }
    public void setInitiator(String initiator) { this.initiator = initiator; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getRequestedDate() { return requestedDate; }
    public void setRequestedDate(String requestedDate) { this.requestedDate = requestedDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getOriginalVersion() { return originalVersion; }
    public void setOriginalVersion(String originalVersion) { this.originalVersion = originalVersion; }
}

