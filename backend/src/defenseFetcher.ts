/**
 * Defense Feed Fetcher
 * Pulls from official defense ministry RSS feeds and news
 */
import axios from 'axios';
import Parser from 'rss-parser';

const parser = new Parser({ timeout: 10000 });

const DEFENSE_FEEDS = [
  { url: 'https://www.mod.gov.ae/en/mediaCenter/news/rss', source: 'UAE MoD', country: 'UAE' },
  { url: 'https://www.spa.gov.sa/rss/rss4en.php', source: 'Saudi Press Agency', country: 'Saudi Arabia' },
  { url: 'https://www.centcom.mil/MEDIA/RSS/', source: 'US CENTCOM', country: 'US' },
  { url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10', source: 'US DoD', country: 'US' },
  { url: 'https://news.google.com/rss/search?q=UAE+military+defense&hl=en&gl=US&ceid=US:en', source: 'Google News Defense', country: 'Regional' },
  { url: 'https://news.google.com/rss/search?q=Houthi+missile+drone+intercept&hl=en&gl=US&ceid=US:en', source: 'Google News Houthi', country: 'Regional' },
  { url: 'https://news.google.com/rss/search?q=Red+Sea+naval+military&hl=en&gl=US&ceid=US:en', source: 'Google News Naval', country: 'Regional' },
];

const HIGH_PRIORITY_KEYWORDS = [
  'missile', 'intercept', 'drone', 'attack', 'strike', 'explosion',
  'launch', 'ballistic', 'threat', 'alert', 'emergency', 'houthi',
];

export async function fetchDefenseFeeds() {
  const items = [];

  for (const feed of DEFENSE_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of (parsed.items || []).slice(0, 10)) {
        const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
        const matchedKeywords = HIGH_PRIORITY_KEYWORDS.filter(k => text.includes(k));
        const isHighPriority = matchedKeywords.length > 0;

        items.push({
          title: item.title || '',
          description: (item.contentSnippet || '').slice(0, 400),
          url: item.link || '',
          source: feed.source,
          country: feed.country,
          isHighPriority,
          matchedKeywords,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          fetchedAt: new Date(),
          guid: item.guid || item.link || '',
        });
      }
    } catch (err) {
      console.error(`Defense feed failed ${feed.source}:`, err);
    }
  }

  console.log(`🛡️ ${items.length} defense items (${items.filter(i => i.isHighPriority).length} high priority)`);
  return items;
}
