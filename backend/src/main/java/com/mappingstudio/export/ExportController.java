package com.mappingstudio.export;

import com.mappingstudio.mapping.MappingEntity;
import com.mappingstudio.repository.MappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final MappingRepository mappingRepo;
    private final ExcelExportService excelService;

    @GetMapping("/excel/{project}")
    public ResponseEntity<byte[]> exportExcel(@PathVariable String project)
            throws Exception {

        List<MappingEntity> mappings =
                mappingRepo.findByProjectName(project);

        byte[] file = excelService.generateExcel(mappings);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + project + "_mapping.xlsx\""
                )
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file);
    }
}
