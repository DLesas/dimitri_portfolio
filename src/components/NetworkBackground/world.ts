import { VISUAL_CONFIG } from "./constants";

/**
 * CSS pixels per network world unit: the orthographic camera's zoom. Every conversion
 * between pixels and world units uses this.
 */
export const PX_PER_UNIT = VISUAL_CONFIG.CAMERA_ZOOM;

/**
 * Container pixels to network world units. The container's centre is the origin, y points
 * up, and a world unit is PX_PER_UNIT pixels.
 */
export function convertDOMToWorldCoordinates(
  relativeX: number,
  relativeY: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: (relativeX - containerWidth / 2) / PX_PER_UNIT,
    y: -(relativeY - containerHeight / 2) / PX_PER_UNIT,
  };
}

/** A mouse event's client position to world units, over the given container */
export function convertMouseToWorldCoordinates(
  clientX: number,
  clientY: number,
  containerRect: DOMRect
): { x: number; y: number } {
  return convertDOMToWorldCoordinates(
    clientX - containerRect.left,
    clientY - containerRect.top,
    containerRect.width,
    containerRect.height
  );
}
