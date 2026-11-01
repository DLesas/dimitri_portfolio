import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { OG_IMAGE } from "@/lib/seo";

// The picture shown when a link to the site is shared (LinkedIn, Slack, X, ...).
// Rendered once at build time; every page uses it.
export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

// The favicon's gradient
const BLUE = "#3b82f6";
const PURPLE = "#a855f7";

// A still of the network background: points scattered towards the right, linked to
// their near neighbours. Seeded, so every build draws the same picture.
function networkBackdrop() {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const nodes = Array.from({ length: 70 }, () => {
    const x = 380 + Math.pow(random(), 0.7) * 860;
    return { x, y: random() * 650 - 10, r: 2 + random() * 3.5 };
  });
  const links: [number, number, number][] = [];
  nodes.forEach((a, i) =>
    nodes.slice(i + 1).forEach((b, j) => {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 150) links.push([i, i + 1 + j, 1 - d / 150]);
    })
  );
  return { nodes, links };
}

export default async function OpenGraphImage() {
  const interBold = await readFile(join(process.cwd(), "public/fonts/Inter-Bold.ttf"));
  const { nodes, links } = networkBackdrop();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "radial-gradient(circle at 75% 40%, #0b1430 0%, #000000 70%)",
          fontFamily: "Inter",
        }}
      >
        <svg
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {links.map(([a, b, strength], i) => (
            <line
              key={i}
              x1={nodes[a].x}
              y1={nodes[a].y}
              x2={nodes[b].x}
              y2={nodes[b].y}
              stroke={BLUE}
              strokeOpacity={0.15 + strength * 0.45}
              strokeWidth={1.5}
            />
          ))}
          {nodes.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={BLUE} fillOpacity={0.85} />
          ))}
        </svg>

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
            Full Stack Engineer & Data Scientist
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
