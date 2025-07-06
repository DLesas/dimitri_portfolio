"use client";

import React, { useState } from "react";
import { Button } from "@heroui/react";
import { FaDownload, FaExpand } from "react-icons/fa";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import PDF components to avoid SSR issues
// @ts-ignore: dynamic import for PDFViewer, avoids SSR issues
const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[600px]">
      <div className="w-full max-w-[600px] space-y-4">
        <div className="w-full h-[800px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="flex justify-center">
          <motion.p
            className="text-foreground/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Loading PDF document...
          </motion.p>
        </div>
      </div>
    </div>
  ),
});

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

export default function CVPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pdfFile = "/Dimitri Lesas.pdf";

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
  };

  if (isFullscreen) {
    return (
      <motion.div
        className="fixed inset-0 z-50 bg-background overflow-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <PDFViewer
          pdfFile={pdfFile}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </motion.div>
    );
  }

  return (
    <>
      {/* Floating Action Buttons - Desktop Only */}
      <motion.div
        className="hidden lg:flex fixed right-8 top-1/2 transform -translate-y-1/2 z-30 flex-col gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.div variants={buttonVariants} whileHover="hover">
          <Button
            color="primary"
            size="lg"
            startContent={<FaDownload />}
            onClick={downloadCV}
            className="font-medium shadow-lg backdrop-blur-sm"
          >
            Download CV
          </Button>
        </motion.div>
        <motion.div variants={buttonVariants} whileHover="hover">
          <Button
            color="secondary"
            variant="bordered"
            size="lg"
            startContent={<FaExpand />}
            onClick={toggleFullscreen}
            className="font-medium shadow-lg backdrop-blur-sm"
          >
            Fullscreen
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="min-h-full max-w-6xl mx-auto py-12 px-6 lg:px-8"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section */}
        <motion.div className="text-center mb-8" variants={staggerContainer}>
          <motion.h1
            className="text-4xl font-bold mb-4"
            variants={itemVariants}
          >
            My CV
          </motion.h1>
          <motion.p className="text-foreground/60 mb-6" variants={itemVariants}>
            Download my CV or view it directly below
          </motion.p>
        </motion.div>

        {/* Mobile Action Buttons - Above PDF */}
        <motion.div
          className="lg:hidden mb-6 flex gap-4 justify-center flex-wrap"
          variants={staggerContainer}
        >
          <motion.div variants={buttonVariants} whileHover="hover">
            <Button
              color="primary"
              size="lg"
              startContent={<FaDownload />}
              onClick={downloadCV}
              className="font-medium"
            >
              Download CV
            </Button>
          </motion.div>
          <motion.div variants={buttonVariants} whileHover="hover">
            <Button
              color="secondary"
              variant="bordered"
              size="lg"
              startContent={<FaExpand />}
              onClick={toggleFullscreen}
              className="font-medium"
            >
              Fullscreen
            </Button>
          </motion.div>
        </motion.div>

        {/* PDF Viewer - Centered */}
        <PDFViewer
          pdfFile={pdfFile}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </motion.div>
    </>
  );
}
