package com.mappingstudio.ai;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
        name = "ai_learning",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"sourceField", "targetField", "logic"}
        )
)
@Getter
@Setter
public class AiLearningEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sourceField;
    private String targetField;

    @Column(length = 5000)
    private String logic;

    private int acceptedCount;
    private int rejectedCount;
    private int editedCount;
    private int totalSeen;

    private double confidence;

    public AiLearningEntity() {}

    public AiLearningEntity(String sourceField, String targetField, String logic) {
        this.sourceField = sourceField;
        this.targetField = targetField;
        this.logic = logic;
        recomputeConfidence();
    }

    public void recordAccepted() {
        acceptedCount++;
        totalSeen++;
        recomputeConfidence();
    }

    public void recordRejected() {
        rejectedCount++;
        totalSeen++;
        recomputeConfidence();
    }

    public void recordEdited() {
        editedCount++;
        totalSeen++;
        recomputeConfidence();
    }

    private void recomputeConfidence() {
        if (totalSeen == 0) {
            confidence = 0;
            return;
        }

        confidence = (acceptedCount - rejectedCount * 0.7 - editedCount * 0.3)
                / totalSeen;

        confidence = Math.max(0, Math.min(1, confidence));
    }
}
