// app/share/page.tsx
import SharePageInner from "./share-page-inner";

export const metadata = {
  title: "Max Craic Poker Draw",
  description: "Daily draws, onchain rewards, and chaos at the poker table.",
  other: {
    "fc:frame":
      '{"version":"next","imageUrl":"https://max-craic-poker.vercel.app/api/frame-image","button":{"title":"Enter Now","action":{"type":"launch_frame","name":"Max Craic Poker","url":"https://max-craic-poker.vercel.app/api/frame"}}}',
  },
  openGraph: {
    title: "Max Craic Poker Draw",
    description: "Enter the daily draw and join the community game.",
    images: [
      {
        url: "https://max-craic-poker.vercel.app/api/frame-image",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function Page() {
  return <SharePageInner />;
}
