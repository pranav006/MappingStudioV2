package com.mappingstudio.ai;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
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
