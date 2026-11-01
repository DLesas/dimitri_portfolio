"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Chip, ProgressBar, Skeleton } from "@heroui/react";

import Image from "next/image";
import WordCloud from "@/components/WordCloud/WordCloud";
import { useSkillsData } from "@/hooks/queries/useSkillsData";
import type { SkillRecord } from "@/types/skills";
import { WorkExperienceTimeline } from "./timeline";
import type { WorkExperience } from "./timeline";
import { FaArrowPointer } from "react-icons/fa6";
import Reveal from "@/components/Reveal";

// Each section fades in, then its parts rise in 100ms apart (see `enter` in globals.css)
const fadeInUp = "enter enter-duration-600 [--enter-y:30px]";

// How long the panel's content takes to leave before the next one enters
const SKILL_EXIT_MS = 200;
const PLACEHOLDER_EXIT_MS = 300;

/**
 * Keeps showing the panel's current skill (or the placeholder, for null) while it
 * plays its exit animation, then swaps in the latest one, so the two never overlap
 */
function useExitBeforeEnter(next: SkillRecord | null) {
  const [shown, setShown] = useState(next);
  const latest = useRef(next);
  const leaving = next !== shown;

  useEffect(() => {
    latest.current = next;
  });

  useEffect(() => {
    if (!leaving) return;
    const timeoutId = setTimeout(
      () => setShown(latest.current),
      shown ? SKILL_EXIT_MS : PLACEHOLDER_EXIT_MS
    );
    return () => clearTimeout(timeoutId);
  }, [leaving, shown]);

  return { shown, leaving };
}

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
  const { shown, leaving } = useExitBeforeEnter(hoveredSkill);

  return (
    <Card className="min-h-[420px] h-[420px] flex flex-col">
      <Card.Header className="flex-shrink-0">
        <h3 className="text-lg font-semibold">
          {hoveredSkill ? "Skill Details" : "Interactive Skills Cloud"}
        </h3>
      </Card.Header>

      <Card.Content className="flex-grow overflow-y-hidden">
        {shown ? (
          <div
            key={shown.name}
            className={`space-y-4 enter-duration-200 ${
              leaving ? "exit [--enter-x:10px]" : "enter [--enter-x:-10px]"
            }`}
          >
            {/* Skill Name and Type */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-grow">
                <h4 className="text-xl font-semibold">{shown.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {shown.parent && (
                    <Chip
                      size="sm"
                      className="bg-secondary text-secondary-foreground shadow-lg shadow-secondary/40"
                    >
                      {shown.parent}
                    </Chip>
                  )}
                  <Chip
                    size="sm"
                    variant="soft"
                    className="bg-secondary/20 text-secondary-700"
                  >
                    {shown.type}
                  </Chip>
                </div>
              </div>
              {shown.icon && shown.icon !== "" && (
                <div className="w-12 h-12 flex-shrink-0">
                  <Image
                    src={shown.icon}
                    alt={shown.name}
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
                {shown.brief}
              </p>
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Proficiency</span>
                <span className="text-sm text-default-500">
                  {shown.value}%
                </span>
              </div>
              <ProgressBar
                value={shown.value}
                color="accent"
                aria-label="Proficiency level"
              >
                <ProgressBar.Track className="h-2">
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            </div>

            {/* Tags */}
            {shown.tags && shown.tags.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Applications</span>
                <div className="flex flex-wrap gap-1 pt-2">
                  {shown.tags.map((tag) => (
                    <Chip
                      key={tag}
                      size="sm"
                      variant="tertiary"
                      className="gap-1.5 border-2 border-default-200 bg-transparent"
                    >
                      <span className="size-2 rounded-full bg-primary" />
                      <Chip.Label>{tag}</Chip.Label>
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`h-full flex flex-col justify-center items-center text-center px-4 ${
              leaving ? "exit" : "enter"
            }`}
          >
            <div className="w-16 h-16 mb-4 rounded-full bg-default-100 flex items-center justify-center">
              <span className="text-2xl">
                {" "}
                <FaArrowPointer className="pl-1 text-secondary-300" />{" "}
              </span>
            </div>
            <p className="text-default-600 mb-2">
              Hover over any skill to explore
            </p>
            <p className="text-sm text-default-400">
              View my proficiency levels, related technologies, and areas of
              application
            </p>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

export default function AboutPage() {
  const [hoveredSkill, setHoveredSkill] = useState<SkillRecord | null>(null);

  // Fetch skills data using React Query
  const { data: skills, isLoading, error } = useSkillsData();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <section className="pb-16 enter">
        <h1 className={`text-5xl font-bold mb-6 leading-tight ${fadeInUp} enter-delay-200`}>
          Hello, I&apos;m{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dimitri
          </span>
        </h1>

        <p className={`text-xl text-gray-600 leading-relaxed max-w-3xl ${fadeInUp} enter-delay-300`}>
          I&apos;m a founding engineer based in London. I set technical
          direction, mentor engineers and still write a lot of the code:
          production web apps, data platforms and machine learning systems,
          including for defence and national security. What I enjoy most is
          turning messy, data-heavy problems into products people actually use.
        </p>
      </section>

      {/* Skills Section */}
      <Reveal id="skills" className="pb-16 -mx-6 enter">
        <h3 className={`text-2xl font-semibold mb-8 px-6 ${fadeInUp} enter-delay-200`}>
          My Tech Stack
        </h3>

        {/* Skills Word Cloud with Info Panel */}
        <div
          className={`flex flex-col lg:flex-row gap-2 min-h-[600px] items-center ${fadeInUp} enter-delay-300`}
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
              <>
                <WordCloud
                  skills={skills}
                  style={{ width: "100%", height: "100%" }}
                  onHoverChange={setHoveredSkill}
                />
                {/* The cloud is drawn on a canvas: the same skills as text, for
                    screen readers and search engines */}
                <ul className="sr-only" aria-label="Skills">
                  {skills.map((skill) => (
                    <li key={skill.name}>
                      {skill.name} ({skill.type})
                    </li>
                  ))}
                </ul>
              </>
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
        </div>
      </Reveal>

      {/* Experience Section with Timeline */}
      <Reveal id="experience" className="pb-20 -mx-6 pt-16 enter">
        <h3 className={`text-2xl font-semibold mt-8 px-6 ${fadeInUp} enter-delay-200`}>
          Work Experience
        </h3>
        <div className={`${fadeInUp} enter-delay-300`}>
          <WorkExperienceTimelineSection />
        </div>
      </Reveal>
    </div>
  );
}
