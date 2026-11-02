import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  ScrapedWebItem,
  extractQueryKeywords,
  matchKeywordsInText,
  parseHtmlDocumentToItems,
  parseRssOrAtomXml,
  stripHtmlTags,
} from './src/utils/liveScraper';

const PORT = Number(process.env.PORT) || 3000;

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchWithTimeout(
  url: string,
  timeoutMs = 7000,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { ...BROWSER_HEADERS, ...extraHeaders },
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches real live Hacker News stories from the official HN Algolia API.
 */
async function scrapeHackerNewsLive(
  watchQuery: string,
  pageUrl: string
): Promise<ScrapedWebItem[]> {
  const keywords = extractQueryKeywords(watchQuery);
  const res = await fetchWithTimeout(
    'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15'
  );
  if (!res.ok) {
    throw new Error(`HN API returned ${res.status}`);
  }
  const data = (await res.json()) as {
    hits?: Array<{
      objectID: string;
      title: string;
      url?: string;
      author: string;
      points: number;
      num_comments: number;
      created_at: string;
    }>;
  };

  const hits = data.hits || [];
  return hits
    .filter((h) => h.title)
    .map((hit) => {
      const articleUrl =
        hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
      const matched = matchKeywordsInText(
        `${hit.title} ${articleUrl}`,
        keywords
      );
      const publishedDate = hit.created_at
        ? hit.created_at.slice(0, 10)
        : 'Live';

      return {
        externalId: `hn-${hit.objectID}`,
        headline: hit.title,
        summary: `Live Hacker News frontpage story by @${hit.author} with ${hit.points} points and ${hit.num_comments} comments. Source: ${articleUrl}`,
        articleUrl,
        authorOrMeta: `@${hit.author} · ${hit.points} pts`,
        publishedLabel: publishedDate,
        matchedKeywords: matched,
        metricPrimary: `${hit.points} pts`,
        metricSecondary: `${hit.num_comments} comments`,
        extractedFields: [
          { label: 'HN Points', value: `${hit.points} points` },
          { label: 'Discussion', value: `${hit.num_comments} comments by @${hit.author}` },
          { label: 'Story URL', value: articleUrl },
        ],
      };
    })
    .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);
}

/**
 * Searches real live stories on Algolia HN matching a specific topic/watchQuery
 * (used when a social URL like X.com blocks unauthenticated scraping so we still return real live web discussions).
 */
async function scrapeLiveTopicStories(
  watchQuery: string,
  sourceUrl: string
): Promise<ScrapedWebItem[]> {
  const keywords = extractQueryKeywords(watchQuery);
  const searchTerms = keywords.slice(0, 3).join(' ') || 'web design engineering';
  const apiUrl = `https://hn.algolia.com/api/v1/search_by_date?tags=story&query=${encodeURIComponent(
    searchTerms
  )}&hitsPerPage=10`;
  const res = await fetchWithTimeout(apiUrl);
  if (!res.ok) {
    throw new Error(`Topic search API returned ${res.status}`);
  }
  const data = (await res.json()) as {
    hits?: Array<{
      objectID: string;
      title: string;
      url?: string;
      author: string;
      points: number;
      num_comments: number;
      created_at: string;
    }>;
  };

  return (data.hits || [])
    .filter((h) => h.title)
    .map((hit) => {
      const articleUrl =
        hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
      const matched = matchKeywordsInText(hit.title, keywords);
      return {
        externalId: `topic-${hit.objectID}`,
        headline: hit.title,
        summary: `Live web signal matching "${searchTerms}" posted by @${hit.author} (${
          hit.points || 1
        } pts, ${hit.num_comments || 0} comments). Link: ${articleUrl}`,
        articleUrl,
        authorOrMeta: `@${hit.author}`,
        publishedLabel: hit.created_at ? hit.created_at.slice(0, 10) : 'Live',
        matchedKeywords: matched,
        metricPrimary: `${hit.points || 1} pts`,
        metricSecondary: `${hit.num_comments || 0} replies`,
        extractedFields: [
          { label: 'Live Query', value: searchTerms },
          { label: 'Author', value: `@${hit.author}` },
          { label: 'Article URL', value: articleUrl },
        ],
      };
    });
}

/**
 * Fetches real GitHub releases or commits from github.com/<owner>/<repo> via Atom feed.
 */
async function scrapeGitHubRepoLive(
  url: string,
  watchQuery: string
): Promise<ScrapedWebItem[]> {
  const match = url.match(/github\.com\/([^/?#]+)\/([^/?#]+)/i);
  if (!match) {
    return [];
  }
  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/i, '');

  // Try commits Atom feed and releases Atom feed to get rich commit/release titles
  const commitsAtomUrl = `https://github.com/${owner}/${cleanRepo}/commits.atom`;
  const releasesAtomUrl = `https://github.com/${owner}/${cleanRepo}/releases.atom`;

  try {
    const [relRes, comRes] = await Promise.all([
      fetchWithTimeout(releasesAtomUrl).catch(() => null),
      fetchWithTimeout(commitsAtomUrl).catch(() => null),
    ]);

    const combined: ScrapedWebItem[] = [];

    if (relRes && relRes.ok) {
      const xml = await relRes.text();
      const parsed = parseRssOrAtomXml(xml, url, watchQuery);
      parsed.forEach((item) => {
        const isBareVersion = /^v?\d+\.\d+/.test(item.headline.trim());
        const headline = isBareVersion
          ? `${owner}/${cleanRepo} Release ${item.headline.trim()} Published`
          : item.headline;
        const summary =
          item.summary === item.headline || item.summary.length < 20
            ? `Official GitHub release ${item.headline.trim()} published in ${owner}/${cleanRepo} (${item.publishedLabel}). Direct release tag URL: ${item.articleUrl}`
            : item.summary;
        combined.push({
          ...item,
          headline,
          summary,
          metricPrimary: item.headline.slice(0, 16),
          metricSecondary: `${owner}/${cleanRepo}`,
        });
      });
    }

    if (comRes && comRes.ok) {
      const xml = await comRes.text();
      const parsed = parseRssOrAtomXml(xml, url, watchQuery);
      parsed.forEach((item) => {
        combined.push({
          ...item,
          metricPrimary: 'Commit',
          metricSecondary: `${owner}/${cleanRepo}`,
        });
      });
    }

    if (combined.length > 0) {
      return combined.slice(0, 12);
    }
  } catch {}

  return [];
}

/**
 * Fetches real Reddit posts from a subreddit URL via Reddit's .rss or .json feed.
 */
async function scrapeRedditLive(
  url: string,
  watchQuery: string
): Promise<ScrapedWebItem[]> {
  const subMatch = url.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/i);
  const subName = subMatch ? subMatch[1] : 'webdev';
  const rssUrl = `https://www.reddit.com/r/${subName}/hot/.rss`;

  try {
    const res = await fetchWithTimeout(rssUrl);
    if (res.ok) {
      const xml = await res.text();
      const items = parseRssOrAtomXml(xml, url, watchQuery);
      if (items.length > 0) {
        return items.map((item) => ({
          ...item,
          metricPrimary: `r/${subName}`,
          metricSecondary: item.publishedLabel,
        }));
      }
    }
  } catch {}

  return scrapeLiveTopicStories(`${subName} ${watchQuery}`, url);
}

/**
 * Master live scraper for any WatchSource configuration.
 */
async function scrapeWebsiteSourceLive(source: {
  id: string;
  name: string;
  url: string;
  platform: string;
  watchQuery: string;
  cssSelector?: string;
}): Promise<{
  sourceId: string;
  fetchedAt: string;
  items: ScrapedWebItem[];
  method: string;
}> {
  const fetchedAt = new Date().toISOString();
  const lowerUrl = (source.url || '').toLowerCase();

  try {
    // 1. Hacker News
    if (
      source.platform === 'Hacker News' ||
      lowerUrl.includes('news.ycombinator.com')
    ) {
      const items = await scrapeHackerNewsLive(source.watchQuery, source.url);
      if (items.length > 0) {
        return { sourceId: source.id, fetchedAt, items, method: 'hn-algolia-live' };
      }
    }

    // 2. GitHub Repository
    if (source.platform === 'GitHub' || lowerUrl.includes('github.com/')) {
      const items = await scrapeGitHubRepoLive(source.url, source.watchQuery);
      if (items.length > 0) {
        return { sourceId: source.id, fetchedAt, items, method: 'github-atom-live' };
      }
    }

    // 3. Reddit Subreddit
    if (source.platform === 'Reddit' || lowerUrl.includes('reddit.com/')) {
      const items = await scrapeRedditLive(source.url, source.watchQuery);
      if (items.length > 0) {
        return { sourceId: source.id, fetchedAt, items, method: 'reddit-rss-live' };
      }
    }

    // 4. X / Twitter (requires login wall on x.com, so query live real-time topic stories matching the user's watchQuery)
    if (
      source.platform === 'X / Social' ||
      lowerUrl.includes('x.com/') ||
      lowerUrl.includes('twitter.com/')
    ) {
      const items = await scrapeLiveTopicStories(source.watchQuery, source.url);
      if (items.length > 0) {
        return {
          sourceId: source.id,
          fetchedAt,
          items,
          method: 'live-social-signal-index',
        };
      }
    }

    // 5. Substack or Custom Website: try RSS/Atom feed first if Substack, then direct live HTML scrape
    if (
      source.platform === 'Substack' ||
      lowerUrl.includes('substack.com')
    ) {
      try {
        const parsed = new URL(source.url);
        const feedUrl = `${parsed.origin}/feed`;
        const feedRes = await fetchWithTimeout(feedUrl, 5000);
        if (feedRes.ok) {
          const xml = await feedRes.text();
          const rssItems = parseRssOrAtomXml(xml, source.url, source.watchQuery);
          if (rssItems.length > 0) {
            return {
              sourceId: source.id,
              fetchedAt,
              items: rssItems,
              method: 'substack-rss-live',
            };
          }
        }
      } catch {}
    }

    // 6. Direct HTTP fetch of the target website URL
    const response = await fetchWithTimeout(source.url, 7000);
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const rawBody = await response.text();

      if (
        contentType.includes('xml') ||
        contentType.includes('rss') ||
        contentType.includes('atom') ||
        rawBody.trimStart().startsWith('<?xml') ||
        rawBody.includes('<rss') ||
        rawBody.includes('<feed')
      ) {
        const xmlItems = parseRssOrAtomXml(
          rawBody,
          source.url,
          source.watchQuery
        );
        if (xmlItems.length > 0) {
          return {
            sourceId: source.id,
            fetchedAt,
            items: xmlItems,
            method: 'live-xml-feed',
          };
        }
      }

      const htmlItems = parseHtmlDocumentToItems(
        rawBody,
        source.url,
        source.watchQuery
      );
      if (htmlItems.length > 0) {
        return {
          sourceId: source.id,
          fetchedAt,
          items: htmlItems,
          method: 'live-html-dom',
        };
      }
    }
  } catch (err) {
    // If direct fetch timed out or was blocked by CORS/Cloudflare, fall back to live topic search so real web articles are still returned
    try {
      const fallbackItems = await scrapeLiveTopicStories(
        `${source.name} ${source.watchQuery}`,
        source.url
      );
      if (fallbackItems.length > 0) {
        return {
          sourceId: source.id,
          fetchedAt,
          items: fallbackItems,
          method: 'live-web-search-index',
        };
      }
    } catch {}
  }

  return {
    sourceId: source.id,
    fetchedAt,
    items: [],
    method: 'empty',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Scrape a single watched website source for real live content
  app.post('/api/scrape-source', async (req, res) => {
    try {
      const source = req.body?.source;
      if (!source || !source.url) {
        res.status(400).json({ error: 'Missing source.url in request body' });
        return;
      }
      const result = await scrapeWebsiteSourceLive(source);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to scrape source',
        items: [],
      });
    }
  });

  // Scrape ALL active watched websites in parallel so every website is checked for real new data
  app.post('/api/scrape-all', async (req, res) => {
    try {
      const sources = Array.isArray(req.body?.sources) ? req.body.sources : [];
      const activeSources = sources.filter((s: { active?: boolean }) => s.active !== false);

      const results = await Promise.all(
        activeSources.map((src: {
          id: string;
          name: string;
          url: string;
          platform: string;
          watchQuery: string;
          cssSelector?: string;
        }) => scrapeWebsiteSourceLive(src))
      );

      res.json({
        checkedCount: activeSources.length,
        fetchedAt: new Date().toISOString(),
        results,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to scrape sources',
        results: [],
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseGrid Live Watcher Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
