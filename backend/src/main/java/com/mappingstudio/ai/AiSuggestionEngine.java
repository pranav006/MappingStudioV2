package com.mappingstudio.ai;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AiSuggestionEngine {

    private final AiLearningRepository repo;
    private final LlmMappingService llmService;
    private final RuleBasedSuggestionService ruleBasedService;

    public AiSuggestionEngine(AiLearningRepository repo, LlmMappingService llmService,
                              RuleBasedSuggestionService ruleBasedService) {
        this.repo = repo;
        this.llmService = llmService;
        this.ruleBasedService = ruleBasedService;
    }

    /**
     * Suggest mapping logic: LLM (if enabled), else rule-based analysis of source/target fields,
     * then learned history, then defaults. No LLM required—rule-based analyzes names/keys and suggests accordingly.
     */
    public List<Map<String, Object>> suggest(String source, String target,
                                              String sourceTitle, String targetTitle) {

        List<Map<String, Object>> list = new ArrayList<>();

        if (llmService.isEnabled()) {
            List<Map<String, Object>> llmSuggestions = llmService.suggest(source, target, sourceTitle, targetTitle);
            list.addAll(llmSuggestions);
        } else {
            List<Map<String, Object>> analyzed = ruleBasedService.suggest(source, target, sourceTitle, targetTitle);
            list.addAll(analyzed);
        }

        var history = repo.findBySourceFieldAndTargetField(source, target);
        List<Map<String, Object>> learned = history.stream()
                .filter(entry -> entry.getLogic() != null)
                .sorted(Comparator.comparingDouble(AiLearningEntity::getConfidence).reversed())
                .map(entry -> {
                    String logic = entry.getLogic();
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("label", logic.length() > 40 ? logic.substring(0, 37) + "…" : logic);
                    map.put("code", logic);
                    map.put("confidence", entry.getConfidence());
                    return map;
                })
                .collect(Collectors.toList());

        for (Map<String, Object> entry : learned) {
            String code = (String) entry.get("code");
            if (list.stream().noneMatch(m -> code.equals(m.get("code")))) {
                list.add(entry);
            }
        }

        if (list.isEmpty()) {
            list = defaultSuggestions(source, target, sourceTitle, targetTitle);
        }
        return list;
    }

    /** BA-style business logic text: natural language a BA would write (e.g. "Map ISA06 to FirstName in target"). */
    private static List<Map<String, Object>> defaultSuggestions(String sourceKey, String targetKey,
                                                                  String sourceTitle, String targetTitle) {
        String src = (sourceTitle != null && !sourceTitle.isBlank()) ? sourceTitle : sourceKey;
        String tgt = (targetTitle != null && !targetTitle.isBlank()) ? targetTitle : targetKey;
        List<Map<String, Object>> out = new ArrayList<>();
        out.add(entry("Map source to target", "Map " + src + " to " + tgt + " in target."));
        out.add(entry("Copy as-is", "Copy " + src + " to " + tgt + "; use as-is."));
        out.add(entry("Copy with trim and uppercase", "Map " + src + " to " + tgt + "; trim and uppercase."));
        out.add(entry("Copy null-safe", "Copy " + src + " to " + tgt + "; use empty string if missing."));
        return out;
    }

    private static Map<String, Object> entry(String label, String code) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("code", code);
        return m;
    }

}
