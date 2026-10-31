package com.university.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "documents")
public class DocumentEntity {

    @Id
    private String id; // e.g. DOC-2026-001

    private Integer displayNum;

    @Column(nullable = false)
    private String title;

    private String fileType; // pdf, doc, xls, png, jpg
    private String fileSize;
    private String category;
    private String subCategory;
    private String ownerType;
    private String ownerName;
    private String ownerId;
    private String recordedByFaculty;
    private String department;
    private String school;
    private String academicYear;
    private String submittedOn;
    private String status; // Under Verification, Returned, Approved, Draft
    private String currentStage; // Faculty, Dean/HOD, IQAC, Finalized
    private String naacCriterion;
    private String evidenceFile;
    private Boolean evidenceVerified = false;
    private Boolean isLocked = false;

    @Column(columnDefinition = "TEXT")
    private String eventDetailsJson;

    @Column(columnDefinition = "TEXT")
    private String timelineJson;

    @Column(columnDefinition = "TEXT")
    private String reviewerCommentsJson;

    public DocumentEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Integer getDisplayNum() { return displayNum; }
    public void setDisplayNum(Integer displayNum) { this.displayNum = displayNum; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public String getFileSize() { return fileSize; }
    public void setFileSize(String fileSize) { this.fileSize = fileSize; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSubCategory() { return subCategory; }
    public void setSubCategory(String subCategory) { this.subCategory = subCategory; }

    public String getOwnerType() { return ownerType; }
    public void setOwnerType(String ownerType) { this.ownerType = ownerType; }

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getRecordedByFaculty() { return recordedByFaculty; }
    public void setRecordedByFaculty(String recordedByFaculty) { this.recordedByFaculty = recordedByFaculty; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getSchool() { return school; }
    public void setSchool(String school) { this.school = school; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getSubmittedOn() { return submittedOn; }
    public void setSubmittedOn(String submittedOn) { this.submittedOn = submittedOn; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCurrentStage() { return currentStage; }
    public void setCurrentStage(String currentStage) { this.currentStage = currentStage; }

    public String getNaacCriterion() { return naacCriterion; }
    public void setNaacCriterion(String naacCriterion) { this.naacCriterion = naacCriterion; }

    public String getEvidenceFile() { return evidenceFile; }
    public void setEvidenceFile(String evidenceFile) { this.evidenceFile = evidenceFile; }

    public Boolean getEvidenceVerified() { return evidenceVerified; }
    public void setEvidenceVerified(Boolean evidenceVerified) { this.evidenceVerified = evidenceVerified; }

    public Boolean getIsLocked() { return isLocked; }
    public void setIsLocked(Boolean isLocked) { this.isLocked = isLocked; }

    public String getEventDetailsJson() { return eventDetailsJson; }
    public void setEventDetailsJson(String eventDetailsJson) { this.eventDetailsJson = eventDetailsJson; }

    public String getTimelineJson() { return timelineJson; }
    public void setTimelineJson(String timelineJson) { this.timelineJson = timelineJson; }

    public String getReviewerCommentsJson() { return reviewerCommentsJson; }
    public void setReviewerCommentsJson(String reviewerCommentsJson) { this.reviewerCommentsJson = reviewerCommentsJson; }
}

