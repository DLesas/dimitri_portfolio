import GoogleyMe from "./GoogleyMe";
import Image from "next/image";
import { useState } from "react";

const InstagramPost = () => {
	const [liked, setLiked] = useState(false);
	const [likeCount, setLikeCount] = useState(42);

	const handleLike = () => {
		setLiked(!liked);
		setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
	};

	return (
		<div onClick={handleLike} className="w-full cursor-pointer h-full transform-origin-top-left bg-white text-black">
			{/* Post Header */}
			<div className="flex items-center p-1">
				<div className="h-5 w-5 relative rounded-full overflow-hidden border border-gray-200">
					<Image src="/Top Lad.jpg" alt="Profile picture" fill className="object-cover" sizes="32px" />
				</div>
				<span className="text-[10px] font-semibold ml-1">dlesas</span>
			</div>

			{/* Post Image */}
			<div className="relative w-full" style={{ height: "115px" }}>
				<GoogleyMe />
			</div>

			{/* Action Buttons */}
			<div className="p-1">
				<div className="flex justify-between">
					<div className="flex space-x-2">
						<button className="w-4 h-4 text-xs">{liked ? "❤️" : "🤍"}</button>
						<button className="w-4 h-4 text-xs">💬</button>
						<button className="w-4 h-4 text-xs">📤</button>
					</div>
					<button className="w-4 h-4 cursor-pointer text-xs">🔖</button>
				</div>

				{/* Likes */}
				<div className="mt-0.5 font-semibold text-[10px]">{likeCount} likes</div>

				{/* Caption */}
				<div className="mt-0.5 text-[10px]">
					<span className="font-semibold mr-1">dlesas</span>
					<span>Just me and my googly eyes 👀</span>
				</div>

				{/* Timestamp */}
				<div className="mt-0.5 text-[8px] text-gray-500">2 HOURS AGO</div>
			</div>
		</div>
	);
};

export default InstagramPost;
