import * as THREE from "three";
import { useRef, useState, useMemo, useEffect, Suspense } from "react";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Billboard, Text, TrackballControls, Html } from "@react-three/drei";
import { LanguageModuleWithColor } from "@/types/languages_modules";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import ModuleDetailPopover from "@/components/ModuleDetailPopover";

function Word({ position, wordObject, onHover }: { position: THREE.Vector3, wordObject: LanguageModuleWithColor, onHover: (isHovered: boolean) => void}) {
  // Calculate font size based on word length
  const calculateFontSize = (word: string) => {
    const baseSize = 2.5;

    const minSize = 1.5;
    // Inverse relationship - longer words get smaller fonts
    return Math.max(baseSize - (word.length * 0.15), minSize);
  };

  const fontProps = {
    fontSize: calculateFontSize(wordObject.name),
    letterSpacing: -0.05,
    lineHeight: 1,
    "material-toneMapped": false,
    color: new THREE.Color(wordObject.color),
  };
  const ref = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
  const [hovered, setHovered] = useState(false);


  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover(true);
  };
  const out = () => {
    setHovered(false);
    onHover(false);
  };
    // Change the mouse cursor on hover¨
    // @ts-expect-error - checking if this works
  useEffect(() => {
    if (hovered) {
        document.body.style.cursor = "pointer";
        console.log("hovered");
    }
    return () => (document.body.style.cursor = "auto");
  }, [hovered]);
    // Tie component to the render-loop
  
    useFrame(() => {
      if (ref.current) {
        ref.current.material.color.lerp(
          ref.current.material.color.set(hovered ? "#fa2720" : "white"),
          0.1
        );
      }
    });
  return (
      <Billboard position={position as THREE.Vector3}>
      <Text
        ref={ref}
        onPointerOver={over}
        onPointerOut={out}
        {...fontProps}
      > {wordObject.name} </Text>
      {hovered && (
        <Html 
          style={{ pointerEvents: "auto" }} 
          position={[1.5, 1, 0]} 
        >
          <Popover placement="bottom" isOpen={true} showArrow={true}>
            <PopoverTrigger>
              <button style={{ visibility: "hidden" }}>Trigger</button>
            </PopoverTrigger>
            <PopoverContent>
              <ModuleDetailPopover module={wordObject} />
            </PopoverContent>
          </Popover>
        </Html>
      )}
    </Billboard>
  );
}


function Cloud({ wordArray, radius }: { wordArray: LanguageModuleWithColor[], radius: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  

  // Create a spherical distribution of the provided words
  const words = useMemo(() => {
    const temp = [];
    const spherical = new THREE.Spherical();
    const count = Math.ceil(Math.sqrt(wordArray.length)); // Calculate grid size based on word count
    const phiSpan = Math.PI / (count + 1);
    const thetaSpan = (Math.PI * 2) / count;
    
    let wordIndex = 0;
    for (let i = 1; i < count + 1 && wordIndex < wordArray.length; i++) {
      for (let j = 0; j < count && wordIndex < wordArray.length; j++) {
        temp.push([
          new THREE.Vector3().setFromSpherical(
            spherical.set(radius, phiSpan * i, thetaSpan * j)
          ),
          wordArray[wordIndex] as LanguageModuleWithColor,
        ]);
        wordIndex++;
      }
    }
    return temp;
  }, [wordArray, radius]);

  useFrame((state, delta) => {
    if (groupRef.current && !isHovered) {
      groupRef.current.rotation.y += delta * 0.10;
      groupRef.current.rotation.x += delta * 0.05;// Adjust speed by changing multiplier
      groupRef.current.rotation.z += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {words.map(([pos, word], index) => (
        <Word 
          key={index} 
          position={pos as THREE.Vector3} 
          wordObject={word as LanguageModuleWithColor} 
          onHover={setIsHovered}
        />
      ))}
    </group>

  );
}

export default function App({wordArray}: {wordArray: LanguageModuleWithColor[]}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 35], fov: 90 }}
      raycaster={{
        params: {
          Points: { threshold: 3 },
          Mesh: { threshold: 3 },
          Line: { threshold: 3 },
          LOD: { threshold: 3 },
          Sprite: { threshold: 3 },
        },




      }}
    >
      <fog attach="fog" args={["#202025", 0, 80]} />
      <Suspense fallback={null}>

        <Cloud wordArray={wordArray} radius={20} />
      </Suspense>
      <TrackballControls noPan noZoom />
    </Canvas>

  );
}
