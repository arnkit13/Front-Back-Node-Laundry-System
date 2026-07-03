package com.laundry.backend.dto;

import java.util.List;

public class DashboardStats {
    private long totalTransactionsToday;
    private double totalKgWashedToday;
    private long totalCustomersToday;
    private List<SoapStockStatus> soapStocks;
    
    private double totalRevenue;
    private double totalExpenses;
    private double netProfit;
    private List<MonthlyFinancialPoint> monthlyFinancials;
    
    private List<BreakdownItem> expenseCategoryBreakdown;
    private List<BreakdownItem> incomeServiceBreakdown;
    private List<BreakdownItem> mopBreakdown;
    private List<BreakdownItem> incomeByDate;
    private List<BreakdownItem> expenseByCategory;
    private List<BreakdownItem> incomeByService;

    public DashboardStats() {}

    public DashboardStats(long totalTransactionsToday, double totalKgWashedToday, long totalCustomersToday, List<SoapStockStatus> soapStocks,
                          double totalRevenue, double totalExpenses, double netProfit, List<MonthlyFinancialPoint> monthlyFinancials) {
        this.totalTransactionsToday = totalTransactionsToday;
        this.totalKgWashedToday = totalKgWashedToday;
        this.totalCustomersToday = totalCustomersToday;
        this.soapStocks = soapStocks;
        this.totalRevenue = totalRevenue;
        this.totalExpenses = totalExpenses;
        this.netProfit = netProfit;
        this.monthlyFinancials = monthlyFinancials;
    }

    public long getTotalTransactionsToday() { return totalTransactionsToday; }
    public void setTotalTransactionsToday(long totalTransactionsToday) { this.totalTransactionsToday = totalTransactionsToday; }

    public double getTotalKgWashedToday() { return totalKgWashedToday; }
    public void setTotalKgWashedToday(double totalKgWashedToday) { this.totalKgWashedToday = totalKgWashedToday; }

    public long getTotalCustomersToday() { return totalCustomersToday; }
    public void setTotalCustomersToday(long totalCustomersToday) { this.totalCustomersToday = totalCustomersToday; }

    public List<SoapStockStatus> getSoapStocks() { return soapStocks; }
    public void setSoapStocks(List<SoapStockStatus> soapStocks) { this.soapStocks = soapStocks; }

    public double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(double totalRevenue) { this.totalRevenue = totalRevenue; }

    public double getTotalExpenses() { return totalExpenses; }
    public void setTotalExpenses(double totalExpenses) { this.totalExpenses = totalExpenses; }

    public double getNetProfit() { return netProfit; }
    public void setNetProfit(double netProfit) { this.netProfit = netProfit; }

    public List<MonthlyFinancialPoint> getMonthlyFinancials() { return monthlyFinancials; }
    public void setMonthlyFinancials(List<MonthlyFinancialPoint> monthlyFinancials) { this.monthlyFinancials = monthlyFinancials; }

    public List<BreakdownItem> getExpenseCategoryBreakdown() { return expenseCategoryBreakdown; }
    public void setExpenseCategoryBreakdown(List<BreakdownItem> expenseCategoryBreakdown) { this.expenseCategoryBreakdown = expenseCategoryBreakdown; }

    public List<BreakdownItem> getIncomeServiceBreakdown() { return incomeServiceBreakdown; }
    public void setIncomeServiceBreakdown(List<BreakdownItem> incomeServiceBreakdown) { this.incomeServiceBreakdown = incomeServiceBreakdown; }

    public List<BreakdownItem> getMopBreakdown() { return mopBreakdown; }
    public void setMopBreakdown(List<BreakdownItem> mopBreakdown) { this.mopBreakdown = mopBreakdown; }

    public List<BreakdownItem> getIncomeByDate() { return incomeByDate; }
    public void setIncomeByDate(List<BreakdownItem> incomeByDate) { this.incomeByDate = incomeByDate; }

    public List<BreakdownItem> getExpenseByCategory() { return expenseByCategory; }
    public void setExpenseByCategory(List<BreakdownItem> expenseByCategory) { this.expenseByCategory = expenseByCategory; }

    public List<BreakdownItem> getIncomeByService() { return incomeByService; }
    public void setIncomeByService(List<BreakdownItem> incomeByService) { this.incomeByService = incomeByService; }

    public static class BreakdownItem {
        private String name;
        private Double value;

        public BreakdownItem() {}

        public BreakdownItem(String name, Double value) {
            this.name = name;
            this.value = value;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public Double getValue() { return value; }
        public void setValue(Double value) { this.value = value; }
    }

    public static class MonthlyFinancialPoint {
        private String month;
        private Double revenue;
        private Double expenses;

        public MonthlyFinancialPoint() {}

        public MonthlyFinancialPoint(String month, Double revenue, Double expenses) {
            this.month = month;
            this.revenue = revenue;
            this.expenses = expenses;
        }

        public String getMonth() { return month; }
        public void setMonth(String month) { this.month = month; }

        public Double getRevenue() { return revenue; }
        public void setRevenue(Double revenue) { this.revenue = revenue; }

        public Double getExpenses() { return expenses; }
        public void setExpenses(Double expenses) { this.expenses = expenses; }
    }

    public static class SoapStockStatus {
        private Long id;
        private String name;
        private Double currentStock;
        private String unit;
        private boolean isLow;
        private Double minStock;
        private Double initialStock;

        public SoapStockStatus() {}

        public SoapStockStatus(Long id, String name, Double currentStock, String unit, boolean isLow, Double minStock, Double initialStock) {
            this.id = id;
            this.name = name;
            this.currentStock = currentStock;
            this.unit = unit;
            this.isLow = isLow;
            this.minStock = minStock;
            this.initialStock = initialStock;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public Double getCurrentStock() { return currentStock; }
        public void setCurrentStock(Double currentStock) { this.currentStock = currentStock; }

        public String getUnit() { return unit; }
        public void setUnit(String unit) { this.unit = unit; }

        public boolean isLow() { return isLow; }
        public void setLow(boolean low) { isLow = low; }

        public Double getMinStock() { return minStock; }
        public void setMinStock(Double minStock) { this.minStock = minStock; }

        public Double getInitialStock() { return initialStock; }
        public void setInitialStock(Double initialStock) { this.initialStock = initialStock; }
    }
}
