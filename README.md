# RelayGo – Peer-to-Peer Package Delivery Platform

**RelayGo** is a full-stack, intermediate-level web application designed as an academic Capstone / B.Tech CSE project. The platform connects people who want to send packages between cities with verified travelers who already have journey bookings and unused luggage capacity.

---

## 📌 Key Highlights

- **Human-Crafted Minimal Design:** Built with a restrained corporate palette (Slate / Navy `#0F172A`, Sky Blue `#0EA5E9`, Crisp White `#FFFFFF`, and neutral grey borders), strictly avoiding generic AI SaaS gradients, floating cards, or excessive animations.
- **Strict Tech Stack:** React 18 (Vite) + Node.js (Express.js) + MySQL 8 (Relational schema with foreign keys & transactions) + JWT & bcrypt.
- **3 Distinct Portals:** Dedicated role-based dashboards and workflows for **Senders**, **Travelers**, and **Administrators**.
- **Intelligent Route Matching Engine:** Automatically calculates compatible journeys within destination, departure date ranges ($\pm 3$ days), remaining luggage capacity ($kg$), and verified traveler status.
- **Two-Phase Pseudo OTP Handover:**
  - **Pickup OTP:** Generated for the sender; given to the traveler upon physical parcel handover (transitions package to `IN_TRANSIT`).
  - **Delivery OTP:** Generated for the sender; confirmed upon destination delivery (transitions package to `DELIVERED`).
  - *Current Demo Configuration:* In pseudo mode, any entered 6-digit OTP code succeeds immediately without requiring SMS gateways.
- **Simulated Escrow Payment System:**
  - Upon request acceptance, parcel reward is locked in **`HELD`** escrow status.
  - Upon verified delivery OTP confirmation, funds automatically transition to **`RELEASED`** status and credit the traveler's earnings.
- **Trust, Verification & Disputes:**
  - Traveler Government ID authentication portal with administrative approval/rejection.
  - Post-delivery 5-star ratings and written reviews.
  - Administrative dispute resolution interface.

---

## 🏗️ Project Architecture

```
relaygo/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL2 connection pool
│   ├── controllers/
│   │   ├── adminController.js    # System stats, user control, verifications, disputes
│   │   ├── authController.js     # JWT registration, login, profile updates
│   │   ├── deliveryController.js # Transactional request acceptance & capacity locking
│   │   ├── journeyController.js  # Traveler route posting & management
│   │   ├── otpController.js      # Two-phase OTP generation and verification
│   │   ├── packageController.js  # Package lifecycle & matching engine endpoints
│   │   ├── paymentController.js  # Escrow transaction audit
│   │   ├── ratingController.js   # Traveler star rating & reviews
│   │   └── reportController.js   # Incident reports
│   ├── database/
│   │   ├── init.js               # One-click DB creator + schema executor + seeder
│   │   ├── schema.sql            # 10 relational tables with foreign keys & indexes
│   │   └── seed.js               # Seed script with bcrypt-hashed passwords
│   ├── middleware/
│   │   ├── auth.js               # JWT bearer token verification
│   │   └── roleCheck.js          # Role-based route authorization
│   ├── routes/
│   │   ├── admin.js              # /api/admin/*
│   │   ├── auth.js               # /api/auth/*
│   │   ├── deliveries.js         # /api/delivery-requests/*
│   │   ├── journeys.js           # /api/journeys/*
│   │   ├── otp.js                # /api/otp/*
│   │   ├── packages.js           # /api/packages/*
│   │   ├── payments.js           # /api/payments/*
│   │   ├── ratings.js            # /api/ratings/*
│   │   ├── reports.js            # /api/reports/*
│   │   ├── sender.js             # /api/sender/* (Dashboard & actions)
│   │   └── traveler.js           # /api/traveler/* (Dashboard & actions)
│   ├── services/
│   │   ├── matchingEngine.js     # SQL-driven journey matching algorithm
│   │   ├── otpService.js         # Pseudo OTP generation & verification
│   │   └── paymentService.js     # Simulated escrow transitions (HELD -> RELEASED)
│   ├── test-api.js               # Automated 10-step full workflow verification suite
│   ├── .env                      # Database & JWT configuration
│   └── server.js                 # Express application entrypoint
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js          # Pre-configured Axios instance with JWT interceptors
    │   ├── components/
    │   │   └── common/
    │   │       ├── Footer.jsx
    │   │       ├── Navbar.jsx
    │   │       ├── ProtectedRoute.jsx
    │   │       ├── Sidebar.jsx
    │   │       ├── Spinner.jsx
    │   │       └── StatusBadge.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx   # Global user state & persistence
    │   ├── pages/
    │   │   ├── admin/            # Admin dashboard, users, packages, verifications, disputes
    │   │   ├── sender/           # Sender dashboard, new package, matches, tracking, txns
    │   │   ├── traveler/         # Traveler dashboard, add journey, requests, pickups, earnings
    │   │   ├── Landing.jsx       # Clean startup homepage
    │   │   ├── Login.jsx         # Authentication
    │   │   ├── Profile.jsx       # User profile & ID verification submission
    │   │   └── Register.jsx      # Role registration
    │   ├── styles/
    │   │   └── global.css        # Clean, human-crafted CSS design system
    │   ├── App.jsx               # React Router v6 declaration
    │   └── main.jsx
    ├── index.html
    └── vite.config.js
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **MySQL**: MySQL Server 8.0 running locally on port `3306`

---

### Step 1: Database Setup & Seed
1. Make sure your MySQL service is running.
2. In `backend/.env`, verify your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=relaygo
   JWT_SECRET=replace_with_a_long_random_secret
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```
3. Open a terminal in `relaygo/backend` and run the all-in-one initializer:
   ```bash
   cd relaygo/backend
   node database/init.js
   ```
   *This automatically creates the database `relaygo`, executes `schema.sql`, and populates realistic seed data.*

---

### Step 2: Start the Backend Server
In `relaygo/backend`:
```bash
npm start
```
The server will start on `http://localhost:5000`. You will see `MySQL connected successfully`.

*(Optional) You can run the automated test suite in another terminal to verify the entire backend workflow:*
```bash
node test-api.js
```

---

### Step 3: Start the React Frontend
In a new terminal:
```bash
cd relaygo/frontend
npm run dev
```
Open your browser at: **`http://localhost:5173`**

---

## ☁️ Deploying to Render with an External MySQL Database

The backend and frontend deploy as separate Render services. The backend uses the existing MySQL database; **do not run `database/init.js`, `database/update-schema.js`, or `database/seed.js` against a database containing data you want to keep.** The database must already have the schema expected by this application, and its provider must allow connections from Render.

### 1. Create the frontend Static Site

Create a Render **Static Site** from this repository:

- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

In the Static Site's **Redirects/Rewrites** settings, add a rewrite from `/*` to `/index.html` so React Router URLs work when opened or refreshed directly.

After creation, note the site's `https://...onrender.com` URL. The first build can use a temporary API URL; set the actual backend URL and trigger a new deploy after creating the backend below.

### 2. Create the backend Web Service

Create a Render **Web Service** from the same repository:

- Root Directory: `backend`
- Build Command: `npm ci`
- Start Command: `npm start`

Add these environment variables in the Render dashboard. Enter secrets there; do not commit them or put them in the repository.

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DB_HOST` | Host from your MySQL provider |
| `DB_PORT` | `3306` |
| `DB_USER` | User from your MySQL provider |
| `DB_PASSWORD` | Current database password |
| `DB_NAME` | Database name from your MySQL provider |
| `JWT_SECRET` | A new, long, random secret |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | The frontend Static Site URL, including `https://` |

Render supplies `PORT` automatically. Do not set it to a fixed value.

### 3. Connect the frontend to the backend

In the Static Site's environment settings, add:

| Key | Value |
| --- | --- |
| `VITE_API_URL` | Backend Web Service URL, including `https://`, without a trailing slash or `/api` |
| `VITE_SOCKET_URL` | The same backend Web Service URL |

Trigger a new frontend deploy after setting these values. If you change either service's URL, update the corresponding environment variable and redeploy.

### 4. Verify

Open `https://<backend-service>.onrender.com/health` and confirm it returns a successful health response. Then open the frontend URL and test login and the main application flows. Render's backend logs should show a successful MySQL connection. A failed database connection stops backend startup and is reported in those logs.

**Credential safety:** database passwords and JWT secrets belong only in Render's environment settings (or an untracked local `.env` file). Any credential pasted into chat should be considered exposed and rotated before deployment.

---

## 🔑 Demo Login Credentials

The database comes pre-seeded with verified test accounts across all three roles:

| Role | Email | Password | Description / Routes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@relaygo.com` | `Admin@123` | System oversight, ID approvals, disputes, user bans |
| **Sender 1** | `sender1@relaygo.com` | `Sender@123` | Has active packages (Mumbai &rarr; Delhi) |
| **Sender 2** | `sender2@relaygo.com` | `Sender@123` | Has delivered packages |
| **Sender 3** | `sender3@relaygo.com` | `Sender@123` | Has in-transit packages |
| **Traveler 1** | `traveler1@relaygo.com` | `Traveler@123` | Verified courier (IndiGo Mumbai &rarr; Delhi, 20kg capacity) |
| **Traveler 2** | `traveler2@relaygo.com` | `Traveler@123` | Verified courier (Delhi &rarr; Bangalore, 15kg capacity) |
| **Traveler 3** | `traveler3@relaygo.com` | `Traveler@123` | Verified courier (Bangalore &rarr; Chennai, 10kg capacity) |

---

## 📦 Walkthrough of Core Delivery Workflow

1. **Sender Creates Package:**
   - Log in as `sender1@relaygo.com`.
   - Click **"Send a Package"** or go to `/sender/packages/new`.
   - Fill in details: From `Mumbai`, To `Delhi`, Date `2026-11-10`, Weight `2.5 kg`, Budget `₹500`.
   - Package status starts as **`OPEN`**.

2. **Matching Travelers:**
   - View the created package detail (`/sender/packages/:id`).
   - The **Matching Engine** instantly lists verified travelers whose travel routes, dates, and luggage capacity match the package (e.g., Rohit Verma).
   - Enter an agreed reward (e.g. `₹450`) and click **"Send Delivery Request"**. Package status updates to **`REQUESTED`**.

3. **Traveler Accepts Delivery:**
   - Log in as `traveler1@relaygo.com`.
   - Go to **"Delivery Requests"** (`/traveler/requests`).
   - Click **"Accept Delivery"**.
   - The backend runs a database transaction:
     - Sets package status to **`ACCEPTED`**.
     - Auto-rejects any other competing requests for this package.
     - Deducts package weight from the traveler's journey remaining capacity.
     - Locks payment in escrow (**`HELD`** status).

4. **Package Handover & Pickup Verification:**
   - The Sender clicks **"Get OTP"** on their package detail page to reveal the Pickup OTP (displayed as `000000`).
   - The Traveler collects the physical parcel, opens **"Active Deliveries"** (`/traveler/deliveries`), enters the Pickup OTP, and clicks **"Verify Pickup"**.
   - Package status transitions to **`IN_TRANSIT`**.

5. **Destination Delivery & Escrow Payment Release:**
   - When the package reaches its destination, the Sender clicks **"Get OTP"** on their package page to reveal the Delivery OTP.
   - The Sender enters the delivery confirmation on their tracking view or dashboard.
   - Package status transitions to **`DELIVERED`**.
   - Simulated payment automatically flips from **`HELD`** &rarr; **`RELEASED`**!
   - The traveler's completed deliveries count increments by 1.

6. **Rating & Review:**
   - The Sender submits a 1–5 star rating with written feedback for the traveler.
   - The traveler's cumulative rating score updates dynamically.

---

## 🛡️ Production Integration Readiness

To swap simulated components for production services:

- **SMS/OTP Integration:** Replace the logic in `backend/services/otpService.js` with Twilio / Fast2SMS API to generate secure 6-digit random codes and deliver via SMS.
- **Payment Gateway:** Replace the simulated ledger entries in `backend/services/paymentService.js` with Razorpay Route / Stripe Connect escrow accounts.
- **File Storage:** Replace document ID text fields in `traveler_profiles` with Amazon S3 or Cloudinary pre-signed image upload URLs.

