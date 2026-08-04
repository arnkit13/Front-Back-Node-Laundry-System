import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'laundryInventoryManagementSystemSecretKeyMustBe32BytesLong';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: "Access token is missing" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // In Java Spring Boot, the subject of the token is the username
    const username = decoded.sub || decoded.username;
    
    if (!username) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Fetch user and join branch to attach full user context
    const userRes = await query(`
      SELECT u.id, u.username, u.full_name as "fullName", u.role, u.active, u.branch_id as "branchId", b.name as "branchName"
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.username = $1
    `, [username]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    if (!user.active) {
      return res.status(401).json({ message: "User account is deactivated" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    
    next();
  };
};
