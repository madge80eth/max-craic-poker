import tournaments from "@/public/tournaments.json"

export const metadata = {
  title: "Max Craic Poker - Community Game",
  description: "Community-Rewarded Poker - one winner gets 5% of tournament profits + 5% bonus for sharing!",
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: 'https://max-craic-poker.vercel.app/api/frame-image',
      button: {
        title: 'Launch Max Craic Poker',
        action: {
          type: 'launch_frame',
          name: 'Max Craic Poker',
          url: 'https://max-craic-poker.vercel.app/mini-app',
          splashImageUrl: 'https://max-craic-poker.vercel.app/api/frame-image',
          splashBackgroundColor: '#1e1b4b',
        },
      },
    }),
  }
}

export default function SharePage() {
  return (
    <main style={{ padding: "1rem", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ 
          width: "80px", 
          height: "80px", 
          margin: "0 auto 1rem", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center"
        }}>
          <img 
            src="/mcp-logo.png" 
            alt="Max Craic Poker Logo" 
            style={{ width: '80px', height: '80px', objectFit: 'contain' }}
          />
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "0.5rem 0", color: "#111827" }}>MAX CRAIC</h1>
        <div style={{ color: "#ef4444", fontWeight: "bold", fontSize: "20px", marginBottom: "1rem" }}>POKER</div>
      </div>
      
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "1rem", color: "#111827", textAlign: "center" }}>Community-Rewarded Poker</h2>
        <p style={{ marginBottom: "2rem", fontSize: "18px", color: "#374151", textAlign: "center" }}>
          One winner gets 5% of tournament profits + 5% bonus for sharing!
        </p>
        
        <div style={{ 
          backgroundColor: "white", 
          padding: "1.5rem", 
          borderRadius: "12px", 
          marginBottom: "2rem",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
        }}>
          <h3 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            marginBottom: "1rem", 
            color: "#111827",
            textAlign: "center"
          }}>
            Today's Tournaments ({tournaments.length}):
          </h3>
          {tournaments.map((tournament, index) => (
            <div key={index} style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "0.75rem 0",
              borderBottom: index < tournaments.length - 1 ? "1px solid #f3f4f6" : "none"
            }}>
              <span style={{ fontSize: "16px", fontWeight: "500", color: "#111827" }}>
                {tournament.name}
              </span>
              <span style={{ 
                fontSize: "16px", 
                fontWeight: "700", 
                color: "#7c3aed",
                backgroundColor: "#ede9fe",
                padding: "0.25rem 0.75rem",
                borderRadius: "6px"
              }}>
                {tournament.buyIn}
              </span>
            </div>
          ))}
        </div>
        
        <p style={{ 
          fontSize: "16px", 
          color: "#6b7280", 
          textAlign: "center",
          fontStyle: "italic"
        }}>
          Click "Launch Max Craic Poker" to enter with the full Mini App experience!
        </p>
      </div>
    </main>
  )
}