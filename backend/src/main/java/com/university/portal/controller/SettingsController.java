package com.university.portal.controller;

import com.university.portal.entity.SystemSettingsEntity;
import com.university.portal.repository.SystemSettingsRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class SettingsController {

    private final SystemSettingsRepository settingsRepository;

    public SettingsController(SystemSettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    @GetMapping
    public ResponseEntity<SystemSettingsEntity> get() {
        return ResponseEntity.ok(settingsRepository.findById("DEFAULT")
                .orElseGet(() -> settingsRepository.save(new SystemSettingsEntity())));
    }

    @PutMapping
    public ResponseEntity<SystemSettingsEntity> update(@RequestBody SystemSettingsEntity updated) {
        updated.setId("DEFAULT");
        return ResponseEntity.ok(settingsRepository.save(updated));
    }
}

