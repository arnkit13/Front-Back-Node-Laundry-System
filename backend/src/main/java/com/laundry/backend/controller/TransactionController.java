package com.laundry.backend.controller;

import com.laundry.backend.dto.TransactionRequest;
import com.laundry.backend.entity.LaundryTransaction;
import com.laundry.backend.entity.User;
import com.laundry.backend.repository.UserRepository;
import com.laundry.backend.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current authenticated user not found"));
    }

    // List transactions: admin gets all, user/employee gets only their own entries
    @GetMapping
    public ResponseEntity<List<LaundryTransaction>> getTransactions() {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(transactionService.getTransactions(user));
    }

    // Record new transaction
    @PostMapping
    public ResponseEntity<LaundryTransaction> createTransaction(@Valid @RequestBody TransactionRequest request) {
        User performer = getAuthenticatedUser();
        return ResponseEntity.ok(transactionService.createTransaction(request, performer));
    }

    @PutMapping("/{id}/pickup")
    public ResponseEntity<LaundryTransaction> markAsPickedUp(@PathVariable Long id) {
        return ResponseEntity.ok(transactionService.markAsPickedUp(id));
    }
}
