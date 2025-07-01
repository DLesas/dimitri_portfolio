"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import SpriteText from "three-spritetext";

// dynamic import r3f-forcegraph (requires Three)
const R3FForceGraph = dynamic(() => import("r3f-forcegraph"), { ssr: false });

type SkillRecord = {
  name: string;
  type: string;
  brief: string;
  value: number;
  parent?: string;
  tags?: string[];
};

export interface R3FSkillsGraphProps {
  /**
   * Pre-loaded skills data map. If omitted, the component will fetch
   * `/languages_modules.json` at runtime (same behaviour as before).
   */
  skillsData?: Record<string, SkillRecord>;
  /**
   * Optional hover callback to bubble up the currently hovered node (or null).
   */
  onNodeHover?: (node: any | null) => void;
  /**
   * Optional list of selected tags used to filter which skills are shown.
   */
  selectedTags?: string[];
  /** Force-graph space dimensions. Pass 2 for a flattened layout, 3 for full 3-D (default). */
  dimension?: 2 | 3;
}

function R3FSkillsGraphComponent({
  skillsData,
  onNodeHover,
  selectedTags = [],
  dimension,
}: R3FSkillsGraphProps) {
  const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });

  // Helper that converts a skills record into graphData considering tag filters
  const buildGraph = useCallback(
    (srcData: Record<string, SkillRecord>) => {
      // Filter by selected tags (if any)
      const entries = Object.entries(srcData).filter(([, s]) => {
        if (selectedTags.length === 0) return true;
        // tags may be missing – treat as empty array
        const t = (s.tags ?? []) as string[];
        return t.some((tag) => selectedTags.includes(tag));
      });

      const nodes = entries.map(([id, s]) => ({
        id,
        ...s,
        val: 1 + s.value / 25,
      }));

      const ndx = new Map(nodes.map((n: any) => [n.id, n]));

      const links: any[] = [];
      nodes.forEach((n: any) => {
        const src = srcData[n.id];
        if (src.parent && ndx.has(src.parent)) {
          links.push({ source: n.id, target: src.parent });
        }
      });

      return { nodes, links };
    },
    [selectedTags]
  );

  // If skillsData prop provided, watch changes
  useEffect(() => {
    if (skillsData) {
      setGraphData(buildGraph(skillsData));
    }
  }, [skillsData, buildGraph]);

  // Fallback fetch when prop not supplied
  useEffect(() => {
    if (skillsData) return; // already handled
    fetch("/languages_modules.json")
      .then((r) => r.json())
      .then((data: Record<string, SkillRecord>) =>
        setGraphData(buildGraph(data))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function GraphScene() {
    const fgRef = useRef<any>(null);
    useFrame(() => {
      fgRef.current?.tickFrame();
    });

    // helper to choose colour
    const colorFor = (type: string) => {
      switch (type) {
        case "Programming Language":
          return 0x3b82f6;
        case "Library":
          return 0x10b981;
        case "Software":
          return 0xf59e0b;
        case "Database":
          return 0x8b5cf6;
        case "Cloud Platform":
          return 0xef4444;
        default:
          return 0x64748b;
      }
    };

    return (
      <R3FForceGraph
        ref={fgRef}
        graphData={graphData}
        numDimensions={dimension ?? 3}
        linkColor={() => "#888"}
        onNodeHover={onNodeHover}
        nodeThreeObject={(node: any) => {
          const sprite = new SpriteText(node.name);
          sprite.textHeight = 8 + (node.val ?? 1) * 1.2;
          sprite.color = `#${colorFor(node.type)
            .toString(16)
            .padStart(6, "0")}`;
          sprite.material.depthWrite = false; // keep text crisp
          // Ensure labels are visible even when behind other nodes
          sprite.material.depthTest = false;
          sprite.frustumCulled = false;
          return sprite;
        }}
        nodeThreeObjectExtend={false}
      />
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 600], fov: 60 }}
      style={{ height: "100vh", width: "100%" }}
    >
      {/* basic lighting so coloured materials are visible */}
      <ambientLight intensity={0.9} />
      <GraphScene />
      <OrbitControls enableDamping dampingFactor={0.1} />
    </Canvas>
  );
}

// Memoize to avoid re-rendering on unrelated state updates (e.g., hovered node UI)
const R3FSkillsGraph = React.memo(
  R3FSkillsGraphComponent,
  (prev, next) =>
    prev.dimension === next.dimension &&
    prev.onNodeHover === next.onNodeHover &&
    prev.skillsData === next.skillsData &&
    prev.selectedTags === next.selectedTags
);

export default R3FSkillsGraph;
