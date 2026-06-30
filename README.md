# CivicSense AI

Empowering Citizens. Enabling Smart Governance.

A complete MERN stack application featuring real-time transparency heatmaps and AI-powered duplicate detection using Google Gemini.

## Features
- **Real-Time Heatmap**: Uses Leaflet.heat and Socket.io to visualize civic issues as they are reported.
- **AI Duplicate Detection**: Compares uploaded images and descriptions of nearby issues using Google Gemini 1.5 Pro to prevent redundant reporting and encourage community support.
- **Role-Based Dashboards**: Customized views for Citizens, Officers, and Admins.
- **Premium UI**: Built with React, Tailwind CSS v4, and Glassmorphism effects.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account
- Cloudinary Account
- Google Gemini API Key

### Backend Setup
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your API keys.
4. `npm run dev` (Starts on port 5000)

### Frontend Setup
1. `cd client`
2. `npm install`
3. Copy `.env.example` to `.env`.
4. `npm run dev` (Starts on port 5173)
