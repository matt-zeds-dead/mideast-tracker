import axios from 'axios';

const MILITARY_CALLSIGNS = [
  'REACH', 'RCH', 'EVAC', 'JAKE', 'POLO', 'QUID',
  'KNIFE', 'BRONZE', 'TIGER', 'VIPER', 'HAWK',
  'USAF', 'ARMY', 'NAVY', 'USMC', 'UAE', 'RSAF',
];

function detectMilitary(callsign: string, originCountry: string): boolean {
  const cs = (callsign || '').toUpperCase();
  return MILITARY_CALLSIGNS.some(m => cs.startsWith(m));
}

export async function fetchFlights() {
  try {
    const response = await axios.get(
      'https://opensky-network.org/api/states/all?lamin=20&lomin=48&lamax=28&lomax=60',
      { timeout: 15000, headers: { 'User-Agent': 'GulfWatch/2.0' } }
    );

    const states = response.data?.states || [];
    const flights = [];

    for (const s of states) {
      const [icao24, callsign, originCountry, , lastContact,
        lng, lat, altitude, onGround, velocity, heading, , , , squawk] = s;

      if (!lat || !lng) continue;

      const isMilitary = detectMilitary(callsign || '', originCountry || '');

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
