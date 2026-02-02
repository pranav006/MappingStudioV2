package com.mappingstudio.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "projects")
public class ProjectEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String sourceSchema;
    private String targetSchema;
    private String status;
    private String updated;

    /** Computed when listing projects: % of target schema elements that have at least one mapping. Not persisted. */
    @Transient
    private Integer coverage;

    public ProjectEntity() {}

    public ProjectEntity(String name, String sourceSchema, String targetSchema) {
        this.name = name;
        this.sourceSchema = sourceSchema;
        this.targetSchema = targetSchema;
        this.status = "Active";
        this.updated = "Just now";
    }
}
