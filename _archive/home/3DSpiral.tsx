import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Emoji, type EmojiProps, EMOJI_NAMES } from "./3DEmoji";
import React from "react";

interface SpiralProps {
	upwardSpeed?: number;
	horizontalMomentum?: number;
	spiralExpansionRate?: number;
	initialSpiralOffset?: number;
}

const INITIAL_SCALE = 0.2;
const INITIAL_Y = 0;
const MAX_Y = 10;

const generateSpiralProps = (): Required<SpiralProps> => ({
	upwardSpeed: 0.02 + Math.random() * 0.015,
	horizontalMomentum: (Math.random() - 0.5) * 0.009,
	spiralExpansionRate: 0.15 + Math.random() * 0.1,
	initialSpiralOffset: Math.random() * Math.PI * 3,
});

interface SpiralEmojiProps extends SpiralProps {
	emojiName: EmojiProps["emojiName"];
}

const SpiralEmoji = ({ emojiName, ...userSpiralProps }: SpiralEmojiProps) => {
	const ref = React.useRef<THREE.Group>(null);

	const props = useMemo(
		() => ({
			...generateSpiralProps(),
			...userSpiralProps,
		}),
		[userSpiralProps]
	);

	useFrame(() => {
		if (!ref.current) return;

		ref.current.position.y += props.upwardSpeed;

    const baseRadius = Math.max(
      0.1,
      (ref.current.position.y + Math.abs(INITIAL_Y)) * props.spiralExpansionRate
    );

		const angle = props.initialSpiralOffset + ref.current.position.y * 0.5;
    ref.current.position.x =
      Math.sin(angle) * baseRadius +
      ref.current.position.y * props.horizontalMomentum;
		ref.current.position.z = Math.cos(angle) * baseRadius;

    const scale =
      INITIAL_SCALE +
      Math.max(0, ref.current.position.y + Math.abs(INITIAL_Y)) * 0.05;
		ref.current.scale.set(scale, scale, scale);

		if (ref.current.position.y > MAX_Y) {
			ref.current.position.set(0, INITIAL_Y, 0);
			ref.current.scale.setScalar(INITIAL_SCALE);
		}
	});

	React.useEffect(() => {
		if (ref.current) {
			ref.current.position.set(0, INITIAL_Y, 0);
			ref.current.scale.setScalar(INITIAL_SCALE);
		}
	}, []);

	return <Emoji ref={ref} emojiName={emojiName} />;
};

interface SpiralSceneProps extends SpiralProps {
	emojiCount?: number;
}

export const SpiralScene = ({
  emojiCount = 20,
  ...spiralProps
}: SpiralSceneProps) => {
	const emojis = useMemo(() => {
		const emojiTypes = Object.values(EMOJI_NAMES);
		return Array.from({ length: emojiCount }, (_, i) => ({
			emojiName: emojiTypes[i % emojiTypes.length],
			key: i,
		}));
	}, [emojiCount]);

	return (
		<>
			{emojis.map((emoji) => (
        <SpiralEmoji
          key={emoji.key}
          emojiName={emoji.emojiName}
          {...spiralProps}
        />
			))}
		</>
	);
};

export default SpiralScene;
