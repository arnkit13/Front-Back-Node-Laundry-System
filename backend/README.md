# 🧺 Laundry Inventory System - Backend

RESTful API backend for the Laundry Inventory and POS Management System built with **Node.js (ES Modules)**, **Express.js**, and **PostgreSQL**.

For full system architecture, frontend setup, and deployment details, see the root [README.md](../README.md).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy the example `.env` file:
```bash
cp .env.example .env
```

Configure your environment variables in `.env`:
```env
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/laundry_db
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=your_jwt_secret_key_at_least_32_characters
JWT_EXPIRATION_MS=86400000
NODE_ENV=development
```

### 3. Start the Server
Development mode (with auto-restart via nodemon):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

> **Note**: Database migrations and default seed data (including default users `admin` / `employee` and laundry services) are automatically verified and seeded on server boot via `seeder.js`.

---

## 🔑 Default Credentials
- **Admin**: `admin` / `admin123`
- **Employee**: `employee` / `emp123`

---

## 🛠️ Tech Stack
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database Client**: `pg` (node-postgres with connection pooling)
- **Security**: `bcryptjs` password hashing, `jsonwebtoken` (JWT), `cors`
