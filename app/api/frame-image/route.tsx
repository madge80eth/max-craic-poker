import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';
export const preferredRegion = 'auto';

export async function GET() {
  // ✅ Minimal test: should render black text "TEST" on white background
  return new ImageResponse("TEST", {
    width: 400,
    height: 200,
  });
}
