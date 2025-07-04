"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button, Skeleton } from "@heroui/react";
import { FaDownload, FaExpand, FaCompress } from "react-icons/fa";
import { motion } from "framer-motion";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

const buttonVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },
};

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

export default function CVClientPage() {
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
        <motion.div className="text-center mb-8" variants={staggerContainer}>
          <motion.h1
            className="text-4xl font-bold mb-4"
            variants={itemVariants}
          >
            My CV
          </motion.h1>
          <motion.p
            className="text-gray-600 dark:text-gray-400 mb-6"
            variants={itemVariants}
          >
            Download my CV or view it directly below
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            className="flex gap-4 justify-center flex-wrap"
            variants={itemVariants}
          >
            <motion.div variants={buttonVariants} whileHover="hover">
              <Button
                color="primary"
                size="lg"
                startContent={<FaDownload />}
                onClick={downloadCV}
                className="font-medium"
              >
                Download PDF
              </Button>
            </motion.div>
            <motion.div variants={buttonVariants} whileHover="hover">
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
            </motion.div>
          </motion.div>
        </motion.div>

        {/* PDF Viewer */}
        <motion.div
          className={`${isFullscreen ? "fixed inset-4 z-50" : ""}`}
          variants={pdfVariants}
        >
          <div className="p-4 md:p-8">
            <div className="flex flex-col items-center">
              <Document
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <motion.div
                    className="flex flex-col items-center justify-center h-[600px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Skeleton className="w-full max-w-[600px] h-[800px] rounded-lg" />
                    <p className="mt-4 text-gray-500">Loading CV...</p>
                  </motion.div>
                }
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
        </motion.div>

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
              onClick={toggleFullscreen}
              startContent={<FaCompress />}
            >
              Exit Fullscreen
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
