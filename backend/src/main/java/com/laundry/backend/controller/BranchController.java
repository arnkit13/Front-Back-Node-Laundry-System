package com.laundry.backend.controller;

import com.laundry.backend.entity.Branch;
import com.laundry.backend.entity.User;
import com.laundry.backend.entity.LaundryTransaction;
import com.laundry.backend.repository.BranchRepository;
import com.laundry.backend.repository.UserRepository;
import com.laundry.backend.repository.TransactionRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @GetMapping
    public ResponseEntity<List<Branch>> getAllBranches() {
        return ResponseEntity.ok(branchRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Branch> createBranch(@Valid @RequestBody Branch branch) {
        if (branch.getId() != null) {
            branch.setId(null); // Force creation
        }
        return ResponseEntity.ok(branchRepository.save(branch));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Branch> updateBranch(@PathVariable Long id, @Valid @RequestBody Branch updatedBranch) {
        Branch existing = branchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found with id: " + id));
        existing.setName(updatedBranch.getName());
        existing.setLocation(updatedBranch.getLocation());
        if (updatedBranch.getMachinesConfig() != null) {
            existing.setMachinesConfig(updatedBranch.getMachinesConfig());
        }
        return ResponseEntity.ok(branchRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteBranch(@PathVariable Long id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found with id: " + id));

        // Update users referencing this branch to null
        List<User> users = userRepository.findByBranch(branch);
        for (User user : users) {
            user.setBranch(null);
            userRepository.save(user);
        }

        // Update transactions referencing this branch to null
        List<LaundryTransaction> transactions = transactionRepository.findByBranch(branch);
        for (LaundryTransaction tx : transactions) {
            tx.setBranch(null);
            transactionRepository.save(tx);
        }

        branchRepository.delete(branch);
        return ResponseEntity.ok().body(java.util.Map.of("message", "Branch deleted successfully."));
    }
}

