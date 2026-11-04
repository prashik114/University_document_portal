package com.university.portal.repository;

import com.university.portal.entity.StoredFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoredFileRepository extends JpaRepository<StoredFileEntity, String> {
    Optional<StoredFileEntity> findByFileName(String fileName);
}

