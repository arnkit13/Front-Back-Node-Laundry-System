package com.laundry.backend.repository;

import com.laundry.backend.entity.LaundryTransaction;
import com.laundry.backend.entity.User;
import com.laundry.backend.entity.Branch;
import com.laundry.backend.entity.SoapProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<LaundryTransaction, Long> {
    List<LaundryTransaction> findByUserOrderByDateDescIdDesc(User user);
    List<LaundryTransaction> findAllByOrderByIdDesc();
    List<LaundryTransaction> findAllByDateBetweenOrderByDateDescIdDesc(LocalDate startDate, LocalDate endDate);
    List<LaundryTransaction> findByUserAndDateBetweenOrderByDateDescIdDesc(User user, LocalDate startDate, LocalDate endDate);
    List<LaundryTransaction> findAllByDate(LocalDate date);
    boolean existsByUser(User user);
    List<LaundryTransaction> findByBranch(Branch branch);
    boolean existsBySoapProduct(SoapProduct soapProduct);
    List<LaundryTransaction> findBySoapProduct(SoapProduct soapProduct);
}

