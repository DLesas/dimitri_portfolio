"use client";

import { lazy, Suspense } from "react";
import { useDebug } from "@/contexts/DebugContext";

// r3f-perf is debug-only, so it loads only when debug mode is switched on
const Perf = lazy(() => import("r3f-perf").then((m) => ({ default: m.Perf })));

/** r3f-perf's performance panel for the canvas it's in, while debug mode is on */
export default function DebugPerf() {
  const { isDebugEnabled } = useDebug();
  if (!isDebugEnabled) return null;
  return (
    // Only the performance panel waits on its lazy chunk
    <Suspense fallback={null}>
      <Perf position="bottom-right" antialias={false} showGraph deepAnalyze={false} matrixUpdate={false} />
    </Suspense>
  );
}
