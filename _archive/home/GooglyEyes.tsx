import React, { useRef, useEffect, useCallback } from "react";

interface GooglyEyesProps {
  leftEyeStyle: React.CSSProperties;
  rightEyeStyle: React.CSSProperties;
  pupilStyle: React.CSSProperties;
  maxOffset?: number;
}

const GooglyEyes: React.FC<GooglyEyesProps> = React.memo(
  ({ leftEyeStyle, rightEyeStyle, pupilStyle, maxOffset = 4 }) => {
    // Refs for eye containers.
    const leftEyeRef = useRef<HTMLDivElement>(null);
    const rightEyeRef = useRef<HTMLDivElement>(null);

    // Refs for pupils.
    const leftPupilRef = useRef<HTMLDivElement>(null);
    const rightPupilRef = useRef<HTMLDivElement>(null);

    // Function to update a pupil's position given its corresponding eye container.
    const updatePupilPosition = useCallback(
      (
        eyeRef: React.RefObject<HTMLDivElement | null>,
        pupilRef: React.RefObject<HTMLDivElement | null>,
        event: MouseEvent
      ) => {
        if (!eyeRef.current || !pupilRef.current) return;

        // Get the center coordinates of the eye container.
        const rect = eyeRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate the difference between the mouse and the eye center.
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;

        // Calculate the angle from the eye center to the mouse.
        const angle = Math.atan2(dy, dx);

        // Calculate the pupil offset (clamped to maxOffset).
        const offsetX = maxOffset * Math.cos(angle);
        const offsetY = maxOffset * Math.sin(angle);

        // Update the pupil's position.
        pupilRef.current.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) translateZ(0)`;
      },
      [maxOffset]
    );

    useEffect(() => {
      const handleMouseMove = (event: MouseEvent) => {
        updatePupilPosition(leftEyeRef, leftPupilRef, event);
        updatePupilPosition(rightEyeRef, rightPupilRef, event);
      };

      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [updatePupilPosition]);

    return (
      <>
        {/* Left Eye */}
        <div ref={leftEyeRef} style={leftEyeStyle}>
          <div ref={leftPupilRef} style={pupilStyle}></div>
        </div>
        {/* Right Eye */}
        <div ref={rightEyeRef} style={rightEyeStyle}>
          <div ref={rightPupilRef} style={pupilStyle}></div>
        </div>
      </>
    );
  }
);

GooglyEyes.displayName = "GooglyEyes";

export default GooglyEyes;
