"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardBody,
  Chip,
  Progress,
  Skeleton,
} from "@heroui/react";
import { FaLink } from "react-icons/fa";
import Image from "next/image";
import WordCloud from "@/components/WordCloud/WordCloud";
import { useSkillsData } from "@/hooks/queries/useSkillsData";
import type { SkillRecord } from "@/hooks/queries/useSkillsData";
import { WorkExperienceTimeline } from "./timeline";
import type { WorkExperience } from "./timeline";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Work Experience Timeline Component
function WorkExperienceTimelineSection() {
  const workExperienceData: WorkExperience[] = [
    {
      title: "Dec 2023 - Present",
      jobTitle: "Senior Full Stack Engineer & Data Scientist (SC Cleared)",
      company: "Capita",
      bullets: [
        "Built a production React + TypeScript app on top of Palantir Foundry, enabling advanced tracking for <strong>500+ RN personnel</strong> via fully data-driven, extensible workflows; owned system design and optimised Spark-based pipelines processing <strong>multiple terabytes of data daily</strong>.",
        "Mentored <strong>5 engineers</strong> bi-weekly in React, TypeScript, Python, and Spark, supporting their growth across frontend, backend and data engineering best practices.",
        "Delivered automation saving <strong>5 days of manual effort each month</strong>; project commended at the <strong>Rear Admiral's annual address</strong>.",
      ],
      skills: [
        "React",
        "TypeScript",
        "Python",
        "Apache Spark",
        "Data Engineering",
        "Team Leadership",
        "Palantir Foundry",
      ],
    },
    {
      title: "June 2022 - Dec 2023",
      jobTitle: "Machine Learning Engineer (SC Cleared)",
      company: "Roke",
      bullets: [
        "Tech led <strong>3 cross functional projects</strong> spanning engineering, data science, and domain teams, delivering scalable production systems for critical National Security use cases.",
        "Designed and deployed a novel <strong>GAN-based computer vision model</strong> for real-time image analysis; built entirely from scratch in a restricted environment.",
        "Integrated diverse cloud-native databases (time-series, columnar, geo-spatial, graph), enabling ingestion of <strong>~20–30GB/day</strong> and powering both a live dashboard and a model-driven application.",
        "Supervised MSc research projects in collaboration with university partners, helping align academic work with production objectives.",
      ],
      skills: [
        "Machine Learning",
        "Computer Vision",
        "Python",
        "Cloud Architecture",
        "Data Engineering",
        "Technical Leadership",
      ],
    },
    {
      title: "Nov 2020 - May 2022",
      jobTitle: "Senior Data Science Consultant (SC Cleared)",
      company: "Capita",
      bullets: [
        "Led development of a global carbon reporting platform covering <strong>7,905 cost centres</strong>, enabling a <strong>30% CO₂ reduction</strong> in one year.",
        "Managed a team of <strong>5 juniors</strong> across delivery and technical planning for multiple enterprise clients.",
        "Presented complex data insights to C-level and non-technical stakeholders; achieved a <strong>60% client contract extension rate</strong>.",
        "Mentored <strong>7 engineers</strong> bi-weekly across two teams in Python and Power BI to improve delivery.",
      ],
      skills: [
        "Data Science",
        "Python",
        "Power BI",
        "Team Leadership",
        "Stakeholder Management",
        "Data Visualization",
      ],
    },
  ];

  return <WorkExperienceTimeline experiences={workExperienceData} />;
}

// Info Panel Component
interface SkillInfoPanelProps {
  hoveredSkill: SkillRecord | null;
}

function SkillInfoPanel({ hoveredSkill }: SkillInfoPanelProps) {
  return (
    <Card className="min-h-[420px] h-[420px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <h3 className="text-lg font-semibold">
          {hoveredSkill ? "Skill Details" : "Interactive Skills Cloud"}
        </h3>
      </CardHeader>

      <CardBody className="flex-grow overflow-y-auto">
        <AnimatePresence mode="wait">
          {hoveredSkill ? (
            <motion.div
              key={hoveredSkill.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Skill Name and Type */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-grow">
                  <h4 className="text-xl font-semibold">{hoveredSkill.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Chip size="sm" variant="flat" color="primary">
                      {hoveredSkill.type}
                    </Chip>
                    {hoveredSkill.parent && (
                      <Chip
                        size="sm"
                        variant="bordered"
                        startContent={<FaLink className="w-3 h-3" />}
                      >
                        {hoveredSkill.parent}
                      </Chip>
                    )}
                  </div>
                </div>
                {hoveredSkill.icon && hoveredSkill.icon !== "" && (
                  <div className="w-12 h-12 flex-shrink-0">
                    <Image
                      src={hoveredSkill.icon}
                      alt={hoveredSkill.name}
                      className="w-full h-full object-contain"
                      width={48}
                      height={48}
                    />
                  </div>
                )}
              </div>

              {/* Brief Description */}
              <div>
                <p className="text-sm text-default-600 leading-relaxed">
                  {hoveredSkill.brief}
                </p>
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Proficiency</span>
                  <span className="text-sm text-default-500">
                    {hoveredSkill.value}%
                  </span>
                </div>
                <Progress
                  value={hoveredSkill.value}
                  className="h-2"
                  color="primary"
                  aria-label="Proficiency level"
                />
              </div>

              {/* Tags */}
              {hoveredSkill.tags && hoveredSkill.tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Applications</span>
                  <div className="flex flex-wrap gap-1">
                    {hoveredSkill.tags.map((tag) => (
                      <Chip key={tag} size="sm" variant="dot" color="secondary">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* Click hint */}
              <div className="pt-2 border-t border-default-200">
                <p className="text-xs text-default-400 italic flex items-center gap-1">
                  <span>💡</span>
                  Click on the word to learn more
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col justify-center items-center text-center px-4"
            >
              <div className="w-16 h-16 mb-4 rounded-full bg-default-100 flex items-center justify-center">
                <span className="text-2xl">👆</span>
              </div>
              <p className="text-default-600 mb-2">
                Hover over any skill to explore
              </p>
              <p className="text-sm text-default-400">
                View my proficiency levels, related technologies, and areas of
                application
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
    </Card>
  );
}

export default function AboutPage() {
  const [_formData, _setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [hoveredSkill, setHoveredSkill] = useState<SkillRecord | null>(null);

  // Fetch skills data using React Query
  const { data: skills, isLoading, error } = useSkillsData();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <motion.section
        className="mb-16"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.h1
          className="text-5xl font-bold mb-6 leading-tight"
          variants={fadeInUp}
        >
          Hello, I&apos;m{" "}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dimitri
          </span>
        </motion.h1>

        <motion.p
          className="text-xl text-gray-600 leading-relaxed max-w-3xl"
          variants={fadeInUp}
        >
          I guess you could call me a digital architect, 🏗️ building bridges
          between complex data and elegant solutions. Excelling in unraveling
          intricate problems, I craft applications that not only perform
          flawlessly but also transform raw data into actionable insights. This
          blend of engineering precision and data science intuition opens new
          possibilities, enhancing business outcomes while creating meaningful
          user experiences.
        </motion.p>
      </motion.section>

      {/* Skills Section */}
      <motion.section
        id="skills"
        className="mb-16 -mx-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.h3
          className="text-2xl font-semibold mb-8 px-6"
          variants={fadeInUp}
        >
          My Tech Stack
        </motion.h3>

        {/* Skills Word Cloud with Info Panel */}
        <motion.div
          className="flex flex-col lg:flex-row gap-2 min-h-[600px] items-center"
          variants={fadeInUp}
        >
          {/* Word Cloud */}
          <div className="lg:w-2/3 h-[600px] w-full relative">
            {isLoading ? (
              <div className="h-[600px] flex items-center justify-center">
                <div className="space-y-3">
                  <Skeleton className="w-48 h-6 rounded-lg mx-auto" />
                  <Skeleton className="w-32 h-4 rounded-lg mx-auto" />
                </div>
              </div>
            ) : error ? (
              <div className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-500 mb-2">
                    Failed to load skills data
                  </p>
                  <p className="text-sm text-gray-500">{error.message}</p>
                </div>
              </div>
            ) : skills && skills.length > 0 ? (
              <WordCloud
                skills={skills}
                style={{ width: "100%", height: "100%" }}
                onHoverChange={setHoveredSkill}
              />
            ) : (
              <div className="h-[600px] flex items-center justify-center">
                <p className="text-gray-500">No skills data available</p>
              </div>
            )}
          </div>
          {/* Info Panel */}
          <div className="lg:w-1/3 px-6 w-full">
            <SkillInfoPanel hoveredSkill={hoveredSkill} />
          </div>
        </motion.div>
      </motion.section>

      {/* Experience Section with Timeline */}
      <motion.section
        id="experience"
        className="mb-16 -mx-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.h3
          className="text-2xl font-semibold mb-8 px-6"
          variants={fadeInUp}
        >
          Work Experience
        </motion.h3>
        <motion.div variants={fadeInUp}>
          <WorkExperienceTimelineSection />
        </motion.div>
      </motion.section>
    </div>
  );
}
