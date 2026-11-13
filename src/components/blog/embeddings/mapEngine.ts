import * as THREE from "three";
import { MAP, type Kind, type Layout } from "./parts";

/**
 * The map's scene, kept outside React (as the diagrams' and the network's are): one
 * buffer of points (the passages, then the question), the question's lines to its nearest
 * passages, and how far the reader has turned it.
 */

export interface MapInputs {
  layout: Layout;
  /** The preset question shown, or -1 */
  question: number;
  /** The passage pointed at, or -1 */
  focus: number;
  colours: Record<Kind | "ask" | "line", THREE.Color>;
  /** Reduced motion: no turning by itself, and changes show at once */
  still: boolean;
}

const N = MAP.points.length;
/** How many of a question's nearest passages are joined to it */
export const JOINED = 5;
/** Radians a second it turns by itself, and per pixel dragged */
const SPIN = 0.12;
const DRAG = 0.006;
/** How fast the points glide to a new layout, per second */
const EASE = 4;
/** How near the pointer must be to a point to pick it, in pixels */
const PICK = 16;
/** Point sizes: at rest, with a question shown (lit or not), and pointed at or the question itself */
const SIZE = { rest: 17, lit: 24, unlit: 13, focus: 30 };

const VERTEX = /* glsl */ `
  attribute vec3 tint;
  attribute float size;
  uniform float scale;
  varying vec3 vTint;
  void main() {
    vTint = tint;
    vec4 seen = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * seen;
    gl_PointSize = size * scale / -seen.z;
  }
`;
// A soft-edged disc with a brighter core
const FRAGMENT = /* glsl */ `
  varying vec3 vTint;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float disc = 1.0 - smoothstep(0.82, 1.0, d);
    float core = 1.0 - smoothstep(0.0, 0.7, d);
    gl_FragColor = vec4(vTint * (0.8 + 0.35 * core), disc);
  }
`;

export function createMapEngine() {
  const positions = new Float32Array((N + 1) * 3);
  const sizes = new Float32Array(N + 1);
  const tints = new Float32Array((N + 1) * 3);
  MAP.points.forEach((p, i) => positions.set(p.umap, i * 3));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("tint", new THREE.BufferAttribute(tints, 3));
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms: { scale: { value: 1 } }, transparent: true, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  const ends = new Float32Array(JOINED * 6);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(ends, 3));
  const lineMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.7 });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;

  const root = new THREE.Group();
  root.add(lines, points);

  const turn = { yaw: 0.5, pitch: 0.18 };
  let drag: { x: number; y: number } | null = null;
  let camera: THREE.Camera | null = null;
  const spot = new THREE.Vector3();
  /** Where passage `i` is on a canvas `width` by `height` */
  const onScreen = (i: number, width: number, height: number) => {
    spot.fromArray(positions, i * 3).applyMatrix4(points.matrixWorld);
    if (camera) spot.project(camera);
    return [((spot.x + 1) / 2) * width, ((1 - spot.y) / 2) * height] as const;
  };

  return {
    root,
    get dragging() {
      return drag !== null;
    },
    pointerDown(x: number, y: number) {
      drag = { x, y };
    },
    /** Turns it while dragged */
    pointerMove(x: number, y: number) {
      if (!drag) return;
      turn.yaw += (x - drag.x) * DRAG;
      turn.pitch = Math.max(-1.2, Math.min(1.2, turn.pitch + (y - drag.y) * DRAG));
      drag = { x, y };
    },
    pointerUp() {
      drag = null;
    },
    /** The passage under the pointer on a canvas `width` by `height`, or -1 */
    pick(x: number, y: number, width: number, height: number) {
      let best = -1;
      let nearest = PICK;
      for (let i = 0; i < N; i++) {
        const [px, py] = onScreen(i, width, height);
        const d = Math.hypot(px - x, py - y);
        if (d < nearest) [best, nearest] = [i, d];
      }
      return best;
    },
    frame(delta: number, view: THREE.Camera, width: number, height: number, dpr: number, { layout, question, focus, colours, still }: MapInputs, label: HTMLElement | null) {
      camera = view;
      if (!drag && !still && focus < 0) turn.yaw += SPIN * delta;
      root.rotation.set(turn.pitch, turn.yaw, 0);
      root.updateMatrixWorld();

      // Everything glides to where the layout puts it
      const asked = question >= 0 ? MAP.questions[question] : null;
      const near = asked?.meaning.slice(0, JOINED) ?? [];
      const ease = still ? 1 : 1 - Math.exp(-EASE * delta);
      for (let i = 0; i <= N; i++) {
        const to = i < N ? MAP.points[i][layout] : (asked?.[layout] ?? [0, 0, 0]);
        for (let k = 0; k < 3; k++) positions[i * 3 + k] += (to[k] - positions[i * 3 + k]) * ease;
        const lit = i === N || i === focus || near.includes(i);
        const size = i === N ? (asked ? SIZE.focus : 0) : i === focus ? SIZE.focus : !asked ? SIZE.rest : lit ? SIZE.lit : SIZE.unlit;
        sizes[i] += (size - sizes[i]) * ease;
        const colour = i === N ? colours.ask : colours[MAP.points[i].kind as Kind];
        const dim = asked && !lit ? 0.35 : 1;
        tints.set([colour.r * dim, colour.g * dim, colour.b * dim], i * 3);
      }
      for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;
      material.uniforms.scale.value = height * dpr * 0.0062;

      // The question's lines to its nearest passages
      near.forEach((p, j) => {
        ends.set(positions.subarray(N * 3, N * 3 + 3), j * 6);
        ends.set(positions.subarray(p * 3, p * 3 + 3), j * 6 + 3);
      });
      lineGeometry.attributes.position.needsUpdate = true;
      lines.visible = near.length > 0;
      lineMaterial.color.copy(colours.line);

      // The pointed-at passage's name follows it
      if (label) {
        if (focus >= 0) {
          const [x, y] = onScreen(focus, width, height);
          label.style.transform = `translate(calc(${x}px - 50%), ${y + 14}px)`;
        }
        label.style.opacity = focus >= 0 ? "1" : "0";
      }
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    },
  };
}
