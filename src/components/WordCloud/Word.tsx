import * as THREE from "three";
import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { SkillRecord } from "@/hooks/queries/useSkillsData";

interface WordProps {
  skill: SkillRecord;
  position: THREE.Vector3;
  index: number;
  onHover?: (skill: SkillRecord | null) => void;
}

export default function Word({ skill, position, index, onHover }: WordProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  // Track current and target colors for smooth transitions
  const currentColor = useRef(new THREE.Color());
  const targetColor = useRef(new THREE.Color());
  const hoverColor = useRef(new THREE.Color());

  // Get theme colors
  const { colors } = useTheme();
  const { wordCloudSettings } = useSettings();

  // Handle click to open link
  const handleClick = (e: any) => {
    e.stopPropagation(); // Prevent event bubbling
    if (skill.link) {
      window.open(skill.link, "_blank", "noopener,noreferrer");
    }
  };

  // Map skill types to theme colors
  const colorFor = (type: string): string => {
    switch (type) {
      case "Programming Language":
        return colors.primary.shades[500].hex;
      case "Library":
        return colors.primary.shades[600].hex;
      case "Software":
        return colors.primary.shades[500].hex;
      case "Database":
        return colors.primary.shades[700].hex;
      case "Cloud Platform":
        return colors.primary.shades[600].hex;
      default:
        return colors.primary.shades[500].hex;
    }
  };

  // Spring animation for appearing
  const { scale } = useSpring({
    scale: 1,
    from: { scale: 0 },
    delay: index * 10, // Stagger by 50ms per word
    config: { tension: 300, friction: 20 },
  });

  useEffect(() => {
    if (hovered) document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  const dir = new THREE.Vector3();
  useFrame((state) => {
    if (!ref.current) return;

    const mat = ref.current.material as THREE.MeshBasicMaterial;

    // Update target colors based on current state
    targetColor.current.set(colorFor(skill.type));
    hoverColor.current.set(colors.accent.shades[500].hex);

    // Determine which color to lerp towards
    const finalTargetColor = hovered ? hoverColor.current : targetColor.current;

    // Smooth color transition - initialize currentColor if needed
    if (
      currentColor.current.r === 0 &&
      currentColor.current.g === 0 &&
      currentColor.current.b === 0
    ) {
      currentColor.current.copy(finalTargetColor);
    }

    // Lerp current color towards target
    currentColor.current.lerp(finalTargetColor, hovered ? 0.1 : 0.05); // Faster hover, slower theme transitions
    mat.color.copy(currentColor.current);

    // front/back opacity
    const camDir = state.camera.getWorldDirection(dir);
    const toObj = new THREE.Vector3()
      .copy(ref.current.position)
      .sub(state.camera.position)
      .normalize();
    const frontness = camDir.dot(toObj); // 1 = front, -1 = back
    const targetOpacity = THREE.MathUtils.mapLinear(frontness, -1, 1, 0.15, 1);
    mat.transparent = true;
    mat.opacity += (targetOpacity - mat.opacity) * 0.1;
  });

  // Font size scales compensates for word length
  const lengthFactor = Math.max(0.5, (12 - skill.name.length) * 0.1);
  const fontSize = wordCloudSettings.baseFontSize + lengthFactor;

  const fontProps = {
    font: "/fonts/Inter-Bold.ttf",
    fontSize,
    letterSpacing: -0.05,
    lineHeight: 1,
  } as const;

  return (
    <animated.group scale={scale}>
      <Billboard
        position={position}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          setHovered(true);
          onHover?.(skill);
        }}
        onPointerOut={(e) => {
          e.stopPropagation(); // Prevent event bubbling,
          setHovered(false);
          onHover?.(null);
        }}
      >
        <Text
          ref={ref as unknown as React.RefObject<THREE.Mesh>}
          {...fontProps}
        >
          {skill.name}
        </Text>
      </Billboard>
    </animated.group>
  );
}

export type { SkillRecord };
