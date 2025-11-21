'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sdk } from '@farcaster/frame-sdk';

export default function MiniAppHome() {
  const router = useRouter();

  // CRITICAL: Call sdk.actions.ready() to dismiss Farcaster splash screen
  // DO NOT REMOVE - Prevents purple screen hang on Farcaster
  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error('SDK ready error:', error);
      }
    };
    initSDK();
  }, []);

  // Redirect to home page (Madge interactive game)
  useEffect(() => {
    router.push('/mini-app/home');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  );
}
