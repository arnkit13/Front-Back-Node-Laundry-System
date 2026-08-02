package com.laundry.backend.service;

import com.laundry.backend.dto.TransactionRequest;
import com.laundry.backend.dto.ServiceItemRequest;
import com.laundry.backend.entity.LaundryTransaction;
import com.laundry.backend.entity.SoapProduct;
import com.laundry.backend.entity.User;
import com.laundry.backend.entity.LaundryService;
import com.laundry.backend.entity.TransactionServiceItem;
import com.laundry.backend.repository.TransactionRepository;
import com.laundry.backend.repository.LaundryServiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LaundryServiceRepository laundryServiceRepository;

    @Autowired
    private InventoryService inventoryService;

    public List<LaundryTransaction> getTransactions(User user) {
        if ("ROLE_ADMIN".equals(user.getRole())) {
            return transactionRepository.findAllByOrderByIdDesc();
        } else {
            return transactionRepository.findByUserOrderByDateDescIdDesc(user);
        }
    }

    @Transactional
    public LaundryTransaction createTransaction(TransactionRequest request, User performer) {
        // Retrieve and validate soap product stock
        SoapProduct product = inventoryService.getProductById(request.getSoapProductId());
        
        if (product.getQuantity() < request.getSoapUsedQty()) {
            throw new RuntimeException("Error: Insufficient stock for " + product.getName() 
                    + ". Available: " + product.getQuantity() + " " + product.getUnit() 
                    + ", Requested: " + request.getSoapUsedQty() + " " + product.getUnit());
        }

        // Deduct soap stock and record inventory history
        String historyNotes = "Used for customer transaction (Weight: " + request.getWeightKg() + " kg" 
                + (request.getCustomerName() != null && !request.getCustomerName().isBlank() ? ", Customer: " + request.getCustomerName() : "") + ")";
        
        SoapProduct updatedProduct = inventoryService.adjustStock(
                product.getId(), 
                -request.getSoapUsedQty(), 
                "USE_STOCK", 
                historyNotes, 
                performer
        );

        // Build transaction (transient, so we can link items and calculate total amount)
        LaundryTransaction transaction = LaundryTransaction.builder()
                .date(request.getDate())
                .customerName(request.getCustomerName())
                .weightKg(request.getWeightKg())
                .soapProduct(updatedProduct)
                .soapUsedQty(request.getSoapUsedQty())
                .soapRemainingQty(updatedProduct.getQuantity())
                .user(performer)
                .machineNumber(request.getMachineNumber())
                .branch(performer.getBranch())
                .paymentMethod(request.getPaymentMethod())
                .referenceNumber(request.getReferenceNumber())
                .build();

        double totalAmount = 0.0;
        List<TransactionServiceItem> serviceItems = new ArrayList<>();

        if (request.getServices() != null) {
            for (ServiceItemRequest serviceReq : request.getServices()) {
                LaundryService service = laundryServiceRepository.findById(serviceReq.getServiceId())
                        .orElseThrow(() -> new RuntimeException("Service not found with ID: " + serviceReq.getServiceId()));

                double unitPrice = (serviceReq.getPriceAtTransaction() != null) 
                        ? serviceReq.getPriceAtTransaction() 
                        : service.getRate();

                double cost = unitPrice * serviceReq.getQuantity();
                totalAmount += cost;

                TransactionServiceItem item = TransactionServiceItem.builder()
                        .transaction(transaction)
                        .laundryService(service)
                        .quantity(serviceReq.getQuantity())
                        .priceAtTransaction(unitPrice)
                        .build();

                serviceItems.add(item);
            }
        }

        transaction.setTotalAmount(totalAmount);
        transaction.setServiceItems(serviceItems);

        return transactionRepository.save(transaction);
    }

    @Transactional
    public LaundryTransaction markAsPickedUp(Long id) {
        LaundryTransaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with ID: " + id));
        transaction.setPickedUp(true);
        transaction.setPickedUpAt(LocalDateTime.now());
        return transactionRepository.save(transaction);
    }
}
