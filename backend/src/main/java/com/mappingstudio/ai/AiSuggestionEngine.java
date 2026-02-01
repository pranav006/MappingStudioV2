package com.mappingstudio.ai;

import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AiSuggestionEngine {

    private final AiLearningRepository repo;

    public AiSuggestionEngine(AiLearningRepository repo) {
        this.repo = repo;
    }

    public List<Map<String, Object>> suggest(String source, String target) {

        var history = repo.findBySourceFieldAndTargetField(source, target);

        return history.stream()
                .sorted(Comparator.comparingDouble(AiLearningEntity::getConfidence).reversed())
                .map(entry -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("label", entry.getLogic());
                    map.put("code", entry.getLogic());
                    map.put("confidence", entry.getConfidence());
                    return map;
                })
                .collect(Collectors.toList());
    }
}
