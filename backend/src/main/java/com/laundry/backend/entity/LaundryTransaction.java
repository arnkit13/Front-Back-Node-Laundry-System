package com.laundry.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "laundry_transactions")
public class LaundryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(length = 100)
    private String customerName;

    @Column(nullable = false)
    private Double weightKg;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "soap_product_id", nullable = false)
    private SoapProduct soapProduct;

    @Column(nullable = false)
    private Double soapUsedQty;

    @Column(nullable = false)
    private Double soapRemainingQty; // stock level recorded after this transaction

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // employee who recorded it

    @Column(length = 50)
    private String machineNumber; // the washing machine identifier

    @ManyToOne(fetch = FetchType.EAGER, optional = true)
    @JoinColumn(name = "branch_id")
    private Branch branch; // branch where transaction occurred

    @Column(length = 20)
    private String paymentMethod; // GCash or Cash

    @Column(length = 50)
    private String referenceNumber; // GCash last 4 digits reference

    @Column
    private Double totalAmount; // total price calculated for transaction

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TransactionServiceItem> serviceItems = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private Boolean pickedUp = false;

    @Column
    private LocalDateTime pickedUpAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public LaundryTransaction() {}

    public LaundryTransaction(Long id, LocalDate date, String customerName, Double weightKg, SoapProduct soapProduct,
                              Double soapUsedQty, Double soapRemainingQty, User user, String machineNumber, Branch branch,
                              String paymentMethod, String referenceNumber, Double totalAmount, List<TransactionServiceItem> serviceItems, LocalDateTime createdAt) {
        this.id = id;
        this.date = date;
        this.customerName = customerName;
        this.weightKg = weightKg;
        this.soapProduct = soapProduct;
        this.soapUsedQty = soapUsedQty;
        this.soapRemainingQty = soapRemainingQty;
        this.user = user;
        this.machineNumber = machineNumber;
        this.branch = branch;
        this.paymentMethod = paymentMethod;
        this.referenceNumber = referenceNumber;
        this.totalAmount = totalAmount;
        if (serviceItems != null) {
            this.serviceItems = serviceItems;
        }
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public Double getWeightKg() { return weightKg; }
    public void setWeightKg(Double weightKg) { this.weightKg = weightKg; }

    public SoapProduct getSoapProduct() { return soapProduct; }
    public void setSoapProduct(SoapProduct soapProduct) { this.soapProduct = soapProduct; }

    public Double getSoapUsedQty() { return soapUsedQty; }
    public void setSoapUsedQty(Double soapUsedQty) { this.soapUsedQty = soapUsedQty; }

    public Double getSoapRemainingQty() { return soapRemainingQty; }
    public void setSoapRemainingQty(Double soapRemainingQty) { this.soapRemainingQty = soapRemainingQty; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getMachineNumber() { return machineNumber; }
    public void setMachineNumber(String machineNumber) { this.machineNumber = machineNumber; }

    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public List<TransactionServiceItem> getServiceItems() { return serviceItems; }
    public void setServiceItems(List<TransactionServiceItem> serviceItems) { this.serviceItems = serviceItems; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Boolean getPickedUp() { return pickedUp; }
    public void setPickedUp(Boolean pickedUp) { this.pickedUp = pickedUp; }

    public LocalDateTime getPickedUpAt() { return pickedUpAt; }
    public void setPickedUpAt(LocalDateTime pickedUpAt) { this.pickedUpAt = pickedUpAt; }

    // Custom Builder
    public static LaundryTransactionBuilder builder() {
        return new LaundryTransactionBuilder();
    }

    public static class LaundryTransactionBuilder {
        private Long id;
        private LocalDate date;
        private String customerName;
        private Double weightKg;
        private SoapProduct soapProduct;
        private Double soapUsedQty;
        private Double soapRemainingQty;
        private User user;
        private String machineNumber;
        private Branch branch;
        private String paymentMethod;
        private String referenceNumber;
        private Double totalAmount;
        private List<TransactionServiceItem> serviceItems = new ArrayList<>();
        private LocalDateTime createdAt;
        private Boolean pickedUp = false;
        private LocalDateTime pickedUpAt;

        public LaundryTransactionBuilder id(Long id) { this.id = id; return this; }
        public LaundryTransactionBuilder date(LocalDate date) { this.date = date; return this; }
        public LaundryTransactionBuilder customerName(String customerName) { this.customerName = customerName; return this; }
        public LaundryTransactionBuilder weightKg(Double weightKg) { this.weightKg = weightKg; return this; }
        public LaundryTransactionBuilder soapProduct(SoapProduct soapProduct) { this.soapProduct = soapProduct; return this; }
        public LaundryTransactionBuilder soapUsedQty(Double soapUsedQty) { this.soapUsedQty = soapUsedQty; return this; }
        public LaundryTransactionBuilder soapRemainingQty(Double soapRemainingQty) { this.soapRemainingQty = soapRemainingQty; return this; }
        public LaundryTransactionBuilder user(User user) { this.user = user; return this; }
        public LaundryTransactionBuilder machineNumber(String machineNumber) { this.machineNumber = machineNumber; return this; }
        public LaundryTransactionBuilder branch(Branch branch) { this.branch = branch; return this; }
        public LaundryTransactionBuilder paymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; return this; }
        public LaundryTransactionBuilder referenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; return this; }
        public LaundryTransactionBuilder totalAmount(Double totalAmount) { this.totalAmount = totalAmount; return this; }
        public LaundryTransactionBuilder serviceItems(List<TransactionServiceItem> serviceItems) { this.serviceItems = serviceItems; return this; }
        public LaundryTransactionBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public LaundryTransactionBuilder pickedUp(Boolean pickedUp) { this.pickedUp = pickedUp; return this; }
        public LaundryTransactionBuilder pickedUpAt(LocalDateTime pickedUpAt) { this.pickedUpAt = pickedUpAt; return this; }

        public LaundryTransaction build() {
            LaundryTransaction transaction = new LaundryTransaction(id, date, customerName, weightKg, soapProduct, soapUsedQty, soapRemainingQty, user, machineNumber, branch, paymentMethod, referenceNumber, totalAmount, serviceItems, createdAt);
            transaction.setPickedUp(pickedUp != null ? pickedUp : false);
            transaction.setPickedUpAt(pickedUpAt);
            return transaction;
        }
    }
}
