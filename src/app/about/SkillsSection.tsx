"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@heroui/react";
import WordCloud from "@/components/WordCloud/WordCloud";
import { Reveal } from "@/components/Reveal";
import { useSkillsData } from "@/hooks/queries/useSkillsData";
import type { SkillRecord } from "@/types/skills";
import { SkillInfoPanel } from "./SkillInfoPanel";
import { fadeInUp } from "./entrance";

/**
 * Reports the skill the URL names (/about?skill=Name, as the site assistant cites skills),
 * on arrival and whenever it changes without the page reloading. Only this reads the URL,
 * so only this waits for the browser: the rest of the section still renders on the server.
 */
function LinkedSkillParam({ onChange }: { onChange: (name: string | null) => void }) {
  const name = useSearchParams().get("skill");
  useEffect(() => onChange(name), [name, onChange]);
  return null;
}

/** The About page's interactive part: the skills word cloud and the panel describing the hovered skill */
export function SkillsSection() {
  const [hoveredSkill, setHoveredSkill] = useState<SkillRecord | null>(null);
  // The skill a link names shows until the visitor points at one, and a link to another
  // shows that one instead
  const [linkedName, setLinkedName] = useState<string | null>(null);
  const { data: skills, isLoading, error } = useSkillsData();
  const linkedSkill = skills?.find((skill) => skill.name === linkedName) ?? null;
  const onLinkedChange = useCallback((name: string | null) => {
    setLinkedName(name);
    setHoveredSkill(null);
  }, []);
  const onHoverChange = useCallback((skill: SkillRecord | null) => {
    setLinkedName(null);
    setHoveredSkill(skill);
  }, []);

  return (
    <Reveal id="skills" className="pb-16 -mx-6 enter">
      <Suspense>
        <LinkedSkillParam onChange={onLinkedChange} />
      </Suspense>
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
                onHoverChange={onHoverChange}
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
          <SkillInfoPanel hoveredSkill={hoveredSkill ?? linkedSkill} />
        </div>
      </div>
    </Reveal>
  );
}
