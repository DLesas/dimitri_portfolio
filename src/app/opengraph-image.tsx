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

// The lesas signature, as in src/app/icon.svg
const SIGNATURE =
  "M 60.000 200  c 9 0 33 0 30 -40 -10.5 -140 -20 55 -7 59 13 4 30 -15.9 30 -49 0 -4.2 -10 -35 -20 20 -6 33 -1.92 32.96 14.784 26.848 16.704 -6.112 18 -42.6 22 -46 10.8 -13.5 -12 -10 4 3 35.2 28.6 25 50 -5 45 m 27 -8 c 27 -8 30 -66 40 -30 -11 -38.5 -30 -20 -30 10 0 24 20 65 30 -30 -7 66.5 0 60 5 60 5 0 18 -47 22 -50 10.8 -13.5 -12 -10 4 3 35.2 28.6 25 50 -5 45";

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
          <svg width={150} height={150} viewBox="62.4 51.3 246 246">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={BLUE} />
                <stop offset="1" stopColor={PURPLE} />
              </linearGradient>
            </defs>
            <g transform="scale(1.2) translate(0, -20)">
              <path
                d={SIGNATURE}
                fill="none"
                stroke="url(#g)"
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
          <div
            style={{
              marginTop: 24,
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
