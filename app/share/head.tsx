// app/share/head.tsx

export default function Head() {
  return (
    <>
      <title>Max Craic Poker — Share</title>

      <meta property="fc:frame" content="vNext" />
      <meta
        property="fc:frame:image"
        content="https://max-craic-poker.vercel.app/api/frame-image"
      />
      <meta
        property="fc:frame:post_url"
        content="https://max-craic-poker.vercel.app/api/enter"
      />
      <meta property="fc:frame:button:1" content="Enter Now" />
    </>
  )
}
