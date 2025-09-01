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
  const [tournament, setTournament] = useState<Tournament | null>(null);

  // ⚠️ Stub FID for local testing — in production this comes from frame payload
  const fid = 123;

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
          setTournament(data.tournament || null);
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
        setTournament(data.tournament || null);
      } else if (data.alreadyEntered) {
        setStatus("entered");
        setMessage(`You’re already in! FID: ${data.fid}`);
        setTournament(data.tournament || null);
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
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      {status === "loading" && <div>Loading...</div>}

      {status === "idle" && (
        <>
          <h1 className="text-2xl font-bold mb-4">Max Craic Poker Draw</h1>
          <button
            onClick={handleEnter}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Enter Now
          </button>
        </>
      )}

      {status === "entered" && (
        <div className="text-green-600 font-semibold text-center">
          {message}
          {tournament && (
            <p className="mt-2">
              Tournament: <strong>{tournament.name}</strong> (
              {tournament.buyIn})
            </p>
          )}
        </div>
      )}

      {status === "no-fid" && (
        <div className="text-red-600 text-center">
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
