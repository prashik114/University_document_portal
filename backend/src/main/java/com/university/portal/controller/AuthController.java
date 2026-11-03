package com.university.portal.controller;

import com.university.portal.dto.LoginRequestDTO;
import com.university.portal.dto.LoginResponseDTO;
import com.university.portal.entity.UserEntity;
import com.university.portal.repository.UserRepository;
import com.university.portal.service.DataSeederService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Handles authentication and basic system health checks.
 *
 * <p><strong>Security notes for this demo:</strong>
 * Passwords are compared against the value stored in {@code UserEntity.passwordHash}.
 * The seeder stores them as plain text ({@code Password@123}) — in a production
 * system this should be replaced with BCrypt hashing via Spring Security.</p>
 *
 * <p>No JWT or session token is issued. Authentication state is maintained
 * client-side in localStorage. Add Spring Security + JWT for production.</p>
 */
@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserRepository    userRepository;
    private final DataSeederService dataSeederService;

    public AuthController(UserRepository userRepository,
                          DataSeederService dataSeederService) {
        this.userRepository    = userRepository;
        this.dataSeederService = dataSeederService;
    }

    // ── Health ────────────────────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status",     "UP");
        body.put("service",    "University Document Portal REST API");
        body.put("database",   "Connected");
        body.put("totalUsers", userRepository.count());
        return ResponseEntity.ok(body);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO req) {

        String email = req.getEmail();
        if (email == null || email.isBlank() || !email.contains("@")) {
            return error(HttpStatus.UNAUTHORIZED, "A valid university email address is required.");
        }

        UserEntity user = userRepository
                .findByEmail(email.trim().toLowerCase())
                .orElseGet(() -> userRepository.findByEmail(email.trim()).orElse(null));

        if (user == null) {
            return error(HttpStatus.UNAUTHORIZED,
                    "No institutional account found for this email. Please verify your credentials.");
        }

        // ── Credential verification ────────────────────────────────────────
        boolean useOtp = "otp".equalsIgnoreCase(req.getMethod())
                || (req.getOtp() != null && !req.getOtp().isBlank());

        if (useOtp) {
            // OTP check against the seeder constant (single source of truth)
            if (!DataSeederService.DEMO_OTP.equals(req.getOtp() != null ? req.getOtp().trim() : "")) {
                return error(HttpStatus.UNAUTHORIZED,
                        "Invalid or expired OTP. Please enter the correct verification code.");
            }
        } else {
            if (req.getPassword() == null || req.getPassword().isBlank()) {
                return error(HttpStatus.UNAUTHORIZED, "Password is required for institutional access.");
            }
            String inputPwd = req.getPassword().trim();
            String storedPwd = (user.getPasswordHash() != null && !user.getPasswordHash().isBlank())
                    ? user.getPasswordHash()
                    : DataSeederService.DEMO_PASSWORD_HASH;

            if (!inputPwd.equals(storedPwd)) {
                return error(HttpStatus.UNAUTHORIZED,
                        "Invalid password. Please check your credentials.");
            }

            if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
                user.setPasswordHash(DataSeederService.DEMO_PASSWORD_HASH);
                userRepository.save(user);
            }
        }

        return ResponseEntity.ok(new LoginResponseDTO(true, user,
                "Signed in successfully as " + user.getName()));
    }

    // ── Change Password ──────────────────────────────────────────────────────
    @PostMapping("/auth/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorIdHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {

        String userId = body.get("userId");
        if (userId == null || userId.isBlank()) {
            userId = actorIdHeader != null && !actorIdHeader.isBlank() ? actorIdHeader : userIdHeader;
        }
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (userId == null || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User ID and new password are required."));
        }

        final String lookupId = userId;
        UserEntity user = userRepository.findById(lookupId)
                .or(() -> userRepository.findByEmployeeId(lookupId))
                .or(() -> userRepository.findByEmail(lookupId.toLowerCase().trim()))
                .orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User account not found."));
        }

        String current = user.getPasswordHash() != null ? user.getPasswordHash() : DataSeederService.DEMO_PASSWORD_HASH;
        if (oldPassword != null && !oldPassword.isBlank() && !oldPassword.equals(current)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Current password does not match."));
        }

        user.setPasswordHash(newPassword.trim());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
    }

    // ── User list (for admin use) ─────────────────────────────────────────────

    @GetMapping("/auth/users")
    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
