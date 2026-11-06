import { ImageResponse } from "next/og";
import { formatPostDate } from "@/lib/blog/format";
import { getPost } from "@/lib/blog/posts";
import { SITE_NAME } from "@/lib/site";
import { BLUE, NetworkBackdrop, PURPLE, SHARE_BACKGROUND, SHARE_IMAGE_SIZE, readFont } from "@/lib/shareImage";

// The picture shown when a post is shared: its title in the blog's Playfair italic on the
// site's network backdrop. Drawn for every post at build time, so no post needs its own.
export const contentType = "image/png";

export async function generateImageMetadata({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const title = post?.metadata.title ?? "A post";
  return [{ id: "share", alt: `${title}, by ${SITE_NAME}`, size: SHARE_IMAGE_SIZE, contentType }];
}

export default async function PostShareImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const [playfair, inter] = await Promise.all([readFont("PlayfairDisplay-SemiBoldItalic.ttf"), readFont("Inter-Bold.ttf")]);
  const meta = post ? `${formatPostDate(post.metadata.published)} · ${post.readingMinutes} min read` : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: SHARE_BACKGROUND }}>
        <NetworkBackdrop opacity={0.55} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 90px", width: "100%", height: "100%" }}>
          <div style={{ display: "flex", fontFamily: "Inter", fontSize: 28, color: "#a1a1aa" }}>
            <span style={{ backgroundImage: `linear-gradient(90deg, ${BLUE}, ${PURPLE})`, backgroundClip: "text", color: "transparent" }}>
              lesas.dev
            </span>
            <span style={{ marginLeft: 14 }}>· Blog</span>
          </div>
          <div style={{ display: "flex", fontFamily: "Playfair", fontStyle: "italic", fontSize: 78, lineHeight: 1.12, color: "#f4f4f5", maxWidth: 980 }}>
            {post?.metadata.title ?? SITE_NAME}
          </div>
          <div style={{ display: "flex", fontFamily: "Inter", fontSize: 28, color: "#a1a1aa" }}>{`${SITE_NAME}  ·  ${meta}`}</div>
        </div>
      </div>
    ),
    {
      ...SHARE_IMAGE_SIZE,
      fonts: [
        { name: "Playfair", data: playfair, weight: 600, style: "italic" },
        { name: "Inter", data: inter, weight: 700, style: "normal" },
      ],
    }
  );
}
