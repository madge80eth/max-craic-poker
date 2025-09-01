// app/share/head.tsx
export default function Head() {
  const frameMeta = {
    version: "next",
    imageUrl: "https://max-craic-poker.vercel.app/api/frame-image",
    button: {
      title: "Enter Now",
      action: {
        type: "launch_frame",
        name: "Max Craic Poker",
        url: "https://max-craic-poker.vercel.app/api/frame",
      },
    },
  };

  return (
    <>
      <title>Max Craic Poker Draw</title>
      <meta
        name="description"
        content="Daily draws, onchain rewards, and chaos at the poker table."
      />

      {/* Base/Farcaster Frame Meta */}
      <meta name="fc:frame" content={JSON.stringify(frameMeta)} />

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
