/**
 * News API Routes
 * GET /api/news - paginated news feed
 * GET /api/news/military - military-flagged news only
 */

import { Router, Request, Response } from 'express';
import NewsItem from '../models/NewsItem';

const router = Router();

// GET /api/news
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit || '20'));
    const source = req.query.source as string | undefined;
    const category = req.query.category as string | undefined;

    const filter: Record<string, unknown> = {};
    if (source) filter.source = source;
    if (category) filter.category = category;

    const [items, total] = await Promise.all([
      NewsItem.find(filter)
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NewsItem.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// GET /api/news/military
router.get('/military', async (_req: Request, res: Response) => {
  try {
    const items = await NewsItem.find({ isMilitary: true })
      .sort({ publishedAt: -1 })
      .limit(50)
      .lean();
    res.json({ items });
  } catch {
    res.status(500).json({ error: 'Failed to fetch military news' });
  }
});

// GET /api/news/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await NewsItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

export default router;
