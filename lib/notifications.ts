// Browser notification utilities for draw alerts

export interface NotificationPermission {
  granted: boolean;
  timestamp: number;
}

/**
 * Request browser notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Send a browser notification
 */
export function sendNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  return new Notification(title, {
    icon: '/mcp-logo.png',
    badge: '/mcp-logo.png',
    ...options
  });
}

/**
 * Send draw live notification
 */
export function notifyDrawLive(streamTime: string): Notification | null {
  return sendNotification('🎰 Draw is Live!', {
    body: `Winners have been announced! Check if you won and watch the stream starting at ${streamTime}`,
    tag: 'draw-live',
    requireInteraction: true,
    data: { url: '/mini-app/draw' }
  });
}

/**
 * Send reminder notification before draw
 */
export function notifyDrawSoon(minutesUntil: number): Notification | null {
  return sendNotification('⏰ Draw Starting Soon!', {
    body: `Winners will be announced in ${minutesUntil} minutes. Get ready!`,
    tag: 'draw-reminder',
    data: { url: '/mini-app/draw' }
  });
}

/**
 * Check if user has notification permission stored
 */
export function hasNotificationPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Store notification preference in localStorage
 */
export function saveNotificationPreference(walletAddress: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;

  const key = `notification_pref_${walletAddress}`;
  localStorage.setItem(key, JSON.stringify({
    enabled,
    timestamp: Date.now()
  }));
}

/**
 * Get notification preference from localStorage
 */
export function getNotificationPreference(walletAddress: string): boolean {
  if (typeof window === 'undefined') return false;

  const key = `notification_pref_${walletAddress}`;
  const stored = localStorage.getItem(key);

  if (!stored) return false;

  try {
    const pref = JSON.parse(stored);
    return pref.enabled === true;
  } catch {
    return false;
  }
}
