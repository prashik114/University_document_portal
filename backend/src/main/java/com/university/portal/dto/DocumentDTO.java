package com.university.portal.dto;

import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object for Document — decouples the API response shape
 * from the JPA entity, and handles JSON-embedded fields (timeline,
 * reviewerComments, eventDetails) as real objects instead of raw strings.
 */
public class DocumentDTO {

    private String id;
    private Integer displayNum;
    private String title;
    private String fileType;
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
    private String status;
    private String currentStage;
    private String naacCriterion;
    private String evidenceFile;
    private Boolean evidenceVerified;
    private Boolean isLocked;
    private Map<String, Object> eventDetails;
    private List<Map<String, Object>> timeline;
    private List<Map<String, Object>> reviewerComments;

    public DocumentDTO() {}

    // ── Getters & Setters ────────────────────────────────────────────────────

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

    public Map<String, Object> getEventDetails() { return eventDetails; }
    public void setEventDetails(Map<String, Object> eventDetails) { this.eventDetails = eventDetails; }

    public List<Map<String, Object>> getTimeline() { return timeline; }
    public void setTimeline(List<Map<String, Object>> timeline) { this.timeline = timeline; }

    public List<Map<String, Object>> getReviewerComments() { return reviewerComments; }
    public void setReviewerComments(List<Map<String, Object>> reviewerComments) { this.reviewerComments = reviewerComments; }
}
