"use client";

import { FaRss, FaCode, FaLightbulb, FaRocket } from "react-icons/fa";
import { useNavigationSpace } from "@/contexts/NavigationSpaceContext";

export default function BlogPage() {
  const { getAvailableHeight } = useNavigationSpace();

  return (
    <div
      className="py-12 px-6 flex items-center justify-center enter enter-duration-500 [--enter-y:20px]"
      style={{ minHeight: getAvailableHeight() }}
    >
      <div className="max-w-6xl w-full mx-auto">
        {/* Hero Section */}
        <div className="text-center flex flex-col items-center justify-center mb-16">
          <div className="mb-8 enter enter-spring-bouncy enter-delay-200 [--enter-scale:0] [--enter-opacity:1]">
            <div className="relative inline-block">
              <FaRss className="text-6xl text-primary mx-auto mb-6" />
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full enter enter-spring-scale enter-delay-500 [--enter-scale:0] [--enter-opacity:1]">
                Soon
              </div>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent enter enter-spring enter-delay-300 [--enter-y:20px]">
            Blog Coming Soon
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8 enter enter-spring enter-delay-400 [--enter-y:20px]">
            I&apos;m working on something exciting! My blog will feature
            in-depth articles about web development, AI, performance
            optimization, and insights from my journey as a founding engineer.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-12 enter enter-delay-600">
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
          </div>
        </div>
      </div>
    </div>
  );
}
