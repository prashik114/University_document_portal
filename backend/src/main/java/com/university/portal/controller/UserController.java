package com.university.portal.controller;

import com.university.portal.entity.UserEntity;
import com.university.portal.repository.UserRepository;
import com.university.portal.util.IdGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Controller enforcing role-based access control and department governance.
 *
 * Rules:
 * 1. IT Admin creates all user accounts (HODs, Teachers, and Students) and assigns roles and primary departments.
 * 2. Each HOD can view and manage documents belonging only to their assigned department by default.
 * 3. IT Admin can optionally grant an HOD access to additional departments without changing their primary department.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
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
        String callerDept = resolveDept(dept, actorDepartment, actorDeptHeader, userDeptHeader);
        String callerId   = resolveId(id, actorId, actorIdHeader, userIdHeader);

        List<UserEntity> all = userRepository.findAll();

        // Default or Admin/IQAC: Institutional view
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
     * Rule 1: IT Admin creates all user accounts (HODs, Teachers, and Students)
     * and assigns their roles and primary departments.
     */
    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody UserEntity user,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String role) {

        String callerRole = resolveRole(role, actorRole, actorRoleHeader, userRoleHeader);

        // Rule 1 Enforcement: Only Central IT Admin can provision user accounts
        if (!"Admin".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IT Admin is authorized to create institutional user accounts."));
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

        UserEntity saved = userRepository.save(user);
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

        UserEntity updated = userRepository.save(user);
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
        if (!"Admin".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IT Administrators can delete institutional user accounts."));
        }

        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
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
}
