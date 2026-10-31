package com.university.portal.controller;

import com.university.portal.entity.DocumentEntity;
import com.university.portal.service.DocumentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "*")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping
    public List<DocumentEntity> getAll(
            @RequestParam(required = false, defaultValue = "ALL") String category,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) String search) {
        return documentService.getAllDocuments(category, status, search);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentEntity> getById(@PathVariable String id) {
        return documentService.getDocumentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<DocumentEntity> create(
            @RequestBody DocumentEntity doc,
            @RequestParam(required = false, defaultValue = "Faculty") String actorName,
            @RequestParam(required = false, defaultValue = "Faculty") String actorRole) {
        return ResponseEntity.ok(documentService.createDocument(doc, actorName, actorRole));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DocumentEntity> update(
            @PathVariable String id,
            @RequestBody DocumentEntity doc) {
        return ResponseEntity.ok(documentService.updateDocument(id, doc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        documentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<DocumentEntity> verify(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String actorName = body != null ? body.getOrDefault("reviewerName", "Verifier") : "Verifier";
        String actorRole = body != null ? body.getOrDefault("reviewerRole", "DeanHOD") : "DeanHOD";
        String comment = body != null ? body.getOrDefault("comment", "Verified") : "Verified";
        return ResponseEntity.ok(documentService.verifyAndAdvanceStage(id, actorName, actorRole, comment));
    }

    @PostMapping("/{id}/return")
    public ResponseEntity<DocumentEntity> returnRecord(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String reviewerName = body.getOrDefault("reviewerName", "Reviewer");
        String reviewerRole = body.getOrDefault("reviewerRole", "DeanHOD");
        String reason = body.getOrDefault("reason", "Returned for correction");
        return ResponseEntity.ok(documentService.returnDocument(id, reviewerName, reviewerRole, reason));
    }

    @PostMapping("/{id}/lock")
    public ResponseEntity<DocumentEntity> lockRecord(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String reviewerName = body != null ? body.getOrDefault("reviewerName", "IQAC Lead") : "IQAC Lead";
        String reviewerRole = body != null ? body.getOrDefault("reviewerRole", "IQAC") : "IQAC";
        return ResponseEntity.ok(documentService.lockRecordSSR(id, reviewerName, reviewerRole));
    }

    @PostMapping("/batch-forward")
    public ResponseEntity<Map<String, Object>> batchForward(@RequestBody(required = false) Map<String, String> body) {
        String actorName = body != null ? body.getOrDefault("actorName", "Dean") : "Dean";
        String actorRole = body != null ? body.getOrDefault("actorRole", "DeanHOD") : "DeanHOD";
        int count = documentService.batchForwardDeanQueue(actorName, actorRole);
        return ResponseEntity.ok(Map.of("message", "Batch forwarded", "count", count));
    }

    @PostMapping("/batch-lock")
    public ResponseEntity<Map<String, Object>> batchLock(@RequestBody(required = false) Map<String, String> body) {
        String actorName = body != null ? body.getOrDefault("actorName", "IQAC") : "IQAC";
        String actorRole = body != null ? body.getOrDefault("actorRole", "IQAC") : "IQAC";
        int count = documentService.batchLockIQACQueue(actorName, actorRole);
        return ResponseEntity.ok(Map.of("message", "Batch locked", "count", count));
    }

    @GetMapping("/kpis")
    public ResponseEntity<Map<String, Object>> getKPIs() {
        return ResponseEntity.ok(documentService.getKPIs());
    }
}

