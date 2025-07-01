import React from "react";
import { Vector3 } from "three";

export interface SkillNode {
  id: string;
  name: string;
  type: string;
  icon?: string;
  brief: string;
  value: number;
  parent?: string;
  tags: string[];
  link?: string;
  position: Vector3;
  velocity: Vector3;
  connections: string[];
}

export interface SkillsForceGraphProps {
  skillsData: Record<string, unknown>;
  onNodeHover: (node: SkillNode | null) => void;
  selectedTags: string[];
}

export interface AnimatedSkillNodeProps {
  node: SkillNode;
  onHover: (node: SkillNode | null) => void;
  isHighlighted: boolean;
  isFadingOut: boolean;
  skillsData: Record<string, unknown>;
  targetPosition: Vector3;
  simulation?: React.RefObject<unknown>;
  setNodeFixed?: (
    id: string,
    coords: { x: number; y: number; z?: number } | null
  ) => void;
}

export interface ConnectionLinesProps {
  nodes: SkillNode[];
  selectedTags: string[];
  optimalPositions: Map<string, Vector3>;
  fadingOutNodes: Set<string>;
}

export interface ForceSimulationProps {
  nodes: SkillNode[];
  onNodeHover: (node: SkillNode | null) => void;
  selectedTags: string[];
  skillsData: Record<string, unknown>;
}
