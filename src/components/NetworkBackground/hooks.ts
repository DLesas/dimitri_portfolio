import { useRef, useEffect, useState, useCallback } from "react";
import { convertMouseToWorldCoordinates, convertDOMToWorldCoordinates } from "./world";
import { MOUSE_CONFIG, VISUAL_CONFIG } from "./constants";
import type { DOMCollider, MousePosition } from "./networkEngine";

// Smart hook for mouse tracking with auto-disable and throttling
export function useMouseTracking(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mousePos = useRef<MousePosition>({ x: 0, y: 0, isActive: false });
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
  }, [containerRef, MOUSE_TIMEOUT, MOVEMENT_THRESHOLD, THROTTLE_INTERVAL]);

  return mousePos;
}

// Hook for DOM collision detection
export function useDOMColliders(
  containerRef: React.RefObject<HTMLDivElement | null>,
  collisionPadding: number = 0
) {
  const domColliders = useRef<DOMCollider[]>([]);

  const updateDOMColliders = useCallback(() => {
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
        rect.width / VISUAL_CONFIG.CAMERA_ZOOM + collisionPadding * 2;
      const elementWorldHeight =
        rect.height / VISUAL_CONFIG.CAMERA_ZOOM + collisionPadding * 2;

      return {
        x: worldCoords.x,
        y: worldCoords.y,
        width: elementWorldWidth,
        height: elementWorldHeight,
      };
    });
  }, [containerRef, collisionPadding]);

  useEffect(() => {
    updateDOMColliders();
    window.addEventListener("resize", updateDOMColliders);

    // Set up periodic updates to catch animated elements
    const intervalId = setInterval(updateDOMColliders, 500);

    // Live cursors and avatars ([data-network-overlay]) change every frame and never
    // collide, so their changes alone don't call for re-measuring
    const fromOverlay = (node: Node) =>
      Boolean((node instanceof Element ? node : node.parentElement)?.closest("[data-network-overlay]"));
    const observer = new MutationObserver((records) => {
      if (records.every((record) => fromOverlay(record.target))) return;
      updateDOMColliders();
    });
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
  }, [containerRef, collisionPadding, updateDOMColliders]);

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
