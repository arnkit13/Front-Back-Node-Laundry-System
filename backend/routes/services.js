import express from 'express';
import { query, getClient } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/services (Anyone authenticated)
router.get('/', async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const defaultServices = [
      { name: "Basic Service", rate: 180.0, unit: "service" },
      { name: "Comforter", rate: 180.0, unit: "pc" },
      { name: "Extra Wash", rate: 20.0, unit: "wash" },
      { name: "Extra Rinse", rate: 20.0, unit: "rinse" },
      { name: "Extra Dry", rate: 30.0, unit: "dry" },
      { name: "Extra Kilo", rate: 20.0, unit: "kilo" },
      { name: "Detergent", rate: 10.0, unit: "sachet" },
      { name: "SELF SERVICE", rate: 100.0, unit: "LOAD" },
      { name: "FREE", rate: 0.0, unit: "LOAD" },
      { name: "BEDSHEETS", rate: 180.0, unit: "" },
      { name: "SOFTENER", rate: 10.0, unit: "" },
      { name: "ICE", rate: 15.0, unit: "PACK" }
    ];

    // Seed missing standard services dynamically, just like Java does
    for (const seed of defaultServices) {
      const checkRes = await client.query('SELECT 1 FROM laundry_services WHERE LOWER(name) = LOWER($1)', [seed.name]);
      if (checkRes.rows.length === 0) {
        await client.query(`
          INSERT INTO laundry_services (name, rate, unit, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [seed.name, seed.rate, seed.unit]);
      }
    }

    await client.query('COMMIT');

    const servicesRes = await query(`
      SELECT id, name, rate, unit, created_at as "createdAt", updated_at as "updatedAt"
      FROM laundry_services
      ORDER BY id ASC
    `);

    const services = servicesRes.rows.map(s => ({
      id: Number(s.id),
      name: s.name,
      rate: Number(s.rate),
      unit: s.unit,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return res.json(services);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Get / Seed services failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

// POST /api/services (Admin only)
router.post('/', requireRole('ROLE_ADMIN'), async (req, res) => {
  const { name, rate, unit } = req.body;

  if (!name || rate === undefined || unit === undefined) {
    return res.status(400).json({ message: "Service name, rate and unit are required" });
  }

  try {
    // Check duplicate name
    const checkRes = await query('SELECT EXISTS(SELECT 1 FROM laundry_services WHERE LOWER(name) = LOWER($1))', [name]);
    if (checkRes.rows[0].exists) {
      return res.status(400).json({ message: `Service with name '${name}' already exists.` });
    }

    const insertRes = await query(`
      INSERT INTO laundry_services (name, rate, unit, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name, rate, unit, created_at as "createdAt", updated_at as "updatedAt"
    `, [name, Number(rate), unit]);

    const created = insertRes.rows[0];
    return res.json({
      id: Number(created.id),
      name: created.name,
      rate: Number(created.rate),
      unit: created.unit,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    });
  } catch (err) {
    console.error("Create service failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /api/services/:id (Admin only)
router.put('/:id', requireRole('ROLE_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, rate, unit } = req.body;

  if (!name || rate === undefined || unit === undefined) {
    return res.status(400).json({ message: "Service name, rate and unit are required" });
  }

  try {
    const checkRes = await query('SELECT * FROM laundry_services WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: "Laundry service not found with id: " + id });
    }

    // Check duplicate name on other services
    const nameCheck = await query('SELECT EXISTS(SELECT 1 FROM laundry_services WHERE LOWER(name) = LOWER($1) AND id <> $2)', [name, id]);
    if (nameCheck.rows[0].exists) {
      return res.status(400).json({ message: `Service with name '${name}' already exists.` });
    }

    const updateRes = await query(`
      UPDATE laundry_services
      SET name = $1, rate = $2, unit = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, rate, unit, created_at as "createdAt", updated_at as "updatedAt"
    `, [name, Number(rate), unit, id]);

    const updated = updateRes.rows[0];
    return res.json({
      id: Number(updated.id),
      name: updated.name,
      rate: Number(updated.rate),
      unit: updated.unit,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    });
  } catch (err) {
    console.error("Update service failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/services/:id (Admin only)
router.delete('/:id', requireRole('ROLE_ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const checkRes = await query('SELECT * FROM laundry_services WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: "Laundry service not found with id: " + id });
    }

    await query('DELETE FROM laundry_services WHERE id = $1', [id]);
    return res.json({ message: "Service deleted successfully." });
  } catch (err) {
    console.error("Delete service failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
