package com.university.portal.repository;

import com.university.portal.entity.RevisionRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RevisionRequestRepository extends JpaRepository<RevisionRequestEntity, String> {
    List<RevisionRequestEntity> findAllByOrderByIdDesc();
}

