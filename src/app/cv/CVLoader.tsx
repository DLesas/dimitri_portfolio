"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@heroui/react";

const CVClientPage = dynamic(() => import("./CVClientPage"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-4xl">
        <Skeleton className="w-full h-[100vh] max-h-[1100px] rounded-lg" />
        <p className="mt-4 text-center text-gray-500">
          Loading Interactive CV...
        </p>
      </div>
    </div>
  ),
});

export default function CVLoader() {
  return <CVClientPage />;
}
