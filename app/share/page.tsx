"use client";

import { useEffect } from "react";
import { actions } from "@farcaster/frame-sdk";

export default function SharePage() {
  useEffect(() => {
    // Notify Warpcast Mini App container that we're ready
    actions.ready();
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold">Max Craic Poker</h1>
      <p className="mt-2 text-gray-600">
        Daily draws, onchain rewards, and chaos at the poker table.
      </p>
    </main>
  );
}
