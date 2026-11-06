import { ImageResponse } from "next/og";
import { JOB_TITLE, OG_IMAGE, SPECIALISMS } from "@/lib/seo";
import { BLUE, NetworkBackdrop, PURPLE, SHARE_BACKGROUND, SHARE_IMAGE_SIZE, readFont } from "@/lib/shareImage";

// The picture shown when a link to the site is shared (LinkedIn, Slack, X, ...).
// Rendered once at build time; every page uses it but blog posts, which draw their own.
export const alt = OG_IMAGE.alt;
export const size = SHARE_IMAGE_SIZE;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const interBold = await readFont("Inter-Bold.ttf");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: SHARE_BACKGROUND,
          fontFamily: "Inter",
        }}
      >
        <NetworkBackdrop />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 90px",
            height: "100%",
          }}
        >
          <div
            style={{
              fontSize: 104,
              lineHeight: 1.05,
              backgroundImage: `linear-gradient(90deg, ${BLUE}, ${PURPLE})`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Dimitri Lesas
          </div>
          <div style={{ marginTop: 22, fontSize: 42, color: "#e4e4e7" }}>
            {`${JOB_TITLE} · ${SPECIALISMS}`}
          </div>
          <div style={{ marginTop: 40, fontSize: 30, color: "#a1a1aa" }}>lesas.dev</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: interBold, weight: 700, style: "normal" }],
    }
  );
}
