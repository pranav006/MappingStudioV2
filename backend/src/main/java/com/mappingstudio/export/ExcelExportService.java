package com.mappingstudio.export;

import com.mappingstudio.mapping.MappingEntity;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class ExcelExportService {

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    /** True only if string has visible content (strip all whitespace and control/invisible chars). */
    private static boolean hasVisibleContent(String s) {
        if (s == null) return false;
        String t = s.replaceAll("[\\s\\p{C}]", ""); // strip whitespace + control (incl. zero-width)
        return !t.isEmpty();
    }

    /** Only include row if at least one of source/logic/target has visible content. */
    private static boolean shouldInclude(MappingEntity m) {
        return hasVisibleContent(m.getSource()) || hasVisibleContent(m.getLogic()) || hasVisibleContent(m.getTarget());
    }

    private static String key(MappingEntity m) {
        return trim(m.getSource()) + "|" + trim(m.getLogic()) + "|" + trim(m.getTarget());
    }

    public byte[] generateExcel(List<MappingEntity> mappings) throws Exception {

        Set<String> seen = new LinkedHashSet<>();
        List<MappingEntity> rowsToWrite = new ArrayList<>();
        for (MappingEntity m : mappings) {
            if (!shouldInclude(m)) continue;
            if (!seen.add(key(m))) continue;
            rowsToWrite.add(m);
        }

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Mappings");

        // Header
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("Source Field");
        header.createCell(1).setCellValue("Mapping Logic");
        header.createCell(2).setCellValue("Target Field");
        header.createCell(3).setCellValue("Comments");
        header.createCell(4).setCellValue("Review later");

        int rowIdx = 1;
        for (MappingEntity m : rowsToWrite) {
            String src = trim(m.getSource());
            String log = trim(m.getLogic());
            String tgt = trim(m.getTarget());
            if (!hasVisibleContent(m.getSource()) && !hasVisibleContent(m.getLogic()) && !hasVisibleContent(m.getTarget())) continue;
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(src);
            row.createCell(1).setCellValue(log);
            row.createCell(2).setCellValue(tgt);
            row.createCell(3).setCellValue(m.getComments() != null ? m.getComments().trim() : "");
            row.createCell(4).setCellValue(Boolean.TRUE.equals(m.getReviewLater()) ? "Y" : "");
        }

        int lastRowIndex = rowIdx - 1;

        // Remove any extra rows beyond our data (POI/Excel sometimes create blank rows)
        while (sheet.getLastRowNum() > lastRowIndex) {
            int end = sheet.getLastRowNum();
            if (lastRowIndex + 2 > end) break; // need at least 2 rows to shift
            sheet.shiftRows(lastRowIndex + 2, end, -1);
        }

        for (int i = 0; i < 5; i++) {
            sheet.autoSizeColumn(i);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return out.toByteArray();
    }
}
