package com.mappingstudio.ai.training;

import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Isolated Excel parser for training import only. Enforces strict limits
 * (rows, columns, cell length); does not evaluate formulas. All POI usage
 * for training lives in this class so vulnerabilities are contained.
 */
@Component
public class SafeExcelSpecParser {

    private static final String COL_SOURCE = "Source Field";
    private static final String COL_LOGIC = "Business Logic";
    private static final String COL_LOGIC_ALT = "Mapping Logic";
    private static final String COL_TARGET = "Target Field";

    private final TrainingConfig config;

    public SafeExcelSpecParser(TrainingConfig config) {
        this.config = config;
    }

    /**
     * Parse Excel from a stream that is already size-bounded (e.g. BoundedInputStream).
     * Returns only sanitized rows (trimmed and truncated to config limits).
     *
     * @param inputStream size-bounded stream (caller must use BoundedInputStream)
     * @return list of (source, target, logic) safe to pass to AiTrainerService
     */
    public List<SanitizedRow> parse(InputStream inputStream) throws Exception {
        double prevRatio = ZipSecureFile.getMinInflateRatio();
        try {
            ZipSecureFile.setMinInflateRatio(0.02); // stricter zip-bomb detection for training only
            return parseInternal(inputStream);
        } finally {
            ZipSecureFile.setMinInflateRatio(prevRatio);
        }
    }

    private List<SanitizedRow> parseInternal(InputStream inputStream) throws Exception {
        List<SanitizedRow> out = new ArrayList<>();
        int maxRows = config.getMaxRows();
        int maxCols = config.getMaxColumns();
        int maxSource = config.getMaxSourceLength();
        int maxTarget = config.getMaxTargetLength();
        int maxLogic = config.getMaxLogicLength();

        try (Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) return out;

            Row header = sheet.getRow(0);
            if (header == null) return out;

            int srcIdx = findColumnIndex(header, COL_SOURCE, maxCols);
            int logIdx = findColumnIndex(header, COL_LOGIC, maxCols);
            if (logIdx < 0) logIdx = findColumnIndex(header, COL_LOGIC_ALT, maxCols);
            int tgtIdx = findColumnIndex(header, COL_TARGET, maxCols);
            if (srcIdx < 0 || logIdx < 0 || tgtIdx < 0) {
                throw new IllegalArgumentException(
                    "Excel must have columns: \"" + COL_SOURCE + "\", \"" + COL_LOGIC + "\" (or \"" + COL_LOGIC_ALT + "\"), \"" + COL_TARGET + "\"");
            }

            int lastRow = Math.min(sheet.getLastRowNum(), maxRows);
            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String source = truncate(getCellString(row.getCell(srcIdx)), maxSource);
                String logic = truncate(getCellString(row.getCell(logIdx)), maxLogic);
                String target = truncate(getCellString(row.getCell(tgtIdx)), maxTarget);

                if (source.isEmpty() && logic.isEmpty() && target.isEmpty()) continue;
                if (source.isEmpty() || target.isEmpty()) continue;

                out.add(new SanitizedRow(source, target, logic));
            }
        }
        return out;
    }

    private static int findColumnIndex(Row header, String title, int maxCols) {
        int last = Math.min(header.getLastCellNum(), maxCols);
        for (int i = 0; i < last; i++) {
            Cell c = header.getCell(i);
            if (c != null && title.equalsIgnoreCase(getCellString(c).trim())) return i;
        }
        return -1;
    }

    /** Read cell value only; do not evaluate formulas. Formula cells return cached value or empty. */
    private static String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                // Do not evaluate formula; use cached value only to avoid injection
                try {
                    yield String.valueOf((long) cell.getNumericCellValue());
                } catch (Exception e) {
                    yield ""; // reject formula if we cannot get a safe cached value
                }
            }
            default -> "";
        };
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return "";
        s = s.trim();
        if (s.length() <= maxLen) return s;
        return s.substring(0, maxLen);
    }
}
