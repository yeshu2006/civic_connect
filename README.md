# CivicConnect – AI-Powered Civic Issue Reporting & Management Platform

CivicConnect is an enterprise-grade, full-stack civic reporting and municipal issue management platform built with the MERN stack (MongoDB, Express.js, React, Node.js). Designed with a clean SaaS aesthetic inspired by the Vercel Dashboard and Claude's minimalist interface, it empowers citizens to report civic infrastructure failures with AI vision assistance, prevents duplicate submissions using geospatial proximity algorithms, enables community upvoting, and provides department administrators and super administrators with real-time operational workflows.

---

## 🌟 Key Features

### 1. 🤖 AI-Powered Civic Issue Classification (Puter.js Vision & Optimized Node Classifier)
- Citizens upload a photo of an infrastructure defect (pothole, water leak, downed wire, trash overflow, missing manhole cover).
- The client automatically performs low-bandwidth canvas compression and classifies the image using **Puter.js Vision** (`window.puter.ai.chat`) without requiring API keys, backed by an optimized, zero-latency server vision engine.
- Automatically suggests:
  - Concise, descriptive title
  - Detailed factual description of visible hazards
  - Recommended municipal department (e.g. Roads, Water Supply, Electricity)
  - Assessed severity level (**Low**, **Medium**, **High**, **Critical**)
  - Relevant category tags and confidence score
- Citizens can review, edit, and fine-tune all AI suggestions before submission.
- Zero-cost & secure design: 100% free with no expensive API dependencies.

### 2. 📍 Geospatial & Similarity Duplicate Detection
- Before ticket creation, a proximity query checks existing issues within a configurable radius (e.g. 500m) using MongoDB `2dsphere` indexes.
- Computes composite similarity scores combining **Haversine geographic distance**, **department category match**, and **textual similarity**.
- If duplicates are detected, a modal presents existing issues with similarity badges, distance, and photos:
  - **Support / Upvote Existing Issue** (consolidating citizen support and preventing redundant tickets).
  - **Continue Reporting as New Issue**.

### 3. 👍 Community Voting & Support System
- Residents can upvote and support civic reports to signal community urgency.
- Prevents duplicate voting per user (enforced via unique compound MongoDB index `{ user: 1, issue: 1 }`).
- Real-time vote toggling (upvote / unvote) and sorting by most supported issues.

### 4. 🗺️ Interactive Leaflet Map & Heatmap (Snapchat-inspired HUD)
- Full-screen interactive map powered by **Leaflet.js** and **OpenStreetMap**.
- Color-coded marker pins indicating severity:
  - 🔴 **Critical** (#EF4444)
  - 🟠 **High** (#F97316)
  - 🟡 **Medium** (#F59E0B)
  - ⚪ **Low** (#6B7280)
- Browser Geolocation API integration with pulsing blue location marker.
- Interactive **Heatmap Density Overlay** highlighting high-density civic hazard zones.
- Floating filter controls for radius (2km to 50km), department, status, and severity.
- Bottom slide-up preview drawer on marker click with quick voting and navigation.

### 5. 👥 Role-Based Access Control (RBAC) & Governance
- **Citizen / Resident**:
  - Report issues with photo, address, and map coordinate pin.
  - Track personal submitted reports in "My Reports".
  - Upvote community issues.
- **Department Administrator**:
  - Dedicated dashboard scoped strictly to their assigned municipal sector:
    - *Roads and Infrastructure*
    - *Water Supply*
    - *Electricity*
    - *Sanitation and Waste Management*
    - *Public Safety*
    - *Street Lighting*
    - *Drainage*
    - *Other*
  - Update issue status (*Reported → Verified → In Progress → Resolved / Rejected*).
  - Maintain an immutable audit history log in MongoDB.
  - Upload resolution proof images and log remediation notes.
  - Strict backend authorization: Department admins cannot modify issues outside their jurisdiction (enforced via 403 Forbidden).
- **Super Administrator**:
  - Platform-wide analytics and cross-department performance metrics.
  - Manage all 8 departments and clearance rates.
  - User management: assign department admins and elevate roles.
  - Inspect critical unresolved risks city-wide.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 (Vite) | Fast, modular component-driven client architecture |
| **Routing** | React Router DOM v7 | Protected routes, layout nested routing |
| **Styling** | Custom CSS3 | Modern Vercel/Claude inspired SaaS design system (no Tailwind) |
| **Maps** | Leaflet.js & OpenStreetMap | Geospatial visualization, custom pins, heatmap circles |
| **HTTP Client** | Axios | REST API communication with JWT interceptors |
| **Icons** | React Icons (Feather) | Minimalist iconography |
| **Backend** | Node.js & Express.js | Modular REST API architecture |
| **Database** | MongoDB & Mongoose | Geospatial `2dsphere` indexes, aggregation pipelines |
| **Embedded DB** | MongoMemoryServer | Built-in zero-config database for instant offline/local development |
| **Authentication**| JWT & bcryptjs | Stateless token auth with role verification middleware |
| **File Storage** | Cloudinary & Local Fallback | Dual-mode image storage adapter |
| **AI Vision** | Puter.js Vision & Node Classifier | Free civic image classification and hazard detection |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url> civic_connect
cd civic_connect

# Install root, server, and client dependencies
npm run install:all
```

### 2. Environment Configuration
The project is configured out-of-the-box with embedded database and storage fallbacks. To connect external services, edit `server/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=civicconnect_secure_jwt_secret_key_2026_super_safe
JWT_EXPIRES_IN=7d

# Optional: MongoDB Atlas (if omitted, spins up embedded MongoDB automatically)
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/civicconnect

# Optional: Cloudinary Storage (if omitted, stores in server/uploads automatically)
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret

# Optional: Puter.js Auth Token (Puter is 100% free on client side with zero config)
# PUTER_AUTH_TOKEN=your_puter_auth_token
```

### 3. Run the Full Application
```bash
# Start both backend server (port 5000) and frontend client (port 3000)
npm run dev
```

Visit **http://localhost:3000** in your web browser.

---

## 🔑 Demo Accounts & Quick Sign-In

For instant testing, pre-seeded accounts with password `Password123!` are available via one-click buttons on the `/login` screen:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Super Admin** | `superadmin@civicconnect.org` | `Password123!` | Platform-wide analytics, all departments, user management |
| **Roads Admin** | `roads.admin@civicconnect.org` | `Password123!` | Roads & Infrastructure issues queue |
| **Water Admin** | `water.admin@civicconnect.org` | `Password123!` | Water Supply pipeline & burst reports |
| **Electricity Admin** | `electricity.admin@civicconnect.org` | `Password123!` | Electrical hazards & transformers |
| **Sanitation Admin** | `sanitation.admin@civicconnect.org` | `Password123!` | Solid waste & garbage overflow |
| **Citizen (Alex)** | `alex.citizen@gmail.com` | `Password123!` | Report issues, upvote, track personal reports |
| **Citizen (Priya)** | `priya.civic@gmail.com` | `Password123!` | Community member & issue reporter |

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/signup` – Register citizen or department administrator.
- `POST /api/auth/login` – Authenticate credentials and receive signed JWT.
- `GET /api/auth/me` – Retrieve profile of current logged-in user.
- `PUT /api/auth/profile` – Update contact information.

### Civic Issues
- `GET /api/issues` – Filter, search, and paginate civic issues (`department`, `status`, `severity`, `sortBy`, `search`).
- `POST /api/issues` – Create a new civic report with image, location coordinates, and metadata.
- `GET /api/issues/:id` – Retrieve complete details for a ticket including status audit history.
- `PUT /api/issues/:id` – Edit report details (creator if reported, or authorized admin).
- `DELETE /api/issues/:id` – Remove ticket (creator if reported, or Super Admin).
- `GET /api/issues/nearby` – Geospatial proximity search with distance calculation.
- `POST /api/issues/check-duplicates` – GPS radius and text similarity duplicate detection.

### Community Voting
- `POST /api/issues/:id/vote` – Cast support for an issue (atomic increment).
- `DELETE /api/issues/:id/vote` – Remove support for an issue (atomic decrement).

### Administration
- `GET /api/admin/dashboard` – Scoped KPI metrics (department or super admin).
- `GET /api/admin/issues` – Scoped administration issue management table.
- `PATCH /api/admin/issues/:id/status` – Advance status, add timeline note, upload resolution proof.
- `PATCH /api/admin/issues/:id/severity` – Re-assess severity level.
- `PATCH /api/admin/issues/:id/assign` – Assign issue to municipal personnel.
- `GET /api/admin/departments-summary` – 8-sector summary with clearance rates.
- `GET /api/admin/users` – User management (Super Admin).
- `PATCH /api/admin/users/:id/role` – Update user role or assigned department.

### Analytics & AI
- `GET /api/analytics/overview` – High-level city statistics.
- `GET /api/analytics/departments` – Department resolution breakdown.
- `GET /api/analytics/trends` – Monthly reporting & resolution bar trend data.
- `POST /api/ai/classify-image` – Puter.js / Optimized civic vision image inspection.

---

## 🧪 Verification & Automated Testing

CivicConnect includes an automated end-to-end integration test suite (`server/test-e2e.js`) validating the entire backend stack:

```bash
node server/test-e2e.js
```

### Verified Test Scenarios:
- ✅ Server health check returns HTTP 200
- ✅ Citizen login & JWT authentication
- ✅ Token verification & user profile retrieval
- ✅ Real MongoDB issue counts aggregation
- ✅ Geospatial duplicate detection within proximity radius
- ✅ Citizen report creation with GeoJSON Point coordinates
- ✅ Community upvoting & atomic counter increment
- ✅ **Duplicate vote prevention** (enforces HTTP 400 rejection on second vote)
- ✅ Community unvoting & atomic decrement
- ✅ **Role-based authorization** (cross-department update rejected with HTTP 403 Forbidden)
- ✅ Super Admin status progression & immutable audit history tracking
- ✅ Official resolution notes and evidence logging
- ✅ 8 Municipal departments summary matrix
- ✅ Super Admin user governance listing
