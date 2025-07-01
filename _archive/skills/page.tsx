"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Badge } from "@heroui/badge";
import { Switch } from "@heroui/switch";
import dynamic from "next/dynamic";
import { SkillNode } from "./types";

interface SkillData {
  name: string;
  type: string;
  icon?: string;
  brief: string;
  value: number;
  parent?: string;
  tags: string[];
  link?: string;
}

// Load the R3F 3D graph only on the client to avoid SSR issues
const R3FSkillsGraph = dynamic(() => import("./R3FGraph"), {
  ssr: false,
});

const SkillsPage: React.FC = () => {
  const [skillsData, setSkillsData] = useState<Record<string, SkillData>>({});
  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [is3D, setIs3D] = useState(false); // Default to 2D

  // Load skills data
  useEffect(() => {
    const loadSkillsData = async () => {
      try {
        const response = await fetch("/languages_modules.json");
        const data = await response.json();
        setSkillsData(data);
      } catch (error) {
        console.error("Failed to load skills data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSkillsData();
  }, []);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    Object.values(skillsData).forEach((skill) => {
      skill.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [skillsData]);

  // Handle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearTags = () => {
    setSelectedTags([]);
  };

  // Get filtered skills count
  const filteredSkillsCount = useMemo(() => {
    if (selectedTags.length === 0) return Object.keys(skillsData).length;

    return Object.values(skillsData).filter((skill) =>
      skill.tags?.some((tag) => selectedTags.includes(tag))
    ).length;
  }, [skillsData, selectedTags]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex relative">
        {/* Graph (2D or 3D) */}
        <div className="flex-1 relative">
          <R3FSkillsGraph
            skillsData={skillsData}
            onNodeHover={setHoveredNode}
            selectedTags={selectedTags}
            dimension={is3D ? 3 : 2}
          />
        </div>

        {/* Side panel */}
        <aside className="w-80 overflow-y-auto">
          <div className="p-6">
            {hoveredNode ? (
              <Card className="w-full">
                <CardHeader className="flex gap-3">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge color="primary" variant="flat">
                        {hoveredNode.type}
                      </Badge>
                      {hoveredNode.parent && (
                        <Badge color="secondary" variant="flat" size="sm">
                          extends {hoveredNode.parent}
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {hoveredNode.name}
                    </h2>
                  </div>
                </CardHeader>

                <Divider />

                <CardBody className="space-y-4">
                  <p className="text-gray-600">{hoveredNode.brief}</p>

                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-900">
                      Proficiency Level
                    </h3>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${hoveredNode.value}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {hoveredNode.value}% proficient
                    </p>
                  </div>

                  {hoveredNode.link && (
                    <div>
                      <Button
                        as="a"
                        href={hoveredNode.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="primary"
                        variant="bordered"
                        size="sm"
                        className="w-full"
                      >
                        Learn More →
                      </Button>
                    </div>
                  )}
                </CardBody>

                <Divider />

                <CardFooter>
                  <div className="w-full">
                    <h3 className="text-sm font-semibold mb-2 text-gray-900">
                      Categories
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {hoveredNode.tags.map((tag, index) => (
                        <Chip
                          key={index}
                          variant="flat"
                          color={
                            selectedTags.includes(tag) ? "primary" : "default"
                          }
                          size="sm"
                        >
                          {tag}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ) : (
              <div className="text-center py-12">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Explore Skills
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Hover over nodes in the {is3D ? "3D" : "2D"} graph to see
                    detailed information about each skill and technology.
                  </p>
                </div>

                <div className="text-left space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Programming Languages</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">
                      Libraries & Frameworks
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-gray-600">Software & Tools</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600">Databases</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Cloud Platforms</span>
                  </div>
                </div>
              </div>
            )}

            {/* View toggle */}
            <Divider className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Visualization Mode
                  </h3>
                  <p className="text-xs text-gray-500">
                    {is3D
                      ? "3D view (immersive)"
                      : "2D view (easier navigation)"}
                  </p>
                </div>
                <Switch
                  isSelected={is3D}
                  onValueChange={setIs3D}
                  size="sm"
                  color="primary"
                >
                  3D
                </Switch>
              </div>
            </div>

            {/* Filter chips at bottom of sidebar */}
            <Divider className="my-6" />
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-900">
                  Filter by Category
                </h3>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Chip
                    variant={selectedTags.length === 0 ? "solid" : "bordered"}
                    color={selectedTags.length === 0 ? "primary" : "default"}
                    onClick={clearTags}
                    className="cursor-pointer"
                    size="sm"
                  >
                    All ({Object.keys(skillsData).length})
                  </Chip>
                </div>

                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Chip
                      key={tag}
                      variant={
                        selectedTags.includes(tag) ? "solid" : "bordered"
                      }
                      color={selectedTags.includes(tag) ? "primary" : "default"}
                      onClick={() => toggleTag(tag)}
                      className="cursor-pointer"
                      size="sm"
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>

                {selectedTags.length > 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    Showing {filteredSkillsCount} skills matching selected
                    categories
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SkillsPage;
