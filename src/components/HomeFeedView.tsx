import React, { useState } from 'react';
import {
  Heart,
  MessageSquare,
  Bookmark,
  ExternalLink,
  RefreshCw,
  Plus,
  Globe,
  ArrowUpRight,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  Zap,
  Newspaper,
} from 'lucide-react';
import {
  CapturedPost,
  ProfileSettings,
  WatchSource,
  formatInstagramUsername,
  buildTopicDestinationUrl,
} from '../utils/watcherEngine';
import {
  VisualPlate,
  SourceProfileAvatarSVG,
  VerifiedLiveTickBadge,
} from './VisualPlate';

interface HomeFeedViewProps {
  profile: ProfileSettings;
  sources: WatchSource[];
  posts: CapturedPost[];
  isPollingNow: boolean;
  lastScrapeSummary: {
    checkedSourcesCount: number;
    newPostsCount: number;
    lastCheckedTime: string;
    sourceStatuses: Record<
      string,
      { status: 'idle' | 'checking' | 'live' | 'error'; count: number; method?: string }
    >;
  };
  onCheckAllWebsitesNow: () => void;
  onCheckSingleWebsiteNow: (sourceId: string) => void;
  onViewWebsiteProfile: (sourceId: string) => void;
  onOpenMasterProfile: () => void;
  onOpenFollowingList: () => void;
  onToggleSourceActive: (sourceId: string) => void;
  onEditSourceProfile: (sourceId: string) => void;
  onInspectPost: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onOpenAddWebsite: () => void;
}

export const HomeFeedView: React.FC<HomeFeedViewProps> = ({
  profile,
  sources,
  posts,
  isPollingNow,
  lastScrapeSummary,
  onCheckAllWebsitesNow,
  onCheckSingleWebsiteNow,
  onViewWebsiteProfile,
  onOpenFollowingList,
  onToggleSourceActive,
  onEditSourceProfile,
  onInspectPost,
  onToggleLike,
  onToggleSave,
  onAddComment,
  onOpenAddWebsite,
}) => {
  const [filterSourceId, setFilterSourceId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const activeFilteredSource = filterSourceId
    ? sources.find((s) => s.id === filterSourceId) || null
    : null;

  // Filter and sort strictly by Latest (timestampMs descending) for natural mouse-wheel scrolling
  const latestPosts = React.useMemo(() => {
    const filtered = filterSourceId
      ? posts.filter((p) => p.sourceId === filterSourceId)
      : posts;
    return [...filtered].sort((a, b) => b.timestampMs - a.timestampMs);
  }, [posts, filterSourceId]);

  const handleCommentSubmit = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;
    onAddComment(postId, text);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleQuickScanTrigger = () => {
    if (filterSourceId) {
      onCheckSingleWebsiteNow(filterSourceId);
    } else {
      onCheckAllWebsitesNow();
    }
  };

  return (
    <div
      data-testid="instagram-home-feed"
      className="w-full max-w-[935px] mx-auto px-2 sm:px-5 pt-4 pb-20 flex flex-col xl:flex-row items-start justify-center gap-8 relative"
    >
      {/* LEFT / CENTER COLUMN: Authentic Instagram Home Feed (Stories Tray + Digital Newspaper Feed) */}
      <div className="w-full max-w-[580px] mx-auto xl:mx-0 space-y-5">
        {/* 1. Instagram Home Stories Bar of Followed Websites (With Original Icons & Zero Scrollbar Clutter) */}
        <div
          data-testid="home-following-stories-bar"
          className={`p-3.5 rounded-2xl border ${
            profile.highContrast
              ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
              : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Following Websites ({sources.filter((s) => s.active).length} Active)
            </span>
            <button
              type="button"
              onClick={onOpenFollowingList}
              className="text-[11px] font-bold text-[#0095F6] hover:underline cursor-pointer"
            >
              See All Following →
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 py-1">
            {/* All Followed Stories Chip */}
            <button
              type="button"
              onClick={() => setFilterSourceId(null)}
              className="group flex flex-col items-center gap-1 w-[64px] shrink-0 cursor-pointer text-center"
            >
              <div
                className={`w-14 h-14 rounded-full p-[2px] transition-transform group-hover:scale-105 ${
                  filterSourceId === null
                    ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600'
                    : 'bg-neutral-300 dark:bg-neutral-800'
                }`}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-black p-[2px]">
                  <div className="w-full h-full rounded-full bg-neutral-900 text-white flex flex-col items-center justify-center">
                    <Newspaper className="w-4 h-4 text-amber-400 mb-0.5" />
                    <span className="text-[9px] font-bold font-mono">ALL</span>
                  </div>
                </div>
              </div>
              <span
                className={`text-[11px] truncate w-full ${
                  filterSourceId === null
                    ? 'font-bold text-neutral-900 dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                All News
              </span>
            </button>

            {sources.map((src) => {
              const isSelected = filterSourceId === src.id;
              return (
                <div
                  key={src.id}
                  className="flex flex-col items-center gap-1 w-[68px] shrink-0 text-center"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setFilterSourceId((prev) =>
                        prev === src.id ? null : src.id
                      )
                    }
                    title={`Filter Home Feed by @${src.username} (or click username to open profile)`}
                    className={`cursor-pointer rounded-full transition-transform hover:scale-105 ${
                      isSelected ? 'ring-2 ring-[#0095F6] ring-offset-2 dark:ring-offset-black' : ''
                    }`}
                  >
                    <SourceProfileAvatarSVG
                      source={src}
                      highContrast={profile.highContrast}
                      size="md"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewWebsiteProfile(src.id)}
                    className={`text-[11px] truncate w-full hover:underline cursor-pointer ${
                      isSelected
                        ? 'font-bold text-[#0095F6]'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    @{src.username}
                  </button>
                </div>
              );
            })}

            {/* Add New Website Story Button */}
            <button
              type="button"
              onClick={onOpenAddWebsite}
              className="group flex flex-col items-center gap-1 w-[64px] shrink-0 cursor-pointer text-center"
            >
              <div className="w-14 h-14 rounded-full border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-900 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate w-full">
                Add Site
              </span>
            </button>
          </div>
        </div>

        {/* If filtering by a specific website in Home Feed, show a banner to view its full Profile or Customize */}
        {activeFilteredSource && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#0095F6]/10 border border-[#0095F6]/30 text-xs">
            <span className="font-medium text-neutral-900 dark:text-white">
              Showing Digital Newspaper editions from{' '}
              <strong>@{activeFilteredSource.username}</strong> ({activeFilteredSource.name})
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onEditSourceProfile(activeFilteredSource.id)}
                className="font-semibold text-neutral-700 dark:text-neutral-200 hover:underline cursor-pointer"
              >
                Customize
              </button>
              <button
                type="button"
                onClick={() => onViewWebsiteProfile(activeFilteredSource.id)}
                className="font-bold text-[#0095F6] hover:underline cursor-pointer"
              >
                Open @{activeFilteredSource.username} Profile →
              </button>
              <button
                type="button"
                onClick={() => setFilterSourceId(null)}
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                Show All
              </button>
            </div>
          </div>
        )}

        {/* 2. Vertical Instagram Home Feed Posts (Digital Newspaper Edition + Hoverable Verified Tick) */}
        <div className="space-y-6">
          {latestPosts.map((post, idx) => {
            const sourceObj = sources.find((s) => s.id === post.sourceId);
            const username =
              sourceObj?.username ||
              formatInstagramUsername(post.sourceName, post.sourceHandle);
            const topicDestinationUrl = buildTopicDestinationUrl({
              sourceUrl: post.sourceUrl,
              articleUrl: post.articleUrl,
              watchQuery: sourceObj?.watchQuery || post.matchedQuery,
              matchedQuery: post.matchedQuery,
              headline: post.headline,
              platform: post.platform,
            });

            return (
              <article
                key={post.id}
                data-testid="home-feed-post-card"
                className={`rounded-2xl border overflow-visible transition-colors ${
                  profile.highContrast
                    ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
                    : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-xs'
                }`}
              >
                {/* Post Header (Original Website Icon + @username + Hoverable Verified Tick + Following) */}
                <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-900">
                  <div className="flex items-center gap-3 min-w-0">
                    {sourceObj ? (
                      <button
                        type="button"
                        onClick={() => onViewWebsiteProfile(sourceObj.id)}
                        className="shrink-0 cursor-pointer"
                        title={`View @${username} profile & 7-day trends`}
                      >
                        <SourceProfileAvatarSVG
                          source={sourceObj}
                          highContrast={profile.highContrast}
                          size="sm"
                        />
                      </button>
                    ) : null}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            sourceObj && onViewWebsiteProfile(sourceObj.id)
                          }
                          className="text-sm font-bold text-neutral-900 dark:text-white hover:underline cursor-pointer"
                        >
                          @{username}
                        </button>

                        {/* Hoverable Verified Tick Button (Replaces direct "LIVE WEB DATA" text!) */}
                        <VerifiedLiveTickBadge
                          capturedAt={post.capturedAt}
                          timestampMs={post.timestampMs}
                          sourceHandle={post.sourceHandle}
                          sourceName={post.sourceName}
                          cssSelector={post.cssSelector}
                          matchedQuery={post.matchedQuery}
                        />

                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                          {post.capturedAt}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 break-words">
                        {post.sourceName} · {post.platform}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {sourceObj && (
                      <>
                        <button
                          type="button"
                          onClick={() => onToggleSourceActive(sourceObj.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            sourceObj.active
                              ? 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                              : 'bg-[#0095F6] text-white'
                          }`}
                        >
                          {sourceObj.active ? 'Following' : 'Follow'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditSourceProfile(sourceObj.id)}
                          title={`Customize @${username} profile`}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Digital Newspaper Front-Page Edition + Full Article Details */}
                <div className="border-b border-neutral-100 dark:border-neutral-900">
                  {/* Clickable Digital Newspaper Edition Card */}
                  <div
                    onClick={() => onInspectPost(post.id)}
                    className="w-full cursor-pointer"
                  >
                    <VisualPlate
                      theme={post.visualTheme}
                      platform={post.platform}
                      headline={post.headline}
                      summary={post.summary}
                      extractedFields={post.extractedFields}
                      metricPrimary={post.metricPrimary}
                      metricSecondary={post.metricSecondary}
                      sourceHandle={post.sourceHandle}
                      sourceName={post.sourceName}
                      capturedAt={post.capturedAt}
                      highContrast={profile.highContrast}
                      isNew={idx === 0 && post.isNewCapture}
                    />
                  </div>

                  {/* Full Article Text & Direct Topic Action Strip */}
                  <div className="p-4 sm:p-5 bg-neutral-50/60 dark:bg-neutral-900/40 space-y-3">
                    <p
                      data-testid="post-full-summary"
                      className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-line break-words"
                    >
                      {post.summary}
                    </p>

                    {post.extractedFields.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        {post.extractedFields.map((field, fIdx) => (
                          <div
                            key={`${post.id}-f-${fIdx}`}
                            className="p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 text-xs flex flex-col justify-between gap-1"
                          >
                            <span className="text-[10px] font-mono uppercase text-neutral-500 dark:text-neutral-400">
                              {field.label}
                            </span>
                            <div className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 break-words leading-snug">
                              {field.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/60 dark:border-neutral-800/80">
                      <div className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 break-words">
                        <span className="font-bold text-neutral-800 dark:text-neutral-200">
                          Watched Topic:
                        </span>{' '}
                        {post.matchedQuery}
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={topicDestinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="go-to-topic-link"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Go to Website Topic</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => onInspectPost(post.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-200/70 hover:bg-neutral-300/70 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                        >
                          Read Newspaper
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instagram Post Action Bar (Like, Comment, Go to Topic, Save) */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => onToggleLike(post.id)}
                        aria-label={
                          post.likedByMe
                            ? `Unlike post (${post.likesCount} likes)`
                            : `Like post (${post.likesCount} likes)`
                        }
                        aria-pressed={post.likedByMe}
                        className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-transform active:scale-125 cursor-pointer ${
                          post.likedByMe
                            ? 'text-rose-500'
                            : 'text-neutral-800 dark:text-neutral-200 hover:text-rose-500'
                        }`}
                      >
                        <Heart
                          className={`w-6 h-6 ${
                            post.likedByMe ? 'fill-current text-rose-500' : ''
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => onInspectPost(post.id)}
                        aria-label="Inspect post and comments"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:text-[#0095F6] transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-6 h-6" />
                      </button>

                      <a
                        href={topicDestinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Go to website topic for ${post.headline}`}
                        title="Go to Website Topic"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-[#0095F6] transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleSave(post.id)}
                      aria-label={post.saved ? 'Remove from Saved' : 'Save Post'}
                      aria-pressed={post.saved}
                      className={`p-1 transition-colors cursor-pointer ${
                        post.saved
                          ? 'text-[#0095F6]'
                          : 'text-neutral-800 dark:text-neutral-200 hover:text-[#0095F6]'
                      }`}
                    >
                      <Bookmark
                        className={`w-6 h-6 ${post.saved ? 'fill-current' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Likes Count */}
                  <div
                    data-testid={`post-likes-${post.id}`}
                    className="text-xs font-bold font-mono tabular-nums text-neutral-900 dark:text-white"
                  >
                    {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
                    {post.likedByMe && (
                      <span className="ml-2 font-normal text-rose-500">
                        (Liked by you)
                      </span>
                    )}
                  </div>

                  {/* Existing Comments */}
                  {post.comments.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-neutral-100 dark:border-neutral-900">
                      {post.comments.map((c) => (
                        <div key={c.id} className="text-xs">
                          <span className="font-bold text-neutral-900 dark:text-white mr-1.5">
                            {c.author}
                          </span>
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {c.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Inline Comment Input */}
                  <form
                    onSubmit={(e) => handleCommentSubmit(e, post.id)}
                    className="pt-2 border-t border-neutral-100 dark:border-neutral-900 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={commentDrafts[post.id] || ''}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder="Add a note or comment..."
                      aria-label={`Add a comment on ${post.headline}`}
                      className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!(commentDrafts[post.id] || '').trim()}
                      className="text-xs font-bold text-[#0095F6] disabled:opacity-40 cursor-pointer"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Instagram Desktop Sidebar ("Following" Websites List ONLY — NO Master Profile!) */}
      <aside
        aria-label="Instagram Following Websites Sidebar"
        className="hidden xl:block w-[320px] shrink-0 sticky top-6 space-y-5"
      >
        <div
          className={`p-4 rounded-2xl border space-y-3.5 ${
            profile.highContrast
              ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
              : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              Following ({sources.filter((s) => s.active).length} of {sources.length})
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenFollowingList}
                className="text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:underline cursor-pointer"
              >
                See All
              </button>
              <button
                type="button"
                onClick={onOpenAddWebsite}
                className="text-xs font-bold text-[#0095F6] hover:underline cursor-pointer"
              >
                + Follow Site
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {sources.map((src) => {
              const statusObj = lastScrapeSummary.sourceStatuses[src.id];
              const sourcePostsCount = posts.filter(
                (p) => p.sourceId === src.id
              ).length;

              return (
                <div
                  key={src.id}
                  className="flex items-center justify-between gap-2.5 py-1"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onViewWebsiteProfile(src.id)}
                      className="shrink-0 cursor-pointer"
                    >
                      <SourceProfileAvatarSVG
                        source={src}
                        highContrast={profile.highContrast}
                        size="sm"
                      />
                    </button>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onViewWebsiteProfile(src.id)}
                        className="text-xs font-bold text-neutral-900 dark:text-white hover:underline truncate block cursor-pointer"
                      >
                        @{src.username}
                      </button>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {src.name}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        {statusObj?.status === 'live' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ● {sourcePostsCount} editions · {src.lastCheckedAt}
                          </span>
                        ) : (
                          <span>
                            {sourcePostsCount} editions · {src.lastCheckedAt}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Authentic Instagram "Following" / "Follow" Button + Customize */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleSourceActive(src.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        src.active
                          ? 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white'
                          : 'bg-[#0095F6] hover:bg-[#1877F2] text-white'
                      }`}
                    >
                      {src.active ? (
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-500" />
                          <span>Following</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <UserPlus className="w-3 h-3" />
                          <span>Follow</span>
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditSourceProfile(src.id)}
                      title={`Customize @${src.username} profile`}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* FLOATING ACTION BUTTON (FAB): 'Quick Scan' at Bottom Right of HomeFeedView */}
      <button
        type="button"
        data-testid="quick-scan-fab"
        onClick={handleQuickScanTrigger}
        disabled={isPollingNow}
        aria-label={
          activeFilteredSource
            ? `Quick Scan @${activeFilteredSource.username} Now`
            : 'Quick Scan Current Sources Now'
        }
        title={
          activeFilteredSource
            ? `Quick Scan @${activeFilteredSource.username} without opening settings`
            : 'Quick Scan all active websites without opening settings'
        }
        className={`fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 px-4 py-3 rounded-full text-xs sm:text-sm font-bold shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer ${
          profile.highContrast
            ? 'bg-black text-amber-300 border-2 border-amber-300 dark:bg-white dark:text-black dark:border-black'
            : 'bg-[#0095F6] hover:bg-[#1877F2] text-white shadow-[#0095F6]/30'
        }`}
      >
        <RefreshCw className={`w-4 h-4 ${isPollingNow ? 'animate-spin' : ''}`} />
        <Zap className="w-3.5 h-3.5 fill-current" />
        <span>
          {isPollingNow
            ? 'Scanning...'
            : activeFilteredSource
            ? `Quick Scan @${activeFilteredSource.username}`
            : 'Quick Scan'}
        </span>
      </button>
    </div>
  );
};
