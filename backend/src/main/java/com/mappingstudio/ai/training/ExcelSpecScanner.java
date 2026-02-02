package com.mappingstudio.ai.training;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Arrays;

/**
 * Isolated scanner for Excel uploads. Validates file size and magic bytes
 * before any parsing. No other app code should process uploaded files
 * without going through this and SafeExcelSpecParser.
 */
@Component
public class ExcelSpecScanner {

    /** XLSX is ZIP: local file header. */
    private static final byte[] ZIP_MAGIC = { 0x50, 0x4B }; // PK

    private final TrainingConfig config;

    public ExcelSpecScanner(TrainingConfig config) {
        this.config = config;
    }

    /**
     * Validate that the file is within size limit and has XLSX (ZIP) magic bytes.
     * Call this before passing the stream to any parser.
     *
     * @param file the uploaded file (do not pass raw file content to other classes)
     * @throws SecurityException if file is too large or not a valid ZIP/XLSX header
     */
    public void validateForTraining(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new SecurityException("No file provided");
        }

        long size = file.getSize();
        if (size < 0 || size > config.getMaxFileSizeBytes()) {
            throw new SecurityException("File size exceeds allowed limit for training import");
        }

        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase().endsWith(".xlsx")) {
            throw new SecurityException("Only .xlsx files are accepted for training import");
        }

        byte[] header = new byte[ZIP_MAGIC.length];
        try (InputStream in = file.getInputStream()) {
            int n = in.read(header);
            if (n != ZIP_MAGIC.length || !Arrays.equals(header, ZIP_MAGIC)) {
                throw new SecurityException("File does not appear to be a valid XLSX (ZIP) file");
            }
        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            throw new SecurityException("Could not validate training file: " + e.getMessage());
        }
    }

    /**
     * Wrap the file input stream so that at most maxFileSizeBytes are read.
     * Use this when passing the stream to the parser so zip bombs cannot
     * expand beyond the limit.
     */
    public InputStream boundedStream(MultipartFile file) throws Exception {
        return new BoundedInputStream(file.getInputStream(), config.getMaxFileSizeBytes());
    }
}
