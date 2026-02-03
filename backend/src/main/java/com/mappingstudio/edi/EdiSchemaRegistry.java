package com.mappingstudio.edi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.mappingstudio.model.CustomSchemaEntity;
import com.mappingstudio.repository.CustomSchemaRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;

@Service
public class EdiSchemaRegistry {

    private static final String SCHEMA_BASE = "schemas/edi/";
    /** UI schema name -> EDI file key (no .json). JSON Schema has no file; leaf count is hardcoded. */
    private static final Map<String, String> UI_TO_KEY = Map.of(
        "EDI 834 v5010", "834_5010",
        "EDI 837P", "837P_5010"
    );
    private static final int JSON_SCHEMA_LEAF_COUNT = 4;

    private final ObjectMapper mapper = new ObjectMapper();
    private final CustomSchemaRepository customSchemaRepository;

    public EdiSchemaRegistry(CustomSchemaRepository customSchemaRepository) {
        this.customSchemaRepository = customSchemaRepository;
    }

    /** List available EDI schema file names (e.g. 834_5010.json, 837P_5010.json). */
    public List<String> listSchemas() {
        return List.of("834_5010.json", "837P_5010.json");
    }

    /**
     * Load schema by file name. Returns map with "tree" (array of nodes for UI),
     * "transaction", "version", "name", "description".
     */
    public Map<String, Object> loadSchema(String name) throws Exception {
        String path = SCHEMA_BASE + (name.endsWith(".json") ? name : name + ".json");
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return mapper.readValue(in, new TypeReference<Map<String, Object>>() {});
        }
    }

    /**
     * Return the number of mappable (leaf) elements in the target schema.
     * Used to compute coverage % = (mapped distinct targets / this count) * 100.
     */
    public int getTargetSchemaLeafCount(String targetSchemaName) {
        if (targetSchemaName == null) return 1;
        if ("JSON Schema".equals(targetSchemaName)) return JSON_SCHEMA_LEAF_COUNT;
        String key = UI_TO_KEY.get(targetSchemaName);
        if (key == null) {
            var custom = customSchemaRepository.findByName(targetSchemaName);
            if (custom.isPresent()) {
                try {
                    List<Map<String, Object>> tree = mapper.readValue(custom.get().getTreeJson(), new TypeReference<>() {});
                    return tree == null ? 1 : countLeavesInTree(tree);
                } catch (Exception e) {
                    return 1;
                }
            }
            return 1;
        }
        try {
            Map<String, Object> schema = loadSchema(key);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tree = (List<Map<String, Object>>) schema.get("tree");
            if (tree == null) return 1;
            return countLeavesInTree(tree);
        } catch (Exception e) {
            return 1;
        }
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
