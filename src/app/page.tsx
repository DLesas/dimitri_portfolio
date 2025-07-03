"use client";

import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import Link from "next/link";
import NetworkBackground from "@/components/NetworkBackground";
import { useNavigationSpace } from "@/contexts/NavigationSpaceContext";

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
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

const buttonVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.15,
    },
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },
};

export default function HomePage() {
  const { getAvailableHeight } = useNavigationSpace();

  return (
    <NetworkBackground className="w-full flex-1">
      <motion.div
        className="relative z-10 flex items-center justify-center"
        style={{ minHeight: getAvailableHeight() }}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-center max-w-4xl mx-auto px-6"
          variants={staggerContainer}
        >
          <motion.h1
            className="text-6xl md:text-7xl font-bold mb-8 leading-tight"
            variants={itemVariants}
            data-network-collider
          >
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Dimitri Lesas
            </span>
          </motion.h1>

          <motion.h2
            className="text-2xl md:text-3xl text-foreground/90 mb-8 font-light"
            variants={itemVariants}
            data-network-collider
          >
            Full Stack Engineer & Data Scientist
          </motion.h2>

          <motion.p
            className="text-xl text-foreground/60 mb-12 max-w-2xl mx-auto leading-relaxed"
            variants={itemVariants}
            data-network-collider
          >
            Building bridges between complex data and elegant solutions.
            Crafting intelligent applications that transform insights into
            impact.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={itemVariants}
            data-network-collider
          >
            <motion.div variants={buttonVariants} whileHover="hover">
              <Button
                as={Link}
                href="/about"
                color="primary"
                size="lg"
                className="font-medium px-8"
              >
                Learn More About Me
              </Button>
            </motion.div>
            <motion.div variants={buttonVariants} whileHover="hover">
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
        </motion.div>
      </motion.div>
    </NetworkBackground>
  );
}
