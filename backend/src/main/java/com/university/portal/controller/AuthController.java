package com.university.portal.controller;

import com.university.portal.entity.UserEntity;
import com.university.portal.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String role = credentials.get("role");

        UserEntity user = null;
        if (email != null && !email.trim().isEmpty()) {
            user = userRepository.findByEmail(email.trim()).orElse(null);
        }

        if (user == null && role != null && !role.trim().isEmpty()) {
            user = userRepository.findFirstByRole(role.trim()).orElse(null);
        }

        if (user == null) {
            // Fallback to first user
            user = userRepository.findAll().stream().findFirst().orElse(null);
        }

        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No users found in database"));
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("authenticated", true);
        resp.put("user", user);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/users")
    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }
}

