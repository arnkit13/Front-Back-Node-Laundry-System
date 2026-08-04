import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('ROLE_ADMIN'));

// ISO-8601 Week string generator: YYYY-Www
function getISOWeekString(dateObj) {
  const d = new Date(dateObj);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  const year = d.getFullYear();
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

// Month name and year generator: "MMMM YYYY"
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function getMonthYearString(dateObj) {
  const d = new Date(dateObj);
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function getSortableMonthString(dateObj) {
  const d = new Date(dateObj);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getFilteredTransactions(branchId) {
  let txRes;
  if (branchId) {
    txRes = await query(`
      SELECT t.id, t.date, t.customer_name as "customerName", t.weight_kg as "weightKg", 
             t.soap_used_qty as "soapUsedQty", t.machine_number as "machineNumber", 
             t.total_amount as "totalAmount", b.name as "branchName"
      FROM laundry_transactions t
      LEFT JOIN branches b ON t.branch_id = b.id
      WHERE t.branch_id = $1
    `, [branchId]);
  } else {
    txRes = await query(`
      SELECT t.id, t.date, t.customer_name as "customerName", t.weight_kg as "weightKg", 
             t.soap_used_qty as "soapUsedQty", t.machine_number as "machineNumber", 
             t.total_amount as "totalAmount", b.name as "branchName"
      FROM laundry_transactions t
      LEFT JOIN branches b ON t.branch_id = b.id
    `);
  }
  return txRes.rows;
}

function generateReportSummaries(transactions, groupingKeyFn, sortingFn) {
  const groupings = {};
  
  transactions.forEach(t => {
    // Format date field properly if it is a Date object
    const rawDate = t.date;
    const key = groupingKeyFn(rawDate);
    
    if (!groupings[key]) {
      groupings[key] = {
        period: key,
        transactions: []
      };
    }
    groupings[key].transactions.push(t);
  });

  const reportSummaries = Object.values(groupings).map(group => {
    const list = group.transactions;
    const totalKg = list.reduce((sum, curr) => sum + Number(curr.weightKg || 0), 0);
    const totalSoap = list.reduce((sum, curr) => sum + Number(curr.soapUsedQty || 0), 0);
    const totalRevenue = list.reduce((sum, curr) => sum + Number(curr.totalAmount || 0), 0);

    // Count unique customer names
    const customers = new Set();
    list.forEach(item => {
      if (item.customerName && item.customerName.trim() !== "") {
        customers.add(item.customerName.trim().toLowerCase());
      }
    });
    let customerCount = customers.size;
    if (customerCount === 0) {
      customerCount = list.length;
    }

    // Machine usage counts
    const machineUsage = {};
    list.forEach(item => {
      if (item.machineNumber && item.machineNumber.trim() !== "") {
        const m = item.machineNumber.trim();
        machineUsage[m] = (machineUsage[m] || 0) + 1;
      }
    });

    // Branch usage counts
    const branchUsage = {};
    list.forEach(item => {
      if (item.branchName) {
        branchUsage[item.branchName] = (branchUsage[item.branchName] || 0) + 1;
      }
    });

    return {
      period: group.period,
      transactionCount: list.length,
      totalKgWashed: totalKg,
      totalSoapUsed: totalSoap,
      machineUsage,
      branchUsage,
      customerCount,
      totalRevenue
    };
  });

  return reportSummaries.sort(sortingFn);
}

// GET /api/reports/daily
router.get('/daily', async (req, res) => {
  const branchId = req.query.branchId ? Number(req.query.branchId) : null;
  try {
    const transactions = await getFilteredTransactions(branchId);
    const summaries = generateReportSummaries(
      transactions,
      (date) => date instanceof Date ? date.toISOString().split('T')[0] : date,
      (a, b) => b.period.localeCompare(a.period) // Descending sorted dates
    );
    return res.json(summaries);
  } catch (err) {
    console.error("Daily report failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/reports/weekly
router.get('/weekly', async (req, res) => {
  const branchId = req.query.branchId ? Number(req.query.branchId) : null;
  try {
    const transactions = await getFilteredTransactions(branchId);
    const summaries = generateReportSummaries(
      transactions,
      getISOWeekString,
      (a, b) => b.period.localeCompare(a.period) // Descending sorted week string
    );
    return res.json(summaries);
  } catch (err) {
    console.error("Weekly report failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/reports/monthly
router.get('/monthly', async (req, res) => {
  const branchId = req.query.branchId ? Number(req.query.branchId) : null;
  try {
    const transactions = await getFilteredTransactions(branchId);
    
    // Grouping by "YYYY-MM" to sort, then map back to MMMM YYYY label
    const groupings = {};
    transactions.forEach(t => {
      const rawDate = t.date;
      const sortKey = getSortableMonthString(rawDate);
      const label = getMonthYearString(rawDate);
      
      if (!groupings[sortKey]) {
        groupings[sortKey] = {
          sortKey,
          label,
          transactions: []
        };
      }
      groupings[sortKey].transactions.push(t);
    });

    const reportSummaries = Object.values(groupings).map(group => {
      const list = group.transactions;
      const totalKg = list.reduce((sum, curr) => sum + Number(curr.weightKg || 0), 0);
      const totalSoap = list.reduce((sum, curr) => sum + Number(curr.soapUsedQty || 0), 0);
      const totalRevenue = list.reduce((sum, curr) => sum + Number(curr.totalAmount || 0), 0);

      const customers = new Set();
      list.forEach(item => {
        if (item.customerName && item.customerName.trim() !== "") {
          customers.add(item.customerName.trim().toLowerCase());
        }
      });
      let customerCount = customers.size;
      if (customerCount === 0) {
        customerCount = list.length;
      }

      const machineUsage = {};
      list.forEach(item => {
        if (item.machineNumber && item.machineNumber.trim() !== "") {
          const m = item.machineNumber.trim();
          machineUsage[m] = (machineUsage[m] || 0) + 1;
        }
      });

      const branchUsage = {};
      list.forEach(item => {
        if (item.branchName) {
          branchUsage[item.branchName] = (branchUsage[item.branchName] || 0) + 1;
        }
      });

      return {
        sortKey: group.sortKey,
        period: group.label,
        transactionCount: list.length,
        totalKgWashed: totalKg,
        totalSoapUsed: totalSoap,
        machineUsage,
        branchUsage,
        customerCount,
        totalRevenue
      };
    });

    // Sort descending by sortKey
    reportSummaries.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    
    // Remove sortKey before returning
    const finalSummaries = reportSummaries.map(({ sortKey, ...rest }) => rest);

    return res.json(finalSummaries);
  } catch (err) {
    console.error("Monthly report failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
