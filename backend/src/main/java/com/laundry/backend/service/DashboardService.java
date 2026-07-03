package com.laundry.backend.service;

import com.laundry.backend.dto.DashboardStats;
import com.laundry.backend.entity.LaundryTransaction;
import com.laundry.backend.entity.SoapProduct;
import com.laundry.backend.entity.Expense;
import com.laundry.backend.entity.TransactionServiceItem;
import com.laundry.backend.repository.SoapProductRepository;
import com.laundry.backend.repository.TransactionRepository;
import com.laundry.backend.repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private SoapProductRepository soapProductRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    public DashboardStats getStats() {
        return getStats(null, null);
    }

    public DashboardStats getStats(Integer year, Integer month) {
        int targetYear = (year != null && year > 0) ? year : LocalDate.now().getYear();
        boolean isAnnual = (month == null || month <= 0 || month > 12);
        int targetMonth = isAnnual ? 0 : month;

        LocalDate today = LocalDate.now();
        List<LaundryTransaction> todayTransactions = transactionRepository.findAllByDate(today);

        long totalTransactionsToday = todayTransactions.size();
        double totalKgWashedToday = todayTransactions.stream()
                .mapToDouble(LaundryTransaction::getWeightKg)
                .sum();

        long totalCustomersToday = todayTransactions.size();

        // 1. Soap stocks alerts
        List<SoapProduct> products = soapProductRepository.findAll();
        List<DashboardStats.SoapStockStatus> soapStocks = products.stream()
                .map(product -> new DashboardStats.SoapStockStatus(
                        product.getId(),
                        product.getName(),
                        product.getQuantity(),
                        product.getUnit(),
                        product.getQuantity() < product.getMinStock(),
                        product.getMinStock(),
                        product.getInitialStock()
                ))
                .collect(Collectors.toList());

        // 2. Fetch and filter all transactions and expenses
        List<LaundryTransaction> allTransactions = transactionRepository.findAll();
        List<Expense> allExpenses = expenseRepository.findAll();

        List<LaundryTransaction> filteredTransactions = allTransactions.stream()
                .filter(t -> t.getDate() != null)
                .filter(t -> {
                    if (isAnnual) {
                        return t.getDate().getYear() == targetYear;
                    } else {
                        return t.getDate().getYear() == targetYear && t.getDate().getMonthValue() == targetMonth;
                    }
                })
                .collect(Collectors.toList());

        List<Expense> filteredExpenses = allExpenses.stream()
                .filter(e -> e.getDate() != null)
                .filter(e -> {
                    if (isAnnual) {
                        return e.getDate().getYear() == targetYear;
                    } else {
                        return e.getDate().getYear() == targetYear && e.getDate().getMonthValue() == targetMonth;
                    }
                })
                .collect(Collectors.toList());

        // Overall Totals
        double totalRevenue = filteredTransactions.stream()
                .filter(t -> t.getTotalAmount() != null)
                .mapToDouble(LaundryTransaction::getTotalAmount)
                .sum();

        double totalExpenses = filteredExpenses.stream()
                .filter(e -> e.getAmount() != null)
                .mapToDouble(Expense::getAmount)
                .sum();

        double netProfit = totalRevenue - totalExpenses;

        // 3. Compute incomeByDate (grouped by LocalDate string)
        Map<LocalDate, Double> revenueByDateMap = filteredTransactions.stream()
                .filter(t -> t.getTotalAmount() != null)
                .collect(Collectors.groupingBy(
                        LaundryTransaction::getDate,
                        Collectors.summingDouble(LaundryTransaction::getTotalAmount)
                ));
        List<DashboardStats.BreakdownItem> incomeByDate = revenueByDateMap.entrySet().stream()
                .map(entry -> new DashboardStats.BreakdownItem(entry.getKey().toString(), entry.getValue()))
                .sorted(Comparator.comparing(DashboardStats.BreakdownItem::getName))
                .collect(Collectors.toList());

        // 4. Compute expenseByCategory (including standard preset categories)
        List<String> expenseCategories = Arrays.asList(
                "Utilities", "Payroll", "Detergent", "Maintenance", "Fabric conditioner",
                "xonrox", "tape", "cellophane", "GASOL", "SALARY", "ELECTRIC BILL", "WATER BILL"
        );
        Map<String, Double> expensesByCategoryMap = filteredExpenses.stream()
                .filter(e -> e.getAmount() != null && e.getCategory() != null)
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        Collectors.summingDouble(Expense::getAmount)
                ));
        List<DashboardStats.BreakdownItem> expenseByCategory = new ArrayList<>();
        double totalCategoryExpensesSum = 0.0;
        for (String cat : expenseCategories) {
            double sumVal = 0.0;
            // Case-insensitive check
            for (Map.Entry<String, Double> entry : expensesByCategoryMap.entrySet()) {
                if (entry.getKey().equalsIgnoreCase(cat)) {
                    sumVal += entry.getValue();
                }
            }
            expenseByCategory.add(new DashboardStats.BreakdownItem(cat, sumVal));
            totalCategoryExpensesSum += sumVal;
        }
        // Add residual percentage item if any miscellaneous expenses exist
        double otherExpensesSum = totalExpenses - totalCategoryExpensesSum;
        if (otherExpensesSum > 0.01) {
            expenseByCategory.add(new DashboardStats.BreakdownItem("Other / Miscellaneous", otherExpensesSum));
        }

        // 5. Compute incomeByService (revenue by laundry service)
        // Group transaction service items by Service Name
        Map<String, Double> incomeByServiceMap = filteredTransactions.stream()
                .flatMap(t -> t.getServiceItems().stream())
                .filter(item -> item.getLaundryService() != null && item.getPriceAtTransaction() != null && item.getQuantity() != null)
                .collect(Collectors.groupingBy(
                        item -> item.getLaundryService().getName(),
                        Collectors.summingDouble(item -> item.getPriceAtTransaction() * item.getQuantity())
                ));
        List<DashboardStats.BreakdownItem> incomeByService = incomeByServiceMap.entrySet().stream()
                .map(entry -> new DashboardStats.BreakdownItem(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(DashboardStats.BreakdownItem::getName))
                .collect(Collectors.toList());

        // 6. Mode of Payment Breakdown (Cash vs GCash)
        Map<String, Double> mopMap = filteredTransactions.stream()
                .filter(t -> t.getTotalAmount() != null && t.getPaymentMethod() != null)
                .collect(Collectors.groupingBy(
                        t -> t.getPaymentMethod(),
                        Collectors.summingDouble(LaundryTransaction::getTotalAmount)
                ));
        List<DashboardStats.BreakdownItem> mopBreakdown = Arrays.asList(
                new DashboardStats.BreakdownItem("Cash", mopMap.getOrDefault("Cash", 0.0) + mopMap.getOrDefault("CASH", 0.0)),
                new DashboardStats.BreakdownItem("Gcash", mopMap.getOrDefault("Gcash", 0.0) + mopMap.getOrDefault("GCash", 0.0) + mopMap.getOrDefault("GCASH", 0.0))
        );

        // 7. Pie chart breakdowns (filtering non-zero values for nicer display)
        List<DashboardStats.BreakdownItem> expenseCategoryBreakdown = expenseByCategory.stream()
                .filter(item -> item.getValue() > 0)
                .collect(Collectors.toList());

        List<DashboardStats.BreakdownItem> incomeServiceBreakdown = incomeByService.stream()
                .filter(item -> item.getValue() > 0)
                .collect(Collectors.toList());

        // 8. Compute Monthly Financials for historical timeline (past 6 months in annual or monthly context)
        Map<YearMonth, Double> monthlyRevenue = allTransactions.stream()
                .filter(t -> t.getTotalAmount() != null && t.getDate() != null)
                .collect(Collectors.groupingBy(
                        t -> YearMonth.from(t.getDate()),
                        Collectors.summingDouble(LaundryTransaction::getTotalAmount)
                ));
        Map<YearMonth, Double> monthlyExpenses = allExpenses.stream()
                .filter(e -> e.getAmount() != null && e.getDate() != null)
                .collect(Collectors.groupingBy(
                        e -> YearMonth.from(e.getDate()),
                        Collectors.summingDouble(Expense::getAmount)
                ));
        List<YearMonth> allMonths = new ArrayList<>();
        allMonths.addAll(monthlyRevenue.keySet());
        for (YearMonth ym : monthlyExpenses.keySet()) {
            if (!allMonths.contains(ym)) {
                allMonths.add(ym);
            }
        }
        allMonths.sort(Comparator.naturalOrder());
        if (allMonths.size() > 6) {
            allMonths = allMonths.subList(allMonths.size() - 6, allMonths.size());
        }
        List<DashboardStats.MonthlyFinancialPoint> monthlyFinancials = new ArrayList<>();
        for (YearMonth ym : allMonths) {
            String monthName = ym.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + ym.getYear();
            double rev = monthlyRevenue.getOrDefault(ym, 0.0);
            double exp = monthlyExpenses.getOrDefault(ym, 0.0);
            monthlyFinancials.add(new DashboardStats.MonthlyFinancialPoint(monthName, rev, exp));
        }

        DashboardStats stats = new DashboardStats(
                totalTransactionsToday,
                totalKgWashedToday,
                totalCustomersToday,
                soapStocks,
                totalRevenue,
                totalExpenses,
                netProfit,
                monthlyFinancials
        );
        stats.setExpenseCategoryBreakdown(expenseCategoryBreakdown);
        stats.setIncomeServiceBreakdown(incomeServiceBreakdown);
        stats.setMopBreakdown(mopBreakdown);
        stats.setIncomeByDate(incomeByDate);
        stats.setExpenseByCategory(expenseByCategory);
        stats.setIncomeByService(incomeByService);

        return stats;
    }
}
