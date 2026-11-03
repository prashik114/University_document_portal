package com.university.portal.repository;

import com.university.portal.entity.DepartmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<DepartmentEntity, String> {
    Optional<DepartmentEntity> findByCode(String code);
    Optional<DepartmentEntity> findByName(String name);
}
