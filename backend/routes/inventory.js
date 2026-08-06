import express from 'express';
import { query, getClient } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/inventory (Authenticated)
router.get('/', async (req, res) => {
  try {
    const productsRes = await query(`
      SELECT id, name, quantity, unit, min_stock as "minStock", initial_stock as "initialStock", created_at as "createdAt", updated_at as "updatedAt"
      FROM soap_products
      ORDER BY id ASC
    `);
    
    const products = productsRes.rows.map(p => ({
      id: Number(p.id),
      name: p.name,
      quantity: Number(p.quantity),
      unit: p.unit,
      minStock: p.minStock !== null ? Number(p.minStock) : 20.0,
      initialStock: p.initialStock !== null ? Number(p.initialStock) : 0.0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return res.json(products);
  } catch (err) {
    console.error("Get inventory list failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/inventory (Admin only)
router.post('/', requireRole('ROLE_ADMIN'), async (req, res) => {
  const { name, quantity, unit, minStock } = req.body;

  if (!name || quantity === undefined || !unit) {
    return res.status(400).json({ message: "Product name, quantity and unit are required" });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check duplicate name
    const checkRes = await client.query('SELECT EXISTS(SELECT 1 FROM soap_products WHERE name = $1)', [name]);
    if (checkRes.rows[0].exists) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Error: Product name already exists!" });
    }

    const minStockVal = minStock !== undefined ? minStock : 20.0;
    const initialQty = Number(quantity);

    const productRes = await client.query(`
      INSERT INTO soap_products (name, quantity, unit, min_stock, initial_stock, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, name, quantity, unit, min_stock as "minStock", initial_stock as "initialStock", created_at as "createdAt", updated_at as "updatedAt"
    `, [name, initialQty, unit, minStockVal, initialQty]);

    const createdProduct = productRes.rows[0];

    // Log history
    await client.query(`
      INSERT INTO soap_inventory_history (soap_product_id, transaction_type, quantity_changed, previous_quantity, new_quantity, notes, performed_by, created_at)
      VALUES ($1, 'ADD_STOCK', $2, 0.0, $3, 'Initial product registration', $4, NOW())
    `, [createdProduct.id, initialQty, initialQty, req.user.id]);

    await client.query('COMMIT');
    
    return res.json({
      id: Number(createdProduct.id),
      name: createdProduct.name,
      quantity: Number(createdProduct.quantity),
      unit: createdProduct.unit,
      minStock: Number(createdProduct.minStock),
      initialStock: Number(createdProduct.initialStock),
      createdAt: createdProduct.createdAt,
      updatedAt: createdProduct.updatedAt
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Add inventory product failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

// PUT /api/inventory/:id/adjust (Admin only)
router.put('/:id/adjust', requireRole('ROLE_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const quantityChanged = Number(req.body.quantityChanged);
  const minStock = req.body.minStock !== undefined && req.body.minStock !== null ? Number(req.body.minStock) : null;
  const notes = req.body.notes || "Manual stock adjustment";

  if (isNaN(quantityChanged)) {
    return res.status(400).json({ message: "Quantity changed must be a valid number" });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const checkRes = await client.query('SELECT * FROM soap_products WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Product not found with id: " + id });
    }

    const product = checkRes.rows[0];
    const oldQuantity = Number(product.quantity);
    const newQuantity = oldQuantity + quantityChanged;

    if (newQuantity < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Error: Stock cannot be negative! Current stock is ${oldQuantity} ${product.unit}`
      });
    }

    const minStockVal = minStock !== null ? minStock : product.min_stock;

    const updateRes = await client.query(`
      UPDATE soap_products
      SET quantity = $1, min_stock = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, quantity, unit, min_stock as "minStock", initial_stock as "initialStock", created_at as "createdAt", updated_at as "updatedAt"
    `, [newQuantity, minStockVal, id]);

    const updatedProduct = updateRes.rows[0];

    // Log history
    await client.query(`
      INSERT INTO soap_inventory_history (soap_product_id, transaction_type, quantity_changed, previous_quantity, new_quantity, notes, performed_by, created_at)
      VALUES ($1, 'ADJUST_STOCK', $2, $3, $4, $5, $6, NOW())
    `, [id, quantityChanged, oldQuantity, newQuantity, notes, req.user.id]);

    await client.query('COMMIT');
    
    return res.json({
      id: Number(updatedProduct.id),
      name: updatedProduct.name,
      quantity: Number(updatedProduct.quantity),
      unit: updatedProduct.unit,
      minStock: Number(updatedProduct.minStock),
      initialStock: Number(updatedProduct.initialStock),
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Adjust stock failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

// GET /api/inventory/history (Admin only)
router.get('/history', requireRole('ROLE_ADMIN'), async (req, res) => {
  try {
    const historyRes = await query(`
      SELECT h.id, h.transaction_type as "transactionType", h.quantity_changed as "quantityChanged", 
             h.previous_quantity as "previousQuantity", h.new_quantity as "newQuantity", h.notes, h.created_at as "createdAt", 
             p.id as "productId", p.name as "productName", p.unit as "productUnit",
             u.id as "userId", u.full_name as "userFullName"
      FROM soap_inventory_history h
      JOIN soap_products p ON h.soap_product_id = p.id
      LEFT JOIN users u ON h.performed_by = u.id
      ORDER BY h.created_at DESC
    `);

    const history = historyRes.rows.map(row => ({
      id: Number(row.id),
      transactionType: row.transactionType,
      quantityChanged: Number(row.quantityChanged),
      previousQuantity: Number(row.previousQuantity),
      newQuantity: Number(row.newQuantity),
      notes: row.notes,
      createdAt: row.createdAt,
      soapProduct: {
        id: Number(row.productId),
        name: row.productName,
        unit: row.productUnit
      },
      performedBy: row.userId ? {
        id: Number(row.userId),
        fullName: row.userFullName
      } : {
        id: 0,
        fullName: 'System/Deleted Employee'
      }
    }));

    return res.json(history);
  } catch (err) {
    console.error("Get inventory history failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/inventory/:id (Admin only)
router.delete('/:id', requireRole('ROLE_ADMIN'), async (req, res) => {
  const { id } = req.params;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const checkRes = await client.query('SELECT * FROM soap_products WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Product not found with id: " + id });
    }

    // Check if used in transactions
    const txCheck = await client.query('SELECT EXISTS(SELECT 1 FROM laundry_transactions WHERE soap_product_id = $1)', [id]);
    const hasTransactions = txCheck.rows[0].exists;

    // Count history logs
    const historyCheck = await client.query('SELECT COUNT(*) FROM soap_inventory_history WHERE soap_product_id = $1', [id]);
    const historyCount = parseInt(historyCheck.rows[0].count, 10);

    if (hasTransactions || historyCount > 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: "Cannot delete soap product because it has been used in laundry washes or has manual stock adjustments."
      });
    }

    // Delete history and then the product
    await client.query('DELETE FROM soap_inventory_history WHERE soap_product_id = $1', [id]);
    await client.query('DELETE FROM soap_products WHERE id = $1', [id]);

    await client.query('COMMIT');
    return res.json({ message: "Product deleted successfully." });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Delete product failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
