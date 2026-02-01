package com.mappingstudio.export;

import com.mappingstudio.mapping.MappingEntity;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;

@Service
public class ExcelExportService {

    public byte[] generateExcel(List<MappingEntity> mappings) throws Exception {

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Mappings");

        // Header
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("Source Field");
        header.createCell(1).setCellValue("Mapping Logic");
        header.createCell(2).setCellValue("Target Field");
        header.createCell(3).setCellValue("Comments");

        int rowIdx = 1;
        for (MappingEntity m : mappings) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(m.getSource());
            row.createCell(1).setCellValue(m.getLogic());
            row.createCell(2).setCellValue(m.getTarget());
            row.createCell(3).setCellValue(
                    m.getComments() == null ? "" : m.getComments()
            );
        }

        for (int i = 0; i < 4; i++) {
            sheet.autoSizeColumn(i);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();

        return out.toByteArray();
    }
}
