"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@heroui/react";
import { FaDownload, FaCompress } from "react-icons/fa";
import { motion } from "framer-motion";

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

const pdfVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
    },
  },
};

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
    <motion.div
      className="relative"
      variants={pdfVariants}
      initial="initial"
      animate="animate"
    >
      <div className="p-4 md:p-8">
        <div className="flex flex-col items-center">
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            error={
              <motion.div
                className="flex flex-col items-center justify-center h-[600px]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-red-500 mb-4">Failed to load CV</p>
                <Button
                  color="primary"
                  onClick={downloadCV}
                  startContent={<FaDownload />}
                >
                  Download CV Instead
                </Button>
              </motion.div>
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
            <motion.div
              className="mt-6 flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
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
            </motion.div>
          )}

          {/* Scale Controls */}
          <motion.div
            className="mt-4 flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
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
          </motion.div>
        </div>
      </div>

      {/* Close Fullscreen Button */}
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            className="fixed top-4 right-4 z-50"
            color="danger"
            variant="flat"
            onClick={onToggleFullscreen}
            startContent={<FaCompress />}
          >
            Exit Fullscreen
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
