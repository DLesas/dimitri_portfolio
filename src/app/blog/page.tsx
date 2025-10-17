"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

import { FaRss, FaCode, FaLightbulb, FaRocket } from "react-icons/fa";
import { useNavigationSpace } from "@/contexts/NavigationSpaceContext";

export default function BlogPage() {
  const [_email, _setEmail] = useState("");
  const { getAvailableHeight } = useNavigationSpace();

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <motion.div
      className="py-12 px-6 flex items-center justify-center"
      style={{ minHeight: getAvailableHeight() }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl w-full mx-auto">
        {/* Hero Section */}
        <div className="text-center flex flex-col items-center justify-center mb-16">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <FaRss className="text-6xl text-primary mx-auto mb-6" />
              <motion.div
                className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                Soon
              </motion.div>
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Blog Coming Soon
          </motion.h1>

          <motion.p
            className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            I&apos;m working on something exciting! My blog will feature
            in-depth articles about web development, AI, performance
            optimization, and insights from my journey as a full-stack engineer.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4 justify-center mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <FaCode className="text-primary" />
              <span className="text-sm font-medium">Technical Tutorials</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full">
              <FaLightbulb className="text-secondary" />
              <span className="text-sm font-medium">Industry Insights</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full">
              <FaRocket className="text-green-500" />
              <span className="text-sm font-medium">Best Practices</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
