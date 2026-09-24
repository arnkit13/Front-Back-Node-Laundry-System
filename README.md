# 🧺 Laundry Inventory & POS Management System

A full-stack, multi-branch Laundry Inventory and Point of Sale (POS) Management System built with **Node.js (Express)**, **React (Vite + Material-UI)**, and **PostgreSQL**.

Designed to streamline day-to-day laundromat operations, from customer drop-offs and wash cycle monitoring to stock consumption tracking, branch expense recording, and business performance analytics.

---

## 🚀 Features

### 👤 Role-Based Access Control (RBAC)
- **Shop Manager / Administrator (`ROLE_ADMIN`)**:
  - Full system control: branch creation, staff account management, service rate configuration.
  - Comprehensive business analytics, financial sales summaries, and inventory consumption logs.
  - Expense tracking and net profit visibility.
- **Store Staff / Cashier (`ROLE_USER`)**:
  - Streamlined cashier dashboard for creating laundry transactions and processing payments.
  - Real-time washer and dryer machine status toggling (in-use vs. available).
  - Customer order tracking and quick pickup status updates.

---

### 💳 Point of Sale (POS) & Order Processing
- **Customer Drop-Off & Order Entry**: Record customer details, total weight in kg, number of loads, selected wash/dry/fold services, and detergent add-ons.
- **Inventory Deduction**: Automatically links detergent and fabric softener usage directly to transactions.
- **Pickup & Status Tracking**: Mark orders as pending, ready for pickup, or completed.
- **Payment Reconciliation**: Track payment modes (Cash, GCash/E-Wallet, Card) and paid amounts.

---

### 📦 Inventory & Supplies Management
- Track soap, powder detergent, liquid softener, and retail items.
- Live stock levels with low-stock alerts.
- Stock audit trail & restocking history logs.

---

### 🏪 Multi-Branch & Machine Management
- Support for multiple store locations/branches.
- Branch-specific operational insights and machine status tracking.
- Interactive machine configuration (track available washers and dryers per branch).

---

### 📊 Reports & Financial Analytics
- Interactive revenue graphs powered by **Recharts**.
- Sales reports filterable by date range, branch, and cashier.
- Operational expense tracking (rent, utility bills, machine maintenance, supplies).
- Profit and loss calculation (Revenue - Expenses).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Material-UI (MUI v9), Recharts, React Router v7, Axios |
| **Backend** | Node.js (ES Modules), Express.js, `pg` (PostgreSQL Client Pool), `bcryptjs`, `jsonwebtoken` (JWT), `cors` |
| **Database** | PostgreSQL (Railway, Supabase, Neon, or local instance) |
| **DevOps / Container** | Docker, Alpine Linux, Vercel (Frontend rewrite config) |

---

## 📂 Project Structure

```plaintext
LaundryInventorySystemNODE/
├── Dockerfile                  # Container definition for the Node backend
├── backend/                    # Express.js REST API
│   ├── config/
│   │   └── db.js               # PostgreSQL connection pool configuration
│   ├── middleware/             # JWT authentication and authorization guards
│   ├── routes/                 # Express API route handlers
│   │   ├── auth.js             # Authentication (login & profile)
│   │   ├── branches.js         # Branch CRUD and machine configuration
│   │   ├── dashboard.js        # Analytics aggregation & KPI metrics
│   │   ├── expenses.js         # Operational expense tracking
│   │   ├── inventory.js        # Supplies inventory and restock history
│   │   ├── reports.js          # Sales, inventory, and expense reports
│   │   ├── services.js         # Service catalog & pricing
│   │   ├── transactions.js     # POS orders & customer drop-offs
│   │   └── users.js            # User management
│   ├── migrate_db.js           # Database migration utility
│   ├── seeder.js               # Automated schema & default user/service seeder
│   ├── server.js               # Application entry point & middleware setup
│   ├── package.json
│   └── .env.example
├── frontend/                   # React + Vite application
│   ├── public/                 # Static assets and icons
│   ├── src/
│   │   ├── components/         # Navigation, layout, and protected route wrappers
│   │   ├── context/            # AuthContext (JWT session management)
│   │   ├── pages/              # Admin & Employee dashboards, POS, Inventory, Reports
│   │   ├── services/           # Axios API client
│   │   ├── theme.js            # MUI custom design tokens
│   │   ├── App.jsx             # Route definitions & guards
│   │   └── main.jsx            # React root mount
│   ├── vercel.json             # SPA routing rewrite for Vercel deployment
│   ├── vite.config.js          # Vite build config
│   ├── package.json
│   └── .env.example
└── README.md                   # Project documentation
```

---

## ⚡ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [npm](https://www.npmjs.com/) (v9 or higher)
- A running [PostgreSQL](https://www.postgresql.org/) database (local or hosted on Railway / Supabase / Neon)

---

### 1. Database Setup
Ensure you have a PostgreSQL database created. The backend features an **automated seeder** (`backend/seeder.js`) that creates required schema adjustments and populates default accounts and services on startup.

---

### 2. Backend Setup

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```

4. Configure the variables in `.env`:
   ```env
   PORT=8080
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/laundry_db
   ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   JWT_SECRET=super_secret_jwt_key_with_at_least_32_characters
   JWT_EXPIRATION_MS=86400000
   NODE_ENV=development
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   > The server will connect to PostgreSQL, run the seeder, and listen on `http://localhost:8080`.

---

### 3. Frontend Setup

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Configure the API endpoint in `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```

5. Launch the frontend development server:
   ```bash
   npm run dev
   ```
   > Access the web application at `http://localhost:5173`.

---

## 🔑 Default Credentials

The built-in database seeder initializes the following default users:

| Role | Username | Password | Access Level |
|---|---|---|---|
| **Shop Manager (Admin)** | `admin` | `admin123` | Full administrative access to all modules |
| **Store Staff (Employee)** | `employee` | `emp123` | POS transactions, machine status, order pickups |

---

## 🔌 API Overview

All routes except `/api/auth/login` require a valid JWT token in the `Authorization` header (`Bearer <token>`).

| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user & retrieve JWT token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user's profile | Authenticated |
| `GET` / `POST` | `/api/branches` | Fetch or create branch locations | `ROLE_ADMIN` |
| `PUT` | `/api/branches/:id/machines` | Update machine availability status | Authenticated |
| `GET` / `POST` | `/api/users` | List or register system users | `ROLE_ADMIN` |
| `GET` / `POST` | `/api/services` | Retrieve or create laundry services | Authenticated / Admin |
| `GET` / `POST` | `/api/inventory` | Manage stock products & alerts | `ROLE_ADMIN` |
| `POST` | `/api/inventory/:id/stock` | Add stock replenishment entry | `ROLE_ADMIN` |
| `GET` / `POST` | `/api/transactions` | Query orders or submit new POS transaction | Authenticated |
| `PUT` | `/api/transactions/:id` | Update transaction / pickup status | Authenticated |
| `GET` / `POST` | `/api/expenses` | List and record branch expenses | `ROLE_ADMIN` |
| `GET` | `/api/dashboard/stats` | High-level metrics for dashboard cards | Authenticated |
| `GET` | `/api/reports/sales` | Detailed sales report and filters | `ROLE_ADMIN` |

---

## 🐳 Docker Support

To run the backend with Docker:

1. Build the Docker image:
   ```bash
   docker build -t laundry-backend .
   ```

2. Run the container:
   ```bash
   docker run -p 8080:8080 \
     -e DATABASE_URL="postgresql://user:password@host:port/dbname" \
     -e JWT_SECRET="your_jwt_secret_key" \
     laundry-backend
   ```

---

## 🚢 Deployment Guide

- **Backend (Render / Railway)**:
  - Deploy using the root or backend `Dockerfile` or run `node server.js`.
  - Set environment variables (`PORT=8080`, `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`).
- **Frontend (Vercel)**:
  - Connect your Git repository to Vercel and set Root Directory to `frontend`.
  - Set `VITE_API_BASE_URL` to your live deployed backend URL.
  - Single-page application route rewrites are handled automatically via [frontend/vercel.json](file:///c:/Users/Arn/Documents/Codes/LaundryInventorySystemNODE/frontend/vercel.json).

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
