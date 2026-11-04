package com.university.portal.controller;

import com.university.portal.entity.StoredFileEntity;
import com.university.portal.repository.StoredFileRepository;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Handles evidence file uploads and downloads.
 * Files are stored directly in PostgreSQL / Relational Database (stored_files table)
 * as binary data (BYTEA/BLOB) and NOT saved into the local filesystem or project folders.
 */
@RestController
@RequestMapping("/api/files")
public class FileController {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "png", "jpg", "jpeg", "gif", "zip"
    );

    private static final long MAX_SIZE_BYTES = 50L * 1024 * 1024; // 50 MB

    private final StoredFileRepository storedFileRepository;

    public FileController(StoredFileRepository storedFileRepository) {
        this.storedFileRepository = storedFileRepository;
    }

    // ── Upload directly into Database ──────────────────────────────────────────

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> upload(@RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return badRequest("No file provided.");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            return badRequest("File exceeds the 50 MB size limit.");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String cleanName    = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String ext          = extension(cleanName);

        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            return badRequest("File type '." + ext + "' is not permitted. Allowed: " + ALLOWED_EXTENSIONS);
        }

        String fileId     = UUID.randomUUID().toString();
        String uniqueName = fileId.substring(0, 8) + "_" + cleanName;
        String contentType = file.getContentType() != null && !file.getContentType().isBlank()
                ? file.getContentType()
                : detectContentType(ext);

        try {
            byte[] bytes = file.getBytes();
            StoredFileEntity stored = new StoredFileEntity(
                    fileId,
                    uniqueName,
                    originalName,
                    ext,
                    humanSize(file.getSize()),
                    contentType,
                    bytes
            );
            storedFileRepository.save(stored);
        } catch (IOException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database file storage failed: " + ex.getMessage()));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("fileName",     uniqueName);
        response.put("originalName", originalName);
        response.put("fileSize",     humanSize(file.getSize()));
        response.put("fileType",     ext);
        response.put("downloadUrl",  "/api/files/" + uniqueName);
        return ResponseEntity.ok(response);
    }

    // ── Download / inline preview from Database ───────────────────────────────

    @GetMapping("/{fileName:.+}")
    public ResponseEntity<Resource> download(@PathVariable String fileName) {
        try {
            StoredFileEntity file = storedFileRepository.findByFileName(fileName)
                    .or(() -> storedFileRepository.findById(fileName))
                    .orElse(null);

            if (file == null || file.getData() == null) {
                return ResponseEntity.notFound().build();
            }

            String contentType = file.getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = detectContentType(file.getFileType());
            }

            ByteArrayResource resource = new ByteArrayResource(file.getData());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + (file.getOriginalName() != null ? file.getOriginalName() : file.getFileName()) + "\"")
                    .body(resource);

        } catch (Exception ex) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String extension(String name) {
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(dot + 1).toLowerCase() : "";
    }

    private static String humanSize(long bytes) {
        if (bytes >= 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        return String.format("%.0f KB", bytes / 1024.0);
    }

    private static String detectContentType(String ext) {
        return switch (ext.toLowerCase()) {
            case "pdf" -> "application/pdf";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "doc" -> "application/msword";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "xls" -> "application/vnd.ms-excel";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "ppt" -> "application/vnd.ms-powerpoint";
            case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "zip" -> "application/zip";
            default -> "application/octet-stream";
        };
    }

    private static ResponseEntity<Map<String, Object>> badRequest(String msg) {
        return ResponseEntity.badRequest().body(Map.of("error", msg));
    }
}
