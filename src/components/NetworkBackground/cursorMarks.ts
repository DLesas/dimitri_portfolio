/**
 * Other visitors' marks: each one's pointer and name, drawn in DOM over their cursor's
 * glow in the network canvas (liveCursors.ts tracks the cursors themselves).
 */
import { PX_PER_UNIT } from "./world";
import type { RemoteCursor } from "./liveCursors";

const SVG_NS = "http://www.w3.org/2000/svg";
/** Other visitors' pointers and names are a side feature: kept faint so they don't pull focus */
const MARK_OPACITY = 0.6;
/** The visitor whose avatar is hovered or focused: their pointer and name show in full */
let highlighted: string | null = null;

export function highlightVisitor(id: string | null) {
  highlighted = id;
}
/** A pointer whose tip is at (3, 2) in its 20×22 box */
const ARROW_PATH = "M3 2 L3 19 L7.6 14.6 L10.6 21.4 L13.6 20.1 L10.7 13.4 L17 13.4 Z";
const marksByLayer = new WeakMap<HTMLElement, Map<string, HTMLDivElement>>();

/** A visitor's colour, see-through: their pointers, names and avatars are tinted, not solid */
export function translucent(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
}

function createMark() {
  const mark = document.createElement("div");
  mark.style.cssText =
    "position:absolute;left:0;top:0;will-change:transform,opacity;transition:opacity 150ms ease-out";

  // An outline pointer, in the visitor's colour
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "22");
  svg.style.cssText = "position:absolute;left:-3px;top:-2px;overflow:visible";
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ARROW_PATH);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-width", "1.6");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);

  // The name flag, as in Google Docs: a tint of their colour, in the page's text colour
  const label = document.createElement("span");
  label.style.cssText =
    "position:absolute;left:13px;top:17px;padding:2px 6px;border-radius:6px;white-space:nowrap;" +
    "font:600 11px/1.4 system-ui,sans-serif;color:var(--foreground);" +
    "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)";

  mark.append(svg, label);
  return mark;
}

/**
 * Places each remote cursor's pointer and name in `layer`, which covers the same area
 * as the network canvas. World units convert to pixels as in the canvas: centred,
 * PX_PER_UNIT pixels per unit.
 */
export function drawCursorMarks(layer: HTMLElement, cursors: RemoteCursor[], width: number, height: number) {
  let marks = marksByLayer.get(layer);
  // Nobody else around, and nothing left to clear: the usual case, every frame
  if (cursors.length === 0 && !marks?.size) return;
  if (!marks) {
    marks = new Map();
    marksByLayer.set(layer, marks);
  }
  const shown = new Set<string>();
  for (const cursor of cursors) {
    let mark = marks.get(cursor.id);
    if (!mark) {
      mark = createMark();
      marks.set(cursor.id, mark);
      layer.appendChild(mark);
    }
    shown.add(cursor.id);
    const px = cursor.x * PX_PER_UNIT + width / 2;
    const py = -cursor.y * PX_PER_UNIT + height / 2;
    mark.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
    const strength = cursor.id === highlighted ? 1 : MARK_OPACITY;
    mark.style.opacity = (cursor.weight * strength).toFixed(3);
    // Colour and name rarely change: only touch them when they do
    if (mark.dataset.color !== cursor.color || mark.dataset.name !== cursor.name) {
      mark.dataset.color = cursor.color;
      mark.dataset.name = cursor.name;
      mark.querySelector("path")!.setAttribute("stroke", translucent(cursor.color, 0.85));
      const label = mark.querySelector("span")!;
      label.textContent = cursor.name;
      label.style.background = translucent(cursor.color, 0.3);
    }
  }
  for (const [cursorId, mark] of marks) {
    if (shown.has(cursorId)) continue;
    mark.remove();
    marks.delete(cursorId);
  }
}
