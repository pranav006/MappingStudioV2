package com.mappingstudio.ai.training;

import com.mappingstudio.ai.AiTrainerService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Isolated facade for training import. This is the only entry point that
 * accepts uploaded Excel; no other app code should process file content.
 * Flow: validate (size + magic) → parse with strict limits → persist via
 * AiTrainerService.learnAccepted only (no raw file or POI outside this package).
 */
@Service
public class TrainingImportService {

    private final ExcelSpecScanner scanner;
    private final SafeExcelSpecParser parser;
    private final AiTrainerService trainer;

    public TrainingImportService(ExcelSpecScanner scanner,
                                 SafeExcelSpecParser parser,
                                 AiTrainerService trainer) {
        this.scanner = scanner;
        this.parser = parser;
        this.trainer = trainer;
    }

    /**
     * Import mapping spec from Excel after scanning for vulnerabilities.
     * File is validated (size, magic bytes) and parsed with strict limits;
     * only sanitized (source, target, logic) strings are passed to the trainer.
     *
     * @param file uploaded .xlsx (must pass ExcelSpecScanner first)
     * @return number of rows learned
     */
    public int importSpec(MultipartFile file) throws Exception {
        scanner.validateForTraining(file);

        try (var bounded = scanner.boundedStream(file)) {
            var rows = parser.parse(bounded);
            for (SanitizedRow row : rows) {
                trainer.learnAccepted(row.source(), row.target(), row.logic());
            }
            return rows.size();
        }
    }
}
