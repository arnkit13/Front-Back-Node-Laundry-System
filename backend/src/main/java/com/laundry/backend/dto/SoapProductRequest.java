package com.laundry.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SoapProductRequest {
    @NotBlank(message = "Product name is required")
    private String name;

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.0", message = "Quantity cannot be negative")
    private Double quantity;

    @NotBlank(message = "Unit of measurement is required")
    private String unit;

    private Double minStock;

    public SoapProductRequest() {}

    public SoapProductRequest(String name, Double quantity, String unit, Double minStock) {
        this.name = name;
        this.quantity = quantity;
        this.unit = unit;
        this.minStock = minStock;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getQuantity() { return quantity; }
    public void setQuantity(Double quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Double getMinStock() { return minStock; }
    public void setMinStock(Double minStock) { this.minStock = minStock; }
}
