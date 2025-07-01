"use client";

import React from "react";
import GooglyEyes from "./GooglyEyes";
import Image from "next/image";
const ImgComponent = () => {
	// Define styles for the eye containers.
	const leftEyeStyle: React.CSSProperties = {
		backgroundColor: "white",
		width: "14px",
		height: "7px",
		position: "absolute",
		right: "46.5%",
		top: "34.2%",
		borderRadius: "50%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		transform: "rotate(13deg)",
		transition: "transform 0.1s ease-out",
		willChange: "transform",
	};

	const rightEyeStyle: React.CSSProperties = {
		backgroundColor: "white",
		width: "14px",
		height: "7px",
		position: "absolute",
		right: "41.0%",
		top: "38.0%",
		borderRadius: "50%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		transform: "rotate(13deg)",
		transition: "transform 0.1s ease-out",
		willChange: "transform",
	};

	// Pupil (black dot) styles.
	const pupilStyle: React.CSSProperties = {
		backgroundColor: "#4b2709",
		width: "6px",
		height: "6px",
		borderRadius: "50%",
		position: "absolute",
		left: "50%",
		top: "50%",
		transform: "translate(-50%, -50%) translateZ(0)",
		transition: "transform 0.1s ease-out",
		willChange: "transform",
	};

	return (
		<div className="h-full w-full">
			<Image src="/Top Lad.jpg" alt="a picture of me with googley eyes" fill />
			<GooglyEyes leftEyeStyle={leftEyeStyle} rightEyeStyle={rightEyeStyle} pupilStyle={pupilStyle} />
		</div>
	);
};

export default ImgComponent;
