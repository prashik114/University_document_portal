package com.university.portal.controller;

import com.university.portal.entity.DepartmentEntity;
import com.university.portal.entity.UserEntity;
import com.university.portal.repository.DepartmentRepository;
import com.university.portal.repository.DocumentRepository;
import com.university.portal.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;

    public DepartmentController(DepartmentRepository departmentRepository,
                                UserRepository userRepository,
                                DocumentRepository documentRepository) {
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<DepartmentEntity> depts = departmentRepository.findAll();
        List<UserEntity> users = userRepository.findAll();
        long totalDocs = documentRepository.count();

        List<Map<String, Object>> result = new ArrayList<>();
        for (DepartmentEntity d : depts) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", d.getId());
            map.put("code", d.getCode());
            map.put("name", d.getName());
            map.put("school", d.getSchool());
            map.put("hodId", d.getHodId());
            map.put("hodName", d.getHodName());
            map.put("status", d.getStatus());
            map.put("description", d.getDescription());
            map.put("establishedYear", d.getEstablishedYear());

            long facultyCount = users.stream()
                    .filter(u -> "Faculty".equalsIgnoreCase(u.getRole()) &&
                            d.getName().equalsIgnoreCase(u.getDepartment()))
                    .count();
            long studentCount = users.stream()
                    .filter(u -> "Student".equalsIgnoreCase(u.getRole()) &&
                            d.getName().equalsIgnoreCase(u.getDepartment()))
                    .count();
            long docCount = documentRepository.findAll().stream()
                    .filter(doc -> d.getName().equalsIgnoreCase(doc.getDepartment()))
                    .count();

            map.put("facultyCount", facultyCount);
            map.put("studentCount", studentCount);
            map.put("totalMembers", facultyCount + studentCount + (d.getHodId() != null ? 1 : 0));
            map.put("documentCount", docCount);

            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        return departmentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody DepartmentEntity dept,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {

        String role = actorRoleHeader != null && !actorRoleHeader.isBlank() ? actorRoleHeader : userRoleHeader;
        if (!"Admin".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IT Admin can create departments."));
        }

        if (dept.getName() == null || dept.getName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Department name is required."));
        }
        if (dept.getCode() == null || dept.getCode().isBlank()) {
            dept.setCode(dept.getName().replaceAll("[^A-Z]", ""));
            if (dept.getCode().isBlank()) dept.setCode("DEPT");
        }

        if (departmentRepository.findByCode(dept.getCode().toUpperCase().trim()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "A department with code " + dept.getCode() + " already exists."));
        }

        if (dept.getId() == null || dept.getId().isBlank()) {
            dept.setId("DEPT-" + dept.getCode().toUpperCase().trim());
        }
        dept.setCode(dept.getCode().toUpperCase().trim());
        if (dept.getStatus() == null || dept.getStatus().isBlank()) {
            dept.setStatus("Active");
        }

        DepartmentEntity saved = departmentRepository.save(dept);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable String id,
            @RequestBody DepartmentEntity updated,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {

        String role = actorRoleHeader != null && !actorRoleHeader.isBlank() ? actorRoleHeader : userRoleHeader;
        if (!"Admin".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IT Admin can manage departments."));
        }

        DepartmentEntity existing = departmentRepository.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        if (updated.getName() != null && !updated.getName().isBlank()) {
            existing.setName(updated.getName().trim());
        }
        if (updated.getCode() != null && !updated.getCode().isBlank()) {
            existing.setCode(updated.getCode().toUpperCase().trim());
        }
        if (updated.getSchool() != null) {
            existing.setSchool(updated.getSchool().trim());
        }
        if (updated.getHodId() != null) {
            existing.setHodId(updated.getHodId().trim());
        }
        if (updated.getHodName() != null) {
            existing.setHodName(updated.getHodName().trim());
        }
        if (updated.getStatus() != null && !updated.getStatus().isBlank()) {
            existing.setStatus(updated.getStatus().trim());
        }
        if (updated.getDescription() != null) {
            existing.setDescription(updated.getDescription().trim());
        }

        return ResponseEntity.ok(departmentRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable String id,
            @RequestHeader(value = "X-Actor-Role", required = false) String actorRoleHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader) {

        String role = actorRoleHeader != null && !actorRoleHeader.isBlank() ? actorRoleHeader : userRoleHeader;
        if (!"Admin".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access Denied: Only Central IT Admin can delete departments."));
        }

        if (!departmentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        departmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
