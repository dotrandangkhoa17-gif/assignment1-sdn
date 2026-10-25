'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import {
  getPushPermission,
  requestPushPermission,
  showBrowserPushNotification,
} from '@/lib/push';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | 'unsupported'
  >('default');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const initialFetchDone = useRef<boolean>(false);

  // Update permission state
  useEffect(() => {
    setPushPermission(getPushPermission());
  }, []);

  const handleRequestPush = async () => {
    const granted = await requestPushPermission();
    setPushPermission(granted ? 'granted' : 'denied');
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const rawList: NotificationItem[] = data.notifications || [];

        // If the user currently has an active chat open in this window,
        // auto-mark notifications for this active team as read so they don't badge the user.
        const activeChatTeamId =
          typeof window !== 'undefined'
            ? (window as unknown as { __ACTIVE_CHAT_TEAM_ID?: string }).__ACTIVE_CHAT_TEAM_ID
            : null;

        if (activeChatTeamId) {
          const activeUnreadChatNotifs = rawList.filter(
            (n) =>
              !n.isRead &&
              n.type === 'NEW_MESSAGE' &&
              n.link &&
              n.link.includes(activeChatTeamId)
          );
          if (activeUnreadChatNotifs.length > 0) {
            fetch('/api/notifications', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ teamId: activeChatTeamId }),
            }).catch(() => {});
          }
        }

        // Trigger Browser Desktop Push Notifications for brand-new incoming items
        if (initialFetchDone.current) {
          rawList.forEach((n) => {
            if (!knownNotificationIds.current.has(n.id) && !n.isRead) {
              // Don't pop push notification if user is already actively reading that room
              if (
                activeChatTeamId &&
                n.type === 'NEW_MESSAGE' &&
                n.link?.includes(activeChatTeamId)
              ) {
                return;
              }
              showBrowserPushNotification(n.title, {
                body: n.message,
                link: n.link || undefined,
                tag: n.id,
              });
            }
          });
        }

        // Keep set of known IDs
        rawList.forEach((n) => knownNotificationIds.current.add(n.id));
        initialFetchDone.current = true;

        setNotifications(rawList);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user]);

  // Initial fetch and fast polling fallback (3 seconds) + focus listener
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 3000); // 3s polling for fast notification delivery

    const handleRefresh = () => {
      fetchNotifications();
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('notifications-updated', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('notifications-updated', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [user, fetchNotifications]);

  // Real-time listener via Supabase Realtime
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channelName = `realtime-user-${user.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'new-notification' }, (payload) => {
        const activeChatTeamId =
          typeof window !== 'undefined'
            ? (window as unknown as { __ACTIVE_CHAT_TEAM_ID?: string }).__ACTIVE_CHAT_TEAM_ID
            : null;
        const newNotif = payload?.payload as NotificationItem;

        // If user is currently in that team's chat, ignore / don't badge
        if (
          activeChatTeamId &&
          newNotif?.type === 'NEW_MESSAGE' &&
          newNotif?.link &&
          newNotif.link.includes(activeChatTeamId)
        ) {
          return;
        }

        if (newNotif && newNotif.id) {
          if (!knownNotificationIds.current.has(newNotif.id)) {
            knownNotificationIds.current.add(newNotif.id);
            // Trigger browser desktop push notification
            showBrowserPushNotification(newNotif.title, {
              body: newNotif.message,
              link: newNotif.link || undefined,
              tag: newNotif.id,
            });
          }
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);
        } else {
          fetchNotifications();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return '📋';
      case 'TEAM_INVITE':
        return '👥';
      case 'ROLE_UPDATED':
        return '🛡️';
      case 'TASK_STATUS_CHANGED':
        return '🔄';
      case 'NEW_MESSAGE':
        return '💬';
      default:
        return '🔔';
    }
  };

function formatNotificationDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

  if (!user) return null;

  return (
    <div className="notification-bell-container" ref={dropdownRef} id="notification-center">
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        id="notification-bell-btn"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge" id="notification-unread-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" id="notification-dropdown">
          <div className="notification-header">
            <div className="notification-title-wrap">
              <span className="notification-header-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="notification-pill-count">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="notification-mark-all-btn"
                onClick={handleMarkAllAsRead}
                disabled={loading}
                id="notification-mark-all"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Desktop Push Notification Control Banner (Bonus 4.4) */}
          {pushPermission !== 'unsupported' && (
            <div
              className="notification-push-banner"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 1rem',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.8rem',
              }}
            >
              <span style={{ color: '#cbd5e1' }}>
                {pushPermission === 'granted'
                  ? '🟢 Desktop push notifications active'
                  : '🔔 Get notifications on your desktop'}
              </span>
              {pushPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestPush}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Enable
                </button>
              )}
            </div>
          )}

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="empty-bell-icon">🔕</span>
                <p>No notifications yet</p>
                <span className="empty-subtext">You will be notified about task assignments & team invites</span>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`notification-item ${item.isRead ? 'read' : 'unread'}`}
                  onClick={() => {
                    if (!item.isRead) handleMarkAsRead(item.id);
                  }}
                >
                  <div className="notification-item-icon">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-title-row">
                      <span className="notification-item-title">{item.title}</span>
                      <span className="notification-item-time">
                        {formatNotificationDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="notification-item-message">{item.message}</p>
                    {item.link && (
                      <Link
                        href={item.link}
                        className="notification-item-link"
                        onClick={() => {
                          if (!item.isRead) handleMarkAsRead(item.id);
                          setIsOpen(false);
                        }}
                      >
                        View details →
                      </Link>
                    )}
                  </div>
                  {!item.isRead && (
                    <button
                      className="notification-item-check-btn"
                      title="Mark as read"
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                    >
                      ●
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
