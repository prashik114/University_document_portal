package com.university.portal.controller;

import com.university.portal.dto.DocumentDTO;
import com.university.portal.dto.ReviewActionDTO;
import com.university.portal.entity.DocumentEntity;
import com.university.portal.service.DocumentService;
import com.university.portal.util.DocumentMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for all document lifecycle operations with strict Department Isolation
 * and role-based permissions.
 */
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    // ── Queries with Department Isolation ──────────────────────────────────────

    @GetMapping
    public List<DocumentDTO> getAll(
            @RequestParam(defaultValue = "ALL") String category,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(required = false)     String search,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String actorDepartment,
            @RequestParam(required = false) String actorId) {

        String role = (actorRole != null && !actorRole.isBlank()) ? actorRole : (actorRoleHeader != null ? actorRoleHeader : "Admin");
        String dept = (actorDepartment != null && !actorDepartment.isBlank()) ? actorDepartment : (actorDeptHeader != null ? actorDeptHeader : "");
        String id   = (actorId != null && !actorId.isBlank()) ? actorId : (actorIdHeader != null ? actorIdHeader : "");

        List<DocumentDTO> docs = documentService.getAllDocuments(category, status, search)
                .stream()
                .map(DocumentMapper::toDTO)
                .toList();

        // 1. Central IT Admin & IQAC: View institutional records
        if ("Admin".equalsIgnoreCase(role) || "IQAC".equalsIgnoreCase(role)) {
            return docs;
        }

        // 2. External Auditor / Inspector: Read-only accredited records in assigned audit cycle
        if ("Inspector".equalsIgnoreCase(role)) {
            return docs.stream()
                    .filter(d -> "Approved".equalsIgnoreCase(d.getStatus()))
                    .toList();
        }

        // 3. Dean / HoD: Strict Department Isolation
        // A CSE HoD CANNOT view Mechanical or Civil Engineering documents.
        if ("DeanHOD".equalsIgnoreCase(role)) {
            if (dept.isBlank()) return docs;
            return docs.stream()
                    .filter(d -> d.getDepartment() != null && d.getDepartment().trim().equalsIgnoreCase(dept.trim()))
                    .toList();
        }

        // 4. Faculty: Department records and own submissions
        if ("Faculty".equalsIgnoreCase(role)) {
            if (dept.isBlank()) return docs;
            return docs.stream()
                    .filter(d -> (d.getDepartment() != null && d.getDepartment().trim().equalsIgnoreCase(dept.trim())) ||
                                 (id != null && !id.isBlank() && id.equalsIgnoreCase(d.getOwnerId())))
                    .toList();
        }

        // 5. Student: Own profile and student submissions
        if ("Student".equalsIgnoreCase(role)) {
            return docs.stream()
                    .filter(d -> (id != null && !id.isBlank() && id.equalsIgnoreCase(d.getOwnerId())) ||
                                 "Student".equalsIgnoreCase(d.getCategory()))
                    .toList();
        }

        return docs;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(
            @PathVariable String id,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String actorDepartment) {

        String role = (actorRole != null && !actorRole.isBlank()) ? actorRole : (actorRoleHeader != null ? actorRoleHeader : "Admin");
        String dept = (actorDepartment != null && !actorDepartment.isBlank()) ? actorDepartment : (actorDeptHeader != null ? actorDeptHeader : "");

        DocumentEntity doc = documentService.getDocumentById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.notFound().build();
        }

        // Department isolation check on direct ID access
        if ("DeanHOD".equalsIgnoreCase(role) && !dept.isBlank()) {
            if (doc.getDepartment() != null && !doc.getDepartment().trim().equalsIgnoreCase(dept.trim())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Department Isolation Policy prevents viewing records outside your assigned department (" + dept + ")."));
            }
        }

        return ResponseEntity.ok(DocumentMapper.toDTO(doc));
    }

    @GetMapping("/kpis")
    public ResponseEntity<Map<String, Object>> getKPIs() {
        return ResponseEntity.ok(documentService.getKPIs());
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<DocumentDTO> create(
            @RequestBody DocumentEntity doc,
            @RequestParam(defaultValue = "Faculty") String actorName,
            @RequestParam(defaultValue = "Faculty") String actorRole) {
        DocumentEntity saved = documentService.createDocument(doc, actorName, actorRole);
        return ResponseEntity.ok(DocumentMapper.toDTO(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable String id,
            @RequestBody DocumentEntity doc,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader) {

        String role = (actorRoleHeader != null) ? actorRoleHeader : "Admin";
        String dept = (actorDeptHeader != null) ? actorDeptHeader : "";

        // Department isolation check
        DocumentEntity existing = documentService.getDocumentById(id).orElse(null);
        if (existing != null && "DeanHOD".equalsIgnoreCase(role) && !dept.isBlank()) {
            if (existing.getDepartment() != null && !existing.getDepartment().trim().equalsIgnoreCase(dept.trim())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Department Isolation Violation: Cannot edit records outside assigned department."));
            }
        }

        return ResponseEntity.ok(DocumentMapper.toDTO(documentService.updateDocument(id, doc)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable String id,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader) {

        String role = (actorRoleHeader != null) ? actorRoleHeader : "Admin";
        if (!"Admin".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IT Administrators can delete repository records."));
        }

        documentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    // ── Workflow actions with Department Isolation ─────────────────────────────

    @PostMapping("/{id}/resubmit")
    public ResponseEntity<DocumentDTO> resubmit(
            @PathVariable String id,
            @RequestParam(defaultValue = "Faculty") String actorName,
            @RequestParam(defaultValue = "Faculty") String actorRole) {
        return ResponseEntity.ok(DocumentMapper.toDTO(
                documentService.resubmitDocument(id, actorName, actorRole)));
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<?> verify(
            @PathVariable String id,
            @RequestBody(required = false) ReviewActionDTO body,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader) {

        String name = body != null ? body.getReviewerName() : "Verifier";
        String role = body != null && body.getReviewerRole() != null ? body.getReviewerRole() : (actorRoleHeader != null ? actorRoleHeader : "DeanHOD");
        String dept = actorDeptHeader != null ? actorDeptHeader : "";
        String comment = body != null ? body.getComment() : "";

        // Department isolation check: Dean can only verify documents in their department
        if ("DeanHOD".equalsIgnoreCase(role) && !dept.isBlank()) {
            DocumentEntity existing = documentService.getDocumentById(id).orElse(null);
            if (existing != null && existing.getDepartment() != null && !existing.getDepartment().trim().equalsIgnoreCase(dept.trim())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Department Isolation Violation: You are assigned to " + dept + " and cannot endorse records belonging to " + existing.getDepartment() + "."));
            }
        }

        return ResponseEntity.ok(DocumentMapper.toDTO(
                documentService.verifyAndAdvanceStage(id, name, role, comment)));
    }

    @PostMapping("/{id}/return")
    public ResponseEntity<?> returnRecord(
            @PathVariable String id,
            @RequestBody ReviewActionDTO body,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader) {

        String dept = actorDeptHeader != null ? actorDeptHeader : "";
        String role = body != null && body.getReviewerRole() != null ? body.getReviewerRole() : (actorRoleHeader != null ? actorRoleHeader : "DeanHOD");

        if ("DeanHOD".equalsIgnoreCase(role) && !dept.isBlank()) {
            DocumentEntity existing = documentService.getDocumentById(id).orElse(null);
            if (existing != null && existing.getDepartment() != null && !existing.getDepartment().trim().equalsIgnoreCase(dept.trim())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Department Isolation Violation: Cannot return records outside your assigned department."));
            }
        }

        return ResponseEntity.ok(DocumentMapper.toDTO(
                documentService.returnDocument(id,
                        body.getReviewerName(), body.getReviewerRole(), body.getReason())));
    }

    @PostMapping("/{id}/lock")
    public ResponseEntity<DocumentDTO> lock(
            @PathVariable String id,
            @RequestBody(required = false) ReviewActionDTO body) {
        String name = body != null ? body.getReviewerName() : "IQAC Lead";
        String role = body != null ? body.getReviewerRole() : "IQAC";
        return ResponseEntity.ok(DocumentMapper.toDTO(
                documentService.lockRecordSSR(id, name, role)));
    }

    @PostMapping("/batch-forward")
    public ResponseEntity<Map<String, Object>> batchForward(
            @RequestBody(required = false) ReviewActionDTO body) {
        String name = body != null ? body.getReviewerName() : "Dean";
        String role = body != null ? body.getReviewerRole() : "DeanHOD";
        int count = documentService.batchForwardDeanQueue(name, role);
        return ResponseEntity.ok(Map.of("message", "Batch forwarded", "count", count));
    }

    @PostMapping("/batch-lock")
    public ResponseEntity<Map<String, Object>> batchLock(
            @RequestBody(required = false) ReviewActionDTO body) {
        String name = body != null ? body.getReviewerName() : "IQAC";
        String role = body != null ? body.getReviewerRole() : "IQAC";
        int count = documentService.batchLockIQACQueue(name, role);
        return ResponseEntity.ok(Map.of("message", "Batch locked", "count", count));
    }
}
