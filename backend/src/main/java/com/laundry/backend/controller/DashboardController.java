package com.laundry.backend.controller;

import com.laundry.backend.dto.DashboardStats;
import com.laundry.backend.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<DashboardStats> getStats(
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer year,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer month) {
        return ResponseEntity.ok(dashboardService.getStats(year, month));
    }
}
