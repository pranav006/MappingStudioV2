package com.mappingstudio.repository;

import com.mappingstudio.model.CustomSchemaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomSchemaRepository extends JpaRepository<CustomSchemaEntity, Long> {

    List<CustomSchemaEntity> findAllByOrderByCreatedAtDesc();

    Optional<CustomSchemaEntity> findById(Long id);

    Optional<CustomSchemaEntity> findByName(String name);
}
