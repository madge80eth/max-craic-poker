'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import {
  requestNotificationPermission,
  hasNotificationPermission,
  saveNotificationPreference,
  getNotificationPreference
} from '@/lib/notifications';

interface NotificationToggleProps {
  walletAddress: string;
}

export default function NotificationToggle({ walletAddress }: NotificationToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if (typeof window !== 'undefined' && !('Notification' in window)) {
      setBrowserSupported(false);
      return;
    }

    // Load saved preference
    const savedPref = getNotificationPreference(walletAddress);
    const hasPermission = hasNotificationPermission();

    setEnabled(savedPref && hasPermission);
  }, [walletAddress]);

  const handleToggle = async () => {
    if (!browserSupported) return;

    if (!enabled) {
      setIsRequesting(true);
      const granted = await requestNotificationPermission();
      setIsRequesting(false);

      if (granted) {
        setEnabled(true);
        saveNotificationPreference(walletAddress, true);

        // Send test notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🔔 Notifications Enabled!', {
            body: 'You\'ll be notified when the draw goes live',
            icon: '/mcp-logo.png',
            tag: 'notification-enabled'
          });
        }
      }
    } else {
      setEnabled(false);
      saveNotificationPreference(walletAddress, false);
    }
  };

  if (!browserSupported) {
    return (
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <p className="text-white/60 text-xs text-center">
          Browser notifications not supported
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isRequesting}
      className={`w-full rounded-lg p-4 border transition-all ${
        enabled
          ? 'bg-blue-500/20 border-blue-400/40 hover:bg-blue-500/30'
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      } ${isRequesting ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {enabled ? (
            <Bell className="w-5 h-5 text-blue-300" />
          ) : (
            <BellOff className="w-5 h-5 text-white/60" />
          )}
          <div className="text-left">
            <p className="text-white text-sm font-semibold">
              {enabled ? 'Notifications On' : 'Enable Notifications'}
            </p>
            <p className="text-white/60 text-xs">
              {enabled
                ? 'You\'ll be alerted when the draw is live'
                : 'Get notified when winners are announced'}
            </p>
          </div>
        </div>
        <div
          className={`w-12 h-6 rounded-full relative transition-colors ${
            enabled ? 'bg-blue-500' : 'bg-white/20'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </div>
      </div>
    </button>
  );
}
