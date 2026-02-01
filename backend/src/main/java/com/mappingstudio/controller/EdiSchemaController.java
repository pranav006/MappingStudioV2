package com.mappingstudio.controller;

import com.mappingstudio.edi.EdiSchemaRegistry;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/edi")
public class EdiSchemaController {

    private final EdiSchemaRegistry registry;

    // Manual constructor (removes Lombok dependency)
    public EdiSchemaController(EdiSchemaRegistry registry) {
        this.registry = registry;
    }

    @GetMapping("/schemas")
    public List<String> list() {
        return registry.listSchemas();
    }

    @GetMapping("/schema/{name}")
    public Map<String, Object> load(@PathVariable String name) throws Exception {
        return registry.loadSchema(name);
    }
}
