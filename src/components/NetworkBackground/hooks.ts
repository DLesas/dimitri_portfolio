import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import {
  convertMouseToWorldCoordinates,
  convertDOMToWorldCoordinates,
  PIXEL_TO_WORLD_RATIO,
} from "../../utils/3D";
import { WORLD_CONFIG, MOUSE_CONFIG } from "./constants";

// Smart hook for mouse tracking with auto-disable and throttling
export function useMouseTracking(
  containerRef: React.RefObject<HTMLDivElement | null>,
  worldWidth?: number,
  worldHeight?: number
) {
  const mousePos = useRef({ x: 0, y: 0, isActive: false });
  const lastMoveTime = useRef(0);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const lastPosition = useRef({ x: 0, y: 0 });

  // Use centralized configuration
  const MOUSE_TIMEOUT = MOUSE_CONFIG.TIMEOUT;
  const THROTTLE_INTERVAL = MOUSE_CONFIG.THROTTLE_INTERVAL;
  const MOVEMENT_THRESHOLD = MOUSE_CONFIG.MOVEMENT_THRESHOLD;

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now();

      // Throttle mouse events to ~60fps max
      if (now - lastMoveTime.current < THROTTLE_INTERVAL) {
        return;
      }

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();

        // Check if mouse actually moved significantly
        const deltaX = Math.abs(event.clientX - lastPosition.current.x);
        const deltaY = Math.abs(event.clientY - lastPosition.current.y);

        if (
          deltaX < MOVEMENT_THRESHOLD &&
          deltaY < MOVEMENT_THRESHOLD &&
          mousePos.current.isActive
        ) {
          return; // Don't update for tiny movements
        }

        const worldCoords = convertMouseToWorldCoordinates(
          event.clientX,
          event.clientY,
          rect
        );

        // Update position and mark as active
        mousePos.current = {
          x: worldCoords.x,
          y: worldCoords.y,
          isActive: true,
        };

        lastPosition.current = {
          x: event.clientX,
          y: event.clientY,
        };

        lastMoveTime.current = now;

        // Clear existing timeout
        if (timeoutId.current) {
          clearTimeout(timeoutId.current);
        }

        // Set auto-disable timeout
        timeoutId.current = setTimeout(() => {
          mousePos.current.isActive = false;
          timeoutId.current = null;
        }, MOUSE_TIMEOUT);
      }
    };

    const handleMouseLeave = () => {
      mousePos.current.isActive = false;
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
        timeoutId.current = null;
      }
    };

    const handleMouseEnter = () => {
      // Reset position when entering to avoid stale data
      lastPosition.current = { x: 0, y: 0 };
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
      container.addEventListener("mouseenter", handleMouseEnter);

      return () => {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
        container.removeEventListener("mouseenter", handleMouseEnter);

        // Clean up timeout on unmount
        if (timeoutId.current) {
          clearTimeout(timeoutId.current);
        }
      };
    }
  }, [containerRef, worldWidth, worldHeight]);

  return mousePos;
}

// Hook for DOM collision detection
export function useDOMColliders(
  containerRef: React.RefObject<HTMLDivElement | null>,
  worldWidth?: number,
  worldHeight?: number,
  collisionPadding: number = 0
) {
  const domColliders = useRef<
    Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      element: HTMLElement;
    }>
  >([]);

  const updateDOMColliders = () => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const colliderElements = container.querySelectorAll(
      "[data-network-collider]"
    );

    domColliders.current = Array.from(colliderElements).map((element) => {
      const rect = element.getBoundingClientRect();

      // Calculate element center relative to container
      const centerX = rect.left + rect.width / 2 - containerRect.left;
      const centerY = rect.top + rect.height / 2 - containerRect.top;

      const worldCoords = convertDOMToWorldCoordinates(
        centerX,
        centerY,
        containerRect.width,
        containerRect.height
      );

      // Convert pixel dimensions to world units using consistent ratio
      // This ensures DOM elements maintain their size regardless of container size
      // Include padding in the world dimensions
      const elementWorldWidth =
        rect.width / PIXEL_TO_WORLD_RATIO + collisionPadding * 2;
      const elementWorldHeight =
        rect.height / PIXEL_TO_WORLD_RATIO + collisionPadding * 2;

      return {
        x: worldCoords.x,
        y: worldCoords.y,
        width: elementWorldWidth,
        height: elementWorldHeight,
        element: element as HTMLElement,
      };
    });
  };

  useEffect(() => {
    updateDOMColliders();
    window.addEventListener("resize", updateDOMColliders);

    // Set up periodic updates to catch animated elements
    const intervalId = setInterval(updateDOMColliders, 500);

    const observer = new MutationObserver(updateDOMColliders);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-network-collider", "style", "class"],
      });
    }

    return () => {
      window.removeEventListener("resize", updateDOMColliders);
      clearInterval(intervalId);
      observer.disconnect();
      domColliders.current = [];
    };
  }, [containerRef, worldWidth, worldHeight, collisionPadding]);

  return domColliders;
}

// Hook for viewport visibility detection
export function useViewportVisibility(
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [isVisible, setIsVisible] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);

  useEffect(() => {
    // Intersection Observer for viewport visibility
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1, // Trigger when 10% of the component is visible
        rootMargin: "50px", // Start animating 50px before it comes into view
      }
    );

    // Page visibility API for tab switching
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [containerRef]);

  // Return combined visibility state
  const shouldAnimate = isVisible && isTabActive;

  return {
    isVisible,
    isTabActive,
    shouldAnimate,
  };
}

// Hook for dynamic container sizing and world coordinate calculation
export function useContainerDimensions(
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
    aspectRatio: number;
  }>({
    width: WORLD_CONFIG.WIDTH,
    height: WORLD_CONFIG.HEIGHT,
    aspectRatio: 1,
  });

  useEffect(() => {
    const abortController = new AbortController();
    let debounceTimeout: NodeJS.Timeout | null = null;

    const updateDimensions = () => {
      // Clear any existing timeout
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      // Debounce the update to prevent excessive recalculations during resize
      debounceTimeout = setTimeout(() => {
        // Check if we should still proceed (not aborted)
        if (abortController.signal.aborted) return;

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const aspectRatio = rect.width / rect.height;

          // Calculate world dimensions based on container aspect ratio
          // Keep a base size and scale based on aspect ratio
          const baseSize = 30; // Base world size
          let worldWidth, worldHeight;

          if (aspectRatio > 1) {
            // Wider than tall - expand width
            worldWidth = baseSize * aspectRatio;
            worldHeight = baseSize;
          } else {
            // Taller than wide - expand height
            worldWidth = baseSize;
            worldHeight = baseSize / aspectRatio;
          }

          // Check again if we should proceed before updating state
          if (!abortController.signal.aborted) {
            setDimensions({
              width: worldWidth,
              height: worldHeight,
              aspectRatio,
            });
          }
        }
      }, 300); // 150ms debounce - smooth but not too slow
    };

    // Initial measurement (no debounce for first load)
    const initialUpdate = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const aspectRatio = rect.width / rect.height;
        const baseSize = 30;

        let worldWidth, worldHeight;
        if (aspectRatio > 1) {
          worldWidth = baseSize * aspectRatio;
          worldHeight = baseSize;
        } else {
          worldWidth = baseSize;
          worldHeight = baseSize / aspectRatio;
        }

        setDimensions({
          width: worldWidth,
          height: worldHeight,
          aspectRatio,
        });
      }
    };

    initialUpdate();

    // Set up resize observer for dynamic updates
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Fallback resize listener with debouncing
    window.addEventListener("resize", updateDimensions);

    return () => {
      // Abort any pending operations
      abortController.abort();

      // Clear timeout
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      // Clean up observers
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [containerRef]);

  return dimensions;
}

// Hook for node refs management with preservation of existing nodes
export function useNodeRefs(nodeCount: number) {
  const nodeRefs = useRef<THREE.Vector3[]>([]);

  useEffect(() => {
    const currentLength = nodeRefs.current.length;

    if (nodeCount > currentLength) {
      // Add new nodes - preserve existing ones and only add what's needed
      const newNodes = Array.from(
        { length: nodeCount - currentLength },
        () => new THREE.Vector3()
      );
      nodeRefs.current = [...nodeRefs.current, ...newNodes];
    } else if (nodeCount < currentLength) {
      // Remove excess nodes - keep the first nodeCount nodes
      nodeRefs.current = nodeRefs.current.slice(0, nodeCount);
    }
    // If nodeCount === currentLength, do nothing (no change needed)
  }, [nodeCount]);

  // Global cleanup for hot reload and unmount
  useEffect(() => {
    return () => {
      nodeRefs.current = [];
    };
  }, []);

  return nodeRefs;
}

/**
 * Hook for stable node positions that preserves existing nodes when count changes.
 *
 * PERFORMANCE OPTIMIZATION: Instead of recreating the entire nodes array when
 * nodeCount changes (which unmounts/remounts all NetworkNode components and
 * destroys their animation state), this hook:
 * - Preserves existing node positions and their animation continuity
 * - Only generates new positions for additional nodes
 * - Removes excess nodes from the end when count decreases
 *
 * This prevents animation "jumps" and maintains smooth organic movement.
 */
export function useStableNodePositions(
  nodeCount: number,
  worldWidth: number,
  worldHeight: number,
  worldDepth: number = WORLD_CONFIG.DEPTH
) {
  const [nodes, setNodes] = useState<
    Array<{ position: number[]; index: number }>
  >([]);

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentLength = currentNodes.length;

      if (nodeCount > currentLength) {
        // Generate only the new nodes needed using the new bounds-based function
        const bounds = {
          minX: -worldWidth / 2,
          maxX: worldWidth / 2,
          minY: -worldHeight / 2,
          maxY: worldHeight / 2,
          minZ: -worldDepth / 2,
          maxZ: worldDepth / 2,
        };

        const newNodes = Array.from(
          { length: nodeCount - currentLength },
          (_, i) => {
            // Generate single position using the same logic as generateNodePositions
            const position = [
              Math.random() * (bounds.maxX - bounds.minX) + bounds.minX,
              Math.random() * (bounds.maxY - bounds.minY) + bounds.minY,
              Math.random() * (bounds.maxZ - bounds.minZ) + bounds.minZ,
            ];
            return {
              position,
              index: currentLength + i, // Continue indexing from where we left off
            };
          }
        );

        return [...currentNodes, ...newNodes];
      } else if (nodeCount < currentLength) {
        // Remove excess nodes from the end
        return currentNodes.slice(0, nodeCount);
      }

      // No change in count, return existing nodes unchanged
      return currentNodes;
    });
  }, [nodeCount, worldWidth, worldHeight, worldDepth]);

  // Update indices when world dimensions change but preserve positions
  // This ensures nodes maintain their relative positions during resize
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node, index) => ({
        ...node,
        index, // Update indices to be sequential
      }))
    );
  }, [worldWidth, worldHeight]);

  return nodes;
}
