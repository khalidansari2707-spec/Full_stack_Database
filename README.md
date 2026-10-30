# 🎓 Campus Placement Management System (PlacePro)

A production-grade, full-stack **Campus Placement Management System** built with a 2-Tier Architecture using **Node.js**, **Express.js**, and the **Native MongoDB Driver (`mongodb` v6.x)** — strictly without Mongoose. Features a modern dark-themed Single Page Application (SPA) dashboard.

---

## 🌟 Key Architecture & Features

### 1. Backend Architecture (Native MongoDB Driver)
- **Zero Mongoose**: Uses pure `mongodb` npm driver (`MongoClient`, `ObjectId`, native collections).
- **Connection Pooling**: Configured with `maxPoolSize: 20` and `minPoolSize: 5` singleton client pattern.
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` signals to cleanly drain and close the MongoDB connection pool.
- **Index Optimization**: Automated unique index on `rollNo`, text indexes on `name` and `skills`, and compound indexes on `branch` and `cgpa`.
- **Atomic Operations**: Atomic `$addToSet` and `$push` for duplicate-free drive applications, and native positional operator (`$`) for candidate stage progressions.
- **High-Performance Aggregation**: Single-pass `$facet` pipeline computing real-time campus metrics:
  - Total students vs. placed students (Placement percentage)
  - Highest CTC and average CTC across campus
  - Branch-wise placement ratios and average packages
  - Top recruiting companies and in-demand skills

### 2. Frontend Dashboard UI
- **Pure Vanilla Stack**: HTML5, Modern CSS (Design Tokens, Grid, Flexbox), and Vanilla ES6+ JavaScript. **No external UI libraries** (no Bootstrap, Tailwind, or React).
- **Aesthetic**: Modern Dark Mode (Obsidian `#0B0F19`, Slate `#161F30`, Electric Indigo `#6366F1`, and Emerald `#10B981`).
- **4 Main Views**:
  1. **Analytics Overview**: KPI cards, branch placement progress bars, top recruiters list, in-demand skills cloud, and pipeline summary.
  2. **Student Directory**: Paginated data table with real-time debounced text search, branch filter, status filter, min CGPA slider, and View/Edit/Delete actions.
  3. **Placement Drives Grid**: Interactive recruitment cards with package badges (`₹XX LPA`), eligibility tags, countdowns, and quick actions.
  4. **Application Board**: Kanban pipeline (`Applied` ➔ `Shortlisted` ➔ `Selected` ➔ `Rejected`) with atomic stage updates. Selecting a candidate as *Selected* automatically marks the student as *Placed* with their company and CTC!
- **Interactive Modals**: Accessible modals for Adding/Editing Students, Creating Drives, Applying to Drives (with live eligibility feedback), and Bulk Uploading JSON records.
- **UX Delights**: Toast notification system, skeleton loaders, and empty states.

---

## 📁 Project Directory Structure

```
DBMS_PRJCT/
├── config/
│   └── db.js                 # MongoClient singleton, connection pool & graceful shutdown
├── controllers/
│   ├── studentsController.js # Full CRUD, pagination, filtering, search & bulk upload
│   ├── drivesController.js   # Drives CRUD, atomic applyToDrive & positional stage update
│   └── statsController.js    # Multi-faceted MongoDB aggregation pipeline
├── routes/
│   ├── studentsRoutes.js     # /api/students endpoints
│   ├── drivesRoutes.js       # /api/drives endpoints
│   └── statsRoutes.js        # /api/stats endpoints & /api/stats/seed trigger
├── public/
│   ├── index.html            # Dark-themed SPA layout
│   ├── style.css             # Pure CSS design token architecture
│   └── app.js                # Vanilla JS state manager & REST API client
├── scripts/
│   └── seed.js               # CLI & API database seeder
├── .env                      # Environment configuration
├── .env.example              # Template environment configuration
├── package.json              # Dependencies and run scripts
└── server.js                 # Express server entry point & static file serving
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended, tested on v24)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally on port `27017`

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Create or inspect `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017
DB_NAME=placement_management_db
MONGO_MAX_POOL_SIZE=20
MONGO_MIN_POOL_SIZE=5
```

### 4. Seed Database with Realistic Demo Data
```bash
npm run seed
```
*(You can also click the **"🌱 Seed Sample Data"** button in the sidebar of the dashboard at any time).*

### 5. Start the Server
```bash
npm start
# Or for auto-reload during development:
npm run dev
```

Visit the dashboard in your browser:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 📡 REST API Reference

### Students API (`/api/students`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/students` | Register a new student (validates rollNo uniqueness) |
| `GET` | `/api/students` | Get paginated students with filters (`search`, `branch`, `minCgpa`, `placementStatus`, `page`, `limit`) |
| `GET` | `/api/students/:id` | Fetch single student profile and drive history |
| `PUT` | `/api/students/:id` | Update student profile fields |
| `DELETE` | `/api/students/:id` | Delete student and remove from all drives |
| `POST` | `/api/students/bulk` | Bulk import students array using `insertMany({ ordered: false })` |

### Placement Drives API (`/api/drives`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/drives` | Create a placement recruitment drive |
| `GET` | `/api/drives` | List drives with filters (`status: Active/Closed`, `search`) |
| `GET` | `/api/drives/:id` | Get drive details with populated student applicants |
| `PUT` | `/api/drives/:id` | Update drive details |
| `PATCH` | `/api/drives/:id/status` | Toggle status between `Active` and `Closed` |
| `DELETE` | `/api/drives/:id` | Delete placement drive |
| `POST` | `/api/drives/:id/apply` | Atomic application with eligibility validation (`$addToSet`/`$push`) |
| `PATCH` | `/api/drives/:id/candidates/:studentId` | Update candidate stage using positional operator `$` |

### Statistics API (`/api/stats`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats/overview` | Aggregation pipeline returning KPIs, branch distribution & top recruiters |
| `POST` | `/api/stats/seed` | Trigger automatic sample data seeding |
