export interface ScrapedWebItem {
  externalId: string;
  headline: string;
  summary: string;
  articleUrl: string;
  authorOrMeta: string;
  publishedLabel: string;
  extractedFields: { label: string; value: string }[];
  matchedKeywords: string[];
  metricPrimary: string;
  metricSecondary: string;
}

/**
 * Decodes common HTML entities in scraped titles and descriptions.
 */
export function decodeHtmlEntities(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips HTML tags (including entity-encoded HTML inside RSS/Atom feeds) and normalizes whitespace.
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  const decodedOnce = decodeHtmlEntities(html);
  const withoutScripts = decodedOnce
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(withoutTags);
}

/**
 * Extracts keywords from the user's watchQuery to score and highlight real scraped items.
 */
export function extractQueryKeywords(watchQuery: string): string[] {
  if (!watchQuery) return [];
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'that',
    'this',
    'are',
    'was',
    'new',
    'any',
    'all',
    'over',
    'into',
    'about',
  ]);
  return watchQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w))
    .slice(0, 10);
}

export function matchKeywordsInText(
  text: string,
  keywords: string[]
): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

/**
 * Parses an RSS 2.0 or Atom XML feed into real structured ScrapedWebItems.
 */
export function parseRssOrAtomXml(
  xml: string,
  baseUrl: string,
  watchQuery: string
): ScrapedWebItem[] {
  const items: ScrapedWebItem[] = [];
  const keywords = extractQueryKeywords(watchQuery);

  // Match either <item>...</item> (RSS) or <entry>...</entry> (Atom)
  const itemRegex = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
    const block = match[2];

    const titleMatch =
      block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch ? stripHtmlTags(titleMatch[1]) : '';
    if (!rawTitle || rawTitle.length < 4) continue;

    // Extract link
    const atomLinkMatch = block.match(
      /<link[^>]+href=["']([^"']+)["'][^>]*>/i
    );
    const rssLinkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    let articleUrl =
      (atomLinkMatch && atomLinkMatch[1]) ||
      (rssLinkMatch && stripHtmlTags(rssLinkMatch[1])) ||
      baseUrl;
    if (articleUrl.startsWith('/')) {
      try {
        const u = new URL(baseUrl);
        articleUrl = `${u.origin}${articleUrl}`;
      } catch {}
    }

    // Extract description / summary / content (preserve full text up to 1400 chars instead of cutting in half)
    const descMatch =
      block.match(
        /<(?:content:encoded|content|description|summary)[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/(?:content:encoded|content|description|summary)>/i
      ) ||
      block.match(
        /<(?:content:encoded|content|description|summary)[^>]*>([\s\S]*?)<\/(?:content:encoded|content|description|summary)>/i
      );
    const rawSummary = descMatch ? stripHtmlTags(descMatch[1]) : '';
    const summary =
      rawSummary.length > 1400
        ? `${rawSummary.slice(0, 1397)}...`
        : rawSummary || `Live feed entry extracted from ${baseUrl} matching topic "${watchQuery}".`;

    // Extract date
    const dateMatch = block.match(
      /<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i
    );
    const rawDate = dateMatch ? stripHtmlTags(dateMatch[1]) : '';
    let publishedLabel = 'Recent';
    if (rawDate) {
      const parsedDate = new Date(rawDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        publishedLabel = parsedDate.toISOString().slice(0, 10);
      }
    }

    // Author
    const authorMatch = block.match(
      /<(?:author|dc:creator)[^>]*>([\s\S]*?)<\/(?:author|dc:creator)>/i
    );
    const authorOrMeta = authorMatch
      ? stripHtmlTags(authorMatch[1]).slice(0, 60)
      : new URL(baseUrl).hostname.replace(/^www\./, '');

    const matched = matchKeywordsInText(`${rawTitle} ${summary}`, keywords);

    items.push({
      externalId: `${articleUrl}-${rawTitle.slice(0, 32)}`,
      headline: rawTitle,
      summary,
      articleUrl,
      authorOrMeta,
      publishedLabel,
      matchedKeywords: matched,
      metricPrimary: publishedLabel,
      metricSecondary:
        matched.length > 0
          ? `Matched: ${matched.slice(0, 3).join(', ')}`
          : 'Live RSS/Atom',
      extractedFields: [
        { label: 'Direct Topic URL', value: articleUrl },
        { label: 'Published Date', value: publishedLabel },
        {
          label: 'Topic Analysis',
          value:
            matched.length > 0
              ? `Matched keywords: ${matched.join(', ')}`
              : `Latest entry for topic: ${watchQuery}`,
        },
      ],
    });
  }

  return items;
}

/**
 * Parses arbitrary HTML from a real website into structured ScrapedWebItems
 * by extracting <article> blocks, headings (h1, h2, h3) with links, and multi-paragraph context.
 */
export function parseHtmlDocumentToItems(
  html: string,
  pageUrl: string,
  watchQuery: string
): ScrapedWebItem[] {
  const items: ScrapedWebItem[] = [];
  const keywords = extractQueryKeywords(watchQuery);
  let origin = pageUrl;
  let host = pageUrl;
  try {
    const parsedUrl = new URL(pageUrl);
    origin = parsedUrl.origin;
    host = parsedUrl.hostname.replace(/^www\./, '');
  } catch {}

  const resolveHref = (href: string): string => {
    if (!href) return pageUrl;
    if (/^https?:\/\//i.test(href)) return href;
    if (href.startsWith('//')) return `https:${href}`;
    if (href.startsWith('/')) return `${origin}${href}`;
    return `${origin}/${href}`;
  };

  // 1. Extract page-level title & meta description first
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleTagMatch ? stripHtmlTags(titleTagMatch[1]) : host;

  const metaDescMatch =
    html.match(
      /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i
    );
  const pageDesc = metaDescMatch ? decodeHtmlEntities(metaDescMatch[1]) : '';

  // 2. Find headings (h1, h2, h3) or anchor links with substantive text
  const seenHeadlines = new Set<string>();

  const headingRegex = /<(h1|h2|h3)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let hMatch: RegExpExecArray | null;

  while ((hMatch = headingRegex.exec(html)) !== null && items.length < 12) {
    const inner = hMatch[2];
    const headlineText = stripHtmlTags(inner);
    if (
      !headlineText ||
      headlineText.length < 10 ||
      headlineText.length > 220 ||
      seenHeadlines.has(headlineText.toLowerCase())
    ) {
      continue;
    }

    seenHeadlines.add(headlineText.toLowerCase());

    // Look for an <a href="..."> inside the heading or nearby
    const linkMatch = inner.match(/<a[^>]+href=["']([^"']+)["']/i);
    const afterSlice = html.slice(
      hMatch.index,
      Math.min(html.length, hMatch.index + 3200)
    );
    const nearbyLinkMatch =
      linkMatch || afterSlice.match(/<a[^>]+href=["']([^"'#]+)["']/i);
    const itemUrl = nearbyLinkMatch
      ? resolveHref(nearbyLinkMatch[1])
      : pageUrl;

    // Collect up to 3 nearby <p> paragraphs or <li> items after this heading so the user gets the full information
    const pRegex = /<(?:p|li)(?:\s[^>]*)?>([\s\S]*?)<\/(?:p|li)>/gi;
    const paragraphs: string[] = [];
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pRegex.exec(afterSlice)) !== null && paragraphs.length < 4) {
      const cleaned = stripHtmlTags(pMatch[1]);
      if (cleaned.length >= 20 && !paragraphs.includes(cleaned)) {
        paragraphs.push(cleaned);
      }
    }

    const joinedParagraphs = paragraphs.join(' — ');
    const summaryText =
      joinedParagraphs.length >= 25
        ? joinedParagraphs.slice(0, 1400)
        : pageDesc
        ? `${pageDesc} (Source: ${pageTitle} on ${host})`
        : `Full section extracted from ${host} (${pageTitle}) matching watch topic "${watchQuery}".`;

    const matched = matchKeywordsInText(
      `${headlineText} ${summaryText}`,
      keywords
    );

    items.push({
      externalId: `${itemUrl}-${headlineText.slice(0, 32)}`,
      headline: headlineText,
      summary: summaryText,
      articleUrl: itemUrl,
      authorOrMeta: host,
      publishedLabel: 'Live HTML',
      matchedKeywords: matched,
      metricPrimary: 'Live DOM',
      metricSecondary:
        matched.length > 0
          ? `Match: ${matched.slice(0, 2).join(', ')}`
          : host,
      extractedFields: [
        { label: 'Source Page', value: pageTitle },
        { label: 'Direct Topic URL', value: itemUrl },
        {
          label: 'Watch Query Match',
          value:
            matched.length > 0
              ? `Matched keywords: ${matched.join(', ')}`
              : `Extracted from ${host} for "${watchQuery}"`,
        },
      ],
    });
  }

  // 3. Also scan substantive <a href="..."> links if fewer than 4 headings were found
  if (items.length < 4) {
    const anchorRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let aMatch: RegExpExecArray | null;
    while ((aMatch = anchorRegex.exec(html)) !== null && items.length < 10) {
      const href = aMatch[1];
      const anchorText = stripHtmlTags(aMatch[2]);
      if (
        !anchorText ||
        anchorText.length < 22 ||
        anchorText.length > 160 ||
        seenHeadlines.has(anchorText.toLowerCase())
      ) {
        continue;
      }
      seenHeadlines.add(anchorText.toLowerCase());
      const resolvedUrl = resolveHref(href);
      const matched = matchKeywordsInText(anchorText, keywords);

      items.push({
        externalId: `${resolvedUrl}-${anchorText.slice(0, 32)}`,
        headline: anchorText,
        summary:
          pageDesc ||
          `Live link captured from ${host} (${pageTitle.slice(0, 60)}).`,
        articleUrl: resolvedUrl,
        authorOrMeta: host,
        publishedLabel: 'Live Link',
        matchedKeywords: matched,
        metricPrimary: 'Live Link',
        metricSecondary: host.slice(0, 18),
        extractedFields: [
          { label: 'Source Page', value: pageTitle.slice(0, 70) },
          { label: 'Target URL', value: resolvedUrl },
          {
            label: 'Query Analysis',
            value:
              matched.length > 0
                ? `Matched: ${matched.join(', ')}`
                : 'Live DOM anchor text',
          },
        ],
      });
    }
  }

  // 4. Fallback if page had only title/meta (e.g. SPA shell)
  if (items.length === 0 && (pageTitle || pageDesc)) {
    const matched = matchKeywordsInText(`${pageTitle} ${pageDesc}`, keywords);
    items.push({
      externalId: `${pageUrl}-${pageTitle.slice(0, 32)}`,
      headline: pageTitle || `Live Snapshot from ${host}`,
      summary:
        pageDesc ||
        `Fetched live HTML document from ${pageUrl} (${html.length.toLocaleString()} bytes).`,
      articleUrl: pageUrl,
      authorOrMeta: host,
      publishedLabel: 'Live Page',
      matchedKeywords: matched,
      metricPrimary: `${Math.max(1, Math.round(html.length / 1024))} KB`,
      metricSecondary: 'HTTP 200 OK',
      extractedFields: [
        { label: 'Document Title', value: pageTitle || host },
        { label: 'Source URL', value: pageUrl },
        { label: 'Payload Size', value: `${html.length.toLocaleString()} bytes` },
      ],
    });
  }

  // Prioritize items that matched user's watchQuery keywords first, preserving chronological/DOM order otherwise
  return items.sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);
}
