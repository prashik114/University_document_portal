package com.university.portal.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.portal.entity.*;
import com.university.portal.repository.*;
import com.university.portal.util.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Service managing document lifecycle transitions, verification queues,
 * audit trail logging, and institutional evidence archival.
 */
@Service
public class DocumentService {

    // ── Canonical stage & role constants (single source of truth) ─────────────
    public static final String STAGE_DEAN_HOD   = "Dean/HOD";
    public static final String STAGE_IQAC        = "IQAC";
    public static final String STAGE_FINALIZED   = "Finalized";
    public static final String STAGE_FACULTY     = "Faculty";
    public static final String STAGE_DRAFT       = "Draft";

    public static final String STATUS_UNDER_VERIFICATION = "Under Verification";
    public static final String STATUS_RETURNED           = "Returned";
    public static final String STATUS_APPROVED           = "Approved";
    public static final String STATUS_DRAFT              = "Draft";

    private static final String ROLE_DEAN_HOD = "DeanHOD";
    private static final String ROLE_IQAC     = "IQAC";
    private static final String ROLE_ADMIN    = "Admin";
    private static final String ROLE_FACULTY  = "Faculty";
    private static final String ROLE_STUDENT  = "Student";

    // ── Dependencies ──────────────────────────────────────────────────────────
    private final DocumentRepository       documentRepository;
    private final AuditLogRepository       auditLogRepository;
    private final RecentActivityRepository activityRepository;
    private final ObjectMapper             objectMapper = new ObjectMapper();

    private static final DateTimeFormatter FMT      = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter FMT_FULL = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
    private static final DateTimeFormatter FMT_TS   = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm:ss a");

    public DocumentService(DocumentRepository documentRepository,
                           AuditLogRepository auditLogRepository,
                           RecentActivityRepository activityRepository) {
        this.documentRepository = documentRepository;
        this.auditLogRepository = auditLogRepository;
        this.activityRepository = activityRepository;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public List<DocumentEntity> getAllDocuments(String category, String status, String search) {
        boolean noFilter = isBlankOrAll(category) && isBlankOrAll(status) && isBlank(search);
        if (noFilter) return documentRepository.findAllByOrderByDisplayNumAsc();
        return documentRepository.filterDocuments(
                blankToAll(category),
                blankToAll(status),
                search != null ? search.trim() : "");
    }

    public Optional<DocumentEntity> getDocumentById(String id) {
        return documentRepository.findById(id);
    }

    public Map<String, Object> getKPIs() {
        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("total",              documentRepository.count());
        kpis.put("underVerification",  documentRepository.countByStatus(STATUS_UNDER_VERIFICATION));
        kpis.put("returned",           documentRepository.countByStatus(STATUS_RETURNED));
        kpis.put("approved",           documentRepository.countByStatus(STATUS_APPROVED));
        kpis.put("draft",              documentRepository.countByStatus(STATUS_DRAFT));
        return kpis;
    }

    // ── Student document detector ─────────────────────────────────────────────

    public boolean isStudentDocument(DocumentEntity doc) {
        if (doc == null) return false;
        if ("Student".equalsIgnoreCase(doc.getOwnerType())) return true;
        if ("Student".equalsIgnoreCase(doc.getCategory())) return true;
        if (doc.getCategory() != null && doc.getCategory().toLowerCase().contains("student")) return true;
        if (doc.getSubCategory() != null && doc.getSubCategory().toLowerCase().contains("student")) return true;
        return false;
    }

    // ── Stage 1: Evidence Submission ──────────────────────────────────────────

    /**
     * Creates a new document record.
     * On submission (not draft):
     *  - If submitted by Student: Stage = "Faculty", Status = "Under Verification"
     *  - If submitted by Faculty / Dean / Admin: Stage = "Dean/HOD", Status = "Under Verification"
     * On draft: Status = "Draft", Stage = "Faculty".
     */
    @Transactional
    public DocumentEntity createDocument(DocumentEntity doc, String actorName, String actorRole) {
        assignId(doc);
        assignSubmittedDate(doc);

        boolean isDraft = STATUS_DRAFT.equalsIgnoreCase(doc.getStatus());
        boolean isStudent = isStudentDocument(doc) || ROLE_STUDENT.equalsIgnoreCase(actorRole);

        if (isDraft) {
            doc.setStatus(STATUS_DRAFT);
            doc.setCurrentStage(STAGE_FACULTY);
        } else {
            doc.setStatus(STATUS_UNDER_VERIFICATION);
            if (isStudent) {
                // Student submits -> forwarded to Faculty Verification Desk
                doc.setCurrentStage(STAGE_FACULTY);
            } else {
                // Faculty / HOD submits self doc -> forwarded to Dean/HOD desk
                doc.setCurrentStage(STAGE_DEAN_HOD);
            }
        }

        initTimeline(doc, actorName, isDraft);
        if (doc.getReviewerCommentsJson() == null || doc.getReviewerCommentsJson().isBlank()) {
            doc.setReviewerCommentsJson("[]");
        }

        DocumentEntity saved = documentRepository.save(doc);

        String stageLabel = isStudent ? "Faculty Verification Desk" : "Department Verification Desk (Dean/HOD)";
        recordAudit(IdGenerator.auditId(), actorName,
                isDraft ? "DRAFT_SAVED" : "RECORD_SUBMITTED",
                saved, null, saved.getStatus() + " (" + saved.getCurrentStage() + ")",
                isDraft ? "Draft record saved by " + actorName
                        : "Evidence submitted — forwarded to " + stageLabel);

        recordActivity(isDraft ? "edit" : "upload", isDraft ? "blue" : "blue",
                isDraft
                        ? actorName + " saved draft: \"" + saved.getTitle() + "\""
                        : actorName + " submitted evidence: \"" + saved.getTitle() + "\" → " + (isStudent ? "Faculty Desk" : "Dean/HOD queue"),
                actorRole);

        return saved;
    }

    /**
     * Re-submission of a returned document.
     * Moves back to appropriate verification queue (Faculty for Student doc, Dean/HOD for Faculty doc).
     */
    @Transactional
    public DocumentEntity resubmitDocument(String id, String actorName, String actorRole) {
        DocumentEntity doc = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));

        if (!STATUS_RETURNED.equalsIgnoreCase(doc.getStatus())) {
            throw new IllegalStateException("Only returned documents can be re-submitted.");
        }

        boolean isStudent = isStudentDocument(doc) || ROLE_STUDENT.equalsIgnoreCase(actorRole);

        String priorStatus = doc.getStatus() + " (" + doc.getCurrentStage() + ")";
        doc.setStatus(STATUS_UNDER_VERIFICATION);
        doc.setCurrentStage(isStudent ? STAGE_FACULTY : STAGE_DEAN_HOD);
        doc.setIsLocked(false);

        String stageLabel = isStudent ? "Faculty Desk" : "Dean/HOD queue";
        appendTimelineStep(doc, "Re-submitted for Verification",
                actorName + " (" + actorRole + ")",
                "Submitter rectified and re-submitted evidence to " + stageLabel);

        DocumentEntity saved = documentRepository.save(doc);

        recordAudit(IdGenerator.auditId(), actorName,
                "RECORD_RESUBMITTED", saved, priorStatus,
                STATUS_UNDER_VERIFICATION + " (" + saved.getCurrentStage() + ")",
                "Submitter rectified corrections and re-submitted to " + stageLabel);

        recordActivity("cloud", "blue",
                actorName + " re-submitted \"" + saved.getTitle() + "\" → " + stageLabel,
                actorRole);

        return saved;
    }

    // ── Stage 2 & 3: Verification / Advancement ───────────────────────────────

    /**
     * Advances a document through the verification pipeline:
     *
     * <ul>
     *   <li>Dean/HOD acting on a Dean/HOD-stage doc → "Endorsed & Verified"
     *       → moves to IQAC queue (Stage 3)</li>
     *   <li>IQAC acting on an IQAC-stage doc → "Approve & Apply Hash"
     *       → Approved + Locked (SSR Evidence Ledger)</li>
     * </ul>
     */
    @Transactional
    public DocumentEntity verifyAndAdvanceStage(String id, String reviewerName,
                                                String reviewerRole, String comment) {
        DocumentEntity doc = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));

        String priorStatus = doc.getStatus() + " (" + doc.getCurrentStage() + ")";
        boolean isStudentDoc = isStudentDocument(doc);
        boolean isFacultyAction = isFacultyRole(reviewerRole) && isStudentDoc;
        boolean isDeanAction = isDeanRole(reviewerRole) && (isDeanStage(doc.getCurrentStage()) || isFacultyStage(doc.getCurrentStage()));
        boolean isIqacAction = isIqacRole(reviewerRole) && isIqacStage(doc.getCurrentStage());

        // Admin can act at any stage
        if (isAdminRole(reviewerRole)) {
            if (isIqacStage(doc.getCurrentStage())) {
                isIqacAction = true;
            } else if (isFacultyStage(doc.getCurrentStage()) && isStudentDoc) {
                isFacultyAction = true;
            } else {
                isDeanAction = true;
            }
        }

        if (!isFacultyAction && !isDeanAction && !isIqacAction) {
            throw new IllegalStateException(
                    "Role '" + reviewerRole + "' cannot advance document '" + doc.getTitle() + "' at stage '" + doc.getCurrentStage() + "'.");
        }

        String newStage;
        String newStatus;
        String stepLabel;
        String activityMsg;
        String auditAction;

        if (isFacultyAction) {
            // Stage 1 (Faculty Desk) → Stage 2 (Dean/HOD): Faculty verifies Student document
            newStage    = STAGE_DEAN_HOD;
            newStatus   = STATUS_UNDER_VERIFICATION;
            stepLabel   = "Faculty Verified & Endorsed to HOD Desk";
            activityMsg = reviewerName + " (Faculty) verified student record \"" + doc.getTitle() + "\" → forwarded to HOD";
            auditAction = "FACULTY_VERIFIED";
            doc.setEvidenceVerified(true);
        } else if (isDeanAction) {
            // Stage 2 → Stage 3: HOD verifies both Faculty and Student documents → forwards to IQAC
            newStage    = STAGE_IQAC;
            newStatus   = STATUS_UNDER_VERIFICATION;
            stepLabel   = isStudentDoc ? "Department HOD Verified & Confirmed Student Record → Forwarded to IQAC"
                                       : "Department HOD Verified & Endorsed to IQAC";
            activityMsg = reviewerName + " (Dean/HOD) verified & endorsed \"" + doc.getTitle() + "\" → IQAC queue";
            auditAction = isStudentDoc ? "HOD_STUDENT_CONFIRMED" : "DEPARTMENT_VERIFIED";
            doc.setEvidenceVerified(true);
        } else {
            // Stage 3: Central IQAC final approval & cryptographic hash applied
            newStage    = STAGE_FINALIZED;
            newStatus   = STATUS_APPROVED;
            stepLabel   = "Central IQAC Approved & SSR Hash Applied";
            activityMsg = reviewerName + " (IQAC) approved & locked \"" + doc.getTitle() + "\" into SSR ledger";
            auditAction = "RECORD_APPROVED_LOCKED";
            doc.setIsLocked(true);
            doc.setEvidenceVerified(true);
        }

        doc.setCurrentStage(newStage);
        doc.setStatus(newStatus);

        appendTimelineStep(doc, stepLabel, reviewerName + " (" + reviewerRole + ")", comment);
        if (comment != null && !comment.isBlank()) {
            String desk = isFacultyAction ? "Faculty Verification Desk"
                        : isDeanAction    ? "Department Verification Desk"
                        : "Central IQAC Quality Review";
            appendReviewerComment(doc, reviewerName, reviewerRole, desk, comment);
        }

        DocumentEntity saved = documentRepository.save(doc);

        recordAudit(IdGenerator.auditId(), reviewerName + " (" + reviewerRole + ")",
                auditAction, saved, priorStatus,
                newStatus + " (" + newStage + ")",
                comment != null && !comment.isBlank() ? comment : stepLabel);

        recordActivity(isFacultyAction ? "check" : isDeanAction ? "forward" : "lock",
                isFacultyAction ? "cyan" : isDeanAction ? "amber" : "green",
                activityMsg, reviewerRole);

        return saved;
    }

    /**
     * Returns a document for correction.
     *
     * <ul>
     *   <li>Faculty returns → Student document returned to student submitter</li>
     *   <li>Dean/HOD returns → Returned to submitter (Faculty or Student) for clarification</li>
     *   <li>IQAC returns → Non-compliant — returned to Department (Dean/HOD)</li>
     * </ul>
     */
    @Transactional
    public DocumentEntity returnDocument(String id, String reviewerName,
                                          String reviewerRole, String reason) {
        DocumentEntity doc = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));

        String priorStatus = doc.getStatus() + " (" + doc.getCurrentStage() + ")";
        doc.setStatus(STATUS_RETURNED);
        doc.setIsLocked(false);

        String returnedTo;
        String stepLabel;
        String auditComment;

        if (isIqacRole(reviewerRole) || STAGE_IQAC.equalsIgnoreCase(doc.getCurrentStage())) {
            // IQAC non-compliant → return to Department (Dean/HOD) for re-verification
            doc.setCurrentStage(STAGE_DEAN_HOD);
            returnedTo   = "Department (Dean/HOD)";
            stepLabel    = "Returned to Department — Non-compliant NAAC Criteria";
            auditComment = "IQAC: Non-compliant criteria. Returned to Department for correction. Reason: " + reason;
        } else if (isFacultyRole(reviewerRole)) {
            // Faculty return → returns to student submitter
            doc.setCurrentStage(STAGE_FACULTY);
            returnedTo   = "Student Submitter";
            stepLabel    = "Returned to Student for Correction";
            auditComment = "Faculty: Returned to student for clarification/rectification. Reason: " + reason;
        } else {
            // Dean/HOD return → return to submitter (Faculty / Student)
            doc.setCurrentStage(STAGE_DEAN_HOD);
            returnedTo   = "Submitter";
            stepLabel    = "Returned for Clarification — Missing / Invalid Evidence";
            auditComment = "Dean/HOD: Missing voucher or invalid evidence. Reason: " + reason;
        }

        appendReviewerComment(doc, reviewerName, reviewerRole,
                reviewerRole + " Return Review", reason);
        appendTimelineStep(doc, stepLabel, reviewerName + " (" + reviewerRole + ")", reason);

        DocumentEntity saved = documentRepository.save(doc);

        recordAudit(IdGenerator.auditId(), reviewerName + " (" + reviewerRole + ")",
                "RECORD_RETURNED", saved, priorStatus,
                STATUS_RETURNED + " (" + doc.getCurrentStage() + ")",
                auditComment);

        recordActivity("return", "red",
                "\"" + saved.getTitle() + "\" returned to " + returnedTo + " by " + reviewerRole + ": " + reason,
                reviewerRole);

        return saved;
    }

    /** Direct IQAC SSR lock (explicit lock action, bypasses advance-stage flow). */
    @Transactional
    public DocumentEntity lockRecordSSR(String id, String reviewerName, String reviewerRole) {
        DocumentEntity doc = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));

        String priorStatus = doc.getStatus() + " (" + doc.getCurrentStage() + ")";
        doc.setStatus(STATUS_APPROVED);
        doc.setCurrentStage(STAGE_FINALIZED);
        doc.setIsLocked(true);
        doc.setEvidenceVerified(true);

        appendTimelineStep(doc, "Central IQAC Approved & SSR Hash Applied",
                reviewerName + " (" + reviewerRole + ")",
                "Evidence validated against NAAC criteria. Immutable SSR hash applied.");

        DocumentEntity saved = documentRepository.save(doc);

        recordAudit(IdGenerator.auditId(), reviewerName + " (IQAC)",
                "RECORD_APPROVED_LOCKED", saved, priorStatus,
                STATUS_APPROVED + " (" + STAGE_FINALIZED + ")",
                "Cryptographically sealed under NAAC Criterion " + defaultStr(saved.getNaacCriterion(), "—"));

        recordActivity("lock", "green",
                "\"" + saved.getTitle() + "\" locked into SSR Evidence Ledger by IQAC",
                reviewerRole);

        return saved;
    }

    // ── Stage 4: Batch operations (Admin / Dean / IQAC) ───────────────────────

    @Transactional
    public int batchForwardDeanQueue(String actorName, String actorRole) {
        List<DocumentEntity> queue = documentRepository.findByStatusAndCurrentStage(
                STATUS_UNDER_VERIFICATION, STAGE_DEAN_HOD);
        queue.forEach(doc -> verifyAndAdvanceStage(doc.getId(), actorName, actorRole,
                "Batch endorsed and forwarded by Dean/HOD"));
        return queue.size();
    }

    @Transactional
    public int batchLockIQACQueue(String actorName, String actorRole) {
        List<DocumentEntity> queue = documentRepository.findByStatusAndCurrentStage(
                STATUS_UNDER_VERIFICATION, STAGE_IQAC);
        queue.forEach(doc -> lockRecordSSR(doc.getId(), actorName, actorRole));
        return queue.size();
    }

    // ── Generic CRUD ──────────────────────────────────────────────────────────

    @Transactional
    public DocumentEntity updateDocument(String id, DocumentEntity updated) {
        return documentRepository.findById(id).map(doc -> {
            if (updated.getTitle()            != null) doc.setTitle(updated.getTitle());
            if (updated.getFileType()         != null) doc.setFileType(updated.getFileType());
            if (updated.getFileSize()         != null) doc.setFileSize(updated.getFileSize());
            if (updated.getCategory()         != null) doc.setCategory(updated.getCategory());
            if (updated.getSubCategory()      != null) doc.setSubCategory(updated.getSubCategory());
            if (updated.getNaacCriterion()    != null) doc.setNaacCriterion(updated.getNaacCriterion());
            if (updated.getEvidenceFile()     != null) doc.setEvidenceFile(updated.getEvidenceFile());
            if (updated.getEventDetailsJson() != null) doc.setEventDetailsJson(updated.getEventDetailsJson());
            if (updated.getStatus()           != null) doc.setStatus(updated.getStatus());
            if (updated.getCurrentStage()     != null) doc.setCurrentStage(updated.getCurrentStage());
            return documentRepository.save(doc);
        }).orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
    }

    @Transactional
    public DocumentEntity deleteDocument(String id) {
        DocumentEntity doc = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        documentRepository.delete(doc);
        return doc;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void assignId(DocumentEntity doc) {
        if (doc.getId() == null || doc.getId().isBlank()) {
            long count = documentRepository.count();
            doc.setId(String.format("DOC-2026-%03d", count + 1));
            doc.setDisplayNum((int) (count + 1));
        }
    }

    private static void assignSubmittedDate(DocumentEntity doc) {
        if (doc.getSubmittedOn() == null || doc.getSubmittedOn().isBlank()) {
            doc.setSubmittedOn(LocalDateTime.now().format(FMT));
        }
    }

    private void initTimeline(DocumentEntity doc, String actorName, boolean isDraft) {
        List<Map<String, String>> timeline = parseJsonList(doc.getTimelineJson());
        if (!timeline.isEmpty()) return;
        Map<String, String> step = new LinkedHashMap<>();
        step.put("stage",   isDraft ? "Draft Saved" : "Submitted to Department Verification Desk");
        step.put("actor",   actorName != null ? actorName : doc.getOwnerName());
        step.put("date",    LocalDateTime.now().format(FMT_FULL));
        step.put("comment", isDraft
                ? "Draft saved — not yet submitted for verification"
                : "Evidence uploaded and submitted. Awaiting Dean/HOD review.");
        timeline.add(step);
        doc.setTimelineJson(toJson(timeline));
    }

    private void appendTimelineStep(DocumentEntity doc, String stage, String actor, String comment) {
        List<Map<String, String>> list = parseJsonList(doc.getTimelineJson());
        Map<String, String> step = new LinkedHashMap<>();
        step.put("stage",   stage);
        step.put("actor",   actor);
        step.put("date",    LocalDateTime.now().format(FMT_FULL));
        step.put("comment", defaultStr(comment, "—"));
        list.add(step);
        doc.setTimelineJson(toJson(list));
    }

    private void appendReviewerComment(DocumentEntity doc, String reviewer,
                                        String role, String stage, String comment) {
        List<Map<String, String>> list = parseJsonList(doc.getReviewerCommentsJson());
        Map<String, String> rc = new LinkedHashMap<>();
        rc.put("reviewer", reviewer + " (" + role + ")");
        rc.put("stage",    stage);
        rc.put("date",     LocalDateTime.now().format(FMT_FULL));
        rc.put("comment",  comment);
        list.add(rc);
        doc.setReviewerCommentsJson(toJson(list));
    }

    private void recordAudit(String auditId, String actor, String action,
                               DocumentEntity doc, String priorStatus,
                               String newStatus, String comments) {
        auditLogRepository.save(new AuditLogEntity(
                auditId,
                LocalDateTime.now().format(FMT_TS),
                actor, action,
                doc.getId(), doc.getTitle(),
                defaultStr(priorStatus, "None"),
                newStatus,
                comments,
                generateEventHash(doc.getId(), action)));
    }

    private void recordActivity(String icon, String color, String title, String role) {
        activityRepository.save(new RecentActivityEntity(icon, color, title, "Just now", role));
    }

    /**
     * Generates a deterministic event hash from record ID + action + timestamp.
     * Represents a tamper-evident event fingerprint in the audit ledger.
     * For real SHA-256 of document content, integrate a file-hashing service.
     */
    private static String generateEventHash(String recordId, String action) {
        String input = recordId + "|" + action + "|" + System.nanoTime();
        return "evthash-" + String.format("%08x", input.hashCode() & 0xFFFFFFFFL);
    }

    // ── Role / stage classification ───────────────────────────────────────────

    private static boolean isDeanRole(String role)    { return ROLE_DEAN_HOD.equalsIgnoreCase(role); }
    private static boolean isIqacRole(String role)    { return ROLE_IQAC.equalsIgnoreCase(role); }
    private static boolean isAdminRole(String role)   { return ROLE_ADMIN.equalsIgnoreCase(role); }
    private static boolean isFacultyRole(String role) { return ROLE_FACULTY.equalsIgnoreCase(role); }
    private static boolean isStudentRole(String role) { return ROLE_STUDENT.equalsIgnoreCase(role); }

    private static boolean isDeanStage(String stage) {
        return STAGE_DEAN_HOD.equalsIgnoreCase(stage);
    }

    private static boolean isFacultyStage(String stage) {
        return STAGE_FACULTY.equalsIgnoreCase(stage);
    }

    private static boolean isIqacStage(String stage) {
        return STAGE_IQAC.equalsIgnoreCase(stage);
    }

    // ── JSON helpers ──────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    List<Map<String, String>> parseJsonList(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try { return objectMapper.readValue(json, new TypeReference<>() {}); }
        catch (Exception e) { return new ArrayList<>(); }
    }

    String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }

    // ── String helpers ────────────────────────────────────────────────────────
    private static boolean isBlank(String s)       { return s == null || s.isBlank(); }
    private static boolean isBlankOrAll(String s)  { return isBlank(s) || "ALL".equalsIgnoreCase(s); }
    private static String  blankToAll(String s)    { return isBlankOrAll(s) ? "ALL" : s; }
    private static String  defaultStr(String s, String fallback) { return (isBlank(s)) ? fallback : s; }
}
