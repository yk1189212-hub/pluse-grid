import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  Bookmark,
  ExternalLink,
  Code2,
  Send,
  SlidersHorizontal,
  Globe,
} from 'lucide-react';
import { CapturedPost, buildTopicDestinationUrl } from '../utils/watcherEngine';
import { VisualPlate, VerifiedLiveTickBadge } from './VisualPlate';

interface PostDetailModalProps {
  post: CapturedPost | null;
  highContrast: boolean;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onEditSourceRule: (sourceId: string) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  highContrast,
  onClose,
  onToggleLike,
  onToggleSave,
  onAddComment,
  onEditSourceRule,
}) => {
  const [commentText, setCommentText] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!post) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [post, onClose]);

  if (!post) return null;

  const topicDestinationUrl = buildTopicDestinationUrl({
    sourceUrl: post.sourceUrl,
    articleUrl: post.articleUrl,
    matchedQuery: post.matchedQuery,
    headline: post.headline,
    platform: post.platform,
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = commentText.trim();
    if (!cleaned) return;
    onAddComment(post.id, cleaned);
    setCommentText('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-post-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="min-h-full flex items-center justify-center py-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`relative w-full max-w-5xl rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 ${
            highContrast
              ? 'bg-white dark:bg-black border-2 border-black dark:border-white'
              : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl'
          }`}
        >
          {/* Left 6 Cols: Digital Newspaper Front-Page Edition */}
          <div className="lg:col-span-6 bg-[#FAF7F0] dark:bg-[#141413] flex items-stretch justify-center">
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
              highContrast={highContrast}
              className="w-full h-full"
            />
          </div>

          {/* Right 6 Cols: Full Untruncated Post Details, Extracted Fields & Comments */}
          <div className="lg:col-span-6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-neutral-900 dark:text-white truncate font-display">
                    {post.sourceName}
                  </span>
                  <VerifiedLiveTickBadge
                    capturedAt={post.capturedAt}
                    timestampMs={post.timestampMs}
                    sourceHandle={post.sourceHandle}
                    sourceName={post.sourceName}
                    cssSelector={post.cssSelector}
                    matchedQuery={post.matchedQuery}
                  />
                  <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                    · {post.platform}
                  </span>
                </div>
                <a
                  href={topicDestinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono text-[#0095F6] hover:underline break-all"
                >
                  <span>{post.sourceHandle}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onEditSourceRule(post.sourceId)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Customize this website profile"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Customize</span>
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close Post Details Modal"
                  className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body with Complete Untruncated Information */}
            <div className="flex-1 p-5 space-y-5">
              <div>
                <h2
                  id="modal-post-title"
                  className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white leading-snug font-display break-words"
                >
                  {post.headline}
                </h2>
                <p className="mt-2.5 text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-line break-words">
                  {post.summary}
                </p>

                {/* Prominent Go to Website Topic CTA */}
                <div className="mt-3">
                  <a
                    href={topicDestinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="modal-go-to-topic-btn"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Go to Website Topic on {post.sourceHandle.split('/')[0]}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Extracted Fields Table */}
              <div
                className={`rounded-xl p-4 space-y-3 ${
                  highContrast
                    ? 'border-2 border-black dark:border-white bg-neutral-50 dark:bg-neutral-950'
                    : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    Newspaper Extracted Facts
                  </span>
                  <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1 break-all">
                    <Code2 className="w-3.5 h-3.5 shrink-0" />
                    {post.cssSelector}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {post.extractedFields.map((field, index) => (
                    <div
                      key={index}
                      className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800"
                    >
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {field.label}
                      </div>
                      <div className="text-xs font-mono font-bold text-neutral-900 dark:text-white mt-0.5 tabular-nums break-words">
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-neutral-600 dark:text-neutral-400 pt-1 border-t border-neutral-200/70 dark:border-neutral-800 break-words">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Matched Watch Topic:
                  </span>{' '}
                  {post.matchedQuery}
                </div>
              </div>

              {/* Comments / Team Notes */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Watch Annotations ({post.comments.length})
                </h3>
                {post.comments.length === 0 ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">
                    No annotations yet. Add a note below to log findings from this capture.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {post.comments.map((c) => (
                      <div
                        key={c.id}
                        className="text-xs sm:text-sm p-2.5 rounded-lg bg-neutral-100/70 dark:bg-neutral-800/60"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            @{c.author}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500">
                            {c.createdAt}
                          </span>
                        </div>
                        <p className="text-neutral-700 dark:text-neutral-200 mt-1 break-words">
                          {c.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Bar & Comment Input */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onToggleLike(post.id)}
                    aria-label={post.likedByMe ? 'Unlike capture' : 'Like capture'}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                      post.likedByMe
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-neutral-700 dark:text-neutral-300 hover:text-rose-500'
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${post.likedByMe ? 'fill-current' : ''}`}
                    />
                    <span className="font-mono tabular-nums">{post.likesCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleSave(post.id)}
                    aria-label={post.saved ? 'Remove from Saved' : 'Bookmark capture'}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                      post.saved
                        ? 'text-[#0095F6]'
                        : 'text-neutral-700 dark:text-neutral-300 hover:text-[#0095F6]'
                    }`}
                  >
                    <Bookmark
                      className={`w-5 h-5 ${post.saved ? 'fill-current' : ''}`}
                    />
                    <span>{post.saved ? 'Saved' : 'Save'}</span>
                  </button>
                </div>

                <a
                  href={topicDestinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0095F6] hover:underline"
                >
                  <span>Go to Website Topic</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                <label htmlFor="post-comment-input" className="sr-only">
                  Add annotation note
                </label>
                <input
                  id="post-comment-input"
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a watch note or tag a teammate..."
                  className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0095F6]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
