"use client";

import React, { useEffect, useState } from "react";
import type { DOMCollider } from "./networkEngine";
import { useThemeColors } from "@/contexts/ThemeColorsContext";

/** Shadow layers around each box, for a gradient edge */
const GRADIENT_LAYERS = 6;

/**
 * Debug overlay of the DOM colliders in 3D world coordinates: the boxes the physics
 * uses, padding included, and the threshold around them where repulsion starts
 */
export default function DebugColliders({
  domColliders,
  domCollisionThreshold,
}: {
  domColliders: React.RefObject<DOMCollider[]>;
  domCollisionThreshold: number;
}) {
  const { colors } = useThemeColors();
  const [colliders, setColliders] = useState<DOMCollider[]>([]);

  // The colliders ref is re-measured as the page moves and animates; mirror it here so the
  // overlay shows up as soon as debug mode is on and follows text as it moves
  useEffect(() => {
    let lastKey = "";
    const sync = () => {
      const next = domColliders.current;
      const key = next
        .map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)},${c.width.toFixed(2)},${c.height.toFixed(2)}`)
        .join("|");
      if (key === lastKey) return;
      lastKey = key;
      setColliders(next.slice());
    };
    sync();
    const id = window.setInterval(sync, 250);
    return () => window.clearInterval(id);
  }, [domColliders]);

  return (
    <group>
      {colliders.map((collider, i) => (
        <React.Fragment key={`collider-${i}`}>
          {/* Render shadow gradient layers - largest to smallest for proper layering */}
          {Array.from({ length: GRADIENT_LAYERS })
            .reverse()
            .map((_, reverseIndex) => {
              const layerIndex = GRADIENT_LAYERS - 1 - reverseIndex;
              const layerProgress = (layerIndex + 1) / GRADIENT_LAYERS;
              const extension = domCollisionThreshold * layerProgress;
              const opacity = 0.15 * Math.pow(1 - layerProgress, 1.5);

              return (
                <mesh
                  key={`shadow-${i}-${layerIndex}`}
                  position={[collider.x, collider.y, -0.002 - layerIndex * 0.001]}
                >
                  <boxGeometry
                    args={[collider.width + extension * 2, collider.height + extension * 2, 0.001]}
                  />
                  <meshBasicMaterial
                    color={colors.accent.shades[500].hex}
                    transparent={true}
                    opacity={opacity}
                  />
                </mesh>
              );
            })}

          {/* Main collision box - wireframe outline on top */}
          <mesh key={`wireframe-${i}`} position={[collider.x, collider.y, 0]}>
            <boxGeometry args={[collider.width, collider.height, 0.001]} />
            <meshBasicMaterial
              color={colors.accent.shades[500].hex}
              wireframe={true}
              transparent={true}
              opacity={1.0}
            />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
}
