import { Router } from 'express';
import { fetchFlights } from '../services/flightFetcher';

const router = Router();
let cachedFlights: any[] = [];
let lastFetch = 0;

router.get('/', async (_req, res) => {
  try {
    if (Date.now() - lastFetch > 120000) {
      cachedFlights = await fetchFlights();
      lastFetch = Date.now();
    }
    res.json({
      flights: cachedFlights,
      count: cachedFlights.length,
      military: cachedFlights.filter(f => f.isMilitary).length,
      updatedAt: new Date(lastFetch),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

export default router;
