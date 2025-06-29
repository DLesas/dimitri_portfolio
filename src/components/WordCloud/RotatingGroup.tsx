import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

interface RotatingGroupProps {
  children: React.ReactNode;
  isHovering: boolean;
  rotationSpeedY?: number;
  rotationSpeedX?: number;
  lerpFactor?: number;
}

export default function RotatingGroup({
  children,
  isHovering,
  rotationSpeedY = -0.002,
  rotationSpeedX = -0.002,
  lerpFactor = 0.08,
}: RotatingGroupProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const currentSpeedY = useRef(rotationSpeedY); // Current Y rotation speed
  const currentSpeedX = useRef(rotationSpeedX); // Current X rotation speed

  useFrame(() => {
    if (!groupRef.current) return;

    // Define target speeds based on hover state
    const targetSpeedY = isHovering ? 0 : rotationSpeedY;
    const targetSpeedX = isHovering ? 0 : rotationSpeedX;

    // Smooth interpolation over ~0.5 seconds (lerp factor 0.08 = roughly 30 frames at 60fps)
    currentSpeedY.current +=
      (targetSpeedY - currentSpeedY.current) * lerpFactor;
    currentSpeedX.current +=
      (targetSpeedX - currentSpeedX.current) * lerpFactor;

    // Apply the interpolated rotation speeds
    groupRef.current.rotation.y += currentSpeedY.current;
    groupRef.current.rotation.x += currentSpeedX.current;
  });

  return <group ref={groupRef}>{children}</group>;
}
