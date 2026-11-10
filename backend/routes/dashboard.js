import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Helper: get today's date string in Philippine time (UTC+8) as YYYY-MM-DD
const getPHToday = () => {
  const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return nowPH.toISOString().split('T')[0];
};

router.get('/stats', async (req, res) => {
  let reqYear = req.query.year ? parseInt(req.query.year, 10) : null;
  let reqMonth = req.query.month ? parseInt(req.query.month, 10) : null;
  let branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;

  const targetYear = (reqYear && reqYear > 0) ? reqYear : new Date().getFullYear();
  const isAnnual = (!reqMonth || reqMonth <= 0 || reqMonth > 12);
  const targetMonth = isAnnual ? 0 : reqMonth;

  try {
    // Get today's date in Philippine time (UTC+8)
    const todayStr = getPHToday();

    // Today's transactions — count washes/drop-offs today
    let todayQuery = `
      SELECT COALESCE(COUNT(*), 0) as count, 
             COALESCE(SUM(weight_kg), 0) as weight
      FROM laundry_transactions
      WHERE date::text = $1
    `;
    let todayParams = [todayStr];
    if (branchId) {
      todayQuery += ` AND branch_id = $2`;
      todayParams.push(branchId);
    }
    const todayTxsRes = await query(todayQuery, todayParams);
    const totalTransactionsToday = parseInt(todayTxsRes.rows[0].count, 10);
    const totalKgWashedToday = Number(todayTxsRes.rows[0].weight);

    // Today's collected revenue: all claimed/paid transactions today (claimed today or walk-in today)
    let todayRevQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM laundry_transactions
      WHERE picked_up = true
        AND (
          (picked_up_at AT TIME ZONE 'Asia/Manila')::date::text = $1
          OR date::text = $1
        )
    `;
    let todayRevParams = [todayStr];
    if (branchId) {
      todayRevQuery += ` AND branch_id = $2`;
      todayRevParams.push(branchId);
    }
    const todayRevRes = await query(todayRevQuery, todayRevParams);
    const totalRevenueToday = Number(todayRevRes.rows[0].revenue);
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

    // All transactions — fetch date as plain text to avoid pg driver UTC shift
    // Income is counted on the drop-off date (date column) when the transaction is claimed (picked_up = true)
    let txsQuery = `
      SELECT date::text as "dateStr", total_amount as "totalAmount", 
             payment_method as "paymentMethod", picked_up as "pickedUp"
      FROM laundry_transactions
    `;
    let txsParams = [];
    if (branchId) {
      txsQuery += ` WHERE branch_id = $1`;
      txsParams.push(branchId);
    }
    const txsRes = await query(txsQuery, txsParams);
    const allTransactions = txsRes.rows;

    // All expenses
    let expensesQuery = `
      SELECT category, amount, date::text as "dateStr"
      FROM expenses
    `;
    let expensesParams = [];
    if (branchId) {
      expensesQuery += ` WHERE branch_id = $1`;
      expensesParams.push(branchId);
    }
    const expensesRes = await query(expensesQuery, expensesParams);
    const allExpenses = expensesRes.rows;

    // Filter transactions by year/month using the dateStr 'YYYY-MM-DD'
    const filteredTxs = allTransactions.filter(t => {
      if (!t.dateStr) return false;
      const [y, m] = t.dateStr.split('-').map(Number);
      if (isAnnual) {
        return y === targetYear;
      } else {
        return y === targetYear && m === targetMonth;
      }
    });

    // Filter expenses by year/month
    const filteredExpenses = allExpenses.filter(e => {
      if (!e.dateStr) return false;
      const [y, m] = e.dateStr.split('-').map(Number);
      if (isAnnual) {
        return y === targetYear;
      } else {
        return y === targetYear && m === targetMonth;
      }
    });

    // Aggregations — revenue only when claimed/picked up
    const claimedFilteredTxs = filteredTxs.filter(t => t.pickedUp === true);
    const totalRevenue = claimedFilteredTxs.reduce((sum, curr) => sum + Number(curr.totalAmount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, curr) => sum + Number(curr.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    // incomeByDate — grouped by drop-off date, only claimed transactions, sorted ascending
    const revenueByDateMap = {};
    claimedFilteredTxs.forEach(t => {
      const dStr = t.dateStr;
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

    // incomeByService (revenue by laundry service, claimed only)
    let serviceItemsQuery = `
      SELECT i.quantity, i.price_at_transaction as "priceAtTransaction", 
             s.name as "serviceName", t.date::text as "dateStr", t.picked_up as "pickedUp"
      FROM transaction_service_items i
      JOIN laundry_services s ON i.service_id = s.id
      JOIN laundry_transactions t ON i.transaction_id = t.id
    `;
    let serviceItemsParams = [];
    if (branchId) {
      serviceItemsQuery += ` WHERE t.branch_id = $1`;
      serviceItemsParams.push(branchId);
    }
    const serviceItemsRes = await query(serviceItemsQuery, serviceItemsParams);
    const allServiceItems = serviceItemsRes.rows;

    const filteredServiceItems = allServiceItems.filter(item => {
      if (!item.dateStr || !item.pickedUp) return false;
      const [y, m] = item.dateStr.split('-').map(Number);
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

    // Mode of Payment (mopBreakdown, claimed only)
    let cashSum = 0.0;
    let gcashSum = 0.0;
    claimedFilteredTxs.forEach(t => {
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

    // Monthly Financials timeline (past 6 months, claimed only for revenue)
    const monthlyRevenueMap = {};
    allTransactions.forEach(t => {
      if (t.pickedUp && t.dateStr && t.totalAmount) {
        const ym = t.dateStr.substring(0, 7); // 'YYYY-MM'
        monthlyRevenueMap[ym] = (monthlyRevenueMap[ym] || 0) + Number(t.totalAmount);
      }
    });

    const monthlyExpensesMap = {};
    allExpenses.forEach(e => {
      if (e.dateStr && e.amount) {
        const ym = e.dateStr.substring(0, 7); // 'YYYY-MM'
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
      totalRevenueToday,
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
