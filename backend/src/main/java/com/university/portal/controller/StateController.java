package com.university.portal.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.portal.entity.*;
import com.university.portal.repository.*;
import com.university.portal.service.DataSeederService;
import com.university.portal.service.DocumentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/state")
@CrossOrigin(origins = "*")
public class StateController {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final RecentActivityRepository activityRepository;
    private final RevisionRequestRepository revisionRepository;
    private final SystemSettingsRepository settingsRepository;
    private final DocumentService documentService;
    private final DataSeederService dataSeederService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public StateController(DocumentRepository documentRepository,
                           UserRepository userRepository,
                           AuditLogRepository auditLogRepository,
                           RecentActivityRepository activityRepository,
                           RevisionRequestRepository revisionRepository,
                           SystemSettingsRepository settingsRepository,
                           DocumentService documentService,
                           DataSeederService dataSeederService) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.activityRepository = activityRepository;
        this.revisionRepository = revisionRepository;
        this.settingsRepository = settingsRepository;
        this.documentService = documentService;
        this.dataSeederService = dataSeederService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getFullState() {
        Map<String, Object> state = new HashMap<>();

        // Convert document entities to client-expected objects with parsed JSON
        List<DocumentEntity> docEntities = documentRepository.findAllByOrderByDisplayNumAsc();
        List<Map<String, Object>> documents = new ArrayList<>();
        for (DocumentEntity d : docEntities) {
            Map<String, Object> docMap = new HashMap<>();
            docMap.put("id", d.getId());
            docMap.put("displayNum", d.getDisplayNum());
            docMap.put("title", d.getTitle());
            docMap.put("fileType", d.getFileType());
            docMap.put("fileSize", d.getFileSize());
            docMap.put("category", d.getCategory());
            docMap.put("subCategory", d.getSubCategory());
            docMap.put("ownerType", d.getOwnerType());
            docMap.put("ownerName", d.getOwnerName());
            docMap.put("ownerId", d.getOwnerId());
            docMap.put("recordedByFaculty", d.getRecordedByFaculty());
            docMap.put("department", d.getDepartment());
            docMap.put("school", d.getSchool());
            docMap.put("academicYear", d.getAcademicYear());
            docMap.put("submittedOn", d.getSubmittedOn());
            docMap.put("status", d.getStatus());
            docMap.put("currentStage", d.getCurrentStage());
            docMap.put("naacCriterion", d.getNaacCriterion());
            docMap.put("evidenceFile", d.getEvidenceFile());
            docMap.put("evidenceVerified", d.getEvidenceVerified());
            docMap.put("isLocked", d.getIsLocked());

            // Parse JSON fields
            try {
                if (d.getEventDetailsJson() != null && !d.getEventDetailsJson().isEmpty()) {
                    docMap.put("eventDetails", objectMapper.readValue(d.getEventDetailsJson(), new TypeReference<Map<String, Object>>() {}));
                } else {
                    docMap.put("eventDetails", Collections.emptyMap());
                }
            } catch (Exception e) {
                docMap.put("eventDetails", Collections.emptyMap());
            }

            try {
                if (d.getTimelineJson() != null && !d.getTimelineJson().isEmpty()) {
                    docMap.put("timeline", objectMapper.readValue(d.getTimelineJson(), new TypeReference<List<Map<String, Object>>>() {}));
                } else {
                    docMap.put("timeline", Collections.emptyList());
                }
            } catch (Exception e) {
                docMap.put("timeline", Collections.emptyList());
            }

            try {
                if (d.getReviewerCommentsJson() != null && !d.getReviewerCommentsJson().isEmpty()) {
                    docMap.put("reviewerComments", objectMapper.readValue(d.getReviewerCommentsJson(), new TypeReference<List<Map<String, Object>>>() {}));
                } else {
                    docMap.put("reviewerComments", Collections.emptyList());
                }
            } catch (Exception e) {
                docMap.put("reviewerComments", Collections.emptyList());
            }

            documents.add(docMap);
        }

        state.put("documents", documents);
        state.put("users", userRepository.findAll());
        state.put("recentActivities", activityRepository.findTop20ByOrderByIdDesc());
        state.put("auditLogs", auditLogRepository.findAllByOrderByIdDesc());
        state.put("revisionRequests", revisionRepository.findAllByOrderByIdDesc());
        state.put("settings", settingsRepository.findById("DEFAULT").orElse(new SystemSettingsEntity()));
        state.put("kpis", documentService.getKPIs());

        // Master static metadata
        state.put("academicYears", Arrays.asList(
            Map.of("id", "2026-2027", "label", "2026-2027 (01 Jul 2026 - 30 Jun 2027)", "current", true),
            Map.of("id", "2025-2026", "label", "2025-2026 (01 Jul 2025 - 30 Jun 2026)", "current", false),
            Map.of("id", "2024-2025", "label", "2024-2025 (01 Jul 2024 - 30 Jun 2025)", "current", false),
            Map.of("id", "2023-2024", "label", "2023-2024 (01 Jul 2023 - 30 Jun 2024)", "current", false)
        ));

        state.put("departments", Arrays.asList(
            Map.of("code", "CSE", "name", "Computer Science & Engineering", "school", "School of Computing & IT"),
            Map.of("code", "ECE", "name", "Electronics & Communication Engineering", "school", "School of Electrical Sciences"),
            Map.of("code", "MECH", "name", "Mechanical Engineering", "school", "School of Mechanical Sciences"),
            Map.of("code", "MGMT", "name", "Management Studies", "school", "School of Business"),
            Map.of("code", "BIOTECH", "name", "Biotechnology & Bioinformatics", "school", "School of Applied Sciences")
        ));

        state.put("naacCriteria", Arrays.asList(
            Map.of("code", "1.3.2", "label", "1.3.2 - Experiential learning through project work/field work/internship"),
            Map.of("code", "3.4.2", "label", "3.4.2 - Awards and recognitions received for research and extension activities"),
            Map.of("code", "3.4.3", "label", "3.4.3 - Number of extension and outreach programs conducted"),
            Map.of("code", "5.3.1", "label", "5.3.1 - Number of awards/medals for outstanding performance in sports/cultural"),
            Map.of("code", "5.3.3", "label", "5.3.3 - Student participation in capacity development and skill enhancement"),
            Map.of("code", "6.3.2", "label", "6.3.2 - Financial support to attend conferences / workshops / membership"),
            Map.of("code", "6.3.3", "label", "6.3.3 - Professional development / administrative training programmes")
        ));

        return ResponseEntity.ok(state);
    }

    @PostMapping("/reset")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Map<String, String>> resetData() {
        documentRepository.deleteAllInBatch();
        auditLogRepository.deleteAllInBatch();
        activityRepository.deleteAllInBatch();
        revisionRepository.deleteAllInBatch();
        documentRepository.flush();
        auditLogRepository.flush();
        activityRepository.flush();
        revisionRepository.flush();

        return ResponseEntity.ok(Map.of("message", "Database successfully reset to clean production state (zero mock documents, official users only)."));
    }
}

