// app/share/page.tsx
"use client";

import { useState, useEffect } from "react";

export default function SharePage() {
  const [tournaments, setTournaments] = useState<string[]>([]);
  const [entered, setEntered] = useState(false);

  // Load tournaments.json
  useEffect(() => {
    fetch("/tournaments.json")
      .then((res) => res.json())
      .then((data) => setTournaments(data))
      .catch(() => setTournaments([]));
  }, []);

  async function handleEnter() {
    try {
      const res = await fetch("/api/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ untrustedData: { fid: 12345 } }), // TODO: replace with real FID
      });
      if (res.ok) {
        setEntered(true);
      }
    } catch (err) {
      console.error("Enter failed", err);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-6">
      <h1 className="text-4xl font-bold mb-4">Max Craic Poker</h1>
      <p className="text-lg text-gray-400 mb-8">
        Daily draws, onchain rewards, and chaos at the poker table.
      </p>

      {entered ? (
        <div className="bg-green-600 text-white px-6 py-4 rounded-lg text-xl">
          🎉 You&apos;re entered! Recast the Frame for a bonus chance.
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-semibold mb-4">Today&apos;s Tournaments</h2>
          <ul className="mb-6 text-lg space-y-2">
            {tournaments.map((t, i) => (
              <li key={i}>🃏 {t}</li>
            ))}
          </ul>

          <button
            onClick={handleEnter}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg text-xl"
          >
            Enter Now
          </button>
        </>
      )}

      <div className="mt-12 p-6 bg-gray-900 rounded-lg text-center max-w-lg">
        <p className="mb-3 text-lg">
          📺 Join me live on{" "}
          <a
            href="https://retake.tv/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 underline"
          >
            Retake.tv
          </a>{" "}
          to watch the Community Game unfold and learn about poker in real time.
        </p>
      </div>
    </main>
  );
}
