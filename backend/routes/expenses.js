import express from 'express';
import { query, getClient } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('ROLE_ADMIN'));

let lastInitDateString = null;

const formatExpense = (row) => {
  if (!row) return null;
  // Format date to local YYYY-MM-DD
  let dateStr = row.date;
  if (row.date instanceof Date) {
    dateStr = row.date.toISOString().split('T')[0];
  }
  return {
    id: Number(row.id),
    category: row.category,
    amount: Number(row.amount),
    date: dateStr,
    description: row.description,
    createdAt: row.createdAt,
    branch: row.branchId ? {
      id: Number(row.branchId),
      name: row.branchName,
      location: row.branchLocation
    } : null
  };
};

// GET /api/expenses (Admin only)
router.get('/', async (req, res) => {
  const client = await getClient();
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Retrieve all expenses
    const expensesRes = await client.query(`
      SELECT e.id, e.category, e.amount, e.date, e.description, e.created_at as "createdAt",
             e.branch_id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM expenses e
      LEFT JOIN branches b ON e.branch_id = b.id
      ORDER BY e.date DESC, e.id DESC
    `);
    
    let allExpenses = expensesRes.rows;

    let alreadyInitialized = (lastInitDateString !== null && lastInitDateString === todayStr);
    
    if (!alreadyInitialized) {
      const hasTodayPlaceholder = allExpenses.some(e => {
        const dStr = e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date;
        return dStr === todayStr && Math.abs(Number(e.amount)) < 0.001;
      });
      if (hasTodayPlaceholder) {
        lastInitDateString = todayStr;
        alreadyInitialized = true;
      }
    }

    if (!alreadyInitialized) {
      await client.query('BEGIN');
      
      const categories = [
        "Utilities", "Payroll", "Detergent", "Maintenance", "Fabric conditioner",
        "xonrox", "tape", "cellophane", "GASOL", "SALARY", "ELECTRIC BILL", "WATER BILL"
      ];
      
      let updated = false;

      for (const category of categories) {
        // Find existing zero-expense for this category
        const zeroExpense = allExpenses.find(e => 
          e.category && e.category.toLowerCase() === category.toLowerCase() && Math.abs(Number(e.amount)) < 0.001
        );

        if (zeroExpense) {
          const zeroExpenseDateStr = zeroExpense.date instanceof Date 
            ? zeroExpense.date.toISOString().split('T')[0] 
            : zeroExpense.date;

          if (zeroExpenseDateStr !== todayStr) {
            await client.query(`
              UPDATE expenses
              SET date = $1
              WHERE id = $2
            `, [todayStr, zeroExpense.id]);
            updated = true;
          }
        } else {
          await client.query(`
            INSERT INTO expenses (category, amount, date, description, branch_id, created_at)
            VALUES ($1, 0.0, $2, 'Auto-generated placeholder', null, NOW())
          `, [category, todayStr]);
          updated = true;
        }
      }

      await client.query('COMMIT');
      lastInitDateString = todayStr;

      if (updated) {
        // Refetch updated expenses list
        const refetchRes = await client.query(`
          SELECT e.id, e.category, e.amount, e.date, e.description, e.created_at as "createdAt",
                 e.branch_id as "branchId", b.name as "branchName", b.location as "branchLocation"
          FROM expenses e
          LEFT JOIN branches b ON e.branch_id = b.id
          ORDER BY e.date DESC, e.id DESC
        `);
        allExpenses = refetchRes.rows;
      }
    }

    return res.json(allExpenses.map(formatExpense));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Get expenses list failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

// POST /api/expenses (Admin only)
router.post('/', async (req, res) => {
  const { category, amount, date, description, branch } = req.body;

  if (!category || amount === undefined || !date) {
    return res.status(400).json({ message: "Category, amount, and date are required" });
  }

  const branchId = branch && branch.id ? Number(branch.id) : null;

  try {
    if (branchId) {
      const branchCheck = await query('SELECT 1 FROM branches WHERE id = $1', [branchId]);
      if (branchCheck.rows.length === 0) {
        return res.status(400).json({ message: "Error: Branch not found with id: " + branchId });
      }
    }

    const insertRes = await query(`
      INSERT INTO expenses (category, amount, date, description, branch_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, [category, Number(amount), date, description || null, branchId]);

    const createdId = insertRes.rows[0].id;

    // Fetch details to return full object
    const finalRes = await query(`
      SELECT e.id, e.category, e.amount, e.date, e.description, e.created_at as "createdAt",
             e.branch_id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM expenses e
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.id = $1
    `, [createdId]);

    return res.json(formatExpense(finalRes.rows[0]));
  } catch (err) {
    console.error("Create expense failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /api/expenses/:id (Admin only)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { category, amount, date, description, branch } = req.body;

  if (!category || amount === undefined || !date) {
    return res.status(400).json({ message: "Category, amount, and date are required" });
  }

  const branchId = branch && branch.id ? Number(branch.id) : null;

  try {
    const checkRes = await query('SELECT 1 FROM expenses WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found with id: " + id });
    }

    if (branchId) {
      const branchCheck = await query('SELECT 1 FROM branches WHERE id = $1', [branchId]);
      if (branchCheck.rows.length === 0) {
        return res.status(400).json({ message: "Error: Branch not found with id: " + branchId });
      }
    }

    await query(`
      UPDATE expenses
      SET category = $1, amount = $2, date = $3, description = $4, branch_id = $5
      WHERE id = $6
    `, [category, Number(amount), date, description || null, branchId, id]);

    // Fetch details to return full object
    const finalRes = await query(`
      SELECT e.id, e.category, e.amount, e.date, e.description, e.created_at as "createdAt",
             e.branch_id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM expenses e
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.id = $1
    `, [id]);

    return res.json(formatExpense(finalRes.rows[0]));
  } catch (err) {
    console.error("Update expense failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/expenses/:id (Admin only)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const checkRes = await query('SELECT 1 FROM expenses WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found with id: " + id });
    }

    await query('DELETE FROM expenses WHERE id = $1', [id]);
    return res.json({ message: "Expense entry deleted successfully." });
  } catch (err) {
    console.error("Delete expense failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
