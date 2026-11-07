/**
 * A post diagram's scene and state, kept outside React. Three draw calls: the links, the
 * nodes and the packets travelling the picked flow's hops. The reader turns it by
 * dragging; otherwise it sways a little. It also moves the HTML labels with their nodes.
 */
import * as THREE from "three";
import { blendingFor } from "@/components/three/blending";
import { networkPalette, type NetworkPalette } from "@/components/three/palette";
import type { ThemeColors } from "@/lib/theme/readThemeColors";
import {
  FOV,
  LABEL_GAP,
  LABEL_RISE,
  NARROW_STAGE,
  NODE_SIZE,
  OPENING_PITCH,
  OPENING_YAW,
  fit,
  type DiagramGraph,
  type DiagramPicture,
} from "./layout";
import { LINK_FRAGMENT, LINK_VERTEX, NODE_FRAGMENT, NODE_VERTEX } from "./shaders";

export interface DiagramPalette extends NetworkPalette {
  /** Nodes and links outside the picked flow */
  dim: string;
}

/** The background network's colours, plus a quiet one for what's outside the flow */
export function diagramPalette(colors: ThemeColors, dark: boolean): DiagramPalette {
  const dim = new THREE.Color(colors.background.base.hex).lerp(new THREE.Color(colors.foreground.base.hex), dark ? 0.3 : 0.2);
  return { ...networkPalette(colors, dark), dim: `#${dim.getHexString()}` };
}

export interface DiagramInputs {
  flow: number;
  /** The node pointed at or picked, or -1 */
  focus: number;
  palette: DiagramPalette;
  /** Reduced motion: no sway or packets, and changes show at once */
  still: boolean;
}

/**
 * How far the reader can turn it from the opening view, and how fast, in radians (per
 * pixel): diagrams are mostly flat, so turned much further they'd be seen edge on
 */
const TURN = { yaw: 0.6, pitch: 0.35 };
const DRAG = { yaw: 0.005, pitch: 0.004 };
const SWAY = { amount: 0.08, rate: 0.2 };
/** Flow and focus changes ease in at this rate, per second */
const EASE = 9;
const PACKET = { every: 0.9, hopsPerSecond: 0.7, size: 1.6 };
const MAX_PACKETS = 64;
/** A pointer within this many pixels of a node is pointing at it */
const PICK_RADIUS = 24;
/** A press that moves less than this many pixels is a tap */
const TAP_SLOP = 5;
/** Frames after a pause (offscreen, a hidden tab) don't jump ahead */
const MAX_DELTA = 0.1;
/** Labels stay this far inside the stage's sides, in CSS pixels */
const LABEL_MARGIN = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function createDiagramEngine(graph: DiagramGraph, picture: DiagramPicture) {
  const { positions, edges, hops, inFlow } = graph;
  const n = positions.length;
  const root = new THREE.Group();
  const dynamic = (array: Float32Array, size: number) =>
    new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage);

  // Nodes: one point sprite each
  const nodePositions = new Float32Array(positions.flat());
  const nodeSize = new Float32Array(n);
  const nodeColor = new Float32Array(n * 3);
  const nodeAlpha = new Float32Array(n);
  const nodeGeometry = new THREE.BufferGeometry();
  nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
  nodeGeometry.setAttribute("aSize", dynamic(nodeSize, 1));
  nodeGeometry.setAttribute("aColor", dynamic(nodeColor, 3));
  nodeGeometry.setAttribute("aAlpha", dynamic(nodeAlpha, 1));
  const nodeMaterial = new THREE.ShaderMaterial({
    vertexShader: NODE_VERTEX,
    fragmentShader: NODE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: { uScale: { value: 1 }, uHalo: { value: 1 }, uGlint: { value: 0.5 } },
  });
  const nodes = new THREE.Points(nodeGeometry, nodeMaterial);

  // Packets: the same sprites, brighter
  const packetPositions = new Float32Array(MAX_PACKETS * 3);
  const packetSize = new Float32Array(MAX_PACKETS).fill(PACKET.size);
  const packetColor = new Float32Array(MAX_PACKETS * 3);
  const packetAlpha = new Float32Array(MAX_PACKETS);
  const packetGeometry = new THREE.BufferGeometry();
  packetGeometry.setAttribute("position", dynamic(packetPositions, 3));
  packetGeometry.setAttribute("aSize", new THREE.BufferAttribute(packetSize, 1));
  packetGeometry.setAttribute("aColor", dynamic(packetColor, 3));
  packetGeometry.setAttribute("aAlpha", dynamic(packetAlpha, 1));
  packetGeometry.setDrawRange(0, 0);
  const packetMaterial = nodeMaterial.clone();
  packetMaterial.uniforms.uScale = nodeMaterial.uniforms.uScale;
  const packets = new THREE.Points(packetGeometry, packetMaterial);

  // Links: one instanced screen-space quad each
  const linkGeometry = new THREE.InstancedBufferGeometry();
  linkGeometry.setAttribute("corner", new THREE.BufferAttribute(new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]), 2));
  linkGeometry.setIndex([0, 1, 2, 0, 2, 3]);
  const linkStart = new Float32Array(edges.flatMap((e) => positions[e.a]));
  const linkEnd = new Float32Array(edges.flatMap((e) => positions[e.b]));
  const linkColorA = new Float32Array(edges.length * 4);
  const linkColorB = new Float32Array(edges.length * 4);
  const linkWidth = new Float32Array(edges.length);
  const instanced = (array: Float32Array, size: number) =>
    new THREE.InstancedBufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage);
  linkGeometry.setAttribute("iStart", new THREE.InstancedBufferAttribute(linkStart, 3));
  linkGeometry.setAttribute("iEnd", new THREE.InstancedBufferAttribute(linkEnd, 3));
  linkGeometry.setAttribute("iColorA", instanced(linkColorA, 4));
  linkGeometry.setAttribute("iColorB", instanced(linkColorB, 4));
  linkGeometry.setAttribute("iWidth", instanced(linkWidth, 1));
  linkGeometry.instanceCount = edges.length;
  const linkMaterial = new THREE.ShaderMaterial({
    vertexShader: LINK_VERTEX,
    fragmentShader: LINK_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: { uResolution: { value: new THREE.Vector2(1, 1) }, uPixelRatio: { value: 1 } },
  });
  const links = new THREE.Mesh(linkGeometry, linkMaterial);

  for (const [i, object] of [links, nodes, packets].entries()) {
    object.frustumCulled = false;
    object.renderOrder = i;
  }
  root.add(links, nodes, packets);

  const color = { core: new THREE.Color(), dim: new THREE.Color(), lineA: new THREE.Color(), lineB: new THREE.Color(), packet: new THREE.Color() };
  const tmp = new THREE.Color();
  const point = new THREE.Vector3();

  // Eased towards 1 for nodes and links in the flow, and for the focused node
  const nodeOn = new Float32Array(n);
  const nodeHot = new Float32Array(n);
  const linkOn = new Float32Array(edges.length);
  let eased = false;

  // Each packet: the hop it's on, and how far along (0 to 1)
  const packetHop = new Int16Array(MAX_PACKETS);
  const packetT = new Float32Array(MAX_PACKETS);
  let packetCount = 0;
  let packetFlow = -1;
  let untilPacket = 0;

  let yaw = OPENING_YAW;
  let pitch = OPENING_PITCH;
  let swayTime = 0;
  let drag: { x: number; y: number; yaw: number; pitch: number; moved: boolean } | null = null;

  // Each node on the stage, in CSS pixels; the labels' own place (their CSS) for the fit
  const screen = new Float32Array(n * 2);
  const labelHome = new Float32Array(n * 2);
  const labelHalfWidth = new Float32Array(n);
  const labelHeight = new Float32Array(n);
  // Where each label was placed this frame (left, top, right, bottom), and which were above their node
  const labelBox = new Float32Array(n * 4);
  const labelAbove = new Uint8Array(n);
  let movedLabels: (HTMLElement | null)[] = [];
  let fitted = "";

  function setPalette(palette: DiagramPalette) {
    color.core.set(palette.core);
    color.dim.set(palette.dim);
    color.lineA.set(palette.lineA);
    color.lineB.set(palette.lineB);
    color.packet.set(palette.packet);
    for (let k = 0; k < MAX_PACKETS; k++) color.packet.toArray(packetColor, k * 3);
    packetGeometry.getAttribute("aColor").needsUpdate = true;
    for (const material of [nodeMaterial, packetMaterial, linkMaterial]) {
      material.blending = blendingFor(palette.additive);
      material.needsUpdate = true;
    }
    nodeMaterial.uniforms.uHalo.value = palette.additive ? 1 : 0.4;
    nodeMaterial.uniforms.uGlint.value = palette.additive ? 0.5 : 0;
    packetMaterial.uniforms.uHalo.value = palette.additive ? 1.2 : 0.5;
    packetMaterial.uniforms.uGlint.value = palette.additive ? 0.9 : 0;
    eased = false;
  }

  /** Zooms and shifts the camera so the opening view fills the stage as the CSS picture does */
  function fitCamera(camera: THREE.PerspectiveCamera, width: number, height: number, dpr: number) {
    const { scale, middle } = fit(width, height, picture);
    const focal = height / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.zoom = scale / focal;
    camera.setViewOffset(
      width,
      height,
      picture.middle[0] * scale,
      height / 2 - picture.middle[1] * scale - middle[1],
      width,
      height
    );
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    nodeMaterial.uniforms.uScale.value = scale * dpr;
    linkMaterial.uniforms.uResolution.value.set(width * dpr, height * dpr);
    linkMaterial.uniforms.uPixelRatio.value = dpr;
    picture.points.forEach((p, i) => {
      labelHome[i * 2] = middle[0] + p.x * scale;
      labelHome[i * 2 + 1] = middle[1] - p.y * scale;
    });
  }

  function step(delta: number, inputs: DiagramInputs) {
    const { flow, focus, still } = inputs;
    const k = still || !eased ? 1 : 1 - Math.exp(-EASE * delta);
    let settling = false;
    const ease = (values: Float32Array, i: number, target: number) => {
      values[i] += (target - values[i]) * k;
      if (Math.abs(target - values[i]) > 1e-3) settling = true;
      return values[i];
    };

    for (let i = 0; i < n; i++) {
      const on = ease(nodeOn, i, inFlow[flow][i] ? 1 : 0);
      const hot = ease(nodeHot, i, i === focus ? 1 : 0);
      nodeSize[i] = (NODE_SIZE.off + (NODE_SIZE.on - NODE_SIZE.off) * on) * (1 + 0.3 * hot);
      tmp.copy(color.dim).lerp(color.core, 0.15 + 0.85 * on).toArray(nodeColor, i * 3);
      nodeAlpha[i] = 0.6 + 0.4 * on;
    }
    edges.forEach((edge, e) => {
      const on = ease(linkOn, e, edge.flows.includes(flow) ? 1 : 0);
      const alpha = 0.4 + 0.5 * on;
      tmp.copy(color.dim).lerp(color.lineA, on).toArray(linkColorA, e * 4);
      tmp.copy(color.dim).lerp(color.lineB, on).toArray(linkColorB, e * 4);
      linkColorA[e * 4 + 3] = linkColorB[e * 4 + 3] = alpha;
      linkWidth[e] = 1.2 + 1.4 * on;
    });
    eased = true;

    // A packet sets off along the flow's first hop every so often, then takes each hop in turn
    const flowHops = hops[flow];
    if (flow !== packetFlow || still) {
      packetCount = 0;
      untilPacket = 0;
      packetFlow = flow;
    }
    if (!still) {
      untilPacket -= delta;
      if (untilPacket <= 0) {
        untilPacket += PACKET.every;
        if (packetCount < MAX_PACKETS) {
          packetHop[packetCount] = 0;
          packetT[packetCount++] = 0;
        }
      }
      let kept = 0;
      for (let p = 0; p < packetCount; p++) {
        let t = packetT[p] + delta * PACKET.hopsPerSecond;
        let hop = packetHop[p];
        while (t >= 1) {
          t -= 1;
          hop++;
        }
        if (hop >= flowHops.length) continue;
        packetT[kept] = t;
        packetHop[kept++] = hop;
      }
      packetCount = kept;
    }
    for (let p = 0; p < packetCount; p++) {
      const [a, b] = flowHops[packetHop[p]];
      const t = packetT[p];
      for (let c = 0; c < 3; c++) packetPositions[p * 3 + c] = positions[a][c] + (positions[b][c] - positions[a][c]) * t;
      packetAlpha[p] = Math.min(1, t * 8, (1 - t) * 8);
    }
    packetGeometry.setDrawRange(0, packetCount);

    for (const name of ["aSize", "aColor", "aAlpha"]) nodeGeometry.getAttribute(name).needsUpdate = true;
    for (const name of ["position", "aAlpha"]) packetGeometry.getAttribute(name).needsUpdate = true;
    for (const name of ["iColorA", "iColorB", "iWidth"]) linkGeometry.getAttribute(name).needsUpdate = true;
    return settling;
  }

  /**
   * Draws a frame's worth of change and moves the labels. Returns whether it is still
   * moving, so the canvas keeps rendering.
   */
  function frame(
    rawDelta: number,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    dpr: number,
    inputs: DiagramInputs,
    labels: (HTMLElement | null)[]
  ) {
    const delta = Math.min(rawDelta, MAX_DELTA);
    const size = `${width}x${height}@${dpr}`;
    if (size !== fitted) {
      fitCamera(camera, width, height, dpr);
      labels.forEach((label, i) => {
        labelHalfWidth[i] = (label?.offsetWidth ?? 0) / 2;
        labelHeight[i] = label?.offsetHeight ?? 0;
      });
      fitted = size;
    }

    if (!drag && !inputs.still) swayTime += delta;
    const sway = inputs.still ? 0 : Math.sin(swayTime * SWAY.rate) * SWAY.amount;
    root.rotation.set(pitch, yaw + sway, 0);
    root.updateMatrixWorld();
    const settling = step(delta, inputs);

    for (let i = 0; i < n; i++) {
      point.fromArray(nodePositions, i * 3).applyMatrix4(root.matrixWorld).project(camera);
      screen[i * 2] = ((point.x + 1) / 2) * width;
      screen[i * 2 + 1] = ((1 - point.y) / 2) * height;
    }
    placeLabels(width, inputs, labels);
    return !inputs.still || settling || drag !== null;
  }

  /** Whether a box overlaps any of the first `count` labels placed */
  function overlapsPlaced(left: number, top: number, right: number, bottom: number, count: number) {
    for (let k = 0; k < count; k++) {
      const b = k * 4;
      if (left < labelBox[b + 2] && right > labelBox[b] && top < labelBox[b + 3] && bottom > labelBox[b + 1]) return true;
    }
    return false;
  }

  /**
   * Moves each label with its node, on from where the CSS put it. A label stays on the
   * stage, and hangs below its node unless it would overlap one placed before it (the
   * focused node's first, then the flow's), when it rises above instead. It only drops
   * back once there's clear room, so it doesn't flicker between the two.
   */
  function placeLabels(width: number, { flow, focus }: DiagramInputs, labels: (HTMLElement | null)[]) {
    movedLabels = labels;
    let placed = 0;
    const rank = (i: number) => (i === focus ? 0 : inFlow[flow][i] ? 1 : 2);
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < n; i++) {
        const label = labels[i];
        if (!label || rank(i) !== pass) continue;
        const half = labelHalfWidth[i], h = labelHeight[i];
        const reach = half + LABEL_MARGIN;
        const x = reach * 2 < width ? clamp(screen[i * 2], reach, width - reach) : screen[i * 2];
        const below = screen[i * 2 + 1] + LABEL_GAP;
        const above = screen[i * 2 + 1] - LABEL_RISE - h;
        let top = below;
        // Narrow stages hide the labels outside the flow, so they don't take up room
        if (width >= NARROW_STAGE || pass < 2) {
          const room = labelAbove[i] ? 4 : 0;
          const belowFree = !overlapsPlaced(x - half - room, below - room, x + half + room, below + h + room, placed);
          if (!belowFree && !overlapsPlaced(x - half, above, x + half, above + h, placed)) top = above;
          labelAbove[i] = top === above ? 1 : 0;
          labelBox[placed * 4] = x - half;
          labelBox[placed * 4 + 1] = top;
          labelBox[placed * 4 + 2] = x + half;
          labelBox[placed * 4 + 3] = top + h;
          placed++;
        }
        label.style.translate = `${(x - labelHome[i * 2]).toFixed(1)}px ${(top - below + screen[i * 2 + 1] - labelHome[i * 2 + 1]).toFixed(1)}px`;
      }
    }
  }

  /** The node nearest a point on the stage, within reach of the pointer, or -1 */
  function pick(x: number, y: number) {
    let best = -1;
    let bestDistance = PICK_RADIUS;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(screen[i * 2] - x, screen[i * 2 + 1] - y);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    return best;
  }

  function pointerDown(x: number, y: number) {
    drag = { x, y, yaw, pitch, moved: false };
  }

  /** Turns the diagram while dragging; returns the node pointed at, or -1 */
  function pointerMove(x: number, y: number) {
    if (drag) {
      const dx = x - drag.x, dy = y - drag.y;
      if (Math.hypot(dx, dy) > TAP_SLOP) drag.moved = true;
      yaw = clamp(drag.yaw + dx * DRAG.yaw, OPENING_YAW - TURN.yaw, OPENING_YAW + TURN.yaw);
      pitch = clamp(drag.pitch + dy * DRAG.pitch, OPENING_PITCH - TURN.pitch, OPENING_PITCH + TURN.pitch);
    }
    return pick(x, y);
  }

  /** Ends a press: for a tap, the node tapped (or -1 for none); undefined after a drag */
  function pointerUp(x: number, y: number) {
    const tapped = drag && !drag.moved ? pick(x, y) : undefined;
    drag = null;
    return tapped;
  }

  /** The browser took the gesture over (a vertical swipe scrolls the page) */
  function pointerCancel() {
    drag = null;
  }

  function dispose() {
    // The labels go back to their place in the still picture
    for (const label of movedLabels) label?.style.removeProperty("translate");
    nodeGeometry.dispose();
    packetGeometry.dispose();
    linkGeometry.dispose();
    nodeMaterial.dispose();
    packetMaterial.dispose();
    linkMaterial.dispose();
  }

  return {
    root,
    setPalette,
    frame,
    pointerDown,
    pointerMove,
    pointerUp,
    pointerCancel,
    get dragging() {
      return drag !== null;
    },
    dispose,
  };
}

export type DiagramEngine = ReturnType<typeof createDiagramEngine>;
