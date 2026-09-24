import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const SOURCE_URL = process.env.SOURCE_DATABASE_URL || "postgresql://postgres.eputmfbpfjsvmpmhopdq:Camomot12345%40@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";
const TARGET_URL = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL || process.env.SPRING_DATASOURCE_URL || "postgresql://postgres:LFamNwAntvmhUkrWmWYJHwcXzFjoshWe@altaria.proxy.rlwy.net:35770/railway";

async function runMigration() {
  console.log("Starting database migration from Supabase to Railway with Identity Column support...");
  
  const sourceClient = new Client({
    connectionString: SOURCE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const targetClient = new Client({
    connectionString: TARGET_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await sourceClient.connect();
  console.log("Connected to SOURCE database (Supabase).");
  
  await targetClient.connect();
  console.log("Connected to TARGET database (Railway).");
  
  try {
    const tablesRes = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables to migrate:`, tables);
    
    await targetClient.query("SET session_replication_role = 'replica'");
    console.log("Disabled target database constraint checks for migration.");

    for (const table of tables) {
      console.log(`\n--- Recreating table: ${table} ---`);
      
      const columnsRes = await sourceClient.query(`
        SELECT column_name, data_type, is_nullable, column_default, character_maximum_length, is_identity, identity_generation
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      const pkRes = await sourceClient.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1 AND tc.table_schema = 'public'
      `, [table]);
      const pks = pkRes.rows.map(r => r.column_name);
      
      await targetClient.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      
      const colDefs = columnsRes.rows.map(col => {
        let def = `"${col.column_name}" ${col.data_type}`;
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        }
        
        if (col.is_identity === 'YES') {
          def += ` GENERATED ${col.identity_generation || 'BY DEFAULT'} AS IDENTITY`;
        } else if (col.column_default) {
          if (col.column_default.includes('nextval')) {
            if (col.data_type.includes('int')) {
              def = `"${col.column_name}" SERIAL`;
            }
          } else {
            def += ` DEFAULT ${col.column_default}`;
          }
        }
        
        if (col.is_nullable === 'NO' && col.is_identity !== 'YES') {
          def += ' NOT NULL';
        }
        return def;
      });
      
      if (pks.length > 0) {
        colDefs.push(`PRIMARY KEY (${pks.map(pk => `"${pk}"`).join(', ')})`);
      }
      
      const createTableSql = `CREATE TABLE "${table}" (\n  ${colDefs.join(',\n  ')}\n)`;
      console.log(`Executing DDL:\n${createTableSql}`);
      await targetClient.query(createTableSql);
    }
    
    for (const table of tables) {
      console.log(`\n--- Migrating data for: ${table} ---`);
      
      const dataRes = await sourceClient.query(`SELECT * FROM "${table}"`);
      const rows = dataRes.rows;
      console.log(`Read ${rows.length} rows from source table.`);
      
      if (rows.length === 0) continue;
      
      const columns = Object.keys(rows[0]);
      
      for (const row of rows) {
        const colNames = columns.map(c => `"${c}"`).join(', ');
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = columns.map(c => row[c]);
        
        await targetClient.query(
          `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`,
          values
        );
      }
      console.log(`Inserted ${rows.length} rows into target table.`);
    }

    console.log("\n--- Recreating Foreign Key Constraints ---");
    const fkRes = await sourceClient.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
    `);
    
    for (const fk of fkRes.rows) {
      console.log(`Adding FK: ${fk.constraint_name} on "${fk.table_name}"("${fk.column_name}") -> "${fk.foreign_table_name}"("${fk.foreign_column_name}")`);
      try {
        await targetClient.query(`
          ALTER TABLE "${fk.table_name}"
          ADD CONSTRAINT "${fk.constraint_name}"
          FOREIGN KEY ("${fk.column_name}")
          REFERENCES "${fk.foreign_table_name}" ("${fk.foreign_column_name}")
          ON DELETE SET NULL ON UPDATE CASCADE
        `);
      } catch (fkErr) {
        console.warn(`Could not add foreign key constraint ${fk.constraint_name}:`, fkErr.message);
      }
    }

    console.log("\n--- Syncing Auto-Increment Sequences ---");
    for (const table of tables) {
      try {
        const maxValRes = await targetClient.query(`SELECT COALESCE(MAX("id"), 0) as maxval FROM "${table}"`);
        const maxVal = parseInt(maxValRes.rows[0].maxval, 10);
        
        const seqNameRes = await targetClient.query(`SELECT pg_get_serial_sequence($1, 'id') as seqname`, [table]);
        const seqName = seqNameRes.rows[0].seqname;
        
        if (seqName) {
          await targetClient.query(`SELECT setval($1, $2)`, [seqName, Math.max(1, maxVal)]);
          console.log(`Sequence "${seqName}" set to: ${Math.max(1, maxVal)}`);
        } else {
          const isIdentityRes = await targetClient.query(`
            SELECT is_identity 
            FROM information_schema.columns 
            WHERE table_schema='public' AND table_name=$1 AND column_name='id'
          `, [table]);
          
          if (isIdentityRes.rows.length > 0 && isIdentityRes.rows[0].is_identity === 'YES') {
            await targetClient.query(`ALTER TABLE "${table}" ALTER COLUMN "id" RESTART WITH ${Math.max(1, maxVal) + 1}`);
            console.log(`Identity column for "${table}" restarted at: ${Math.max(1, maxVal) + 1}`);
          }
        }
      } catch (seqErr) {
        console.warn(`Could not sync sequence for table "${table}":`, seqErr.message);
      }
    }

    await targetClient.query("SET session_replication_role = 'origin'");
    console.log("\nRe-enabled target database constraint checks.");
    console.log("Database migration completed successfully!");
    
  } catch (err) {
    console.error("Migration failed:", err);
    try {
      await targetClient.query("SET session_replication_role = 'origin'");
    } catch (_) {}
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

runMigration();
