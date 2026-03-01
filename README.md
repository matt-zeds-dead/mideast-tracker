# 🌍 Gulf Watch — Real-Time Middle East News Tracker

A full-stack application for tracking news, alerts, and events in Dubai, Abu Dhabi, and the broader Middle East. Features real-time updates, military event detection, an interactive map, and **NASA GIBS satellite imagery overlays**.

---

## 📁 Project Structure

```
mideast-tracker/
├── backend/          # Node.js + Express + Socket.io + MongoDB
│   └── src/
│       ├── index.ts            # Server entry point
│       ├── models/NewsItem.ts  # MongoDB schema
│       ├── routes/
│       │   ├── news.ts         # GET /api/news
│       │   ├── alerts.ts       # GET /api/alerts
│       │   ├── mapData.ts      # GET /api/map-data
│       │   └── satellite.ts    # GET /api/satellite/layers
│       └── services/
│           ├── feedFetcher.ts     # RSS/NewsAPI aggregation
│           ├── militaryDetector.ts # Keyword-based NLP
│           ├── geocoder.ts        # Location extraction
│           └── broadcaster.ts    # Socket.io broadcasting
│
├── web/              # Next.js + React + Tailwind CSS → Vercel
│   └── src/
│       ├── app/page.tsx        # Main dashboard
│       ├── app/layout.tsx      # Root layout
│       ├── components/
│       │   ├── MapView.tsx     # Leaflet map + GIBS satellite layers
│       │   ├── NewsCard.tsx    # News item display
│       │   └── Header.tsx      # App header
│       ├── hooks/useSocket.ts  # Real-time Socket.io hook
│       ├── lib/api.ts          # Axios API client
│       └── types/index.ts      # TypeScript types
│
└── mobile/           # React Native + Expo
    ├── App.tsx                 # Navigation root
    └── src/screens/
        ├── MapScreen.tsx       # react-native-maps + GIBS tiles
        └── NewsScreen.tsx      # News feed with real-time updates
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free tier)
- NewsAPI.org account (free tier, 100 req/day)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and API keys
npm install
npm run dev
# Server runs at http://localhost:4000
```

### 2. Web Frontend Setup

```bash
cd web
cp .env.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev
# App runs at http://localhost:3000
```

### 3. Mobile Setup (Expo)

```bash
cd mobile
npm install
npx expo start
# Scan QR code with Expo Go app
```

---

## 🛰️ Satellite Imagery Integration

### NASA GIBS (Free, No API Key Required)

All satellite layers use **NASA GIBS (Global Imagery Browse Services)** — completely free, public domain data with daily updates.

**Available Layers:**

| Layer | Description | Best Use |
|-------|-------------|----------|
| VIIRS True Color | Daily true-color, sharper than MODIS | General overview |
| MODIS Terra True Color | Daily global coverage | Cloud detection |
| False Color (Bands 7-2-1) | Highlights fires, smoke, burn scars | Military/explosion detection |
| Night Lights (VIIRS DNB) | Nighttime light emission | Blackouts, infrastructure |
| Dust/Aerosol (MODIS) | Aerosol optical depth | Dust storms, smoke plumes |

**Tile URL Format:**
```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{LAYER_ID}/default/{YYYY-MM-DD}/GoogleMapsCompatible_Level{N}/{z}/{y}/{x}.jpg
```

**Notes:**
- Imagery is typically 1-2 days delayed (near-real-time, not live)
- Resolution: ~250m for MODIS, ~375m for VIIRS
- Max zoom level 9 for most layers
- No CORS issues — public CDN tiles

### Sentinel Hub (10m Resolution — Requires Free Account)

For higher resolution (10m) Sentinel-2 imagery:
1. Register at [sentinel-hub.com](https://www.sentinel-hub.com/)
2. Create a Configuration in the dashboard
3. Copy your Instance ID to `SENTINEL_HUB_INSTANCE_ID` in `.env`
4. Use the WMS endpoint in MapView

```
https://services.sentinel-hub.com/ogc/wms/{INSTANCE_ID}?
  SERVICE=WMS&REQUEST=GetMap&
  LAYERS=TRUE_COLOR&
  BBOX={bbox}&WIDTH=512&HEIGHT=512&
  FORMAT=image/jpeg&
  TIME={date}/{date}&
  CRS=EPSG:3857
```

**Legal Note:** Sentinel data is free for non-commercial use under the Copernicus Open License. Always attribute: "Contains modified Copernicus Sentinel data [year]/EU"

---

## 🚨 Military Detection

The `militaryDetector.ts` service scans article text for keywords across these categories:

- **Direct military**: army, navy, troops, airstrike, missile, etc.
- **Regional context**: houthi, IRGC, Hezbollah, Hamas, coalition, etc.
- **UAE-specific**: Emirati forces, UAE military, joint exercises
- **Security events**: arrests, surveillance, border incidents

Military-flagged items appear with:
- Red left border on news cards
- Pulsing red markers on map
- Push notifications (web + mobile)
- Separate "Alerts" tab

---

## 📡 Data Sources

| Source | Type | Update Frequency |
|--------|------|-----------------|
| Al Jazeera | RSS | ~hourly |
| BBC Middle East | RSS | ~hourly |
| Gulf News UAE | RSS | ~hourly |
| Khaleej Times | RSS | ~hourly |
| The National UAE | RSS | ~hourly |
| Google News (UAE) | RSS | ~15 min |
| Google News (Military) | RSS | ~15 min |
| NewsAPI.org | API | On demand |

Backend polls all sources every **10 minutes** via cron job. New items are broadcast to clients via **Socket.io**.

---

## 🌐 Deployment

### Web → Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# From web/ directory
vercel login
vercel --prod

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-backend.onrender.com
# NEXT_PUBLIC_SOCKET_URL = https://your-backend.onrender.com
```

### Backend → Render (Free Tier)

1. Push `backend/` to GitHub
2. Create new Web Service at [render.com](https://render.com)
3. Connect repository
4. Set environment variables (MongoDB URI, API keys)
5. Set build command: `npm install && npm run build`
6. Set start command: `npm start`
7. Choose Singapore region (closest to UAE)

**Important:** Socket.io requires WebSocket support. Render free tier supports this.

### Mobile → App Stores

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build
cd mobile
eas build --platform android  # APK for Google Play
eas build --platform ios      # IPA for App Store (needs Apple dev account $99/yr)

# Submit
eas submit --platform android  # Requires Google Play console account
eas submit --platform ios      # Requires App Store Connect account
```

---

## 🔒 Security & Legal

- **API Keys**: Never commit to git. Use environment variables only.
- **RSS Scraping**: Respects `robots.txt`, uses public RSS feeds only.
- **Satellite Imagery**: NASA GIBS is public domain. Sentinel is free for non-commercial.
- **Twitter/X API**: Rate limits apply. Bearer token for read-only searches.
- **Data Labeling**: All satellite imagery labeled as "near-real-time (updated daily)" — never "live" or "real-time".
- **Geolocation**: Uses OpenStreetMap Nominatim — 1 req/sec max, proper User-Agent required.

---

## 🔧 Configuration

| Variable | Service | Description |
|----------|---------|-------------|
| `MONGODB_URI` | Backend | MongoDB Atlas connection string |
| `NEWS_API_KEY` | Backend | NewsAPI.org key (100 req/day free) |
| `TWITTER_BEARER_TOKEN` | Backend | X API v2 bearer token (optional) |
| `SENTINEL_HUB_INSTANCE_ID` | Web/Mobile | Sentinel Hub WMS instance ID |
| `NEXT_PUBLIC_API_URL` | Web | Backend API URL |
| `EXPO_PUBLIC_API_URL` | Mobile | Backend API URL |

---

## 🗺️ Map Features

- **Base Layer**: OpenStreetMap
- **Satellite Overlays**: NASA GIBS (5 layers with date picker)
- **Markers**: Color-coded by category (military=red, security=orange, etc.)
- **Popups**: Article title, source, location, keywords, link
- **Layer Control**: Toggle satellite overlays with opacity slider
- **Date Picker**: View historical satellite imagery
- **Auto-pan**: Clicking news item pans map to location

---

*Built with ❤️ for regional awareness. Not affiliated with any government or intelligence agency.*
