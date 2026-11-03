package com.university.portal.controller;

import com.university.portal.dto.DocumentDTO;
import com.university.portal.dto.ReviewActionDTO;
import com.university.portal.entity.DocumentEntity;
import com.university.portal.repository.UserRepository;
import com.university.portal.service.DocumentService;
import com.university.portal.util.DocumentMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * REST controller for all document lifecycle operations enforcing institutional RBAC:
 *
 * Rules:
 * 1. IT Admin creates all user accounts and assigns primary and additional departments.
 * 2. Each HOD can create, view, and manage documents belonging only to their assigned department by default.
 * 3. IT Admin can optionally grant an HOD access to additional departments without changing their primary department.
 * 4. Teachers and Students can upload their certificates, research papers, and academic documents.
 * 5. Respective Department HOD reviews documents, approves them, and forwards them to IQAC.
 * 6. IQAC performs final verification and locks approved documents permanently against direct modification.
 * 7. NAAC Inspectors receive read-only access to authorised documents and can view and download reports.
 */
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final UserRepository userRepository;

    public DocumentController(DocumentService documentService, UserRepository userRepository) {
        this.documentService = documentService;
        this.userRepository = userRepository;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @GetMapping
    public List<DocumentDTO> getAll(
            @RequestParam(defaultValue = "ALL") String category,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(required = false)     String search,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String actorDepartment,
            @RequestParam(required = false) String dept,
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String id) {

        String callerRole = resolveRole(role, actorRole, actorRoleHeader, userRoleHeader);
        String callerDept = resolveDept(dept, actorDepartment, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(id, actorId, actorIdHeader, userIdHeader);

        List<DocumentDTO> docs = documentService.getAllDocuments(category, status, search)
                .stream()
                .map(DocumentMapper::toDTO)
                .toList();

        // 1. Central IT Admin & IQAC: View all institutional records
        if ("Admin".equalsIgnoreCase(callerRole) || "IQAC".equalsIgnoreCase(callerRole)) {
            return docs;
        }

        // Rule 7: NAAC Inspector receives read-only access to authorised (approved) documents only
        if ("Inspector".equalsIgnoreCase(callerRole)) {
            return docs.stream()
                    .filter(d -> "Approved".equalsIgnoreCase(d.getStatus()))
                    .toList();
        }

        // Rule 2 & 3: HOD access (primary assigned department + any additional granted departments)
        if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            List<String> allowedDepts = resolveHodAllowedDepartments(callerId, callerDept);
            if (allowedDepts.isEmpty()) return docs;
            return docs.stream()
                    .filter(d -> d.getDepartment() != null &&
                            allowedDepts.stream().anyMatch(ad -> ad.equalsIgnoreCase(d.getDepartment().trim())))
                    .toList();
        }

        // Rule 4: Faculty views assigned department records and own submissions
        if ("Faculty".equalsIgnoreCase(callerRole)) {
            if (callerDept.isBlank() && callerId.isBlank()) return docs;
            return docs.stream()
                    .filter(d -> (!callerDept.isBlank() && d.getDepartment() != null && d.getDepartment().trim().equalsIgnoreCase(callerDept.trim())) ||
                                 (!callerId.isBlank() && callerId.equalsIgnoreCase(d.getOwnerId())))
                    .toList();
        }

        // Rule 4: Student views own certificates and submissions
        if ("Student".equalsIgnoreCase(callerRole)) {
            return docs.stream()
                    .filter(d -> (!callerId.isBlank() && callerId.equalsIgnoreCase(d.getOwnerId())) ||
                                 "Student".equalsIgnoreCase(d.getCategory()))
                    .toList();
        }

        return docs;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(
            @PathVariable String id,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String actorDepartment,
            @RequestParam(required = false) String dept,
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String idParam) {

        String callerRole = resolveRole(role, actorRole, actorRoleHeader, userRoleHeader);
        String callerDept = resolveDept(dept, actorDepartment, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(idParam, actorId, actorIdHeader, userIdHeader);

        DocumentEntity doc = documentService.getDocumentById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.notFound().build();
        }

        // Rule 7: Inspector read-only access to authorized documents only
        if ("Inspector".equalsIgnoreCase(callerRole)) {
            if (!"Approved".equalsIgnoreCase(doc.getStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: External NAAC Inspectors have access only to approved & accredited documents."));
            }
        }

        // Rule 2 & 3: HOD department authorization check
        if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            if (!isDepartmentAllowedForHod(doc.getDepartment(), callerId, callerDept)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: You are not authorized to view records for " + doc.getDepartment() + ". Contact Central IT Admin to configure additional department permissions."));
            }
        }

        return ResponseEntity.ok(DocumentMapper.toDTO(doc));
    }

    @GetMapping("/kpis")
    public ResponseEntity<Map<String, Object>> getKPIs() {
        return ResponseEntity.ok(documentService.getKPIs());
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    /**
     * Rule 4: Teachers and Students upload certificates, research papers, and academic documents.
     */
    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody DocumentEntity doc,
            @RequestParam(defaultValue = "Faculty") String actorName,
            @RequestParam(defaultValue = "Faculty") String actorRole,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {

        String callerRole = resolveRole(null, actorRole, actorRoleHeader, userRoleHeader);
        String callerDept = resolveDept(null, null, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(null, null, actorIdHeader, userIdHeader);

        // Rule 7: Inspector is strictly read-only
        if ("Inspector".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: External NAAC Inspectors have read-only access and cannot create documents."));
        }

        // HOD creating document: department must be in allowed departments
        if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            if (!isDepartmentAllowedForHod(doc.getDepartment(), callerId, callerDept)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Cannot create documents for unauthorized department " + doc.getDepartment() + "."));
            }
        }

        DocumentEntity saved = documentService.createDocument(doc, actorName, callerRole.isBlank() ? "Faculty" : callerRole);
        return ResponseEntity.ok(DocumentMapper.toDTO(saved));
    }

    /**
     * Rule 6: Locks approved documents permanently against direct modification.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable String id,
            @RequestBody DocumentEntity doc,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {

        String callerRole = resolveRole(null, null, actorRoleHeader, userRoleHeader);
        String callerDept = resolveDept(null, null, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(null, null, actorIdHeader, userIdHeader);

        if ("Inspector".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: External NAAC Inspectors have read-only access."));
        }

        DocumentEntity existing = documentService.getDocumentById(id).orElse(null);
        if (existing != null && Boolean.TRUE.equals(existing.getIsLocked())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Document " + id + " is locked by IQAC and permanently protected against modification."));
        }

        if ("DeanHOD".equalsIgnoreCase(callerRole) && existing != null) {
            if (!isDepartmentAllowedForHod(existing.getDepartment(), callerId, callerDept)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Cannot modify documents for unauthorized department " + existing.getDepartment() + "."));
            }
        }

        return ResponseEntity.ok(DocumentMapper.toDTO(
                documentService.updateDocument(id, doc)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable String id,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {

        String callerRole = resolveRole(null, null, actorRoleHeader, userRoleHeader);

        if (!"Admin".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IT Administrators can delete repository records."));
        }

        DocumentEntity existing = documentService.getDocumentById(id).orElse(null);
        if (existing != null && Boolean.TRUE.equals(existing.getIsLocked())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Document " + id + " is locked by IQAC and permanently protected against deletion."));
        }

        documentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    // ── Workflow Actions ───────────────────────────────────────────────────────

    @PostMapping("/{id}/resubmit")
    public ResponseEntity<?> resubmit(
            @PathVariable String id,
            @RequestParam(defaultValue = "Faculty") String actorName,
            @RequestParam(defaultValue = "Faculty") String actorRole,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {

        String callerRole = resolveRole(null, actorRole, actorRoleHeader, userRoleHeader);
        if ("Inspector".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: External NAAC Inspectors have read-only access."));
        }

        return ResponseEntity.ok(DocumentMapper.toDTO(
                documentService.resubmitDocument(id, actorName, callerRole)));
    }

    /**
     * Rule 5: Respective Department HOD reviews documents, approves them, and forwards them to IQAC.
     */
    @PostMapping("/{id}/verify")
    public ResponseEntity<?> verify(
            @PathVariable String id,
            @RequestBody(required = false) ReviewActionDTO body,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {

        String callerRole = resolveRole(null, null, actorRoleHeader, userRoleHeader);
        if (callerRole.isBlank() && body != null && body.getReviewerRole() != null) {
            callerRole = body.getReviewerRole();
        }
        if (callerRole.isBlank()) {
            callerRole = "DeanHOD";
        }

        String callerDept = resolveDept(null, null, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(null, null, actorIdHeader, userIdHeader);

        if ("Inspector".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: External NAAC Inspectors have read-only access."));
        }

        DocumentEntity existing = documentService.getDocumentById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        // Rule 5: Respective Department HOD verification check
        if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            if (!isDepartmentAllowedForHod(existing.getDepartment(), callerId, callerDept)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: You are not authorized to review or endorse documents for " + existing.getDepartment() + ". Contact Central IT Admin for additional department permissions."));
            }
        }

        String reviewerName = body != null && body.getReviewerName() != null ? body.getReviewerName() : "Verifier";
        String comment = body != null ? body.getComment() : "";

        return ResponseEntity.ok(DocumentMapper.toDTO(
                documentService.verifyAndAdvanceStage(id, reviewerName, callerRole, comment)));
    }

    /**
     * HOD returns document with clarification reason to submitter.
     */
    @PostMapping("/{id}/return")
    public ResponseEntity<?> returnRecord(
            @PathVariable String id,
            @RequestBody ReviewActionDTO body,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {

        String callerRole = resolveRole(null, null, actorRoleHeader, userRoleHeader);
        if (callerRole.isBlank() && body != null && body.getReviewerRole() != null) {
            callerRole = body.getReviewerRole();
        }
        if (callerRole.isBlank()) {
            callerRole = "DeanHOD";
        }

        String callerDept = resolveDept(null, null, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(null, null, actorIdHeader, userIdHeader);

        if ("Inspector".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: External NAAC Inspectors have read-only access."));
        }

        DocumentEntity existing = documentService.getDocumentById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            if (!isDepartmentAllowedForHod(existing.getDepartment(), callerId, callerDept)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Cannot return documents outside your authorized departments."));
            }
        }

        return ResponseEntity.ok(DocumentMapper.toDTO(
                documentService.returnDocument(id,
                        body.getReviewerName(), callerRole, body.getReason())));
    }

    /**
     * Rule 6: IQAC performs final verification and locks approved documents permanently against direct modification.
     */
    @PostMapping("/{id}/lock")
    public ResponseEntity<?> lock(
            @PathVariable String id,
            @RequestBody(required = false) ReviewActionDTO body,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {

        String callerRole = resolveRole(null, null, actorRoleHeader, userRoleHeader);
        if (callerRole.isBlank() && body != null && body.getReviewerRole() != null) {
            callerRole = body.getReviewerRole();
        }

        // Rule 6: Only IQAC (or Admin) can lock approved records
        if (!"IQAC".equalsIgnoreCase(callerRole) && !"Admin".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IQAC can perform final verification and lock approved documents."));
        }

        String reviewerName = body != null && body.getReviewerName() != null ? body.getReviewerName() : "IQAC Lead";

        return ResponseEntity.ok(DocumentMapper.toDTO(
                documentService.lockRecordSSR(id, reviewerName, callerRole)));
    }

    @PostMapping("/batch-forward")
    public ResponseEntity<Map<String, Object>> batchForward(
            @RequestBody(required = false) ReviewActionDTO body,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        String role = resolveRole(null, null, actorRoleHeader, userRoleHeader);
        if (role.isBlank() && body != null && body.getReviewerRole() != null) {
            role = body.getReviewerRole();
        }
        if (role.isBlank()) role = "DeanHOD";
        String name = body != null && body.getReviewerName() != null ? body.getReviewerName() : "Dean";
        int count = documentService.batchForwardDeanQueue(name, role);
        return ResponseEntity.ok(Map.of("message", "Batch forwarded", "count", count));
    }

    @PostMapping("/batch-lock")
    public ResponseEntity<?> batchLock(
            @RequestBody(required = false) ReviewActionDTO body,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {
        String role = resolveRole(null, null, actorRoleHeader, userRoleHeader);
        if (role.isBlank() && body != null && body.getReviewerRole() != null) {
            role = body.getReviewerRole();
        }
        if (!"IQAC".equalsIgnoreCase(role) && !"Admin".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only IQAC can batch lock documents."));
        }
        String name = body != null && body.getReviewerName() != null ? body.getReviewerName() : "IQAC";
        int count = documentService.batchLockIQACQueue(name, role);
        return ResponseEntity.ok(Map.of("message", "Batch locked", "count", count));
    }

    // ── Helper methods for role and department authorization ──────────────────

    private String resolveRole(String r1, String r2, String h1, String h2) {
        if (r1 != null && !r1.isBlank()) return r1.trim();
        if (r2 != null && !r2.isBlank()) return r2.trim();
        if (h1 != null && !h1.isBlank()) return h1.trim();
        if (h2 != null && !h2.isBlank()) return h2.trim();
        return "";
    }

    private String resolveDept(String d1, String d2, String h1, String h2) {
        if (d1 != null && !d1.isBlank()) return d1.trim();
        if (d2 != null && !d2.isBlank()) return d2.trim();
        if (h1 != null && !h1.isBlank()) return h1.trim();
        if (h2 != null && !h2.isBlank()) return h2.trim();
        return "";
    }

    private String resolveId(String i1, String i2, String h1, String h2) {
        if (i1 != null && !i1.isBlank()) return i1.trim();
        if (i2 != null && !i2.isBlank()) return i2.trim();
        if (h1 != null && !h1.isBlank()) return h1.trim();
        if (h2 != null && !h2.isBlank()) return h2.trim();
        return "";
    }

    private List<String> resolveHodAllowedDepartments(String actorId, String fallbackDept) {
        List<String> allowed = new ArrayList<>();
        if (actorId != null && !actorId.isBlank()) {
            userRepository.findById(actorId).ifPresent(u -> allowed.addAll(u.getAllowedDepartments()));
            if (allowed.isEmpty()) {
                userRepository.findByEmployeeId(actorId).ifPresent(u -> allowed.addAll(u.getAllowedDepartments()));
            }
            if (allowed.isEmpty()) {
                userRepository.findByEmail(actorId).ifPresent(u -> allowed.addAll(u.getAllowedDepartments()));
            }
        }
        if (allowed.isEmpty() && fallbackDept != null && !fallbackDept.isBlank()) {
            allowed.add(fallbackDept.trim());
        }
        return allowed;
    }

    private boolean isDepartmentAllowedForHod(String targetDept, String actorId, String fallbackDept) {
        if (targetDept == null || targetDept.isBlank()) return true;
        List<String> allowed = resolveHodAllowedDepartments(actorId, fallbackDept);
        if (allowed.isEmpty()) return false;
        return allowed.stream().anyMatch(a -> a.equalsIgnoreCase(targetDept.trim()));
    }
}
