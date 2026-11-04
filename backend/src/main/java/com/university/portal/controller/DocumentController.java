package com.university.portal.controller;

import com.university.portal.dto.DocumentDTO;
import com.university.portal.dto.ReviewActionDTO;
import com.university.portal.entity.DocumentEntity;
import com.university.portal.entity.UserEntity;
import com.university.portal.repository.UserRepository;
import com.university.portal.service.DocumentService;
import com.university.portal.util.DocumentMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller managing document submission, multi-stage verification workflows,
 * departmental access control, and evidence archiving.
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

        // Central administration and quality assurance: full institutional visibility
        if ("Admin".equalsIgnoreCase(callerRole) || "IQAC".equalsIgnoreCase(callerRole)) {
            return docs;
        }

        // External assessors: view accredited documents only
        if ("Inspector".equalsIgnoreCase(callerRole)) {
            return docs.stream()
                    .filter(d -> "Approved".equalsIgnoreCase(d.getStatus()))
                    .toList();
        }

        // Department leadership: scope limited to primary and assigned additional departments
        if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            List<String> allowedDepts = resolveHodAllowedDepartments(callerId, callerDept);
            if (allowedDepts.isEmpty()) return docs;
            return docs.stream()
                    .filter(d -> d.getDepartment() != null &&
                            allowedDepts.stream().anyMatch(ad -> ad.equalsIgnoreCase(d.getDepartment().trim())))
                    .toList();
        }

        // Faculty members: access departmental records and personal uploads
        if ("Faculty".equalsIgnoreCase(callerRole)) {
            if (callerDept.isBlank() && callerId.isBlank()) return docs;
            return docs.stream()
                    .filter(d -> (!callerDept.isBlank() && d.getDepartment() != null && d.getDepartment().trim().equalsIgnoreCase(callerDept.trim())) ||
                                 (!callerId.isBlank() && callerId.equalsIgnoreCase(d.getOwnerId())))
                    .toList();
        }

        // Student access: restricted to individual submissions
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

        // External assessors can only view finalized approved records
        if ("Inspector".equalsIgnoreCase(callerRole)) {
            if (!"Approved".equalsIgnoreCase(doc.getStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: External NAAC Inspectors have access only to approved & accredited documents."));
            }
        }

        // Verify department jurisdiction for departmental leadership
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
     * Submits a new evidence or academic document into the verification lifecycle.
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

        // Assessors have read-only permissions
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

        if ("Student".equalsIgnoreCase(callerRole)) {
            doc.setOwnerType("Student");
            if (doc.getCategory() == null || doc.getCategory().isBlank()) {
                doc.setCategory("Student");
            }
        } else if ("Faculty".equalsIgnoreCase(callerRole)) {
            if (doc.getOwnerType() == null || doc.getOwnerType().isBlank()) {
                doc.setOwnerType("Faculty");
            }
        } else if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            if (doc.getOwnerType() == null || doc.getOwnerType().isBlank()) {
                doc.setOwnerType("DeanHOD");
            }
        }

        DocumentEntity saved = documentService.createDocument(doc, actorName, callerRole.isBlank() ? "Faculty" : callerRole);
        return ResponseEntity.ok(DocumentMapper.toDTO(saved));
    }

    /**
     * Updates document metadata; prevents modifications once finalized and locked.
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
     * Review and stage advancement endpoint for departmental leadership and quality officers.
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

        // Students do not have document verification authority
        if ("Student".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Students are not authorized to verify documents. Students can only upload documents."));
        }

        // Faculty verification is restricted to student documents within their department
        if ("Faculty".equalsIgnoreCase(callerRole)) {
            boolean isStudentDoc = isStudentDocument(existing);
            if (!isStudentDoc) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only verify Student documents. Faculty cannot verify Faculty or HOD documents."));
            }
            if (callerDept != null && !callerDept.isBlank() && existing.getDepartment() != null
                    && !existing.getDepartment().trim().equalsIgnoreCase(callerDept.trim())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only verify Student documents within their own department (" + callerDept + ")."));
            }
            if (!hasVerificationPermission(callerId, callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Verification access has not been granted to your account. Contact your HOD or Admin."));
            }
        }

        // Department head verification across assigned departmental scope
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
     * Returns a document with feedback to the submitter for rectification.
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

        // Rejection/return actions cannot be initiated by students
        if ("Student".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Students are not authorized to return documents."));
        }

        // Faculty members may return student records for departmental rectification
        if ("Faculty".equalsIgnoreCase(callerRole)) {
            boolean isStudentDoc = isStudentDocument(existing);
            if (!isStudentDoc) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only return Student documents."));
            }
            if (callerDept != null && !callerDept.isBlank() && existing.getDepartment() != null
                    && !existing.getDepartment().trim().equalsIgnoreCase(callerDept.trim())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only return Student documents within their own department."));
            }
            if (!hasVerificationPermission(callerId, callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Verification access has not been granted to your account."));
            }
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
     * Applies final cryptographic sealing to verified records for institutional reporting.
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

        // Central quality assurance locking enforcement
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
        if (h1 != null && !h1.isBlank()) return h1.trim();
        if (h2 != null && !h2.isBlank()) return h2.trim();
        if (r1 != null && !r1.isBlank()) return r1.trim();
        if (r2 != null && !r2.isBlank()) return r2.trim();
        return "";
    }

    private String resolveDept(String d1, String d2, String h1, String h2) {
        if (h1 != null && !h1.isBlank()) return h1.trim();
        if (h2 != null && !h2.isBlank()) return h2.trim();
        if (d1 != null && !d1.isBlank()) return d1.trim();
        if (d2 != null && !d2.isBlank()) return d2.trim();
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

    private boolean isStudentDocument(DocumentEntity doc) {
        if (doc == null) return false;
        if ("Student".equalsIgnoreCase(doc.getOwnerType())) return true;
        if ("Student".equalsIgnoreCase(doc.getCategory())) return true;
        if (doc.getCategory() != null && doc.getCategory().toLowerCase().contains("student")) return true;
        if (doc.getSubCategory() != null && doc.getSubCategory().toLowerCase().contains("student")) return true;
        if (doc.getOwnerId() != null && !doc.getOwnerId().isBlank()) {
            Optional<UserEntity> owner = userRepository.findById(doc.getOwnerId())
                    .or(() -> userRepository.findByEmployeeId(doc.getOwnerId()));
            if (owner.isPresent() && "Student".equalsIgnoreCase(owner.get().getRole())) {
                return true;
            }
        }
        return false;
    }

    private boolean hasVerificationPermission(String actorId, String actorRole) {
        if ("DeanHOD".equalsIgnoreCase(actorRole) || "Admin".equalsIgnoreCase(actorRole) || "IQAC".equalsIgnoreCase(actorRole)) {
            return true;
        }
        if ("Faculty".equalsIgnoreCase(actorRole)) {
            if (actorId == null || actorId.isBlank()) return true;
            Optional<UserEntity> user = userRepository.findById(actorId)
                    .or(() -> userRepository.findByEmployeeId(actorId))
                    .or(() -> userRepository.findByEmail(actorId));
            if (user.isPresent()) {
                List<String> perms = user.get().getPermissions();
                if (perms != null && !perms.isEmpty()) {
                    return perms.contains("verify_docs") || perms.contains("verify_student_docs");
                }
            }
            return true;
        }
        return false;
    }
}
