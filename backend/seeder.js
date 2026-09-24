import bcrypt from 'bcryptjs';
import pool from './config/db.js';

export async function runSeeder() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Run database migrations to ensure schema matches Java entities
    await client.query(`
      ALTER TABLE branches 
      ADD COLUMN IF NOT EXISTS machines_config VARCHAR(1000) NOT NULL DEFAULT 'Machine 1:true,Machine 2:true,Machine 3:true,Machine 4:true'
    `);
    
    await client.query(`
      ALTER TABLE laundry_transactions 
      ADD COLUMN IF NOT EXISTS picked_up BOOLEAN NOT NULL DEFAULT false
    `);

    await client.query(`
      ALTER TABLE laundry_transactions 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'laundry'
    `);

    await client.query(`
      ALTER TABLE laundry_transactions 
      ALTER COLUMN soap_product_id DROP NOT NULL
    `);

    await client.query(`
      ALTER TABLE laundry_transactions 
      ALTER COLUMN soap_used_qty DROP NOT NULL
    `);

    await client.query(`
      ALTER TABLE laundry_transactions 
      ALTER COLUMN soap_remaining_qty DROP NOT NULL
    `);

    await client.query(`
      ALTER TABLE laundry_transactions 
      ALTER COLUMN weight_kg DROP NOT NULL
    `);

    // Auto-mark transactions unclaimed for 2+ weeks (14 days) as claimed
    const autoClaimRes = await client.query(`
      UPDATE laundry_transactions 
      SET picked_up = true, 
          picked_up_at = COALESCE(created_at, date::timestamp, NOW()) 
      WHERE (picked_up = false OR picked_up IS NULL) 
        AND (
          created_at <= NOW() - INTERVAL '14 days' 
          OR (created_at IS NULL AND date <= CURRENT_DATE - 14)
        )
    `);
    if (autoClaimRes.rowCount > 0) {
      console.log(`Auto-marked ${autoClaimRes.rowCount} legacy transactions older than 2 weeks as claimed.`);
    }


    // 0. Clean up static/mock soap products if present
    const staticsToDelete = [
      "Powder Detergent (Lemon Clean)",
      "Liquid Detergent (Ocean Fresh)",
      "Fabric Softener (Lavender Mist)"
    ];

    for (const name of staticsToDelete) {
      const productRes = await client.query('SELECT id FROM soap_products WHERE name = $1', [name]);
      if (productRes.rows.length > 0) {
        const productId = productRes.rows[0].id;
        try {
          // Delete from laundry_transactions referencing this soap product
          await client.query('DELETE FROM laundry_transactions WHERE soap_product_id = $1', [productId]);
          // Delete from soap_inventory_history referencing this soap product
          await client.query('DELETE FROM soap_inventory_history WHERE soap_product_id = $1', [productId]);
          // Delete from soap_products
          await client.query('DELETE FROM soap_products WHERE id = $1', [productId]);
          console.log(`Cleaned up static product and its logs: ${name}`);
        } catch (ex) {
          console.error(`Could not delete static product due to constraint check: ${name} - ${ex.message}`);
        }
      }
    }

    // 1. Seed Users
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const adminCheck = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO users (username, password, full_name, role, active, created_at, branch_id)
        VALUES ($1, $2, $3, $4, true, NOW(), null)
      `, ['admin', hashedAdminPassword, 'Shop Manager (Admin)', 'ROLE_ADMIN']);
      console.log("Default admin user seeded: 'admin' / 'admin123'");
    } else {
      await client.query(`
        UPDATE users 
        SET password = $1, active = true
        WHERE username = $2
      `, [hashedAdminPassword, 'admin']);
      console.log("Default admin user password verified/reset to admin123.");
    }

    const hashedEmployeePassword = await bcrypt.hash('emp123', 10);
    const employeeCheck = await client.query('SELECT * FROM users WHERE username = $1', ['employee']);
    if (employeeCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO users (username, password, full_name, role, active, created_at, branch_id)
        VALUES ($1, $2, $3, $4, true, NOW(), null)
      `, ['employee', hashedEmployeePassword, 'Juan Dela Cruz (Employee)', 'ROLE_USER']);
      console.log("Default employee user seeded: 'employee' / 'emp123'");
    } else {
      await client.query(`
        UPDATE users 
        SET password = $1, active = true
        WHERE username = $2
      `, [hashedEmployeePassword, 'employee']);
      console.log("Default employee user password verified/reset to emp123.");
    }

    // 2. Seed Services
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

    for (const service of defaultServices) {
      const existing = await client.query('SELECT * FROM laundry_services WHERE name = $1', [service.name]);
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO laundry_services (name, rate, unit, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [service.name, service.rate, service.unit]);
        console.log(`Seeded standard service: ${service.name}`);
      }
    }
    console.log("Standard laundry services verification complete.");

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Database seeding failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
