package com.mappingstudio.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AiLearningRepository extends JpaRepository<AiLearningEntity, Long> {

    Optional<AiLearningEntity> findBySourceFieldAndTargetFieldAndLogic(
            String sourceField, String targetField, String logic
    );

    List<AiLearningEntity> findBySourceFieldAndTargetField(
            String sourceField, String targetField
    );
}
