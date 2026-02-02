package com.mappingstudio.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * LLM-assisted mapping logic suggestions (OpenAI-compatible API).
 * Optional: set app.llm.api-key to enable; when unset, no external calls are made (HIPAA-friendly default).
 * If used with PHI, configure only a HIPAA-eligible endpoint (e.g. Azure OpenAI with BAA). See docs/COMPLIANCE.md.
 */
@Service
public class LlmMappingService {

    private static final Logger log = LoggerFactory.getLogger(LlmMappingService.class);
    private static final Pattern CODE_LINE = Pattern.compile("^\\s*target\\.\\S+\\s*=.*;\\s*$");

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.llm.api-key:}")
    private String apiKey;

    @Value("${app.llm.api-url:https://api.openai.com/v1/chat/completions}")
    private String apiUrl;

    @Value("${app.llm.model:gpt-3.5-turbo}")
    private String model;

    /** Enabled when api-key is set (e.g. OpenAI) or api-url is set to a non-OpenAI endpoint (e.g. own/local LLM). */
    public boolean isEnabled() {
        boolean hasKey = apiKey != null && !apiKey.isBlank();
        boolean hasOwnEndpoint = apiUrl != null && !apiUrl.isBlank()
                && !apiUrl.startsWith("https://api.openai.com/");
        return hasKey || hasOwnEndpoint;
    }

    /**
     * Ask LLM for mapping logic suggestions. Returns empty list if disabled or on error.
     */
    public List<Map<String, Object>> suggest(String sourceKey, String targetKey,
                                              String sourceTitle, String targetTitle) {
        if (!isEnabled()) return List.of();

        String prompt = buildPrompt(sourceKey, targetKey, sourceTitle, targetTitle);
        try {
            String content = callLlm(prompt);
            return parseSuggestions(content, sourceKey, targetKey);
        } catch (Exception e) {
            log.warn("LLM suggestion failed, falling back to defaults: {}", e.getMessage());
            return List.of();
        }
    }

    private String buildPrompt(String sourceKey, String targetKey, String sourceTitle, String targetTitle) {
        String src = sourceTitle != null && !sourceTitle.isBlank()
                ? sourceKey + " (\"" + sourceTitle + "\")"
                : sourceKey;
        String tgt = targetTitle != null && !targetTitle.isBlank()
                ? targetKey + " (\"" + targetTitle + "\")"
                : targetKey;
        return """
            You are a data mapping expert. Suggest 2 to 4 one-line JavaScript expressions to map a source field to a target field.
            Source field: %s
            Target field: %s
            Rules:
            - Use format: target.%s = <expression>; (use the exact key "%s" for target, "%s" for source).
            - Each line must be valid JavaScript. Examples: target.X = source.Y; or target.X = source.Y?.trim().toUpperCase();
            - Include: direct copy, trim/uppercase, and optional null-safe or format variants.
            - Return ONLY the code lines, one per line, no numbering or explanation.
            """.formatted(src, tgt, targetKey, targetKey, sourceKey);
    }

    private String callLlm(String prompt) throws Exception {
        ObjectNode body = objectMapper.createObjectNode()
                .put("model", model)
                .set("messages", objectMapper.createArrayNode()
                        .addObject()
                        .put("role", "user")
                        .put("content", prompt));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (apiKey != null && !apiKey.isBlank()) {
            headers.setBearerAuth(apiKey.trim());
        }

        ResponseEntity<String> response = restTemplate.exchange(
                apiUrl,
                HttpMethod.POST,
                new HttpEntity<>(body.toString(), headers),
                String.class
        );

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            throw new RuntimeException("LLM API returned " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode choices = root.path("choices");
        if (choices.isEmpty()) throw new RuntimeException("No choices in LLM response");
        return choices.get(0).path("message").path("content").asText();
    }

    private List<Map<String, Object>> parseSuggestions(String content, String sourceKey, String targetKey) {
        List<Map<String, Object>> out = new ArrayList<>();
        String[] lines = content.split("\n");
        int n = 0;
        for (String line : lines) {
            line = line.replaceAll("^\\d+[.)]\\s*", "").trim();
            if (line.isEmpty()) continue;
            if (!CODE_LINE.matcher(line).matches()) continue;
            n++;
            Map<String, Object> entry = new HashMap<>();
            entry.put("label", "LLM: " + (n == 1 ? "Suggested" : "Variant " + n));
            entry.put("code", line);
            out.add(entry);
            if (n >= 4) break;
        }
        return out;
    }
}
