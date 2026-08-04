import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

router.get('/stats', async (req, res) => {
  let reqYear = req.query.year ? parseInt(req.query.year, 10) : null;
  let reqMonth = req.query.month ? parseInt(req.query.month, 10) : null;

  const targetYear = (reqYear && reqYear > 0) ? reqYear : new Date().getFullYear();
  const isAnnual = (!reqMonth || reqMonth <= 0 || reqMonth > 12);
  const targetMonth = isAnnual ? 0 : reqMonth;

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's transactions
    const todayTxsRes = await query(`
      SELECT COALESCE(COUNT(*), 0) as count, COALESCE(SUM(weight_kg), 0) as weight
      FROM laundry_transactions
      WHERE date = $1
    `, [todayStr]);
    const totalTransactionsToday = parseInt(todayTxsRes.rows[0].count, 10);
    const totalKgWashedToday = Number(todayTxsRes.rows[0].weight);
    const totalCustomersToday = totalTransactionsToday;

    // Soap stocks status
    const soapRes = await query(`
      SELECT id, name, quantity, unit, min_stock as "minStock", initial_stock as "initialStock"
      FROM soap_products
      ORDER BY id ASC
    `);
    const soapStocks = soapRes.rows.map(row => {
      const quantity = Number(row.quantity);
      const minStock = row.minStock !== null ? Number(row.minStock) : 20.0;
      return {
        id: Number(row.id),
        name: row.name,
        currentStock: quantity,
        unit: row.unit,
        isLow: quantity < minStock,
        minStock,
        initialStock: row.initialStock !== null ? Number(row.initialStock) : 0.0
      };
    });

    // All transactions for filtering
    const txsRes = await query(`
      SELECT date, total_amount as "totalAmount", payment_method as "paymentMethod"
      FROM laundry_transactions
    `);
    const allTransactions = txsRes.rows;

    // All expenses for filtering
    const expensesRes = await query(`
      SELECT category, amount, date
      FROM expenses
    `);
    const allExpenses = expensesRes.rows;

    // Helper: Parse postgres Date or date-string to JS Date safely
    const toDate = (dVal) => dVal instanceof Date ? dVal : new Date(dVal);

    // Filter transactions
    const filteredTxs = allTransactions.filter(t => {
      if (!t.date) return false;
      const d = toDate(t.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-based
      if (isAnnual) {
        return y === targetYear;
      } else {
        return y === targetYear && m === targetMonth;
      }
    });

    // Filter expenses
    const filteredExpenses = allExpenses.filter(e => {
      if (!e.date) return false;
      const d = toDate(e.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-based
      if (isAnnual) {
        return y === targetYear;
      } else {
        return y === targetYear && m === targetMonth;
      }
    });

    // Aggregations
    const totalRevenue = filteredTxs.reduce((sum, curr) => sum + Number(curr.totalAmount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, curr) => sum + Number(curr.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    // incomeByDate (grouped by local Date string, sorted ascending)
    const revenueByDateMap = {};
    filteredTxs.forEach(t => {
      const dStr = t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date;
      revenueByDateMap[dStr] = (revenueByDateMap[dStr] || 0) + Number(t.totalAmount || 0);
    });
    const incomeByDate = Object.entries(revenueByDateMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // expenseByCategory preset mapping
    const presetCategories = [
      "Utilities", "Payroll", "Detergent", "Maintenance", "Fabric conditioner",
      "xonrox", "tape", "cellophane", "GASOL", "SALARY", "ELECTRIC BILL", "WATER BILL"
    ];
    const expensesByCategoryMap = {};
    filteredExpenses.forEach(e => {
      if (e.category && e.amount) {
        const cat = e.category.trim();
        expensesByCategoryMap[cat] = (expensesByCategoryMap[cat] || 0) + Number(e.amount);
      }
    });

    const expenseByCategory = [];
    let totalCategoryExpensesSum = 0.0;

    presetCategories.forEach(cat => {
      let sumVal = 0.0;
      Object.entries(expensesByCategoryMap).forEach(([key, val]) => {
        if (key.toLowerCase() === cat.toLowerCase()) {
          sumVal += val;
        }
      });
      expenseByCategory.push({ name: cat, value: sumVal });
      totalCategoryExpensesSum += sumVal;
    });

    const otherExpensesSum = totalExpenses - totalCategoryExpensesSum;
    if (otherExpensesSum > 0.01) {
      expenseByCategory.push({ name: "Other / Miscellaneous", value: otherExpensesSum });
    }

    // incomeByService (revenue by laundry service)
    // Fetch transaction service items that map to transactions
    const serviceItemsRes = await query(`
      SELECT i.quantity, i.price_at_transaction as "priceAtTransaction", 
             s.name as "serviceName", t.date
      FROM transaction_service_items i
      JOIN laundry_services s ON i.service_id = s.id
      JOIN laundry_transactions t ON i.transaction_id = t.id
    `);
    
    const allServiceItems = serviceItemsRes.rows;
    const filteredServiceItems = allServiceItems.filter(item => {
      if (!item.date) return false;
      const d = toDate(item.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-based
      if (isAnnual) {
        return y === targetYear;
      } else {
        return y === targetYear && m === targetMonth;
      }
    });

    const incomeByServiceMap = {};
    filteredServiceItems.forEach(item => {
      const cost = Number(item.priceAtTransaction) * Number(item.quantity);
      incomeByServiceMap[item.serviceName] = (incomeByServiceMap[item.serviceName] || 0) + cost;
    });
    const incomeByService = Object.entries(incomeByServiceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Mode of Payment (mopBreakdown)
    let cashSum = 0.0;
    let gcashSum = 0.0;
    filteredTxs.forEach(t => {
      const val = Number(t.totalAmount || 0);
      const mop = (t.paymentMethod || '').toLowerCase();
      if (mop === 'cash') {
        cashSum += val;
      } else if (mop === 'gcash') {
        gcashSum += val;
      }
    });
    const mopBreakdown = [
      { name: "Cash", value: cashSum },
      { name: "Gcash", value: gcashSum }
    ];

    // Pie charts breakdowns (non-zero value filter)
    const expenseCategoryBreakdown = expenseByCategory.filter(item => item.value > 0);
    const incomeServiceBreakdown = incomeByService.filter(item => item.value > 0);

    // Monthly Financials timeline (past 6 months)
    const monthlyRevenueMap = {};
    allTransactions.forEach(t => {
      if (t.date && t.totalAmount) {
        const d = toDate(t.date);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenueMap[ym] = (monthlyRevenueMap[ym] || 0) + Number(t.totalAmount);
      }
    });

    const monthlyExpensesMap = {};
    allExpenses.forEach(e => {
      if (e.date && e.amount) {
        const d = toDate(e.date);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyExpensesMap[ym] = (monthlyExpensesMap[ym] || 0) + Number(e.amount);
      }
    });

    // Merge unique months
    const allMonths = Array.from(new Set([
      ...Object.keys(monthlyRevenueMap),
      ...Object.keys(monthlyExpensesMap)
    ])).sort(); // Chronological ascending

    // Slice last 6 months
    const last6Months = allMonths.slice(-6);

    const monthlyFinancials = last6Months.map(ym => {
      const [y, mStr] = ym.split('-');
      const mIdx = parseInt(mStr, 10) - 1;
      const monthName = `${monthNames[mIdx]} ${y}`;
      return {
        month: monthName,
        revenue: monthlyRevenueMap[ym] || 0.0,
        expenses: monthlyExpensesMap[ym] || 0.0
      };
    });

    return res.json({
      totalTransactionsToday,
      totalKgWashedToday,
      totalCustomersToday,
      soapStocks,
      totalRevenue,
      totalExpenses,
      netProfit,
      monthlyFinancials,
      expenseCategoryBreakdown,
      incomeServiceBreakdown,
      mopBreakdown,
      incomeByDate,
      expenseByCategory,
      incomeByService
    });
  } catch (err) {
    console.error("Dashboard stats failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
