"use client";

import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import Link from "next/link";
import NetworkBackground from "@/components/NetworkBackground";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

export default function HomePage() {
  return (
    <NetworkBackground className="w-full flex-1">
      <div className="relative z-10 min-h-[80vh] flex items-center justify-center">
        <motion.div
          className="text-center max-w-4xl mx-auto px-6"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1
            className="text-6xl md:text-7xl font-bold mb-8 leading-tight"
            variants={fadeInUp}
            data-network-collider
          >
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dimitri Lesas
            </span>
          </motion.h1>

          <motion.h2
            className="text-2xl md:text-3xl text-foreground/90 mb-8 font-light"
            variants={fadeInUp}
            data-network-collider
          >
            Full Stack Engineer & Data Scientist
          </motion.h2>

          <motion.p
            className="text-xl text-foreground/60 mb-12 max-w-2xl mx-auto leading-relaxed"
            variants={fadeInUp}
            data-network-collider
          >
            Building bridges between complex data and elegant solutions.
            Crafting intelligent applications that transform insights into
            impact.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={fadeInUp}
            data-network-collider
          >
            <Button
              as={Link}
              href="/about"
              color="primary"
              size="lg"
              className="font-medium px-8"
            >
              Learn More About Me
            </Button>
            <Button
              as={Link}
              href="/projects"
              variant="bordered"
              size="lg"
              className="font-medium px-8"
            >
              View My Work
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </NetworkBackground>
  );
}
