/**
 * Geocoder Service
 * Extracts location names from text and converts to lat/lng
 * Uses Nominatim (OpenStreetMap) — free, no API key needed
 */

import axios from 'axios';

// Known locations for Middle East — fast lookup without API call
const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  dubai: { lat: 25.2048, lng: 55.2708, name: 'Dubai, UAE' },
  'abu dhabi': { lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi, UAE' },
  sharjah: { lat: 25.3463, lng: 55.4209, name: 'Sharjah, UAE' },
  ajman: { lat: 25.4052, lng: 55.5136, name: 'Ajman, UAE' },
  fujairah: { lat: 25.1288, lng: 56.3265, name: 'Fujairah, UAE' },
  'ras al khaimah': { lat: 25.8007, lng: 55.9762, name: 'Ras Al Khaimah, UAE' },
  uae: { lat: 24.0, lng: 54.0, name: 'UAE' },
  'united arab emirates': { lat: 24.0, lng: 54.0, name: 'UAE' },
  riyadh: { lat: 24.6877, lng: 46.7219, name: 'Riyadh, Saudi Arabia' },
  doha: { lat: 25.2854, lng: 51.531, name: 'Doha, Qatar' },
  kuwait: { lat: 29.3759, lng: 47.9774, name: 'Kuwait City' },
  muscat: { lat: 23.5880, lng: 58.3829, name: 'Muscat, Oman' },
  manama: { lat: 26.2041, lng: 50.5860, name: 'Manama, Bahrain' },
  tehran: { lat: 35.6892, lng: 51.3890, name: 'Tehran, Iran' },
  baghdad: { lat: 33.3152, lng: 44.3661, name: 'Baghdad, Iraq' },
  beirut: { lat: 33.8938, lng: 35.5018, name: 'Beirut, Lebanon' },
  'tel aviv': { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv, Israel' },
  jerusalem: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  gaza: { lat: 31.5017, lng: 34.4668, name: 'Gaza' },
  yemen: { lat: 15.5527, lng: 48.5164, name: 'Yemen' },
  sanaa: { lat: 15.3694, lng: 44.1910, name: "Sana'a, Yemen" },
  aden: { lat: 12.7794, lng: 45.0367, name: 'Aden, Yemen' },
  'red sea': { lat: 20.0, lng: 38.0, name: 'Red Sea' },
  'strait of hormuz': { lat: 26.6, lng: 56.3, name: 'Strait of Hormuz' },
  'persian gulf': { lat: 26.5, lng: 52.0, name: 'Persian Gulf' },
  'arabian sea': { lat: 16.0, lng: 63.0, name: 'Arabian Sea' },
};

// Default location for unresolved news
const DEFAULT_LOCATION = { lat: 25.2048, lng: 55.2708, name: 'Dubai, UAE' };

/**
 * Extract location from article text using known location lookup
 */
export function extractLocationFromText(text: string): { lat: number; lng: number; name: string } | null {
  if (!text) return null;
  const lowerText = text.toLowerCase();

  // Check known locations (longer names first to avoid partial matches)
  const sortedLocations = Object.entries(KNOWN_LOCATIONS)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [keyword, location] of sortedLocations) {
    if (lowerText.includes(keyword)) {
      return location;
    }
  }

  return null;
}

/**
 * Geocode a location string using Nominatim (free OSM geocoder)
 * Rate limited: max 1 request/second per Nominatim ToS
 */
export async function geocodeLocation(locationName: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: locationName,
        format: 'json',
        limit: 1,
        countrycodes: 'ae,sa,ir,iq,ye,jo,sy,lb,il,qa,kw,bh,om',
      },
      headers: {
        'User-Agent': 'MideastNewsTracker/1.0 (contact@example.com)',
      },
      timeout: 5000,
    });

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return { lat: parseFloat(lat), lng: parseFloat(lon) };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get location for a news item — tries known lookup first, falls back to default UAE
 */
export function getNewsLocation(title: string, description: string): {
  name: string;
  lat: number;
  lng: number;
} | null {
  const combined = `${title} ${description}`;
  const extracted = extractLocationFromText(combined);

  if (extracted) return extracted;

  // If no location found but seems Middle East related, use Dubai as default
  if (/uae|dubai|abu dhabi|middle east|gulf|arab/i.test(combined)) {
    return DEFAULT_LOCATION;
  }

  return null;
}
