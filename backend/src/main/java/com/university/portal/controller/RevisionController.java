package com.university.portal.controller;

import com.university.portal.entity.DocumentEntity;
import com.university.portal.entity.RevisionRequestEntity;
import com.university.portal.repository.DocumentRepository;
import com.university.portal.repository.RevisionRequestRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/revisions")
@CrossOrigin(origins = "*")
public class RevisionController {

    private final RevisionRequestRepository revisionRepository;
    private final DocumentRepository documentRepository;

    public RevisionController(RevisionRequestRepository revisionRepository,
                              DocumentRepository documentRepository) {
        this.revisionRepository = revisionRepository;
        this.documentRepository = documentRepository;
    }

    @GetMapping
    public List<RevisionRequestEntity> getAll() {
        return revisionRepository.findAllByOrderByIdDesc();
    }

    @PostMapping
    public ResponseEntity<RevisionRequestEntity> create(@RequestBody RevisionRequestEntity req) {
        if (req.getId() == null || req.getId().trim().isEmpty()) {
            req.setId("REV-2026-" + (int)(100 + Math.random() * 900));
        }
        if (req.getRequestedDate() == null) {
            req.setRequestedDate(LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
        }
        if (req.getStatus() == null) {
            req.setStatus("Pending Admin Approval");
        }
        return ResponseEntity.ok(revisionRepository.save(req));
    }

    @PostMapping("/{id}/authorize")
    public ResponseEntity<RevisionRequestEntity> authorize(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        return revisionRepository.findById(id).map(rev -> {
            rev.setStatus("Authorized by Admin");
            revisionRepository.save(rev);

            // Unlock target document
            if (rev.getRecordId() != null) {
                documentRepository.findById(rev.getRecordId()).ifPresent(doc -> {
                    doc.setStatus("Returned");
                    doc.setCurrentStage("Faculty");
                    doc.setIsLocked(false);
                    documentRepository.save(doc);
                });
            }
            return ResponseEntity.ok(rev);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<RevisionRequestEntity> reject(@PathVariable String id) {
        return revisionRepository.findById(id).map(rev -> {
            rev.setStatus("Rejected by Admin");
            return ResponseEntity.ok(revisionRepository.save(rev));
        }).orElse(ResponseEntity.notFound().build());
    }
}

