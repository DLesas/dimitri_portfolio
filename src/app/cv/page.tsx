"use client";

import React, { useState } from "react";
import { Button } from "@heroui/react";
import { buttonVariants as buttonStyles } from "@heroui/styles";
import { FaDownload, FaExpand } from "react-icons/fa";
import dynamic from "next/dynamic";
import { CV_PATH } from "@/lib/seo";

// Dynamically import PDF components to avoid SSR issues
// @ts-ignore: dynamic import for PDFViewer, avoids SSR issues
const PDFViewer = dynamic(() => import("./PDFViewer"), {
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

// Hover lift for the action buttons
const buttonHover = "transition-transform duration-200 hover:scale-105";
// Mobile buttons scale in one after the other, after the header
const buttonEntrance = `enter enter-duration-300 [--enter-scale:0.9] ${buttonHover}`;

export default function CVPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pdfFile = CV_PATH;

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-auto enter">
        <PDFViewer
          pdfFile={pdfFile}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Buttons - Desktop Only */}
      <div className="hidden lg:flex fixed right-8 top-1/2 transform -translate-y-1/2 z-30 flex-col gap-4 enter enter-delay-200 enter-duration-500">
        <div className={buttonHover}>
          {/* A real link to the PDF, so search engines can find and index the CV */}
          <a
            href={encodeURI(pdfFile)}
            download="Dimitri_Lesas_CV.pdf"
            className={buttonStyles({
              variant: "primary",
              size: "lg",
              className: "font-medium shadow-lg backdrop-blur-sm",
            })}
          >
            <FaDownload />
            Download CV
          </a>
        </div>
        <div className={buttonHover}>
          <Button
            variant="outline"
            size="lg"
            onPress={toggleFullscreen}
            className="font-medium shadow-lg backdrop-blur-sm border-secondary text-secondary"
          >
            <FaExpand />
            Fullscreen
          </Button>
        </div>
      </div>

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

        {/* Mobile Action Buttons - Above PDF */}
        <div className="lg:hidden mb-6 flex gap-4 justify-center flex-wrap enter">
          <div className={`${buttonEntrance} enter-delay-100`}>
            <a
              href={encodeURI(pdfFile)}
              download="Dimitri_Lesas_CV.pdf"
              className={buttonStyles({
                variant: "primary",
                size: "lg",
                className: "font-medium",
              })}
            >
              <FaDownload />
              Download CV
            </a>
          </div>
          <div className={`${buttonEntrance} enter-delay-200`}>
            <Button
              variant="outline"
              size="lg"
              onPress={toggleFullscreen}
              className="font-medium border-secondary text-secondary"
            >
              <FaExpand />
              Fullscreen
            </Button>
          </div>
        </div>

        {/* PDF Viewer - Centered */}
        <PDFViewer
          pdfFile={pdfFile}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </>
  );
}
