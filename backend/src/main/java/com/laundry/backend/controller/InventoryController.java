package com.laundry.backend.controller;

import com.laundry.backend.dto.SoapProductRequest;
import com.laundry.backend.entity.SoapInventoryHistory;
import com.laundry.backend.entity.SoapProduct;
import com.laundry.backend.entity.User;
import com.laundry.backend.repository.UserRepository;
import com.laundry.backend.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current authenticated user not found"));
    }

    // Shared: accessible by both ADMIN and USER (Employee needs it to fill dropdowns)
    @GetMapping
    public ResponseEntity<List<SoapProduct>> getAllProducts() {
        return ResponseEntity.ok(inventoryService.getAllProducts());
    }

    // Admin only: add new soap product
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SoapProduct> addProduct(@Valid @RequestBody SoapProductRequest request) {
        User performer = getAuthenticatedUser();
        return ResponseEntity.ok(inventoryService.addProduct(request, performer));
    }

    // Admin only: top-up or adjust stock level manually
    @PutMapping("/{id}/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SoapProduct> adjustStock(
            @PathVariable Long id, 
            @RequestBody Map<String, Object> body) {
        
        Double qty = Double.valueOf(body.get("quantityChanged").toString());
        Double minStock = body.containsKey("minStock") && body.get("minStock") != null 
                ? Double.valueOf(body.get("minStock").toString()) 
                : null;
        String notes = body.getOrDefault("notes", "Manual stock adjustment").toString();
        User performer = getAuthenticatedUser();

        SoapProduct updatedProduct = inventoryService.adjustStock(
                id, 
                qty, 
                minStock,
                "ADJUST_STOCK", 
                notes, 
                performer
        );
        return ResponseEntity.ok(updatedProduct);
    }

    // Admin only: check inventory logs
    @GetMapping("/history")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SoapInventoryHistory>> getInventoryHistory() {
        return ResponseEntity.ok(inventoryService.getInventoryHistory());
    }

    // Admin only: delete a product if it hasn't been used in washes or manual adjustments
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        inventoryService.deleteProduct(id);
        return ResponseEntity.ok().body(Map.of("message", "Product deleted successfully."));
    }
}
