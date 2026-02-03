package com.mappingstudio.schema;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mappingstudio.edi.EdiSchemaRegistry;
import com.mappingstudio.model.CustomSchemaEntity;
import com.mappingstudio.repository.CustomSchemaRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Unified schema list and load: EDI (from classpath) + custom (uploaded).
 * IDs: EDI use key (834_5010, 837P_5010); custom use "custom-{id}".
 */
@Service
public class SchemaService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Map<String, String> EDI_KEY_TO_NAME = Map.of(
        "834_5010", "EDI 834 v5010",
        "837P_5010", "EDI 837P"
    );

    private final EdiSchemaRegistry ediRegistry;
    private final CustomSchemaRepository customRepo;

    public SchemaService(EdiSchemaRegistry ediRegistry, CustomSchemaRepository customRepo) {
        this.ediRegistry = ediRegistry;
        this.customRepo = customRepo;
    }

    /** List all schemas: EDI + custom. Each item: { id, name, kind }. */
    public List<Map<String, String>> listAll() {
        List<Map<String, String>> out = new ArrayList<>();
        for (String key : List.of("834_5010", "837P_5010")) {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("id", key);
            m.put("name", EDI_KEY_TO_NAME.get(key));
            m.put("kind", "edi");
            out.add(m);
        }
        for (CustomSchemaEntity e : customRepo.findAllByOrderByCreatedAtDesc()) {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("id", "custom-" + e.getId());
            m.put("name", e.getName());
            m.put("kind", "custom");
            out.add(m);
        }
        return out;
    }

    /**
     * Load schema by id (EDI key or "custom-{id}").
     * Returns map with "tree", "name", and optionally "description", "type".
     */
    public Map<String, Object> loadById(String id) throws Exception {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Schema id required");
        if (id.startsWith("custom-")) {
            long pk = Long.parseLong(id.substring(7));
            CustomSchemaEntity e = customRepo.findById(pk).orElseThrow(() -> new IllegalArgumentException("Schema not found: " + id));
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("name", e.getName());
            map.put("type", e.getType());
            List<Map<String, Object>> tree = MAPPER.readValue(e.getTreeJson(), new TypeReference<>() {});
            map.put("tree", tree);
            return map;
        }
        return ediRegistry.loadSchema(id);
    }

    /**
     * Return leaf count for coverage %. displayName is the schema name stored on project (EDI name or custom name).
     */
    public int getTargetSchemaLeafCount(String displayName) {
        if (displayName == null) return 1;
        if (EDI_KEY_TO_NAME.containsValue(displayName)) {
            String key = null;
            for (Map.Entry<String, String> e : EDI_KEY_TO_NAME.entrySet()) {
                if (e.getValue().equals(displayName)) { key = e.getKey(); break; }
            }
            if (key != null) return ediRegistry.getTargetSchemaLeafCount(displayName);
        }
        Optional<CustomSchemaEntity> custom = customRepo.findByName(displayName);
        if (custom.isPresent()) {
            try {
                List<Map<String, Object>> tree = MAPPER.readValue(custom.get().getTreeJson(), new TypeReference<>() {});
                return countLeavesInTree(tree);
            } catch (Exception e) {
                return 1;
            }
        }
        return ediRegistry.getTargetSchemaLeafCount(displayName);
    }

    @SuppressWarnings("unchecked")
    private int countLeavesInTree(List<Map<String, Object>> nodes) {
        int count = 0;
        for (Map<String, Object> node : nodes) {
            if (Boolean.TRUE.equals(node.get("isLeaf"))) count++;
            Object children = node.get("children");
            if (children instanceof List) count += countLeavesInTree((List<Map<String, Object>>) children);
        }
        return count;
    }
}
