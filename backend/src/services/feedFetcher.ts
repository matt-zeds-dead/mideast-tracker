/**
 * Feed Fetcher Service
 * Fetches news from RSS feeds and NewsAPI
 * Parses, geocodes, and detects military content
 */

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { analyzeMilitaryContent } from './militaryDetector';
import { getNewsLocation } from './geocoder';
import NewsItem, { INewsItem } from '../models/NewsItem';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

// RSS feed sources focused on Middle East / UAE
const RSS_FEEDS = [
  {
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    source: 'Al Jazeera',
  },
  {
    url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
    source: 'BBC Middle East',
  },
  {
    url: 'https://gulfnews.com/rss/uae',
    source: 'Gulf News UAE',
  },
  {
    url: 'https://www.khaleejtimes.com/rss',
    source: 'Khaleej Times',
  },
  {
    url: 'https://www.thenationalnews.com/rss/uae',
    source: 'The National UAE',
  },
  {
    url: 'https://news.google.com/rss/search?q=Dubai+OR+Abu+Dhabi+news&hl=en-US&gl=US&ceid=US:en',
    source: 'Google News UAE',
  },
  {
    url: 'https://news.google.com/rss/search?q=Middle+East+military+security&hl=en-US&gl=US&ceid=US:en',
    source: 'Google News Military',
  },
];

interface RawFeedItem {
  title: string;
  description: string;
  link: string;
  pubDate?: string;
  enclosure?: { '@_url': string };
  'media:content'?: { '@_url': string };
  guid?: string | { '#text': string };
}

/**
 * Parse RSS XML and extract news items
 */
function parseRSSFeed(xml: string, source: string): RawFeedItem[] {
  try {
    const result = parser.parse(xml);
    const channel = result?.rss?.channel || result?.feed;
    if (!channel) return [];

    const items = channel.item || channel.entry || [];
    return Array.isArray(items) ? items : [items];
  } catch {
    console.error(`Failed to parse RSS for ${source}`);
    return [];
  }
}

/**
 * Fetch a single RSS feed
 */
async function fetchRSSFeed(feedUrl: string, source: string): Promise<Partial<INewsItem>[]> {
  try {
    const response = await axios.get(feedUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'MideastTracker/1.0' },
    });

    const rawItems = parseRSSFeed(response.data, source);
    const newsItems: Partial<INewsItem>[] = [];

    for (const item of rawItems.slice(0, 20)) { // Limit per feed
      const title = String(item.title || '').trim();
      const description = String(item.description || '').replace(/<[^>]*>/g, '').trim();
      const url = String(item.link || '').trim();

      if (!title || !url) continue;

      // Generate stable GUID
      const rawGuid = item.guid;
      const guid = typeof rawGuid === 'string' ? rawGuid : (rawGuid?.['#text'] || url);

      // Military detection
      const analysis = analyzeMilitaryContent(`${title} ${description}`);

      // Location extraction
      const location = getNewsLocation(title, description);

      // Image extraction
      const imageUrl = item.enclosure?.['@_url'] || item['media:content']?.['@_url'] || null;

      // Parse date
      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

      newsItems.push({
        title,
        description: description.slice(0, 500), // Limit description length
        url,
        source,
        location: location ? { name: location.name, lat: location.lat, lng: location.lng } : undefined,
        isMilitary: analysis.isMilitary,
        militaryKeywords: analysis.matchedKeywords,
        category: analysis.category,
        imageUrl: imageUrl || null,
        publishedAt,
        fetchedAt: new Date(),
        guid,
      });
    }

    return newsItems;
  } catch (err) {
    console.error(`Failed to fetch ${source}: ${err}`);
    return [];
  }
}

/**
 * Fetch from NewsAPI.org (free tier: 100 req/day)
 */
async function fetchNewsAPI(): Promise<Partial<INewsItem>[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'UAE OR Dubai OR "Abu Dhabi" OR "Middle East" military',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 20,
        apiKey,
      },
      timeout: 10000,
    });

    const articles = response.data?.articles || [];
    return articles.map((article: Record<string, string>) => {
      const analysis = analyzeMilitaryContent(`${article.title} ${article.description}`);
      const location = getNewsLocation(article.title, article.description || '');

      return {
        title: article.title,
        description: (article.description || '').slice(0, 500),
        url: article.url,
        source: (article.source as { name?: string })?.name || 'NewsAPI',
        location: location ? { name: location.name, lat: location.lat, lng: location.lng } : undefined,
        isMilitary: analysis.isMilitary,
        militaryKeywords: analysis.matchedKeywords,
        category: analysis.category,
        imageUrl: article.urlToImage || null,
        publishedAt: new Date(article.publishedAt),
        fetchedAt: new Date(),
        guid: article.url,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Main: Fetch all feeds, deduplicate, save to DB, return new items
 */
export async function fetchAllFeeds(): Promise<INewsItem[]> {
  const allItems: Partial<INewsItem>[] = [];

  // Fetch all RSS feeds in parallel
  const rssPromises = RSS_FEEDS.map(({ url, source }) => fetchRSSFeed(url, source));
  const rssResults = await Promise.allSettled(rssPromises);

  rssResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  });

  // Fetch NewsAPI
  const newsApiItems = await fetchNewsAPI();
  allItems.push(...newsApiItems);

  // Save new items (upsert by guid)
  const newItems: INewsItem[] = [];

  for (const item of allItems) {
    if (!item.guid) continue;
    try {
      const existing = await NewsItem.findOne({ guid: item.guid });
      if (!existing) {
        const saved = await NewsItem.create(item);
        newItems.push(saved);
      }
    } catch {
      // Ignore duplicate key errors
    }
  }

  console.log(`📰 Saved ${newItems.length} new items (${newItems.filter(i => i.isMilitary).length} military)`);
  return newItems;
}
