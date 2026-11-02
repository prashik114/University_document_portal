package com.university.portal.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.portal.dto.DocumentDTO;
import com.university.portal.entity.DocumentEntity;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Converts between {@link DocumentEntity} (JPA, JSON-as-TEXT columns) and
 * {@link DocumentDTO} (API response, parsed objects).
 * Centralises all Jackson deserialisation in one place so controllers and
 * services stay clean.
 */
public final class DocumentMapper {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private DocumentMapper() {}

    /** Entity → DTO (used before sending data to clients). */
    public static DocumentDTO toDTO(DocumentEntity e) {
        DocumentDTO dto = new DocumentDTO();
        dto.setId(e.getId());
        dto.setDisplayNum(e.getDisplayNum());
        dto.setTitle(e.getTitle());
        dto.setFileType(e.getFileType());
        dto.setFileSize(e.getFileSize());
        dto.setCategory(e.getCategory());
        dto.setSubCategory(e.getSubCategory());
        dto.setOwnerType(e.getOwnerType());
        dto.setOwnerName(e.getOwnerName());
        dto.setOwnerId(e.getOwnerId());
        dto.setRecordedByFaculty(e.getRecordedByFaculty());
        dto.setDepartment(e.getDepartment());
        dto.setSchool(e.getSchool());
        dto.setAcademicYear(e.getAcademicYear());
        dto.setSubmittedOn(e.getSubmittedOn());
        dto.setStatus(e.getStatus());
        dto.setCurrentStage(e.getCurrentStage());
        dto.setNaacCriterion(e.getNaacCriterion());
        dto.setEvidenceFile(e.getEvidenceFile());
        dto.setEvidenceVerified(e.getEvidenceVerified());
        dto.setIsLocked(e.getIsLocked());

        dto.setEventDetails(parseMap(e.getEventDetailsJson()));
        dto.setTimeline(parseList(e.getTimelineJson()));
        dto.setReviewerComments(parseList(e.getReviewerCommentsJson()));

        return dto;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static Map<String, Object> parseMap(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return MAPPER.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }

    private static List<Map<String, Object>> parseList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return MAPPER.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }
}
