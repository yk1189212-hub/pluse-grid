import React, { useMemo } from 'react';
import {
  RefreshCw,
  Settings,
  Puzzle,
  Plus,
  ExternalLink,
  Pause,
  Play,
  UserCheck,
  UserPlus,
  ArrowLeft,
  SlidersHorizontal,
  TrendingUp,
  Globe,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  CapturedPost,
  ProfileSettings,
  SevenDayTrendPoint,
  SourceProfileStats,
  WatchSource,
  computeSevenDayPostTrend,
  buildTopicDestinationUrl,
} from '../utils/watcherEngine';
import {
  ProfileAvatarSVG,
  SourceProfileAvatarSVG,
  VerifiedLiveTickBadge,
} from './VisualPlate';

interface ProfileHeaderProps {
  profile: ProfileSettings;
  sources: WatchSource[];
  posts?: CapturedPost[];
  selectedSourceId: string | null;
  activeSourceStats: SourceProfileStats | null;
  onSelectSource: (sourceId: string | null) => void;
  onBackToHome?: () => void;
  onOpenFollowingList?: () => void;
  metrics: {
    totalCaptures: number;
    activeSourcesCount: number;
    totalSourcesCount: number;
    unreadAlertsCount: number;
    savedPostsCount: number;
    checksPerHour: number;
  };
  isPollingNow: boolean;
  secondsUntilNextCheck: number;
  onTriggerWatchCycle: (specificSourceId?: string) => void;
  onToggleWatcher247: () => void;
  onToggleSourceActive: (sourceId: string) => void;
  onEditSourceProfile: (sourceId: string) => void;
  onOpenSettings: (tab?: 'sources' | 'extension' | 'profile') => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  sources,
  posts = [],
  selectedSourceId,
  activeSourceStats,
  onSelectSource,
  onBackToHome,
  onOpenFollowingList,
  metrics,
  isPollingNow,
  secondsUntilNextCheck,
  onTriggerWatchCycle,
  onToggleWatcher247,
  onToggleSourceActive,
  onEditSourceProfile,
  onOpenSettings,
}) => {
  const selectedSource = selectedSourceId
    ? sources.find((s) => s.id === selectedSourceId) || null
    : null;

  // Target website entity for the 7-day Trends sparkline
  const trendTargetSource = selectedSource || sources[0] || null;

  const sevenDayTrendData: SevenDayTrendPoint[] = useMemo(() => {
    if (activeSourceStats?.sevenDayTrend?.length) {
      return activeSourceStats.sevenDayTrend;
    }
    return computeSevenDayPostTrend(trendTargetSource, posts);
  }, [activeSourceStats, trendTargetSource, posts]);

  const trendStats = useMemo(() => {
    const total7d = sevenDayTrendData.reduce((sum, pt) => sum + pt.posts, 0);
    const avgDaily = (total7d / Math.max(1, sevenDayTrendData.length)).toFixed(1);
    const peakPoint = sevenDayTrendData.reduce(
      (best, pt) => (pt.posts > best.posts ? pt : best),
      sevenDayTrendData[0] || { dayLabel: 'Today', fullDate: '', posts: 0, dayKey: '', checks: 0 }
    );
    const todayPosts =
      sevenDayTrendData[sevenDayTrendData.length - 1]?.posts ?? 0;
    const firstDayPosts = sevenDayTrendData[0]?.posts ?? 1;
    const deltaPct = Math.round(
      ((todayPosts - firstDayPosts) / Math.max(1, firstDayPosts)) * 100
    );

    return {
      total7d,
      avgDaily,
      peakPoint,
      todayPosts,
      deltaPct,
    };
  }, [sevenDayTrendData]);

  const strokeColor = profile.highContrast
    ? profile.darkMode
      ? '#FFFFFF'
      : '#000000'
    : trendTargetSource?.accentColor || '#0095F6';

  const gradientId = `trend-sparkline-grad-${trendTargetSource?.id || 'hub'}`;

  const renderTrendsSparklineSection = () => (
    <div
      data-testid="profile-trends-section"
      aria-label={`Trends: 7-day post frequency for ${
        selectedSource ? `@${selectedSource.username}` : `@${trendTargetSource?.username || profile.username}`
      }`}
      className={`mt-4 p-3.5 sm:p-4 rounded-2xl border transition-colors ${
        profile.highContrast
          ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
          : 'bg-neutral-50/90 dark:bg-neutral-900/70 border-neutral-200/90 dark:border-neutral-800'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Trends Header & 7-Day Frequency KPIs */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#0095F6]/10 text-[#0095F6] dark:bg-[#0095F6]/20 shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white font-display whitespace-nowrap">
              Trends · Last 7 Days
            </h2>
            <span className="text-[11px] font-mono font-semibold text-[#0095F6] whitespace-nowrap">
              @{selectedSource ? selectedSource.username : trendTargetSource?.username || profile.username}
            </span>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Digital newspaper capture frequency over the last 7 days for{' '}
            <span className="font-semibold text-neutral-900 dark:text-white">
              {selectedSource
                ? selectedSource.name
                : trendTargetSource
                ? `${trendTargetSource.name}`
                : profile.displayName}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs">
            <div className="whitespace-nowrap">
              <span className="text-neutral-500 dark:text-neutral-400">7d Captures: </span>
              <span
                data-testid="trends-7d-total"
                className="font-bold font-mono tabular-nums text-neutral-900 dark:text-white"
              >
                {trendStats.total7d} posts
              </span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-neutral-500 dark:text-neutral-400">Daily Avg: </span>
              <span className="font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
                {trendStats.avgDaily}/day
              </span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-neutral-500 dark:text-neutral-400">Peak: </span>
              <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {trendStats.peakPoint.dayLabel} ({trendStats.peakPoint.posts})
              </span>
            </div>
            <div className="whitespace-nowrap">
              <span className="text-neutral-500 dark:text-neutral-400">Today: </span>
              <span
                data-testid="trends-today-count"
                className="font-bold font-mono tabular-nums text-[#0095F6]"
              >
                {trendStats.todayPosts} posts
              </span>
            </div>
          </div>
        </div>

        {/* Right: Recharts 7-Day Post Frequency Sparkline */}
        <div
          data-testid="trends-sparkline-container"
          className="w-full lg:w-[320px] h-[88px] shrink-0"
        >
          <ResponsiveContainer width="100%" height={88} minWidth={200} minHeight={80}>
            <AreaChart
              data={sevenDayTrendData}
              margin={{ top: 8, right: 20, left: 12, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dayLabel"
                axisLine={false}
                tickLine={false}
                interval={0}
                padding={{ left: 6, right: 10 }}
                tick={{
                  fontSize: 10,
                  fill: profile.darkMode ? '#a3a3a3' : '#525252',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <YAxis hide domain={[0, 'dataMax + 2']} />
              <Tooltip
                cursor={{
                  stroke: strokeColor,
                  strokeWidth: 1,
                  strokeDasharray: '3 3',
                }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const point = payload[0].payload as SevenDayTrendPoint;
                  return (
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 shadow-md text-[11px] font-mono">
                      <div className="font-bold text-neutral-900 dark:text-white">
                        {point.dayLabel} ({point.fullDate})
                      </div>
                      <div className="text-[#0095F6] font-semibold">
                        {point.posts} {point.posts === 1 ? 'post' : 'posts'} captured
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="posts"
                stroke={strokeColor}
                strokeWidth={2.25}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                dot={{
                  r: 3,
                  fill: strokeColor,
                  strokeWidth: 1.5,
                  stroke: profile.darkMode ? '#000000' : '#ffffff',
                }}
                activeDot={{
                  r: 4.5,
                  fill: strokeColor,
                  stroke: profile.darkMode ? '#000000' : '#ffffff',
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  return (
    <section
      aria-label="Instagram Profile Header"
      className="w-full max-w-[935px] mx-auto px-4 sm:px-5 pt-6 pb-4"
    >
      {/* Contextual Switcher Banner when viewing a specific Website's Instagram Profile */}
      {selectedSource && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => (onBackToHome ? onBackToHome() : onSelectSource(null))}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home Feed</span>
          </button>

          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
            @{selectedSource.username} · Last checked {selectedSource.lastCheckedAt}
          </span>
        </div>
      )}

      {/* Top Instagram Profile Grid: Avatar Left + Info Right */}
      {selectedSource && activeSourceStats ? (
        /* INDIVIDUAL WEBSITE PROFILE VIEW (Original Website Icon, Bio, Stats & Direct Topic Link) */
        <div
          data-testid="website-entity-profile-header"
          className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 md:gap-12 mb-6"
        >
          {/* Original Website Profile Avatar */}
          <div className="sm:w-[160px] md:w-[220px] flex justify-center shrink-0">
            <SourceProfileAvatarSVG
              source={selectedSource}
              highContrast={profile.highContrast}
              size="lg"
            />
          </div>

          {/* Website Profile Info & Dedicated Stats */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            {/* Row 1: Website @username + Verified Tick + Following Toggle + Scan Profile + Customize */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 mr-2">
                <h1 className="text-xl font-normal tracking-tight text-neutral-900 dark:text-white font-display">
                  @{activeSourceStats.username}
                </h1>
                <VerifiedLiveTickBadge
                  capturedAt={selectedSource.lastCheckedAt}
                  sourceHandle={selectedSource.handle}
                  sourceName={selectedSource.name}
                  cssSelector={selectedSource.cssSelector}
                  matchedQuery={selectedSource.watchQuery}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Following / Follow Toggle Button */}
                <button
                  type="button"
                  onClick={() => onToggleSourceActive(selectedSource.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedSource.active
                      ? 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white'
                      : 'bg-[#0095F6] hover:bg-[#1877F2] text-white'
                  }`}
                >
                  {selectedSource.active ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>

                {/* Scan This Website Profile Now */}
                <button
                  type="button"
                  onClick={() => onTriggerWatchCycle(selectedSource.id)}
                  disabled={isPollingNow}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    profile.highContrast
                      ? 'bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white'
                      : 'bg-[#0095F6] hover:bg-[#1877F2] text-white'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPollingNow ? 'animate-spin' : ''}`} />
                  <span>{isPollingNow ? 'Scanning...' : 'Scan Profile Now'}</span>
                </button>

                {/* Customize Website Profile */}
                <button
                  type="button"
                  onClick={() => onEditSourceProfile(selectedSource.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    profile.highContrast
                      ? 'border-2 border-black dark:border-white text-black dark:text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Customize Profile</span>
                </button>
              </div>
            </div>

            {/* Row 2: Individual Website Profile Stats Row */}
            <ul className="flex flex-wrap items-center gap-6 sm:gap-8 text-sm text-neutral-900 dark:text-white">
              <li>
                <span className="font-bold font-mono tabular-nums">
                  {activeSourceStats.postsCount}
                </span>{' '}
                <span className="text-neutral-700 dark:text-neutral-300">newspaper editions</span>
              </li>
              <li>
                <span className="font-bold font-mono tabular-nums">
                  {activeSourceStats.checksPerHour}
                </span>{' '}
                <span className="text-neutral-700 dark:text-neutral-300">
                  checks/hr
                </span>
              </li>
              <li>
                <span className="font-bold font-mono tabular-nums">
                  {activeSourceStats.totalLikes}
                </span>{' '}
                <span className="text-neutral-700 dark:text-neutral-300">
                  total likes
                </span>
              </li>
              <li>
                <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {activeSourceStats.signalMatchRate}
                </span>{' '}
                <span className="text-neutral-700 dark:text-neutral-300">
                  signal match
                </span>
              </li>
            </ul>

            {/* Row 3: Distinct Website Bio, Watch Topic & Direct "Go to Website Topic" Link */}
            <div className="space-y-1.5 text-sm leading-snug max-w-2xl">
              <div className="font-bold text-neutral-900 dark:text-white">
                {selectedSource.name}
              </div>
              {selectedSource.bio && (
                <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  {selectedSource.bio}
                </p>
              )}
              <p className="text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm leading-relaxed">
                <span className="font-semibold text-neutral-900 dark:text-white">
                  Watched Topic:
                </span>{' '}
                {selectedSource.watchQuery}
              </p>

              {/* Direct Go to Website Topic Link */}
              <div className="pt-1.5 flex flex-wrap items-center gap-3">
                <a
                  href={buildTopicDestinationUrl({
                    url: selectedSource.url,
                    watchQuery: selectedSource.watchQuery,
                    platform: selectedSource.platform,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="profile-go-to-topic-btn"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Go to Website Topic on {selectedSource.handle.split('/')[0]}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href={selectedSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#00376B] dark:text-[#E0F1FF] hover:underline text-xs sm:text-sm"
                >
                  <span>{selectedSource.handle}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Row 4: 'Trends' 7-Day Post Frequency Sparkline Section for the Selected Website Entity */}
            {renderTrendsSparklineSection()}
          </div>
        </div>
      ) : (
        /* MASTER HUB INSTAGRAM PROFILE VIEW (@pulsegrid.watch — Shown ONLY when user clicks Profile tab) */
        <div
          data-testid="master-profile-header"
          className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 md:gap-12 mb-6"
        >
          {/* Left Avatar Zone */}
          <div className="sm:w-[160px] md:w-[220px] flex justify-center shrink-0">
            <ProfileAvatarSVG
              highContrast={profile.highContrast}
              active247={profile.watcher247Enabled}
              size="lg"
            />
          </div>

          {/* Right Info Zone */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            {/* Row 1: Username + Instagram Action Buttons + Settings Gear */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-normal tracking-tight text-neutral-900 dark:text-white font-display mr-2">
                {profile.username}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenSettings('sources')}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    profile.highContrast
                      ? 'border-2 border-black dark:border-white text-black dark:text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Follow New Website</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSettings('extension')}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    profile.highContrast
                      ? 'border-2 border-black dark:border-white text-black dark:text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white'
                  }`}
                >
                  <Puzzle className="w-3.5 h-3.5" />
                  <span>Extension Clipper</span>
                </button>

                <button
                  type="button"
                  onClick={() => onTriggerWatchCycle()}
                  disabled={isPollingNow}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    profile.highContrast
                      ? 'bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white'
                      : 'bg-[#0095F6] hover:bg-[#1877F2] text-white'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPollingNow ? 'animate-spin' : ''}`} />
                  <span>{isPollingNow ? 'Scanning...' : 'Run Watch Cycle Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSettings('profile')}
                  aria-label="Open Settings Modal"
                  className="p-2 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Settings & Download JSON"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Row 2: Classic Instagram Horizontal Stats Row */}
            <ul className="flex flex-wrap items-center gap-6 sm:gap-10 text-sm text-neutral-900 dark:text-white">
              <li>
                <span className="font-bold font-mono tabular-nums">
                  {metrics.totalCaptures}
                </span>{' '}
                <span className="text-neutral-700 dark:text-neutral-300">posts</span>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenFollowingList && onOpenFollowingList()}
                  className="hover:underline cursor-pointer"
                  title="View Following Websites List"
                >
                  <span className="font-bold font-mono tabular-nums">
                    {metrics.totalSourcesCount}
                  </span>{' '}
                  <span className="text-neutral-700 dark:text-neutral-300">
                    following
                  </span>
                </button>
              </li>
              <li>
                <span className="font-bold font-mono tabular-nums">
                  {metrics.checksPerHour}
                </span>{' '}
                <span className="text-neutral-700 dark:text-neutral-300">
                  checks/hr
                </span>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onToggleWatcher247}
                  aria-label={
                    profile.watcher247Enabled
                      ? 'Pause 24/7 Watcher'
                      : 'Resume 24/7 Watcher'
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  {profile.watcher247Enabled ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="tabular-nums">
                        24/7 Live ({secondsUntilNextCheck}s)
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-amber-500" />
                      <span>Paused (Resume)</span>
                    </>
                  )}
                </button>
              </li>
            </ul>

            {/* Row 3: Classic Instagram Bio Block */}
            <div className="space-y-1 text-sm leading-snug max-w-2xl">
              <div className="font-bold text-neutral-900 dark:text-white">
                {profile.displayName}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                24/7 Autonomous Website &amp; Social Intelligence Network · Shortcut: {profile.extensionShortcut}
              </div>
              <p className="text-neutral-800 dark:text-neutral-200 pt-0.5 leading-relaxed">
                {profile.bio}
              </p>
              <div className="pt-1">
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#00376B] dark:text-[#E0F1FF] hover:underline text-xs sm:text-sm"
                >
                  <span>{profile.websiteUrl.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Row 4: 'Trends' 7-Day Post Frequency Sparkline Section */}
            {renderTrendsSparklineSection()}
          </div>
        </div>
      )}

      {/* Row 5: Followed Website Profiles Tray with Original Website Icons (No Master Hub Ring!) */}
      <div className="pt-2 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Followed Websites — Click Any Website to View Its Digital Newspaper Profile
          </span>
          {onOpenFollowingList && (
            <button
              type="button"
              onClick={onOpenFollowingList}
              className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer"
            >
              Manage Following ({sources.length})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-5 sm:gap-6 py-2">
          {sources.map((source) => {
            const isSelected = selectedSourceId === source.id;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => onSelectSource(source.id)}
                className="group flex flex-col items-center gap-1.5 w-[78px] shrink-0 cursor-pointer text-center"
                title={`View @${source.username} Instagram profile & stats`}
              >
                <div
                  className={`rounded-full transition-transform group-hover:scale-105 ${
                    isSelected ? 'ring-2 ring-[#0095F6] ring-offset-2 dark:ring-offset-black' : ''
                  }`}
                >
                  <SourceProfileAvatarSVG
                    source={source}
                    highContrast={profile.highContrast}
                    size="md"
                  />
                </div>
                <span
                  className={`text-xs truncate w-full ${
                    isSelected
                      ? 'font-bold text-[#0095F6]'
                      : 'font-normal text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  @{source.username}
                </span>
              </button>
            );
          })}

          {/* "+ Follow Website" Ring Button */}
          <button
            type="button"
            onClick={() => onOpenSettings('sources')}
            aria-label="Follow New Website Profile"
            className="group flex flex-col items-center gap-1.5 w-[78px] shrink-0 cursor-pointer text-center"
          >
            <div className="w-[56px] h-[56px] rounded-full border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-800 dark:text-neutral-200 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-900 transition-colors">
              <Plus className="w-6 h-6 stroke-[1.5]" />
            </div>
            <span className="text-xs font-normal text-neutral-700 dark:text-neutral-300 truncate w-full">
              Follow Site
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
