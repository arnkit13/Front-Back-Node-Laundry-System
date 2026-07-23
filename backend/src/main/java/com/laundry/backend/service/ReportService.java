package com.laundry.backend.service;

import com.laundry.backend.dto.ReportSummary;
import com.laundry.backend.entity.LaundryTransaction;
import com.laundry.backend.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class ReportService {

    @Autowired
    private TransactionRepository transactionRepository;

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("MMMM yyyy");

    private List<LaundryTransaction> getFilteredTransactions(Long branchId) {
        List<LaundryTransaction> transactions = transactionRepository.findAll();
        if (branchId != null) {
            transactions = transactions.stream()
                    .filter(t -> t.getBranch() != null && branchId.equals(t.getBranch().getId()))
                    .collect(Collectors.toList());
        }
        return transactions;
    }

    public List<ReportSummary> getDailyReports(Long branchId) {
        List<LaundryTransaction> transactions = getFilteredTransactions(branchId);

        // TreeMap with reverse comparator to sort dates descending
        Map<LocalDate, List<LaundryTransaction>> grouped = transactions.stream()
                .collect(Collectors.groupingBy(
                        LaundryTransaction::getDate,
                        () -> new TreeMap<>((d1, d2) -> d2.compareTo(d1)),
                        Collectors.toList()
                ));

        return grouped.entrySet().stream()
                .map(entry -> {
                    LocalDate date = entry.getKey();
                    List<LaundryTransaction> list = entry.getValue();
                    double totalKg = list.stream().mapToDouble(LaundryTransaction::getWeightKg).sum();
                    double totalSoap = list.stream().mapToDouble(LaundryTransaction::getSoapUsedQty).sum();

                    long customerCount = list.stream()
                            .map(LaundryTransaction::getCustomerName)
                            .filter(name -> name != null && !name.trim().isEmpty())
                            .map(String::trim)
                            .distinct()
                            .count();
                    if (customerCount == 0) {
                        customerCount = list.size();
                    }

                    double totalRevenue = list.stream()
                            .mapToDouble(t -> t.getTotalAmount() != null ? t.getTotalAmount() : 0.0)
                            .sum();

                    Map<String, Long> machineUsage = list.stream()
                            .filter(t -> t.getMachineNumber() != null && !t.getMachineNumber().isBlank())
                            .collect(Collectors.groupingBy(LaundryTransaction::getMachineNumber, Collectors.counting()));

                    Map<String, Long> branchUsage = list.stream()
                            .filter(t -> t.getBranch() != null)
                            .collect(Collectors.groupingBy(t -> t.getBranch().getName(), Collectors.counting()));

                    return new ReportSummary(
                            date.toString(),
                            list.size(),
                            totalKg,
                            totalSoap,
                            machineUsage,
                            branchUsage,
                            customerCount,
                            totalRevenue
                    );
                })
                .collect(Collectors.toList());
    }

    public List<ReportSummary> getWeeklyReports(Long branchId) {
        List<LaundryTransaction> transactions = getFilteredTransactions(branchId);

        // Group by Year and Week Number (e.g. 2026-W25)
        Map<String, List<LaundryTransaction>> grouped = transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> {
                            LocalDate date = t.getDate();
                            int week = date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
                            int year = date.get(IsoFields.WEEK_BASED_YEAR);
                            return year + "-W" + String.format("%02d", week);
                        },
                        () -> new TreeMap<>((w1, w2) -> w2.compareTo(w1)), // Sort descending
                        Collectors.toList()
                ));

        return grouped.entrySet().stream()
                .map(entry -> {
                    List<LaundryTransaction> list = entry.getValue();
                    double totalKg = list.stream().mapToDouble(LaundryTransaction::getWeightKg).sum();
                    double totalSoap = list.stream().mapToDouble(LaundryTransaction::getSoapUsedQty).sum();

                    long customerCount = list.stream()
                            .map(LaundryTransaction::getCustomerName)
                            .filter(name -> name != null && !name.trim().isEmpty())
                            .map(String::trim)
                            .distinct()
                            .count();
                    if (customerCount == 0) {
                        customerCount = list.size();
                    }

                    double totalRevenue = list.stream()
                            .mapToDouble(t -> t.getTotalAmount() != null ? t.getTotalAmount() : 0.0)
                            .sum();

                    Map<String, Long> machineUsage = list.stream()
                            .filter(t -> t.getMachineNumber() != null && !t.getMachineNumber().isBlank())
                            .collect(Collectors.groupingBy(LaundryTransaction::getMachineNumber, Collectors.counting()));

                    Map<String, Long> branchUsage = list.stream()
                            .filter(t -> t.getBranch() != null)
                            .collect(Collectors.groupingBy(t -> t.getBranch().getName(), Collectors.counting()));

                    return new ReportSummary(
                            entry.getKey(),
                            list.size(),
                            totalKg,
                            totalSoap,
                            machineUsage,
                            branchUsage,
                            customerCount,
                            totalRevenue
                    );
                })
                .collect(Collectors.toList());
    }

    public List<ReportSummary> getMonthlyReports(Long branchId) {
        List<LaundryTransaction> transactions = getFilteredTransactions(branchId);

        // Group by Month (using a key format that sorts descending, e.g. "yyyy-MM")
        // We will store key as "yyyy-MM|Month Year" and parse it to display "Month Year" in sorted order
        Map<String, List<LaundryTransaction>> grouped = transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> {
                            LocalDate date = t.getDate();
                            return date.getYear() + "-" + String.format("%02d", date.getMonthValue()) + "|" + date.format(MONTH_FORMATTER);
                        },
                        () -> new TreeMap<>((m1, m2) -> m2.compareTo(m1)), // Sort descending
                        Collectors.toList()
                ));

        return grouped.entrySet().stream()
                .map(entry -> {
                    String[] parts = entry.getKey().split("\\|");
                    String periodLabel = parts.length > 1 ? parts[1] : parts[0];
                    List<LaundryTransaction> list = entry.getValue();
                    double totalKg = list.stream().mapToDouble(LaundryTransaction::getWeightKg).sum();
                    double totalSoap = list.stream().mapToDouble(LaundryTransaction::getSoapUsedQty).sum();

                    long customerCount = list.stream()
                            .map(LaundryTransaction::getCustomerName)
                            .filter(name -> name != null && !name.trim().isEmpty())
                            .map(String::trim)
                            .distinct()
                            .count();
                    if (customerCount == 0) {
                        customerCount = list.size();
                    }

                    double totalRevenue = list.stream()
                            .mapToDouble(t -> t.getTotalAmount() != null ? t.getTotalAmount() : 0.0)
                            .sum();

                    Map<String, Long> machineUsage = list.stream()
                            .filter(t -> t.getMachineNumber() != null && !t.getMachineNumber().isBlank())
                            .collect(Collectors.groupingBy(LaundryTransaction::getMachineNumber, Collectors.counting()));

                    Map<String, Long> branchUsage = list.stream()
                            .filter(t -> t.getBranch() != null)
                            .collect(Collectors.groupingBy(t -> t.getBranch().getName(), Collectors.counting()));

                    return new ReportSummary(
                            periodLabel,
                            list.size(),
                            totalKg,
                            totalSoap,
                            machineUsage,
                            branchUsage,
                            customerCount,
                            totalRevenue
                    );
                })
                .collect(Collectors.toList());
    }
}
