'use client';

import Confetti from 'react-confetti';
import Countdown from 'react-countdown';
import { useEffect, useState } from 'react';

export function EnterButton({ tournaments }: { tournaments: string[] }) {
  const [entered, setEntered] = useState(false);
  const [assigned, setAssigned] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [drawDeadline, setDrawDeadline] = useState<Date | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch('/session.json');
      const data = await res.json();
      const start = new Date(data.sessionStart);
      const deadline = new Date(start.getTime() + 8 * 60 * 60 * 1000);
      setDrawDeadline(deadline);
    };
    fetchSession();
  }, []);

  const handleClick = async () => {
    const fid = 'fid_123456'; // Replace with actual FID capture later

    const randomTournament =
      tournaments[Math.floor(Math.random() * tournaments.length)];

    const res = await fetch('/api/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fid, tournament: randomTournament }),
    });

    const result = await res.json();

    if (result.status === 'ok' || result.status === 'exists') {
      setAssigned(result.assigned);
      setEntered(true);
      setShowConfetti(true);
    }
  };

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  return !entered ? (
    <button
      onClick={handleClick}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Enter Now
    </button>
  ) : (
    <div className="mt-4 text-green-500 text-lg font-semibold relative">
      {showConfetti && <Confetti />}
      ✅ You’re entered! Thanks for supporting Max Craic Poker.
      <br />
      Draw in &lt;8 hours&gt;. If we cash, 5% to you — 10% if recasted.
      <br />
      🎯 Assigned: {assigned}
      {drawDeadline && (
        <>
          <br />
          ⏳ Draw closes in:{' '}
          <Countdown
            date={drawDeadline}
            daysInHours={true}
            zeroPadTime={2}
            onComplete={() => console.log('🎯 Draw closed')}
          />
        </>
      )}
    </div>
  );
}
