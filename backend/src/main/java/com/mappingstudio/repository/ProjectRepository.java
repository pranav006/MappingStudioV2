package com.mappingstudio.repository;

import com.mappingstudio.model.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<ProjectEntity, Long> {

    List<ProjectEntity> findAllByOrderByIdDesc();
}
