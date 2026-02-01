package com.mappingstudio.ai;

import org.springframework.stereotype.Service;

@Service
public class AiTrainerService {

    private final AiLearningRepository repo;

    public AiTrainerService(AiLearningRepository repo) {
        this.repo = repo;
    }

    public void learnAccepted(String source, String target, String logic) {
        var record = repo.findBySourceFieldAndTargetFieldAndLogic(source, target, logic)
                .orElse(new AiLearningEntity(source, target, logic));

        record.recordAccepted();
        repo.save(record);
    }

    public void learnRejected(String source, String target, String logic) {
        var record = repo.findBySourceFieldAndTargetFieldAndLogic(source, target, logic)
                .orElse(new AiLearningEntity(source, target, logic));

        record.recordRejected();
        repo.save(record);
    }

    public void learnEdited(String source, String target, String logic) {
        var record = repo.findBySourceFieldAndTargetFieldAndLogic(source, target, logic)
                .orElse(new AiLearningEntity(source, target, logic));

        record.recordEdited();
        repo.save(record);
    }
}
