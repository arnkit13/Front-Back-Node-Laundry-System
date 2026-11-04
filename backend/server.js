import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runSeeder } from './seeder.js';

// Route Imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import branchRoutes from './routes/branches.js';
import inventoryRoutes from './routes/inventory.js';
import serviceRoutes from './routes/services.js';
import expenseRoutes from './routes/expenses.js';
import transactionRoutes from './routes/transactions.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// CORS configuration matching deployment and local origins
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const configuredOrigins = rawOrigins ? rawOrigins.split(',').map(s => s.trim()) : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // If ALLOWED_ORIGINS is not set or contains wildcard '*', allow all origins
    if (configuredOrigins.length === 0 || configuredOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Check configured origins or common deployment domains
    if (
      configuredOrigins.includes(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.onrender.com')
    ) {
      return callback(null, true);
    }
    
    return callback(new Error(`Not allowed by CORS. Origin: "${origin}", Allowed: ${JSON.stringify(configuredOrigins)}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Requested-With']
}));

app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check and root ping endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.status(200).send('Laundry Inventory Management System API is live and healthy.');
});

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandle Error caught:", err);
  res.status(err.status || 500).json({
    message: err.message || "An unexpected server error occurred."
  });
});

// Run Database Seeder and Start Server
runSeeder()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running successfully on port ${PORT}`);

      // Auto keep-alive for Railway or cloud hosting (pings self every 14 mins to avoid idling/sleeping)
      const selfUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : (process.env.RENDER_EXTERNAL_URL || process.env.APP_URL);
      if (selfUrl) {
        console.log(`Keep-alive monitor initialized for host: ${selfUrl}`);
        setInterval(async () => {
          try {
            const pingUrl = `${selfUrl.replace(/\/$/, '')}/api/health`;
            const https = await import('https');
            const http = await import('http');
            const client = pingUrl.startsWith('https') ? https : http;
            client.get(pingUrl, (res) => {
              console.log(`[Keep-Alive] Pinged ${pingUrl} - Status: ${res.statusCode}`);
            }).on('error', (e) => {
              console.warn(`[Keep-Alive] Ping warning: ${e.message}`);
            });
          } catch (e) {
            console.warn(`[Keep-Alive] Ping error: ${e.message}`);
          }
        }, 14 * 60 * 1000);
      }
    });
  })
  .catch(err => {
    console.error("Critical: Failed to seed database and start server. Exiting...", err);
    process.exit(1);
  });
