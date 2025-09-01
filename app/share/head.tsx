// app/share/head.tsx
export default function Head() {
  return (
    <>
      <title>Max Craic Poker Draw</title>
      <meta
        name="description"
        content="Daily draws, onchain rewards, and chaos at the poker table."
      />

      {/* Farcaster Frame Meta */}
      <meta name="fc:frame" content="vNext" />
      <meta
        name="fc:frame:image"
        content="https://max-craic-poker.vercel.app/api/frame-image"
      />
      <meta name="fc:frame:button:1" content="Enter Now" />
      <meta
        name="fc:frame:post_url"
        content="https://max-craic-poker.vercel.app/api/frame"
      />

      {/* OpenGraph fallback */}
      <meta
        property="og:image"
        content="https://max-craic-poker.vercel.app/api/frame-image"
      />
      <meta property="og:title" content="Max Craic Poker Draw" />
      <meta
        property="og:description"
        content="Enter the daily draw and join the community game."
      />
    </>
  );
}
