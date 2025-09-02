// app/share/page.tsx

import tournaments from "@/public/tournaments.json"

export default function SharePage() {
  const communityTournament = tournaments[0] // ✅ get first tournament

  if (!communityTournament) {
    return <div>No tournament data available</div>
  }

  return (
    <main style={{ padding: "1rem" }}>
      <h1>Max Craic Poker</h1>
      <h2>{communityTournament.name || "Unknown Tournament"}</h2>
      <p>Buy-in: {communityTournament.buyIn || "N/A"}</p>
    </main>
  )
}
// force redeploy
