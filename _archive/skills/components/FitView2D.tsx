"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useEffect, useRef } from "react";

interface Props {
  positions: Map<string, Vector3>;
}

export default function FitView2D({ positions }: Props) {
  const { camera, gl } = useThree();
  const fitted = useRef(false);

  useEffect(() => {
    if (positions.size === 0) return;
    // compute extents
    let maxX = 0;
    let maxY = 0;
    positions.forEach((v) => {
      maxX = Math.max(maxX, Math.abs(v.x));
      maxY = Math.max(maxY, Math.abs(v.y));
    });
    const padding = 1.2;
    const width = gl.domElement.clientWidth;
    const height = gl.domElement.clientHeight;
    const desiredZoomX = width / (2 * maxX * padding);
    const desiredZoomY = height / (2 * maxY * padding);
    const desiredZoom = Math.min(desiredZoomX, desiredZoomY);
    const current = (camera as any).zoom ?? 1;
    const newZoom = current + (desiredZoom - current) * 0.1;
    (camera as any).zoom = newZoom;
    (camera as any).updateProjectionMatrix();
  }, [positions, camera, gl]);

  return null;
}
