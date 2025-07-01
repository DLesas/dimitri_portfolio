"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from "@heroui/react";
import {
  FaRss,
  FaCode,
  FaLightbulb,
  FaRocket,
  FaNewspaper,
  FaEnvelope,
  FaGithub,
  FaLinkedin,
  FaTwitter,
} from "react-icons/fa";

export default function BlogPage() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubscribed(true);
    setIsLoading(false);
    setEmail("");
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
  };

  const iconVariants = {
    initial: { scale: 0 },
    animate: { scale: 1 },
    hover: { scale: 1.2, rotate: 360, transition: { duration: 0.3 } },
  };

  const upcomingTopics = [
    {
      icon: FaCode,
      title: "Modern Web Development",
      description:
        "Deep dives into React, Next.js, and cutting-edge frontend technologies",
      color: "text-blue-500",
    },
    {
      icon: FaLightbulb,
      title: "AI & Machine Learning",
      description:
        "Practical applications of AI in web development and data science",
      color: "text-yellow-500",
    },
    {
      icon: FaRocket,
      title: "Performance Optimization",
      description:
        "Tips and tricks for building lightning-fast web applications",
      color: "text-green-500",
    },
    {
      icon: FaNewspaper,
      title: "Industry Insights",
      description:
        "Thoughts on tech trends, career growth, and software engineering",
      color: "text-purple-500",
    },
  ];

  return (
    <motion.div
      className="min-h-full py-12 px-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl h-full mx-auto">
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
            I'm working on something exciting! My blog will feature in-depth
            articles about web development, AI, performance optimization, and
            insights from my journey as a full-stack engineer. Stay tuned for
            quality content that helps you level up your skills.
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

        {/* Newsletter Signup */}
        {/* <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FaEnvelope className="text-primary" />
                <h2 className="text-xl font-semibold">Get Notified</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Be the first to know when I publish new articles
              </p>
            </CardHeader>
            <Divider />
            <CardBody className="pt-6">
              {isSubscribed ? (
                <motion.div
                  className="text-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <div className="text-green-500 text-4xl mb-4">✓</div>
                  <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">
                    You're all set!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    I'll email you as soon as the blog launches.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="bordered"
                    startContent={<FaEnvelope className="text-gray-400" />}
                    isRequired
                  />
                  <Button
                    type="submit"
                    color="primary"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    {isLoading ? "Subscribing..." : "Notify Me When It's Ready"}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    No spam, unsubscribe anytime
                  </p>
                </form>
              )}
            </CardBody>
          </Card>
        </motion.div> */}
      </div>
    </motion.div>
  );
}
