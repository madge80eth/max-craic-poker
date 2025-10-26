'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect root to Mini App
    router.push('/mini-app');
  }, [router]);

  // Show simple loading while redirect happens
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #4c1d95 0%, #581c87 50%, #7c3aed 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        color: 'white',
        fontSize: '1.5rem',
        textAlign: 'center'
      }}>
        Loading Max Craic Poker...
      </div>
    </div>
  );
}