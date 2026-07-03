package com.laundry.backend.config;

import com.laundry.backend.entity.Branch;
import com.laundry.backend.entity.User;
import com.laundry.backend.entity.LaundryService;
import com.laundry.backend.entity.SoapInventoryHistory;
import com.laundry.backend.repository.BranchRepository;
import com.laundry.backend.repository.UserRepository;
import com.laundry.backend.repository.LaundryServiceRepository;
import com.laundry.backend.repository.SoapProductRepository;
import com.laundry.backend.repository.SoapInventoryHistoryRepository;
import com.laundry.backend.repository.TransactionRepository;
import com.laundry.backend.entity.LaundryTransaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private LaundryServiceRepository laundryServiceRepository;

    @Autowired
    private SoapProductRepository soapProductRepository;

    @Autowired
    private SoapInventoryHistoryRepository soapInventoryHistoryRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // 0. Clean up static/mock soap products if present
        List<String> staticsToDelete = Arrays.asList(
                "Powder Detergent (Lemon Clean)",
                "Liquid Detergent (Ocean Fresh)",
                "Fabric Softener (Lavender Mist)"
        );
        for (String name : staticsToDelete) {
            soapProductRepository.findByName(name).ifPresent(product -> {
                try {
                    List<LaundryTransaction> transactions = transactionRepository.findBySoapProduct(product);
                    for (LaundryTransaction tx : transactions) {
                        transactionRepository.delete(tx);
                    }
                    transactionRepository.flush();
                    
                    List<SoapInventoryHistory> histories = soapInventoryHistoryRepository.findBySoapProduct(product);
                    soapInventoryHistoryRepository.deleteAll(histories);
                    soapInventoryHistoryRepository.flush();
                    
                    soapProductRepository.delete(product);
                    soapProductRepository.flush();
                    System.out.println("Cleaned up static product: " + name);
                } catch (Exception ex) {
                    System.err.println("Could not delete static product due to constraint check: " + name + " - " + ex.getMessage());
                }
            });
        }

        // 1. Seed Users
        if (userRepository.count() == 0) {
            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .fullName("Shop Manager (Admin)")
                    .role("ROLE_ADMIN")
                    .active(true)
                    .branch(null)
                    .build();

            User employee = User.builder()
                    .username("employee")
                    .password(passwordEncoder.encode("emp123"))
                    .fullName("Juan Dela Cruz (Employee)")
                    .role("ROLE_USER")
                    .active(true)
                    .branch(null)
                    .build();

            userRepository.saveAll(Arrays.asList(admin, employee));
            System.out.println("Default users seeded: 'admin' / 'admin123' and 'employee' / 'emp123'");
        }

        // 2. Seed Services
        List<LaundryService> defaultServices = Arrays.asList(
                new LaundryService(null, "Basic Service", 180.0, "service", null, null),
                new LaundryService(null, "Comforter", 180.0, "pc", null, null),
                new LaundryService(null, "Extra Wash", 20.0, "wash", null, null),
                new LaundryService(null, "Extra Rinse", 20.0, "rinse", null, null),
                new LaundryService(null, "Extra Dry", 30.0, "dry", null, null),
                new LaundryService(null, "Extra Kilo", 20.0, "kilo", null, null),
                new LaundryService(null, "Detergent", 10.0, "sachet", null, null),
                new LaundryService(null, "SELF SERVICE", 100.0, "LOAD", null, null),
                new LaundryService(null, "FREE", 0.0, "LOAD", null, null),
                new LaundryService(null, "BEDSHEETS", 180.0, "", null, null),
                new LaundryService(null, "SOFTENER", 10.0, "", null, null),
                new LaundryService(null, "ICE", 15.0, "PACK", null, null)
        );

        // Add standard services if missing
        for (LaundryService seed : defaultServices) {
            java.util.Optional<LaundryService> existingOpt = laundryServiceRepository.findByName(seed.getName());
            if (!existingOpt.isPresent()) {
                laundryServiceRepository.save(seed);
            }
        }
        System.out.println("Standard laundry services seeded successfully.");
    }
}
