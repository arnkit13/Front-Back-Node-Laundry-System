import express from 'express';
import { query, getClient } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Helper to format date to local YYYY-MM-DD
const formatDate = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return dateVal;
};

// Helper to structure transaction response exactly as Spring Boot does
const assembleTransactionObj = (row, serviceItems = []) => {
  if (!row) return null;
  
  return {
    id: Number(row.id),
    date: formatDate(row.date),
    customerName: row.customerName,
    weightKg: Number(row.weightKg),
    soapUsedQty: Number(row.soapUsedQty),
    soapRemainingQty: Number(row.soapRemainingQty),
    machineNumber: row.machineNumber,
    paymentMethod: row.paymentMethod,
    referenceNumber: row.referenceNumber,
    totalAmount: row.totalAmount !== null ? Number(row.totalAmount) : 0.0,
    createdAt: row.createdAt,
    pickedUp: row.pickedUp,
    pickedUpAt: row.pickedUpAt || null,
    soapProduct: {
      id: Number(row.productId),
      name: row.productName,
      unit: row.productUnit
    },
    user: row.userId ? {
      id: Number(row.userId),
      username: row.username,
      fullName: row.userFullName
    } : {
      id: 0,
      username: 'deleted',
      fullName: 'System/Deleted Employee'
    },
    branch: row.branchId ? {
      id: Number(row.branchId),
      name: row.branchName,
      location: row.branchLocation
    } : null,
    serviceItems: serviceItems.map(item => ({
      id: Number(item.id),
      quantity: Number(item.quantity),
      priceAtTransaction: Number(item.priceAtTransaction),
      laundryService: {
        id: Number(item.serviceId),
        name: item.serviceName,
        rate: Number(item.serviceRate),
        unit: item.serviceUnit
      }
    }))
  };
};

// GET /api/transactions (Authenticated)
router.get('/', async (req, res) => {
  const isAdmin = req.user.role === 'ROLE_ADMIN';
  
  try {
    let txRes;
    if (isAdmin) {
      txRes = await query(`
        SELECT t.id, t.date, t.customer_name as "customerName", t.weight_kg as "weightKg", 
               t.soap_used_qty as "soapUsedQty", t.soap_remaining_qty as "soapRemainingQty", 
               t.machine_number as "machineNumber", t.payment_method as "paymentMethod", 
               t.reference_number as "referenceNumber", t.total_amount as "totalAmount", 
               t.created_at as "createdAt", t.picked_up as "pickedUp", t.picked_up_at as "pickedUpAt",
               p.id as "productId", p.name as "productName", p.unit as "productUnit",
               u.id as "userId", u.username, u.full_name as "userFullName",
               b.id as "branchId", b.name as "branchName", b.location as "branchLocation"
        FROM laundry_transactions t
        JOIN soap_products p ON t.soap_product_id = p.id
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN branches b ON t.branch_id = b.id
        ORDER BY t.id DESC
      `);
    } else {
      txRes = await query(`
        SELECT t.id, t.date, t.customer_name as "customerName", t.weight_kg as "weightKg", 
               t.soap_used_qty as "soapUsedQty", t.soap_remaining_qty as "soapRemainingQty", 
               t.machine_number as "machineNumber", t.payment_method as "paymentMethod", 
               t.reference_number as "referenceNumber", t.total_amount as "totalAmount", 
               t.created_at as "createdAt", t.picked_up as "pickedUp", t.picked_up_at as "pickedUpAt",
               p.id as "productId", p.name as "productName", p.unit as "productUnit",
               u.id as "userId", u.username, u.full_name as "userFullName",
               b.id as "branchId", b.name as "branchName", b.location as "branchLocation"
        FROM laundry_transactions t
        JOIN soap_products p ON t.soap_product_id = p.id
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN branches b ON t.branch_id = b.id
        WHERE t.user_id = $1
        ORDER BY t.date DESC, t.id DESC
      `, [req.user.id]);
    }

    const transactions = [];
    for (const row of txRes.rows) {
      // Fetch service items
      const itemsRes = await query(`
        SELECT i.id, i.quantity, i.price_at_transaction as "priceAtTransaction", 
               s.id as "serviceId", s.name as "serviceName", s.rate as "serviceRate", s.unit as "serviceUnit"
        FROM transaction_service_items i
        JOIN laundry_services s ON i.service_id = s.id
        WHERE i.transaction_id = $1
      `, [row.id]);

      transactions.push(assembleTransactionObj(row, itemsRes.rows));
    }

    return res.json(transactions);
  } catch (err) {
    console.error("Get transactions failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/transactions (Authenticated)
router.post('/', async (req, res) => {
  const {
    soapProductId,
    soapUsedQty,
    weightKg,
    date,
    customerName,
    machineNumber,
    paymentMethod,
    referenceNumber,
    services
  } = req.body;

  if (soapProductId === undefined || soapUsedQty === undefined || weightKg === undefined || !date) {
    return res.status(400).json({ message: "Required fields (soapProductId, soapUsedQty, weightKg, date) are missing" });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Retrieve soap product
    const productRes = await client.query('SELECT * FROM soap_products WHERE id = $1', [soapProductId]);
    if (productRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Soap product not found" });
    }
    const product = productRes.rows[0];
    const productQuantity = Number(product.quantity);
    const requestedQty = Number(soapUsedQty);

    if (productQuantity < requestedQty) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Error: Insufficient stock for ${product.name}. Available: ${productQuantity} ${product.unit}, Requested: ${requestedQty} ${product.unit}`
      });
    }

    // Deduct stock
    const newQuantity = productQuantity - requestedQty;
    await client.query(`
      UPDATE soap_products 
      SET quantity = $1, updated_at = NOW() 
      WHERE id = $2
    `, [newQuantity, soapProductId]);

    // Log history
    const historyNotes = `Used for customer transaction (Weight: ${weightKg} kg${customerName ? ', Customer: ' + customerName : ''})`;
    await client.query(`
      INSERT INTO soap_inventory_history (soap_product_id, transaction_type, quantity_changed, previous_quantity, new_quantity, notes, performed_by, created_at)
      VALUES ($1, 'USE_STOCK', $2, $3, $4, $5, $6, NOW())
    `, [soapProductId, -requestedQty, productQuantity, newQuantity, historyNotes, req.user.id]);

    // Insert transaction (initial total_amount is 0.0)
    const txInsertRes = await client.query(`
      INSERT INTO laundry_transactions (date, customer_name, weight_kg, soap_product_id, soap_used_qty, soap_remaining_qty, user_id, machine_number, branch_id, payment_method, reference_number, total_amount, created_at, picked_up, picked_up_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0.0, NOW(), false, null)
      RETURNING id
    `, [date, customerName || null, Number(weightKg), soapProductId, requestedQty, newQuantity, req.user.id, machineNumber || null, req.user.branchId || null, paymentMethod || null, referenceNumber || null]);

    const transactionId = txInsertRes.rows[0].id;
    let totalAmount = 0.0;
    const insertedItems = [];

    if (services && Array.isArray(services)) {
      for (const sReq of services) {
        // Fetch service catalog details
        const serviceRes = await client.query('SELECT * FROM laundry_services WHERE id = $1', [sReq.serviceId]);
        if (serviceRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: "Service not found with ID: " + sReq.serviceId });
        }
        const service = serviceRes.rows[0];
        
        const unitPrice = sReq.priceAtTransaction !== undefined && sReq.priceAtTransaction !== null
          ? Number(sReq.priceAtTransaction) 
          : Number(service.rate);

        const cost = unitPrice * Number(sReq.quantity);
        totalAmount += cost;

        const itemRes = await client.query(`
          INSERT INTO transaction_service_items (transaction_id, service_id, quantity, price_at_transaction)
          VALUES ($1, $2, $3, $4)
          RETURNING id, quantity, price_at_transaction as "priceAtTransaction", service_id as "serviceId"
        `, [transactionId, sReq.serviceId, Number(sReq.quantity), unitPrice]);

        insertedItems.push({
          ...itemRes.rows[0],
          serviceName: service.name,
          serviceRate: service.rate,
          serviceUnit: service.unit
        });
      }
    }

    // Update total amount
    await client.query('UPDATE laundry_transactions SET total_amount = $1 WHERE id = $2', [totalAmount, transactionId]);

    await client.query('COMMIT');

    // Fetch the final transaction object to return
    const finalTxRes = await query(`
      SELECT t.id, t.date, t.customer_name as "customerName", t.weight_kg as "weightKg", 
             t.soap_used_qty as "soapUsedQty", t.soap_remaining_qty as "soapRemainingQty", 
             t.machine_number as "machineNumber", t.payment_method as "paymentMethod", 
             t.reference_number as "referenceNumber", t.total_amount as "totalAmount", 
             t.created_at as "createdAt", t.picked_up as "pickedUp", t.picked_up_at as "pickedUpAt",
             p.id as "productId", p.name as "productName", p.unit as "productUnit",
             u.id as "userId", u.username, u.full_name as "userFullName",
             b.id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM laundry_transactions t
      JOIN soap_products p ON t.soap_product_id = p.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN branches b ON t.branch_id = b.id
      WHERE t.id = $1
    `, [transactionId]);

    return res.json(assembleTransactionObj(finalTxRes.rows[0], insertedItems));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Create transaction failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

// PUT /api/transactions/:id/pickup (Authenticated)
router.put('/:id/pickup', async (req, res) => {
  const { id } = req.params;
  try {
    const checkRes = await query('SELECT 1 FROM laundry_transactions WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found with ID: " + id });
    }

    await query(`
      UPDATE laundry_transactions 
      SET picked_up = true, picked_up_at = NOW() 
      WHERE id = $1
    `, [id]);

    // Fetch details to return full object
    const finalTxRes = await query(`
      SELECT t.id, t.date, t.customer_name as "customerName", t.weight_kg as "weightKg", 
             t.soap_used_qty as "soapUsedQty", t.soap_remaining_qty as "soapRemainingQty", 
             t.machine_number as "machineNumber", t.payment_method as "paymentMethod", 
             t.reference_number as "referenceNumber", t.total_amount as "totalAmount", 
             t.created_at as "createdAt", t.picked_up as "pickedUp", t.picked_up_at as "pickedUpAt",
             p.id as "productId", p.name as "productName", p.unit as "productUnit",
             u.id as "userId", u.username, u.full_name as "userFullName",
             b.id as "branchId", b.name as "branchName", b.location as "branchLocation"
      FROM laundry_transactions t
      JOIN soap_products p ON t.soap_product_id = p.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN branches b ON t.branch_id = b.id
      WHERE t.id = $1
    `, [id]);

    // Fetch service items
    const itemsRes = await query(`
      SELECT i.id, i.quantity, i.price_at_transaction as "priceAtTransaction", 
             s.id as "serviceId", s.name as "serviceName", s.rate as "serviceRate", s.unit as "serviceUnit"
      FROM transaction_service_items i
      JOIN laundry_services s ON i.service_id = s.id
      WHERE i.transaction_id = $1
    `, [id]);

    return res.json(assembleTransactionObj(finalTxRes.rows[0], itemsRes.rows));
  } catch (err) {
    console.error("Pickup transaction failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
