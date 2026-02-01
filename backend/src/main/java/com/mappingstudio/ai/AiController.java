package com.mappingstudio.ai;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiTrainerService trainer;
    private final AiSuggestionEngine engine;

    public AiController(AiTrainerService trainer, AiSuggestionEngine engine) {
        this.trainer = trainer;
        this.engine = engine;
    }

    @PostMapping("/learn/accepted")
    public void accepted(@RequestParam String source,
                         @RequestParam String target,
                         @RequestParam String logic) {
        trainer.learnAccepted(source, target, logic);
    }

    @PostMapping("/learn/rejected")
    public void rejected(@RequestParam String source,
                         @RequestParam String target,
                         @RequestParam String logic) {
        trainer.learnRejected(source, target, logic);
    }

    @PostMapping("/learn/edited")
    public void edited(@RequestParam String source,
                       @RequestParam String target,
                       @RequestParam String logic) {
        trainer.learnEdited(source, target, logic);
    }

    @PostMapping("/suggest")
    public List<Map<String, Object>> suggest(@RequestParam String source,
                                             @RequestParam String target) {
        return engine.suggest(source, target);
    }
}
