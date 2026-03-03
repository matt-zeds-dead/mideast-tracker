import { Router } from 'express';
import { fetchShips } from '../services/shipFetcher';

const router = Router();
let cachedShips: any[] = [];
let lastFetch = 0;

router.get('/', async (_req, res) => {
  try {
    if (Date.now() - lastFetch > 300000) {
      cachedShips = await fetchShips();
      lastFetch = Date.now();
    }
    res.json({
      ships: cachedShips,
      count: cachedShips.length,
      military: cachedShips.filter(s => s.isMilitary).length,
      carriers: cachedShips.filter(s => s.isCarrier).length,
      updatedAt: new Date(lastFetch),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch ships' });
  }
});

export default router;
