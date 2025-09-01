// app/share/share-page-inner.tsx
"use client";

import { useState, useEffect } from "react";

type Tournament = {
  name: string;
  buyIn: string;
};

export default function SharePageInner() {
  const [status, setStatus] = useState<
    "loading" | "idle" | "entered" | "no-fid" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  // ⚠️ Stub FID for local testing — in production this comes from frame payload
  const fid = 123;

  // Load tournaments
  useEffect(() => {
    async function loadTournaments() {
      try {
        const res = await fetch("/tournaments.json");
        if (res.ok) {
          const data = await res.json();
          setTournaments(data);
        }
      } catch (err) {
        console.error("Failed to load tournaments", err);
      }
    }
    loadTournaments();
  }, []);

  // Check if already entered on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ untrustedData: { fid } }),
        });
        const data = await res.json();

        if (data.error?.includes("FID required")) {
          setStatus("no-fid");
          setMessage(data.error);
        } else if (data.entered) {
          setStatus("entered");
          setMessage(`You’re already in! FID: ${data.fid}`);
        } else {
          setStatus("idle");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Network error.");
      }
    }
    checkStatus();
  }, []);

  async function handleEnter() {
    try {
      const res = await fetch("/api/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ untrustedData: { fid } }),
      });

      const data = await res.json();

      if (data.error?.includes("FID required")) {
        setStatus("no-fid");
        setMessage(data.error);
      } else if (data.success) {
        setStatus("entered");
        setMessage(`You’re in! FID: ${data.fid}`);
      } else if (data.alreadyEntered) {
        setStatus("entered");
        setMessage(`You’re already in! FID: ${data.fid}`);
      } else {
        setStatus("error");
        setMessage("Unexpected error. Please try again.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error.");
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 space-y-4">
      {status === "loading" && <div>Loading...</div>}

      {status === "idle" && (
        <>
          <h1 className="text-2xl font-bold">Max Craic Poker Draw</h1>

          {tournaments.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {tournaments.map((t, idx) => (
                <li key={idx} className="border p-2 rounded bg-gray-800 text-white">
                  {t.name} — {t.buyIn}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 mt-4">No tournaments found.</p>
          )}

          <button
            onClick={handleEnter}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Enter Now
          </button>
        </>
      )}

      {status === "entered" && (
        <div className="text-green-600 font-semibold">{message}</div>
      )}

      {status === "no-fid" && (
        <div className="text-red-600">
          {message} <br />
          <a
            href="https://warpcast.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-500"
          >
            Create a Farcaster account
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="text-red-600">Something went wrong: {message}</div>
      )}
    </main>
  );
}
