import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Puzzle,
  Moon,
  Sun,
  Contrast,
  CheckCircle2,
  AlertCircle,
  Globe,
  Code2,
  Clock,
  Sparkles,
  Download,
  FileJson,
  UserPlus,
  ExternalLink,
  Palette,
  BookOpen,
  ChevronRight,
  Newspaper,
} from 'lucide-react';
import {
  PlatformType,
  ProfileSettings,
  WatchSource,
  CapturedPost,
  AppNotification,
  validateSourceInput,
  buildExportPayload,
} from '../utils/watcherEngine';
import { SourceProfileAvatarSVG } from './VisualPlate';

interface SettingsModalProps {
  isOpen: boolean;
  initialTab: 'sources' | 'extension' | 'profile';
  editingSourceId?: string | null;
  profile: ProfileSettings;
  sources: WatchSource[];
  posts: CapturedPost[];
  notifications: AppNotification[];
  onClose: () => void;
  onUpdateProfile: (updates: Partial<ProfileSettings>) => void;
  onAddWebsiteProfile: (input: {
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
  }) => WatchSource;
  onViewSourceProfile: (sourceId: string) => void;
  onUpdateSource: (sourceId: string, updates: Partial<WatchSource>) => void;
  onDeleteSource: (sourceId: string) => void;
  onClipFromExtension: (clipInput: {
    url: string;
    title: string;
    selectedText: string;
    cssSelector: string;
    platform: PlatformType;
    intervalSeconds: number;
  }) => void;
}

const TUTORIAL_STORAGE_KEY = 'pulsegrid_settings_tutorial_seen_v1';

const TUTORIAL_STEPS = [
  {
    step: 1,
    title: 'Follow & Customize Websites with Original Icons',
    description:
      'Add any website or social feed URL below. Every website automatically gets its original brand icon, its own @username, custom bio, and 24/7 topic watcher.',
  },
  {
    step: 2,
    title: 'Digital Newspaper Editions & Hoverable Verified Tick (✓)',
    description:
      'Whenever a watched website publishes new info, PulseGrid converts it into a Digital Newspaper edition in your Home Feed and Profile. Hover your cursor over the blue ✓ tick on any post to see exact extraction time and live source proof.',
  },
  {
    step: 3,
    title: 'Smooth Mouse Scrolling, Dark Mode & JSON Archive',
    description:
      'Scroll naturally with your mouse wheel across all settings, switch between Dark Mode and High-Contrast AAA mode, or click Download JSON to export your entire watch history.',
  },
];

const PLATFORMS: PlatformType[] = [
  'Custom Website',
  'X / Social',
  'GitHub',
  'Hacker News',
  'Reddit',
  'Substack',
];

const BRAND_SWATCHES = [
  '#2563EB',
  '#0EA5E9',
  '#635BFF',
  '#FF6600',
  '#EA580C',
  '#10B981',
  '#DB2777',
  '#7C3AED',
];

const EXTENSION_PRESETS: {
  label: string;
  url: string;
  title: string;
  selectedText: string;
  cssSelector: string;
  platform: PlatformType;
}[] = [
  {
    label: 'Linear Changelog Releases',
    url: 'https://linear.app/changelog',
    title: 'Linear Product Changelog',
    selectedText: 'New cycle velocity charts, keyboard shortcuts, and triage workflows',
    cssSelector: 'article.changelog-item h2',
    platform: 'Custom Website',
  },
  {
    label: 'OpenAI Platform Status & Docs',
    url: 'https://platform.openai.com/docs/changelog',
    title: 'OpenAI Developer Changelog',
    selectedText: 'Structured outputs schema updates, latency reductions, and token pricing',
    cssSelector: 'main .docs-changelog-entry',
    platform: 'Custom Website',
  },
  {
    label: 'Tailwind CSS GitHub Releases',
    url: 'https://github.com/tailwindlabs/tailwindcss/releases',
    title: 'Tailwind CSS v4 Releases',
    selectedText: 'Oxide engine CSS-first configuration, @theme tokens, and high-contrast utilities',
    cssSelector: '.release-entry .markdown-body',
    platform: 'GitHub',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  initialTab,
  editingSourceId,
  profile,
  sources,
  posts,
  notifications,
  onClose,
  onUpdateProfile,
  onAddWebsiteProfile,
  onViewSourceProfile,
  onUpdateSource,
  onDeleteSource,
  onClipFromExtension,
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'extension' | 'profile'>(
    initialTab
  );

  // One-Time Tutorial State (Shown automatically on first Settings visit, then saved in localStorage)
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [tutorialStepIndex, setTutorialStepIndex] = useState<number>(0);

  // New Website Profile Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newAccentColor, setNewAccentColor] = useState('#2563EB');
  const [newQuery, setNewQuery] = useState('');
  const [newSelector, setNewSelector] = useState('article h2, .post-content');
  const [newPlatform, setNewPlatform] = useState<PlatformType>('Custom Website');
  const [newInterval, setNewInterval] = useState(30);
  const [newPriority] = useState<'standard' | 'high'>('high');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [selectedEditId, setSelectedEditId] = useState<string | null>(
    editingSourceId || null
  );

  // Extension Clipper Simulator State
  const [clipUrl, setClipUrl] = useState(EXTENSION_PRESETS[0].url);
  const [clipTitle, setClipTitle] = useState(EXTENSION_PRESETS[0].title);
  const [clipText, setClipText] = useState(EXTENSION_PRESETS[0].selectedText);
  const [clipSelector, setClipSelector] = useState(EXTENSION_PRESETS[0].cssSelector);
  const [clipPlatform, setClipPlatform] = useState<PlatformType>(
    EXTENSION_PRESETS[0].platform
  );
  const [clipInterval, setClipInterval] = useState(30);
  const [clipFeedback, setClipFeedback] = useState<string | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedEditId(editingSourceId || null);
      setFormError(null);
      setFormSuccess(null);
      setClipFeedback(null);
      setExportSuccessMessage(null);
      try {
        const alreadySeen = localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
        setShowTutorial(!alreadySeen);
      } catch {}
    }
  }, [isOpen, initialTab, editingSourceId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDismissOneTimeTutorial = () => {
    setShowTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {}
  };

  const handleDownloadJsonExport = () => {
    const { jsonString, filename, payload } = buildExportPayload(
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

    setExportSuccessMessage(
      `Exported ${payload.summary.totalCapturedPosts} posts, ${payload.summary.totalWatchedSources} watched sources, and ${payload.summary.totalWatchHistoryAlerts} watch alerts to ${filename}.`
    );
  };

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validation = validateSourceInput({
      name: newName,
      url: newUrl,
      watchQuery: newQuery,
      cssSelector: newSelector,
    });

    if (!validation.valid) {
      setFormError(validation.error || 'Please check your input fields.');
      return;
    }

    const createdProfile = onAddWebsiteProfile({
      name: newName.trim(),
      url: validation.normalizedUrl,
      watchQuery: newQuery.trim(),
      cssSelector: newSelector.trim() || 'body',
      platform: newPlatform,
      intervalSeconds: Math.max(10, Math.min(3600, Number(newInterval) || 30)),
      priority: newPriority,
      username: newUsername.trim() || undefined,
      bio: newBio.trim() || undefined,
      avatarUrl: newAvatarUrl.trim() || undefined,
      accentColor: newAccentColor,
    });

    setNewName('');
    setNewUsername('');
    setNewUrl('');
    setNewBio('');
    setNewAvatarUrl('');
    setNewQuery('');
    setFormSuccess(
      `Added @${createdProfile.username} (${createdProfile.name}) with its original icon & started 24/7 Digital Newspaper watching!`
    );
  };

  const handleClipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClipFeedback(null);

    const validation = validateSourceInput({
      name: clipTitle,
      url: clipUrl,
      watchQuery: clipText,
      cssSelector: clipSelector,
    });

    if (!validation.valid) {
      setClipFeedback(validation.error || 'Invalid extension clip fields.');
      return;
    }

    onClipFromExtension({
      url: validation.normalizedUrl,
      title: clipTitle,
      selectedText: clipText,
      cssSelector: clipSelector,
      platform: clipPlatform,
      intervalSeconds: clipInterval,
    });

    setClipFeedback(
      `Pinned "${clipTitle}" to your Digital Newspaper feed & 24/7 watcher!`
    );
  };

  const currentTutorialStep = TUTORIAL_STEPS[tutorialStepIndex] || TUTORIAL_STEPS[0];

  return (
    /* Outer Overlay is natively scrollable (`overflow-y-auto`) so mouse wheel scrolling works everywhere in Settings! */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      data-testid="settings-modal-scroll-container"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="min-h-full flex items-start justify-center py-2 sm:py-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col ${
            profile.highContrast
              ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
              : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl'
          }`}
        >
          {/* Sticky Top Modal Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md">
            <div>
              <h2
                id="settings-modal-title"
                className="text-lg font-bold text-neutral-900 dark:text-white font-display"
              >
                Settings, Website Profiles &amp; Extension Clipper
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Scroll freely with your mouse wheel to customize website profiles, icons, dark mode, or export JSON.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!showTutorial && (
                <button
                  type="button"
                  onClick={() => {
                    setTutorialStepIndex(0);
                    setShowTutorial(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#0095F6]" />
                  <span>Tutorial</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Settings Modal"
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ONE-TIME INTERACTIVE SETTINGS TUTORIAL BANNER */}
          {showTutorial && (
            <div
              data-testid="settings-one-time-tutorial"
              className="mx-6 mt-5 p-4 sm:p-5 rounded-2xl border-2 border-[#0095F6]/50 bg-gradient-to-r from-[#0095F6]/10 via-indigo-500/10 to-emerald-500/10 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0095F6] text-white text-xs font-bold font-mono">
                    {currentTutorialStep.step}
                  </span>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0095F6]">
                    One-Time Quick Start Guide · Step {tutorialStepIndex + 1} of {TUTORIAL_STEPS.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {TUTORIAL_STEPS.map((s, idx) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setTutorialStepIndex(idx)}
                      aria-label={`Tutorial Step ${s.step}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === tutorialStepIndex
                          ? 'w-6 bg-[#0095F6]'
                          : 'w-2 bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white font-display flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-[#0095F6] shrink-0" />
                  <span>{currentTutorialStep.title}</span>
                </h3>
                <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {currentTutorialStep.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                  Shown once automatically on your first visit to Settings.
                </span>

                <div className="flex items-center gap-2">
                  {tutorialStepIndex < TUTORIAL_STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setTutorialStepIndex((prev) => prev + 1)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors cursor-pointer"
                    >
                      <span>Next Tip</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    data-testid="dismiss-tutorial-btn"
                    onClick={handleDismissOneTimeTutorial}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Got It, Don&apos;t Show Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div
            role="tablist"
            aria-label="Settings Categories"
            className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50 px-6 mt-4 gap-2 flex-wrap"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sources'}
              onClick={() => setActiveTab('sources')}
              className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'sources'
                  ? 'border-[#0095F6] text-[#0095F6]'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Website Profiles ({sources.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'extension'}
              onClick={() => setActiveTab('extension')}
              className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'extension'
                  ? 'border-[#0095F6] text-[#0095F6]'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Puzzle className="w-4 h-4" />
              <span>Browser Extension Clipper</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-[#0095F6] text-[#0095F6]'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Theme, Readability &amp; Export
            </button>
          </div>

          {/* Tab Content Body (Unconstrained height inside outer scrollable modal so mouse wheel works effortlessly) */}
          <div className="p-6 space-y-6">
            {/* TAB 1: CUSTOMIZABLE WEBSITE PROFILES */}
            {activeTab === 'sources' && (
              <div className="space-y-6">
                {/* Add New Website as an Instagram Profile Entity Form */}
                <form
                  onSubmit={handleCreateSource}
                  className={`p-5 rounded-xl space-y-4 ${
                    profile.highContrast
                      ? 'border-2 border-black dark:border-white bg-neutral-50 dark:bg-neutral-950'
                      : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2 font-display">
                        <UserPlus className="w-4 h-4 text-[#0095F6]" />
                        <span>Follow &amp; Customize a New Website Profile</span>
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Automatically loads the website&apos;s original icon and converts its news into Digital Newspaper editions.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      24/7 Live Scraper
                    </span>
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div
                      role="status"
                      className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{formSuccess}</span>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer shrink-0"
                      >
                        View Profile Now
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="new-source-name"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Website Profile Name
                      </label>
                      <input
                        id="new-source-name"
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g., Vercel Changelog"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="new-source-username"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Custom @Username (Optional)
                      </label>
                      <input
                        id="new-source-username"
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g., vercel.official"
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="new-source-url"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Target Website or Topic URL
                      </label>
                      <input
                        id="new-source-url"
                        type="text"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://vercel.com/changelog"
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="new-source-query"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        What Topic / Info Should PulseGrid Extract 24/7?
                      </label>
                      <input
                        id="new-source-query"
                        type="text"
                        value={newQuery}
                        onChange={(e) => setNewQuery(e.target.value)}
                        placeholder="e.g., Next.js releases, edge caching updates, or pricing changes"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="new-source-bio"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Custom Website Profile Bio
                      </label>
                      <input
                        id="new-source-bio"
                        type="text"
                        value={newBio}
                        onChange={(e) => setNewBio(e.target.value)}
                        placeholder="e.g., Official Vercel platform release tracker & edge network changelog."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="new-source-avatar"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Custom Icon URL (Optional — Auto-detects Original Icon)
                      </label>
                      <input
                        id="new-source-avatar"
                        type="text"
                        value={newAvatarUrl}
                        onChange={(e) => setNewAvatarUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="new-source-selector"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        CSS / DOM Selector
                      </label>
                      <input
                        id="new-source-selector"
                        type="text"
                        value={newSelector}
                        onChange={(e) => setNewSelector(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        Website Brand Color
                      </span>
                      <div className="flex items-center gap-1.5 pt-1">
                        {BRAND_SWATCHES.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setNewAccentColor(hex)}
                            aria-label={`Select brand color ${hex}`}
                            className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                              newAccentColor === hex
                                ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-white scale-110'
                                : ''
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                      <label
                        htmlFor="new-source-platform"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Platform Type
                      </label>
                      <select
                        id="new-source-platform"
                        value={newPlatform}
                        onChange={(e) => setNewPlatform(e.target.value as PlatformType)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="new-source-interval"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Poll Interval (Seconds)
                      </label>
                      <input
                        id="new-source-interval"
                        type="number"
                        min={10}
                        max={3600}
                        value={newInterval}
                        onChange={(e) => setNewInterval(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Website Profile</span>
                    </button>
                  </div>
                </form>

                {/* Existing Watched Website Profiles List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Customize Existing Followed Website Profiles ({sources.length})
                  </h3>

                  <div className="space-y-3">
                    {sources.map((src) => {
                      const isHighlighted = selectedEditId === src.id;
                      return (
                        <div
                          key={src.id}
                          className={`p-4 rounded-xl transition-all space-y-3 ${
                            isHighlighted
                              ? 'border-2 border-[#0095F6] bg-blue-50/20 dark:bg-blue-950/20'
                              : profile.highContrast
                              ? 'border-2 border-black dark:border-white'
                              : 'border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/40'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <SourceProfileAvatarSVG
                                source={src}
                                highContrast={profile.highContrast}
                                size="sm"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-neutral-900 dark:text-white font-display">
                                    {src.name}
                                  </span>
                                  <span className="text-xs font-mono text-[#0095F6]">
                                    @{src.username}
                                  </span>
                                </div>
                                <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                                  <Globe className="w-3 h-3" />
                                  <span>{src.handle}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onViewSourceProfile(src.id);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-[#0095F6]/10 text-[#0095F6] hover:bg-[#0095F6]/20 transition-colors cursor-pointer"
                              >
                                <span>Open Profile</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateSource(src.id, { active: !src.active })
                                }
                                aria-label={
                                  src.active
                                    ? `Unfollow ${src.name}`
                                    : `Follow ${src.name}`
                                }
                                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                                  src.active
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                                    : 'bg-[#0095F6] text-white'
                                }`}
                              >
                                {src.active ? 'Following' : 'Follow'}
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeleteSource(src.id)}
                                aria-label={`Delete ${src.name}`}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Editable Identity Row: Name, @Username, URL */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                            <div>
                              <label
                                htmlFor={`name-${src.id}`}
                                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1"
                              >
                                Profile Display Name
                              </label>
                              <input
                                id={`name-${src.id}`}
                                type="text"
                                value={src.name}
                                onChange={(e) =>
                                  onUpdateSource(src.id, { name: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`username-${src.id}`}
                                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1"
                              >
                                Instagram @Username
                              </label>
                              <input
                                id={`username-${src.id}`}
                                type="text"
                                value={src.username}
                                onChange={(e) =>
                                  onUpdateSource(src.id, {
                                    username: e.target.value
                                      .toLowerCase()
                                      .replace(/[^a-z0-9._]/g, '_'),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`url-${src.id}`}
                                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1"
                              >
                                Website Topic / Feed URL
                              </label>
                              <input
                                id={`url-${src.id}`}
                                type="text"
                                value={src.url}
                                onChange={(e) =>
                                  onUpdateSource(src.id, {
                                    url: e.target.value,
                                    handle: e.target.value.replace(/^https?:\/\//, ''),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Editable Bio, Avatar URL & Brand Color */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-5">
                              <label
                                htmlFor={`bio-${src.id}`}
                                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1"
                              >
                                Website Profile Bio
                              </label>
                              <input
                                id={`bio-${src.id}`}
                                type="text"
                                value={src.bio || ''}
                                placeholder="Custom bio for this website profile..."
                                onChange={(e) =>
                                  onUpdateSource(src.id, { bio: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                              />
                            </div>

                            <div className="md:col-span-4">
                              <label
                                htmlFor={`avatar-${src.id}`}
                                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1"
                              >
                                Custom Icon URL (Leave blank for Original Icon)
                              </label>
                              <input
                                id={`avatar-${src.id}`}
                                type="text"
                                value={src.avatarUrl || ''}
                                placeholder="https://.../favicon.ico"
                                onChange={(e) =>
                                  onUpdateSource(src.id, { avatarUrl: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                              />
                            </div>

                            <div className="md:col-span-3">
                              <span className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1">
                                <Palette className="w-3 h-3" />
                                <span>Brand Color</span>
                              </span>
                              <div className="flex items-center gap-1 pt-1">
                                {BRAND_SWATCHES.slice(0, 6).map((hex) => (
                                  <button
                                    key={`${src.id}-${hex}`}
                                    type="button"
                                    onClick={() =>
                                      onUpdateSource(src.id, { accentColor: hex })
                                    }
                                    className={`w-5 h-5 rounded-full cursor-pointer ${
                                      src.accentColor === hex
                                        ? 'ring-2 ring-offset-1 ring-neutral-900 dark:ring-white'
                                        : ''
                                    }`}
                                    style={{ backgroundColor: hex }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Editable Watch Topic, CSS Selector, and Poll Interval */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-6">
                              <label
                                htmlFor={`query-${src.id}`}
                                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1"
                              >
                                24/7 Watched Topic &amp; Keywords
                              </label>
                              <input
                                id={`query-${src.id}`}
                                type="text"
                                value={src.watchQuery}
                                onChange={(e) =>
                                  onUpdateSource(src.id, { watchQuery: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                              />
                            </div>

                            <div className="md:col-span-4">
                              <label
                                htmlFor={`selector-${src.id}`}
                                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1"
                              >
                                <Code2 className="w-3 h-3" />
                                <span>CSS Selector</span>
                              </label>
                              <input
                                id={`selector-${src.id}`}
                                type="text"
                                value={src.cssSelector}
                                onChange={(e) =>
                                  onUpdateSource(src.id, { cssSelector: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label
                                htmlFor={`interval-${src.id}`}
                                className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3" />
                                <span>Poll (s)</span>
                              </label>
                              <input
                                id={`interval-${src.id}`}
                                type="number"
                                min={10}
                                max={3600}
                                value={src.intervalSeconds}
                                onChange={(e) =>
                                  onUpdateSource(src.id, {
                                    intervalSeconds: Math.max(
                                      10,
                                      Number(e.target.value) || 30
                                    ),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BROWSER EXTENSION CLIPPER */}
            {activeTab === 'extension' && (
              <div className="space-y-6">
                <div
                  className={`p-5 rounded-xl space-y-4 ${
                    profile.highContrast
                      ? 'border-2 border-black dark:border-white'
                      : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-[#0095F6] font-semibold">
                        PulseGrid Web Clipper Extension ({profile.extensionShortcut})
                      </span>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5 font-display">
                        Clip Any Webpage Element Into Your 24/7 Digital Newspaper Feed
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      Extension Connected
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    Select a quick preset below or paste any webpage URL and CSS selector. Clicking{' '}
                    <strong>Clip &amp; Watch 24/7</strong> immediately creates a new website profile with its original icon and posts the first Digital Newspaper edition.
                  </p>

                  {/* Preset Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-semibold text-neutral-500">
                      Try Live Presets:
                    </span>
                    {EXTENSION_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setClipUrl(preset.url);
                          setClipTitle(preset.title);
                          setClipText(preset.selectedText);
                          setClipSelector(preset.cssSelector);
                          setClipPlatform(preset.platform);
                          setClipFeedback(null);
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-[#0095F6] transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {clipFeedback && (
                    <div
                      role="status"
                      className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{clipFeedback}</span>
                    </div>
                  )}

                  <form onSubmit={handleClipSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="clip-title"
                          className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                        >
                          Page / Feed Title
                        </label>
                        <input
                          id="clip-title"
                          type="text"
                          value={clipTitle}
                          onChange={(e) => setClipTitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="clip-url"
                          className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                        >
                          Active Browser Tab URL
                        </label>
                        <input
                          id="clip-url"
                          type="text"
                          value={clipUrl}
                          onChange={(e) => setClipUrl(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="clip-text"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Highlighted Text / Watch Criteria on Page
                      </label>
                      <textarea
                        id="clip-text"
                        rows={2}
                        value={clipText}
                        onChange={(e) => setClipText(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div>
                        <label
                          htmlFor="clip-selector"
                          className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                        >
                          Locked DOM Selector
                        </label>
                        <input
                          id="clip-selector"
                          type="text"
                          value={clipSelector}
                          onChange={(e) => setClipSelector(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="clip-interval"
                          className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                        >
                          24/7 Poll Frequency (s)
                        </label>
                        <input
                          id="clip-interval"
                          type="number"
                          min={10}
                          max={3600}
                          value={clipInterval}
                          onChange={(e) => setClipInterval(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Clip &amp; Watch 24/7</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 3: THEME, READABILITY & JSON EXPORT */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Theme & Accessibility Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProfile({ darkMode: !profile.darkMode })
                    }
                    aria-pressed={profile.darkMode}
                    className={`p-4 rounded-xl text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      profile.highContrast
                        ? 'border-2 border-black dark:border-white'
                        : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-neutral-900 dark:text-white font-display">
                        {profile.darkMode ? (
                          <Moon className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-500" />
                        )}
                        <span>Dark Mode (Night Readability)</span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Switches between carbon-slate dark mode and daylight gallery mode.
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                        profile.darkMode
                          ? 'bg-[#0095F6] text-white'
                          : 'bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      {profile.darkMode ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProfile({ highContrast: !profile.highContrast })
                    }
                    aria-pressed={profile.highContrast}
                    className={`p-4 rounded-xl text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      profile.highContrast
                        ? 'border-2 border-black dark:border-white'
                        : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-neutral-900 dark:text-white font-display">
                        <Contrast className="w-4 h-4 text-amber-500" />
                        <span>High-Contrast Accessibility (AAA)</span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Enforces 7:1+ contrast ratios, solid 2px borders, and crisp focus rings.
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                        profile.highContrast
                          ? 'bg-amber-400 text-black'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {profile.highContrast ? 'AAA ON' : 'NORMAL'}
                    </span>
                  </button>
                </div>

                {/* Font Scale Selector */}
                <div
                  className={`p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 ${
                    profile.highContrast
                      ? 'border-2 border-black dark:border-white'
                      : 'border border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-white font-display">
                      Readable Typography Scale
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Uses clean Plus Jakarta Sans, Inter, and JetBrains Mono for effortless scanning.
                    </div>
                  </div>

                  <div className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-700 overflow-hidden">
                    {(['normal', 'large', 'xlarge'] as const).map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => onUpdateProfile({ fontScale: scale })}
                        className={`px-3 py-1.5 text-xs font-semibold uppercase cursor-pointer ${
                          profile.fontScale === scale
                            ? 'bg-[#0095F6] text-white'
                            : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {scale === 'normal'
                          ? '100% Default'
                          : scale === 'large'
                          ? '110% Large'
                          : '120% Extra Large'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Download JSON Archive Card */}
                <div
                  className={`p-5 rounded-xl space-y-3 ${
                    profile.highContrast
                      ? 'border-2 border-black dark:border-white bg-neutral-50 dark:bg-neutral-950'
                      : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white font-display">
                        <FileJson className="w-4 h-4 text-[#0095F6]" />
                        <span>Export Captured Posts &amp; Watch History (JSON)</span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xl">
                        Download a structured local JSON file containing all{' '}
                        <span className="font-mono font-semibold">{posts.length}</span> captured posts,{' '}
                        <span className="font-mono font-semibold">{sources.length}</span> watched website rules, and{' '}
                        <span className="font-mono font-semibold">{notifications.length}</span> watch history alerts.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadJsonExport}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors cursor-pointer shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download JSON</span>
                    </button>
                  </div>

                  {exportSuccessMessage && (
                    <div
                      role="status"
                      className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{exportSuccessMessage}</span>
                    </div>
                  )}
                </div>

                {/* Master Instagram Profile Identity Fields */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Master Profile Identity (Shown Only in Profile Tab)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="profile-username"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Profile Handle
                      </label>
                      <input
                        id="profile-username"
                        type="text"
                        value={profile.username}
                        onChange={(e) =>
                          onUpdateProfile({ username: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="profile-display-name"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Display Name
                      </label>
                      <input
                        id="profile-display-name"
                        type="text"
                        value={profile.displayName}
                        onChange={(e) =>
                          onUpdateProfile({ displayName: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-bio"
                      className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                    >
                      Profile Bio
                    </label>
                    <textarea
                      id="profile-bio"
                      rows={2}
                      value={profile.bio}
                      onChange={(e) => onUpdateProfile({ bio: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
