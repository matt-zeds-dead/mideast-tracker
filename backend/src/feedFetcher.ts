import axios from 'axios';
import Parser from 'rss-parser';
import { analyzeMilitaryContent } from './militaryDetector';
import { getNewsLocation } from './geocoder';
import NewsItem from '../models/NewsItem';

const parser = new Parser({ timeout: 10000 });

const RSS_FEEDS = [
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East' },
  { url: 'https://www.arabnews.com/rss.xml', source: 'Arab News' },
  { url: 'https://english.alarabiya.net/rss', source: 'Al Arabiya' },
  { url: 'https://news.google.com/rss/search?q=Dubai+OR+%22Abu+Dhabi%22+news&hl=en&gl=US&ceid=US:en', source: 'Google News UAE' },
  { url: 'https://news.google.com/rss/search?q=Middle+East+military+security&hl=en&gl=US&ceid=US:en', source: 'Google News Military' },
  { url: 'https://news.google.com/rss/search?q=Houthi+Yemen+Red+Sea&hl=en&gl=US&ceid=US:en', source: 'Google News Houthi' },
  { url: 'https://news.google.com/rss/search?q=Iran+nuclear+sanctions&hl=en&gl=US&ceid=US:en', source: 'Google News Iran' },
  { url: 'https://news.google.com/rss/search?q=Gaza+Israel+ceasefire&hl=en&gl=US&ceid=US:en', source: 'Google News Gaza' },
];

export async function fetchAllFeeds() {
  const allItems: any[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of (parsed.items || []).slice(0, 15)) {
        const title = item.title || '';
        const description = (item.contentSnippet || '').slice(0, 500);
        const url = item.link || '';
        if (!title || !url) continue;

        const analysis = analyzeMilitaryContent(`${title} ${description}`);
        const location = getNewsLocation(title, description);

        allItems.push({
          title,
          description,
          url,
          source: feed.source,
          location,
          isMilitary: analysis.isMilitary,
          militaryKeywords: analysis.matchedKeywords,
          category: analysis.category,
          imageUrl: null,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          fetchedAt: new Date(),
          guid: item.guid || url,
        });
      }
    } catch (err) {
      console.error(`Feed failed ${feed.source}:`, err);
    }
  }

  // NewsAPI
  if (process.env.NEWS_API_KEY) {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'UAE OR Dubai OR "Middle East" OR Houthi OR Iran military',
          language: 'en', sortBy: 'publishedAt', pageSize: 20,
          apiKey: process.env.NEWS_API_KEY,
        },
        timeout: 10000,
      });
      for (const article of (response.data?.articles || [])) {
        const analysis = analyzeMilitaryContent(`${article.title} ${article.description}`);
        const location = getNewsLocation(article.title, article.description || '');
        allItems.push({
          title: article.title,
          description: (article.description || '').slice(0, 500),
          url: article.url,
          source: article.source?.name || 'NewsAPI',
          location,
          isMilitary: analysis.isMilitary,
          militaryKeywords: analysis.matchedKeywords,
          category: analysis.category,
          imageUrl: article.urlToImage || null,
          publishedAt: new Date(article.publishedAt),
          fetchedAt: new Date(),
          guid: article.url,
        });
      }
    } catch {}
  }

  const newItems: any[] = [];
  for (const item of allItems) {
    if (!item.guid) continue;
    try {
      const existing = await NewsItem.findOne({ guid: item.guid });
      if (!existing) {
        const saved = await NewsItem.create(item);
        newItems.push(saved);
      }
    } catch {}
  }

  console.log(`📰 ${newItems.length} new items saved`);
  return newItems;
}
