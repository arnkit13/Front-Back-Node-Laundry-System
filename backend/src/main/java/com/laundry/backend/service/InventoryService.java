package com.laundry.backend.service;

import com.laundry.backend.dto.SoapProductRequest;
import com.laundry.backend.entity.SoapInventoryHistory;
import com.laundry.backend.entity.SoapProduct;
import com.laundry.backend.entity.User;
import com.laundry.backend.repository.SoapInventoryHistoryRepository;
import com.laundry.backend.repository.SoapProductRepository;
import com.laundry.backend.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InventoryService {

    @Autowired
    private SoapProductRepository soapProductRepository;

    @Autowired
    private SoapInventoryHistoryRepository soapInventoryHistoryRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    public List<SoapProduct> getAllProducts() {
        return soapProductRepository.findAll();
    }

    public SoapProduct getProductById(Long id) {
        return soapProductRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
    }

    @Transactional
    public SoapProduct addProduct(SoapProductRequest request, User performer) {
        if (soapProductRepository.existsByName(request.getName())) {
            throw new RuntimeException("Error: Product name already exists!");
        }

        SoapProduct product = SoapProduct.builder()
                .name(request.getName())
                .quantity(request.getQuantity())
                .unit(request.getUnit())
                .minStock(request.getMinStock() != null ? request.getMinStock() : 20.0)
                .initialStock(request.getQuantity())
                .build();

        SoapProduct savedProduct = soapProductRepository.save(product);

        // Record history
        SoapInventoryHistory history = SoapInventoryHistory.builder()
                .soapProduct(savedProduct)
                .transactionType("ADD_STOCK")
                .quantityChanged(request.getQuantity())
                .previousQuantity(0.0)
                .newQuantity(request.getQuantity())
                .notes("Initial product registration")
                .performedBy(performer)
                .build();

        soapInventoryHistoryRepository.save(history);

        return savedProduct;
    }

    @Transactional
    public SoapProduct adjustStock(Long id, Double quantityChanged, Double newMinStock, String transactionType, String notes, User performer) {
        SoapProduct product = getProductById(id);
        if (newMinStock != null) {
            product.setMinStock(newMinStock);
        }
        double oldQuantity = product.getQuantity();
        double newQuantity = oldQuantity + quantityChanged;

        if (newQuantity < 0) {
            throw new RuntimeException("Error: Stock cannot be negative! Current stock is " + oldQuantity + " " + product.getUnit());
        }

        product.setQuantity(newQuantity);
        SoapProduct updatedProduct = soapProductRepository.save(product);

        // Record history
        SoapInventoryHistory history = SoapInventoryHistory.builder()
                .soapProduct(updatedProduct)
                .transactionType(transactionType)
                .quantityChanged(quantityChanged)
                .previousQuantity(oldQuantity)
                .newQuantity(newQuantity)
                .notes(notes)
                .performedBy(performer)
                .build();

        soapInventoryHistoryRepository.save(history);

        return updatedProduct;
    }

    @Transactional
    public SoapProduct adjustStock(Long id, Double quantityChanged, String transactionType, String notes, User performer) {
        return adjustStock(id, quantityChanged, null, transactionType, notes, performer);
    }

    public List<SoapInventoryHistory> getInventoryHistory() {
        return soapInventoryHistoryRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public void deleteProduct(Long id) {
        SoapProduct product = getProductById(id);

        boolean hasTransactions = transactionRepository.existsBySoapProduct(product);
        List<SoapInventoryHistory> histories = soapInventoryHistoryRepository.findBySoapProduct(product);

        if (hasTransactions || histories.size() > 1) {
            throw new RuntimeException("Cannot delete soap product because it has been used in laundry washes or has manual stock adjustments.");
        }

        soapInventoryHistoryRepository.deleteAll(histories);
        soapProductRepository.delete(product);
    }
}
