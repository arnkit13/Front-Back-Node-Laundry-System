package com.laundry.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "branches")
public class Branch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 150)
    private String location;

    @Column(nullable = false, length = 1000)
    private String machinesConfig = "Machine 1:true,Machine 2:true,Machine 3:true,Machine 4:true";

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Branch() {}

    public Branch(Long id, String name, String location) {
        this.id = id;
        this.name = name;
        this.location = location;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getMachinesConfig() {
        return machinesConfig;
    }

    public void setMachinesConfig(String machinesConfig) {
        this.machinesConfig = machinesConfig;
    }

    // Custom Builder
    public static BranchBuilder builder() {
        return new BranchBuilder();
    }

    public static class BranchBuilder {
        private Long id;
        private String name;
        private String location;
        private String machinesConfig = "Machine 1:true,Machine 2:true,Machine 3:true,Machine 4:true";

        public BranchBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public BranchBuilder name(String name) {
            this.name = name;
            return this;
        }

        public BranchBuilder location(String location) {
            this.location = location;
            return this;
        }

        public BranchBuilder machinesConfig(String machinesConfig) {
            this.machinesConfig = machinesConfig;
            return this;
        }

        public Branch build() {
            Branch branch = new Branch(id, name, location);
            branch.setMachinesConfig(machinesConfig != null ? machinesConfig : "Machine 1:true,Machine 2:true,Machine 3:true,Machine 4:true");
            return branch;
        }
    }
}
