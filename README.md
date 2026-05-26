# OMS + WMS Software
**Cloud-Based Order & Warehouse Management System**
Built for D2C brands, apparel sellers, and small warehouses.

---

## 📦 Project Structure
```
oms-wms-app/
├── backend/                 # Node.js + Express + PostgreSQL API
│   ├── src/
│   │   ├── controllers/     # API logic (orders, inventory, auth...)
│   │   ├── routes/          # Express route definitions
│   │   ├── middlewares/     # JWT auth, RBAC (Role-based access)
│   │   ├── services/        # DB connection, notifications
│   │   ├── seed.js          # Database filler (50 orders, 10 products)
│   │   └── index.ts         # Server entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema (PostgreSQL)
│   ├── start.bat            # Double-click to start backend
│   └── .env                 # Database connection config
├── frontend/                # React + Tailwind CSS UI
│   ├── src/
│   │   ├── components/      # Sidebar, UI helpers
│   │   ├── pages/           # All screens (Dashboard, Orders, etc.)
│   │   └── utils/           # API client
│   ├── public/index.html
│   └── package.json
├── docs/
│   └── schema.sql           # Raw SQL schema dump
└── README.md
```

---

## 🚀 How to Run Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/download/) (with a database called `oms_wms_db`)
- [pgAdmin](https://www.pgadmin.org/) (visual DB tool)

### 2. Create the Database
1. Open **pgAdmin 4**
2. Right-click **Databases** → **Create** → **Database...**
3. Name: `oms_wms_db`
4. Click **Save**

### 3. Configure Database Connection
Open `oms-wms-app/backend/.env` and set:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/oms_wms_db
```

### 4. Start the Backend (API Server)
Double-click: `oms-wms-app/backend/start.bat`
_or run this command in a terminal:_
```powershell
cd oms-wms-app/backend
npx ts-node src/index.ts
```
**Wait until you see:** `Server running on port 5000`

### 5. Start the Frontend (Website)
Double-click: `oms-wms-app/frontend/start.bat`
_or run this command in a separate terminal:_
```powershell
cd oms-wms-app/frontend
npm start
```
**Your browser will open:** `http://localhost:3000`

---

## 🖥️ Available Modules

| Tab | Screen | What it does |
|:---|:-------|:-------------|
| **Dashboard** | Overview KPIs | Shows Total Orders, Pending, Revenue, Low Stock alerts (real data) |
| **Orders** | Order Management | Search, filter, view status for all marketplace orders |
| **Picklist** | Warehouse Picking | Assign pickers, view picking lists |
| **Packing** | Packing Station | Scan SKUs to verify packing, summary, mark as shipped |
| **Barcode Scan** | Scanner | Verify SKU codes & bin locations |
| **Returns/RTO** | Returns Portal | Manage returns & RTO with QC status tracking |

---

## 🛠️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | React 18, Tailwind CSS, Lucide Icons |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 15, Prisma ORM |
| Auth | JWT (JSON Web Tokens), Role-based access |
| Queue | Redis + BullMQ (WhatsApp notifications) |
| Integrations | Shopify, Amazon, Flipkart (API-ready) |

---

## 📊 Sample Data
The `seed.js` script automatically creates:
- 1 Admin user (`admin@oms.com`)
- 2 Warehouses (Mumbai & Delhi)
- 10 Products (T-shirts, Jeans, Shoes, Accessories)
- 50 Mock Orders from Shopify, Amazon, Flipkart, Meesho

---

## 🧑‍💻 For Developers

### Backend Commands
```powershell
npm run seed        # Reset & fill database with sample data
npm run migrate     # Apply database schema changes
npm run dev         # Start with auto-restart on file changes
```

### Frontend Commands
```powershell
npm run build       # Build for production (output: build/)
npm start           # Start development server
```

---

## 🚢 Going Live (Deployment)
1. **Database:** [Supabase.com](https://supabase.com) (free managed PostgreSQL)
2. **Backend:** [Render.com](https://render.com) (free Node.js hosting)
3. **Frontend:** [Vercel.com](https://vercel.com) (free React hosting)
4. **Domain:** Configure GoDaddy DNS → Vercel

---

## 📝 License
Private - SaaS Product in Development
