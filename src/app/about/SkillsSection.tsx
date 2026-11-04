"use client";

import { useState } from "react";
import { Skeleton } from "@heroui/react";
import WordCloud from "@/components/WordCloud/WordCloud";
import { Reveal } from "@/components/Reveal";
import { useSkillsData } from "@/hooks/queries/useSkillsData";
import type { SkillRecord } from "@/types/skills";
import { SkillInfoPanel } from "./SkillInfoPanel";
import { fadeInUp } from "./entrance";

/** The About page's interactive part: the skills word cloud and the panel describing the hovered skill */
export function SkillsSection() {
  const [hoveredSkill, setHoveredSkill] = useState<SkillRecord | null>(null);
  const { data: skills, isLoading, error } = useSkillsData();

  return (
    <Reveal id="skills" className="pb-16 -mx-6 enter">
      <h3 className={`text-2xl font-semibold mb-8 px-6 ${fadeInUp} enter-delay-200`}>
        My Tech Stack
      </h3>

      {/* Skills Word Cloud with Info Panel */}
      <div
        className={`flex flex-col lg:flex-row gap-2 md:min-h-[600px] items-center ${fadeInUp} enter-delay-300`}
      >
        {/* Word Cloud: shorter on phones, where the sphere is only as tall as the screen
            is wide, so the details panel below it stays in view */}
        <div className="lg:w-2/3 h-[420px] md:h-[600px] w-full relative">
          {isLoading ? (
            <div className="h-[420px] md:h-[600px] flex items-center justify-center">
              <div className="space-y-3">
                <Skeleton className="w-48 h-6 rounded-lg mx-auto" />
                <Skeleton className="w-32 h-4 rounded-lg mx-auto" />
              </div>
            </div>
          ) : error ? (
            <div className="h-[420px] md:h-[600px] flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-500 mb-2">Failed to load skills data</p>
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
            <div className="h-[420px] md:h-[600px] flex items-center justify-center">
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
  );
}
