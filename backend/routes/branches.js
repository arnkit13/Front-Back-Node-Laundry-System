import express from 'express';
import { query, getClient } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/branches (Any authenticated user can read)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branchesRes = await query(`
      SELECT id, name, location, machines_config as "machinesConfig", created_at as "createdAt"
      FROM branches
      ORDER BY id ASC
    `);
    
    const branches = branchesRes.rows.map(b => ({
      id: Number(b.id),
      name: b.name,
      location: b.location,
      machinesConfig: b.machinesConfig,
      createdAt: b.createdAt
    }));
    
    return res.json(branches);
  } catch (err) {
    console.error("Get branches failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/branches (Admin only)
router.post('/', authenticateToken, requireRole('ROLE_ADMIN'), async (req, res) => {
  const { name, location, machinesConfig } = req.body;

  if (!name || !location) {
    return res.status(400).json({ message: "Branch name and location are required" });
  }

  const configStr = machinesConfig || "Machine 1:true,Machine 2:true,Machine 3:true,Machine 4:true";

  try {
    const insertRes = await query(`
      INSERT INTO branches (name, location, machines_config, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, name, location, machines_config as "machinesConfig", created_at as "createdAt"
    `, [name, location, configStr]);

    const created = insertRes.rows[0];
    return res.json({
      id: Number(created.id),
      name: created.name,
      location: created.location,
      machinesConfig: created.machinesConfig,
      createdAt: created.createdAt
    });
  } catch (err) {
    console.error("Create branch failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /api/branches/:id (Admin only)
router.put('/:id', authenticateToken, requireRole('ROLE_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, location, machinesConfig } = req.body;

  if (!name || !location) {
    return res.status(400).json({ message: "Branch name and location are required" });
  }

  try {
    const checkRes = await query('SELECT * FROM branches WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: "Branch not found with id: " + id });
    }

    const configStr = machinesConfig !== undefined ? machinesConfig : checkRes.rows[0].machines_config;

    const updateRes = await query(`
      UPDATE branches
      SET name = $1, location = $2, machines_config = $3
      WHERE id = $4
      RETURNING id, name, location, machines_config as "machinesConfig", created_at as "createdAt"
    `, [name, location, configStr, id]);

    const updated = updateRes.rows[0];
    return res.json({
      id: Number(updated.id),
      name: updated.name,
      location: updated.location,
      machinesConfig: updated.machinesConfig,
      createdAt: updated.createdAt
    });
  } catch (err) {
    console.error("Update branch failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/branches/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole('ROLE_ADMIN'), async (req, res) => {
  const { id } = req.params;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const checkRes = await client.query('SELECT * FROM branches WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Branch not found with id: " + id });
    }

    // Update users referencing this branch to null
    await client.query('UPDATE users SET branch_id = NULL WHERE branch_id = $1', [id]);

    // Update transactions referencing this branch to null
    await client.query('UPDATE laundry_transactions SET branch_id = NULL WHERE branch_id = $1', [id]);

    // Update expenses referencing this branch to null
    await client.query('UPDATE expenses SET branch_id = NULL WHERE branch_id = $1', [id]);

    // Delete the branch
    await client.query('DELETE FROM branches WHERE id = $1', [id]);

    await client.query('COMMIT');
    return res.json({ message: "Branch deleted successfully." });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Delete branch failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
