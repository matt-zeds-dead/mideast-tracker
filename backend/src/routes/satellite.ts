/**
 * Satellite Imagery API Routes
 * Provides metadata about available satellite layers
 * Actual tiles are fetched directly by client from GIBS/Sentinel
 */

import { Router, Request, Response } from 'express';

const router = Router();

// GIBS (NASA) layer definitions — free, no auth needed
const GIBS_LAYERS = [
  {
    id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    name: 'True Color (MODIS Terra)',
    description: 'Daily true-color satellite imagery from NASA MODIS Terra. Good for general overview.',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    maxZoom: 9,
    attribution: 'Imagery from NASA GIBS - MODIS Terra',
    updateFrequency: 'daily',
    icon: '🌍',
  },
  {
    id: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
    name: 'True Color (MODIS Aqua)',
    description: 'Alternate daily true-color pass from NASA MODIS Aqua satellite.',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    maxZoom: 9,
    attribution: 'Imagery from NASA GIBS - MODIS Aqua',
    updateFrequency: 'daily',
    icon: '🌊',
  },
  {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    name: 'True Color (VIIRS SNPP)',
    description: 'High-quality daily true-color from Suomi NPP VIIRS — sharper than MODIS.',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    maxZoom: 9,
    attribution: 'Imagery from NASA GIBS - VIIRS SNPP',
    updateFrequency: 'daily',
    icon: '🛸',
  },
  {
    id: 'MODIS_Terra_CorrectedReflectance_Bands721',
    name: 'False Color / Fire Detection (MODIS)',
    description: 'Band 7-2-1 composite highlights fires, burn scars, and smoke. Useful for detecting explosions or military activity.',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    maxZoom: 9,
    attribution: 'Imagery from NASA GIBS - MODIS False Color',
    updateFrequency: 'daily',
    icon: '🔥',
  },
  {
    id: 'VIIRS_SNPP_DayNightBand_ENCC',
    name: 'Night Lights (VIIRS)',
    description: 'Nighttime light emissions — useful for detecting infrastructure changes or blackouts.',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_ENCC/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    maxZoom: 8,
    attribution: 'Imagery from NASA GIBS - VIIRS Night Lights',
    updateFrequency: 'daily',
    icon: '🌙',
  },
  {
    id: 'MODIS_Terra_Aerosol',
    name: 'Dust/Aerosol (MODIS)',
    description: 'Aerosol optical depth — shows dust storms and smoke plumes common in UAE.',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Aerosol/default/{date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
    maxZoom: 6,
    attribution: 'Imagery from NASA GIBS - MODIS Aerosol',
    updateFrequency: 'daily',
    icon: '💨',
  },
];

// Sentinel Hub layers (requires free account — note in docs)
const SENTINEL_LAYERS = [
  {
    id: 'sentinel2-true-color',
    name: 'Sentinel-2 True Color (10m)',
    description: 'High-res 10m true color from ESA Sentinel-2. Best for detail. Requires free Sentinel Hub account.',
    type: 'wms',
    provider: 'Sentinel Hub',
    requiresAuth: true,
    signupUrl: 'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/auth',
    urlTemplate: 'https://services.sentinel-hub.com/ogc/wms/{INSTANCE_ID}?SERVICE=WMS&REQUEST=GetMap&LAYERS=TRUE_COLOR&BBOX={bbox}&WIDTH=512&HEIGHT=512&FORMAT=image/jpeg&TIME={date}/{date}&CRS=EPSG:3857',
    maxZoom: 15,
    attribution: 'Contains modified Copernicus Sentinel data 2024/EU',
    updateFrequency: '5 days',
    icon: '🛰️',
  },
];

// GET /api/satellite/layers
router.get('/layers', (_req: Request, res: Response) => {
  res.json({
    gibs: GIBS_LAYERS,
    sentinel: SENTINEL_LAYERS,
    notes: [
      'GIBS layers are free from NASA — no API key required.',
      'Sentinel Hub requires a free account at sentinel-hub.com',
      'Imagery is near-real-time (hours to days old), NOT live.',
      'Dates use YYYY-MM-DD format. Use /api/satellite/latest-date for today.',
    ],
  });
});

// GET /api/satellite/latest-date - returns today's date for tile URLs
router.get('/latest-date', (_req: Request, res: Response) => {
  // GIBS typically has imagery from yesterday (1-day lag)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  res.json({
    date: dateStr,
    displayDate: yesterday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    note: 'GIBS usually has imagery from 1-2 days ago. Some layers may have longer delays.',
  });
});

export default router;
