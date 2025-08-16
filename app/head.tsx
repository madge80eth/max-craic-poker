// app/head.tsx
export default function Head() {
  return (
    <>
      <title>Max Craic Poker</title>
      <meta name="description" content="Enter draw, get paid if I cash." />

      {/* Farcaster Frame meta */}
      <meta name="fc:frame" content="vNext" />
      <meta
        name="fc:frame:image"
        content="https://max-craic-poker.vercel.app/frame.png"
      />
      <meta name="fc:frame:button:1" content="Enter Now" />
      <meta
        name="fc:frame:post_url"
        content="https://max-craic-poker.vercel.app/api/enter"
      />

      {/* Required fallback for clients */}
      <meta
        property="og:image"
        content="https://max-craic-poker.vercel.app/frame.png"
      />
    </>
  );
}
