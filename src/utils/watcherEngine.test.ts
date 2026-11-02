import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_PROFILE_SETTINGS,
  INITIAL_WATCH_SOURCES,
  INITIAL_CAPTURED_POSTS,
  INITIAL_NOTIFICATIONS,
  validateSourceInput,
  filterCapturedPosts,
  computeProfileMetrics,
  computeSourceProfileStats,
  computeSevenDayPostTrend,
  generateLiveCaptureForSource,
  createPostFromScrapedWebItem,
  createWebsiteProfileEntity,
  createSourceFromExtensionClip,
  buildExportPayload,
  buildTopicDestinationUrl,
} from './watcherEngine';
import {
  parseRssOrAtomXml,
  parseHtmlDocumentToItems,
} from './liveScraper';

test('validateSourceInput rejects empty inputs and normalizes valid domains', () => {
  const emptyName = validateSourceInput({
    name: '   ',
    url: 'https://linear.app',
    watchQuery: 'Release updates',
  });
  assert.equal(emptyName.valid, false);
  assert.ok(emptyName.error?.includes('Website profile name'));

  const emptyQuery = validateSourceInput({
    name: 'Linear',
    url: 'https://linear.app',
    watchQuery: '',
  });
  assert.equal(emptyQuery.valid, false);

  const validDomain = validateSourceInput({
    name: 'Linear Changelog',
    url: 'linear.app/changelog',
    watchQuery: 'UI updates and release notes',
  });
  assert.equal(validDomain.valid, true);
  assert.equal(validDomain.normalizedUrl, 'https://linear.app/changelog');
  assert.equal(validDomain.handle, 'linear.app/changelog');
  assert.equal(validDomain.username, 'linear_changelog');
});

test('filterCapturedPosts filters by platform, saved tab, sourceId, and search query and sorts by latest', () => {
  const allGrid = filterCapturedPosts(INITIAL_CAPTURED_POSTS, {
    platform: 'All',
    sourceId: null,
    searchQuery: '',
    tab: 'grid',
  });
  assert.equal(allGrid.length, INITIAL_CAPTURED_POSTS.length);
  assert.ok(allGrid[0].timestampMs >= allGrid[allGrid.length - 1].timestampMs);

  const savedOnly = filterCapturedPosts(INITIAL_CAPTURED_POSTS, {
    platform: 'All',
    sourceId: null,
    searchQuery: '',
    tab: 'saved',
  });
  assert.equal(savedOnly.every((p) => p.saved), true);
  assert.equal(savedOnly.length, 3);

  const githubOnly = filterCapturedPosts(INITIAL_CAPTURED_POSTS, {
    platform: 'GitHub',
    sourceId: null,
    searchQuery: '',
    tab: 'grid',
  });
  assert.equal(githubOnly.length, 1);
  assert.equal(githubOnly[0].id, 'post-101');

  const searchMatch = filterCapturedPosts(INITIAL_CAPTURED_POSTS, {
    platform: 'All',
    sourceId: null,
    searchQuery: 'Webhook retry',
    tab: 'grid',
  });
  assert.equal(searchMatch.length, 1);
  assert.equal(searchMatch[0].id, 'post-103');
});

test('computeProfileMetrics, computeSourceProfileStats, and computeSevenDayPostTrend calculate accurate profile and 7-day trend stats with 0 auto-likes', () => {
  const metrics = computeProfileMetrics(
    INITIAL_WATCH_SOURCES,
    INITIAL_CAPTURED_POSTS,
    INITIAL_NOTIFICATIONS
  );
  assert.equal(metrics.totalCaptures, 6);
  assert.equal(metrics.activeSourcesCount, 6);
  assert.equal(metrics.unreadAlertsCount, 2);
  assert.equal(metrics.savedPostsCount, 3);
  assert.ok(metrics.checksPerHour > 400);

  const radixSource = INITIAL_WATCH_SOURCES[0];
  const radixStats = computeSourceProfileStats(
    radixSource,
    INITIAL_CAPTURED_POSTS,
    INITIAL_NOTIFICATIONS
  );
  assert.equal(radixStats.sourceId, 'src-github-release');
  assert.equal(radixStats.username, 'radix_ui.releases');
  assert.equal(radixStats.postsCount, 1);
  assert.equal(radixStats.totalLikes, 0);
  assert.equal(radixStats.checksPerHour, 120);
  assert.equal(radixStats.alertsCount, 1);
  assert.equal(radixStats.sevenDayTrend.length, 7);
  assert.equal(radixStats.sevenDayTrend[6].dayLabel, 'Today');
  assert.ok(radixStats.sevenDayTotalPosts >= 7);

  // Adding a live post for radixSource increments Today's 7-day trend post count and keeps likesCount at 0
  const { post: livePost } = generateLiveCaptureForSource(
    radixSource,
    1,
    1761575405000
  );
  assert.equal(livePost.likesCount, 0);
  assert.equal(livePost.likedByMe, false);
  const updatedTrend = computeSevenDayPostTrend(radixSource, [
    livePost,
    ...INITIAL_CAPTURED_POSTS,
  ]);
  assert.equal(updatedTrend[6].posts, radixStats.sevenDayTrend[6].posts + 1);
});

test('parseRssOrAtomXml, parseHtmlDocumentToItems, and createPostFromScrapedWebItem extract real web content with 0 automatic likes and full summaries', () => {
  const sampleAtom = `<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>@radix-ui/react-dialog@1.1.2 Release Notes</title>
        <link href="https://github.com/radix-ui/primitives/releases/tag/v1.1.2" />
        <updated>2026-10-27T08:00:00Z</updated>
        <content>Fixed keyboard navigation focus ring and aria-describedby handling in nested dialogs. Added full support for deterministic focus trapping across portal boundaries.</content>
      </entry>
    </feed>`;

  const atomItems = parseRssOrAtomXml(
    sampleAtom,
    'https://github.com/radix-ui/primitives/releases',
    'keyboard navigation dialog'
  );
  assert.equal(atomItems.length, 1);
  assert.equal(atomItems[0].headline, '@radix-ui/react-dialog@1.1.2 Release Notes');
  assert.ok(atomItems[0].matchedKeywords.includes('keyboard'));

  const { post } = createPostFromScrapedWebItem(
    INITIAL_WATCH_SOURCES[0],
    atomItems[0],
    0,
    1761580000000
  );
  assert.equal(post.likesCount, 0);
  assert.equal(post.likedByMe, false);
  assert.equal(post.isRealLiveScrape, true);
  assert.equal(post.articleUrl, 'https://github.com/radix-ui/primitives/releases/tag/v1.1.2');

  const sampleHtml = `<!doctype html>
    <html>
      <head>
        <title>Stripe API Changelog</title>
        <meta name="description" content="Latest API upgrades and webhook headers." />
      </head>
      <body>
        <article>
          <h2><a href="/changelog/2026-10-webhook">2026-10-27: Webhook Retry Header &amp; Signature Verification</a></h2>
          <p>Added deterministic retry timestamps and new webhook idempotency headers for all payment intents.</p>
        </article>
      </body>
    </html>`;

  const htmlItems = parseHtmlDocumentToItems(
    sampleHtml,
    'https://docs.stripe.com/changelog',
    'webhook retry headers'
  );
  assert.ok(htmlItems.length >= 1);
  assert.ok(htmlItems[0].headline.includes('Webhook Retry Header'));
  assert.equal(htmlItems[0].articleUrl, 'https://docs.stripe.com/changelog/2026-10-webhook');
});

test('buildTopicDestinationUrl directs users to exact topic URLs, platform topic searches, or Scroll-To-Text fragments', () => {
  // Deep article link is preserved directly
  const deepUrl = buildTopicDestinationUrl({
    sourceUrl: 'https://github.com/radix-ui/primitives/releases',
    articleUrl: 'https://github.com/radix-ui/primitives/releases/tag/v1.1.4',
    headline: 'v1.1.4 Release',
  });
  assert.equal(deepUrl, 'https://github.com/radix-ui/primitives/releases/tag/v1.1.4');

  // Hacker News root URL routes to Algolia HN topic search
  const hnTopicUrl = buildTopicDestinationUrl({
    sourceUrl: 'https://news.ycombinator.com',
    watchQuery: 'Show HN browser extensions SQLite',
  });
  assert.ok(hnTopicUrl.startsWith('https://hn.algolia.com/?q='));
  assert.ok(hnTopicUrl.includes('Show'));

  // General docs URL without a deep link appends #:~:text= Scroll-To-Text fragment for the topic
  const docsTopicUrl = buildTopicDestinationUrl({
    sourceUrl: 'https://docs.stripe.com/changelog',
    headline: 'Webhook Retry Exponential Backoff',
  });
  assert.ok(docsTopicUrl.includes('#:~:text=Webhook%20Retry%20Exponential'));
});

test('createWebsiteProfileEntity supports custom username, bio, avatarUrl, and accentColor and starts with 0 likes', () => {
  const entityResult = createWebsiteProfileEntity(
    {
      name: 'Figma Release Notes',
      url: 'figma.com/release-notes',
      watchQuery: 'Auto-layout updates and variables API releases',
      cssSelector: 'article.release-note',
      platform: 'Custom Website',
      intervalSeconds: 30,
      username: 'figma.official',
      bio: 'Custom Figma changelog bio tracking design system tokens.',
      avatarUrl: 'https://www.figma.com/favicon.ico',
      accentColor: '#7C3AED',
    },
    1761585000000
  );
  assert.equal(entityResult.source.username, 'figma_official');
  assert.equal(entityResult.source.bio, 'Custom Figma changelog bio tracking design system tokens.');
  assert.equal(entityResult.source.avatarUrl, 'https://www.figma.com/favicon.ico');
  assert.equal(entityResult.source.accentColor, '#7C3AED');
  assert.equal(entityResult.source.handle, 'figma.com/release-notes');
  assert.equal(entityResult.initialPost.sourceId, entityResult.source.id);
  assert.equal(entityResult.initialPost.likesCount, 0);

  const clipResult = createSourceFromExtensionClip(
    {
      url: 'vercel.com/changelog',
      title: 'Vercel Platform Changelog',
      selectedText: 'Edge middleware latency improvements and build cache updates',
      cssSelector: 'section.changelog-item',
      platform: 'Custom Website',
      intervalSeconds: 30,
    },
    1761590000000
  );
  assert.equal(clipResult.source.name, 'Vercel Platform Changelog');
  assert.equal(clipResult.source.handle, 'vercel.com/changelog');
  assert.equal(clipResult.initialPost.sourceId, clipResult.source.id);
  assert.equal(clipResult.initialPost.likesCount, 0);
  assert.equal(clipResult.notification.postId, clipResult.initialPost.id);
});

test('buildExportPayload serializes all captured posts, watched sources, and watch history into valid JSON', () => {
  const exportResult = buildExportPayload(
    INITIAL_PROFILE_SETTINGS,
    INITIAL_WATCH_SOURCES,
    INITIAL_CAPTURED_POSTS,
    INITIAL_NOTIFICATIONS,
    '2026-10-27T08:05:00.000Z'
  );

  assert.equal(exportResult.filename, 'pulsegrid-watch-export-2026-10-27.json');
  assert.equal(exportResult.payload.summary.totalCapturedPosts, INITIAL_CAPTURED_POSTS.length);
  assert.equal(exportResult.payload.watchedSources.length, INITIAL_WATCH_SOURCES.length);
  assert.equal(exportResult.payload.watchHistoryAlerts.length, INITIAL_NOTIFICATIONS.length);

  const parsed = JSON.parse(exportResult.jsonString);
  assert.equal(parsed.version, '1.0.0');
  assert.equal(parsed.capturedPosts.length, 6);
  assert.equal(parsed.watchedSources.length, 6);
});
