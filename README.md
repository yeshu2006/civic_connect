# CivicConnect

A smart, lightweight civic complaint platform built for Indian cities — designed to handle real ground realities like spotty mobile internet, monsoon duplicate ticket floods, and zero-budget AI requirements.

---

## Why I Built This (The Problem)

Anyone living in Bengaluru, Mumbai, Delhi, or Pune knows how broken civic complaint apps usually are. During monsoons, a single crater on an arterial road or a choked drain (*raakaluve*) gets reported by 40 different commuters within two hours.

Existing municipal portals break down because of three practical engineering bottlenecks:

1. **Crazy Cloud AI Bills**: Using cloud vision APIs like OpenAI GPT-4V or Google Gemini costs ₹12 to ₹20 per image. If a city corporation like BBMP or BMC receives 30,000 complaints a day, that is lakhs of rupees daily just in API bills. Public bodies simply cannot afford that.
2. **Duplicate Ticket Floods**: When 50 people report the exact same pothole on the same street corner, the municipal dashboard gets flooded with 50 separate tickets. Junior engineers get overwhelmed, and genuine urgent complaints get lost in the noise.
3. **Heavy Uploads on Slow Mobile Data**: Most citizens report issues from the street on budget Android phones with slow or spotty mobile data. Trying to upload a raw 8MB–12MB camera photo fails half the time. On top of that, people upload blurry photos taken from moving autos, forwarded WhatsApp screenshots, or accidental selfies.

---

## What CivicConnect Does (The Solution)

CivicConnect fixes these issues by running image detection directly in the citizen's browser and handling complaints intelligently at the ward level:

* **Free In-Browser AI (Zero Cloud API Costs)**: The app classifies images right inside the browser using Hugging Face Transformers.js (`Xenova/clip-vit-base-patch32`) along with a fast 15ms canvas edge vision engine. It detects whether the photo is a pothole, garbage dump, water leak, or broken streetlight without sending the image to any paid AI server.
* **Geospatial Deduplication (500m Ward Radius)**: Using MongoDB geospatial indexing (`2dsphere`), the app checks if an issue has already been reported nearby. Instead of creating a duplicate ticket, citizens can simply upvote ("+1 Me Too") the existing complaint. This boosts the issue's priority for ward engineers without cluttering their dashboard.
* **Smart Photo Filter**: Before uploading, the browser checks the photo using basic pixel math:
  * Rejects blurry or out-of-focus photos (Laplacian variance check).
  * Rejects personal selfies or human portraits (skin-tone locus detection).
  * Rejects flat digital screenshots and memes.
* **Compressed for Indian Mobile Networks**: Heavy smartphone photos (5MB–12MB) are automatically resized and compressed in-browser to ~150KB–200KB before uploading (>90% data saved), so reports submit smoothly even on weak networks.
* **Auto-Routing to Departments**: Once confirmed, issues route automatically to the responsible department:
  * Potholes / Footpaths → Roads & Infrastructure (PWD)
  * Water Leaks → Water Supply (Jal Board / BWSSB)
  * Overflowing Trash → Sanitation & Waste Management (Swachhata Wing)
  * Broken Streetlights → Street Lighting (DISCOM / Electrical Dept)
  * Open Manholes → Drainage (Flagged as Critical)

---

## Tech Stack

* **Frontend**: React 19, Vite, Leaflet.js (OpenStreetMap), Axios
* **AI & Vision**: Hugging Face Transformers.js (CLIP ViT-B/32 running on WebGPU / WASM) + In-browser Canvas Edge Vision
* **Backend**: Node.js, Express.js
* **Database**: MongoDB Atlas (GeoJSON Point & `2dsphere` index for spatial queries)
* **Auth**: JWT (JSON Web Tokens) with bcrypt password hashing
* **File Storage**: Cloudinary (with an automatic fallback to local disk storage if Cloudinary keys aren't added)

---

## Running Locally

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/civic_connect.git
cd civic_connect

# Installs dependencies for both client and server
npm run install:all
```

### 2. Environment Setup
Create a `.env` file in the `server` folder (or copy from `server/.env.example`):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=civicconnect_secret_key_2026
JWT_EXPIRES_IN=7d
MONGODB_URI=your_mongodb_connection_string

# Optional: Add Cloudinary keys if you have them, otherwise it saves photos locally
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Start the Dev Servers
```bash
npm run dev
```
* Client runs at: **http://localhost:5173**
* Backend API runs at: **http://localhost:5000**

---

## Demo Accounts (Password: `Password123!`)

The database comes pre-seeded with these accounts for testing different roles:

| Role | Email | What They Can Do |
|---|---|---|
| **Super Admin** | `superadmin@civicconnect.org` | Full city-wide view across all departments, user management |
| **Roads Admin** | `roads.admin@civicconnect.org` | Manages PWD issues (potholes, damaged footpaths) |
| **Water Admin** | `water.admin@civicconnect.org` | Manages water supply and pipeline leak complaints |
| **Electricity Admin** | `electricity.admin@civicconnect.org` | Manages electrical hazards and power issues |
| **Sanitation Admin** | `sanitation.admin@civicconnect.org` | Manages garbage dumps and waste overflow |
| **Drainage Admin** | `drainage.admin@civicconnect.org` | Manages open manholes and flooded storm drains |
| **Lighting Admin** | `lighting.admin@civicconnect.org` | Manages broken streetlight complaints |
| **Citizen (Alex)** | `alex.citizen@gmail.com` | Reports issues, upvotes nearby problems, tracks status |
