// app/share/head.tsx
export default function Head() {
  return (
    <>
      <title>Max Craic Poker — Share</title>

      <meta name="fc:frame" content="vNext" />
      <meta
        name="fc:frame:image"
        content="https://max-craic-poker.vercel.app/api/frame-image"
      />
      <meta name="fc:frame:button:1" content="Enter Now" />
      <meta
        name="fc:frame:post_url"
        content="https://max-craic-poker.vercel.app/api/enter"
      />

      <meta
        property="og:image"
        content="https://max-craic-poker.vercel.app/api/frame-image"
      />
    </>
  );
}
