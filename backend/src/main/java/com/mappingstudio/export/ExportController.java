package com.mappingstudio.export;

import com.mappingstudio.mapping.MappingEntity;
import com.mappingstudio.model.ProjectEntity;
import com.mappingstudio.repository.MappingRepository;
import com.mappingstudio.repository.ProjectRepository;
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
    private final ProjectRepository projectRepo;
    private final ExcelExportService excelService;

    @GetMapping("/excel/{project}")
    public ResponseEntity<byte[]> exportExcelByName(@PathVariable String project)
            throws Exception {
        List<MappingEntity> mappings = mappingRepo.findByProjectName(project);
        byte[] file = excelService.generateExcel(mappings);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + project + "_mapping.xlsx\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file);
    }

    @GetMapping("/excel/project/{projectId}")
    public ResponseEntity<byte[]> exportExcelByProjectId(@PathVariable Long projectId)
            throws Exception {
        List<MappingEntity> mappings = mappingRepo.findByProjectId(projectId);
        String filename = projectId + "_mapping.xlsx";
        ProjectEntity proj = projectRepo.findById(projectId).orElse(null);
        if (proj != null && proj.getName() != null)
            filename = proj.getName() + "_mapping.xlsx";
        byte[] file = excelService.generateExcel(mappings);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file);
    }
}
