package com.university.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "audit_logs")
public class AuditLogEntity {

    @Id
    private String id; // e.g. AUD-9023

    private String timestamp;
    private String actor;
    private String action;
    private String recordId;
    private String title;
    private String priorStatus;
    private String newStatus;

    @Column(columnDefinition = "TEXT")
    private String comments;

    private String hash;

    public AuditLogEntity() {
    }

    public AuditLogEntity(String id, String timestamp, String actor, String action, String recordId,
            String title, String priorStatus, String newStatus, String comments, String hash) {
        this.id = id;
        this.timestamp = timestamp;
        this.actor = actor;
        this.action = action;
        this.recordId = recordId;
        this.title = title;
        this.priorStatus = priorStatus;
        this.newStatus = newStatus;
        this.comments = comments;
        this.hash = hash;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getActor() {
        return actor;
    }

    public void setActor(String actor) {
        this.actor = actor;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getRecordId() {
        return recordId;
    }

    public void setRecordId(String recordId) {
        this.recordId = recordId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getPriorStatus() {
        return priorStatus;
    }

    public void setPriorStatus(String priorStatus) {
        this.priorStatus = priorStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }

    public String getComments() {
        return comments;
    }

    public void setComments(String comments) {
        this.comments = comments;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }
}
