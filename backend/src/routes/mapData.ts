/**
 * Map Data API Routes
 * GET /api/map-data - geo-located news items for map display
 */

import { Router, Request, Response } from 'express';
import NewsItem from '../models/NewsItem';

const router = Router();

// GET /api/map-data - all geo-located news for map pins
router.get('/', async (req: Request, res: Response) => {
  try {
    const militaryOnly = req.query.military === 'true';
    const hours = parseInt(String(req.query.hours || '48'));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const filter: Record<string, unknown> = {
      location: { $ne: null },
      publishedAt: { $gte: since },
    };

    if (militaryOnly) filter.isMilitary = true;

    const items = await NewsItem.find(filter)
      .select('title source location isMilitary category publishedAt url militaryKeywords')
      .sort({ publishedAt: -1 })
      .limit(200)
      .lean();

    // Format as GeoJSON-like for map
    const features = items.map(item => ({
      id: item._id,
      title: item.title,
      source: item.source,
      location: item.location,
      isMilitary: item.isMilitary,
      category: item.category,
      publishedAt: item.publishedAt,
      url: item.url,
      keywords: item.militaryKeywords,
    }));

    res.json({ features, count: features.length });
  } catch {
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

export default router;
