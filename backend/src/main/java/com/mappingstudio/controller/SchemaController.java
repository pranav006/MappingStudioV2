package com.mappingstudio.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mappingstudio.model.CustomSchemaEntity;
import com.mappingstudio.schema.SchemaService;
import com.mappingstudio.schema.SchemaUploadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Unified schema API: list (EDI + custom), load by id, upload (non-EDI).
 */
@RestController
@RequestMapping("/api/schemas")
public class SchemaController {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Logger log = LoggerFactory.getLogger(SchemaController.class);

    private final SchemaService schemaService;
    private final SchemaUploadService uploadService;

    public SchemaController(SchemaService schemaService, SchemaUploadService uploadService) {
        this.schemaService = schemaService;
        this.uploadService = uploadService;
    }

    /** List all schemas: EDI + uploaded custom. Each: { id, name, kind }. */
    @GetMapping
    public List<Map<String, String>> list() {
        return schemaService.listAll();
    }

    /** Load schema by id (EDI key e.g. 834_5010, or custom-{id}). Returns { tree, name, ... }. */
    @GetMapping("/{id}")
    public Map<String, Object> load(@PathVariable String id) throws Exception {
        return schemaService.loadById(id);
    }

    /**
     * Upload a non-EDI schema. Types: json_sample, xsd, csv_sample, excel_spec.
     * Returns { id, name, tree } so frontend can add to list and use tree immediately.
     */
    @PostMapping("/upload")
    public Map<String, Object> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type,
            @RequestParam(value = "name", required = false) String name) throws Exception {
        CustomSchemaEntity entity = uploadService.upload(file, type, name);
        List<Map<String, Object>> tree = MAPPER.readValue(entity.getTreeJson(), new TypeReference<>() {});
        return Map.of(
            "id", "custom-" + entity.getId(),
            "name", entity.getName(),
            "tree", tree
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("error", "Invalid request", "message", e.getMessage() != null ? e.getMessage() : "Bad request"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUploadError(Exception e) {
        log.warn("Schema upload failed", e);
        String msg = e.getMessage() != null ? e.getMessage() : "Schema upload failed";
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "Schema upload failed", "message", msg));
    }
}
