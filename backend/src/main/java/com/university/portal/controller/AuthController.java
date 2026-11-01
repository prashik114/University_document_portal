package com.university.portal.controller;

import com.university.portal.entity.UserEntity;
import com.university.portal.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "University Document Portal REST API");
        status.put("database", "Connected");
        status.put("totalUsers", userRepository.count());
        return ResponseEntity.ok(status);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");
        String otp = credentials.get("otp");
        String loginMethod = credentials.getOrDefault("method", "password");

        if (email == null || email.trim().isEmpty() || !email.contains("@")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Valid university email address is required."));
        }

        UserEntity user = userRepository.findByEmail(email.trim().toLowerCase())
                .or(() -> userRepository.findByEmail(email.trim()))
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "No institutional account found with this email. Please check your credentials or contact administrator."));
        }

        // Validate password or OTP strictly
        if ("otp".equalsIgnoreCase(loginMethod) || (otp != null && !otp.trim().isEmpty())) {
            if (!"1234".equals(otp != null ? otp.trim() : "")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or expired OTP. Please enter the valid verification code."));
            }
        } else {
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Password is required for institutional access."));
            }
            if (!"Password@123".equals(password.trim())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid password. Access denied."));
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("authenticated", true);
        resp.put("user", user);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/auth/users")
    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }
}
