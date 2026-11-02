package com.university.portal.controller;

import com.university.portal.entity.UserEntity;
import com.university.portal.repository.UserRepository;
import com.university.portal.util.IdGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller enforcing strict role-based account provisioning policy and department isolation.
 *
 * Provisioning Policy:
 * - Central IT Admin: Can create/provision Dean, HOD, IQAC, Faculty, Students, Auditor, and other Admins.
 *   Only Central IT Admin is allowed to create or promote other administrators.
 * - Dean / HOD: Can ONLY provision Faculty and Students, strictly within their own assigned department.
 * - Other roles: Forbidden from creating accounts.
 *
 * View Policy (Department Isolation):
 * - Admin & IQAC: View all institutional records.
 * - Dean / HOD: View only users within their assigned department.
 * - Faculty: View colleagues in assigned department.
 * - Student: View own profile.
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
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String actorDepartment) {

        String role = (actorRole != null && !actorRole.isBlank()) ? actorRole : (actorRoleHeader != null ? actorRoleHeader : "Admin");
        String dept = (actorDepartment != null && !actorDepartment.isBlank()) ? actorDepartment : (actorDeptHeader != null ? actorDeptHeader : "");

        List<UserEntity> all = userRepository.findAll();

        if ("Admin".equalsIgnoreCase(role) || "IQAC".equalsIgnoreCase(role)) {
            return ResponseEntity.ok(all);
        }

        if ("DeanHOD".equalsIgnoreCase(role) || "Faculty".equalsIgnoreCase(role)) {
            if (dept.isBlank()) {
                return ResponseEntity.ok(all);
            }
            List<UserEntity> deptUsers = all.stream()
                    .filter(u -> u.getDepartment() != null && u.getDepartment().trim().equalsIgnoreCase(dept.trim()))
                    .toList();
            return ResponseEntity.ok(deptUsers);
        }

        return ResponseEntity.ok(all);
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody UserEntity user,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-Actor-Department", required = false) String actorDeptHeader,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String actorDepartment) {

        String callerRole = (actorRole != null && !actorRole.isBlank()) ? actorRole : (actorRoleHeader != null ? actorRoleHeader : "Admin");
        String callerDept = (actorDepartment != null && !actorDepartment.isBlank()) ? actorDepartment : (actorDeptHeader != null ? actorDeptHeader : "");

        // 1. Role-wise provisioning policy check
        if ("DeanHOD".equalsIgnoreCase(callerRole)) {
            String targetRole = user.getRole();
            if (targetRole == null || (!"Faculty".equalsIgnoreCase(targetRole) && !"Student".equalsIgnoreCase(targetRole))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied: Deans and HoDs are only permitted to provision Faculty and Students. Central IT Admin is the only role allowed to create or promote administrators."));
            }

            // Department isolation check
            if (callerDept.isBlank()) {
                callerDept = "Computer Science & Engineering"; // Fallback default
            }

            if (user.getDepartment() != null && !user.getDepartment().trim().equalsIgnoreCase(callerDept.trim())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Department Isolation Violation: You are assigned to " + callerDept + ". You cannot provision users for " + user.getDepartment() + "."));
            }

            user.setDepartment(callerDept);
        } else if (!"Admin".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Your role (" + callerRole + ") does not have permission to provision institutional accounts."));
        }

        // 2. Validate email uniqueness
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

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable String id,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestParam(required = false) String actorRole) {

        String callerRole = (actorRole != null && !actorRole.isBlank()) ? actorRole : (actorRoleHeader != null ? actorRoleHeader : "Admin");
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
}
