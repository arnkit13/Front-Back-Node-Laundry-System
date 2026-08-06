import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All user routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ROLE_ADMIN'));

// Helper to format user row into nested JSON structure expected by frontend
const formatUser = (row) => {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    fullName: row.fullName,
    role: row.role,
    active: row.active,
    createdAt: row.createdAt,
    branch: row.branchId ? {
      id: Number(row.branchId),
      name: row.branchName,
      location: row.branchLocation
    } : null
  };
};

router.get('/', async (req, res) => {
  try {
    const usersRes = await query(`
      SELECT u.id, u.username, u.full_name as "fullName", u.role, u.active, u.created_at as "createdAt",
             u.branch_id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      ORDER BY u.id ASC
    `);
    return res.json(usersRes.rows.map(formatUser));
  } catch (err) {
    console.error("Get users list failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const userRes = await query(`
      SELECT u.id, u.username, u.full_name as "fullName", u.role, u.active, u.created_at as "createdAt",
             u.branch_id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = $1
    `, [id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found with id: " + id });
    }

    return res.json(formatUser(userRes.rows[0]));
  } catch (err) {
    console.error("Get user failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post('/', async (req, res) => {
  const { username, password, fullName, role, active, branchId } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }
  if (!password) {
    return res.status(400).json({ message: "Password is required for new user!" });
  }
  if (!fullName) {
    return res.status(400).json({ message: "Full name is required" });
  }
  if (!role) {
    return res.status(400).json({ message: "Role is required" });
  }

  try {
    // Check duplicate username
    const checkRes = await query('SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)', [username]);
    if (checkRes.rows[0].exists) {
      return res.status(400).json({ message: "Error: Username is already taken!" });
    }

    // Verify branch if branchId provided
    let verifiedBranchId = null;
    if (branchId) {
      const branchRes = await query('SELECT id FROM branches WHERE id = $1', [branchId]);
      if (branchRes.rows.length === 0) {
        return res.status(400).json({ message: "Error: Branch not found with id: " + branchId });
      }
      verifiedBranchId = branchRes.rows[0].id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userActive = active !== undefined ? active : true;

    const insertRes = await query(`
      INSERT INTO users (username, password, full_name, role, active, branch_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, username, full_name as "fullName", role, active, created_at as "createdAt"
    `, [username, hashedPassword, fullName, role, userActive, verifiedBranchId]);

    // Fetch full user with branch details to return
    const finalUserRes = await query(`
      SELECT u.id, u.username, u.full_name as "fullName", u.role, u.active, u.created_at as "createdAt",
             u.branch_id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = $1
    `, [insertRes.rows[0].id]);

    return res.json(formatUser(finalUserRes.rows[0]));
  } catch (err) {
    console.error("Create user failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, fullName, role, active, branchId } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }
  if (!fullName) {
    return res.status(400).json({ message: "Full name is required" });
  }
  if (!role) {
    return res.status(400).json({ message: "Role is required" });
  }

  try {
    // Check user exists
    const checkUserRes = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkUserRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found with id: " + id });
    }
    const existingUser = checkUserRes.rows[0];

    // Check duplicate username if username changes
    if (username !== existingUser.username) {
      const checkRes = await query('SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)', [username]);
      if (checkRes.rows[0].exists) {
        return res.status(400).json({ message: "Error: Username is already taken!" });
      }
    }

    // Verify branch if branchId provided
    let verifiedBranchId = null;
    if (branchId) {
      const branchRes = await query('SELECT id FROM branches WHERE id = $1', [branchId]);
      if (branchRes.rows.length === 0) {
        return res.status(400).json({ message: "Error: Branch not found with id: " + branchId });
      }
      verifiedBranchId = branchRes.rows[0].id;
    }

    let updatedPassword = existingUser.password;
    if (password && password.trim() !== "") {
      updatedPassword = await bcrypt.hash(password, 10);
    }

    const userActive = active !== undefined ? active : existingUser.active;

    await query(`
      UPDATE users 
      SET username = $1, password = $2, full_name = $3, role = $4, active = $5, branch_id = $6
      WHERE id = $7
    `, [username, updatedPassword, fullName, role, userActive, verifiedBranchId, id]);

    // Fetch full user with branch details to return
    const finalUserRes = await query(`
      SELECT u.id, u.username, u.full_name as "fullName", u.role, u.active, u.created_at as "createdAt",
             u.branch_id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = $1
    `, [id]);

    return res.json(formatUser(finalUserRes.rows[0]));
  } catch (err) {
    console.error("Update user failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const checkRes = await query('SELECT id, active FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found with id: " + id });
    }

    const newActive = !checkRes.rows[0].active;
    await query('UPDATE users SET active = $1 WHERE id = $2', [newActive, id]);

    const finalUserRes = await query(`
      SELECT u.id, u.username, u.full_name as "fullName", u.role, u.active, u.created_at as "createdAt",
             u.branch_id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = $1
    `, [id]);

    return res.json(formatUser(finalUserRes.rows[0]));
  } catch (err) {
    console.error("Toggle user failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const checkRes = await query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found with id: " + id });
    }

    // Check if user has transaction records
    const txCheck = await query('SELECT EXISTS(SELECT 1 FROM laundry_transactions WHERE user_id = $1)', [id]);
    const hasTransactions = txCheck.rows[0].exists;

    // Check if user has performed stock logs
    const historyCheck = await query('SELECT EXISTS(SELECT 1 FROM soap_inventory_history WHERE performed_by = $1)', [id]);
    const hasInventoryHistory = historyCheck.rows[0].exists;

    if (hasTransactions) {
      await query('UPDATE laundry_transactions SET user_id = NULL WHERE user_id = $1', [id]);
    }
    if (hasInventoryHistory) {
      await query('UPDATE soap_inventory_history SET performed_by = NULL WHERE performed_by = $1', [id]);
    }

    await query('DELETE FROM users WHERE id = $1', [id]);
    return res.json({ message: "Employee account deleted successfully." });
  } catch (err) {
    console.error("Delete user failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
