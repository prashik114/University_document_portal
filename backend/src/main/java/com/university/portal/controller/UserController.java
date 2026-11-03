package com.university.portal.controller;

import com.university.portal.entity.AuditLogEntity;
import com.university.portal.entity.DepartmentEntity;
import com.university.portal.entity.RecentActivityEntity;
import com.university.portal.entity.UserEntity;
import com.university.portal.repository.AuditLogRepository;
import com.university.portal.repository.DepartmentRepository;
import com.university.portal.repository.RecentActivityRepository;
import com.university.portal.repository.UserRepository;
import com.university.portal.util.IdGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller enforcing role-based access control, account provisioning hierarchy,
 * and departmental data isolation.
 *
 * Account Hierarchy:
 * - Main Admin creates everyone (HOD, Faculty, Student, IQAC, Inspector, Admin).
 * - HOD creates Faculty & Students within assigned departments.
 * - Faculty creates Students within their assigned department.
 * - Students can only submit and view their own documents.
 * - IQAC handles final approval and document locking.
 * - NAAC Inspector has authorised read-only access.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final RecentActivityRepository activityRepository;
    private final DepartmentRepository departmentRepository;

    public UserController(UserRepository userRepository,
                          AuditLogRepository auditLogRepository,
                          RecentActivityRepository activityRepository,
                          DepartmentRepository departmentRepository) {
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.activityRepository = activityRepository;
        this.departmentRepository = departmentRepository;
    }

    @GetMapping
    public ResponseEntity<List<UserEntity>> getAll(
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
        if (callerRole.isBlank()) {
            callerRole = "Admin";
        }
        String callerDept = resolveDept(dept, actorDepartment, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(id, actorId, actorIdHeader, userIdHeader);

        List<UserEntity> all = userRepository.findAll();

        // Default or Admin/IQAC: Institutional view across all users
        if (callerRole.isBlank() || "Admin".equalsIgnoreCase(callerRole) || "IQAC".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.ok(all);
        }

        // HOD: Views users in their primary department + any additional granted departments
        if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            List<String> allowedDepts = resolveAllowedDepartments(callerId, callerDept);
            if (allowedDepts.isEmpty()) {
                return ResponseEntity.ok(all);
            }
            List<UserEntity> filtered = all.stream()
                    .filter(u -> u.getDepartment() != null &&
                            allowedDepts.stream().anyMatch(ad -> ad.equalsIgnoreCase(u.getDepartment().trim())))
                    .toList();
            return ResponseEntity.ok(filtered);
        }

        // Faculty: Views colleagues in their assigned department
        if ("Faculty".equalsIgnoreCase(callerRole)) {
            if (callerDept.isBlank()) return ResponseEntity.ok(all);
            List<UserEntity> deptUsers = all.stream()
                    .filter(u -> u.getDepartment() != null && u.getDepartment().trim().equalsIgnoreCase(callerDept.trim()))
                    .toList();
            return ResponseEntity.ok(deptUsers);
        }

        // Student & Inspector: Minimal directory view
        return ResponseEntity.ok(all);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Account Creation Hierarchy:
     * - Main Admin creates everyone.
     * - HOD creates Faculty and Students within assigned departments.
     * - Faculty creates Students within their assigned department.
     * - Students, IQAC, Inspector cannot create user accounts.
     */
    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody UserEntity user,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String role) {

        String callerRole = resolveRole(role, actorRole, actorRoleHeader, userRoleHeader);
        if (callerRole.isBlank()) {
            callerRole = "Admin";
        }
        String callerDept = resolveDept(null, null, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(null, null, actorIdHeader, userIdHeader);

        // Fallback for UI requests: If callerRole not specified via header, default to Admin
        if (callerRole.isBlank()) {
            if (!callerId.isBlank()) {
                Optional<UserEntity> callerOpt = userRepository.findById(callerId)
                        .or(() -> userRepository.findByEmployeeId(callerId));
                if (callerOpt.isPresent()) {
                    callerRole = callerOpt.get().getRole();
                }
            }
            if (callerRole == null || callerRole.isBlank()) {
                callerRole = "Admin";
            }
        }

        // Account hierarchy enforcement
        if ("Admin".equalsIgnoreCase(callerRole)) {
            // Main Admin creates everyone across any role and department
        } else if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            // HOD can create Faculty or Student, but only within assigned departments
            if (!"Faculty".equalsIgnoreCase(user.getRole()) && !"Student".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: HOD can only provision Faculty and Student accounts."));
            }
            List<String> allowedDepts = resolveAllowedDepartments(callerId, callerDept);
            if (user.getDepartment() == null || !allowedDepts.stream().anyMatch(d -> d.equalsIgnoreCase(user.getDepartment().trim()))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: HOD can only provision members within their assigned departments: " + allowedDepts));
            }
        } else if ("Faculty".equalsIgnoreCase(callerRole)) {
            // Faculty can create Student, but only within their assigned department
            if (!"Student".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only provision Student accounts."));
            }
            if (user.getDepartment() == null || callerDept.isBlank() || !callerDept.equalsIgnoreCase(user.getDepartment().trim())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only provision Students within their own assigned department (" + callerDept + ")."));
            }
        } else {
            // Students, IQAC, Inspector, and Unauthenticated cannot create users
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Your role (" + (callerRole.isBlank() ? "Guest" : callerRole) + ") is not authorized to create user accounts."));
        }

        // Validate email uniqueness
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Official university email is required."));
        }
        if (userRepository.findByEmail(user.getEmail().trim().toLowerCase()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "An account with email " + user.getEmail() + " already exists."));
        }

        if (user.getId() == null || user.getId().isBlank()) {
            user.setId(IdGenerator.userId());
        }
        if (user.getStatus() == null || user.getStatus().isBlank()) {
            user.setStatus("Active");
        }
        if (user.getRoleTitle() == null || user.getRoleTitle().isBlank()) {
            user.setRoleTitle(user.getDesignation() != null ? user.getDesignation() + " (" + user.getRole() + ")" : user.getRole());
        }
        if (user.getAvatar() == null || user.getAvatar().isBlank()) {
            user.setAvatar(user.getName() != null && !user.getName().isBlank() ? user.getName().substring(0, 1).toUpperCase() : "U");
        }
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(com.university.portal.service.DataSeederService.DEMO_PASSWORD_HASH);
        }

        // Governance roles: Admin, IQAC Officer, and Inspector must NOT have any institute department
        if ("Admin".equalsIgnoreCase(user.getRole()) ||
            "IQAC".equalsIgnoreCase(user.getRole()) ||
            "Inspector".equalsIgnoreCase(user.getRole())) {
            user.setDepartment(null);
            user.setAdditionalDepartments(null);
            user.setSchool("Central Administration");
        }

        // Rule: Each department can have at most ONE active Head of Department (HOD)
        if ("DeanHOD".equalsIgnoreCase(user.getRole())) {
            if (user.getDepartment() == null || user.getDepartment().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Primary department is required for Head of Department (HOD)."));
            }
            String targetDept = user.getDepartment().trim();
            Optional<UserEntity> existingHod = findExistingActiveHod(targetDept, null);
            if (existingHod.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "Department '" + targetDept + "' already has an assigned Head of Department: " 
                             + existingHod.get().getName() + " (" + existingHod.get().getEmail() + "). "
                             + "Each department can only have a single HOD."
                ));
            }
        }

        if (user.getCustomPermissions() == null || user.getCustomPermissions().isBlank()) {
            if (user.getPermissions() != null && !user.getPermissions().isEmpty()) {
                user.setCustomPermissions(String.join(",", user.getPermissions()));
            }
        }

        UserEntity saved = userRepository.save(user);

        // Sync department HOD info
        if ("DeanHOD".equalsIgnoreCase(saved.getRole()) && saved.getDepartment() != null) {
            syncDepartmentHod(null, saved.getDepartment(), saved.getId(), saved.getName());
        }

        // Record audit trail and recent activity
        String nowStr = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").format(LocalDateTime.now());
        auditLogRepository.save(new AuditLogEntity(
                "AUD-" + System.currentTimeMillis() % 100000,
                nowStr,
                callerRole + (callerId.isBlank() ? "" : " (" + callerId + ")"),
                "USER_PROVISIONED",
                saved.getId(),
                "Account created: " + saved.getName() + " (" + saved.getRole() + ")",
                "—",
                saved.getStatus(),
                "Provisioned in department: " + saved.getDepartment(),
                "SHA256:" + Integer.toHexString((saved.getId() + saved.getEmail() + nowStr).hashCode())
        ));

        activityRepository.save(new RecentActivityEntity(
                "user-plus",
                "#2563eb",
                "New " + saved.getRole() + " provisioned: " + saved.getName() + " (" + saved.getDepartment() + ")",
                "Just now",
                callerRole
        ));

        return ResponseEntity.ok(saved);
    }

    /**
     * User Editing: Admin can update user details, designation, role, and department.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable String id,
            @RequestBody UserEntity updated,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {

        String callerRole = resolveRole(null, null, actorRoleHeader, userRoleHeader);
        String callerDept = resolveDept(null, null, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(null, null, actorIdHeader, userIdHeader);

        // Fallback for UI requests: If callerRole not specified via header, default to Admin
        if (callerRole.isBlank()) {
            if (!callerId.isBlank()) {
                Optional<UserEntity> callerOpt = userRepository.findById(callerId)
                        .or(() -> userRepository.findByEmployeeId(callerId));
                if (callerOpt.isPresent()) {
                    callerRole = callerOpt.get().getRole();
                }
            }
            if (callerRole == null || callerRole.isBlank()) {
                callerRole = "Admin";
            }
        }

        UserEntity user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found with ID " + id));
        }

        boolean isSelfEdit = (!callerId.isBlank() && (callerId.equalsIgnoreCase(user.getId()) || callerId.equalsIgnoreCase(user.getEmployeeId())));

        if ("Admin".equalsIgnoreCase(callerRole)) {
            // Admin can edit anyone
        } else if (isSelfEdit) {
            // Self-edit: User can update their own personal details (name, email)
            // Strictly FORBIDDEN to alter primary department, additional departments, role, or permissions
            if (updated.getRole() != null && !updated.getRole().isBlank() && !updated.getRole().equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: You cannot modify your assigned institutional role."));
            }
            if (updated.getDepartment() != null && !updated.getDepartment().isBlank() && !updated.getDepartment().equalsIgnoreCase(user.getDepartment())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: You cannot modify your assigned primary department. Department assignments are governed by Central IT Admin."));
            }
            if (updated.getAdditionalDepartments() != null && !updated.getAdditionalDepartments().equals(user.getAdditionalDepartments())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: You cannot modify your assigned additional department scope."));
            }
            if (updated.getCustomPermissions() != null && !updated.getCustomPermissions().equals(user.getCustomPermissions())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: You cannot modify your assigned permissions."));
            }
        } else if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            // HOD can edit Faculty or Student within assigned departments
            if (!"Faculty".equalsIgnoreCase(user.getRole()) && !"Student".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: HOD can only manage Faculty and Student accounts."));
            }
            List<String> allowedDepts = resolveAllowedDepartments(callerId, callerDept);
            if (!allowedDepts.stream().anyMatch(d -> d.equalsIgnoreCase(user.getDepartment()))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: You can only edit members belonging to your assigned departments: " + allowedDepts));
            }
            if (updated.getRole() != null && ("Admin".equalsIgnoreCase(updated.getRole()) || "IQAC".equalsIgnoreCase(updated.getRole()) || "DeanHOD".equalsIgnoreCase(updated.getRole()))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: HOD cannot assign Admin, IQAC, or HOD roles."));
            }
        } else if ("Faculty".equalsIgnoreCase(callerRole)) {
            // Faculty can edit Students within their assigned department
            if (!"Student".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only edit Student accounts."));
            }
            if (callerDept.isBlank() || !callerDept.equalsIgnoreCase(user.getDepartment())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only edit Students belonging to their own department (" + callerDept + ")."));
            }
            if (updated.getRole() != null && !"Student".equalsIgnoreCase(updated.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty cannot change account roles."));
            }
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: You do not have permission to edit user accounts."));
        }

        String oldRole = user.getRole();
        String oldDept = user.getDepartment();

        String targetRole = updated.getRole() != null && !updated.getRole().isBlank() ? updated.getRole().trim() : user.getRole();
        String targetDept = updated.getDepartment() != null ? updated.getDepartment().trim() : user.getDepartment();

        // Rule: Each department can have at most ONE active Head of Department (HOD)
        if ("DeanHOD".equalsIgnoreCase(targetRole)) {
            if (targetDept == null || targetDept.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Primary department is required for Head of Department (HOD)."));
            }
            Optional<UserEntity> existingHod = findExistingActiveHod(targetDept, user.getId());
            if (existingHod.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "Department '" + targetDept + "' already has an assigned Head of Department: " 
                             + existingHod.get().getName() + " (" + existingHod.get().getEmail() + "). "
                             + "Each department can only have a single HOD."
                ));
            }
        }

        if (updated.getName() != null && !updated.getName().isBlank()) {
            user.setName(updated.getName().trim());
            user.setAvatar(user.getName().substring(0, 1).toUpperCase());
        }
        if (updated.getEmail() != null && !updated.getEmail().isBlank()) {
            String newEmail = updated.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                Optional<UserEntity> existing = userRepository.findByEmail(newEmail);
                if (existing.isPresent() && !existing.get().getId().equalsIgnoreCase(user.getId())) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("error", "An account with email " + newEmail + " already exists."));
                }
                user.setEmail(newEmail);
            }
        }
        if (!isSelfEdit) {
            if (updated.getRole() != null && !updated.getRole().isBlank()) {
                user.setRole(updated.getRole().trim());
            }
            if (updated.getDepartment() != null) {
                user.setDepartment(updated.getDepartment().trim());
            }
            if (updated.getDesignation() != null) {
                user.setDesignation(updated.getDesignation().trim());
            }
            if (updated.getEmployeeId() != null) {
                user.setEmployeeId(updated.getEmployeeId().trim());
            }
            if (updated.getStatus() != null && !updated.getStatus().isBlank()) {
                user.setStatus(updated.getStatus().trim());
            }
            if (updated.getAdditionalDepartments() != null) {
                user.setAdditionalDepartments(updated.getAdditionalDepartments().trim());
            }
            if (updated.getCustomPermissions() != null) {
                user.setCustomPermissions(updated.getCustomPermissions().trim());
            } else if (updated.getPermissions() != null && !updated.getPermissions().isEmpty()) {
                user.setCustomPermissions(String.join(",", updated.getPermissions()));
            }
        }
        if (updated.getPasswordHash() != null && !updated.getPasswordHash().isBlank()) {
            user.setPasswordHash(updated.getPasswordHash().trim());
        }

        // Governance roles: Admin, IQAC Officer, and Inspector must NOT have any institute department
        if ("Admin".equalsIgnoreCase(user.getRole()) ||
            "IQAC".equalsIgnoreCase(user.getRole()) ||
            "Inspector".equalsIgnoreCase(user.getRole())) {
            user.setDepartment(null);
            user.setAdditionalDepartments(null);
        }

        UserEntity saved = userRepository.save(user);

        // Sync department HOD info
        if ("DeanHOD".equalsIgnoreCase(saved.getRole())) {
            syncDepartmentHod(oldDept, saved.getDepartment(), saved.getId(), saved.getName());
        } else if ("DeanHOD".equalsIgnoreCase(oldRole)) {
            clearDepartmentHod(saved.getId());
        }

        String nowStr = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").format(LocalDateTime.now());
        auditLogRepository.save(new AuditLogEntity(
                "AUD-" + System.currentTimeMillis() % 100000,
                nowStr,
                callerRole,
                "USER_UPDATED",
                saved.getId(),
                "User account updated: " + saved.getName(),
                "Active",
                saved.getStatus(),
                "Updated details for user " + saved.getId(),
                "SHA256:" + Integer.toHexString((saved.getId() + nowStr).hashCode())
        ));

        return ResponseEntity.ok(saved);
    }

    /**
     * Activate / Deactivate User Account.
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(value = "status", required = false) String statusParam,
            @RequestParam(value = "active", required = false) Boolean activeParam,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestHeader(value = "X-User-Dept", required = false) String userDeptHeader,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {

        String callerRole = resolveRole(null, null, actorRoleHeader, userRoleHeader);
        String callerDept = resolveDept(null, null, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(null, null, actorIdHeader, userIdHeader);

        // Fallback for UI requests: If callerRole not specified via header, default to Admin
        if (callerRole.isBlank()) {
            if (!callerId.isBlank()) {
                Optional<UserEntity> callerOpt = userRepository.findById(callerId)
                        .or(() -> userRepository.findByEmployeeId(callerId));
                if (callerOpt.isPresent()) {
                    callerRole = callerOpt.get().getRole();
                }
            }
            if (callerRole == null || callerRole.isBlank()) {
                callerRole = "Admin";
            }
        }

        UserEntity user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found with ID " + id));
        }

        if ("Admin".equalsIgnoreCase(callerRole)) {
            // Admin can change status of anyone
        } else if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            if (!"Faculty".equalsIgnoreCase(user.getRole()) && !"Student".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: HOD can only change status for Faculty and Student accounts."));
            }
            List<String> allowedDepts = resolveAllowedDepartments(callerId, callerDept);
            if (!allowedDepts.stream().anyMatch(d -> d.equalsIgnoreCase(user.getDepartment()))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: You can only manage members in your assigned departments: " + allowedDepts));
            }
        } else if ("Faculty".equalsIgnoreCase(callerRole)) {
            // Faculty can toggle status for Students in their assigned department
            if (!"Student".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only manage Student accounts."));
            }
            if (callerDept.isBlank() || !callerDept.equalsIgnoreCase(user.getDepartment())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Faculty can only manage Students belonging to their own department (" + callerDept + ")."));
            }
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: You do not have permission to change user status."));
        }

        String newStatus = "Active";
        if (body != null && body.containsKey("status")) {
            newStatus = body.get("status");
        } else if (statusParam != null && !statusParam.isBlank()) {
            newStatus = statusParam;
        } else if (activeParam != null) {
            newStatus = activeParam ? "Active" : "Inactive";
        }
        String oldStatus = user.getStatus();
        if ("DeanHOD".equalsIgnoreCase(user.getRole())) {
            if ("Active".equalsIgnoreCase(newStatus)) {
                Optional<UserEntity> existingHod = findExistingActiveHod(user.getDepartment(), user.getId());
                if (existingHod.isPresent()) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "Cannot activate HOD: Department '" + user.getDepartment() + "' already has an active Head of Department: " 
                                 + existingHod.get().getName() + " (" + existingHod.get().getEmail() + "). "
                                 + "Each department can only have a single HOD."
                    ));
                }
                syncDepartmentHod(null, user.getDepartment(), user.getId(), user.getName());
            } else {
                clearDepartmentHod(user.getId());
            }
        }
        user.setStatus(newStatus);
        UserEntity saved = userRepository.save(user);

        String nowStr = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").format(LocalDateTime.now());
        auditLogRepository.save(new AuditLogEntity(
                "AUD-" + System.currentTimeMillis() % 100000,
                nowStr,
                callerRole,
                "USER_STATUS_CHANGE",
                saved.getId(),
                "Account " + saved.getName() + " status changed to " + newStatus,
                oldStatus,
                newStatus,
                "Status modification by Admin",
                "SHA256:" + Integer.toHexString((saved.getId() + newStatus + nowStr).hashCode())
        ));

        return ResponseEntity.ok(saved);
    }

    /**
     * Rule 3: IT Admin can optionally grant an HOD access to additional departments
     * without changing their primary department. Additional department permissions are configurable.
     */
    @PutMapping("/{id}/permissions")
    public ResponseEntity<?> updateDepartmentPermissions(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String role) {

        String callerRole = resolveRole(role, actorRole, actorRoleHeader, userRoleHeader);
        if (callerRole.isBlank()) {
            callerRole = "Admin";
        }

        // Only IT Admin can configure department access permissions
        if (!"Admin".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IT Admin can configure HOD department permissions."));
        }

        UserEntity user = userRepository.findById(id)
                .orElseGet(() -> userRepository.findByEmployeeId(id).orElse(null));

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found with ID " + id));
        }

        if (body.containsKey("department") && body.get("department") != null) {
            user.setDepartment(body.get("department").toString().trim());
        }

        if (body.containsKey("additionalDepartments")) {
            Object addDepts = body.get("additionalDepartments");
            if (addDepts instanceof List) {
                user.setAdditionalDepartments(String.join(", ", (List<String>) addDepts));
            } else if (addDepts != null) {
                user.setAdditionalDepartments(addDepts.toString().trim());
            } else {
                user.setAdditionalDepartments(null);
            }
        }

        if (body.containsKey("permissions")) {
            Object perms = body.get("permissions");
            if (perms instanceof List) {
                user.setCustomPermissions(String.join(", ", (List<String>) perms));
            } else if (perms != null) {
                user.setCustomPermissions(perms.toString().trim());
            } else {
                user.setCustomPermissions(null);
            }
        } else if (body.containsKey("customPermissions")) {
            Object cp = body.get("customPermissions");
            user.setCustomPermissions(cp != null ? cp.toString().trim() : null);
        }

        UserEntity updated = userRepository.save(user);

        String nowStr = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").format(LocalDateTime.now());
        auditLogRepository.save(new AuditLogEntity(
                "AUD-" + System.currentTimeMillis() % 100000,
                nowStr,
                callerRole,
                "HOD_PERMISSIONS_UPDATED",
                updated.getId(),
                "Department scope updated for " + updated.getName(),
                "—",
                "Updated",
                "Primary: " + updated.getDepartment() + " | Additional: " + updated.getAdditionalDepartments(),
                "SHA256:" + Integer.toHexString((updated.getId() + nowStr).hashCode())
        ));

        activityRepository.save(new RecentActivityEntity(
                "shield-check",
                "#059669",
                "HOD permissions configured for " + updated.getName() + " (Scope: " + updated.getAllowedDepartments() + ")",
                "Just now",
                "Admin"
        ));

        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable String id,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String role) {

        String callerRole = resolveRole(role, actorRole, actorRoleHeader, userRoleHeader);
        if (callerRole.isBlank()) {
            callerRole = "Admin";
        }
        if (!"Admin".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IT Administrators can delete institutional user accounts."));
        }

        UserEntity toDelete = userRepository.findById(id).orElse(null);
        if (toDelete == null) {
            return ResponseEntity.notFound().build();
        }
        if ("DeanHOD".equalsIgnoreCase(toDelete.getRole())) {
            clearDepartmentHod(toDelete.getId());
        }
        userRepository.deleteById(id);

        String nowStr = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").format(LocalDateTime.now());
        auditLogRepository.save(new AuditLogEntity(
                "AUD-" + System.currentTimeMillis() % 100000,
                nowStr,
                callerRole,
                "USER_DELETED",
                id,
                "User account deleted: " + id,
                "Active",
                "Deleted",
                "Account removed by Central IT Admin",
                "SHA256:" + Integer.toHexString((id + nowStr).hashCode())
        ));

        return ResponseEntity.noContent().build();
    }

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

    private List<String> resolveAllowedDepartments(String actorId, String fallbackDept) {
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

    private Optional<UserEntity> findExistingActiveHod(String department, String excludeUserId) {
        if (department == null || department.isBlank()) return Optional.empty();
        String deptNorm = department.trim();
        return userRepository.findAll().stream()
                .filter(u -> "DeanHOD".equalsIgnoreCase(u.getRole()))
                .filter(u -> "Active".equalsIgnoreCase(u.getStatus()))
                .filter(u -> excludeUserId == null || !u.getId().equalsIgnoreCase(excludeUserId))
                .filter(u -> u.getDepartment() != null && u.getDepartment().trim().equalsIgnoreCase(deptNorm))
                .findFirst();
    }

    private void syncDepartmentHod(String oldDept, String newDept, String hodId, String hodName) {
        try {
            if (oldDept != null && !oldDept.isBlank() && !oldDept.equalsIgnoreCase(newDept)) {
                String oldNorm = oldDept.trim();
                departmentRepository.findAll().stream()
                        .filter(d -> oldNorm.equalsIgnoreCase(d.getName().trim()) || oldNorm.equalsIgnoreCase(d.getCode().trim()))
                        .forEach(d -> {
                            if (hodId != null && hodId.equals(d.getHodId())) {
                                d.setHodId(null);
                                d.setHodName("Unassigned");
                                departmentRepository.save(d);
                            }
                        });
            }
            if (newDept != null && !newDept.isBlank()) {
                String newNorm = newDept.trim();
                departmentRepository.findAll().stream()
                        .filter(d -> newNorm.equalsIgnoreCase(d.getName().trim()) || newNorm.equalsIgnoreCase(d.getCode().trim()))
                        .forEach(d -> {
                            d.setHodId(hodId);
                            d.setHodName(hodName);
                            departmentRepository.save(d);
                        });
            }
        } catch (Exception ignored) {}
    }

    private void clearDepartmentHod(String hodId) {
        try {
            if (hodId == null || hodId.isBlank()) return;
            departmentRepository.findAll().stream()
                    .filter(d -> hodId.equals(d.getHodId()))
                    .forEach(d -> {
                        d.setHodId(null);
                        d.setHodName("Unassigned");
                        departmentRepository.save(d);
                    });
        } catch (Exception ignored) {}
    }
}
