import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { AppNotification } from '../utils/watcherEngine';

interface NotificationDrawerProps {
  isOpen: boolean;
  notifications: AppNotification[];
  highContrast: boolean;
  onClose: () => void;
  onMarkAsRead: (notifId: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onInspectPost: (postId: string, notifId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  notifications,
  highContrast,
  onClose,
  onMarkAsRead,
  onMarkAllRead,
  onClearAll,
  onInspectPost,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayed =
    filterMode === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-drawer-title"
    >
      <div
        className={`w-full max-w-md h-full flex flex-col border-l ${
          highContrast
            ? 'bg-white dark:bg-black border-l-2 border-slate-950 dark:border-white'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2
              id="notifications-drawer-title"
              className="text-base font-bold text-slate-900 dark:text-white font-display"
            >
              24/7 Capture Alerts
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              · {unreadCount} unread
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Notification Center"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Bulk Actions Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unread')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterMode === 'unread'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                aria-label="Clear all notifications"
                className="p-1.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
          {displayed.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No alerts in this view
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When the 24/7 watcher extracts new changes from your watched websites, instant notifications appear here.
              </p>
            </div>
          ) : (
            displayed.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 transition-colors ${
                  !notif.read
                    ? 'bg-blue-50/40 dark:bg-blue-950/20'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {notif.sourceName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{notif.platform}</span>
                  </div>
                  <span className="font-mono tabular-nums shrink-0">
                    {notif.createdAt}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  {notif.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {notif.message}
                </p>

                <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    Selector: {notif.matchedRule}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {!notif.read && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(notif.id)}
                        className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onInspectPost(notif.postId, notif.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                    >
                      <span>View Capture</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
