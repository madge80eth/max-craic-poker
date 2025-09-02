// app/share/page.tsx

import tournaments from "@/public/tournaments.json"

export const metadata = {
  title: "Max Craic Poker — Share",
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://max-craic-poker.vercel.app/api/frame-image",
    "fc:frame:post_url": "https://max-craic-poker.vercel.app/api/enter",
    "fc:frame:button:1": "Enter Now"
  }
}

export default function SharePage() {
  const communityTournament = tournaments[0]

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
