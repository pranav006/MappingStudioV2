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

    @PatchMapping("/{id}")
    public MappingEntity update(@PathVariable Long id, @RequestBody java.util.Map<String, Object> body) {
        MappingEntity entity = repo.findById(id).orElseThrow();
        if (body.containsKey("reviewLater")) {
            entity.setReviewLater(Boolean.TRUE.equals(body.get("reviewLater")));
        }
        if (body.containsKey("source") && body.get("source") != null) {
            entity.setSource(body.get("source").toString());
        }
        if (body.containsKey("target") && body.get("target") != null) {
            entity.setTarget(body.get("target").toString());
        }
        if (body.containsKey("logic") && body.get("logic") != null) {
            entity.setLogic(body.get("logic").toString());
        }
        if (body.containsKey("comments")) {
            entity.setComments(body.get("comments") == null ? null : body.get("comments").toString());
        }
        return repo.save(entity);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
