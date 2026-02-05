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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * LLM-assisted business logic suggestions (OpenAI-compatible API).
 * Suggests natural-language mapping descriptions a BA would write (e.g. "Map ISA06 to FirstName in target").
 * Optional: set app.llm.api-key to enable; when unset, no external calls are made (HIPAA-friendly default).
 * If used with PHI, configure only a HIPAA-eligible endpoint (e.g. Azure OpenAI with BAA). See docs/COMPLIANCE.md.
 */
@Service
public class LlmMappingService {

    private static final Logger log = LoggerFactory.getLogger(LlmMappingService.class);
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
                ? sourceTitle + " (" + sourceKey + ")"
                : sourceKey;
        String tgt = targetTitle != null && !targetTitle.isBlank()
                ? targetTitle + " (" + targetKey + ")"
                : targetKey;
        return """
            You are a business analyst writing mapping descriptions. Suggest 2 to 4 short one-line business logic descriptions for mapping a source field to a target field. Write as a BA would: natural language, no code.
            Source field: %s
            Target field: %s
            Examples of the style we want: "Map ISA06 to FirstName in target.", "Copy member SSN from source to target; trim and uppercase.", "Use source date as target effective date; as-is."
            Rules:
            - Each line is one short sentence a BA would write (e.g. "Map X to Y in target.", "Copy X to Y; trim and uppercase.").
            - Mention the source and target by name. May include logic (trim, uppercase, null-safe, format).
            - Return ONLY the description lines, one per line, no numbering or explanation.
            """.formatted(src, tgt);
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
            if (line.isEmpty() || line.length() > 500) continue;
            n++;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("label", "LLM: " + (n == 1 ? "Suggested" : "Variant " + n));
            entry.put("code", line);
            out.add(entry);
            if (n >= 4) break;
        }
        return out;
    }
}
