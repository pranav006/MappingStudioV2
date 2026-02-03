package com.mappingstudio.schema;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mappingstudio.model.CustomSchemaEntity;
import com.mappingstudio.repository.CustomSchemaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Map;

/**
 * Upload and parse non-EDI schemas (JSON sample, XSD, CSV sample, Excel spec)
 * and persist as custom schema with generated tree for the mapping UI.
 */
@Service
public class SchemaUploadService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final long DEFAULT_MAX_SCHEMA_BYTES = 2 * 1024 * 1024; // 2 MB

    private final CustomSchemaRepository repo;
    private final long maxSchemaBytes;

    public SchemaUploadService(CustomSchemaRepository repo,
                               @Value("${app.schema.max-file-size-bytes:" + DEFAULT_MAX_SCHEMA_BYTES + "}") long maxSchemaBytes) {
        this.repo = repo;
        this.maxSchemaBytes = maxSchemaBytes > 0 ? maxSchemaBytes : DEFAULT_MAX_SCHEMA_BYTES;
    }

    /**
     * Upload a schema file, parse by type, build tree, and save.
     * @param file uploaded file
     * @param type json_sample, xsd, csv_sample, excel_spec
     * @param displayName optional name (default from filename)
     * @return saved entity with id, name, treeJson
     */
    public CustomSchemaEntity upload(MultipartFile file, String type, String displayName) throws Exception {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("No file provided");
        long size = file.getSize();
        if (size < 0 || size > maxSchemaBytes)
            throw new IllegalArgumentException("Schema file size exceeds allowed limit");
        String name = displayName != null && !displayName.isBlank()
            ? displayName.trim()
            : file.getOriginalFilename() != null ? file.getOriginalFilename().replaceAll("\\.[^.]+$", "") : "Custom Schema";
        if (name.length() > 200) name = name.substring(0, 200);

        // Read file bytes once so parsers get exact upload content (avoids stream encoding/consumption issues)
        byte[] bytes = file.getBytes();
        if (bytes == null || bytes.length == 0)
            throw new IllegalArgumentException("File content is empty");
        List<Map<String, Object>> tree;
        String typeNorm = type != null ? type.toLowerCase().trim() : "";
        try {
            switch (typeNorm) {
                case "json_sample" -> tree = SchemaTreeBuilders.fromJsonSample(new ByteArrayInputStream(bytes));
                case "xsd" -> tree = SchemaTreeBuilders.fromXsd(new ByteArrayInputStream(bytes));
                case "csv_sample" -> tree = SchemaTreeBuilders.fromCsvSample(new ByteArrayInputStream(bytes));
                case "excel_spec" -> tree = SchemaTreeBuilders.fromExcelSpec(new ByteArrayInputStream(bytes));
                default -> throw new IllegalArgumentException("Unsupported schema type: " + type);
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            throw new IllegalArgumentException("Failed to parse schema file: " + msg, e);
        }

        String treeJson = MAPPER.writeValueAsString(tree);
        CustomSchemaEntity entity = new CustomSchemaEntity();
        entity.setName(name);
        entity.setType(typeNorm.isEmpty() ? "json_sample" : typeNorm);
        entity.setTreeJson(treeJson);
        return repo.save(entity);
    }
}
