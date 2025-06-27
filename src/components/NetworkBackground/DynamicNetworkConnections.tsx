import React, { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ANIMATION_CONFIG,
  VISUAL_CONFIG,
  PERFORMANCE_CONFIGS,
  TRIG_CONFIG,
  PRECOMPUTED_TABLES,
} from "./constants";
import { smoothstep, fastSin } from "../../utils/3D/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface Connection {
  start: number;
  end: number;
  distance: number;
  birthTime: number;
  lifetime: number;
}

interface DynamicNetworkConnectionsProps {
  nodeRefsArray: React.MutableRefObject<THREE.Vector3[]>;
  maxDistance: number;
  shouldAnimate: boolean;
  performanceLevel?: "low" | "medium" | "high";
}

/**
 * ObjectPool class for managing Three.js geometry and material instances.
 *
 * PERFORMANCE CRITICAL: Without object pooling, creating/disposing geometries
 * and materials every frame causes:
 * - Frequent garbage collection (GC) pauses causing frame drops
 * - GPU memory fragmentation leading to performance degradation
 * - WebGL context overhead from constant resource creation/deletion
 *
 * This pool maintains reusable instances, reducing allocations by ~95%
 * and eliminating GC pressure during animation loops.
 */
class ObjectPool {
  private geometryPool: THREE.BufferGeometry[] = [];
  private materialPool: THREE.LineBasicMaterial[] = [];
  private usedGeometries = new Set<THREE.BufferGeometry>();
  private usedMaterials = new Set<THREE.LineBasicMaterial>();

  getGeometry(): THREE.BufferGeometry {
    let geometry = this.geometryPool.pop();
    if (!geometry) {
      geometry = new THREE.BufferGeometry();
      // Pre-allocate position attribute to avoid recreating it
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(6), 3)
      );
    } else {
      // Reset the geometry for reuse
      geometry.attributes.position.needsUpdate = true;
    }
    this.usedGeometries.add(geometry);
    return geometry;
  }

  getMaterial(lineWidth: number = 1): THREE.LineBasicMaterial {
    let material = this.materialPool.pop();
    if (!material) {
      material = new THREE.LineBasicMaterial({
        color: VISUAL_CONFIG.CONNECTION_COLOR,
        transparent: true,
        linewidth: lineWidth, // Note: linewidth only works on some platforms
      });
    } else {
      // Update linewidth for reused materials
      material.linewidth = lineWidth;
    }
    this.usedMaterials.add(material);
    return material;
  }

  releaseGeometry(geometry: THREE.BufferGeometry) {
    if (this.usedGeometries.has(geometry)) {
      this.usedGeometries.delete(geometry);
      this.geometryPool.push(geometry);
    }
  }

  releaseMaterial(material: THREE.LineBasicMaterial) {
    if (this.usedMaterials.has(material)) {
      this.usedMaterials.delete(material);
      this.materialPool.push(material);
    }
  }

  dispose() {
    [...this.geometryPool, ...this.usedGeometries].forEach((g) => g.dispose());
    [...this.materialPool, ...this.usedMaterials].forEach((m) => m.dispose());
    this.geometryPool = [];
    this.materialPool = [];
    this.usedGeometries.clear();
    this.usedMaterials.clear();
  }
}

export function DynamicNetworkConnections({
  nodeRefsArray,
  maxDistance,
  shouldAnimate,
  performanceLevel = "medium",
}: DynamicNetworkConnectionsProps) {
  const linesGroup = useRef<THREE.Group>(null!);
  const objectPool = useRef(new ObjectPool());
  const connectionObjects = useRef<
    Map<
      string,
      { geometry: THREE.BufferGeometry; material: THREE.LineBasicMaterial }
    >
  >(new Map());
  const [connections, setConnections] = useState<Connection[]>([]);
  const isAnimatingRef = useRef(true);
  const frameCounter = useRef(0);

  // Get settings from context
  const { networkSettings } = useSettings();

  // Create trig config and tables for fast trig functions
  const trigConfig = {
    tableSize: TRIG_CONFIG.TABLE_SIZE,
    TWO_PI: TRIG_CONFIG.TWO_PI,
  };

  const trigTables = {
    sin: PRECOMPUTED_TABLES.SIN,
    cos: PRECOMPUTED_TABLES.COS,
  };

  // Cleanup function
  const cleanup = () => {
    isAnimatingRef.current = false;

    // Clear all line objects from the group
    if (linesGroup.current) {
      while (linesGroup.current.children.length > 0) {
        const child = linesGroup.current.children[0];
        linesGroup.current.remove(child);
      }
    }

    // Dispose object pool and clear connection objects
    objectPool.current.dispose();
    connectionObjects.current.clear();
  };

  useEffect(() => {
    return cleanup;
  }, []);

  /**
   * PERFORMANCE OPTIMIZATION: Frame rate limiting and connection management
   *
   * This useFrame hook handles two distinct update cycles:
   * 1. POSITION UPDATES: Every frame (60fps) - for smooth visual movement
   * 2. TOPOLOGY UPDATES: Every N frames based on device performance
   *
   * Separating these prevents connection lag while maintaining performance:
   * - Low-end devices: Recalculate connections every 4 frames (15fps topology)
   * - Medium devices: Every 3 frames (20fps topology)
   * - High-end devices: Every frame (60fps topology)
   */
  useFrame(({ clock }) => {
    if (!isAnimatingRef.current || !shouldAnimate) return;

    const currentTime = clock.getElapsedTime();
    frameCounter.current++;

    // Use UPDATE_INTERVAL from performance config for connection topology updates
    const updateInterval =
      PERFORMANCE_CONFIGS[performanceLevel].UPDATE_INTERVAL;
    const shouldRecalculateConnections =
      frameCounter.current % updateInterval === 0;

    // Always update connection positions every frame for smooth movement
    if (linesGroup.current && connections.length > 0) {
      const children = linesGroup.current.children;
      children.forEach((line, index) => {
        const conn = connections[index];
        if (!conn) return;

        const posA = nodeRefsArray.current[conn.start];
        const posB = nodeRefsArray.current[conn.end];

        if (posA && posB && line instanceof THREE.Line) {
          const geometry = line.geometry;
          const positionAttribute = geometry.attributes
            .position as THREE.Float32BufferAttribute;
          const array = positionAttribute.array as Float32Array;

          // Update positions directly every frame for smooth movement
          array[0] = posA.x;
          array[1] = posA.y;
          array[2] = posA.z;
          array[3] = posB.x;
          array[4] = posB.y;
          array[5] = posB.z;

          positionAttribute.needsUpdate = true;
        }
      });
    }

    // Recalculate connections based on performance config UPDATE_INTERVAL
    if (shouldRecalculateConnections) {
      const newConnections: Connection[] = [];
      const dynamicDistance =
        maxDistance + fastSin(currentTime * 0.4, trigConfig, trigTables) * 1;
      const maxDistanceSquared = dynamicDistance * dynamicDistance;

      // Use settings from context, with performance config as fallback
      const MAX_CONNECTIONS =
        networkSettings.maxConnections ??
        PERFORMANCE_CONFIGS[performanceLevel].MAX_CONNECTIONS;
      const nodeCount = nodeRefsArray.current.length;

      // Optimize for large node counts - use sampling strategy
      const shouldUseSampling = nodeCount > 150;
      const maxSearchPairs = shouldUseSampling
        ? MAX_CONNECTIONS * 8
        : (nodeCount * (nodeCount - 1)) / 2;

      // Collect potential connections with early termination for performance
      const potentialConnections: {
        i: number;
        j: number;
        distanceSquared: number;
        distance: number;
      }[] = [];

      let searchCount = 0;
      const searchStep = shouldUseSampling
        ? Math.max(1, Math.floor(nodeCount / 50))
        : 1;

      // Find valid connections with optimized search
      outerLoop: for (let i = 0; i < nodeCount; i += searchStep) {
        for (let j = i + 1; j < nodeCount; j += searchStep) {
          if (searchCount >= maxSearchPairs) break outerLoop;
          searchCount++;

          const posA = nodeRefsArray.current[i];
          const posB = nodeRefsArray.current[j];

          if (posA && posB) {
            const dx = posA.x - posB.x;
            const dy = posA.y - posB.y;
            const dz = posA.z - posB.z;
            const distanceSquared = dx * dx + dy * dy + dz * dz;

            if (distanceSquared < maxDistanceSquared) {
              potentialConnections.push({
                i,
                j,
                distanceSquared,
                distance: Math.sqrt(distanceSquared),
              });

              // Early termination if we have enough good connections
              if (potentialConnections.length >= MAX_CONNECTIONS * 2) {
                break outerLoop;
              }
            }
          }
        }
      }

      // Sort by distance (closest connections first) and limit
      potentialConnections
        .sort((a, b) => a.distanceSquared - b.distanceSquared)
        .slice(0, MAX_CONNECTIONS)
        .forEach(({ i, j, distance }) => {
          const existing = connections.find(
            (c) =>
              (c.start === i && c.end === j) || (c.start === j && c.end === i)
          );

          if (existing) {
            newConnections.push({ ...existing, distance });
          } else {
            newConnections.push({
              start: i,
              end: j,
              distance,
              birthTime: currentTime,
              lifetime:
                ANIMATION_CONFIG.CONNECTION_LIFETIME_BASE +
                Math.random() * ANIMATION_CONFIG.CONNECTION_LIFETIME_RANDOM,
            });
          }
        });

      // Remove old connections and manage object pool
      const validConnections = newConnections.filter((conn) => {
        const age = currentTime - conn.birthTime;
        return age < conn.lifetime;
      });

      // Release unused objects back to pool
      const activeKeys = new Set(
        validConnections.map((conn) => `${conn.start}-${conn.end}`)
      );
      connectionObjects.current.forEach((obj, key) => {
        if (!activeKeys.has(key)) {
          objectPool.current.releaseGeometry(obj.geometry);
          objectPool.current.releaseMaterial(obj.material);
          connectionObjects.current.delete(key);
        }
      });

      setConnections(validConnections);
    }

    // Update opacity animations every frame (lightweight)
    if (linesGroup.current && connections.length > 0) {
      const children = linesGroup.current.children;
      children.forEach((line, index) => {
        const material = (line as THREE.Line)
          .material as THREE.LineBasicMaterial;
        const conn = connections[index];

        if (material && conn) {
          const age = currentTime - conn.birthTime;
          const lifetime = conn.lifetime;

          let opacity = 1;
          if (age < ANIMATION_CONFIG.CONNECTION_FADE_IN_TIME) {
            const progress = age / ANIMATION_CONFIG.CONNECTION_FADE_IN_TIME;
            opacity = smoothstep(progress);
          } else if (
            age >
            lifetime - ANIMATION_CONFIG.CONNECTION_FADE_OUT_TIME
          ) {
            const progress =
              (lifetime - age) / ANIMATION_CONFIG.CONNECTION_FADE_OUT_TIME;
            opacity = smoothstep(progress);
          }

          // Distance-based opacity: closer connections are more opaque
          // Uses the actual maxDistance from the connection algorithm
          const normalizedDistance = Math.min(conn.distance / maxDistance, 1);
          const distanceOpacity = Math.max(
            ANIMATION_CONFIG.CONNECTION_MIN_OPACITY, // Minimum opacity for far connections
            1 - normalizedDistance * ANIMATION_CONFIG.CONNECTION_DISTANCE_FADE // Linear fade based on distance
          );

          // Optional subtle pulse (can be disabled by setting pulse = 1)
          const pulse = 1; // Disabled pulsing - pure distance-based opacity
          // Alternative with very subtle pulse:
          // const pulse = 0.95 + 0.05 * fastSin(currentTime * 0.5 + index * 0.1, trigConfig, trigTables);

          material.opacity = Math.max(
            0,
            opacity *
              pulse *
              distanceOpacity *
              ANIMATION_CONFIG.CONNECTION_OPACITY_MULTIPLIER
          );
        }
      });
    }
  });

  // Update geometries and create line objects only when needed
  useEffect(() => {
    if (!linesGroup.current) return;

    // Clear existing lines
    while (linesGroup.current.children.length > 0) {
      const child = linesGroup.current.children[0];
      linesGroup.current.remove(child);
      // Dispose of the line object if it exists
      if (child instanceof THREE.Line) {
        // Don't dispose geometry/material here - they're managed by the pool
      }
    }

    // Create new lines for current connections
    connections.forEach((conn) => {
      const posA = nodeRefsArray.current[conn.start];
      const posB = nodeRefsArray.current[conn.end];

      if (!posA || !posB) return;

      const connectionKey = `${conn.start}-${conn.end}`;

      // Get or create geometry and material from pool
      let connectionObj = connectionObjects.current.get(connectionKey);
      if (!connectionObj) {
        connectionObj = {
          geometry: objectPool.current.getGeometry(),
          material: objectPool.current.getMaterial(
            networkSettings.connectionLineWidth
          ),
        };
        connectionObjects.current.set(connectionKey, connectionObj);
      }

      // Update geometry with new points efficiently - avoid setFromPoints
      const positionAttribute = connectionObj.geometry.attributes
        .position as THREE.Float32BufferAttribute;
      const array = positionAttribute.array as Float32Array;

      // Update positions directly in the buffer
      array[0] = posA.x;
      array[1] = posA.y;
      array[2] = posA.z;
      array[3] = posB.x;
      array[4] = posB.y;
      array[5] = posB.z;

      positionAttribute.needsUpdate = true;

      // Create line object and add to group
      const line = new THREE.Line(
        connectionObj.geometry,
        connectionObj.material
      );
      linesGroup.current.add(line);
    });
  }, [connections, nodeRefsArray]);

  return <group ref={linesGroup} />;
}
