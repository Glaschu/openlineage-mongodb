package com.openlineage.server.api;

import com.openlineage.server.domain.RunEvent;
import com.openlineage.server.service.LineageService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/lineage")
public class RunEventController {

    private final LineageService lineageService;

    public RunEventController(LineageService lineageService) {
        this.lineageService = lineageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void postEvent(@RequestBody RunEvent event) {
        lineageService.ingestEvent(event);
    }
}
