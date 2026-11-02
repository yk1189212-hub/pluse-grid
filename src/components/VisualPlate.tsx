import React, { useState } from 'react';
import { Check, Globe, Clock, Code2, Sparkles } from 'lucide-react';
import { ExtractedField, PlatformType, WatchSource } from '../utils/watcherEngine';

interface VisualPlateProps {
  theme: 'diff' | 'social' | 'release' | 'discussion' | 'pricing' | 'newsletter';
  platform: PlatformType;
  metricPrimary: string;
  metricSecondary: string;
  sourceHandle: string;
  sourceName?: string;
  capturedAt?: string;
  headline: string;
  summary?: string;
  extractedFields?: ExtractedField[];
  highContrast: boolean;
  isNew?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Renders the authentic original brand icon for known platforms/websites,
 * or fetches the live website favicon for any custom website domain.
 */
export const WebsiteOriginalIcon: React.FC<{
  handle?: string;
  url?: string;
  platform?: PlatformType | string;
  avatarUrl?: string;
  name?: string;
  className?: string;
}> = ({ handle = '', url = '', platform = '', avatarUrl, name = '', className = 'w-full h-full' }) => {
  const [imgError, setImgError] = useState(false);
  const lower = `${handle} ${url} ${name} ${platform}`.toLowerCase();

  if (avatarUrl && avatarUrl.trim() && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={`${name || handle} icon`}
        onError={() => setImgError(true)}
        className={`${className} object-cover`}
      />
    );
  }

  // 1. Radix UI Official Logo (Black/Blue geometric mark)
  if (lower.includes('radix')) {
    return (
      <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Radix UI Original Icon">
        <rect width="120" height="120" rx="60" fill="#111827" />
        <path
          d="M34 30 H58 A26 26 0 0 1 58 82 H34 Z"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <circle cx="76" cy="44" r="14" fill="#818CF8" />
        <rect x="64" y="66" width="24" height="24" rx="4" fill="#34D399" />
      </svg>
    );
  }

  // 2. Stripe Official "S" Icon
  if (lower.includes('stripe')) {
    return (
      <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Stripe Original Icon">
        <rect width="120" height="120" rx="60" fill="#635BFF" />
        <path
          d="M54.5 47.2c0-3.6 3-5 7.9-5 7.1 0 16 2.2 23.1 6V31.5c-7.7-3.1-15.4-4.3-23.1-4.3-18.9 0-31.5 9.9-31.5 26.4 0 25.8 35.5 21.7 35.5 32.8 0 4.3-3.7 5.7-8.9 5.7-7.7 0-17.6-3.2-25.4-7.5v17c8.6 3.7 17.4 5.3 25.4 5.3 19.4 0 32.7-9.6 32.7-26.3-.1-27.8-35.7-22.9-35.7-33.4z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 3. Y Combinator / Hacker News Official Orange "Y" Icon
  if (lower.includes('ycombinator') || lower.includes('hacker news') || lower.includes('hackernews')) {
    return (
      <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Hacker News Original Icon">
        <rect width="120" height="120" rx="60" fill="#FF6600" />
        <rect x="22" y="22" width="76" height="76" rx="10" fill="none" stroke="#FFFFFF" strokeWidth="5" />
        <path
          d="M41 36 L60 64 L79 36 M60 64 V86"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // 4. Reddit Official Snoo Icon
  if (lower.includes('reddit') || lower.includes('localllama')) {
    return (
      <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Reddit Original Icon">
        <rect width="120" height="120" rx="60" fill="#FF4500" />
        <circle cx="60" cy="67" r="28" fill="#FFFFFF" />
        <circle cx="34" cy="54" r="9" fill="#FFFFFF" />
        <circle cx="86" cy="54" r="9" fill="#FFFFFF" />
        <path
          d="M60 39 L67 23 L82 27"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="86" cy="28" r="6" fill="#FFFFFF" />
        <circle cx="49" cy="63" r="5" fill="#FF4500" />
        <circle cx="71" cy="63" r="5" fill="#FF4500" />
        <path
          d="M47 77 Q60 86 73 77"
          fill="none"
          stroke="#FF4500"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // 5. Substack / Pragmatic Engineer Official Bookmark Icon
  if (lower.includes('substack') || lower.includes('pragmatic')) {
    return (
      <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Substack Original Icon">
        <rect width="120" height="120" rx="60" fill="#FF6719" />
        <rect x="33" y="30" width="54" height="8" rx="2" fill="#FFFFFF" />
        <rect x="33" y="44" width="54" height="8" rx="2" fill="#FFFFFF" />
        <path d="M33 58 H87 V92 L60 77 L33 92 Z" fill="#FFFFFF" />
      </svg>
    );
  }

  // 6. X (Twitter) Official Icon
  if (lower.includes('x.com') || lower.includes('twitter') || lower.includes('x / social') || lower.startsWith('@')) {
    return (
      <svg viewBox="0 0 120 120" className={className} role="img" aria-label="X Original Icon">
        <rect width="120" height="120" rx="60" fill="#000000" />
        <path
          d="M67.2 54.2 L91.8 26 H86.0 L64.6 50.5 L47.5 26 H27.8 L53.6 63.1 L27.8 93 H33.6 L56.2 67.1 L74.3 93 H94.0 L67.2 54.2 Z M59.2 63.6 L56.6 59.9 L35.7 30.4 H44.6 L61.4 54.1 L64.0 57.8 L85.9 88.8 H77.0 L59.2 63.6 Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 7. GitHub Official Octocat Silhouette Icon
  if (lower.includes('github')) {
    return (
      <svg viewBox="0 0 120 120" className={className} role="img" aria-label="GitHub Original Icon">
        <rect width="120" height="120" rx="60" fill="#181717" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M60 22C39 22 22 39 22 60c0 16.8 10.9 31 26 36.1 1.9.3 2.6-.8 2.6-1.8v-6.4c-10.6 2.3-12.8-5.1-12.8-5.1-1.7-4.4-4.2-5.6-4.2-5.6-3.5-2.4.3-2.3.3-2.3 3.8.3 5.8 3.9 5.8 3.9 3.4 5.8 8.9 4.1 11.1 3.1.3-2.5 1.3-4.1 2.4-5.1-8.4-1-17.3-4.2-17.3-18.8 0-4.2 1.5-7.6 3.9-10.3-.4-1-1.7-4.9.4-10.2 0 0 3.2-1 10.5 3.9 3-.8 6.3-1.3 9.5-1.3 3.2 0 6.5.5 9.5 1.3 7.3-4.9 10.5-3.9 10.5-3.9 2.1 5.3.8 9.2.4 10.2 2.4 2.7 3.9 6.1 3.9 10.3 0 14.6-8.9 17.8-17.3 18.8 1.4 1.2 2.6 3.5 2.6 7.1v10.5c0 1 .7 2.2 2.6 1.8C87.1 91 98 76.8 98 60c0-21-17-38-38-38z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 8. For any custom website domain, load its real website favicon via Google S2 Favicon service with monogram fallback
  const rawDomain = (url || handle)
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .replace(/^@/, '')
    .trim();

  if (rawDomain && rawDomain.includes('.') && !imgError) {
    return (
      <div className={`${className} bg-white dark:bg-neutral-900 flex items-center justify-center p-2`}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(rawDomain)}&sz=128`}
          alt={`${name || rawDomain} original icon`}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain rounded-full"
        />
      </div>
    );
  }

  const initials = (name || handle || 'WB')
    .split(/[\s/._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={`${name} Icon`}>
      <rect width="120" height="120" rx="60" fill="#2563EB" />
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="36"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {initials}
      </text>
    </svg>
  );
};

/**
 * Verified Live Data Tick Button:
 * Shows ONLY a clean verified tick badge by default (instead of raw "LIVE WEB DATA" text).
 * Moving the cursor over the tick reveals a tooltip with exact extraction time, source website, and live verification details.
 */
export const VerifiedLiveTickBadge: React.FC<{
  capturedAt: string;
  timestampMs?: number;
  sourceHandle: string;
  sourceName?: string;
  cssSelector?: string;
  matchedQuery?: string;
}> = ({
  capturedAt,
  timestampMs,
  sourceHandle,
  sourceName,
  cssSelector,
  matchedQuery,
}) => {
  const exactDateTime = timestampMs
    ? new Date(timestampMs).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : capturedAt;

  return (
    <span className="relative inline-flex items-center group">
      <button
        type="button"
        data-testid="verified-live-tick"
        aria-label={`Verified live data extracted ${capturedAt} from ${sourceHandle}`}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0095F6] text-white shadow-xs hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0095F6]"
      >
        <Check className="w-3 h-3 stroke-[3]" />
      </button>

      {/* Cursor Hover / Focus Tooltip Popover */}
      <div
        role="tooltip"
        className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-0 top-7 z-40 w-72 p-3 rounded-xl bg-neutral-950 text-white border border-neutral-700 shadow-2xl text-[11px] space-y-1.5"
      >
        <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1.5">
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verified Live Web Data</span>
          </span>
          <span className="font-mono text-[10px] text-neutral-400">24/7 WATCHER</span>
        </div>

        <div className="space-y-1 text-neutral-200">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-sky-400 shrink-0" />
            <span>
              <strong className="text-white">Extracted:</strong> {capturedAt} ({exactDateTime})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-sky-400 shrink-0" />
            <span className="truncate">
              <strong className="text-white">Website:</strong> {sourceName || sourceHandle} ({sourceHandle})
            </span>
          </div>
          {cssSelector && (
            <div className="flex items-center gap-1.5">
              <Code2 className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="font-mono text-[10px] text-neutral-300 truncate">
                Selector: {cssSelector}
              </span>
            </div>
          )}
          {matchedQuery && (
            <div className="text-[10px] text-neutral-400 pt-0.5 border-t border-neutral-800/80 line-clamp-2">
              Matched Topic: {matchedQuery}
            </div>
          )}
        </div>
      </div>
    </span>
  );
};

/**
 * Digital Newspaper Edition Card (`VisualPlate`):
 * Converts captured website news and updates into an authentic Digital Newspaper clipping
 * displayed in both the Home Feed and each website's Profile grid.
 */
export const VisualPlate: React.FC<VisualPlateProps> = ({
  platform,
  metricPrimary,
  metricSecondary,
  sourceHandle,
  sourceName,
  capturedAt = 'LIVE EDITION',
  headline,
  summary,
  extractedFields = [],
  highContrast,
  compact = false,
  className = '',
}) => {
  const newspaperTitle = (() => {
    const base = (sourceName || sourceHandle.split('/')[0] || 'PULSEGRID')
      .replace(/^@/, '')
      .toUpperCase();
    if (base.includes('CHRONICLE') || base.includes('GAZETTE') || base.includes('TIMES')) {
      return base;
    }
    return `THE ${base} DISPATCH`;
  })();

  const bodyExcerpt =
    summary && summary.trim().length > 0
      ? summary
      : `Special live intelligence dispatch extracted from ${sourceHandle}. Primary signal: ${metricPrimary} (${metricSecondary}).`;

  return (
    <div
      data-testid="digital-newspaper-plate"
      className={`relative w-full overflow-hidden select-none flex flex-col justify-between p-3.5 sm:p-5 transition-colors ${
        highContrast
          ? 'bg-white dark:bg-black text-black dark:text-white border-2 border-black dark:border-white'
          : 'bg-[#FAF7F0] dark:bg-[#141413] text-neutral-900 dark:text-neutral-100 border border-[#D8D0C1] dark:border-neutral-800'
      } ${className}`}
    >
      {/* Top Digital Newspaper Masthead */}
      <div className="border-b-2 border-neutral-900 dark:border-neutral-200 pb-2">
        <div className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
          <span className="truncate">DIGITAL NEWSPAPER · {platform}</span>
          <span className="shrink-0 font-bold">{capturedAt}</span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden shrink-0 border border-neutral-300 dark:border-neutral-700">
              <WebsiteOriginalIcon
                handle={sourceHandle}
                platform={platform}
                name={sourceName}
              />
            </div>
            <div className="font-serif font-black tracking-tight text-xs sm:text-sm md:text-base uppercase truncate">
              {newspaperTitle}
            </div>
          </div>

          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase border border-neutral-800 dark:border-neutral-300 shrink-0">
            {metricPrimary}
          </span>
        </div>

        <div className="mt-1 pt-1 border-t border-neutral-400/60 dark:border-neutral-700 flex items-center justify-between text-[9px] font-mono text-neutral-600 dark:text-neutral-400">
          <span className="truncate">{sourceHandle}</span>
          <span className="shrink-0">{metricSecondary}</span>
        </div>
      </div>

      {/* Center Newspaper Front-Page Lead Story */}
      <div className="my-auto py-2.5 space-y-2">
        <h4 className="font-serif font-extrabold text-sm sm:text-base md:text-lg leading-snug tracking-tight text-neutral-950 dark:text-white line-clamp-3">
          {headline}
        </h4>

        {!compact && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-neutral-300/80 dark:border-neutral-800">
            <p className="sm:col-span-8 text-xs text-neutral-800 dark:text-neutral-300 font-serif leading-relaxed line-clamp-4">
              {bodyExcerpt}
            </p>
            <div className="sm:col-span-4 border-t sm:border-t-0 sm:border-l border-neutral-300 dark:border-neutral-800 pt-2 sm:pt-0 sm:pl-3 space-y-1">
              <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                KEY PRESS FACTS
              </div>
              {(extractedFields.length > 0
                ? extractedFields.slice(0, 2)
                : [
                    { label: 'EDITION', value: metricPrimary },
                    { label: 'STATUS', value: metricSecondary },
                  ]
              ).map((f, i) => (
                <div key={i} className="text-[10px]">
                  <span className="font-mono text-neutral-500 dark:text-neutral-400 block uppercase">
                    {f.label}
                  </span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {compact && (
          <p className="text-[11px] text-neutral-700 dark:text-neutral-300 font-serif leading-snug line-clamp-3">
            {bodyExcerpt}
          </p>
        )}
      </div>

      {/* Bottom Newspaper Footer Rule */}
      <div className="pt-1.5 border-t border-neutral-400/70 dark:border-neutral-800 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
        <span>PULSEGRID PRESS SYNDICATE</span>
        <span>VERIFIED EDITION ✓</span>
      </div>
    </div>
  );
};

export const ProfileAvatarSVG: React.FC<{
  highContrast: boolean;
  active247: boolean;
  size?: 'sm' | 'lg';
}> = ({ highContrast, active247, size = 'lg' }) => {
  const outerDims =
    size === 'sm'
      ? 'w-11 h-11 p-[2px]'
      : 'w-24 h-24 sm:w-36 sm:h-36 p-[3.5px]';

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <div
        className={`${outerDims} rounded-full transition-transform duration-300 ${
          highContrast
            ? 'bg-amber-400'
            : active247
            ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600'
            : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
      >
        <div className="w-full h-full rounded-full bg-white dark:bg-black p-[3px]">
          <div className="w-full h-full rounded-full overflow-hidden bg-neutral-950 flex items-center justify-center">
            <svg
              viewBox="0 0 120 120"
              className="w-full h-full"
              role="img"
              aria-label="PulseGrid 24/7 Web Watcher Master Profile Avatar"
            >
              <defs>
                <radialGradient id="pgAvatarCore" cx="50%" cy="45%" r="60%">
                  <stop offset="0%" stopColor={highContrast ? '#000000' : '#0F172A'} />
                  <stop offset="100%" stopColor="#020617" />
                </radialGradient>
              </defs>
              <rect width="120" height="120" rx="60" fill="url(#pgAvatarCore)" />
              <circle
                cx="60"
                cy="60"
                r="42"
                fill="none"
                stroke={highContrast ? '#FFD60A' : '#38BDF8'}
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <circle
                cx="60"
                cy="60"
                r="26"
                fill="none"
                stroke={highContrast ? '#FFFFFF' : '#818CF8'}
                strokeWidth="2.2"
              />
              <line
                x1="60"
                y1="60"
                x2="92"
                y2="34"
                stroke={highContrast ? '#FFD60A' : '#34D399'}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx="60"
                cy="60"
                r="6.5"
                fill={highContrast ? '#FFD60A' : '#38BDF8'}
              />
              <circle
                cx="84"
                cy="40"
                r="4.5"
                fill={highContrast ? '#FFFFFF' : '#34D399'}
              />
            </svg>
          </div>
        </div>
      </div>

      {size === 'lg' && (
        <span
          className={`absolute -bottom-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
            highContrast
              ? 'bg-black text-amber-300 border-amber-300'
              : active247
              ? 'bg-emerald-500 text-neutral-950 border-white dark:border-neutral-950 shadow-sm'
              : 'bg-neutral-700 text-white border-white dark:border-neutral-900'
          }`}
        >
          {active247 ? 'LIVE 24/7' : 'PAUSED'}
        </span>
      )}
    </div>
  );
};

export const SourceProfileAvatarSVG: React.FC<{
  source: WatchSource;
  highContrast: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ source, highContrast, size = 'lg' }) => {
  const dims =
    size === 'sm'
      ? 'w-10 h-10 p-[2px]'
      : size === 'md'
      ? 'w-14 h-14 p-[2.5px]'
      : 'w-24 h-24 sm:w-36 sm:h-36 p-[3.5px]';

  const brandColor = highContrast ? '#000000' : source.accentColor || '#2563EB';

  return (
    <div
      data-testid={`website-avatar-${source.id}`}
      className="relative inline-flex items-center justify-center shrink-0"
    >
      <div
        className={`${dims} rounded-full transition-transform duration-200 ${
          highContrast
            ? 'bg-amber-400'
            : source.active
            ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600'
            : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
      >
        <div className="w-full h-full rounded-full bg-white dark:bg-black p-[2px]">
          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative">
            <WebsiteOriginalIcon
              handle={source.handle}
              url={source.url}
              platform={source.platform}
              avatarUrl={source.avatarUrl}
              name={source.name}
            />
          </div>
        </div>
      </div>

      {size === 'lg' && (
        <span
          className="absolute -bottom-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border text-white border-white dark:border-neutral-950 shadow-sm"
          style={{ backgroundColor: source.active ? brandColor : '#525252' }}
        >
          {source.active ? `FOLLOWING · ${source.intervalSeconds}S` : 'PAUSED'}
        </span>
      )}
    </div>
  );
};
