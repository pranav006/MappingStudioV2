package com.mappingstudio.mapping;

import com.mappingstudio.repository.MappingRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mappings")
public class MappingController {

    private final MappingRepository repo;

    public MappingController(MappingRepository repo) {
        this.repo = repo;
    }

    @PostMapping("/save")
    public MappingEntity save(@RequestBody MappingEntity entity) {
        return repo.save(entity);
    }

    @GetMapping("/{project}")
    public List<MappingEntity> loadByName(@PathVariable String project) {
        return repo.findByProjectName(project);
    }

    @GetMapping("/project/{projectId}")
    public List<MappingEntity> loadByProjectId(@PathVariable Long projectId) {
        return repo.findByProjectId(projectId);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
