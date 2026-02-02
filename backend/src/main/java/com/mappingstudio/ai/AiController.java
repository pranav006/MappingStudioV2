package com.mappingstudio.ai;

import com.mappingstudio.ai.training.TrainingImportService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiTrainerService trainer;
    private final AiSuggestionEngine engine;
    private final TrainingImportService trainingImport;

    public AiController(AiTrainerService trainer, AiSuggestionEngine engine, TrainingImportService trainingImport) {
        this.trainer = trainer;
        this.engine = engine;
        this.trainingImport = trainingImport;
    }

    /** Import mapping spec from Excel. File is scanned for size/magic bytes and parsed with strict limits (isolated training). */
    @PostMapping("/import-spec")
    public Map<String, Object> importSpec(@RequestParam("file") MultipartFile file) throws Exception {
        int learned = trainingImport.importSpec(file);
        return Map.of("learned", learned);
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
                                              @RequestParam String target,
                                              @RequestParam(required = false) String sourceTitle,
                                              @RequestParam(required = false) String targetTitle) {
        return engine.suggest(source, target, sourceTitle, targetTitle);
    }

    @ExceptionHandler(SecurityException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, String> handleSecurity(SecurityException e) {
        return Map.of("error", "Training file rejected", "message", e.getMessage());
    }
}
