package com.openlineage.server.api;

import com.openlineage.server.api.models.LineageExportModels.LineageExportResult;
import com.openlineage.server.service.LineageExportService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2/lineage-export")
public class LineageExportController {

    private final LineageExportService lineageExportService;

    public LineageExportController(LineageExportService lineageExportService) {
        this.lineageExportService = lineageExportService;
    }

    @GetMapping("/recent/{days}")
    public LineageExportResult exportRecentLineage(
            @PathVariable int days,
            @RequestParam(required = false) List<String> namespaces) {
        return lineageExportService.exportLineage(days, namespaces);
    }
}
