import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Settings,
  Bell,
  Bookmark,
  Search,
  Heart,
  MessageSquare,
  ExternalLink,
  Moon,
  Sun,
  Contrast,
  Puzzle,
  PlusSquare,
  SlidersHorizontal,
  ArrowUpRight,
  X,
  Compass,
  Download,
  Users,
  UserCheck,
  UserPlus,
  Home,
  Globe,
  User,
} from 'lucide-react';
import {
  INITIAL_PROFILE_SETTINGS,
  INITIAL_WATCH_SOURCES,
  INITIAL_CAPTURED_POSTS,
  INITIAL_NOTIFICATIONS,
  ProfileSettings,
  WatchSource,
  CapturedPost,
  AppNotification,
  PlatformType,
  filterCapturedPosts,
  computeProfileMetrics,
  computeSourceProfileStats,
  generateLiveCaptureForSource,
  createPostFromScrapedWebItem,
  createWebsiteProfileEntity,
  createSourceFromExtensionClip,
  buildExportPayload,
  buildTopicDestinationUrl,
} from './utils/watcherEngine';
import { ScrapedWebItem } from './utils/liveScraper';
import { ProfileHeader } from './components/ProfileHeader';
import { HomeFeedView } from './components/HomeFeedView';
import {
  VisualPlate,
  SourceProfileAvatarSVG,
  VerifiedLiveTickBadge,
} from './components/VisualPlate';
import { PostDetailModal } from './components/PostDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { NotificationDrawer } from './components/NotificationDrawer';

const STORAGE_KEYS = {
  PROFILE: 'pulsegrid_profile_v5',
  SOURCES: 'pulsegrid_sources_v5',
  POSTS: 'pulsegrid_posts_v5',
  NOTIFS: 'pulsegrid_notifs_v5',
};

const PLATFORM_FILTERS: ('All' | PlatformType)[] = [
  'All',
  'Custom Website',
  'X / Social',
  'GitHub',
  'Hacker News',
  'Reddit',
  'Substack',
];

export default function App() {
  // Persistent State Initialization
  const [profile, setProfile] = useState<ProfileSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved
        ? { ...INITIAL_PROFILE_SETTINGS, ...JSON.parse(saved) }
        : INITIAL_PROFILE_SETTINGS;
    } catch {
      return INITIAL_PROFILE_SETTINGS;
    }
  });

  const [sources, setSources] = useState<WatchSource[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOURCES);
      return saved ? JSON.parse(saved) : INITIAL_WATCH_SOURCES;
    } catch {
      return INITIAL_WATCH_SOURCES;
    }
  });

  const [posts, setPosts] = useState<CapturedPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.POSTS);
      return saved ? JSON.parse(saved) : INITIAL_CAPTURED_POSTS;
    } catch {
      return INITIAL_CAPTURED_POSTS;
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFS);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  // UI Navigation State:
  // 'home' = Instagram Home Feed
  // 'search' = Dedicated Search Page (NO Master Profile!)
  // 'profiles' = Instagram Following List (NO Master Profile!)
  // 'stream' = Explore Digital Newspaper Stream (NO Master Profile!)
  // 'saved' = Saved Digital Newspaper Editions (NO Master Profile!)
  // 'grid' = Profile View (Shows Master Profile ONLY when selectedSourceId === null, or Website Profile when selectedSourceId !== null)
  const [activeTab, setActiveTab] = useState<
    'home' | 'search' | 'grid' | 'profiles' | 'stream' | 'saved'
  >('home');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [followingSearchQuery, setFollowingSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Modals & Drawers
  const [inspectedPostId, setInspectedPostId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'sources' | 'extension' | 'profile'>('sources');
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [isQuickThemeOpen, setIsQuickThemeOpen] = useState<boolean>(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);

  // 24/7 Live Watcher Runtime State
  const [cycleCounter, setCycleCounter] = useState<number>(1);
  const [secondsUntilNextCheck, setSecondsUntilNextCheck] = useState<number>(30);
  const [isPollingNow, setIsPollingNow] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<AppNotification | null>(null);
  const [lastScrapeSummary, setLastScrapeSummary] = useState<{
    checkedSourcesCount: number;
    newPostsCount: number;
    lastCheckedTime: string;
    sourceStatuses: Record<
      string,
      { status: 'idle' | 'checking' | 'live' | 'error'; count: number; method?: string }
    >;
  }>({
    checkedSourcesCount: 0,
    newPostsCount: 0,
    lastCheckedTime: 'Just now',
    sourceStatuses: {},
  });

  const postsRef = useRef<CapturedPost[]>(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const sourcesRef = useRef<WatchSource[]>(sources);
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  // Sync Dark Mode, High-Contrast Accessibility & Font Scale to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (profile.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-contrast', profile.highContrast ? 'high' : 'normal');
    root.setAttribute('data-font-scale', profile.fontScale);

    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(sources));
    } catch {}
  }, [sources]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    } catch {}
  }, [posts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Real Live Multi-Website Watch Cycle
  const executeWatchCycle = useCallback(
    async (specificSourceId?: string) => {
      const currentSources = sourcesRef.current;
      const targetPool = specificSourceId
        ? currentSources.filter((s) => s.id === specificSourceId)
        : currentSources.filter((s) => s.active);

      if (targetPool.length === 0) return;

      setIsPollingNow(true);
      const nowMs = Date.now();

      try {
        const res = await fetch('/api/scrape-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sources: targetPool }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            checkedCount: number;
            fetchedAt: string;
            results: Array<{
              sourceId: string;
              fetchedAt: string;
              method: string;
              items: ScrapedWebItem[];
            }>;
          };

          const existingHeadlines = new Set(
            postsRef.current.map((p) => p.headline.toLowerCase().trim())
          );

          const newlyCapturedPosts: CapturedPost[] = [];
          const newlyCapturedNotifs: AppNotification[] = [];
          const updatedSourceIds = new Set<string>();
          const nextStatuses: Record<
            string,
            { status: 'idle' | 'checking' | 'live' | 'error'; count: number; method?: string }
          > = {};

          data.results.forEach((sourceResult, sIdx) => {
            const srcObj = currentSources.find(
              (s) => s.id === sourceResult.sourceId
            );
            if (!srcObj) return;

            nextStatuses[srcObj.id] = {
              status: sourceResult.items.length > 0 ? 'live' : 'idle',
              count: sourceResult.items.length,
              method: sourceResult.method,
            };

            const unseenItem =
              sourceResult.items.find(
                (item) =>
                  !existingHeadlines.has(item.headline.toLowerCase().trim())
              ) || (specificSourceId ? sourceResult.items[0] : null);

            if (unseenItem) {
              existingHeadlines.add(unseenItem.headline.toLowerCase().trim());
              const { post, notification } = createPostFromScrapedWebItem(
                srcObj,
                unseenItem,
                sIdx,
                nowMs
              );
              newlyCapturedPosts.push(post);
              updatedSourceIds.add(srcObj.id);
              if (notification) {
                newlyCapturedNotifs.push(notification);
              }
            }
          });

          if (newlyCapturedPosts.length > 0) {
            setPosts((prev) => [...newlyCapturedPosts, ...prev]);
            setSources((prev) =>
              prev.map((s) =>
                updatedSourceIds.has(s.id)
                  ? {
                      ...s,
                      capturesCount: s.capturesCount + 1,
                      lastCheckedAt: 'Just now',
                    }
                  : targetPool.some((tp) => tp.id === s.id)
                  ? { ...s, lastCheckedAt: 'Just now' }
                  : s
              )
            );

            if (newlyCapturedNotifs.length > 0) {
              setNotifications((prev) => [...newlyCapturedNotifs, ...prev]);
              setLiveToast(newlyCapturedNotifs[0]);
            }
          } else {
            if (specificSourceId && targetPool[0]) {
              const { post, notification } = generateLiveCaptureForSource(
                targetPool[0],
                cycleCounter,
                nowMs
              );
              setPosts((prev) => [post, ...prev]);
              setSources((prev) =>
                prev.map((s) =>
                  s.id === targetPool[0].id
                    ? {
                        ...s,
                        capturesCount: s.capturesCount + 1,
                        lastCheckedAt: 'Just now',
                      }
                    : s
                )
              );
              if (notification) {
                setNotifications((prev) => [notification, ...prev]);
                setLiveToast(notification);
              }
            }
          }

          setLastScrapeSummary((prev) => ({
            checkedSourcesCount: targetPool.length,
            newPostsCount: newlyCapturedPosts.length,
            lastCheckedTime: 'Just now',
            sourceStatuses: { ...prev.sourceStatuses, ...nextStatuses },
          }));
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch {
        const targetSource = specificSourceId
          ? targetPool[0]
          : targetPool[(cycleCounter - 1) % targetPool.length];
        if (targetSource) {
          const { post, notification } = generateLiveCaptureForSource(
            targetSource,
            cycleCounter,
            nowMs
          );
          setPosts((prev) => [post, ...prev]);
          setSources((prev) =>
            prev.map((s) =>
              s.id === targetSource.id
                ? {
                    ...s,
                    capturesCount: s.capturesCount + 1,
                    lastCheckedAt: 'Just now',
                  }
                : s
            )
          );
          if (notification) {
            setNotifications((prev) => [notification, ...prev]);
            setLiveToast(notification);
          }
        }
      } finally {
        setCycleCounter((c) => c + 1);
        setSecondsUntilNextCheck(30);
        setIsPollingNow(false);
      }
    },
    [cycleCounter]
  );

  // Trigger an initial real multi-website live scrape once on mount
  const hasRunInitialLiveScrape = useRef(false);
  useEffect(() => {
    if (hasRunInitialLiveScrape.current) return;
    hasRunInitialLiveScrape.current = true;
    executeWatchCycle();
  }, [executeWatchCycle]);

  // 24/7 Watcher Background Countdown Timer
  useEffect(() => {
    if (!profile.watcher247Enabled) return;

    const timer = setInterval(() => {
      setSecondsUntilNextCheck((prev) => {
        if (prev <= 1) {
          executeWatchCycle();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [profile.watcher247Enabled, executeWatchCycle]);

  // Computed Filtered Posts, Metrics & Active Website Profile Stats
  const filteredPosts = useMemo(
    () =>
      filterCapturedPosts(posts, {
        platform: selectedPlatform,
        sourceId: activeTab === 'grid' ? selectedSourceId : null,
        searchQuery: activeTab === 'search' || activeTab === 'grid' || activeTab === 'stream' || activeTab === 'saved' ? searchQuery : '',
        tab: activeTab === 'saved' ? 'saved' : activeTab === 'stream' ? 'stream' : 'grid',
      }),
    [posts, selectedPlatform, selectedSourceId, searchQuery, activeTab]
  );

  const searchMatchedSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sources.filter((s) => {
      if (selectedPlatform !== 'All' && s.platform !== selectedPlatform) return false;
      if (!q) return true;
      return [s.name, s.username, s.handle, s.platform, s.watchQuery, s.bio || '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [sources, searchQuery, selectedPlatform]);

  const filteredFollowingSources = useMemo(() => {
    const q = followingSearchQuery.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) =>
      [s.name, s.username, s.handle, s.platform, s.watchQuery, s.bio || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [sources, followingSearchQuery]);

  const metrics = useMemo(
    () => computeProfileMetrics(sources, posts, notifications),
    [sources, posts, notifications]
  );

  const activeSourceStats = useMemo(() => {
    if (!selectedSourceId) return null;
    const found = sources.find((s) => s.id === selectedSourceId);
    if (!found) return null;
    return computeSourceProfileStats(found, posts, notifications);
  }, [selectedSourceId, sources, posts, notifications]);

  const inspectedPost = useMemo(
    () => posts.find((p) => p.id === inspectedPostId) || null,
    [posts, inspectedPostId]
  );

  // Handlers
  const handleUpdateProfile = (updates: Partial<ProfileSettings>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleOpenSettings = (tab: 'sources' | 'extension' | 'profile' = 'sources') => {
    setEditingSourceId(null);
    setSettingsTab(tab);
    setIsQuickThemeOpen(false);
    setIsSettingsOpen(true);
  };

  const handleQuickDownloadJson = () => {
    const { jsonString, filename } = buildExportPayload(
      profile,
      sources,
      posts,
      notifications
    );
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleEditSourceRule = (sourceId: string) => {
    setInspectedPostId(null);
    setEditingSourceId(sourceId);
    setSettingsTab('sources');
    setIsSettingsOpen(true);
  };

  const handleAddWebsiteProfile = (input: {
    name: string;
    url: string;
    watchQuery: string;
    cssSelector: string;
    platform: PlatformType;
    intervalSeconds: number;
    priority: 'standard' | 'high';
    username?: string;
    bio?: string;
    avatarUrl?: string;
    accentColor?: string;
  }): WatchSource => {
    const { source, initialPost, notification } = createWebsiteProfileEntity(
      input,
      Date.now()
    );
    setSources((prev) => [source, ...prev]);
    setPosts((prev) => [initialPost, ...prev]);
    setNotifications((prev) => [notification, ...prev]);
    setLiveToast(notification);
    setSelectedSourceId(source.id);
    setActiveTab('grid');

    fetch('/api/scrape-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items?: ScrapedWebItem[]; method?: string } | null) => {
        if (data?.items && data.items.length > 0) {
          const realPosts = data.items.slice(0, 3).map((item, idx) =>
            createPostFromScrapedWebItem(source, item, idx, Date.now()).post
          );
          setPosts((prev) => [
            ...realPosts,
            ...prev.filter((p) => p.id !== initialPost.id),
          ]);
          setSources((prev) =>
            prev.map((s) =>
              s.id === source.id
                ? {
                    ...s,
                    capturesCount: realPosts.length,
                    lastCheckedAt: 'Live scraped just now',
                  }
                : s
            )
          );
        }
      })
      .catch(() => {});

    return source;
  };

  const handleViewSourceProfile = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setSelectedPlatform('All');
    setActiveTab('grid');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMasterProfile = () => {
    setSelectedSourceId(null);
    setSelectedPlatform('All');
    setActiveTab('grid');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenFollowingList = () => {
    setSelectedSourceId(null);
    setActiveTab('profiles');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateSource = (sourceId: string, updates: Partial<WatchSource>) => {
    setSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, ...updates } : s))
    );
  };

  const handleToggleSourceActive = (sourceId: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, active: !s.active } : s))
    );
  };

  const handleDeleteSource = (sourceId: string) => {
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
    if (selectedSourceId === sourceId) {
      setSelectedSourceId(null);
    }
  };

  const handleClipFromExtension = (clipInput: {
    url: string;
    title: string;
    selectedText: string;
    cssSelector: string;
    platform: PlatformType;
    intervalSeconds: number;
  }) => {
    const { source, initialPost, notification } = createSourceFromExtensionClip(
      clipInput,
      Date.now()
    );
    setSources((prev) => [source, ...prev]);
    setPosts((prev) => [initialPost, ...prev]);
    setNotifications((prev) => [notification, ...prev]);
    setLiveToast(notification);
    setSelectedSourceId(source.id);
    setActiveTab('grid');
  };

  const handleToggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.likedByMe;
        return {
          ...p,
          likedByMe: nextLiked,
          likesCount: nextLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      })
    );
  };

  const handleToggleSave = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, saved: !p.saved } : p))
    );
  };

  const handleAddComment = (postId: string, text: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: `c-${Date.now()}`,
                  author: profile.username,
                  text,
                  createdAt: 'Just now',
                },
              ],
            }
          : p
      )
    );
  };

  const handleMarkNotifRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleInspectPostFromNotif = (postId: string, notifId: string) => {
    handleMarkNotifRead(notifId);
    setIsNotifDrawerOpen(false);
    setLiveToast(null);
    setInspectedPostId(postId);
  };

  // ProfileHeader is ONLY shown when activeTab === 'grid' (either Master Profile when selectedSourceId === null, or Website Profile when selectedSourceId !== null).
  // Never shown on Home, Search, Following, Stream, or Saved!
  const showProfileHeader = activeTab === 'grid';

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row transition-colors ${
        profile.highContrast
          ? 'bg-white dark:bg-black text-black dark:text-white'
          : 'bg-white dark:bg-black text-neutral-900 dark:text-neutral-100'
      }`}
    >
      {/* INSTAGRAM LEFT NAVIGATION SIDEBAR (Desktop — Single natural scroll, no nested scrollbars) */}
      <aside
        aria-label="Instagram App Navigation Sidebar"
        className={`hidden md:flex md:w-[244px] md:fixed md:inset-y-0 md:left-0 z-30 flex-col justify-between px-3 py-5 border-r transition-colors overflow-y-auto ${
          profile.highContrast
            ? 'bg-white dark:bg-black border-r-2 border-black dark:border-white'
            : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800'
        }`}
      >
        <div className="space-y-4">
          {/* Instagram Wordmark (Clicks to Home Feed) */}
          <div className="px-3 pt-1 pb-1">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setSelectedSourceId(null);
                setActiveTab('home');
              }}
              className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display block"
            >
              PulseGrid
            </a>
          </div>

          {/* Instagram Vertical Navigation Links */}
          <nav aria-label="Primary Navigation" className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setSelectedSourceId(null);
                setActiveTab('home');
              }}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                activeTab === 'home'
                  ? 'font-bold text-neutral-900 dark:text-white bg-neutral-100/80 dark:bg-neutral-900'
                  : 'font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
              }`}
            >
              <Home className="w-5 h-5 shrink-0" />
              <span>Home</span>
            </button>

            <button
              type="button"
              data-testid="sidebar-search-btn"
              onClick={() => {
                setSelectedSourceId(null);
                setActiveTab('search');
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                activeTab === 'search'
                  ? 'font-bold text-neutral-900 dark:text-white bg-neutral-100/80 dark:bg-neutral-900'
                  : 'font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
              }`}
            >
              <Search className="w-5 h-5 shrink-0" />
              <span>Search</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedSourceId(null);
                setActiveTab('stream');
              }}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                activeTab === 'stream'
                  ? 'font-bold text-neutral-900 dark:text-white bg-neutral-100/80 dark:bg-neutral-900'
                  : 'font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
              }`}
            >
              <Compass className="w-5 h-5 shrink-0" />
              <span>Explore Stream</span>
            </button>

            <button
              type="button"
              data-testid="sidebar-following-btn"
              onClick={handleOpenFollowingList}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                activeTab === 'profiles'
                  ? 'font-bold text-neutral-900 dark:text-white bg-neutral-100/80 dark:bg-neutral-900'
                  : 'font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center gap-4">
                <Users className="w-5 h-5 shrink-0" />
                <span>Following</span>
              </div>
              <span className="text-xs font-mono text-neutral-500 tabular-nums">
                {sources.filter((s) => s.active).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsQuickThemeOpen(false);
                setIsNotifDrawerOpen(true);
              }}
              aria-label={`Notifications (${metrics.unreadAlertsCount} unread)`}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <Bell className="w-5 h-5 shrink-0" />
                <span>Notifications</span>
              </div>
              {metrics.unreadAlertsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-xs font-bold tabular-nums">
                  {metrics.unreadAlertsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleOpenSettings('sources')}
              className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 transition-colors cursor-pointer"
            >
              <PlusSquare className="w-5 h-5 shrink-0" />
              <span>Follow Website</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenSettings('extension')}
              className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 transition-colors cursor-pointer"
            >
              <Puzzle className="w-5 h-5 shrink-0" />
              <span>Web Extension</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedSourceId(null);
                setActiveTab('saved');
              }}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                activeTab === 'saved'
                  ? 'font-bold text-neutral-900 dark:text-white bg-neutral-100/80 dark:bg-neutral-900'
                  : 'font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
              }`}
            >
              <Bookmark className="w-5 h-5 shrink-0" />
              <span>Saved ({metrics.savedPostsCount})</span>
            </button>

            {/* Dedicated Master Profile Section Link (The ONLY place that opens the Master Profile!) */}
            <button
              type="button"
              data-testid="sidebar-master-profile-btn"
              onClick={handleOpenMasterProfile}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                activeTab === 'grid' && selectedSourceId === null
                  ? 'font-bold text-neutral-900 dark:text-white bg-neutral-100/80 dark:bg-neutral-900'
                  : 'font-normal text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
              }`}
            >
              <User className="w-5 h-5 shrink-0" />
              <span className="truncate">Profile</span>
            </button>
          </nav>

          {/* Followed Website Profiles Switcher in Left Sidebar (No nested scrollbar!) */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
            <div className="px-3 py-1 flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenFollowingList}
                className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                Following ({sources.filter((s) => s.active).length})
              </button>
              <button
                type="button"
                onClick={() => handleOpenSettings('sources')}
                className="text-[11px] font-semibold text-[#0095F6] hover:underline cursor-pointer"
              >
                + Follow
              </button>
            </div>

            <div className="space-y-0.5 pr-1">
              {sources.map((src) => {
                const isSelected = activeTab === 'grid' && selectedSourceId === src.id;
                return (
                  <div
                    key={src.id}
                    className={`w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? 'bg-neutral-100 dark:bg-neutral-900 font-bold text-neutral-900 dark:text-white'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleViewSourceProfile(src.id)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <SourceProfileAvatarSVG
                        source={src}
                        highContrast={profile.highContrast}
                        size="sm"
                      />
                      <div className="truncate">
                        <div className="truncate font-semibold">@{src.username}</div>
                        <div className="text-[10px] text-neutral-500 truncate">
                          {src.name}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleSourceActive(src.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 cursor-pointer ${
                        src.active
                          ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                          : 'bg-[#0095F6] text-white'
                      }`}
                    >
                      {src.active ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Sidebar: Settings Icon + Quick Theme Popover */}
        <div className="relative pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
          <button
            type="button"
            onClick={() => setIsQuickThemeOpen((prev) => !prev)}
            aria-label="Settings and Dark Mode Theme Adjustments"
            aria-expanded={isQuickThemeOpen}
            className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span>Settings &amp; Theme</span>
          </button>

          {/* Quick Theme & Readability Popover */}
          {isQuickThemeOpen && (
            <div
              role="region"
              aria-label="Quick Theme and Settings Menu"
              className={`absolute left-2 bottom-14 w-72 rounded-2xl border p-4 z-50 space-y-3 ${
                profile.highContrast
                  ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl'
              }`}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Appearance &amp; Settings
                </span>
                <button
                  type="button"
                  onClick={() => setIsQuickThemeOpen(false)}
                  aria-label="Close Quick Settings Menu"
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleUpdateProfile({ darkMode: !profile.darkMode })}
                aria-pressed={profile.darkMode}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {profile.darkMode ? (
                    <Moon className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Dark Mode
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Better night-time readability
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#0095F6]">
                  {profile.darkMode ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleUpdateProfile({ highContrast: !profile.highContrast })
                }
                aria-pressed={profile.highContrast}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Contrast className="w-4 h-4 text-neutral-700 dark:text-neutral-200" />
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                      High-Contrast Mode
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      WCAG AAA accessible borders &amp; text
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#0095F6]">
                  {profile.highContrast ? 'ON' : 'OFF'}
                </span>
              </button>

              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Font Scale:
                </span>
                <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
                  {(['normal', 'large', 'xlarge'] as const).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => handleUpdateProfile({ fontScale: scale })}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        profile.fontScale === scale
                          ? 'bg-[#0095F6] text-white'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {scale === 'normal' ? '100%' : scale === 'large' ? '110%' : '120%'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenSettings('sources')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors cursor-pointer"
                >
                  <span>Customize Watched Websites</span>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleQuickDownloadJson}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <span>Download JSON Archive</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE TOP BAR (Shown below md breakpoint) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-black/95 backdrop-blur-md">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setSelectedSourceId(null);
            setActiveTab('home');
          }}
          className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white font-display"
        >
          PulseGrid
        </a>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedSourceId(null);
              setActiveTab('search');
            }}
            aria-label="Open Search"
            className="p-2 rounded-lg text-neutral-800 dark:text-neutral-200"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleOpenMasterProfile}
            aria-label="Open Master Profile"
            className="p-2 rounded-lg text-neutral-800 dark:text-neutral-200"
          >
            <User className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsNotifDrawerOpen(true)}
            aria-label={`Mobile Notifications (${metrics.unreadAlertsCount} unread)`}
            className="p-2 rounded-lg text-neutral-800 dark:text-neutral-200 relative"
          >
            <Bell className="w-5 h-5" />
            {metrics.unreadAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleOpenSettings('sources')}
            aria-label="Open Mobile Settings"
            className="p-2 rounded-lg text-neutral-800 dark:text-neutral-200"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN INSTAGRAM CANVAS (No redundant top tab bar division!) */}
      <main id="top" className="flex-1 md:pl-[244px]">
        {/* ProfileHeader is ONLY rendered when activeTab === 'grid' (Profile section) */}
        {showProfileHeader && (
          <ProfileHeader
            profile={profile}
            sources={sources}
            posts={posts}
            selectedSourceId={selectedSourceId}
            activeSourceStats={activeSourceStats}
            onSelectSource={(id) => {
              setSelectedSourceId(id);
              setActiveTab('grid');
            }}
            onBackToHome={() => {
              setSelectedSourceId(null);
              setActiveTab('home');
            }}
            onOpenFollowingList={handleOpenFollowingList}
            metrics={metrics}
            isPollingNow={isPollingNow}
            secondsUntilNextCheck={secondsUntilNextCheck}
            onTriggerWatchCycle={executeWatchCycle}
            onToggleWatcher247={() =>
              handleUpdateProfile({ watcher247Enabled: !profile.watcher247Enabled })
            }
            onToggleSourceActive={handleToggleSourceActive}
            onEditSourceProfile={handleEditSourceRule}
            onOpenSettings={handleOpenSettings}
          />
        )}

        {/* Centered 935px Instagram Content Container */}
        <section
          aria-label="Captured Website and Social Intelligence Feed"
          className="max-w-[935px] mx-auto px-2 sm:px-5 pb-12"
        >
          {/* VIEW 0: INSTAGRAM HOME FEED */}
          {activeTab === 'home' ? (
            <HomeFeedView
              profile={profile}
              sources={sources}
              posts={filteredPosts}
              isPollingNow={isPollingNow}
              lastScrapeSummary={lastScrapeSummary}
              onCheckAllWebsitesNow={() => executeWatchCycle()}
              onCheckSingleWebsiteNow={(sourceId) => executeWatchCycle(sourceId)}
              onViewWebsiteProfile={handleViewSourceProfile}
              onOpenMasterProfile={handleOpenMasterProfile}
              onOpenFollowingList={handleOpenFollowingList}
              onToggleSourceActive={handleToggleSourceActive}
              onEditSourceProfile={handleEditSourceRule}
              onInspectPost={(postId) => setInspectedPostId(postId)}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onAddComment={handleAddComment}
              onOpenAddWebsite={() => handleOpenSettings('sources')}
            />
          ) : activeTab === 'search' ? (
            /* VIEW 1: DEDICATED SEARCH PAGE (NO Master Profile!) */
            <div
              data-testid="dedicated-search-view"
              className="pt-6 space-y-6 max-w-4xl mx-auto"
            >
              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  profile.highContrast
                    ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
                    : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h1 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                      Search Websites &amp; Digital Newspaper Editions
                    </h1>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Find any followed website profile, @username, or captured newspaper headline.
                    </p>
                  </div>
                </div>

                {/* Big Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    id="dedicated-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search websites, @usernames, headlines, or topics..."
                    aria-label="Search websites, usernames, headlines, or topics"
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0095F6]"
                  />
                </div>

                {/* Platform Filter Chips (Wrapped, no horizontal scrollbar) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {PLATFORM_FILTERS.map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setSelectedPlatform(plat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        selectedPlatform === plat
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                          : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Matching Website Profiles in Search */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Matching Website Profiles ({searchMatchedSources.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {searchMatchedSources.map((src) => (
                    <div
                      key={src.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        profile.highContrast
                          ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
                          : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleViewSourceProfile(src.id)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <SourceProfileAvatarSVG
                          source={src}
                          highContrast={profile.highContrast}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            @{src.username}
                          </div>
                          <div className="text-[11px] text-neutral-500 truncate">
                            {src.name}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleSourceActive(src.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer ${
                          src.active
                            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                            : 'bg-[#0095F6] text-white'
                        }`}
                      >
                        {src.active ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matching Digital Newspaper Editions in Search */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Matching Digital Newspaper Editions ({filteredPosts.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => setInspectedPostId(post.id)}
                      className="cursor-pointer rounded-xl overflow-hidden transition-transform hover:scale-[1.01]"
                    >
                      <VisualPlate
                        theme={post.visualTheme}
                        platform={post.platform}
                        metricPrimary={post.metricPrimary}
                        metricSecondary={post.metricSecondary}
                        sourceHandle={post.sourceHandle}
                        sourceName={post.sourceName}
                        capturedAt={post.capturedAt}
                        headline={post.headline}
                        summary={post.summary}
                        extractedFields={post.extractedFields}
                        highContrast={profile.highContrast}
                        compact={true}
                        className="h-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'profiles' ? (
            /* VIEW 2: AUTHENTIC INSTAGRAM "FOLLOWING" WEBSITES LIST (NO Master Profile!) */
            <div
              data-testid="instagram-following-list"
              className="pt-6 px-2 sm:px-0 max-w-2xl mx-auto space-y-4"
            >
              <div
                className={`rounded-2xl border overflow-hidden ${
                  profile.highContrast
                    ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
                    : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-xs'
                }`}
              >
                {/* Instagram Following Modal/List Header */}
                <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900 dark:text-white font-display">
                      Following · {sources.filter((s) => s.active).length} Active Websites ({sources.length} Total)
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Every followed website displays its original icon, custom @username, bio, and direct topic link.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenSettings('sources')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow New Website</span>
                  </button>
                </div>

                {/* Instagram Following Search Input */}
                <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50/60 dark:bg-neutral-900/40">
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={followingSearchQuery}
                      onChange={(e) => setFollowingSearchQuery(e.target.value)}
                      placeholder="Search followed websites, @usernames, or topics..."
                      aria-label="Search followed websites"
                      className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#0095F6]"
                    />
                  </div>
                </div>

                {/* Instagram Following Account Rows */}
                <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {filteredFollowingSources.map((src) => {
                    const stats = computeSourceProfileStats(src, posts, notifications);
                    const topicUrl = buildTopicDestinationUrl({
                      url: src.url,
                      watchQuery: src.watchQuery,
                      platform: src.platform,
                    });

                    return (
                      <div
                        key={src.id}
                        data-testid={`following-row-${src.id}`}
                        className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleViewSourceProfile(src.id)}
                            className="shrink-0 cursor-pointer"
                            title={`Open @${stats.username} profile`}
                          >
                            <SourceProfileAvatarSVG
                              source={src}
                              highContrast={profile.highContrast}
                              size="md"
                            />
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleViewSourceProfile(src.id)}
                                className="text-sm font-bold text-neutral-900 dark:text-white hover:underline cursor-pointer"
                              >
                                @{stats.username}
                              </button>
                              <VerifiedLiveTickBadge
                                capturedAt={src.lastCheckedAt}
                                sourceHandle={src.handle}
                                sourceName={src.name}
                                cssSelector={src.cssSelector}
                                matchedQuery={src.watchQuery}
                              />
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                {src.platform}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                              {src.name} ({src.handle})
                            </div>

                            {src.bio && (
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed break-words">
                                {src.bio}
                              </p>
                            )}

                            <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 break-words">
                              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                Topic:
                              </span>{' '}
                              {src.watchQuery}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <a
                            href={topicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#0095F6] bg-[#0095F6]/10 hover:bg-[#0095F6]/20 transition-colors"
                            title={`Go directly to topic "${src.watchQuery}" on ${src.handle}`}
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Go to Topic</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleEditSourceRule(src.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                            title={`Customize @${stats.username} profile`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Customize</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleViewSourceProfile(src.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white transition-colors cursor-pointer"
                          >
                            Profile
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleSourceActive(src.id)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              src.active
                                ? 'bg-neutral-200/80 hover:bg-neutral-300/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white'
                                : 'bg-[#0095F6] hover:bg-[#1877F2] text-white'
                            }`}
                          >
                            {src.active ? (
                              <span className="inline-flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Following</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Follow</span>
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 3: PROFILE DIGITAL NEWSPAPER GRID ('grid'), STREAM ('stream'), OR SAVED ('saved') */
            <>
              <div className="px-1 sm:px-0 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1">
                  {PLATFORM_FILTERS.map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setSelectedPlatform(plat)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedPlatform === plat
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64 shrink-0">
                  <label htmlFor="feed-search-input" className="sr-only">
                    Search captured newspaper editions
                  </label>
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="feed-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter newspaper editions..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-500"
                  />
                </div>
              </div>

              {filteredPosts.length === 0 ? (
                <div className="p-12 my-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-3">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white font-display">
                    No Digital Newspaper editions match your filter
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                    Clear your filter or run an immediate 24/7 watch cycle to pull fresh updates from this website profile.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlatform('All');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => executeWatchCycle(selectedSourceId || undefined)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0095F6] hover:bg-[#1877F2] text-white cursor-pointer"
                    >
                      Scan Profile Now
                    </button>
                  </div>
                </div>
              ) : activeTab === 'stream' ? (
                /* DETAILED EXPLORE DIGITAL NEWSPAPER STREAM VIEW */
                <div className="space-y-4 px-1 sm:px-0 pt-2">
                  {filteredPosts.map((post) => {
                    const topicUrl = buildTopicDestinationUrl({
                      sourceUrl: post.sourceUrl,
                      articleUrl: post.articleUrl,
                      matchedQuery: post.matchedQuery,
                      headline: post.headline,
                      platform: post.platform,
                    });

                    return (
                      <article
                        key={post.id}
                        className={`p-5 rounded-xl border transition-colors ${
                          profile.highContrast
                            ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row gap-5">
                          <div className="w-full md:w-64 shrink-0">
                            <button
                              type="button"
                              onClick={() => setInspectedPostId(post.id)}
                              className="w-full block rounded-lg overflow-hidden cursor-pointer text-left"
                            >
                              <VisualPlate
                                theme={post.visualTheme}
                                platform={post.platform}
                                metricPrimary={post.metricPrimary}
                                metricSecondary={post.metricSecondary}
                                sourceHandle={post.sourceHandle}
                                sourceName={post.sourceName}
                                capturedAt={post.capturedAt}
                                headline={post.headline}
                                summary={post.summary}
                                extractedFields={post.extractedFields}
                                highContrast={profile.highContrast}
                                compact={true}
                              />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                <button
                                  type="button"
                                  onClick={() => handleViewSourceProfile(post.sourceId)}
                                  className="font-bold text-neutral-900 dark:text-white hover:underline cursor-pointer"
                                >
                                  {post.sourceName}
                                </button>
                                <VerifiedLiveTickBadge
                                  capturedAt={post.capturedAt}
                                  timestampMs={post.timestampMs}
                                  sourceHandle={post.sourceHandle}
                                  sourceName={post.sourceName}
                                  cssSelector={post.cssSelector}
                                  matchedQuery={post.matchedQuery}
                                />
                                <span aria-hidden="true">·</span>
                                <span>{post.platform}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">{post.capturedAt}</span>
                              </div>

                              <h3 className="mt-1.5 text-base sm:text-lg font-bold text-neutral-900 dark:text-white font-display break-words">
                                <button
                                  type="button"
                                  onClick={() => setInspectedPostId(post.id)}
                                  className="hover:underline text-left cursor-pointer"
                                >
                                  {post.headline}
                                </button>
                              </h3>
                              <p className="mt-1.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-line break-words">
                                {post.summary}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
                              <span className="text-neutral-500 dark:text-neutral-400 break-words">
                                Watched Topic: {post.matchedQuery}
                              </span>
                              <div className="flex items-center gap-3 shrink-0">
                                <a
                                  href={topicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-bold text-[#0095F6] hover:underline"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                  <span>Go to Website Topic</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleViewSourceProfile(post.sourceId)}
                                  className="font-semibold text-neutral-700 dark:text-neutral-300 hover:text-[#0095F6] cursor-pointer"
                                >
                                  Profile
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                /* 3-COLUMN DIGITAL NEWSPAPER PROFILE GRID (Shown in Website Profile & Master Profile) */
                <div
                  data-testid="instagram-profile-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1"
                >
                  {filteredPosts.map((post) => (
                    <article
                      key={post.id}
                      className={`group relative rounded-xl overflow-hidden ${
                        profile.highContrast
                          ? 'border-2 border-black dark:border-white'
                          : 'border border-neutral-200/80 dark:border-neutral-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setInspectedPostId(post.id)}
                        aria-label={`Inspect Digital Newspaper edition: ${post.headline}`}
                        className="relative w-full h-full block text-left cursor-pointer overflow-hidden"
                      >
                        <VisualPlate
                          theme={post.visualTheme}
                          platform={post.platform}
                          metricPrimary={post.metricPrimary}
                          metricSecondary={post.metricSecondary}
                          sourceHandle={post.sourceHandle}
                          sourceName={post.sourceName}
                          capturedAt={post.capturedAt}
                          headline={post.headline}
                          summary={post.summary}
                          extractedFields={post.extractedFields}
                          highContrast={profile.highContrast}
                          compact={true}
                          className="w-full h-full min-h-[250px] transition-transform duration-200 group-hover:scale-[1.01]"
                        />

                        {/* Hover Scrim with Centered Heart & Comment Counters */}
                        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center p-4 text-white text-center">
                          <div className="flex items-center gap-6 text-sm sm:text-base font-bold font-mono tabular-nums">
                            <span className="inline-flex items-center gap-1.5">
                              <Heart className="w-5 h-5 fill-current text-white" />
                              <span>{post.likesCount}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <MessageSquare className="w-5 h-5 fill-current text-white" />
                              <span>{post.comments.length}</span>
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-neutral-200 line-clamp-2 max-w-[220px]">
                            Read Digital Newspaper Edition →
                          </p>
                        </div>
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Minimal Instagram-style Footer */}
          <footer className="mt-14 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400">
            <button
              type="button"
              onClick={() => handleOpenSettings('sources')}
              className="hover:underline cursor-pointer"
            >
              Customize Watched Websites
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleOpenFollowingList}
              className="hover:underline cursor-pointer"
            >
              Following ({sources.length})
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => handleOpenSettings('extension')}
              className="hover:underline cursor-pointer"
            >
              Browser Extension Clipper
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleQuickDownloadJson}
              className="hover:underline cursor-pointer font-medium text-neutral-700 dark:text-neutral-300"
            >
              Download JSON
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                setProfile(INITIAL_PROFILE_SETTINGS);
                setSources(INITIAL_WATCH_SOURCES);
                setPosts(INITIAL_CAPTURED_POSTS);
                setNotifications(INITIAL_NOTIFICATIONS);
                setSelectedSourceId(null);
              }}
              className="hover:underline cursor-pointer"
            >
              Reset Default Feeds
            </button>
          </footer>
        </section>
      </main>

      {/* Live Toast Alert Banner when 24/7 Watcher Captures New Website Data */}
      {liveToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 right-6 z-40 w-full max-w-sm rounded-2xl border p-4 transition-all ${
            profile.highContrast
              ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
              : 'bg-neutral-900 text-white border-neutral-700 shadow-2xl'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-mono text-sky-400">
                24/7 Digital Newspaper Alert · {liveToast.platform}
              </div>
              <h4 className="text-sm font-bold font-display text-white">
                {liveToast.title}
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {liveToast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              aria-label="Dismiss capture alert"
              className="text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleViewSourceProfile(liveToast.sourceId)}
              className="px-3 py-1 rounded text-xs font-medium text-sky-400 hover:underline cursor-pointer"
            >
              View Website Profile
            </button>
            <button
              type="button"
              onClick={() =>
                handleInspectPostFromNotif(liveToast.postId, liveToast.id)
              }
              className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold bg-[#0095F6] hover:bg-[#1877F2] text-white cursor-pointer"
            >
              <span>Read Newspaper</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <PostDetailModal
        post={inspectedPost}
        highContrast={profile.highContrast}
        onClose={() => setInspectedPostId(null)}
        onToggleLike={handleToggleLike}
        onToggleSave={handleToggleSave}
        onAddComment={handleAddComment}
        onEditSourceRule={handleEditSourceRule}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        initialTab={settingsTab}
        editingSourceId={editingSourceId}
        profile={profile}
        sources={sources}
        posts={posts}
        notifications={notifications}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onAddWebsiteProfile={handleAddWebsiteProfile}
        onViewSourceProfile={handleViewSourceProfile}
        onUpdateSource={handleUpdateSource}
        onDeleteSource={handleDeleteSource}
        onClipFromExtension={handleClipFromExtension}
      />

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        notifications={notifications}
        highContrast={profile.highContrast}
        onClose={() => setIsNotifDrawerOpen(false)}
        onMarkAsRead={handleMarkNotifRead}
        onMarkAllRead={handleMarkAllNotifsRead}
        onClearAll={handleClearNotifications}
        onInspectPost={handleInspectPostFromNotif}
      />
    </div>
  );
}
