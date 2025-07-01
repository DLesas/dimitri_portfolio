"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button, Card, CardBody, Skeleton } from "@heroui/react";
import { FaDownload, FaExpand, FaCompress } from "react-icons/fa";
import { motion } from "framer-motion";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function CVPage() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageScale, setPageScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pdfFile = "/Dimitri Lesas.pdf";

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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setPageScale(isFullscreen ? 1 : 1.5);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <motion.div
      className="min-h-full max-w-5xl mx-auto py-12 px-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">My CV</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Download my CV or view it directly below
          </p>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              color="primary"
              size="lg"
              startContent={<FaDownload />}
              onClick={downloadCV}
              className="font-medium"
            >
              Download PDF
            </Button>
            <Button
              color="secondary"
              variant="bordered"
              size="lg"
              startContent={isFullscreen ? <FaCompress /> : <FaExpand />}
              onClick={toggleFullscreen}
              className="font-medium"
            >
              {isFullscreen ? "Exit Fullscreen" : "View Fullscreen"}
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className={`${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
          <div className="p-4 md:p-8">
            <div className="flex flex-col items-center">
              <Document
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex flex-col items-center justify-center h-[600px]">
                    <Skeleton className="w-full max-w-[600px] h-[800px] rounded-lg" />
                    <p className="mt-4 text-gray-500">Loading CV...</p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center h-[600px]">
                    <p className="text-red-500 mb-4">Failed to load CV</p>
                    <Button
                      color="primary"
                      onClick={downloadCV}
                      startContent={<FaDownload />}
                    >
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
                <div className="mt-6 flex items-center gap-4">
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    isDisabled={pageNumber <= 1}
                  >
                    Previous
                  </Button>
                  <p className="text-sm">
                    Page {pageNumber} of {numPages}
                  </p>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={() =>
                      setPageNumber(Math.min(numPages, pageNumber + 1))
                    }
                    isDisabled={pageNumber >= numPages}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Scale Controls */}
              <div className="mt-4 flex items-center gap-4">
                <Button
                  size="sm"
                  variant="bordered"
                  onClick={() => setPageScale(Math.max(0.5, pageScale - 0.1))}
                >
                  Zoom Out
                </Button>
                <span className="text-sm">{Math.round(pageScale * 100)}%</span>
                <Button
                  size="sm"
                  variant="bordered"
                  onClick={() => setPageScale(Math.min(2, pageScale + 0.1))}
                >
                  Zoom In
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Close Fullscreen Button */}
        {isFullscreen && (
          <Button
            className="fixed top-4 right-4 z-50"
            color="danger"
            variant="flat"
            onClick={toggleFullscreen}
            startContent={<FaCompress />}
          >
            Exit Fullscreen
          </Button>
        )}
      </div>
    </motion.div>
  );
}
