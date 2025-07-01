"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";

export function ModelPreloader() {
	useEffect(() => {
		// Preload models here
		useGLTF.preload("/models/Emojis.glb");
	}, []);

	return null;
}
