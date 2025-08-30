export default async function Page() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://max-craic-poker.vercel.app";

  let tournaments: string[] = [
    "Sample Game – $55",
    "Sample KO – $109",
  ];

  try {
    const res = await fetch(`${baseUrl}/tournaments.json`, { cache: "no-store" });
    if (res.ok) {
      tournaments = await res.json();
    }
  } catch (e) {
    console.warn("⚠️ Using fallback tournaments because fetch failed:", e);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold">Max Craic Poker</h1>
      <p className="mt-2 text-gray-600">
        Daily draws, onchain rewards, and chaos at the poker table.
      </p>
      <ul className="mt-6 space-y-2">
        {tournaments.map((t, idx) => (
          <li key={idx} className="text-lg">
            {t}
          </li>
        ))}
      </ul>
    </main>
  );
}
