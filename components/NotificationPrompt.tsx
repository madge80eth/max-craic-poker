'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

interface NotificationPromptProps {
  /** Optional: specific message to display */
  message?: string;
}

/**
 * Sleek notification prompt encouraging users to enable notifications
 * Shows once per session, dismissible
 */
export default function NotificationPrompt({ message }: NotificationPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this session
    const dismissed = sessionStorage.getItem('notification_prompt_dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show after a short delay for better UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('notification_prompt_dismissed', 'true');
  };

  if (isDismissed || !isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="max-w-md mx-auto bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-xl border border-blue-400/30 shadow-lg">
        <div className="p-4 flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-300" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm mb-1">
              Get notified when draws go live
            </h3>
            <p className="text-blue-200/80 text-xs leading-relaxed">
              {message || "Enable notifications to know instantly when winners are announced"}
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/60 hover:text-white transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
