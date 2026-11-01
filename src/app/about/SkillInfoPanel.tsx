"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Card, Chip, ProgressBar } from "@heroui/react";
import { FaArrowPointer } from "react-icons/fa6";
import type { SkillRecord } from "@/types/skills";

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

/** The details of the skill hovered in the word cloud, or a prompt to hover one */
export function SkillInfoPanel({ hoveredSkill }: { hoveredSkill: SkillRecord | null }) {
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
