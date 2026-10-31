package com.university.portal.controller;

import com.university.portal.entity.UserEntity;
import com.university.portal.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<UserEntity> getAll() {
        return userRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<UserEntity> create(@RequestBody UserEntity user) {
        if (user.getId() == null || user.getId().trim().isEmpty()) {
            user.setId("USR-" + (int)(100 + Math.random() * 900));
        }
        if (user.getStatus() == null) {
            user.setStatus("Active");
        }
        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

