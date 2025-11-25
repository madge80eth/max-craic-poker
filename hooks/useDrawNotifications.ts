import { useEffect, useRef } from 'react';
import { notifyDrawLive, notifyDrawSoon, getNotificationPreference } from '@/lib/notifications';

interface UseDrawNotificationsProps {
  walletAddress: string | undefined;
  streamStartTime: Date | null;
  hasWinners: boolean;
}

/**
 * Hook to monitor draw status and send notifications
 */
export function useDrawNotifications({
  walletAddress,
  streamStartTime,
  hasWinners
}: UseDrawNotificationsProps) {
  const hasNotifiedDrawLive = useRef(false);
  const hasNotified15Min = useRef(false);

  useEffect(() => {
    // Only run if user has enabled notifications
    if (!walletAddress || !getNotificationPreference(walletAddress)) {
      return;
    }

    // Check every minute for draw status
    const checkInterval = setInterval(() => {
      // Notify when draw goes live (winners announced)
      if (hasWinners && !hasNotifiedDrawLive.current) {
        const streamTimeStr = streamStartTime
          ? streamStartTime.toLocaleString('en-GB', {
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'soon';

        const notification = notifyDrawLive(streamTimeStr);

        if (notification) {
          hasNotifiedDrawLive.current = true;

          // Handle notification click to open draw page
          notification.onclick = () => {
            window.focus();
            window.location.href = '/mini-app/draw';
          };
        }
      }

      // Notify 15 minutes before draw (30 mins before stream = draw time)
      if (streamStartTime && !hasNotified15Min.current && !hasWinners) {
        const now = Date.now();
        const drawTime = streamStartTime.getTime() - (30 * 60 * 1000); // 30 mins before stream
        const fifteenMinsBefore = drawTime - (15 * 60 * 1000);

        // If we're within 15 mins of draw time and haven't notified yet
        if (now >= fifteenMinsBefore && now < drawTime) {
          const minutesUntil = Math.round((drawTime - now) / (60 * 1000));

          if (minutesUntil > 0) {
            const notification = notifyDrawSoon(minutesUntil);

            if (notification) {
              hasNotified15Min.current = true;

              notification.onclick = () => {
                window.focus();
                window.location.href = '/mini-app/draw';
              };
            }
          }
        }
      }
    }, 60000); // Check every minute

    // Also check immediately
    if (hasWinners && !hasNotifiedDrawLive.current) {
      const streamTimeStr = streamStartTime
        ? streamStartTime.toLocaleString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'soon';

      const notification = notifyDrawLive(streamTimeStr);

      if (notification) {
        hasNotifiedDrawLive.current = true;

        notification.onclick = () => {
          window.focus();
          window.location.href = '/mini-app/draw';
        };
      }
    }

    return () => clearInterval(checkInterval);
  }, [walletAddress, streamStartTime, hasWinners]);

  // Reset notification flags when a new session starts
  useEffect(() => {
    if (!hasWinners) {
      hasNotifiedDrawLive.current = false;
      hasNotified15Min.current = false;
    }
  }, [hasWinners]);
}
