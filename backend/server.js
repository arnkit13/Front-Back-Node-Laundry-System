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

// CORS configuration matching Spring Boot allowed origins
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawOrigins ? rawOrigins.split(',') : [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:5174', 'http://127.0.0.1:5174',
  'http://localhost:5175', 'http://127.0.0.1:5175',
  'http://localhost:5176', 'http://127.0.0.1:5176'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS. Origin: "${origin}", Allowed: ${JSON.stringify(allowedOrigins)}`));
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
    });
  })
  .catch(err => {
    console.error("Critical: Failed to seed database and start server. Exiting...", err);
    process.exit(1);
  });
