"use client";
import React, { useEffect, useRef, useState } from "react";
import { Chip, cn } from "@heroui/react";
import { FaMapMarkerAlt } from "react-icons/fa";

export interface WorkExperience {
  title: string;
  jobTitle: string;
  company: string;
  bullets: string[];
  skills: string[];
}

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  // The coloured line grows with scrolling: 0 when the timeline's top is 10% down the
  // viewport, full length (at 90% progress) when its bottom reaches the middle
  useEffect(() => {
    const container = containerRef.current;
    const line = lineRef.current;
    if (!container || !line) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const { top, height: containerHeight } = container.getBoundingClientRect();
      const viewport = window.innerHeight;
      const range = containerHeight - 0.4 * viewport;
      const progress =
        range > 0 ? Math.min(1, Math.max(0, (0.1 * viewport - top) / range)) : 0;
      line.style.transform = `scaleY(${Math.min(1, progress / 0.9)})`;
      line.style.opacity = String(Math.min(1, progress / 0.1));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div className="w-full font-sans md:px-10" ref={containerRef}>
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-40 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full  flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-foreground/60 border border-foreground/80 p-2" />
              </div>
              <h3 className="hidden md:block text-lg md:pl-20 md:text-2xl font-bold text-foreground/90">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-foregroud">
                {item.title}
              </h3>
              {item.content}{" "}
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-200 dark:via-neutral-700 to-transparent to-[99%]  [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] "
        >
          <div
            ref={lineRef}
            style={{ transform: "scaleY(0)", opacity: 0 }}
            className="absolute inset-x-0 top-0 h-full origin-top w-[2px] bg-gradient-to-t from-secondary via-primary to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

// New component for work experience timeline
export const WorkExperienceTimeline = ({
  experiences,
}: {
  experiences: WorkExperience[];
}) => {
  const timelineData = experiences.map((exp) => ({
    title: exp.title,
    content: (
      <div>
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {exp.jobTitle.includes("(SC Cleared)") ? (
              <>
                {exp.jobTitle.replace(" (SC Cleared)", "")}{" "}
                <span className="whitespace-nowrap">(SC Cleared)</span>
              </>
            ) : (
              exp.jobTitle
            )}
          </h4>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center text-secondary/80 font-medium">
              <FaMapMarkerAlt className="mr-1" /> {exp.company}
            </span>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-foreground-600/95">
          {exp.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2">•</span>
              <span dangerouslySetInnerHTML={{ __html: bullet }} />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {exp.skills.map((skill, index) => (
            <Chip
              key={index}
              size="sm"
              variant="soft"
              className={cn(
                "bg-primary/35",
                "text-foreground/70",
                "border-primary/50 border-2"
              )}
            >
              {skill}
            </Chip>
          ))}
        </div>
      </div>
    ),
  }));

  return <Timeline data={timelineData} />;
};
