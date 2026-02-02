package com.mappingstudio.controller;

import com.mappingstudio.edi.EdiSchemaRegistry;
import com.mappingstudio.mapping.MappingEntity;
import com.mappingstudio.model.ProjectEntity;
import com.mappingstudio.repository.MappingRepository;
import com.mappingstudio.repository.ProjectRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectRepository projectRepo;
    private final MappingRepository mappingRepo;
    private final EdiSchemaRegistry ediSchemaRegistry;

    public ProjectController(ProjectRepository projectRepo, MappingRepository mappingRepo, EdiSchemaRegistry ediSchemaRegistry) {
        this.projectRepo = projectRepo;
        this.mappingRepo = mappingRepo;
        this.ediSchemaRegistry = ediSchemaRegistry;
    }

    @GetMapping
    public List<ProjectEntity> list() {
        List<ProjectEntity> projects = projectRepo.findAllByOrderByIdDesc();
        for (ProjectEntity p : projects) {
            int coverage = computeCoverage(p.getId(), p.getTargetSchema());
            p.setCoverage(coverage);
        }
        return projects;
    }

    /** Coverage = min(100, round(100 * distinct mapped targets / total target schema leaf count)). */
    private int computeCoverage(Long projectId, String targetSchema) {
        List<MappingEntity> mappings = mappingRepo.findByProjectId(projectId);
        long distinctTargets = mappings.stream()
            .map(MappingEntity::getTarget)
            .filter(t -> t != null && !t.isBlank())
            .distinct()
            .count();
        int totalLeaves = ediSchemaRegistry.getTargetSchemaLeafCount(targetSchema);
        if (totalLeaves <= 0) totalLeaves = 1;
        return (int) Math.min(100, Math.round(100.0 * distinctTargets / totalLeaves));
    }

    @PostMapping
    public ProjectEntity create(@RequestBody ProjectEntity project) {
        if (project.getStatus() == null) project.setStatus("Spec creation in progress");
        if (project.getUpdated() == null) project.setUpdated("Just now");
        return projectRepo.save(project);
    }

    /** Deletes all projects and all mappings. Use to clear the DB. Must be before /{id} so "clear-all" is not matched as id. */
    @DeleteMapping("/clear-all")
    public void clearAll() {
        mappingRepo.deleteAll();
        projectRepo.deleteAll();
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ProjectEntity> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        ProjectEntity existing = projectRepo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        if (body.containsKey("status")) existing.setStatus(body.get("status"));
        if (body.containsKey("updated")) existing.setUpdated(body.get("updated"));
        return ResponseEntity.ok(projectRepo.save(existing));
    }

    @Transactional
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!projectRepo.existsById(id)) return;
        for (MappingEntity m : mappingRepo.findByProjectId(id)) {
            mappingRepo.delete(m);
        }
        projectRepo.deleteById(id);
    }
}
