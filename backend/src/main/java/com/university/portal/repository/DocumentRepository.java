package com.university.portal.repository;

import com.university.portal.entity.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<DocumentEntity, String> {

    List<DocumentEntity> findAllByOrderByDisplayNumAsc();

    List<DocumentEntity> findByStatus(String status);

    List<DocumentEntity> findByOwnerId(String ownerId);

    List<DocumentEntity> findByDepartment(String department);

    List<DocumentEntity> findByCurrentStage(String currentStage);

    List<DocumentEntity> findByStatusAndCurrentStage(String status, String currentStage);

    @Query("SELECT d FROM DocumentEntity d WHERE " +
           "(:category = 'ALL' OR d.category = :category) AND " +
           "(:status = 'ALL' OR d.status = :status) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(d.ownerName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(d.id) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<DocumentEntity> filterDocuments(@Param("category") String category,
                                         @Param("status") String status,
                                         @Param("search") String search);
}

