/**
 * @fileoverview Generalized utility functions for coordinate conversion, math operations,
 * distance calculations, trigonometry, and random generation. These utilities are
 * framework-agnostic and can be used in any JavaScript/TypeScript project.
 *
 * All functions are designed to be dependency-free - the calling code provides
 * configuration parameters instead of importing constants.
 */

import * as THREE from "three";

// =============================================================================
// COORDINATE CONVERSION UTILITIES
// =============================================================================

/**
 * Default pixel-to-world ratio for backward compatibility.
 */
export const PIXEL_TO_WORLD_RATIO = 20;

/**
 * Options for coordinate conversion functions.
 */
export interface CoordinateConversionOptions {
  /** Pixels per world unit ratio for scaling (default: PIXEL_TO_WORLD_RATIO) */
  pixelsPerWorldUnit?: number;
  /** Whether to flip Y-axis (default: true - screen Y becomes negative world Y) */
  flipY?: boolean;
}

/**
 * Converts DOM/screen coordinates to world coordinates with configurable scaling.
 * The center of the container maps to (0, 0) in world space.
 *
 * @param relativeX - X position relative to container (pixels)
 * @param relativeY - Y position relative to container (pixels)
 * @param containerWidth - Width of the container (pixels)
 * @param containerHeight - Height of the container (pixels)
 * @param options - Configuration options for conversion
 * @returns Object with world coordinates {x, y}
 *
 * @example
 * ```typescript
 * // Uses default PIXEL_TO_WORLD_RATIO (20)
 * const worldPos = convertDOMToWorldCoordinates(100, 200, 800, 600);
 *
 * // Override with custom ratio
 * const worldPos = convertDOMToWorldCoordinates(100, 200, 800, 600, {
 *   pixelsPerWorldUnit: 25,
 *   flipY: true
 * });
 * ```
 */
export function convertDOMToWorldCoordinates(
  relativeX: number,
  relativeY: number,
  containerWidth: number,
  containerHeight: number,
  options: CoordinateConversionOptions = {}
): { x: number; y: number } {
  const { pixelsPerWorldUnit = PIXEL_TO_WORLD_RATIO, flipY = true } = options;

  // Center of container should map to (0, 0) in world space
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  // Calculate offset from center in pixels
  const offsetX = relativeX - centerX;
  const offsetY = relativeY - centerY;

  // Convert to world units using configurable ratio
  const worldX = offsetX / pixelsPerWorldUnit;
  const worldY = flipY
    ? -offsetY / pixelsPerWorldUnit
    : offsetY / pixelsPerWorldUnit;

  return {
    x: worldX,
    y: worldY,
  };
}

/**
 * Converts world coordinates back to DOM/screen coordinates.
 *
 * @param worldX - X position in world space
 * @param worldY - Y position in world space
 * @param containerWidth - Width of the container (pixels)
 * @param containerHeight - Height of the container (pixels)
 * @param options - Configuration options for conversion
 * @returns Object with DOM coordinates {x, y}
 *
 * @example
 * ```typescript
 * // Uses default PIXEL_TO_WORLD_RATIO (20)
 * const domPos = convertWorldToDOMCoordinates(-15, -5, 800, 600);
 *
 * // Override with custom ratio
 * const domPos = convertWorldToDOMCoordinates(-15, -5, 800, 600, {
 *   pixelsPerWorldUnit: 25,
 *   flipY: true
 * });
 * ```
 */
export function convertWorldToDOMCoordinates(
  worldX: number,
  worldY: number,
  containerWidth: number,
  containerHeight: number,
  options: CoordinateConversionOptions = {}
): { x: number; y: number } {
  const { pixelsPerWorldUnit = PIXEL_TO_WORLD_RATIO, flipY = true } = options;

  // Convert world units to pixels using configurable ratio
  const pixelX = worldX * pixelsPerWorldUnit;
  const pixelY = flipY
    ? -worldY * pixelsPerWorldUnit
    : worldY * pixelsPerWorldUnit;

  // Add center offset to get absolute position
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  const relativeX = pixelX + centerX;
  const relativeY = pixelY + centerY;

  return {
    x: relativeX,
    y: relativeY,
  };
}

/**
 * Converts mouse event coordinates to world coordinates.
 * Convenience function that combines mouse event handling with coordinate conversion.
 *
 * @param clientX - Mouse X position from event.clientX
 * @param clientY - Mouse Y position from event.clientY
 * @param containerRect - DOMRect from container.getBoundingClientRect()
 * @param options - Configuration options for conversion
 * @returns Object with world coordinates {x, y}
 *
 * @example
 * ```typescript
 * // Uses default PIXEL_TO_WORLD_RATIO (20)
 * const handleMouseMove = (event: MouseEvent) => {
 *   const rect = container.getBoundingClientRect();
 *   const worldPos = convertMouseToWorldCoordinates(
 *     event.clientX,
 *     event.clientY,
 *     rect
 *   );
 *   console.log(`Mouse at world position: ${worldPos.x}, ${worldPos.y}`);
 * };
 *
 * // Override with custom configuration
 * const worldPos = convertMouseToWorldCoordinates(
 *   event.clientX,
 *   event.clientY,
 *   rect,
 *   { pixelsPerWorldUnit: 25 }
 * );
 * ```
 */
export function convertMouseToWorldCoordinates(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  options: CoordinateConversionOptions = {}
): { x: number; y: number } {
  const relativeX = clientX - containerRect.left;
  const relativeY = clientY - containerRect.top;

  return convertDOMToWorldCoordinates(
    relativeX,
    relativeY,
    containerRect.width,
    containerRect.height,
    options
  );
}

// =============================================================================
// MATH UTILITIES
// =============================================================================

/**
 * Smoothstep function for smooth easing between 0 and 1.
 * Provides smooth acceleration and deceleration.
 * Input is automatically clamped to [0, 1] range.
 *
 * @param progress - Input value (will be clamped to 0-1)
 * @returns Smoothed value between 0 and 1
 *
 * @example
 * ```typescript
 * const smooth = smoothstep(0.5); // Returns: 0.5
 * const smooth = smoothstep(0.25); // Returns: 0.15625 (slower start)
 * const smooth = smoothstep(0.75); // Returns: 0.84375 (slower end)
 * ```
 */
export function smoothstep(progress: number): number {
  const t = Math.max(0, Math.min(1, progress)); // Clamp to [0, 1]
  return t * t * (3 - 2 * t);
}

/**
 * Linear interpolation between two values.
 *
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0 = a, 1 = b)
 * @returns Interpolated value
 *
 * @example
 * ```typescript
 * const result = lerp(10, 20, 0.5); // Returns: 15
 * const result = lerp(0, 100, 0.25); // Returns: 25
 * ```
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamps a value between minimum and maximum bounds.
 *
 * @param value - Input value
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 *
 * @example
 * ```typescript
 * const result = clamp(150, 0, 100); // Returns: 100
 * const result = clamp(-10, 0, 100); // Returns: 0
 * const result = clamp(50, 0, 100); // Returns: 50
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// =============================================================================
// DISTANCE CALCULATIONS
// =============================================================================

/**
 * Calculates Euclidean distance between two 2D points.
 *
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns Distance between the points
 *
 * @example
 * ```typescript
 * const distance = calculateDistance(0, 0, 3, 4); // Returns: 5
 * ```
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

// =============================================================================
// TRIGONOMETRIC UTILITIES
// =============================================================================

/**
 * Trigonometric lookup table configuration.
 */
export interface TrigConfig {
  /** Size of the lookup table (higher = more precision) */
  tableSize: number;
  /** 2π constant for angle normalization */
  TWO_PI: number;
}

/**
 * Precomputed trigonometric lookup tables.
 */
export interface TrigTables {
  /** Precomputed sine values */
  sin: Float32Array | number[];
  /** Precomputed cosine values */
  cos: Float32Array | number[];
}

/**
 * Fast sine function using precomputed lookup tables.
 * Falls back to Math.sin if no lookup tables provided.
 *
 * @param angle - Angle in radians
 * @param trigConfig - Configuration for table size and constants
 * @param trigTables - Precomputed lookup tables
 * @returns Sine value
 *
 * @example
 * ```typescript
 * // With lookup tables (fast)
 * const result = fastSin(Math.PI / 4, trigConfig, trigTables); // ≈ 0.707
 *
 * // Without lookup tables (fallback to Math.sin)
 * const result = fastSin(Math.PI / 4); // ≈ 0.707
 * ```
 */
export function fastSin(
  angle: number,
  trigConfig?: TrigConfig,
  trigTables?: TrigTables
): number {
  if (!trigConfig || !trigTables) {
    return Math.sin(angle);
  }

  // Normalize angle to 0-2π range
  const normalizedAngle =
    ((angle % trigConfig.TWO_PI) + trigConfig.TWO_PI) % trigConfig.TWO_PI;

  // Convert to table index
  const index = Math.floor(
    (normalizedAngle * trigConfig.tableSize) / trigConfig.TWO_PI
  );

  // Return precomputed value
  return trigTables.sin[index];
}

/**
 * Fast cosine function using precomputed lookup tables.
 * Falls back to Math.cos if no lookup tables provided.
 *
 * @param angle - Angle in radians
 * @param trigConfig - Configuration for table size and constants
 * @param trigTables - Precomputed lookup tables
 * @returns Cosine value
 *
 * @example
 * ```typescript
 * // With lookup tables (fast)
 * const result = fastCos(Math.PI / 4, trigConfig, trigTables); // ≈ 0.707
 *
 * // Without lookup tables (fallback to Math.cos)
 * const result = fastCos(Math.PI / 4); // ≈ 0.707
 * ```
 */
export function fastCos(
  angle: number,
  trigConfig?: TrigConfig,
  trigTables?: TrigTables
): number {
  if (!trigConfig || !trigTables) {
    return Math.cos(angle);
  }

  // Normalize angle to 0-2π range
  const normalizedAngle =
    ((angle % trigConfig.TWO_PI) + trigConfig.TWO_PI) % trigConfig.TWO_PI;

  // Convert to table index
  const index = Math.floor(
    (normalizedAngle * trigConfig.tableSize) / trigConfig.TWO_PI
  );

  // Return precomputed value
  return trigTables.cos[index];
}

/**
 * Creates precomputed trigonometric lookup tables for performance optimization.
 * Useful when making many trigonometric calculations (e.g., animations, particle systems).
 *
 * @param tableSize - Number of precomputed values (higher = more precision, more memory)
 * @returns Object containing sine/cosine lookup tables and configuration
 *
 * @example
 * ```typescript
 * const { trigConfig, trigTables } = createTrigLookupTables(1024);
 * const sine = fastSin(Math.PI / 4, trigConfig, trigTables);
 * ```
 */
export function createTrigLookupTables(tableSize: number = 1024): {
  trigConfig: TrigConfig;
  trigTables: TrigTables;
} {
  const TWO_PI = 2 * Math.PI;
  const trigConfig: TrigConfig = { tableSize, TWO_PI };

  const sin = new Float32Array(tableSize);
  const cos = new Float32Array(tableSize);

  for (let i = 0; i < tableSize; i++) {
    const angle = (i * TWO_PI) / tableSize;
    sin[i] = Math.sin(angle);
    cos[i] = Math.cos(angle);
  }

  const trigTables: TrigTables = { sin, cos };

  return { trigConfig, trigTables };
}

// =============================================================================
// RANDOM GENERATION UTILITIES
// =============================================================================

/**
 * 3D bounds specification for random position generation.
 */
export interface Bounds3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * Generic 3D point interface for framework-agnostic usage.
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Generates a random number within a specified range.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Random number in range [min, max)
 *
 * @example
 * ```typescript
 * const random = randomInRange(10, 20); // Returns: 10.0 to 19.999...
 * ```
 */
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generates an array of random 3D positions within specified bounds.
 *
 * @param count - Number of positions to generate
 * @param bounds - 3D boundary specification
 * @returns Array of position objects with {position: [x,y,z], index} format
 *
 * @example
 * ```typescript
 * const positions = generateNodePositions(10, {
 *   minX: -40, maxX: 40,
 *   minY: -30, maxY: 30,
 *   minZ: -1.5, maxZ: 1.5
 * });
 * // Returns: [{ position: [12.3, -5.7, 0.8], index: 0 }, ...]
 * ```
 */
export function generateNodePositions(
  count: number,
  bounds: Bounds3D
): Array<{ position: [number, number, number]; index: number }> {
  return Array.from({ length: count }, (_, index) => ({
    position: [
      randomInRange(bounds.minX, bounds.maxX),
      randomInRange(bounds.minY, bounds.maxY),
      randomInRange(bounds.minZ, bounds.maxZ),
    ],
    index,
  }));
}

// =============================================================================
// 3D POINT GENERATION UTILITIES
// =============================================================================

/**
 * Options for fibonacci sphere generation.
 */
export interface FibonacciSphereOptions {
  /** Radius of the sphere (default: 1) */
  radius?: number;
  /** Output format: "object" for {x,y,z} or "array" for [x,y,z] or "vector3" for THREE.Vector3 */
  format?: "object" | "array" | "vector3";
  /** Whether to randomize the starting angle (default: false) */
  randomize?: boolean;
  /** Random seed offset for consistent randomization (default: 0) */
  randomSeed?: number;
}

/**
 * Generates points evenly distributed on a sphere using the Fibonacci spiral method.
 * This creates the most uniform distribution possible for any number of points.
 *
 * @param samples - Number of points to generate
 * @param options - Configuration options for generation
 * @returns Array of points in the specified format
 *
 * @example
 * ```typescript
 * // Generate as generic objects (framework-agnostic)
 * const points = fibonacciSphere(100, { format: "object", radius: 5 });
 * // Returns: [{ x: 1.2, y: -3.4, z: 0.8 }, ...]
 *
 * // Generate as arrays
 * const points = fibonacciSphere(100, { format: "array", radius: 5 });
 * // Returns: [[1.2, -3.4, 0.8], ...]
 *
 * // Generate for THREE.js (when THREE is available)
 * const points = fibonacciSphere(100, { format: "vector3", radius: 5 });
 * // Returns: [Vector3, Vector3, ...] (requires THREE.js import in calling code)
 * ```
 */
export function fibonacciSphere(
  samples: number,
  options: FibonacciSphereOptions = {}
): Point3D[] | number[][] {
  const {
    radius = 1,
    format = "object",
    randomize = false,
    randomSeed = 0,
  } = options;

  const points: (Point3D | number[])[] = [];
  const offset = 2 / samples;
  const increment = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians

  // Optional randomization for more organic distributions
  const angleOffset = randomize ? randomSeed * Math.PI * 2 : 0;

  for (let i = 0; i < samples; i++) {
    // Fibonacci spiral calculation
    const y = i * offset - 1 + offset / 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * increment + angleOffset;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;

    // Scale by radius
    const scaledX = x * radius;
    const scaledY = y * radius;
    const scaledZ = z * radius;

    // Return in requested format
    switch (format) {
      case "object":
        points.push({ x: scaledX, y: scaledY, z: scaledZ });
        break;
      case "array":
        points.push([scaledX, scaledY, scaledZ]);
        break;
      case "vector3":
        points.push(new THREE.Vector3(scaledX, scaledY, scaledZ));
        break;
      default:
        points.push({ x: scaledX, y: scaledY, z: scaledZ });
        break;
    }
  }

  return points as Point3D[] | number[][];
}

/**
 * Generates points on a hemisphere (half-sphere) using Fibonacci distribution.
 * Useful for creating dome-like arrangements or directional distributions.
 *
 * @param samples - Number of points to generate
 * @param options - Configuration options (same as fibonacciSphere)
 * @returns Array of points in the specified format, all with y >= 0
 *
 * @example
 * ```typescript
 * // Generate points on upper hemisphere
 * const points = fibonacciHemisphere(50, { format: "object", radius: 3 });
 * ```
 */
export function fibonacciHemisphere(
  samples: number,
  options: FibonacciSphereOptions = {}
): Point3D[] | number[][] {
  // Generate twice as many points on full sphere, then filter to hemisphere
  const fullSpherePoints = fibonacciSphere(samples * 2, options);

  // Filter to upper hemisphere (y >= 0) and take first 'samples' points
  const hemispherePoints = fullSpherePoints
    .filter((point: Point3D | number[]) => {
      const y = Array.isArray(point) ? point[1] : (point as Point3D).y;
      return y >= 0;
    })
    .slice(0, samples);

  return hemispherePoints as Point3D[] | number[][];
}

/**
 * Creates a spiral distribution of points around a cylinder.
 * Useful for creating helical arrangements or spiral galaxies.
 *
 * @param samples - Number of points to generate
 * @param height - Height of the cylinder
 * @param radius - Radius of the cylinder
 * @param turns - Number of complete turns around the cylinder
 * @param format - Output format ("object", "array", or "vector3")
 * @returns Array of points in spiral formation
 *
 * @example
 * ```typescript
 * const spiral = fibonacciSpiral(100, 10, 2, 3, "object");
 * // Creates 100 points in 3 turns around a cylinder of height 10, radius 2
 * ```
 */
export function fibonacciSpiral(
  samples: number,
  height: number,
  radius: number,
  turns: number = 1,
  format: "object" | "array" | "vector3" = "object"
): Point3D[] | number[][] {
  const points: (Point3D | number[])[] = [];
  const angleIncrement = (turns * 2 * Math.PI) / samples;
  const heightIncrement = height / samples;

  for (let i = 0; i < samples; i++) {
    const angle = i * angleIncrement;
    const y = i * heightIncrement - height / 2; // Center vertically
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    switch (format) {
      case "object":
        points.push({ x, y, z });
        break;
      case "array":
        points.push([x, y, z]);
        break;
      case "vector3":
        points.push(new THREE.Vector3(x, y, z));
        break;
      default:
        points.push({ x, y, z });
        break;
    }
  }

  return points as Point3D[] | number[][];
}
