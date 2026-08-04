import pg from 'pg';
import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const { Pool } = pg;

const rawUrl = process.env.SPRING_DATASOURCE_URL || process.env.DATABASE_URL || "postgresql://postgres.eputmfbpfjsvmpmhopdq:Camomot12345%40@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

// Clean JDBC URL prefix if present
const connectionString = rawUrl.replace(/^jdbc:postgresql:/, 'postgresql:');

let poolConfig = {};

try {
  const parsed = new URL(connectionString);
  poolConfig = {
    user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    database: parsed.pathname ? parsed.pathname.substring(1) : undefined,
    ssl: {
      rejectUnauthorized: false
    },
    max: 3,
    idleTimeoutMillis: 10000
  };
} catch (err) {
  console.warn("Could not parse database URL as a connection string, falling back to raw connectionString option:", err.message);
  poolConfig = {
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: 3,
    idleTimeoutMillis: 10000
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

export default pool;
export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
