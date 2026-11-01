import { VISUAL_CONFIG } from "./constants";

/**
 * Container pixels to network world units. The container's centre is the origin, y points
 * up, and a world unit is CAMERA_ZOOM pixels (the orthographic camera's zoom).
 */
export function convertDOMToWorldCoordinates(
  relativeX: number,
  relativeY: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: (relativeX - containerWidth / 2) / VISUAL_CONFIG.CAMERA_ZOOM,
    y: -(relativeY - containerHeight / 2) / VISUAL_CONFIG.CAMERA_ZOOM,
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
