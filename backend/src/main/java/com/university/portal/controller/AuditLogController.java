package com.university.portal.controller;

import com.university.portal.entity.AuditLogEntity;
import com.university.portal.repository.AuditLogRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public List<AuditLogEntity> getAll() {
        return auditLogRepository.findAllByOrderByIdDesc();
    }
}

