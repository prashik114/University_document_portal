package com.university.portal.controller;

import com.university.portal.dto.DocumentDTO;
import com.university.portal.entity.SystemSettingsEntity;
import com.university.portal.repository.*;
import com.university.portal.service.DocumentService;
import com.university.portal.util.DocumentMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Single mega-endpoint that returns the entire application state in one call
 * ({@code GET /api/state}). Used by the frontend on initial load to avoid
 * multiple round-trips.
 *
 * <p>Also exposes a protected reset endpoint ({@code POST /api/state/reset})
 * that requires an admin token header to prevent accidental data wipes.</p>
 */
@RestController
@RequestMapping("/api/state")
public class StateController {

    private static final String ADMIN_RESET_TOKEN = "PORTAL-ADMIN-RESET-2026";

    private final DocumentRepository       documentRepository;
    private final UserRepository           userRepository;
    private final AuditLogRepository       auditLogRepository;
    private final RecentActivityRepository activityRepository;
    private final RevisionRequestRepository revisionRepository;
    private final SystemSettingsRepository settingsRepository;
    private final DepartmentRepository     departmentRepository;
    private final DocumentService          documentService;

    public StateController(DocumentRepository documentRepository,
                           UserRepository userRepository,
                           AuditLogRepository auditLogRepository,
                           RecentActivityRepository activityRepository,
                           RevisionRequestRepository revisionRepository,
                           SystemSettingsRepository settingsRepository,
                           DepartmentRepository departmentRepository,
                           DocumentService documentService) {
        this.documentRepository  = documentRepository;
        this.userRepository      = userRepository;
        this.auditLogRepository  = auditLogRepository;
        this.activityRepository  = activityRepository;
        this.revisionRepository  = revisionRepository;
        this.settingsRepository  = settingsRepository;
        this.departmentRepository = departmentRepository;
        this.documentService     = documentService;
    }

    // ── Full application state ────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<Map<String, Object>> getFullState() {
        List<DocumentDTO> documents = documentRepository
                .findAllByOrderByDisplayNumAsc()
                .stream()
                .map(DocumentMapper::toDTO)
                .toList();

        Map<String, Object> state = new LinkedHashMap<>();
        state.put("documents",        documents);
        state.put("users",            userRepository.findAll());
        state.put("recentActivities", activityRepository.findTop20ByOrderByIdDesc());
        state.put("auditLogs",        auditLogRepository.findAllByOrderByIdDesc());
        state.put("revisionRequests", revisionRepository.findAllByOrderByIdDesc());
        state.put("settings",         settingsRepository.findById("DEFAULT")
                                          .orElseGet(SystemSettingsEntity::new));
        state.put("kpis",             documentService.getKPIs());

        // ── Static master metadata ────────────────────────────────────────────
        state.put("academicYears", List.of(
            Map.of("id","2026-2027","label","2026-2027 (01 Jul 2026 – 30 Jun 2027)","current",true),
            Map.of("id","2025-2026","label","2025-2026 (01 Jul 2025 – 30 Jun 2026)","current",false),
            Map.of("id","2024-2025","label","2024-2025 (01 Jul 2024 – 30 Jun 2025)","current",false),
            Map.of("id","2023-2024","label","2023-2024 (01 Jul 2023 – 30 Jun 2024)","current",false)
        ));

        state.put("departments", departmentRepository.findAll());

        state.put("naacCriteria", List.of(
            Map.of("code","1.3.2","label","1.3.2 – Experiential learning through project/field work/internship"),
            Map.of("code","3.4.2","label","3.4.2 – Awards and recognitions for research and extension activities"),
            Map.of("code","3.4.3","label","3.4.3 – Number of extension and outreach programs conducted"),
            Map.of("code","5.3.1","label","5.3.1 – Awards/medals for outstanding performance in sports/cultural"),
            Map.of("code","5.3.3","label","5.3.3 – Student participation in capacity development and skill enhancement"),
            Map.of("code","6.3.2","label","6.3.2 – Financial support to attend conferences / workshops / membership"),
            Map.of("code","6.3.3","label","6.3.3 – Professional development / administrative training programmes")
        ));

        return ResponseEntity.ok(state);
    }

    // ── Admin reset (protected) ───────────────────────────────────────────────

    /**
     * Deletes all transactional data (documents, audit logs, activities,
     * revision requests). Users and settings are preserved.
     *
     * <p>Requires the {@code X-Admin-Token} header to match
     * {@code PORTAL-ADMIN-RESET-2026} to prevent accidental or malicious
     * invocation.</p>
     */
    @PostMapping("/reset")
    @Transactional
    public ResponseEntity<Map<String, String>> resetData(
            @RequestHeader(value = "X-Admin-Token", required = false) String token) {

        if (!ADMIN_RESET_TOKEN.equals(token)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Invalid or missing admin token. Reset denied."));
        }

        documentRepository.deleteAllInBatch();
        auditLogRepository.deleteAllInBatch();
        activityRepository.deleteAllInBatch();
        revisionRepository.deleteAllInBatch();

        return ResponseEntity.ok(Map.of("message",
                "Database reset to clean state. Users and settings preserved."));
    }
}
