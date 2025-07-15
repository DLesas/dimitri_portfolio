import React, { useRef, useEffect, useState } from "react";
import { useFrame, extend } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import {
  ANIMATION_CONFIG,
  PERFORMANCE_CONFIGS,
  TRIG_CONFIG,
  PRECOMPUTED_TABLES,
} from "./constants";
import { smoothstep, fastSin } from "../../utils/3D";
import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "@/contexts/ThemeContext";

// Extend Three.js with Line2 components for React Three Fiber
extend({ Line2, LineGeometry, LineMaterial });

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
 * ObjectPool class for managing Line2 geometry and material instances.
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
  private geometryPool: LineGeometry[] = [];
  private materialPool: LineMaterial[] = [];
  private usedGeometries = new Set<LineGeometry>();
  private usedMaterials = new Set<LineMaterial>();

  getGeometry(): LineGeometry {
    let geometry = this.geometryPool.pop();
    if (!geometry) {
      geometry = new LineGeometry();
    }
    this.usedGeometries.add(geometry);
    return geometry;
  }

  getMaterial(
    lineWidth: number = 1,
    color: string,
    resolution: THREE.Vector2
  ): LineMaterial {
    let material = this.materialPool.pop();
    if (!material) {
      material = new LineMaterial({
        color: new THREE.Color(color),
        linewidth: lineWidth, // Line width in pixels - works properly with Line2!
        transparent: true,
        resolution: resolution,
        worldUnits: false, // Use screen pixels for consistent appearance
        alphaToCoverage: true, // Better anti-aliasing for transparent lines
      });
    } else {
      // Update properties for reused materials
      material.linewidth = lineWidth;
      material.color = new THREE.Color(color);
      material.resolution = resolution;
    }
    this.usedMaterials.add(material);
    return material;
  }

  releaseGeometry(geometry: LineGeometry) {
    if (this.usedGeometries.has(geometry)) {
      this.usedGeometries.delete(geometry);
      this.geometryPool.push(geometry);
    }
  }

  releaseMaterial(material: LineMaterial) {
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
    Map<string, { geometry: LineGeometry; material: LineMaterial; line: Line2 }>
  >(new Map());
  const [connections, setConnections] = useState<Connection[]>([]);
  const isAnimatingRef = useRef(true);
  const frameCounter = useRef(0);
  const resolution = useRef(
    new THREE.Vector2(window.innerWidth, window.innerHeight)
  );

  // Get settings from context
  const { networkSettings } = useSettings();

  // Get theme colors
  const { colors } = useTheme();

  // Create trig config and tables for fast trig functions
  const trigConfig = {
    tableSize: TRIG_CONFIG.TABLE_SIZE,
    TWO_PI: TRIG_CONFIG.TWO_PI,
  };

  const trigTables = {
    sin: PRECOMPUTED_TABLES.SIN,
    cos: PRECOMPUTED_TABLES.COS,
  };

  // Update resolution on window resize
  useEffect(() => {
    const handleResize = () => {
      resolution.current.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cleanup function
  const cleanup = () => {
    isAnimatingRef.current = false;

    // Dispose all connection objects first
    connectionObjects.current.forEach((obj) => {
      if (
        obj.line &&
        linesGroup.current &&
        obj.line.parent === linesGroup.current
      ) {
        linesGroup.current.remove(obj.line);
      }
      obj.geometry?.dispose();
      obj.material?.dispose();
    });

    // Clear all remaining children from the group
    if (linesGroup.current) {
      while (linesGroup.current.children.length > 0) {
        const child = linesGroup.current.children[0];
        linesGroup.current.remove(child);

        // Extra safety: dispose any remaining Line2 instances
        if (child instanceof Line2) {
          child.geometry?.dispose();
          child.material?.dispose();
        }
      }
    }

    // Clear connection objects map
    connectionObjects.current.clear();

    // Dispose object pool
    objectPool.current.dispose();
  };

  useEffect(() => {
    // Cleanup on unmount
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
      children.forEach((child, index) => {
        const conn = connections[index];
        if (!conn) return;

        const posA = nodeRefsArray.current[conn.start];
        const posB = nodeRefsArray.current[conn.end];

        if (posA && posB && child instanceof Line2) {
          const positions = [posA.x, posA.y, posA.z, posB.x, posB.y, posB.z];
          child.geometry.setPositions(positions);
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
      const shouldUseSampling = false;
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
        ? Math.max(1, Math.floor(nodeCount / 100))
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
      children.forEach((child, index) => {
        if (!(child instanceof Line2)) return;

        const material = child.material as LineMaterial;
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

          // Distance-based line width scaling
          // Closer connections are thicker, distant ones are thinner
          const distanceWidthFactor =
            1 -
            normalizedDistance * ANIMATION_CONFIG.CONNECTION_LINE_WIDTH_SCALE;
          const targetLineWidth = Math.max(
            ANIMATION_CONFIG.CONNECTION_MIN_LINE_WIDTH,
            networkSettings.connectionLineWidth * distanceWidthFactor
          );

          // Update line width in real time
          material.linewidth = targetLineWidth;
        }
      });
    }
  });

  // Update geometries and create line objects only when needed
  useEffect(() => {
    if (!linesGroup.current) return;

    // Create a set of active connection keys
    const activeConnectionKeys = new Set(
      connections.map((conn) => `${conn.start}-${conn.end}`)
    );

    // Remove lines that are no longer active
    connectionObjects.current.forEach((obj, key) => {
      if (!activeConnectionKeys.has(key)) {
        if (obj.line && obj.line.parent === linesGroup.current) {
          linesGroup.current.remove(obj.line);
        }
        // Return to pool
        objectPool.current.releaseGeometry(obj.geometry);
        objectPool.current.releaseMaterial(obj.material);
        connectionObjects.current.delete(key);
      }
    });

    // Clear any remaining children that shouldn't be there
    const validLines = new Set(
      Array.from(connectionObjects.current.values()).map((obj) => obj.line)
    );

    for (let i = linesGroup.current.children.length - 1; i >= 0; i--) {
      const child = linesGroup.current.children[i];
      if (!validLines.has(child as Line2)) {
        linesGroup.current.remove(child);
      }
    }

    // Create new lines for current connections
    connections.forEach((conn) => {
      const posA = nodeRefsArray.current[conn.start];
      const posB = nodeRefsArray.current[conn.end];

      if (!posA || !posB) return;

      const connectionKey = `${conn.start}-${conn.end}`;

      // Calculate line width based on distance (needed for both new and existing connections)
      const distance = conn.distance;
      const normalizedDistance = Math.min(distance / maxDistance, 1);
      const distanceWidthFactor =
        1 - normalizedDistance * ANIMATION_CONFIG.CONNECTION_LINE_WIDTH_SCALE;
      const targetLineWidth = Math.max(
        ANIMATION_CONFIG.CONNECTION_MIN_LINE_WIDTH,
        networkSettings.connectionLineWidth * distanceWidthFactor
      );

      // Get or create geometry, material, and line from pool
      let connectionObj = connectionObjects.current.get(connectionKey);
      if (!connectionObj) {
        const geometry = objectPool.current.getGeometry();
        const material = objectPool.current.getMaterial(
          targetLineWidth,
          colors.primary.shades[500].hex, // Use primary color for connections
          resolution.current
        );
        const line = new Line2(geometry, material);

        connectionObj = { geometry, material, line };
        connectionObjects.current.set(connectionKey, connectionObj);
      } else {
        // IMPORTANT: Update existing materials with new theme color and line width
        connectionObj.material.color.set(colors.primary.shades[500].hex);
        connectionObj.material.linewidth = targetLineWidth;
        connectionObj.material.resolution.copy(resolution.current);
      }

      // Update geometry with new points
      const positions = [posA.x, posA.y, posA.z, posB.x, posB.y, posB.z];
      connectionObj.geometry.setPositions(positions);

      // Add line to group if not already added
      if (connectionObj.line.parent !== linesGroup.current) {
        linesGroup.current.add(connectionObj.line);
      }
    });
  }, [
    connections,
    nodeRefsArray,
    colors.primary.shades,
    maxDistance,
    networkSettings.connectionLineWidth,
  ]);

  return <group ref={linesGroup} />;
}
