/**
 * What the network figure draws over the network: the grid connections are found with,
 * the pull of each node's drift path, and the demo cursor. A 2D canvas, in CSS pixels.
 */
/** The stage in CSS pixels, and its zoom: pixels per world unit */
export interface Stage {
  w: number;
  h: number;
  zoom: number;
}

export interface OverlayStyle {
  /** The page's text colour as "r, g, b", for lines that shouldn't stand out */
  ink: string;
  /** The theme's primary colour, for what's being shown */
  accent: string;
}

/** The overlay canvas, sized to the stage at the screen's resolution and cleared, to draw on */
export function clearOverlay(canvas: HTMLCanvasElement, { w, h }: Stage) {
  const draw = canvas.getContext("2d");
  if (!draw) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  draw.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw.clearRect(0, 0, w, h);
  return draw;
}

/** World units to the stage's pixels: centred, y up */
const px = (x: number, s: Stage) => x * s.zoom + s.w / 2;
const py = (y: number, s: Stage) => -y * s.zoom + s.h / 2;

/**
 * The grid the engine sorts nodes into before it looks for connections (fillGrid in
 * networkEngine.ts): cells a link-distance wide, counted from the lowest node
 */
export interface Grid {
  minX: number;
  minY: number;
  cell: number;
  cols: number;
  rows: number;
  /** Each node's column and row */
  col: Int32Array;
  row: Int32Array;
}

export function sortIntoGrid(pos: Float32Array, count: number, cell: number): Grid {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    minX = Math.min(minX, pos[i * 3]);
    maxX = Math.max(maxX, pos[i * 3]);
    minY = Math.min(minY, pos[i * 3 + 1]);
    maxY = Math.max(maxY, pos[i * 3 + 1]);
  }
  const col = new Int32Array(count), row = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    col[i] = Math.floor((pos[i * 3] - minX) / cell);
    row[i] = Math.floor((pos[i * 3 + 1] - minY) / cell);
  }
  const cols = Math.floor((maxX - minX) / cell) + 1;
  const rows = Math.floor((maxY - minY) / cell) + 1;
  return { minX, minY, cell, cols, rows, col, row };
}

const near = (g: Grid, i: number, j: number) => Math.abs(g.col[i] - g.col[j]) <= 1 && Math.abs(g.row[i] - g.row[j]) <= 1;

/**
 * How the grid saves work: the pairs compared with it (each node with the others in its
 * cell and the eight around it, each pair once), and without it (every pair)
 */
export function comparisons(g: Grid, count: number) {
  const inCell = new Int32Array(g.cols * g.rows);
  for (let i = 0; i < count; i++) inCell[g.col[i] + g.row[i] * g.cols]++;
  let twice = 0;
  for (let i = 0; i < count; i++) {
    for (let r = Math.max(0, g.row[i] - 1); r <= Math.min(g.rows - 1, g.row[i] + 1); r++) {
      for (let c = Math.max(0, g.col[i] - 1); c <= Math.min(g.cols - 1, g.col[i] + 1); c++) twice += inCell[c + r * g.cols];
    }
    twice--; // not itself
  }
  return { compared: twice / 2, pairs: (count * (count - 1)) / 2 };
}

/** Node `focus`'s neighbours: the nodes in its cell and the eight around it */
export function neighboursOf(g: Grid, count: number, focus: number) {
  const out: number[] = [];
  for (let j = 0; j < count; j++) if (j !== focus && near(g, focus, j)) out.push(j);
  return out;
}

/** Whether nodes i and j are close enough to link (in 3D, as the engine measures) */
export function inReach(pos: Float32Array, i: number, j: number, distance: number) {
  const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1], dz = pos[i * 3 + 2] - pos[j * 3 + 2];
  return dx * dx + dy * dy + dz * dz < distance * distance;
}

/**
 * The grid's lines, the focus node's nine cells, and a line to each neighbour it's
 * compared with: solid if close enough to link, faint if not
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  pos: Float32Array,
  g: Grid,
  focus: number,
  neighbours: number[],
  { ink, accent }: OverlayStyle
) {
  const size = g.cell * stage.zoom;
  const left = px(g.minX, stage), bottom = py(g.minY, stage);

  // The focus node's cell and the eight around it
  const c = g.col[focus], r = g.row[focus];
  ctx.fillStyle = accent;
  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
      ctx.globalAlpha = dc === 0 && dr === 0 ? 0.16 : 0.07;
      ctx.fillRect(left + (c + dc) * size, bottom - (r + dr + 1) * size, size, size);
    }
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = `rgba(${ink}, 0.13)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= g.cols; k++) {
    const x = Math.round(left + k * size) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, stage.h);
  }
  for (let k = 0; k <= g.rows; k++) {
    const y = Math.round(bottom - k * size) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(stage.w, y);
  }
  ctx.stroke();

  const fx = px(pos[focus * 3], stage), fy = py(pos[focus * 3 + 1], stage);
  for (const j of neighbours) {
    const linked = inReach(pos, focus, j, g.cell);
    ctx.strokeStyle = linked ? accent : `rgba(${ink}, 0.35)`;
    ctx.lineWidth = linked ? 1.6 : 1;
    ctx.setLineDash(linked ? [] : [3, 4]);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(px(pos[j * 3], stage), py(pos[j * 3 + 1], stage));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(fx, fy, 9, 0, Math.PI * 2);
  ctx.stroke();
}

/** Each node's pull towards where its drift path has it, and the cursor's reach */
export function drawSprings(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  pos: Float32Array,
  homes: Float32Array,
  count: number,
  cursor: { x: number; y: number; radius: number } | null,
  { ink, accent }: OverlayStyle
) {
  ctx.strokeStyle = `rgba(${ink}, 0.4)`;
  ctx.fillStyle = `rgba(${ink}, 0.45)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const x = px(pos[i * 3], stage), y = py(pos[i * 3 + 1], stage);
    const hx = px(homes[i * 2], stage), hy = py(homes[i * 2 + 1], stage);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);
  }
  if (cursor) {
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(px(cursor.x, stage), py(cursor.y, stage), cursor.radius * stage.zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

/** The pointer the figure moves when the reader isn't pointing (cursorMarks.ts's shape) */
const POINTER = typeof Path2D === "undefined" ? null : new Path2D("M3 2 L3 19 L7.6 14.6 L10.6 21.4 L13.6 20.1 L10.7 13.4 L17 13.4 Z");

export function drawPointer(ctx: CanvasRenderingContext2D, stage: Stage, x: number, y: number, { ink }: OverlayStyle) {
  if (!POINTER) return;
  ctx.save();
  ctx.translate(px(x, stage) - 3, py(y, stage) - 2);
  ctx.fillStyle = `rgba(${ink}, 0.85)`;
  ctx.fill(POINTER);
  ctx.restore();
}
