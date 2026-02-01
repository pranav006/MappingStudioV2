package com.mappingstudio.repository;

import com.mappingstudio.mapping.MappingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MappingRepository
        extends JpaRepository<MappingEntity, Long> {

    List<MappingEntity> findByProjectName(String projectName);
}
