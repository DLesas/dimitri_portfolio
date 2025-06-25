import { WORLD_CONFIG, TRIG_CONFIG, PRECOMPUTED_TABLES } from "./constants";

// Convert DOM coordinates to world coordinates
export function convertDOMToWorldCoordinates(
  relativeX: number,
  relativeY: number,
  containerWidth: number,
  containerHeight: number,
  worldWidth: number = WORLD_CONFIG.WIDTH,
  worldHeight: number = WORLD_CONFIG.HEIGHT
) {
  // Normalize to -1 to 1 range
  const normalizedX = (relativeX / containerWidth) * 2 - 1;
  const normalizedY = -((relativeY / containerHeight) * 2 - 1);

  return {
    x: normalizedX * (worldWidth / 2),
    y: normalizedY * (worldHeight / 2),
  };
}

// Convert mouse event to world coordinates
export function convertMouseToWorldCoordinates(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  worldWidth: number = WORLD_CONFIG.WIDTH,
  worldHeight: number = WORLD_CONFIG.HEIGHT
) {
  const relativeX = clientX - containerRect.left;
  const relativeY = clientY - containerRect.top;

  return convertDOMToWorldCoordinates(
    relativeX,
    relativeY,
    containerRect.width,
    containerRect.height,
    worldWidth,
    worldHeight
  );
}

// Smoothstep function for easing
export function smoothstep(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

// Calculate distance between two points
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

// Fast trigonometric functions using precomputed lookup tables
export function fastSin(angle: number): number {
  // Normalize angle to 0-2π range
  const normalizedAngle =
    ((angle % TRIG_CONFIG.TWO_PI) + TRIG_CONFIG.TWO_PI) % TRIG_CONFIG.TWO_PI;

  // Convert to table index
  const index = Math.floor(
    (normalizedAngle * TRIG_CONFIG.TABLE_SIZE) / TRIG_CONFIG.TWO_PI
  );

  // Return precomputed value
  return PRECOMPUTED_TABLES.SIN[index];
}

export function fastCos(angle: number): number {
  // Normalize angle to 0-2π range
  const normalizedAngle =
    ((angle % TRIG_CONFIG.TWO_PI) + TRIG_CONFIG.TWO_PI) % TRIG_CONFIG.TWO_PI;

  // Convert to table index
  const index = Math.floor(
    (normalizedAngle * TRIG_CONFIG.TABLE_SIZE) / TRIG_CONFIG.TWO_PI
  );

  // Return precomputed value
  return PRECOMPUTED_TABLES.COS[index];
}

// Generate random node positions
export function generateNodePositions(
  nodeCount: number,
  worldWidth: number = WORLD_CONFIG.WIDTH,
  worldHeight: number = WORLD_CONFIG.HEIGHT,
  worldDepth: number = WORLD_CONFIG.DEPTH
) {
  return Array.from({ length: nodeCount }, (_, index) => ({
    position: [
      (Math.random() - 0.5) * worldWidth,
      (Math.random() - 0.5) * worldHeight,
      (Math.random() - 0.5) * worldDepth,
    ],
    index,
  }));
}
