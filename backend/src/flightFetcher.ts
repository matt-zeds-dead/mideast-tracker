/**
 * Flight Fetcher — OpenSky Network (free, no key needed)
 * Fetches all aircraft over UAE/Gulf region
 * Bounding box: lat 22-27, lon 51-57
 */
import axios from 'axios';

// Military callsign prefixes (US mil = REACH/EVAC/RCH, etc.)
const MILITARY_CALLSIGNS = [
  'REACH', 'RCH', 'EVAC', 'JAKE', 'POLO', 'QUID',
  'KNIFE', 'BRONZE', 'TIGER', 'VIPER', 'HAWK',
  'USAF', 'ARMY', 'NAVY', 'USMC', 'UAE', 'RSAF',
];

const INTERESTING_SQUAWKS = ['7500', '7600', '7700']; // Emergency codes

function detectMilitary(callsign: string, originCountry: string): boolean {
  const cs = (callsign || '').toUpperCase();
  return MILITARY_CALLSIGNS.some(m => cs.startsWith(m)) ||
    ['United States', 'United Arab Emirates', 'Saudi Arabia', 'Israel'].includes(originCountry) &&
    cs.match(/^[A-Z]{2,4}\d{3,5}$/) !== null;
}

export async function fetchFlights() {
  try {
    // OpenSky bounding box covering UAE + Persian Gulf + Red Sea approaches
    const response = await axios.get(
      'https://opensky-network.org/api/states/all?lamin=20&lomin=48&lamax=28&lomax=60',
      { timeout: 15000, headers: { 'User-Agent': 'GulfWatch/2.0' } }
    );

    const states = response.data?.states || [];
    const flights = [];

    for (const s of states) {
      // OpenSky state vector fields:
      // [icao24, callsign, origin_country, time_position, last_contact,
      //  longitude, latitude, baro_altitude, on_ground, velocity,
      //  true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
      const [icao24, callsign, originCountry, , lastContact,
        lng, lat, altitude, onGround, velocity, heading, , , , squawk] = s;

      if (!lat || !lng) continue;

      const isMilitary = detectMilitary(callsign || '', originCountry || '');
      const isInteresting = INTERESTING_SQUAWKS.includes(squawk || '') || isMilitary;

      flights.push({
        icao24,
        callsign: (callsign || '').trim(),
        originCountry: originCountry || '',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        altitude: altitude || 0,
        velocity: velocity || 0,
        heading: heading || 0,
        onGround: onGround || false,
        isMilitary,
        isInteresting,
        squawk: squawk || '',
        lastContact: new Date((lastContact || 0) * 1000),
        fetchedAt: new Date(),
      });
    }

    console.log(`✈️ ${flights.length} flights (${flights.filter(f => f.isMilitary).length} military)`);
    return flights;
  } catch (err) {
    console.error('Flight fetch failed:', err);
    return [];
  }
}
