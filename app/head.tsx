// app/head.tsx
export default function Head() {
  return (
    <>
      <title>Max Craic Poker</title>
      <meta name="description" content="Enter draw, get paid if I cash." />

      {/* Generic OpenGraph tags */}
      <meta
        property="og:image"
        content="https://maxcraicpoker.com/api/frame-image"
      />
    </>
  );
}
