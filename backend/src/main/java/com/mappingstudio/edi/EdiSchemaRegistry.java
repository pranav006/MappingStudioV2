package com.mappingstudio.edi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;

@Service
public class EdiSchemaRegistry {

    private final ObjectMapper mapper = new ObjectMapper();
    private final String schemaPath = "backend/schemas/edi";

    public List<String> listSchemas() {
        File folder = new File(schemaPath);
        String[] files = folder.list((dir, name) -> name.endsWith(".json"));
        return files == null ? List.of() : Arrays.asList(files);
    }

    public Map<String, Object> loadSchema(String name) throws Exception {
        return mapper.readValue(
                new File(schemaPath + "/" + name),
                new TypeReference<Map<String, Object>>() {}
        );
    }
}
