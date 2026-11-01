"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CVActions } from "./CVActions";

// Dynamically import PDF components to avoid SSR issues
const PDFViewer = dynamic(() => import("./PDFViewer").then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[600px]">
      <div className="w-full max-w-[600px] space-y-4">
        <div className="w-full h-[800px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="flex justify-center">
          <p className="text-foreground/60 enter enter-delay-200">
            Loading PDF document...
          </p>
        </div>
      </div>
    </div>
  ),
});

export default function CVPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-auto enter">
        <PDFViewer isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
      </div>
    );
  }

  return (
    <>
      <CVActions variant="floating" onFullscreen={toggleFullscreen} />

      <div className="min-h-full max-w-6xl mx-auto py-12 px-6 lg:px-8 enter enter-duration-500 [--enter-y:20px]">
        {/* Header Section */}
        <div className="text-center mb-8 enter">
          <h1 className="text-4xl font-bold mb-4 enter enter-delay-100 enter-duration-500 [--enter-y:30px]">
            My CV
          </h1>
          <p className="text-foreground/60 mb-6 enter enter-delay-200 enter-duration-500 [--enter-y:30px]">
            Download my CV or view it directly below
          </p>
        </div>

        <CVActions variant="inline" onFullscreen={toggleFullscreen} />

        {/* PDF Viewer - Centered */}
        <PDFViewer isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
      </div>
    </>
  );
}
