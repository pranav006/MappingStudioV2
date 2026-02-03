package com.mappingstudio.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Uploaded (non-EDI) schema: JSON sample, XSD, CSV sample, or Excel spec.
 * Stores display name, type, and generated tree JSON for the mapping UI.
 */
@Entity
@Table(name = "custom_schemas")
public class CustomSchemaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    /** json_sample, xsd, csv_sample, excel_spec */
    @Column(nullable = false, length = 32)
    private String type;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String treeJson;

    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTreeJson() { return treeJson; }
    public void setTreeJson(String treeJson) { this.treeJson = treeJson; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
