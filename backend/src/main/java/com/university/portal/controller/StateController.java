package com.university.portal.controller;

import com.university.portal.dto.DocumentDTO;
import com.university.portal.entity.SystemSettingsEntity;
import com.university.portal.entity.UserEntity;
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
 * <p>Enforces role-based user directory visibility:
 * - Admin / IQAC: All users.
 * - HOD: Faculty & Students only in assigned departments.
 * - Faculty: Students only in assigned department.
 * - Student: Students only.</p>
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
    public ResponseEntity<Map<String, Object>> getFullState(
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String role) {

        String callerRole = actorRole != null && !actorRole.isBlank() ? actorRole
                : role != null && !role.isBlank() ? role
                : actorRoleHeader != null && !actorRoleHeader.isBlank() ? actorRoleHeader
                : userRoleHeader != null && !userRoleHeader.isBlank() ? userRoleHeader
                : "";
        String callerDept = actorDeptHeader != null && !actorDeptHeader.isBlank() ? actorDeptHeader
                : userDeptHeader != null && !userDeptHeader.isBlank() ? userDeptHeader
                : "";
        String callerId = actorIdHeader != null && !actorIdHeader.isBlank() ? actorIdHeader
                : userIdHeader != null && !userIdHeader.isBlank() ? userIdHeader
                : "";

        if (callerRole.isBlank() && !callerId.isBlank()) {
            Optional<UserEntity> callerOpt = userRepository.findById(callerId)
                    .or(() -> userRepository.findByEmployeeId(callerId));
            if (callerOpt.isPresent()) {
                callerRole = callerOpt.get().getRole();
                if (callerDept.isBlank() && callerOpt.get().getDepartment() != null) {
                    callerDept = callerOpt.get().getDepartment();
                }
            }
        }

        List<DocumentDTO> documents = documentRepository
                .findAllByOrderByDisplayNumAsc()
                .stream()
                .map(DocumentMapper::toDTO)
                .toList();

        List<UserEntity> allUsers = userRepository.findAll();
        List<UserEntity> visibleUsers;

        if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            // HOD can view Faculty and Students only within assigned departments
            List<String> allowedDepts = new ArrayList<>();
            if (!callerId.isBlank()) {
                userRepository.findById(callerId).ifPresent(u -> allowedDepts.addAll(u.getAllowedDepartments()));
                if (allowedDepts.isEmpty()) {
                    userRepository.findByEmployeeId(callerId).ifPresent(u -> allowedDepts.addAll(u.getAllowedDepartments()));
                }
            }
            if (allowedDepts.isEmpty() && !callerDept.isBlank()) {
                allowedDepts.add(callerDept.trim());
            }
            visibleUsers = allUsers.stream()
                    .filter(u -> "Faculty".equalsIgnoreCase(u.getRole()) || "Student".equalsIgnoreCase(u.getRole()))
                    .filter(u -> allowedDepts.isEmpty() || (u.getDepartment() != null &&
                            allowedDepts.stream().anyMatch(ad -> ad.equalsIgnoreCase(u.getDepartment().trim()))))
                    .toList();
        } else if ("Faculty".equalsIgnoreCase(callerRole)) {
            // Faculty can view Students only within assigned department
            final String fDept = callerDept;
            visibleUsers = allUsers.stream()
                    .filter(u -> "Student".equalsIgnoreCase(u.getRole()))
                    .filter(u -> fDept.isBlank() || (u.getDepartment() != null && u.getDepartment().trim().equalsIgnoreCase(fDept.trim())))
                    .toList();
        } else if ("Student".equalsIgnoreCase(callerRole)) {
            visibleUsers = allUsers.stream()
                    .filter(u -> "Student".equalsIgnoreCase(u.getRole()))
                    .toList();
        } else {
            // Admin, IQAC, Inspector or default: full view
            visibleUsers = allUsers;
        }

        Map<String, Object> state = new LinkedHashMap<>();
        state.put("documents",        documents);
        state.put("users",            visibleUsers);
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

    @PostMapping("/reset")
    @Transactional
    public ResponseEntity<?> resetAll(
            @RequestHeader(value = "X-Admin-Token", required = false) String token) {

        if (!ADMIN_RESET_TOKEN.equals(token)) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Invalid or missing admin token. Reset rejected."));
        }

        revisionRepository.deleteAll();
        activityRepository.deleteAll();
        auditLogRepository.deleteAll();
        documentRepository.deleteAll();

        return ResponseEntity.ok(Map.of("message", "All documents, logs, and activities have been cleared."));
    }
}
