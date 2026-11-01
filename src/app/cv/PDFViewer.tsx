"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@heroui/react";
import { FaDownload, FaCompress } from "react-icons/fa";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PDFViewerProps {
  pdfFile: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function PDFViewer({
  pdfFile,
  isFullscreen,
  onToggleFullscreen,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageScale, setPageScale] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const downloadCV = () => {
    const link = document.createElement("a");
    link.href = pdfFile;
    link.download = "Dimitri_Lesas_CV.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative enter enter-duration-500 [--enter-scale:0.95]">
      <div className="p-4 md:p-8">
        <div className="flex flex-col items-center">
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            error={
              <div className="flex flex-col items-center justify-center h-[600px] enter enter-duration-500 [--enter-scale:0.9]">
                <p className="text-red-500 mb-4">Failed to load CV</p>
                <Button
                  variant="primary"
                  onPress={downloadCV}
                >
                  <FaDownload />
                  Download CV Instead
                </Button>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={pageScale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg"
            />
          </Document>

          {/* Page Navigation */}
          {numPages && numPages > 1 && (
            <div className="mt-6 flex items-center gap-4 enter enter-delay-200 [--enter-y:20px]">
              <Button
                size="sm"
                variant="tertiary"
                onPress={() => setPageNumber(Math.max(1, pageNumber - 1))}
                isDisabled={pageNumber <= 1}
              >
                Previous
              </Button>
              <p className="text-sm">
                Page {pageNumber} of {numPages}
              </p>
              <Button
                size="sm"
                variant="tertiary"
                onPress={() =>
                  setPageNumber(Math.min(numPages, pageNumber + 1))
                }
                isDisabled={pageNumber >= numPages}
              >
                Next
              </Button>
            </div>
          )}

          {/* Scale Controls */}
          <div className="mt-4 flex items-center gap-4 enter enter-delay-300 [--enter-y:20px]">
            <Button
              size="sm"
              variant="outline"
              onPress={() => setPageScale(Math.max(0.5, pageScale - 0.1))}
            >
              Zoom Out
            </Button>
            <span className="text-sm">{Math.round(pageScale * 100)}%</span>
            <Button
              size="sm"
              variant="outline"
              onPress={() => setPageScale(Math.min(2, pageScale + 0.1))}
            >
              Zoom In
            </Button>
          </div>
        </div>
      </div>

      {/* Close Fullscreen Button */}
      {isFullscreen && (
        <div className="enter [--enter-scale:0.9]">
          <Button
            className="fixed top-4 right-4 z-50"
            variant="danger-soft"
            onPress={onToggleFullscreen}
          >
            <FaCompress />
            Exit Fullscreen
          </Button>
        </div>
      )}
    </div>
  );
}
