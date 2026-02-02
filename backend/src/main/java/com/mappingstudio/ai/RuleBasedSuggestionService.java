package com.mappingstudio.ai;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Analyzes source and target field names/keys and suggests mapping logic without an LLM.
 * Uses keyword hints (ID, name, date, code, amount) and name similarity to pick appropriate transforms.
 */
@Service
public class RuleBasedSuggestionService {

    private static final Set<String> ID_LIKE = Set.of("id", "key", "ssn", "npi", "identifier", "number", "num", "code");
    private static final Set<String> NAME_LIKE = Set.of("name", "first", "last", "given", "surname", "nm1", "nm103", "nm104", "nm109");
    private static final Set<String> DATE_LIKE = Set.of("date", "dob", "birth", "dt", "effective", "expiry");
    private static final Set<String> CODE_LIKE = Set.of("code", "type", "status", "cd", "qualifier");
    private static final Set<String> AMOUNT_LIKE = Set.of("amount", "amt", "quantity", "qty", "balance", "price");
    private static final Pattern TOKEN_SPLIT = Pattern.compile("[^a-z0-9]+");

    /**
     * Analyze source and target and return suggested mapping logic (no LLM).
     */
    public List<Map<String, Object>> suggest(String sourceKey, String targetKey,
                                               String sourceTitle, String targetTitle) {
        String srcNorm = normalizeForAnalysis(sourceKey, sourceTitle);
        String tgtNorm = normalizeForAnalysis(targetKey, targetTitle);
        List<String> srcTokens = tokenize(srcNorm);
        List<String> tgtTokens = tokenize(tgtNorm);

        List<Map<String, Object>> out = new ArrayList<>();

        String direct = "target." + targetKey + " = source." + sourceKey + ";";
        String trimUpper = "target." + targetKey + " = source." + sourceKey + "?.trim().toUpperCase();";
        String nullSafe = "target." + targetKey + " = source." + sourceKey + " ?? '';";

        out.add(entry("Direct Mapping", direct));

        boolean srcId = matchesHint(srcTokens, ID_LIKE) || matchesHint(srcTokens, CODE_LIKE);
        boolean tgtId = matchesHint(tgtTokens, ID_LIKE) || matchesHint(tgtTokens, CODE_LIKE);
        boolean srcName = matchesHint(srcTokens, NAME_LIKE);
        boolean tgtName = matchesHint(tgtTokens, NAME_LIKE);
        boolean srcDate = matchesHint(srcTokens, DATE_LIKE);
        boolean tgtDate = matchesHint(tgtTokens, DATE_LIKE);
        boolean srcAmount = matchesHint(srcTokens, AMOUNT_LIKE);
        boolean tgtAmount = matchesHint(tgtTokens, AMOUNT_LIKE);

        if (srcId && tgtId) {
            out.add(entry("ID/Code: Trim + Uppercase", trimUpper));
            out.add(entry("ID/Code: Null-safe", nullSafe));
        } else if (srcName && tgtName) {
            out.add(entry("Name: Trim", "target." + targetKey + " = source." + sourceKey + "?.trim();"));
            out.add(entry("Name: Trim + Title Case", "target." + targetKey + " = (source." + sourceKey + " || '').trim().toLowerCase().replace(/\\b\\w/g, c => c.toUpperCase());"));
        } else if (srcDate && tgtDate) {
            out.add(entry("Date: As-is", direct));
            out.add(entry("Date: Null-safe", nullSafe));
        } else if (srcAmount && tgtAmount) {
            out.add(entry("Amount: As-is", direct));
            out.add(entry("Amount: Null-safe Number", "target." + targetKey + " = Number(source." + sourceKey + ") || 0;"));
        } else {
            out.add(entry("Standard Clean", trimUpper));
            if (!codeEquals(out, nullSafe)) out.add(entry("Null-safe", nullSafe));
        }

        return dedupeByCode(out, 5);
    }

    private static List<Map<String, Object>> dedupeByCode(List<Map<String, Object>> list, int max) {
        List<Map<String, Object>> result = new ArrayList<>();
        List<String> seen = new ArrayList<>();
        for (Map<String, Object> m : list) {
            String code = (String) m.get("code");
            if (code != null && !seen.contains(code)) {
                seen.add(code);
                result.add(m);
                if (result.size() >= max) break;
            }
        }
        return result;
    }

    private static Map<String, Object> entry(String label, String code) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("code", code);
        return m;
    }

    private static boolean codeEquals(List<Map<String, Object>> list, String code) {
        return list.stream().anyMatch(m -> code.equals(m.get("code")));
    }

    private static String normalizeForAnalysis(String key, String title) {
        String k = (key != null ? key : "").toLowerCase().replaceAll("[^a-z0-9]", " ");
        String t = (title != null ? title : "").toLowerCase().replaceAll("[^a-z0-9]", " ");
        return (k + " " + t).trim();
    }

    private static List<String> tokenize(String normalized) {
        List<String> list = new ArrayList<>();
        for (String s : TOKEN_SPLIT.split(normalized)) {
            if (!s.isEmpty()) list.add(s);
        }
        return list;
    }

    private static boolean matchesHint(List<String> tokens, Set<String> hintWords) {
        for (String token : tokens) {
            if (token.length() < 2) continue;
            for (String hint : hintWords) {
                if (token.contains(hint) || hint.contains(token)) return true;
            }
        }
        return false;
    }
}
