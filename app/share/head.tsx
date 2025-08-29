// app/share/head.tsx
export default function Head() {
  return (
    <>
      <title>Max Craic Poker — Share</title>

      {/* Required Farcaster Frame meta */}
      <meta name="fc:frame" content="vNext" />
      <meta
        name="fc:frame:image"
        content="https://max-craic-poker.vercel.app/api/frame-image?v=11"
      />
      <meta name="fc:frame:button:1" content="Enter Now" />
      <meta
        name="fc:frame:post_url"
        content="https://max-craic-poker.vercel.app/api/enter"
      />

      {/* Open Graph fallback for Warpcast previews */}
      <meta
        property="og:image"
        content="https://max-craic-poker.vercel.app/api/frame-image?v=11"
      />
    </>
  );
}
