package com.university.portal.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.portal.entity.*;
import com.university.portal.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final RecentActivityRepository activityRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DocumentService(DocumentRepository documentRepository,
                           AuditLogRepository auditLogRepository,
                           RecentActivityRepository activityRepository) {
        this.documentRepository = documentRepository;
        this.auditLogRepository = auditLogRepository;
        this.activityRepository = activityRepository;
    }

    public List<DocumentEntity> getAllDocuments(String category, String status, String search) {
        if ((category == null || category.equalsIgnoreCase("ALL")) &&
            (status == null || status.equalsIgnoreCase("ALL")) &&
            (search == null || search.trim().isEmpty())) {
            return documentRepository.findAllByOrderByDisplayNumAsc();
        }
        return documentRepository.filterDocuments(
            category != null ? category : "ALL",
            status != null ? status : "ALL",
            search != null ? search.trim() : ""
        );
    }

    public Optional<DocumentEntity> getDocumentById(String id) {
        return documentRepository.findById(id);
    }

    @Transactional
    public DocumentEntity createDocument(DocumentEntity doc, String actorName, String actorRole) {
        if (doc.getId() == null || doc.getId().trim().isEmpty()) {
            long count = documentRepository.count();
            String idStr = String.format("DOC-2026-%03d", count + 1);
            doc.setId(idStr);
            doc.setDisplayNum((int) (count + 1));
        }

        if (doc.getSubmittedOn() == null || doc.getSubmittedOn().isEmpty()) {
            doc.setSubmittedOn(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
        }

        boolean isDraft = "Draft".equalsIgnoreCase(doc.getStatus());
        if (isDraft) {
            doc.setCurrentStage("Faculty");
        } else {
            doc.setStatus("Under Verification");
            doc.setCurrentStage("Dean/HOD");
        }

        // Initialize timeline if needed
        List<Map<String, String>> timeline = parseJsonList(doc.getTimelineJson());
        if (timeline.isEmpty()) {
            Map<String, String> initialStage = new HashMap<>();
            initialStage.put("stage", isDraft ? "Draft Created" : "Submitted for Department Verification");
            initialStage.put("actor", actorName != null ? actorName : doc.getOwnerName());
            initialStage.put("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
            initialStage.put("comment", isDraft ? "Draft created" : "Initial submission forwarded to HOD queue");
            timeline.add(initialStage);
            doc.setTimelineJson(toJson(timeline));
        }

        if (doc.getReviewerCommentsJson() == null || doc.getReviewerCommentsJson().trim().isEmpty()) {
            doc.setReviewerCommentsJson("[]");
        }

        DocumentEntity saved = documentRepository.save(doc);

        // Record audit log
        String hash = "0x" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        auditLogRepository.save(new AuditLogEntity(
            "AUD-" + (int)(9000 + Math.random() * 900),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm:ss a")),
            actorName != null ? actorName : doc.getOwnerName(),
            isDraft ? "DRAFT_SAVED" : "RECORD_SUBMITTED",
            saved.getId(),
            saved.getTitle(),
            "None",
            saved.getStatus(),
            isDraft ? "Draft record created" : "Submission forwarded to Department queue",
            hash
        ));

        // Record recent activity
        activityRepository.save(new RecentActivityEntity(
            isDraft ? "edit" : "cloud",
            isDraft ? "blue" : "blue",
            String.format("%s %s \"%s\"", (actorName != null ? actorName : doc.getOwnerName()),
                (isDraft ? "saved draft" : "submitted"), saved.getTitle()),
            "Just now",
            actorRole != null ? actorRole : "Faculty"
        ));

        return saved;
    }

    @Transactional
    public DocumentEntity updateDocument(String id, DocumentEntity updated) {
        return documentRepository.findById(id).map(doc -> {
            if (updated.getTitle() != null) doc.setTitle(updated.getTitle());
            if (updated.getFileType() != null) doc.setFileType(updated.getFileType());
            if (updated.getFileSize() != null) doc.setFileSize(updated.getFileSize());
            if (updated.getCategory() != null) doc.setCategory(updated.getCategory());
            if (updated.getSubCategory() != null) doc.setSubCategory(updated.getSubCategory());
            if (updated.getNaacCriterion() != null) doc.setNaacCriterion(updated.getNaacCriterion());
            if (updated.getEvidenceFile() != null) doc.setEvidenceFile(updated.getEvidenceFile());
            if (updated.getEventDetailsJson() != null) doc.setEventDetailsJson(updated.getEventDetailsJson());
            if (updated.getStatus() != null) doc.setStatus(updated.getStatus());
            if (updated.getCurrentStage() != null) doc.setCurrentStage(updated.getCurrentStage());
            return documentRepository.save(doc);
        }).orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));
    }

    @Transactional
    public DocumentEntity verifyAndAdvanceStage(String id, String reviewerName, String reviewerRole, String comment) {
        DocumentEntity doc = documentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Document not found: " + id));

        String priorStatus = doc.getStatus() + " (" + doc.getCurrentStage() + ")";
        String newStage;
        String newStatus;

        if ("DeanHOD".equalsIgnoreCase(reviewerRole) || "Dean/HOD".equalsIgnoreCase(doc.getCurrentStage())) {
            newStage = "IQAC";
            newStatus = "Under Verification";
            doc.setEvidenceVerified(true);
        } else if ("IQAC".equalsIgnoreCase(reviewerRole) || "IQAC".equalsIgnoreCase(doc.getCurrentStage())) {
            newStage = "Finalized";
            newStatus = "Approved";
            doc.setIsLocked(true);
            doc.setEvidenceVerified(true);
        } else {
            newStage = "IQAC";
            newStatus = "Under Verification";
        }

        doc.setCurrentStage(newStage);
        doc.setStatus(newStatus);

        // Update timeline
        List<Map<String, String>> timeline = parseJsonList(doc.getTimelineJson());
        Map<String, String> step = new HashMap<>();
        step.put("stage", "Finalized".equals(newStage) ? "IQAC Approved & Sealed" : "Department Verified & Forwarded");
        step.put("actor", reviewerName + " (" + reviewerRole + ")");
        step.put("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
        step.put("comment", (comment != null && !comment.trim().isEmpty()) ? comment :
            ("Finalized".equals(newStage) ? "Evidence authenticated. Permanent SSR lock applied." : "Department verified. Forwarded to IQAC."));
        timeline.add(step);
        doc.setTimelineJson(toJson(timeline));

        // Reviewer comments
        if (comment != null && !comment.trim().isEmpty()) {
            List<Map<String, String>> revComments = parseJsonList(doc.getReviewerCommentsJson());
            Map<String, String> rc = new HashMap<>();
            rc.put("reviewer", reviewerName + " (" + reviewerRole + ")");
            rc.put("stage", "Finalized".equals(newStage) ? "IQAC Final Quality Review" : "Department Verification");
            rc.put("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
            rc.put("comment", comment);
            revComments.add(rc);
            doc.setReviewerCommentsJson(toJson(revComments));
        }

        DocumentEntity saved = documentRepository.save(doc);

        // Audit log
        String hash = "0x" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) + "...seal";
        auditLogRepository.save(new AuditLogEntity(
            "AUD-" + (int)(9000 + Math.random() * 900),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm:ss a")),
            reviewerName + " (" + reviewerRole + ")",
            "Finalized".equals(newStage) ? "RECORD_APPROVED_LOCKED" : "DEPARTMENT_VERIFIED",
            saved.getId(),
            saved.getTitle(),
            priorStatus,
            newStatus + " (" + newStage + ")",
            comment != null ? comment : "Advanced verification stage",
            hash
        ));

        // Recent activity
        activityRepository.save(new RecentActivityEntity(
            "Finalized".equals(newStage) ? "check" : "forward",
            "Finalized".equals(newStage) ? "green" : "amber",
            "Finalized".equals(newStage) ? String.format("\"%s\" approved & locked by IQAC", saved.getTitle())
                                         : String.format("%s forwarded \"%s\" to IQAC", reviewerName, saved.getTitle()),
            "Just now",
            reviewerRole
        ));

        return saved;
    }

    @Transactional
    public DocumentEntity returnDocument(String id, String reviewerName, String reviewerRole, String reason) {
        DocumentEntity doc = documentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Document not found: " + id));

        String priorStatus = doc.getStatus() + " (" + doc.getCurrentStage() + ")";
        doc.setStatus("Returned");
        doc.setCurrentStage("Faculty");
        doc.setIsLocked(false);

        // Append reviewer comment
        List<Map<String, String>> revComments = parseJsonList(doc.getReviewerCommentsJson());
        Map<String, String> rc = new HashMap<>();
        rc.put("reviewer", reviewerName + " (" + reviewerRole + ")");
        rc.put("stage", "DeanHOD".equalsIgnoreCase(reviewerRole) ? "Department Verification" : "IQAC Verification");
        rc.put("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
        rc.put("comment", reason);
        revComments.add(rc);
        doc.setReviewerCommentsJson(toJson(revComments));

        // Append timeline
        List<Map<String, String>> timeline = parseJsonList(doc.getTimelineJson());
        Map<String, String> step = new HashMap<>();
        step.put("stage", "Returned for Correction - " + ("DeanHOD".equalsIgnoreCase(reviewerRole) ? "Department" : "IQAC"));
        step.put("actor", reviewerName + " (" + reviewerRole + ")");
        step.put("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
        step.put("comment", reason);
        timeline.add(step);
        doc.setTimelineJson(toJson(timeline));

        DocumentEntity saved = documentRepository.save(doc);

        // Audit log
        auditLogRepository.save(new AuditLogEntity(
            "AUD-" + (int)(9000 + Math.random() * 900),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm:ss a")),
            reviewerName + " (" + reviewerRole + ")",
            "RECORD_RETURNED",
            saved.getId(),
            saved.getTitle(),
            priorStatus,
            "Returned for Correction",
            "Mandatory Reason: " + reason,
            "0x" + UUID.randomUUID().toString().replace("-", "").substring(0, 8)
        ));

        // Recent activity
        activityRepository.save(new RecentActivityEntity(
            "return",
            "red",
            String.format("\"%s\" returned by %s: %s", saved.getTitle(), reviewerRole, reason),
            "Just now",
            reviewerRole
        ));

        return saved;
    }

    @Transactional
    public DocumentEntity lockRecordSSR(String id, String reviewerName, String reviewerRole) {
        DocumentEntity doc = documentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Document not found: " + id));

        doc.setStatus("Approved");
        doc.setCurrentStage("Finalized");
        doc.setIsLocked(true);
        doc.setEvidenceVerified(true);

        List<Map<String, String>> timeline = parseJsonList(doc.getTimelineJson());
        Map<String, String> step = new HashMap<>();
        step.put("stage", "IQAC Approved & Sealed");
        step.put("actor", reviewerName + " (" + reviewerRole + ")");
        step.put("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
        step.put("comment", "Evidence validated against NAAC indicators. Cryptographic SSR lock applied.");
        timeline.add(step);
        doc.setTimelineJson(toJson(timeline));

        DocumentEntity saved = documentRepository.save(doc);

        String hash = "0x" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) + "...seal";
        auditLogRepository.save(new AuditLogEntity(
            "AUD-" + (int)(9000 + Math.random() * 900),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm:ss a")),
            reviewerName + " (IQAC)",
            "RECORD_APPROVED_LOCKED",
            saved.getId(),
            saved.getTitle(),
            "Under Verification (IQAC)",
            "Approved & Locked",
            "Cryptographically sealed under NAAC Criterion " + (saved.getNaacCriterion() != null ? saved.getNaacCriterion() : "3.4.2"),
            hash
        ));

        activityRepository.save(new RecentActivityEntity(
            "lock",
            "green",
            String.format("\"%s\" cryptographically locked in SSR repository", saved.getTitle()),
            "Just now",
            reviewerRole
        ));

        return saved;
    }

    @Transactional
    public int batchForwardDeanQueue(String actorName, String actorRole) {
        List<DocumentEntity> pending = documentRepository.findByStatusAndCurrentStage("Under Verification", "Dean/HOD");
        for (DocumentEntity doc : pending) {
            doc.setCurrentStage("IQAC");
            List<Map<String, String>> timeline = parseJsonList(doc.getTimelineJson());
            Map<String, String> step = new HashMap<>();
            step.put("stage", "Department Verified & Forwarded");
            step.put("actor", actorName + " (" + actorRole + ")");
            step.put("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
            step.put("comment", "Batch verified against department records. Forwarded to IQAC.");
            timeline.add(step);
            doc.setTimelineJson(toJson(timeline));
            documentRepository.save(doc);
        }
        return pending.size();
    }

    @Transactional
    public int batchLockIQACQueue(String actorName, String actorRole) {
        List<DocumentEntity> pending = documentRepository.findByStatusAndCurrentStage("Under Verification", "IQAC");
        for (DocumentEntity doc : pending) {
            doc.setStatus("Approved");
            doc.setCurrentStage("Finalized");
            doc.setIsLocked(true);
            doc.setEvidenceVerified(true);
            List<Map<String, String>> timeline = parseJsonList(doc.getTimelineJson());
            Map<String, String> step = new HashMap<>();
            step.put("stage", "IQAC Approved & Sealed");
            step.put("actor", actorName + " (" + actorRole + ")");
            step.put("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
            step.put("comment", "Batch certified and sealed for NAAC SSR.");
            timeline.add(step);
            doc.setTimelineJson(toJson(timeline));
            documentRepository.save(doc);
        }
        return pending.size();
    }

    public Map<String, Object> getKPIs() {
        List<DocumentEntity> docs = documentRepository.findAll();
        long total = docs.size();
        long underVerification = docs.stream().filter(d -> "Under Verification".equalsIgnoreCase(d.getStatus())).count();
        long returned = docs.stream().filter(d -> "Returned".equalsIgnoreCase(d.getStatus())).count();
        long approved = docs.stream().filter(d -> "Approved".equalsIgnoreCase(d.getStatus())).count();
        long draft = docs.stream().filter(d -> "Draft".equalsIgnoreCase(d.getStatus())).count();

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("total", total);
        kpis.put("underVerification", underVerification);
        kpis.put("returned", returned);
        kpis.put("approved", approved);
        kpis.put("draft", draft);
        return kpis;
    }

    @Transactional
    public void deleteDocument(String id) {
        documentRepository.deleteById(id);
    }

    private List<Map<String, String>> parseJsonList(String json) {
        if (json == null || json.trim().isEmpty()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, String>>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }
}

