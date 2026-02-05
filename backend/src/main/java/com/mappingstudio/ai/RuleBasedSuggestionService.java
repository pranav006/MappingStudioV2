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

    /** BA-style business logic: natural language a BA would write (e.g. "Map ISA06 to FirstName in target"). */
    public List<Map<String, Object>> suggest(String sourceKey, String targetKey,
                                               String sourceTitle, String targetTitle) {
        String srcNorm = normalizeForAnalysis(sourceKey, sourceTitle);
        String tgtNorm = normalizeForAnalysis(targetKey, targetTitle);
        List<String> srcTokens = tokenize(srcNorm);
        List<String> tgtTokens = tokenize(tgtNorm);

        String src = (sourceTitle != null && !sourceTitle.isBlank()) ? sourceTitle : sourceKey;
        String tgt = (targetTitle != null && !targetTitle.isBlank()) ? targetTitle : targetKey;

        List<Map<String, Object>> out = new ArrayList<>();
        out.add(entry("Map source to target", "Map " + src + " to " + tgt + " in target."));
        out.add(entry("Copy as-is", "Copy " + src + " to " + tgt + "; use as-is."));

        boolean srcId = matchesHint(srcTokens, ID_LIKE) || matchesHint(srcTokens, CODE_LIKE);
        boolean tgtId = matchesHint(tgtTokens, ID_LIKE) || matchesHint(tgtTokens, CODE_LIKE);
        boolean srcName = matchesHint(srcTokens, NAME_LIKE);
        boolean tgtName = matchesHint(tgtTokens, NAME_LIKE);
        boolean srcDate = matchesHint(srcTokens, DATE_LIKE);
        boolean tgtDate = matchesHint(tgtTokens, DATE_LIKE);
        boolean srcAmount = matchesHint(srcTokens, AMOUNT_LIKE);
        boolean tgtAmount = matchesHint(tgtTokens, AMOUNT_LIKE);

        if (srcId && tgtId) {
            out.add(entry("ID/Code: trim and uppercase", "Map " + src + " to " + tgt + "; trim and uppercase."));
            out.add(entry("ID/Code: null-safe", "Copy " + src + " to " + tgt + "; use empty string if missing."));
        } else if (srcName && tgtName) {
            out.add(entry("Name: trim", "Map " + src + " to " + tgt + "; trim whitespace."));
            out.add(entry("Name: title case", "Map " + src + " to " + tgt + "; trim and apply title case."));
        } else if (srcDate && tgtDate) {
            out.add(entry("Date: as-is", "Copy " + src + " to " + tgt + "; use as-is."));
            out.add(entry("Date: null-safe", "Copy " + src + " to " + tgt + "; use empty if missing."));
        } else if (srcAmount && tgtAmount) {
            out.add(entry("Amount: as-is", "Copy " + src + " to " + tgt + "; use as-is."));
            out.add(entry("Amount: as number", "Map " + src + " to " + tgt + "; convert to number; use 0 if missing."));
        } else {
            out.add(entry("Standard: trim and uppercase", "Map " + src + " to " + tgt + "; trim and uppercase."));
            out.add(entry("Null-safe", "Copy " + src + " to " + tgt + "; use empty string if missing."));
        }

        return dedupeByCode(out, 6);
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
