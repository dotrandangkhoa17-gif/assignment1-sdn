/**
 * Utility functions for Browser Web Push (Desktop Notifications)
 * Part of Bonus Feature 4.4
 */

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Error requesting desktop notification permission:', err);
    return false;
  }
}

export function showBrowserPushNotification(
  title: string,
  options?: {
    body?: string;
    link?: string;
    tag?: string;
  }
) {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notif = new Notification(title, {
      body: options?.body || 'You have a new update in TaskFlow',
      icon: '/favicon.ico',
      tag: options?.tag,
    });

    if (options?.link) {
      notif.onclick = () => {
        window.focus();
        if (options.link) {
          window.location.href = options.link;
        }
        notif.close();
      };
    }

    return notif;
  } catch (err) {
    console.warn('Failed to trigger browser desktop notification:', err);
    return null;
  }
}
