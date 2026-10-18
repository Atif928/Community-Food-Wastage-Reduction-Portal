# Community Food Wastage Reduction Portal

A full-stack web application that connects donors (restaurants, hotels, individuals) with recipients (NGOs, shelters, volunteers) to rescue surplus edible food and prevent it from going to waste. Built with **React (Vite) + Tailwind CSS** on the frontend and **Node.js/Express + PostgreSQL (Neon)** on the backend, featuring JWT authentication, Google Maps integration, local file uploads, email notifications, and in-app alerts.

---

## Features

- **Role-based access control**: Donor, Recipient, and System Admin with protected routes and granular permissions.
- **Authentication & session management**: Email/password registration/login with JWT stored in localStorage; BCrypt password hashing; logout and password change flows.
- **NGO verification**: Recipients who register as NGOs or Shelters can upload verification documents; Admins review and approve/reject before granting claim access. Pending accounts see a dedicated status screen.
- **Food donation management**: Donors can post, edit, cancel, or delete listings with photos (up to 5), Veg/Non-Veg category, quantity (kg/servings), best-before datetime, and a precise pickup location (map picker + current location).
- **Location-aware discovery**: Recipients can search by city, category/type, radius (km), keyword, and sort by distance/expiry/newest/quantity. Map and list views are both supported; the map degrades gracefully when the Google Maps API key is absent.
- **Claim workflow with race protection**: Recipients can claim available (unexpired) listings. The backend uses `SELECT ... FOR UPDATE` row locking, a guarded `UPDATE WHERE status='AVAILABLE'`, and a `UNIQUE(donation_id)` constraint on claims to prevent double-claims under concurrency.
- **Delivery confirmation**: Recipients confirm pickup with an optional proof photo and note; status flows `Available → Claimed → Delivered` and is recorded in a status history timeline.
- **Notifications**: In-app dashboard bell with unread badge + polling (30s default, pauses when tab is hidden). Events include donation posted (radius fan-out to nearby recipients), claim created/confirmed/cancelled, delivered, verification decisions, feedback received, account status changes, and admin broadcasts.
- **Email alerts (optional)**: Nodemailer integration with `EMAIL_DISABLED` flag (logs to console by default). Templates cover donation posted (nearby), claim lifecycle, verification decisions, etc.
- **Ratings & feedback**: Recipients rate donors (1–5 stars + comment) after delivery. Donor profiles show average rating, distribution, reviews, and impact metrics.
- **Dashboards**: Donor (total donated, meals saved, kg diverted, active claims, rating, 6-month trend, active listings). Recipient (meals received, active pickups, nearby food, recent history). Admin (headline KPIs, city/category/monthly trends, top donors, verification queue, user management).
- **Admin panel**: Review NGO verifications, manage users (activate/suspend), moderate listings (status changes/delete), CRUD food categories, broadcast notifications to audiences (all/donors/recipients), and view reports/charts.
- **File uploads**: Multer stores files locally under `server/uploads/` by default (`STORAGE_DRIVER=local`). Optional Firebase Storage support scaffolded (`firebase-admin`).
- **Validation & safety**: Server-side express-validator chains, client-side mirrors, Multer file type/size checks (images up to 5 MB, verification docs PDF/image up to 5 MB), CORS, Helmet-ready posture, hashed passwords, sanitization, and cleanup of uploaded files on validation failure.
- **Responsive UI**: Tailwind CSS with reusable components (cards, badges, modals, toasts, spinners, empty/error states), loading and error states throughout, accessible focus rings.
- **Charts & maps**: Recharts for trends/distributions; Google Maps JS API via `@react-google-maps/api` with graceful no-key fallback to list view.

---

## Tech Stack

**Frontend (`client/`)**
- React 18.3, Vite 5.4
- React Router 6.26
- Tailwind CSS 3.4 + PostCSS + Autoprefixer
- Axios 1.7 (envelope unwrapping + 401 interceptor)
- Recharts 2.12
- @react-google-maps/api 2.19

**Backend (`server/`)**
- Node.js + Express 4.19
- PostgreSQL via `pg` (promise-based pool, transactions) — Neon in the cloud, any Postgres locally
- jsonwebtoken, bcryptjs
- express-validator, express-async-errors
- multer ^2.0.1
- cors, dotenv, nodemailer, firebase-admin (optional)

---

## Quick Start

### Prerequisites
- Node.js v18+ (tested on v22.11.0)
- A PostgreSQL database. Either:
  - **Neon** (recommended, serverless free tier) — create a project and copy the connection string, or
  - a local PostgreSQL 13+ instance.
- npm

### 1) Configure environment
```bash
cd D:\Test\server && cp .env.example .env
cd D:\Test\client && cp .env.example .env
```
Open `server/.env` and paste your connection string into `DATABASE_URL`, e.g.
```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/food_waste_portal?sslmode=require
```
Use the **pooled** host (`...-pooler...`) for the API. TLS is enabled automatically
because of `?sslmode=require` (or set `PGSSL=true`). Leaving `DATABASE_URL` empty
falls back to the discrete `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` /
`PGDATABASE` variables for a local server.

Then set your Google Maps API key and (optional) SMTP settings in the same file.

### 2) Install dependencies
```bash
cd D:\Test\server && npm install
cd D:\Test\client && npm install
```

### 3) Set up the database
Builds every table (dropping any existing ones) and loads the demo data:
```bash
cd D:\Test\server && npm run db:reset      # schema.sql + seed.sql
# or individually:
cd D:\Test\server && npm run db:create     # schema only (re-runnable)
cd D:\Test\server && npm run db:seed       # demo data only
```
These scripts use the `DATABASE_URL` from `server/.env`, so no `psql` CLI is needed.
With the `psql` client you can also run `psql "$DATABASE_URL" -f server/sql/schema.sql`.

> Neon tip: run `db:reset` against the **direct** (non-pooler) host if you hit
> issues; pooled connections are ideal for the running API but can be fussy for
> large multi-statement setup scripts.

### 4) Run the app
Backend:
```bash
cd D:\Test\server && npm run dev
```
Frontend:
```bash
cd D:\Test\client && npm run dev
```
Open http://localhost:5173. API health: http://localhost:5000/api/health.

---

## Demo Credentials
All use password: **`password`**

| Role | Email | Org Type | Notes |
|---|---|---|---|
| Admin | `admin@portal.com` | Admin | Full access |
| Donor | `spiceroute@demo.com` | Restaurant | Active listings |
| Donor | `grandleaf@demo.com` | Hotel | Delivered donations |
| Donor | `asha@demo.com` | Individual | Small donor |
| Recipient | `helpinghands@demo.com` | NGO | Verified |
| Recipient | `sunshine@demo.com` | Shelter | Verified |
| Recipient | `rahul@demo.com` | Volunteer | Individual |
| Recipient (Pending) | `greenbites@demo.com` | NGO | Awaiting admin approval |

All seeded users are in **Bengaluru** with coordinates.

---

## Notes
- Polling (not WebSockets) for notifications (30s default, pauses when tab hidden).
- Race-condition safe claiming: row lock + guarded UPDATE + UNIQUE(donation_id).
- Map gracefully degrades when Google Maps key missing (fallback notice + list view remains).
- Emails disabled by default (`EMAIL_DISABLED=true`); logs to console.
- Local uploads under `server/uploads/` by default (`STORAGE_DRIVER=local`).
- PostgreSQL specifics: MySQL `ENUM` columns became `VARCHAR` + `CHECK` constraints,
  `JSON` became `JSONB`, `updated_at` is maintained by a trigger (there is no
  `ON UPDATE CURRENT_TIMESTAMP`), emails are unique via a functional index on
  `lower(email)`, and the data layer translates `?` placeholders to `$1..$n`
  (see `server/config/db.js`).

See `PROJECT_STRUCTURE.md` and inline code comments for more details.
