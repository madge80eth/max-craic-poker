// app/share/page.tsx
"use client";

import { Suspense } from "react";
import SharePageInner from "./share-page-inner";

export default function SharePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SharePageInner />
    </Suspense>
  );
}
