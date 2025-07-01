import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import React from "react";
import { ThreeElements } from "@react-three/fiber";

export const EMOJI_NAMES = {
  Emoji_1_Love: "Emoji_1_Love",
  Emoji_2_Wink: "Emoji_2_Wink",
  Emoji_3_Wow: "Emoji_3_Wow",
  Emoji_5_Tounge_Out_Wink: "Emoji_5_Tounge_Out_Wink",
  Emoji_6_Laughing: "Emoji_6_Laughing",
  Emoji_8_Crying_with_Laughter: "Emoji_8_Crying_with_Laughter",
  Emoji_9_Sunglasses: "Emoji_9_Sunglasses",
  Emoji_10_Happy: "Emoji_10_Happy",
  Emoji_12_Smile: "Emoji_12_Smile",
} as const;

export type EmojiName = (typeof EMOJI_NAMES)[keyof typeof EMOJI_NAMES];

export interface EmojiProps {
  emojiName: EmojiName;
  groupProps?: ThreeElements["group"];
}

export const Emoji = React.forwardRef<THREE.Group, EmojiProps>(
  ({ emojiName, groupProps }, ref) => {
    const { nodes } = useGLTF("/models/Emojis.glb");
    const emojiGroup = nodes[emojiName] as THREE.Group;

    return (
      <group ref={ref} {...groupProps} castShadow={false} receiveShadow={true}>
        {emojiGroup.children
          .filter((child): child is THREE.Mesh => child instanceof THREE.Mesh)
          .map((child, index) => (
            <mesh
              key={index}
              geometry={child.geometry}
              material={child.material}
              raycast={undefined}
            />
          ))}
      </group>
    );
  }
);

Emoji.displayName = "3DEmojiComponent";
