"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { type SkillRecord } from "@/hooks/queries/useSkillsData";

// three.js and the scene load in their own chunk, after the page has painted
const WordCloudCanvas = dynamic(() => import("./WordCloudCanvas"), { ssr: false });

interface WordCloudProps {
  skills: SkillRecord[];
  style?: React.CSSProperties;
  onHoverChange?: (skill: SkillRecord | null) => void;
}

export default function WordCloud({
  skills,
  style = { width: "100%", height: "100vh" },
  onHoverChange,
}: WordCloudProps) {
  // Hover state management with debouncing, necessary otherwise the hover state
  // can be set to null when switching between words quickly (timing issue)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentHoveredSkill = useRef<SkillRecord | null>(null);

  const handleHoverChange = useCallback(
    (skill: SkillRecord | null) => {
      // Clear any pending timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      if (skill) {
        // Immediately update when hovering over a skill
        currentHoveredSkill.current = skill;
        onHoverChange?.(skill);
      } else {
        // Delay clearing the hover state to prevent flicker between close words
        hoverTimeoutRef.current = setTimeout(() => {
          if (currentHoveredSkill.current) {
            currentHoveredSkill.current = null;
            onHoverChange?.(null);
          }
        }, 100); // 100ms delay before clearing
      }
    },
    [onHoverChange]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", ...style }}>
      <WordCloudCanvas skills={skills} onHover={handleHoverChange} />
    </div>
  );
}

export type { SkillRecord };
