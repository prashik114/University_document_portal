package com.university.portal.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Entity to store uploaded files directly in the database (PostgreSQL / Relational DB).
 * Stores binary file content as byte array (BYTEA / BLOB) rather than on the local file system.
 */
@Entity
@Table(name = "stored_files")
public class StoredFileEntity {

    @Id
    private String id; // UUID string

    @Column(nullable = false, unique = true)
    private String fileName;

    private String originalName;
    private String fileType;
    private String fileSize;
    private String contentType;
    private String uploadedAt;

    @Lob
    @Column(name = "data", columnDefinition = "BYTEA")
    private byte[] data;

    public StoredFileEntity() {
        this.uploadedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
    }

    public StoredFileEntity(String id, String fileName, String originalName,
                            String fileType, String fileSize, String contentType, byte[] data) {
        this.id = id;
        this.fileName = fileName;
        this.originalName = originalName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.contentType = contentType;
        this.data = data;
        this.uploadedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public String getFileSize() { return fileSize; }
    public void setFileSize(String fileSize) { this.fileSize = fileSize; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(String uploadedAt) { this.uploadedAt = uploadedAt; }

    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }
}
