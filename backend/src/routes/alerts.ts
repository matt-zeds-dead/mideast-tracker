/**
 * Alerts API Routes
 * GET /api/alerts - recent high-priority alerts
 */

import { Router, Request, Response } from 'express';
import NewsItem from '../models/NewsItem';

const router = Router();

// GET /api/alerts - recent military/security alerts (last 24h)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    const alerts = await NewsItem.find({
      isMilitary: true,
      publishedAt: { $gte: since },
    })
      .sort({ publishedAt: -1 })
      .limit(20)
      .lean();

    res.json({ alerts, count: alerts.length });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// GET /api/alerts/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, military, byCategory] = await Promise.all([
      NewsItem.countDocuments({ publishedAt: { $gte: since } }),
      NewsItem.countDocuments({ isMilitary: true, publishedAt: { $gte: since } }),
      NewsItem.aggregate([
        { $match: { publishedAt: { $gte: since } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ total, military, byCategory });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
