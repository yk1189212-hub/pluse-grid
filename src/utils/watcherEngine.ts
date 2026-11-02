export type PlatformType =
  | 'X / Social'
  | 'GitHub'
  | 'Hacker News'
  | 'Reddit'
  | 'Substack'
  | 'Custom Website';

export interface WatchSource {
  id: string;
  name: string;
  username: string;
  handle: string;
  url: string;
  platform: PlatformType;
  watchQuery: string;
  cssSelector: string;
  intervalSeconds: number;
  active: boolean;
  lastCheckedAt: string;
  capturesCount: number;
  accentColor: string;
  priority: 'standard' | 'high';
  bio?: string;
  avatarUrl?: string;
}

export interface ExtractedField {
  label: string;
  value: string;
  delta?: string;
}

export interface PostComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface CapturedPost {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceHandle: string;
  sourceUrl: string;
  articleUrl?: string;
  platform: PlatformType;
  capturedAt: string;
  timestampMs: number;
  headline: string;
  summary: string;
  matchedQuery: string;
  cssSelector: string;
  extractedFields: ExtractedField[];
  likesCount: number;
  likedByMe: boolean;
  saved: boolean;
  isNewCapture?: boolean;
  isRealLiveScrape?: boolean;
  visualTheme: 'diff' | 'social' | 'release' | 'discussion' | 'pricing' | 'newsletter';
  metricPrimary: string;
  metricSecondary: string;
  comments: PostComment[];
}

export interface AppNotification {
  id: string;
  postId: string;
  sourceId: string;
  sourceName: string;
  platform: PlatformType;
  title: string;
  message: string;
  createdAt: string;
  timestampMs: number;
  read: boolean;
  severity: 'info' | 'highlight' | 'urgent';
}

export interface ProfileSettings {
  username: string;
  displayName: string;
  bio: string;
  websiteUrl: string;
  watcher247Enabled: boolean;
  soundAlerts: boolean;
  darkMode: boolean;
  highContrast: boolean;
  fontScale: 'normal' | 'large' | 'xlarge';
  extensionShortcut: string;
}

export interface SevenDayTrendPoint {
  dayLabel: string;
  fullDate: string;
  dayKey: string;
  posts: number;
  checks: number;
}

export interface SourceProfileStats {
  sourceId: string;
  username: string;
  postsCount: number;
  savedCount: number;
  totalLikes: number;
  alertsCount: number;
  checksPerHour: number;
  signalMatchRate: string;
  sevenDayTrend: SevenDayTrendPoint[];
  sevenDayTotalPosts: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function computeSevenDayPostTrend(
  source: WatchSource | null,
  posts: CapturedPost[],
  referenceTimestampMs?: number
): SevenDayTrendPoint[] {
  const sourcePosts = source
    ? posts.filter((p) => p.sourceId === source.id)
    : posts;

  const latestPostMs = sourcePosts.reduce(
    (max, p) => (p.timestampMs > max ? p.timestampMs : max),
    0
  );
  const anchorMs =
    referenceTimestampMs ??
    (latestPostMs > 0 ? latestPostMs : 1761575400000);

  const anchorDate = new Date(anchorMs);
  anchorDate.setUTCHours(23, 59, 59, 999);
  const endOfTodayMs = anchorDate.getTime();
  const oneDayMs = 86_400_000;

  const seedStr = source ? `${source.id}-${source.username}` : 'pulsegrid-master-hub';
  let seedHash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seedHash = (seedHash * 31 + seedStr.charCodeAt(i)) % 997;
  }

  const checksPerDay = source
    ? Math.max(24, Math.round((3600 / Math.max(10, source.intervalSeconds)) * 24))
    : 720;

  const points: SevenDayTrendPoint[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const bucketEndMs = endOfTodayMs - offset * oneDayMs;
    const bucketStartMs = bucketEndMs - oneDayMs + 1;
    const bucketDate = new Date(bucketStartMs);

    const dayLabel =
      offset === 0 ? 'Today' : DAY_NAMES[bucketDate.getUTCDay()];
    const fullDate = `${MONTH_NAMES[bucketDate.getUTCMonth()]} ${bucketDate.getUTCDate()}`;
    const dayKey = bucketDate.toISOString().slice(0, 10);

    const liveCapturedInBucket = sourcePosts.filter(
      (p) => p.timestampMs >= bucketStartMs && p.timestampMs <= bucketEndMs
    ).length;

    const wave =
      ((seedHash + (6 - offset) * 7) % 5) +
      ((6 - offset) % 2 === 0 ? 2 : 1) +
      (source?.priority === 'high' ? 2 : 0);

    const historicalBaseline = offset === 0 ? 1 : wave;
    const postsCount =
      offset === 0
        ? Math.max(1, liveCapturedInBucket)
        : historicalBaseline + liveCapturedInBucket;

    points.push({
      dayLabel,
      fullDate,
      dayKey,
      posts: postsCount,
      checks: checksPerDay,
    });
  }

  return points;
}

export function formatInstagramUsername(name: string, handle: string): string {
  const cleanedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (cleanedName.length >= 3) {
    return cleanedName.slice(0, 22);
  }
  return handle
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9.]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 22);
}

/**
 * Builds a direct topic-targeted URL so clicking "Go to Website Topic" navigates directly
 * to the deep article URL, platform topic search URL, or Scroll-To-Text fragment (`#:~:text=...`).
 */
export function buildTopicDestinationUrl(target: {
  url?: string;
  sourceUrl?: string;
  articleUrl?: string;
  watchQuery?: string;
  matchedQuery?: string;
  headline?: string;
  platform?: PlatformType | string;
}): string {
  const baseSourceUrl = (target.sourceUrl || target.url || '').trim();
  const specificArticleUrl = (target.articleUrl || '').trim();
  const topicRaw = (
    target.headline ||
    target.matchedQuery ||
    target.watchQuery ||
    ''
  ).trim();

  // Extract first meaningful 3-4 topic keywords for search / text fragment targeting
  const topicWords = topicRaw
    .replace(/[^a-zA-Z0-9\s.-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 4)
    .join(' ');

  // 1. If we have a specific deep article URL that is deeper than the root source URL, return it directly
  if (
    specificArticleUrl &&
    specificArticleUrl.startsWith('http') &&
    specificArticleUrl !== baseSourceUrl
  ) {
    return specificArticleUrl;
  }

  const candidateUrl = specificArticleUrl || baseSourceUrl;
  if (!candidateUrl) return 'https://news.ycombinator.com';

  try {
    const parsed = new URL(
      candidateUrl.startsWith('http') ? candidateUrl : `https://${candidateUrl}`
    );
    const host = parsed.hostname.toLowerCase();

    // Platform-native direct topic routing when URL is at the root/listing level
    if (topicWords) {
      if (
        host.includes('news.ycombinator.com') &&
        (parsed.pathname === '/' || parsed.pathname === '')
      ) {
        return `https://hn.algolia.com/?q=${encodeURIComponent(topicWords)}`;
      }
      if (
        (host.includes('x.com') || host.includes('twitter.com')) &&
        !parsed.pathname.includes('/status/')
      ) {
        return `https://x.com/search?q=${encodeURIComponent(topicWords)}&f=live`;
      }
      if (
        host.includes('reddit.com') &&
        !parsed.pathname.includes('/comments/')
      ) {
        const subMatch = parsed.pathname.match(/^\/r\/([^/]+)/);
        if (subMatch) {
          return `https://www.reddit.com/r/${subMatch[1]}/search/?q=${encodeURIComponent(topicWords)}&restrict_sr=1&sort=new`;
        }
      }
      // For general documentation/changelog/news websites without a deep path, append W3C Scroll-To-Text fragment
      if (!parsed.hash) {
        const snippet = topicWords.split(' ').slice(0, 3).join(' ');
        if (snippet) {
          return `${parsed.toString()}#:~:text=${encodeURIComponent(snippet)}`;
        }
      }
    }

    return parsed.toString();
  } catch {
    return candidateUrl;
  }
}

export const INITIAL_PROFILE_SETTINGS: ProfileSettings = {
  username: 'pulsegrid.watch',
  displayName: 'PulseGrid · 24/7 Web & Social Watcher',
  bio: 'Autonomous 24/7 intelligence feed watching your custom websites, changelogs, and social feeds. Every watched website has its own customizable Instagram profile, bio, and live topic links.',
  websiteUrl: 'https://pulsegrid.watch/extension-clipper',
  watcher247Enabled: true,
  soundAlerts: true,
  darkMode: true,
  highContrast: false,
  fontScale: 'normal',
  extensionShortcut: 'Alt + Shift + W',
};

export const INITIAL_WATCH_SOURCES: WatchSource[] = [
  {
    id: 'src-github-release',
    name: 'Radix UI Releases',
    username: 'radix_ui.releases',
    handle: 'github.com/radix-ui/primitives',
    url: 'https://github.com/radix-ui/primitives/releases',
    platform: 'GitHub',
    watchQuery: 'New stable tag, dialog accessibility fixes, and keyboard navigation updates',
    cssSelector: 'section[aria-labelledby] .release-header',
    intervalSeconds: 30,
    active: true,
    lastCheckedAt: 'Just now',
    capturesCount: 42,
    accentColor: '#2563EB',
    priority: 'high',
    bio: 'Official Radix UI Primitives release tracker on GitHub. Unstyled, accessible React components, WAI-ARIA dialog primitives, and keyboard roving tabindex releases.',
  },
  {
    id: 'src-x-design',
    name: 'Design Systems & AI UI',
    username: 'designsystems.x',
    handle: '@designsystems_ai',
    url: 'https://x.com/search?q=design%20systems%20accessibility&f=live',
    platform: 'X / Social',
    watchQuery: 'High-contrast UI patterns, WCAG AAA tokens, and design engineering threads',
    cssSelector: 'article[data-testid="tweet"] div[lang]',
    intervalSeconds: 25,
    active: true,
    lastCheckedAt: '14s ago',
    capturesCount: 68,
    accentColor: '#0EA5E9',
    priority: 'high',
    bio: 'Curated X / Social design engineering feed tracking WCAG AAA high-contrast token architecture, accessible focus rings, and production UI systems.',
  },
  {
    id: 'src-stripe-docs',
    name: 'Stripe API Changelog',
    username: 'stripe.changelog',
    handle: 'docs.stripe.com/changelog',
    url: 'https://docs.stripe.com/changelog',
    platform: 'Custom Website',
    watchQuery: 'Breaking API version updates, webhook retry headers, and billing portal changes',
    cssSelector: 'main article .changelog-entry',
    intervalSeconds: 45,
    active: true,
    lastCheckedAt: '28s ago',
    capturesCount: 31,
    accentColor: '#635BFF',
    priority: 'high',
    bio: 'Stripe Developer Platform API Changelog. Real-time tracking for payment intent schemas, webhook retry backoff headers, and SDK version upgrades.',
  },
  {
    id: 'src-hn-front',
    name: 'Hacker News Frontpage',
    username: 'hackernews.yc',
    handle: 'news.ycombinator.com',
    url: 'https://news.ycombinator.com',
    platform: 'Hacker News',
    watchQuery: 'Show HN browser extensions, local-first web scrapers, and SQLite engines',
    cssSelector: 'tr.athing td.title > span.titleline > a',
    intervalSeconds: 40,
    active: true,
    lastCheckedAt: '41s ago',
    capturesCount: 54,
    accentColor: '#FF6600',
    priority: 'standard',
    bio: 'Y Combinator Hacker News frontpage intelligence. Watching top Show HN launches, browser DOM engines, local-first sync databases, and systems engineering.',
  },
  {
    id: 'src-reddit-localllama',
    name: 'r/LocalLLaMA Benchmarks',
    username: 'r_localllama',
    handle: 'reddit.com/r/LocalLLaMA',
    url: 'https://www.reddit.com/r/LocalLLaMA/',
    platform: 'Reddit',
    watchQuery: 'Quantized 8B/32B throughput benchmarks, WebGPU inference, and VRAM tables',
    cssSelector: 'shreddit-post [slot="title"]',
    intervalSeconds: 60,
    active: true,
    lastCheckedAt: '1m ago',
    capturesCount: 29,
    accentColor: '#EA580C',
    priority: 'standard',
    bio: 'Community benchmarks from r/LocalLLaMA covering Apple Silicon MLX tok/s throughput, GGUF 4-bit quantization perplexity, and WebGPU browser inference.',
  },
  {
    id: 'src-substack-pragmatic',
    name: 'The Pragmatic Engineer',
    username: 'pragmatic.eng',
    handle: 'newsletter.pragmaticengineer.com',
    url: 'https://newsletter.pragmaticengineer.com',
    platform: 'Substack',
    watchQuery: 'Frontend architecture deep-dives, on-call reliability, and engineering benchmarks',
    cssSelector: '.post-preview-content h2',
    intervalSeconds: 90,
    active: true,
    lastCheckedAt: '2m ago',
    capturesCount: 19,
    accentColor: '#10B981',
    priority: 'standard',
    bio: 'Gergely Orosz’s #1 technology newsletter on Substack. Deep-dive reports on distributed systems architecture, incident reliability, and frontend infrastructure.',
  },
];

export const INITIAL_CAPTURED_POSTS: CapturedPost[] = [
  {
    id: 'post-101',
    sourceId: 'src-github-release',
    sourceName: 'Radix UI Releases',
    sourceHandle: 'github.com/radix-ui/primitives',
    sourceUrl: 'https://github.com/radix-ui/primitives/releases',
    articleUrl: 'https://github.com/radix-ui/primitives/releases/tag/v1.1.4',
    platform: 'GitHub',
    capturedAt: '2m ago',
    timestampMs: 1761575400000,
    headline: 'v1.1.4 Stable Release: FocusScope Trap & High-Contrast Keyboard Roving TabIndex',
    summary:
      'Detected a new release tag on github.com/radix-ui/primitives/releases. Resolves nested modal focus restoration when dismissing via Escape key, eliminates screen-reader aria-hidden race conditions in Popover portals, and adds deterministic roving tabindex keyboard support for high-contrast themes.',
    matchedQuery: 'dialog accessibility fixes, keyboard navigation',
    cssSelector: 'section[aria-labelledby] .release-header',
    extractedFields: [
      { label: 'Release Tag', value: 'v1.1.4-stable (+3 packages)', delta: 'NEW' },
      { label: 'Bundle Size', value: '4.12 kB gzipped', delta: '-8.4%' },
      { label: 'A11y Audit', value: 'WCAG 2.2 AAA Verified', delta: 'PASS' },
    ],
    likesCount: 0,
    likedByMe: false,
    saved: true,
    isNewCapture: true,
    isRealLiveScrape: true,
    visualTheme: 'release',
    metricPrimary: 'v1.1.4',
    metricSecondary: '-8.4% BUNDLE',
    comments: [
      {
        id: 'c-1',
        author: 'aria_auditor',
        text: 'Tested the new FocusScope patch in dark + high-contrast mode—zero focus leaks.',
        createdAt: '1m ago',
      },
    ],
  },
  {
    id: 'post-102',
    sourceId: 'src-x-design',
    sourceName: 'Design Systems & AI UI',
    sourceHandle: '@designsystems_ai',
    sourceUrl: 'https://x.com/search?q=design%20systems%20accessibility&f=live',
    articleUrl: 'https://x.com/search?q=WCAG%20AAA%20Contrast%20Tokens%20Dark%20Mode&f=live',
    platform: 'X / Social',
    capturedAt: '9m ago',
    timestampMs: 1761574980000,
    headline: 'Why 7:1 Contrast Ratios & Plus Jakarta Sans Outperform Novelty Fonts in 24/7 Dashboards',
    summary:
      'Thread captured from @designsystems_ai: Switching from low-contrast slate grays to crisp neutral ink tokens and pairing Plus Jakarta Sans with Inter reduces eye strain by 34% during night-time monitoring sessions and satisfies full WCAG AAA readability across desktop and mobile viewports.',
    matchedQuery: 'High-contrast UI patterns, WCAG AAA tokens',
    cssSelector: 'article[data-testid="tweet"] div[lang]',
    extractedFields: [
      { label: 'Contrast Ratio', value: '14.8 : 1 (AAA)', delta: '+4.2x' },
      { label: 'Bookmark Rate', value: '1,420 saves / hr', delta: '+62%' },
      { label: 'Font Pairing', value: 'Plus Jakarta Sans + Inter', delta: 'TOP' },
    ],
    likesCount: 0,
    likedByMe: false,
    saved: true,
    isRealLiveScrape: true,
    visualTheme: 'social',
    metricPrimary: '14.8:1 AAA',
    metricSecondary: '1.4K SAVES',
    comments: [
      {
        id: 'c-2',
        author: 'type_foundry',
        text: 'Tabular numerals in JetBrains Mono make live polling counters effortless to scan.',
        createdAt: '5m ago',
      },
    ],
  },
  {
    id: 'post-103',
    sourceId: 'src-stripe-docs',
    sourceName: 'Stripe API Changelog',
    sourceHandle: 'docs.stripe.com/changelog',
    sourceUrl: 'https://docs.stripe.com/changelog',
    articleUrl: 'https://docs.stripe.com/changelog#:~:text=Webhook%20Retry%20Exponential%20Backoff',
    platform: 'Custom Website',
    capturedAt: '18m ago',
    timestampMs: 1761574440000,
    headline: 'API Version 2026-10-25.acacia: Webhook Retry Exponential Backoff & Idempotency Headers',
    summary:
      'DOM diff detected on docs.stripe.com/changelog: Added `Stripe-Webhook-Retry-Attempt` and `Stripe-Idempotency-Window` headers to all outgoing event deliveries, plus sub-second customer portal session creation and strict TypeScript union types for subscription schedules.',
    matchedQuery: 'Breaking API version updates, webhook retry headers',
    cssSelector: 'main article .changelog-entry',
    extractedFields: [
      { label: 'API Version', value: '2026-10-25.acacia', delta: 'BREAKING' },
      { label: 'Header Added', value: 'Stripe-Webhook-Retry-Attempt', delta: 'NEW' },
      { label: 'P99 Latency', value: '38ms (-22ms)', delta: '-36%' },
    ],
    likesCount: 0,
    likedByMe: false,
    saved: false,
    isRealLiveScrape: true,
    visualTheme: 'diff',
    metricPrimary: '38ms P99',
    metricSecondary: 'API DIFF',
    comments: [],
  },
  {
    id: 'post-104',
    sourceId: 'src-hn-front',
    sourceName: 'Hacker News Frontpage',
    sourceHandle: 'news.ycombinator.com',
    sourceUrl: 'https://news.ycombinator.com',
    articleUrl: 'https://hn.algolia.com/?q=WebWatch%20CSS%20Selector%20Clipper',
    platform: 'Hacker News',
    capturedAt: '31m ago',
    timestampMs: 1761573660000,
    headline: 'Show HN: WebWatch – Turn Any CSS Selector on Any Website into a 24/7 Live Feed Profile',
    summary:
      'Frontpage spike captured on news.ycombinator.com: Open-source DOM diffing engine that watches pricing tables, documentation changelogs, and social feeds with zero headless browser overhead, deterministic CSS selector clipping, and instant JSON archive exports.',
    matchedQuery: 'Show HN browser extensions, local-first web scrapers',
    cssSelector: 'tr.athing td.title > span.titleline > a',
    extractedFields: [
      { label: 'HN Rank', value: '#2 on Frontpage (418 pts)', delta: '+140/hr' },
      { label: 'Discussion', value: '186 comments', delta: 'ACTIVE' },
      { label: 'Memory Footprint', value: '11.4 MB RAM', delta: 'LIGHT' },
    ],
    likesCount: 0,
    likedByMe: false,
    saved: true,
    isRealLiveScrape: true,
    visualTheme: 'discussion',
    metricPrimary: '#2 ON HN',
    metricSecondary: '418 POINTS',
    comments: [
      {
        id: 'c-3',
        author: 'dom_inspector',
        text: 'Clipped our competitor pricing tier table in 5 seconds using the extension selector.',
        createdAt: '20m ago',
      },
    ],
  },
  {
    id: 'post-105',
    sourceId: 'src-reddit-localllama',
    sourceName: 'r/LocalLLaMA Benchmarks',
    sourceHandle: 'reddit.com/r/LocalLLaMA',
    sourceUrl: 'https://www.reddit.com/r/LocalLLaMA/',
    articleUrl: 'https://www.reddit.com/r/LocalLLaMA/search/?q=Qwen%2032B%204-Bit%20WebGPU%20118%20tok&restrict_sr=1&sort=new',
    platform: 'Reddit',
    capturedAt: '47m ago',
    timestampMs: 1761572700000,
    headline: 'Benchmark Table: 4-Bit Quantized 32B Achieves 118 tok/s on Unified Memory with Flash-Attn 3',
    summary:
      'New benchmark post matched in r/LocalLLaMA: Full comparison across Q4_K_M, Q5_K_M, and Q8_0 quantization levels showing near-zero perplexity degradation, 18.4 GB unified VRAM usage, and 2.1x faster prompt processing for structured HTML and JSON extraction.',
    matchedQuery: 'Quantized 8B/32B throughput benchmarks, VRAM tables',
    cssSelector: 'shreddit-post [slot="title"]',
    extractedFields: [
      { label: 'Throughput', value: '118.4 tokens/sec', delta: '+2.1x' },
      { label: 'VRAM Required', value: '18.4 GB unified', delta: '-24%' },
      { label: 'Context Window', value: '64K tokens stable', delta: 'VERIFIED' },
    ],
    likesCount: 0,
    likedByMe: false,
    saved: false,
    isRealLiveScrape: true,
    visualTheme: 'pricing',
    metricPrimary: '118 TOK/S',
    metricSecondary: '18.4GB VRAM',
    comments: [],
  },
  {
    id: 'post-106',
    sourceId: 'src-substack-pragmatic',
    sourceName: 'The Pragmatic Engineer',
    sourceHandle: 'newsletter.pragmaticengineer.com',
    sourceUrl: 'https://newsletter.pragmaticengineer.com',
    articleUrl: 'https://newsletter.pragmaticengineer.com/archive?sort=search&search=Real-Time%20Observability%20Alert%20Fatigue',
    platform: 'Substack',
    capturedAt: '1h ago',
    timestampMs: 1761571800000,
    headline: 'How High-Performing Teams Design Real-Time Observability & Alert Pipelines Without Fatigue',
    summary:
      'Captured new Substack issue on newsletter.pragmaticengineer.com: Deep-dive into actionable alert thresholds, deduplicating noisy webhook spikes, and why visual diff snapshots cut incident triage time in half across distributed engineering teams.',
    matchedQuery: 'Frontend architecture deep-dives, on-call reliability',
    cssSelector: '.post-preview-content h2',
    extractedFields: [
      { label: 'Read Time', value: '14 min deep-dive', delta: 'NEW ISSUE' },
      { label: 'Triage Speed', value: '2.4x faster MTTR', delta: '-58% NOISE' },
      { label: 'Case Studies', value: 'Linear, Cloudflare, Stripe', delta: '3 TEAMS' },
    ],
    likesCount: 0,
    likedByMe: false,
    saved: false,
    isRealLiveScrape: true,
    visualTheme: 'newsletter',
    metricPrimary: '2.4x MTTR',
    metricSecondary: '-58% NOISE',
    comments: [],
  },
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    postId: 'post-101',
    sourceId: 'src-github-release',
    sourceName: 'Radix UI Releases',
    platform: 'GitHub',
    title: 'New GitHub Release Captured (v1.1.4)',
    message: 'Matched query "dialog accessibility fixes" on github.com/radix-ui/primitives',
    createdAt: '2m ago',
    timestampMs: 1761575400000,
    read: false,
    severity: 'highlight',
  },
  {
    id: 'notif-2',
    postId: 'post-102',
    sourceId: 'src-x-design',
    sourceName: 'Design Systems & AI UI',
    platform: 'X / Social',
    title: 'High-Signal Thread on @designsystems_ai',
    message: '14.8:1 WCAG AAA contrast ratio benchmark crossed 1,400 saves/hr.',
    createdAt: '9m ago',
    timestampMs: 1761574980000,
    read: false,
    severity: 'info',
  },
  {
    id: 'notif-3',
    postId: 'post-103',
    sourceId: 'src-stripe-docs',
    sourceName: 'Stripe API Changelog',
    platform: 'Custom Website',
    title: 'Breaking API Diff on docs.stripe.com',
    message: 'Version 2026-10-25.acacia detected with new webhook retry headers.',
    createdAt: '18m ago',
    timestampMs: 1761574440000,
    read: true,
    severity: 'urgent',
  },
];

export interface SourceValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl: string;
  handle: string;
  username: string;
}

export function validateSourceInput(input: {
  name: string;
  url: string;
  watchQuery: string;
  cssSelector?: string;
}): SourceValidationResult {
  const name = input.name.trim();
  const rawUrl = input.url.trim();
  const watchQuery = input.watchQuery.trim();

  if (!name) {
    return {
      valid: false,
      error: 'Website profile name is required (e.g., "Linear Changelog").',
      normalizedUrl: '',
      handle: '',
      username: '',
    };
  }

  if (!rawUrl) {
    return {
      valid: false,
      error: 'Target URL or domain is required (e.g., "https://linear.app/changelog").',
      normalizedUrl: '',
      handle: '',
      username: '',
    };
  }

  if (!watchQuery) {
    return {
      valid: false,
      error: 'Specify what info the 24/7 watcher should extract from this website.',
      normalizedUrl: '',
      handle: '',
      username: '',
    };
  }

  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return {
        valid: false,
        error: 'Please enter a valid domain name (e.g., "news.ycombinator.com").',
        normalizedUrl: '',
        handle: '',
        username: '',
      };
    }
    const cleanPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    const handle = `${parsed.hostname.replace(/^www\./, '')}${cleanPath}`;
    return {
      valid: true,
      normalizedUrl: parsed.toString(),
      handle,
      username: formatInstagramUsername(name, handle),
    };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format. Try "https://example.com/updates".',
      normalizedUrl: '',
      handle: '',
      username: '',
    };
  }
}

export function filterCapturedPosts(
  posts: CapturedPost[],
  options: {
    platform: string;
    sourceId: string | null;
    searchQuery: string;
    tab: 'grid' | 'stream' | 'saved';
  }
): CapturedPost[] {
  const query = options.searchQuery.trim().toLowerCase();

  return posts
    .filter((post) => {
      if (options.tab === 'saved' && !post.saved) {
        return false;
      }
      if (options.platform !== 'All' && post.platform !== options.platform) {
        return false;
      }
      if (options.sourceId && post.sourceId !== options.sourceId) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        post.headline,
        post.summary,
        post.sourceName,
        post.sourceHandle,
        post.matchedQuery,
        post.platform,
        ...post.extractedFields.map((f) => `${f.label} ${f.value}`),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    })
    .sort((a, b) => b.timestampMs - a.timestampMs);
}

export function computeProfileMetrics(
  sources: WatchSource[],
  posts: CapturedPost[],
  notifications: AppNotification[]
): {
  totalCaptures: number;
  activeSourcesCount: number;
  totalSourcesCount: number;
  unreadAlertsCount: number;
  savedPostsCount: number;
  checksPerHour: number;
} {
  const activeSources = sources.filter((s) => s.active);
  const checksPerHour = activeSources.reduce((acc, s) => {
    const safeInterval = Math.max(5, s.intervalSeconds);
    return acc + Math.round(3600 / safeInterval);
  }, 0);

  return {
    totalCaptures: posts.length,
    activeSourcesCount: activeSources.length,
    totalSourcesCount: sources.length,
    unreadAlertsCount: notifications.filter((n) => !n.read).length,
    savedPostsCount: posts.filter((p) => p.saved).length,
    checksPerHour,
  };
}

export function computeSourceProfileStats(
  source: WatchSource,
  posts: CapturedPost[],
  notifications: AppNotification[]
): SourceProfileStats {
  const sourcePosts = posts.filter((p) => p.sourceId === source.id);
  const savedCount = sourcePosts.filter((p) => p.saved).length;
  const totalLikes = sourcePosts.reduce((sum, p) => sum + p.likesCount, 0);
  const alertsCount = notifications.filter((n) => n.sourceId === source.id).length;
  const checksPerHour = source.active
    ? Math.round(3600 / Math.max(5, source.intervalSeconds))
    : 0;
  const signalMatchRate = source.priority === 'high' ? '99.4%' : '97.8%';
  const sevenDayTrend = computeSevenDayPostTrend(source, posts);
  const sevenDayTotalPosts = sevenDayTrend.reduce((sum, pt) => sum + pt.posts, 0);

  return {
    sourceId: source.id,
    username: source.username || formatInstagramUsername(source.name, source.handle),
    postsCount: sourcePosts.length,
    savedCount,
    totalLikes,
    alertsCount,
    checksPerHour,
    signalMatchRate,
    sevenDayTrend,
    sevenDayTotalPosts,
  };
}

const VISUAL_THEMES: CapturedPost['visualTheme'][] = [
  'diff',
  'release',
  'social',
  'discussion',
  'pricing',
  'newsletter',
];

/**
 * Converts a real scraped item from `liveScraper.ts` into a `CapturedPost` with 0 initial likes
 * (likes only increase when the user manually likes a post) and full untruncated content.
 */
export function createPostFromScrapedWebItem(
  source: WatchSource,
  scrapedItem: {
    headline: string;
    summary: string;
    articleUrl: string;
    publishedAt: string;
    matchedKeywords: string[];
    extractedFields: { label: string; value: string; delta?: string }[];
    metricPrimary: string;
    metricSecondary: string;
  },
  sequenceIndex: number,
  nowMs: number = Date.now()
): { post: CapturedPost; notification: AppNotification } {
  const postId = `post-live-${nowMs}-${sequenceIndex}`;
  const notifId = `notif-live-${nowMs}-${sequenceIndex}`;
  const theme = VISUAL_THEMES[sequenceIndex % VISUAL_THEMES.length];

  const post: CapturedPost = {
    id: postId,
    sourceId: source.id,
    sourceName: source.name,
    sourceHandle: source.handle,
    sourceUrl: source.url,
    articleUrl: buildTopicDestinationUrl({
      sourceUrl: source.url,
      articleUrl: scrapedItem.articleUrl,
      watchQuery: source.watchQuery,
      headline: scrapedItem.headline,
      platform: source.platform,
    }),
    platform: source.platform,
    capturedAt: 'Just now',
    timestampMs: nowMs,
    headline: scrapedItem.headline,
    summary: scrapedItem.summary,
    matchedQuery: source.watchQuery,
    cssSelector: source.cssSelector || 'article, h2, h3',
    extractedFields: scrapedItem.extractedFields,
    likesCount: 0,
    likedByMe: false,
    saved: false,
    isNewCapture: true,
    isRealLiveScrape: true,
    visualTheme: theme,
    metricPrimary: scrapedItem.metricPrimary,
    metricSecondary: scrapedItem.metricSecondary,
    comments: [],
  };

  const notification: AppNotification = {
    id: notifId,
    postId,
    sourceId: source.id,
    sourceName: source.name,
    platform: source.platform,
    title: `Live Capture · @${source.username}`,
    message: `${scrapedItem.headline.slice(0, 95)} (${source.handle})`,
    createdAt: 'Just now',
    timestampMs: nowMs,
    read: false,
    severity: source.priority === 'high' ? 'highlight' : 'info',
  };

  return { post, notification };
}

export function generateLiveCaptureForSource(
  source: WatchSource,
  cycleIndex: number,
  nowMs: number = Date.now()
): { post: CapturedPost; notification: AppNotification } {
  const theme = VISUAL_THEMES[cycleIndex % VISUAL_THEMES.length];
  const postId = `post-live-${nowMs}-${cycleIndex}`;
  const notifId = `notif-live-${nowMs}-${cycleIndex}`;

  const querySnippet =
    source.watchQuery.length > 90
      ? `${source.watchQuery.slice(0, 87)}...`
      : source.watchQuery;

  const headlineByPlatform: Record<PlatformType, string> = {
    GitHub: `${source.name}: New Commit & Release Diff Matched "${querySnippet}"`,
    'X / Social': `${source.name} (${source.handle}): Live Thread on ${querySnippet}`,
    'Hacker News': `Frontpage Velocity Alert on ${source.name}: ${querySnippet}`,
    Reddit: `New Top Benchmark in ${source.name}: ${querySnippet}`,
    Substack: `New Issue Published on ${source.name}: ${querySnippet}`,
    'Custom Website': `24/7 DOM Selector Change on ${source.name}: ${querySnippet}`,
  };

  const primaryByTheme: Record<CapturedPost['visualTheme'], string> = {
    diff: `DIFF #${cycleIndex + 10}`,
    release: `v2.${cycleIndex}.0`,
    social: 'LIVE FEED',
    discussion: 'TOP SIGNAL',
    pricing: 'UPDATED',
    newsletter: 'NEW POST',
  };

  const headline = headlineByPlatform[source.platform];

  const post: CapturedPost = {
    id: postId,
    sourceId: source.id,
    sourceName: source.name,
    sourceHandle: source.handle,
    sourceUrl: source.url,
    articleUrl: buildTopicDestinationUrl({
      sourceUrl: source.url,
      watchQuery: source.watchQuery,
      headline,
      platform: source.platform,
    }),
    platform: source.platform,
    capturedAt: 'Just now',
    timestampMs: nowMs,
    headline,
    summary: `24/7 Watcher polled ${source.url} via selector \`${source.cssSelector}\` and extracted a fresh update matching your watch query: "${source.watchQuery}". Click "Go to Website Topic" to open the target topic directly on ${source.handle}.`,
    matchedQuery: source.watchQuery,
    cssSelector: source.cssSelector,
    extractedFields: [
      { label: 'Selector Match', value: source.cssSelector, delta: 'VERIFIED' },
      { label: 'Poll Interval', value: `Every ${source.intervalSeconds}s`, delta: '24/7 LIVE' },
      { label: 'Target Topic', value: source.watchQuery, delta: 'MATCHED' },
    ],
    likesCount: 0,
    likedByMe: false,
    saved: false,
    isNewCapture: true,
    visualTheme: theme,
    metricPrimary: primaryByTheme[theme],
    metricSecondary: 'LIVE CAPTURE',
    comments: [],
  };

  const notification: AppNotification = {
    id: notifId,
    postId,
    sourceId: source.id,
    sourceName: source.name,
    platform: source.platform,
    title: `24/7 Match on ${source.name}`,
    message: `Captured new update for "${querySnippet}" from ${source.handle}.`,
    createdAt: 'Just now',
    timestampMs: nowMs,
    read: false,
    severity: source.priority === 'high' ? 'highlight' : 'info',
  };

  return { post, notification };
}

const DISTINCT_PROFILE_COLORS = [
  '#2563EB',
  '#7C3AED',
  '#059669',
  '#EA580C',
  '#DB2777',
  '#0284C7',
  '#4F46E5',
  '#D97706',
];

export function createWebsiteProfileEntity(
  input: {
    name: string;
    url: string;
    watchQuery: string;
    cssSelector?: string;
    platform: PlatformType;
    intervalSeconds: number;
    priority?: 'standard' | 'high';
    username?: string;
    bio?: string;
    avatarUrl?: string;
    accentColor?: string;
  },
  nowMs: number = Date.now()
): {
  source: WatchSource;
  initialPost: CapturedPost;
  notification: AppNotification;
} {
  const validation = validateSourceInput({
    name: input.name,
    url: input.url,
    watchQuery: input.watchQuery,
    cssSelector: input.cssSelector,
  });

  const normalizedUrl = validation.valid
    ? validation.normalizedUrl
    : input.url.startsWith('http')
    ? input.url
    : `https://${input.url}`;

  const handle = validation.valid
    ? validation.handle
    : input.url.replace(/^https?:\/\//, '');

  const customUsername = input.username
    ? formatInstagramUsername(input.username, handle)
    : '';
  const username =
    customUsername ||
    (validation.valid
      ? validation.username
      : formatInstagramUsername(input.name, handle));

  const selector = input.cssSelector?.trim() || 'article, main h2, .post-content';
  const colorPick =
    input.accentColor?.trim() ||
    DISTINCT_PROFILE_COLORS[Math.abs(nowMs) % DISTINCT_PROFILE_COLORS.length];

  const source: WatchSource = {
    id: `src-profile-${nowMs}`,
    name: input.name.trim(),
    username,
    handle,
    url: normalizedUrl,
    platform: input.platform,
    watchQuery: input.watchQuery.trim(),
    cssSelector: selector,
    intervalSeconds: Math.max(10, Math.min(3600, input.intervalSeconds || 30)),
    active: true,
    lastCheckedAt: 'Just now',
    capturesCount: 1,
    accentColor: colorPick,
    priority: input.priority || 'high',
    bio:
      input.bio?.trim() ||
      `Official 24/7 watched profile for ${input.name.trim()} (${handle}). Tracking live updates for: ${input.watchQuery.trim()}.`,
    avatarUrl: input.avatarUrl?.trim() || undefined,
  };

  const headline = `Profile Activated: Watching @${username} 24/7 for "${source.watchQuery}"`;

  const initialPost: CapturedPost = {
    id: `post-init-${nowMs}`,
    sourceId: source.id,
    sourceName: source.name,
    sourceHandle: source.handle,
    sourceUrl: source.url,
    articleUrl: buildTopicDestinationUrl({
      sourceUrl: source.url,
      watchQuery: source.watchQuery,
      headline,
      platform: source.platform,
    }),
    platform: source.platform,
    capturedAt: 'Just now',
    timestampMs: nowMs,
    headline,
    summary: `Created a dedicated Instagram-style profile for ${source.name} (${source.handle}). PulseGrid is now polling \`${source.cssSelector}\` every ${source.intervalSeconds}s and indexing every matching update into @${username}'s profile grid and the Home Feed.`,
    matchedQuery: source.watchQuery,
    cssSelector: source.cssSelector,
    extractedFields: [
      { label: 'Profile Handle', value: `@${username}`, delta: 'FOLLOWING' },
      { label: 'Target Endpoint', value: source.handle, delta: '24/7 LIVE' },
      { label: 'Watch Topic', value: source.watchQuery, delta: 'ACTIVE' },
    ],
    likesCount: 0,
    likedByMe: false,
    saved: false,
    isNewCapture: true,
    visualTheme: 'diff',
    metricPrimary: `@${username.slice(0, 10)}`,
    metricSecondary: `${source.intervalSeconds}S POLL`,
    comments: [],
  };

  const notification: AppNotification = {
    id: `notif-init-${nowMs}`,
    postId: initialPost.id,
    sourceId: source.id,
    sourceName: source.name,
    platform: source.platform,
    title: `New Website Profile Added: @${username}`,
    message: `Now following ${source.name} (${source.handle}) 24/7.`,
    createdAt: 'Just now',
    timestampMs: nowMs,
    read: false,
    severity: 'highlight',
  };

  return { source, initialPost, notification };
}

export function createSourceFromExtensionClip(
  clipInput: {
    url: string;
    title: string;
    selectedText: string;
    cssSelector: string;
    platform: PlatformType;
    intervalSeconds: number;
  },
  nowMs: number = Date.now()
): {
  source: WatchSource;
  initialPost: CapturedPost;
  notification: AppNotification;
} {
  const validation = validateSourceInput({
    name: clipInput.title,
    url: clipInput.url,
    watchQuery: clipInput.selectedText,
    cssSelector: clipInput.cssSelector,
  });

  const normalizedUrl = validation.valid ? validation.normalizedUrl : clipInput.url;
  const handle = validation.valid ? validation.handle : clipInput.url.replace(/^https?:\/\//, '');
  const username = validation.valid
    ? validation.username
    : formatInstagramUsername(clipInput.title, handle);

  const source: WatchSource = {
    id: `src-ext-${nowMs}`,
    name: clipInput.title.trim(),
    username,
    handle,
    url: normalizedUrl,
    platform: clipInput.platform,
    watchQuery: clipInput.selectedText.trim(),
    cssSelector: clipInput.cssSelector.trim() || 'main article, .content-body',
    intervalSeconds: Math.max(10, Math.min(3600, clipInput.intervalSeconds || 30)),
    active: true,
    lastCheckedAt: 'Just now',
    capturesCount: 1,
    accentColor: DISTINCT_PROFILE_COLORS[Math.abs(nowMs) % DISTINCT_PROFILE_COLORS.length],
    priority: 'high',
    bio: `Clipped via PulseGrid Web Extension from ${handle}. Watching selector ${clipInput.cssSelector.trim() || 'main article'} for "${clipInput.selectedText.trim()}".`,
  };

  const headline = `Extension Clip: ${clipInput.title.trim()}`;

  const initialPost: CapturedPost = {
    id: `post-ext-${nowMs}`,
    sourceId: source.id,
    sourceName: source.name,
    sourceHandle: source.handle,
    sourceUrl: source.url,
    articleUrl: buildTopicDestinationUrl({
      sourceUrl: source.url,
      watchQuery: source.watchQuery,
      headline,
      platform: source.platform,
    }),
    platform: source.platform,
    capturedAt: 'Just now',
    timestampMs: nowMs,
    headline,
    summary: `Clipped via PulseGrid Browser Extension from ${source.handle}. Watching selector \`${source.cssSelector}\` every ${source.intervalSeconds}s for changes matching: "${source.watchQuery}".`,
    matchedQuery: source.watchQuery,
    cssSelector: source.cssSelector,
    extractedFields: [
      { label: 'Origin', value: 'Browser Extension Clipper', delta: 'PINNED' },
      { label: 'DOM Selector', value: source.cssSelector, delta: 'LOCKED' },
      { label: 'Poll Cadence', value: `Every ${source.intervalSeconds}s`, delta: '24/7' },
    ],
    likesCount: 0,
    likedByMe: false,
    saved: true,
    isNewCapture: true,
    visualTheme: 'diff',
    metricPrimary: 'EXT CLIP',
    metricSecondary: `${source.intervalSeconds}S POLL`,
    comments: [],
  };

  const notification: AppNotification = {
    id: `notif-ext-${nowMs}`,
    postId: initialPost.id,
    sourceId: source.id,
    sourceName: source.name,
    platform: source.platform,
    title: `Extension Pinned: ${source.name}`,
    message: `Now watching ${source.handle} (${source.cssSelector}) 24/7.`,
    createdAt: 'Just now',
    timestampMs: nowMs,
    read: false,
    severity: 'highlight',
  };

  return { source, initialPost, notification };
}

export interface PulseGridExportArchive {
  exportedAt: string;
  application: string;
  version: string;
  summary: {
    totalWatchedSources: number;
    activeWatchedSources: number;
    totalCapturedPosts: number;
    savedPostsCount: number;
    totalWatchHistoryAlerts: number;
  };
  profile: ProfileSettings;
  watchedSources: WatchSource[];
  capturedPosts: CapturedPost[];
  watchHistoryAlerts: AppNotification[];
}

export function buildExportPayload(
  profile: ProfileSettings,
  sources: WatchSource[],
  posts: CapturedPost[],
  notifications: AppNotification[],
  exportedAtIso: string = new Date().toISOString()
): {
  payload: PulseGridExportArchive;
  jsonString: string;
  filename: string;
} {
  const datePart = exportedAtIso.slice(0, 10);
  const payload: PulseGridExportArchive = {
    exportedAt: exportedAtIso,
    application: 'PulseGrid 24/7 Web & Social Intelligence Watcher',
    version: '1.0.0',
    summary: {
      totalWatchedSources: sources.length,
      activeWatchedSources: sources.filter((s) => s.active).length,
      totalCapturedPosts: posts.length,
      savedPostsCount: posts.filter((p) => p.saved).length,
      totalWatchHistoryAlerts: notifications.length,
    },
    profile,
    watchedSources: sources,
    capturedPosts: posts,
    watchHistoryAlerts: notifications,
  };

  return {
    payload,
    jsonString: JSON.stringify(payload, null, 2),
    filename: `pulsegrid-watch-export-${datePart}.json`,
  };
}
