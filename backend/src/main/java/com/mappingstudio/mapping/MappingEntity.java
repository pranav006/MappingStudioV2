package com.mappingstudio.mapping;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(
        name = "mappings",
        indexes = {
            @Index(name = "idx_project", columnList = "projectName"),
            @Index(name = "idx_project_id", columnList = "projectId")
        }
)
public class MappingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long projectId;
    private String projectName;
    private String source;
    private String target;

    @Column(length = 5000)
    private String logic;

    @Column(length = 2000)
    private String comments;

    public MappingEntity() {}

    public MappingEntity(
            String projectName,
            String source,
            String target,
            String logic,
            String comments
    ) {
        this.projectName = projectName;
        this.source = source;
        this.target = target;
        this.logic = logic;
        this.comments = comments;
    }
}
