// app/head.tsx
export default function Head() {
  return (
    <>
      <title>Max Craic Poker</title>
      <meta name="description" content="Enter draw, get paid if I cash." />

      {/* Generic OpenGraph tags */}
      <meta
        property="og:image"
        content="https://max-craic-poker.vercel.app/api/frame-image"
      />
    </>
  );
}
