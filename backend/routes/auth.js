import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'laundryInventoryManagementSystemSecretKeyMustBe32BytesLong';
const JWT_EXPIRATION_MS = parseInt(process.env.JWT_EXPIRATION_MS || '86400000', 10);

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    // Retrieve user and join branch details
    const userRes = await query(`
      SELECT u.id, u.username, u.password, u.full_name as "fullName", u.role, u.active, u.branch_id as "branchId", b.name as "branchName"
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.username = $1
    `, [username]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: "Bad credentials" });
    }

    const user = userRes.rows[0];

    // Check active status
    if (!user.active) {
      return res.status(401).json({ message: "User account is deactivated" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Bad credentials" });
    }

    // Generate JWT
    const token = jwt.sign({ sub: user.username }, JWT_SECRET, {
      expiresIn: `${JWT_EXPIRATION_MS / 1000}s`
    });

    // Return JwtResponse
    return res.json({
      token,
      id: Number(user.id),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      branchName: user.branchName || null,
      branchId: user.branchId ? Number(user.branchId) : null
    });
  } catch (err) {
    console.error("Login endpoint error:", err);
    return res.status(500).json({ message: "Internal server error occurred" });
  }
});

router.get('/health', (req, res) => {
  return res.send("OK");
});

export default router;
