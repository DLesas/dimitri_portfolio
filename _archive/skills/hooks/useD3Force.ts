"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */

import { useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import * as d3 from "d3-force-3d";
import { SkillNode } from "../types";

interface UseD3ForceParams {
  nodes: SkillNode[];
  dimension?: 2 | 3; // default 3
  chargeStrength?: number; // repulsion strength (negative)
  radialStrength?: number; // pull-back strength toward a radius
}

export function useD3Force({
  nodes,
  dimension = 3,
  chargeStrength = -100,
  radialStrength = 0.9,
}: UseD3ForceParams) {
  const [positions, setPositions] = useState<Map<string, Vector3>>(new Map());
  const simulationRef = useRef<any | null>(null);
  const nodeLookupRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    // Create mutable copies for the simulation (keep original order but stable objects)
    const simNodes: any[] = nodes.map((n) => ({ ...n }));

    // Map id -> simNode for quick lookup
    const nodeIndex = new Map(simNodes.map((n) => [n.id, n]));
    nodeLookupRef.current = nodeIndex;

    // Build link list, ensuring both ends exist in the current node set
    const links = simNodes
      .filter((n) => n.parent && nodeIndex.has(n.parent))
      .map((n) => ({ source: n, target: nodeIndex.get(n.parent!)! }));

    const sim: any = (d3.forceSimulation(simNodes) as any)
      .force("charge", (d3.forceManyBody() as any).strength(chargeStrength))
      .force(
        "link",
        (d3.forceLink(links) as any)
          .id((d: any) => d.id)
          .distance(6)
          .strength(0.9)
      )
      .alpha(1) as any;

    if (dimension === 3) {
      sim.force("center", d3.forceCenter(0, 0, 0));
    } else {
      sim.force("center", d3.forceCenter(0, 0));
    }

    // Gentle spherical pull toward origin using forceRadial (not typed in d3-force-3d typings)
    const radialRadius = dimension === 3 ? 45 : 35; // default radius of influence
    // @ts-ignore – forceRadial exists at runtime but lacks TS declaration in d3-force-3d types
    sim.force(
      "radial",
      (d3 as any).forceRadial(radialRadius, 0, 0, 0).strength(radialStrength)
    );

    sim.on("tick", () => {
      const map = new Map<string, Vector3>();
      simNodes.forEach((d: any) => {
        const vec = new Vector3(
          typeof d.x === "number" ? d.x : 0,
          typeof d.y === "number" ? d.y : 0,
          dimension === 3 ? (typeof d.z === "number" ? d.z : 0) : 0
        );
        map.set(d.id, vec);
      });
      setPositions(map);
    });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [nodes, dimension, chargeStrength, radialStrength]);

  // Helper for dragging
  const setNodeFixed = (
    id: string,
    coords: { x: number; y: number; z?: number } | null
  ) => {
    const n = nodeLookupRef.current.get(id);
    if (!n) return;
    if (coords) {
      n.fx = coords.x;
      n.fy = coords.y;
      if (dimension === 3) n.fz = coords.z ?? 0;
    } else {
      n.fx = n.fy = n.fz = null;
    }
  };

  return { positions, simulation: simulationRef, setNodeFixed };
}
