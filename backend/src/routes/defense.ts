import { Router } from 'express';
import { fetchDefenseFeeds } from '../services/defenseFetcher';

const router = Router();
let cachedItems: any[] = [];
let lastFetch = 0;

router.get('/', async (_req, res) => {
  try {
    if (Date.now() - lastFetch > 900000) {
      cachedItems = await fetchDefenseFeeds();
      lastFetch = Date.now();
    }
    res.json({
      items: cachedItems,
      highPriority: cachedItems.filter(i => i.isHighPriority),
      updatedAt: new Date(lastFetch),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch defense feeds' });
  }
});

export default router;
