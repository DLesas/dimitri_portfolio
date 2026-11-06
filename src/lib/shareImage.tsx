import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * What the share images have in common (src/app/opengraph-image.tsx for the site, and
 * src/app/blog/[slug]/opengraph-image.tsx for each post): their size, the favicon's
 * gradient, the fonts, and a still of the network background behind the words.
 */

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };
export const BLUE = "#3b82f6";
export const PURPLE = "#a855f7";

/** A font from public/fonts (licences in LICENSES.txt there) */
export function readFont(file: string) {
  return readFile(join(process.cwd(), "public/fonts", file));
}

/** Points scattered towards the right, linked to their near neighbours. Seeded, so every build draws the same picture. */
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

/** The network still, filling the image behind its text */
export function NetworkBackdrop({ opacity = 1 }: { opacity?: number }) {
  const { nodes, links } = networkBackdrop();
  const { width, height } = SHARE_IMAGE_SIZE;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", left: 0, top: 0, opacity }}
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
  );
}

/** The dark backdrop both images sit on */
export const SHARE_BACKGROUND = "radial-gradient(circle at 75% 40%, #0b1430 0%, #000000 70%)";
