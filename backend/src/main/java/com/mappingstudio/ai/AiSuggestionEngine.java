package com.mappingstudio.ai;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
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

        List<Map<String, Object>> list = history.stream()
                .sorted(Comparator.comparingDouble(AiLearningEntity::getConfidence).reversed())
                .map(entry -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("label", entry.getLogic());
                    map.put("code", entry.getLogic());
                    map.put("confidence", entry.getConfidence());
                    return map;
                })
                .collect(Collectors.toList());

        if (list.isEmpty()) {
            list = defaultSuggestions(source, target);
        }
        return list;
    }

    private static List<Map<String, Object>> defaultSuggestions(String source, String target) {
        List<Map<String, Object>> out = new ArrayList<>();
        String direct = "target." + target + " = source." + source + ";";
        Map<String, Object> m1 = new HashMap<>();
        m1.put("label", "Direct Mapping");
        m1.put("code", direct);
        out.add(m1);
        String clean = "target." + target + " = source." + source + "?.trim().toUpperCase();";
        Map<String, Object> m2 = new HashMap<>();
        m2.put("label", "Standard Clean");
        m2.put("code", clean);
        out.add(m2);
        return out;
    }
}
