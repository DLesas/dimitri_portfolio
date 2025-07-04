import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ANIMATION_CONFIG,
  VISUAL_CONFIG,
  TRIG_CONFIG,
  PRECOMPUTED_TABLES,
} from "./constants";
import { calculateDistance, fastSin, fastCos } from "../../utils/3D";
import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "@/contexts/ThemeContext";

interface NetworkNodeProps {
  position: number[];
  index: number;
  nodeRefsArray: React.RefObject<THREE.Vector3[]>;
  mousePos: React.RefObject<{ x: number; y: number; isActive: boolean }>;
  domColliders: React.RefObject<
    Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      element: HTMLElement;
    }>
  >;
  shouldAnimate: boolean;
}

export function NetworkNode({
  position,
  index,
  nodeRefsArray,
  mousePos,
  domColliders,
  shouldAnimate,
}: NetworkNodeProps) {
  const mesh = useRef<THREE.Mesh>(null!);
  const basePosition = useMemo(() => [...position], [position]);
  const velocity = useRef({ x: 0, y: 0 });
  const currentPosition = useRef({ x: basePosition[0], y: basePosition[1] });
  const isAnimatingRef = useRef(true);

  // Get settings from context
  const { networkSettings } = useSettings();

  // Get theme colors
  const { colors } = useTheme();

  // Create trig config and tables for fast trig functions
  const trigConfig = useMemo(
    () => ({
      tableSize: TRIG_CONFIG.TABLE_SIZE,
      TWO_PI: TRIG_CONFIG.TWO_PI,
    }),
    []
  );

  const trigTables = useMemo(
    () => ({
      sin: PRECOMPUTED_TABLES.SIN,
      cos: PRECOMPUTED_TABLES.COS,
    }),
    []
  );

  useFrame(({ clock }) => {
    // Early return if component is unmounting or not visible
    if (!isAnimatingRef.current || !mesh.current || !shouldAnimate) return;
    if (mesh.current) {
      // Organic movement with user-configurable speed
      // PERFORMANCE NOTE: Changing organicMovementSpeed doesn't recreate nodes,
      // it just changes their animation speed smoothly without interruption
      const time =
        clock.getElapsedTime() * networkSettings.organicMovementSpeed +
        index * 0.2;
      const targetX =
        basePosition[0] +
        fastSin(time, trigConfig, trigTables) *
          ANIMATION_CONFIG.ORGANIC_MOVEMENT_AMPLITUDE_X;
      const targetY =
        basePosition[1] +
        fastCos(time * 0.8, trigConfig, trigTables) *
          ANIMATION_CONFIG.ORGANIC_MOVEMENT_AMPLITUDE_Y;
      const z =
        basePosition[2] +
        fastSin(time * 0.6, trigConfig, trigTables) *
          ANIMATION_CONFIG.ORGANIC_MOVEMENT_AMPLITUDE_Z;

      // Mouse repulsion effect with velocity-based movement
      if (mousePos.current.isActive) {
        const mouseX = mousePos.current.x;
        const mouseY = mousePos.current.y;
        const distance = calculateDistance(
          currentPosition.current.x,
          currentPosition.current.y,
          mouseX,
          mouseY
        );

        if (distance < networkSettings.mouseRepulsionRadius && distance > 0) {
          // Calculate smooth repulsion force
          const normalizedDistance =
            distance / networkSettings.mouseRepulsionRadius;
          const smoothFactor =
            1 -
            normalizedDistance *
              normalizedDistance *
              (3 - 2 * normalizedDistance);
          const force = smoothFactor * networkSettings.mouseRepulsionStrength;

          // Apply force to velocity instead of position
          const dirX = (currentPosition.current.x - mouseX) / distance;
          const dirY = (currentPosition.current.y - mouseY) / distance;

          velocity.current.x += dirX * force * ANIMATION_CONFIG.FIXED_TIME_STEP;
          velocity.current.y += dirY * force * ANIMATION_CONFIG.FIXED_TIME_STEP;
        }
      }

      // DOM element collision avoidance
      if (domColliders.current.length > 0) {
        domColliders.current.forEach((collider) => {
          const nodeX = currentPosition.current.x;
          const nodeY = currentPosition.current.y;

          // Calculate collision bounds with padding
          const left =
            collider.x -
            collider.width / 2 -
            networkSettings.domCollisionPadding;
          const right =
            collider.x +
            collider.width / 2 +
            networkSettings.domCollisionPadding;
          const top =
            collider.y +
            collider.height / 2 +
            networkSettings.domCollisionPadding;
          const bottom =
            collider.y -
            collider.height / 2 -
            networkSettings.domCollisionPadding;

          // Calculate distance to closest edge of collision area
          const dx = Math.max(left - nodeX, 0, nodeX - right);
          const dy = Math.max(bottom - nodeY, 0, nodeY - top);
          const distanceToEdge = Math.sqrt(dx * dx + dy * dy);

          // Only apply force if node is inside or very close to collision area
          if (distanceToEdge < networkSettings.domCollisionThreshold) {
            // Calculate repulsion direction from center of DOM element
            const centerDistance = calculateDistance(
              nodeX,
              nodeY,
              collider.x,
              collider.y
            );

            if (centerDistance > 0) {
              // Apply smooth repulsion force based on distance from edge
              const forceStrength =
                (networkSettings.domCollisionThreshold - distanceToEdge) /
                networkSettings.domCollisionThreshold;
              const force =
                networkSettings.domCollisionStrength * forceStrength;
              const dirX = (nodeX - collider.x) / centerDistance;
              const dirY = (nodeY - collider.y) / centerDistance;

              velocity.current.x += dirX * force;
              velocity.current.y += dirY * force;
            }
          }
        });
      }

      // Apply velocity damping and movement towards target
      velocity.current.x +=
        (targetX - currentPosition.current.x) * ANIMATION_CONFIG.RETURN_FORCE;
      velocity.current.y +=
        (targetY - currentPosition.current.y) * ANIMATION_CONFIG.RETURN_FORCE;

      // Apply damping
      velocity.current.x *= ANIMATION_CONFIG.VELOCITY_DAMPING;
      velocity.current.y *= ANIMATION_CONFIG.VELOCITY_DAMPING;

      // Update position
      currentPosition.current.x +=
        velocity.current.x * ANIMATION_CONFIG.FIXED_TIME_STEP;
      currentPosition.current.y +=
        velocity.current.y * ANIMATION_CONFIG.FIXED_TIME_STEP;

      mesh.current.position.set(
        currentPosition.current.x,
        currentPosition.current.y,
        z
      );

      // Update the shared ref - ensure slot exists
      if (!nodeRefsArray.current[index]) {
        nodeRefsArray.current[index] = new THREE.Vector3();
      }
      nodeRefsArray.current[index].copy(mesh.current.position);

      // Subtle scale pulsing
      const scale =
        1 +
        fastSin(
          clock.getElapsedTime() * ANIMATION_CONFIG.SCALE_PULSE_SPEED + index,
          trigConfig,
          trigTables
        ) *
          ANIMATION_CONFIG.SCALE_PULSE_AMPLITUDE;
      mesh.current.scale.setScalar(scale);
    }
  });

  // Set initial position in shared ref and ensure mesh is positioned correctly
  useEffect(() => {
    if (mesh.current) {
      // Calculate the initial organic movement position based on current time
      // This ensures new nodes start at the correct position in their animation cycle
      const currentTime = performance.now() / 1000; // Convert to seconds like clock.getElapsedTime()
      const time =
        currentTime * networkSettings.organicMovementSpeed + index * 0.2;

      const initialX =
        basePosition[0] +
        fastSin(time, trigConfig, trigTables) *
          ANIMATION_CONFIG.ORGANIC_MOVEMENT_AMPLITUDE_X;
      const initialY =
        basePosition[1] +
        fastCos(time * 0.8, trigConfig, trigTables) *
          ANIMATION_CONFIG.ORGANIC_MOVEMENT_AMPLITUDE_Y;
      const initialZ =
        basePosition[2] +
        fastSin(time * 0.6, trigConfig, trigTables) *
          ANIMATION_CONFIG.ORGANIC_MOVEMENT_AMPLITUDE_Z;

      // Set mesh to the calculated organic position
      mesh.current.position.set(initialX, initialY, initialZ);

      // Initialize current position for animation at the organic position
      currentPosition.current.x = initialX;
      currentPosition.current.y = initialY;

      // Ensure animation is enabled for new nodes
      isAnimatingRef.current = true;

      // Update the shared ref - ensure the array slot exists first
      if (!nodeRefsArray.current[index]) {
        nodeRefsArray.current[index] = new THREE.Vector3();
      }
      nodeRefsArray.current[index].copy(mesh.current.position);
    }
  }, [
    nodeRefsArray,
    index,
    basePosition,
    networkSettings.organicMovementSpeed,
    trigConfig,
    trigTables,
  ]);

  // Cleanup animation on unmount
  useEffect(() => {
    const currentMesh = mesh.current;
    return () => {
      // isAnimatingRef.current = false; // This is not needed as the component is unmounting

      // Dispose of mesh geometry and material when component unmounts
      if (currentMesh) {
        currentMesh.geometry?.dispose();
        if (currentMesh.material instanceof THREE.Material) {
          currentMesh.material.dispose();
        }
      }
    };
  }, []);

  return (
    <mesh ref={mesh}>
      <sphereGeometry
        args={[
          networkSettings.nodeRadius,
          VISUAL_CONFIG.NODE_SEGMENTS,
          VISUAL_CONFIG.NODE_SEGMENTS,
        ]}
      />
      <meshStandardMaterial
        color={colors.secondary.shades[500].hex}
        opacity={networkSettings.nodeOpacity}
        transparent={true}
        emissive={colors.primary.shades[500].hex}
        emissiveIntensity={VISUAL_CONFIG.NODE_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}
