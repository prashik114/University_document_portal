package com.university.portal.dto;

/**
 * Payload for verify / return / lock actions on a document.
 */
public class ReviewActionDTO {

    private String reviewerName;
    private String reviewerRole;
    private String comment;
    private String reason;

    public ReviewActionDTO() {}

    public String getReviewerName() { return reviewerName; }
    public void setReviewerName(String reviewerName) { this.reviewerName = reviewerName; }

    public String getReviewerRole() { return reviewerRole; }
    public void setReviewerRole(String reviewerRole) { this.reviewerRole = reviewerRole; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
