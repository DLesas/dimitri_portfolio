"use client";

import dynamic from "next/dynamic";

// Load the 3-D graph only on the client to avoid SSR/WebGL issues
const SkillsGraph = dynamic(() => import("../../../_archive/skills/R3FGraph"), {
  ssr: false,
});

export default function Skills3DPage() {
  return (
    <div className="w-full h-screen">
      <SkillsGraph />
    </div>
  );
}
