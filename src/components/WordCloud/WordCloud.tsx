import * as THREE from "three";
import {
  useState,
  useMemo,
  Suspense,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Word, { type SkillRecord } from "./Word";
import RotatingGroup from "./RotatingGroup";
import { fibonacciSphere } from "@/utils/3D";
import { useTheme } from "@/contexts/ThemeContext";

// Component to handle dynamic scene updates (fog, etc.)
function SceneSettings({
  fogColor,
  fogNear,
  fogFar,
}: {
  fogColor: string;
  fogNear: number;
  fogFar: number;
}) {
  const { scene } = useThree();
  const currentFogColor = useRef(new THREE.Color(fogColor));
  const targetFogColor = useRef(new THREE.Color(fogColor));

  useEffect(() => {
    // Set transparent background
    scene.background = null;

    // Initialize fog if it doesn't exist
    if (!scene.fog || !(scene.fog instanceof THREE.Fog)) {
      scene.fog = new THREE.Fog(currentFogColor.current, fogNear, fogFar);
    }

    // Update target color when theme changes
    targetFogColor.current.set(fogColor);
  }, [scene, fogColor, fogNear, fogFar]);

  // Gradual color transition using useFrame
  useFrame(() => {
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      // Lerp current color towards target color
      currentFogColor.current.lerp(targetFogColor.current, 0.5); // 5% per frame for smooth transition

      // Update fog color and properties
      scene.fog.color.copy(currentFogColor.current);
      scene.fog.near = fogNear;
      scene.fog.far = fogFar;
    }
  });

  return null; // This component doesn't render anything visual
}

interface WordCloudProps {
  skills: SkillRecord[];
  style?: React.CSSProperties;
  onHoverChange?: (skill: SkillRecord | null) => void;
}

export default function WordCloud({
  skills,
  style = { width: "100%", height: "100vh" },
  onHoverChange,
}: WordCloudProps) {
  // Fixed configuration values
  const radius = 22;
  const cameraPosition: [number, number, number] = [0, 0, 42];
  const fogNear = 0;
  const fogFar = 100;
  const ambientLightIntensity = 0.8;
  const enableDamping = true;
  const dampingFactor = 0.1;
  const rotationSpeedY = -0.001;
  const rotationSpeedX = -0.001;
  const rotationLerpFactor = 0.08;
  const [isHovering, setIsHovering] = useState(false);

  // Hover state management with debouncing, necessary otherwise the hover state
  // can be set to null when switching between words quickly (timing issue)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentHoveredSkill = useRef<SkillRecord | null>(null);

  const handleHoverChange = useCallback(
    (skill: SkillRecord | null) => {
      // Clear any pending timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      if (skill) {
        // Immediately update when hovering over a skill
        currentHoveredSkill.current = skill;
        onHoverChange?.(skill);
      } else {
        // Delay clearing the hover state to prevent flicker between close words
        hoverTimeoutRef.current = setTimeout(() => {
          if (currentHoveredSkill.current) {
            currentHoveredSkill.current = null;
            onHoverChange?.(null);
          }
        }, 100); // 100ms delay before clearing
      }
    },
    [onHoverChange]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Get theme colors
  const { colors } = useTheme();

  // Use theme fog color
  const resolvedFogColor = colors.background.base.hex;

  const positions = useMemo(
    () =>
      fibonacciSphere(skills.length, {
        radius,
        format: "vector3",
      }) as THREE.Vector3[],
    [skills.length, radius]
  );

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: cameraPosition, fov: 75, zoom: 1 }}
      style={style}
      gl={{ alpha: true }}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => setIsHovering(false)}
    >
      {/* Dynamic scene settings that update when theme changes */}
      <SceneSettings
        fogColor={resolvedFogColor}
        fogNear={fogNear}
        fogFar={fogFar}
      />

      <ambientLight intensity={ambientLightIntensity} />
      <Suspense fallback={null}>
        <RotatingGroup
          isHovering={isHovering}
          rotationSpeedY={rotationSpeedY}
          rotationSpeedX={rotationSpeedX}
          lerpFactor={rotationLerpFactor}
        >
          {skills.map((skill, idx) => (
            <Word
              key={`${skill.name}-${idx}`}
              skill={skill}
              position={positions[idx] ?? new THREE.Vector3()}
              index={idx}
              onHover={handleHoverChange}
            />
          ))}
        </RotatingGroup>
      </Suspense>
      <OrbitControls
        enableDamping={enableDamping}
        dampingFactor={dampingFactor}
        enableZoom={false}
      />
    </Canvas>
  );
}
