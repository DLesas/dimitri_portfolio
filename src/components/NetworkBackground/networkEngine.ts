/**
 * The network background's simulation and GPU resources, kept outside React.
 *
 * Nodes follow the original rules (mouse repulsion, DOM collider repulsion, return force,
 * damping), except that each wanders on a drift path of its own. They live in typed
 * arrays and are stepped at a fixed 60 Hz. Connections keep the original rules (dynamic
 * distance, closest first, lifetimes with fade in / fade out), but every pair is
 * considered and each node has at most a few, so they spread evenly rather than gathering
 * around some nodes. Everything is drawn with four draw calls: other visitors' cursor
 * glows, the cursor glow, all connections, all nodes. Other visitors' cursors
 * (liveCursors.ts) push nodes like this visitor's does.
 */
import * as THREE from "three";
import {
  ANIMATION_CONFIG as A,
  EFFECTS_CONFIG,
  PERFORMANCE_CONFIGS,
  VISUAL_CONFIG,
  WORLD_CONFIG,
  type PerformanceLevel,
} from "./constants";
import {
  CURSOR_FRAGMENT,
  CURSOR_VERTEX,
  LINK_FRAGMENT,
  LINK_VERTEX,
  NODE_FRAGMENT,
  NODE_VERTEX,
  REMOTE_CURSOR_FRAGMENT,
  REMOTE_CURSOR_VERTEX,
} from "./shaders";
import { PX_PER_UNIT } from "./world";
import type { RemoteCursor } from "./liveCursors";
import { blendingFor } from "@/components/three/blending";
import type { NetworkBackgroundSettings } from "@/contexts/SettingsContext";
import type { ThemeColors } from "@/lib/theme/readThemeColors";

export type DOMCollider = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MousePosition = { x: number; y: number; isActive: boolean };

export interface NetworkPalette {
  core: string;
  rim: string;
  halo: string;
  lineA: string;
  lineB: string;
  packet: string;
  additive: boolean;
}

/** The network's colours for the theme; glows are additive on a dark background */
export function networkPalette(colors: ThemeColors, dark: boolean): NetworkPalette {
  const primary = colors.primary.shades;
  const secondary = colors.secondary.shades;
  const core = new THREE.Color(primary[500].hex).lerp(new THREE.Color(secondary[500].hex), 0.5);
  if (!dark) core.copy(new THREE.Color(primary[600].hex));
  return {
    core: `#${core.getHexString()}`,
    rim: `#${core.clone().multiplyScalar(dark ? 0.55 : 0.7).getHexString()}`,
    halo: dark ? primary[400].hex : primary[500].hex,
    lineA: dark ? primary[500].hex : primary[600].hex,
    lineB: dark ? secondary[500].hex : secondary[600].hex,
    packet: dark ? primary[100].hex : primary[500].hex,
    additive: dark,
  };
}

export interface NetworkInputs {
  settings: NetworkBackgroundSettings;
  connectionDistance: number;
  performanceLevel: PerformanceLevel;
  /** Freeze the network: no drift, packets or mouse response */
  still: boolean;
}

export interface FrameContext {
  width: number;
  height: number;
  dpr: number;
  mouse: MousePosition;
  /** Other visitors' cursors */
  remotes: RemoteCursor[];
  colliders: DOMCollider[];
}

// The physics constants were tuned per 60 Hz frame; stepping at a fixed 60 Hz keeps the
// feel identical on 120 Hz screens and when the browser drops frames.
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 4;
// Each node's drift: per axis, two waves with their own rates (radians per second at
// speed 1) and phases. Rates that never line up keep the path from closing into a loop.
const WANDER_PER_NODE = 12; // 3 axes x (rate 1, phase 1, rate 2, phase 2)
// Sliders top out at 300 nodes / 300 connections
const MAX_CONNECTIONS = 512;
const PAIR_KEY_STRIDE = 4096;
/** Simulated time a reduced-motion network runs before freezing, so nodes clear the text */
const SETTLE_STEPS = 180;

const NO_MOUSE: MousePosition = { x: 0, y: 0, isActive: false };
const MAX_REMOTE_CURSORS = 16;

/**
 * A cursor glow's sprite size in CSS pixels, from that visitor's mouse repulsion radius:
 * it reaches as far as the nodes' mouse highlight (MOUSE_GLOW_REACH of the radius), so a
 * wider push shows as a wider glow. 420px at the default radius.
 */
const glowSizePx = (repulsionRadius: number) => 2 * A.MOUSE_GLOW_REACH * repulsionRadius * PX_PER_UNIT;
/** A packet starts just before its line and fades out just past the end (CSS pixels) */
const PACKET_ENTRY_EXIT_PX = 40;

const { smoothstep } = THREE.MathUtils;

function connectionBuffers() {
  return {
    a: new Int32Array(MAX_CONNECTIONS),
    b: new Int32Array(MAX_CONNECTIONS),
    dist: new Float32Array(MAX_CONNECTIONS),
    birth: new Float32Array(MAX_CONNECTIONS),
    life: new Float32Array(MAX_CONNECTIONS),
    seed: new Float32Array(MAX_CONNECTIONS),
    count: 0,
  };
}

function shaderMaterial(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

export function createNetworkEngine() {
  // ---- GPU resources: one Points, one instanced quad batch, one cursor sprite ----
  const nodeGeometry = new THREE.BufferGeometry();
  const nodeMaterial = shaderMaterial(NODE_VERTEX, NODE_FRAGMENT, {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uZoom: { value: PX_PER_UNIT },
    uRadius: { value: VISUAL_CONFIG.NODE_RADIUS },
    uPulseAmp: { value: A.SCALE_PULSE_AMPLITUDE },
    uPulseSpeed: { value: A.SCALE_PULSE_SPEED },
    uGlow: { value: EFFECTS_CONFIG.GLOW_INTENSITY },
    uOpacity: { value: VISUAL_CONFIG.NODE_OPACITY },
    uIntro: { value: 0 },
    uCore: { value: new THREE.Color() },
    uRim: { value: new THREE.Color() },
    uHalo: { value: new THREE.Color() },
    uMouse: { value: new THREE.Vector2() },
    uMouseActive: { value: 0 },
    uMouseRadius: { value: A.MOUSE_REPULSION_RADIUS },
  });
  const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
  nodes.frustumCulled = false;
  nodes.renderOrder = 2;

  const linkGeometry = new THREE.InstancedBufferGeometry();
  linkGeometry.setAttribute(
    "corner",
    new THREE.BufferAttribute(new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]), 2)
  );
  linkGeometry.setIndex([0, 1, 2, 0, 2, 3]);
  const instanced = (itemSize: number) =>
    new THREE.InstancedBufferAttribute(new Float32Array(MAX_CONNECTIONS * itemSize), itemSize).setUsage(
      THREE.DynamicDrawUsage
    );
  const iStart = instanced(3);
  const iEnd = instanced(3);
  const iAlpha = instanced(1);
  const iWidth = instanced(1);
  const iSeed = instanced(1);
  const linkAttributes = [iStart, iEnd, iAlpha, iWidth, iSeed];
  Object.entries({ iStart, iEnd, iAlpha, iWidth, iSeed }).forEach(([name, attr]) =>
    linkGeometry.setAttribute(name, attr)
  );
  linkGeometry.instanceCount = 0;
  const linkMaterial = shaderMaterial(LINK_VERTEX, LINK_FRAGMENT, {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPixelRatio: { value: 1 },
    uGlow: { value: EFFECTS_CONFIG.GLOW_INTENSITY },
    uTime: { value: 0 },
    uPulseDensity: { value: EFFECTS_CONFIG.PULSE_DENSITY },
    uPulseSpeed: { value: EFFECTS_CONFIG.PULSE_SPEED },
    uTravelPx: { value: 400 },
    uIntro: { value: 0 },
    uColorA: { value: new THREE.Color() },
    uColorB: { value: new THREE.Color() },
    uPacket: { value: new THREE.Color() },
    uPacketStrength: { value: 1 },
    uPacketHaze: { value: 0.35 },
    uMouse: { value: new THREE.Vector2() },
    uMouseActive: { value: 0 },
    uMouseRadius: { value: A.MOUSE_REPULSION_RADIUS },
  });
  const links = new THREE.Mesh(linkGeometry, linkMaterial);
  links.frustumCulled = false;
  links.renderOrder = 1;

  const cursorGeometry = new THREE.BufferGeometry();
  const cursorPosition = new THREE.BufferAttribute(new Float32Array(3), 3);
  cursorGeometry.setAttribute("position", cursorPosition);
  const cursorMaterial = shaderMaterial(CURSOR_VERTEX, CURSOR_FRAGMENT, {
    uColor: { value: new THREE.Color() },
    uStrength: { value: 0 },
    uSizePx: { value: 0 }, // set every frame
  });
  const cursor = new THREE.Points(cursorGeometry, cursorMaterial);
  cursor.frustumCulled = false;

  const remoteGeometry = new THREE.BufferGeometry();
  const remotePosition = new THREE.BufferAttribute(new Float32Array(MAX_REMOTE_CURSORS * 3), 3);
  const remoteColor = new THREE.BufferAttribute(new Float32Array(MAX_REMOTE_CURSORS * 3), 3);
  const remoteStrength = new THREE.BufferAttribute(new Float32Array(MAX_REMOTE_CURSORS), 1);
  const remoteSize = new THREE.BufferAttribute(new Float32Array(MAX_REMOTE_CURSORS), 1);
  remoteGeometry.setAttribute("position", remotePosition);
  remoteGeometry.setAttribute("aColor", remoteColor);
  remoteGeometry.setAttribute("aStrength", remoteStrength);
  remoteGeometry.setAttribute("aSizePx", remoteSize);
  const remoteMaterial = shaderMaterial(REMOTE_CURSOR_VERTEX, REMOTE_CURSOR_FRAGMENT, {});
  const remoteCursors = new THREE.Points(remoteGeometry, remoteMaterial);
  remoteCursors.frustumCulled = false;
  const remoteRgb = new THREE.Color();

  const root = new THREE.Group();
  root.add(remoteCursors, cursor, links, nodes);

  // ---- simulation state ----
  let cap = 0;
  let count = 0;
  let base = new Float32Array(0);
  let vel = new Float32Array(0);
  let wander = new Float32Array(0);
  let position: THREE.BufferAttribute | null = null;
  let time = 0;
  let acc = 0;
  let steps = 0;
  let intro = 0;
  let mouseHeat = 0;
  let additive = true;
  let conn = connectionBuffers();
  let next = connectionBuffers();
  const slotByKey = new Map<number, number>();
  // Every pair close enough to link, grown as needed
  let candI = new Int32Array(MAX_CONNECTIONS * 2);
  let candJ = new Int32Array(MAX_CONNECTIONS * 2);
  let candD2 = new Float32Array(MAX_CONNECTIONS * 2);
  /** Whether each candidate is a link that already exists */
  let candOld = new Uint8Array(MAX_CONNECTIONS * 2);
  /** Links each node has so far in a recalculation */
  let degree = new Uint8Array(0);
  const order: number[] = [];
  // Existing links first (so they live out their lifetime rather than being swapped for a
  // slightly closer pair), then the closest
  const byPriority = (x: number, y: number) => candOld[y] - candOld[x] || candD2[x] - candD2[y];
  const target = [0, 0, 0];

  const amplitude = [
    A.ORGANIC_MOVEMENT_AMPLITUDE_X,
    A.ORGANIC_MOVEMENT_AMPLITUDE_Y,
    A.ORGANIC_MOVEMENT_AMPLITUDE_Z,
  ];

  /** Give node i a drift of its own: random rates and phases on each axis */
  function seedWander(i: number) {
    for (let axis = 0; axis < 3; axis++) {
      const o = i * WANDER_PER_NODE + axis * 4;
      const rate = 0.45 + Math.random() * 0.45;
      wander[o] = rate;
      wander[o + 1] = Math.random() * Math.PI * 2;
      wander[o + 2] = rate * (1.5 + Math.random() * 0.8);
      wander[o + 3] = Math.random() * Math.PI * 2;
    }
  }

  /**
   * Where a node sits on its drift path at simulation time t: on each axis, a slow wave
   * plus a faster, smaller one, so it wanders within the axis's amplitude of home
   * without ever retracing a loop, and out of step with its neighbours
   */
  function driftTarget(i: number, t: number, speed: number) {
    const s = t * speed;
    for (let axis = 0; axis < 3; axis++) {
      const o = i * WANDER_PER_NODE + axis * 4;
      const wave =
        0.7 * Math.sin(s * wander[o] + wander[o + 1]) + 0.3 * Math.sin(s * wander[o + 2] + wander[o + 3]);
      target[axis] = base[i * 3 + axis] + wave * amplitude[axis];
    }
  }

  /** Keep existing nodes, append or trim (same as the original) */
  function setNodeCount(nodeCount: number, viewWidth: number, viewHeight: number, inputs: NetworkInputs) {
    const wanted = Math.max(0, Math.floor(nodeCount) || 0);
    if (wanted > cap) {
      const newCap = Math.max(wanted, 320);
      const pos = new Float32Array(newCap * 3);
      if (position) pos.set(position.array as Float32Array);
      const newBase = new Float32Array(newCap * 3);
      newBase.set(base);
      const newVel = new Float32Array(newCap * 2);
      newVel.set(vel);
      const newWander = new Float32Array(newCap * WANDER_PER_NODE);
      newWander.set(wander);
      base = newBase;
      vel = newVel;
      wander = newWander;
      cap = newCap;
      position = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
      nodeGeometry.setAttribute("position", position);
      nodeGeometry.setAttribute("aIndex", new THREE.BufferAttribute(new Float32Array(newCap).map((_, i) => i), 1));
    }
    const pos = position!.array as Float32Array;
    // New nodes spawn over the visible area, or the original 100 x 60 world if larger
    const width = Math.max(WORLD_CONFIG.WIDTH, viewWidth);
    const height = Math.max(WORLD_CONFIG.HEIGHT, viewHeight);
    for (let i = count; i < wanted; i++) {
      base[i * 3] = (Math.random() - 0.5) * width;
      base[i * 3 + 1] = (Math.random() - 0.5) * height;
      base[i * 3 + 2] = (Math.random() - 0.5) * WORLD_CONFIG.DEPTH;
      seedWander(i);
      driftTarget(i, time, inputs.settings.organicMovementSpeed);
      pos.set(target, i * 3);
      vel[i * 2] = vel[i * 2 + 1] = 0;
    }
    if (wanted < count) {
      // Drop connections that point at removed nodes
      let w = 0;
      for (let k = 0; k < conn.count; k++) {
        if (conn.a[k] >= wanted || conn.b[k] >= wanted) continue;
        conn.a[w] = conn.a[k];
        conn.b[w] = conn.b[k];
        conn.dist[w] = conn.dist[k];
        conn.birth[w] = conn.birth[k];
        conn.life[w] = conn.life[k];
        conn.seed[w] = conn.seed[k];
        w++;
      }
      conn.count = w;
      rebuildSlots();
    }
    count = wanted;
    nodeGeometry.setDrawRange(0, wanted);
    position!.needsUpdate = true;
  }

  function rebuildSlots() {
    slotByKey.clear();
    for (let k = 0; k < conn.count; k++) slotByKey.set(conn.a[k] * PAIR_KEY_STRIDE + conn.b[k], k);
  }

  /** Colours and blending follow the theme */
  function setPalette(palette: NetworkPalette) {
    const u = nodeMaterial.uniforms;
    u.uCore.value.set(palette.core);
    u.uRim.value.set(palette.rim);
    u.uHalo.value.set(palette.halo);
    const l = linkMaterial.uniforms;
    l.uColorA.value.set(palette.lineA);
    l.uColorB.value.set(palette.lineB);
    l.uPacket.value.set(palette.packet);
    l.uPacketStrength.value = palette.additive ? 1 : 0.45;
    l.uPacketHaze.value = palette.additive ? 0.35 : 0.08;
    cursorMaterial.uniforms.uColor.value.set(palette.halo);
    additive = palette.additive;
    const blending = blendingFor(palette.additive);
    for (const m of [nodeMaterial, linkMaterial, cursorMaterial, remoteMaterial]) {
      m.blending = blending;
      m.needsUpdate = true;
    }
  }

  /** Room for twice as many candidate pairs */
  function growCandidates() {
    const grow = <T extends Int32Array | Float32Array | Uint8Array>(from: T, to: T) => (to.set(from), to);
    const size = candI.length * 2;
    candI = grow(candI, new Int32Array(size));
    candJ = grow(candJ, new Int32Array(size));
    candD2 = grow(candD2, new Float32Array(size));
    candOld = grow(candOld, new Uint8Array(size));
  }

  /**
   * Connections. Every pair within the (gently breathing) distance is a candidate; links
   * that already exist keep their place until they expire, then the closest pairs fill the
   * rest, each node taking at most CONNECTIONS_PER_NODE. Scanning every pair (rather than
   * stopping once enough were found, which handed most links to the first nodes) and the
   * per-node cap spread the lines across the network instead of fanning out of hubs.
   */
  function recalcConnections(inputs: NetworkInputs) {
    const { settings, connectionDistance: maxDistance, performanceLevel } = inputs;
    const pos = position!.array as Float32Array;
    const dynamicDistance = maxDistance + Math.sin(time * 0.4);
    const maxD2 = dynamicDistance * dynamicDistance;
    const max = Math.min(
      settings.maxConnections ?? PERFORMANCE_CONFIGS[performanceLevel].MAX_CONNECTIONS,
      MAX_CONNECTIONS
    );

    let found = 0;
    for (let i = 0; i < count; i++) {
      const ax = pos[i * 3], ay = pos[i * 3 + 1], az = pos[i * 3 + 2];
      for (let j = i + 1; j < count; j++) {
        const dx = ax - pos[j * 3], dy = ay - pos[j * 3 + 1], dz = az - pos[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < maxD2) {
          if (found === candI.length) growCandidates();
          candI[found] = i;
          candJ[found] = j;
          candD2[found] = d2;
          candOld[found] = slotByKey.has(i * PAIR_KEY_STRIDE + j) ? 1 : 0;
          found++;
        }
      }
    }

    order.length = found;
    for (let k = 0; k < found; k++) order[k] = k;
    order.sort(byPriority);
    if (degree.length < count) degree = new Uint8Array(cap);
    degree.fill(0, 0, count);

    let n = 0;
    for (let k = 0; k < found && n < max; k++) {
      const c = order[k];
      const i = candI[c], j = candJ[c];
      if (degree[i] >= A.CONNECTIONS_PER_NODE || degree[j] >= A.CONNECTIONS_PER_NODE) continue;
      const slot = slotByKey.get(i * PAIR_KEY_STRIDE + j);
      let birth: number, life: number, seed: number;
      if (slot !== undefined) {
        birth = conn.birth[slot];
        life = conn.life[slot];
        seed = conn.seed[slot];
      } else {
        birth = time;
        life = A.CONNECTION_LIFETIME_BASE + Math.random() * A.CONNECTION_LIFETIME_RANDOM;
        seed = Math.random();
      }
      if (time - birth >= life) continue; // expired: dropped, and may be reborn next time
      degree[i]++;
      degree[j]++;
      next.a[n] = i;
      next.b[n] = j;
      next.dist[n] = Math.sqrt(candD2[c]);
      next.birth[n] = birth;
      next.life[n] = life;
      next.seed[n] = seed;
      n++;
    }
    next.count = n;
    [conn, next] = [next, conn];
    rebuildSlots();
  }

  function physicsStep(
    inputs: NetworkInputs,
    mouse: MousePosition,
    remotes: RemoteCursor[],
    colliders: DOMCollider[]
  ) {
    const st = inputs.settings;
    const pos = position!.array as Float32Array;
    const threshold = st.domCollisionThreshold;
    const FTS = A.FIXED_TIME_STEP;
    /** Velocity change per unit of offset (dx, dy) from a cursor that pushes within R */
    const repel = (dx: number, dy: number, R: number) => {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= R || d <= 0) return 0;
      const n = d / R;
      return ((1 - n * n * (3 - 2 * n)) * st.mouseRepulsionStrength * FTS) / d;
    };

    for (let i = 0; i < count; i++) {
      driftTarget(i, time, st.organicMovementSpeed);
      let x = pos[i * 3], y = pos[i * 3 + 1];
      let vx = vel[i * 2], vy = vel[i * 2 + 1];

      // Mouse repulsion effect with velocity-based movement
      if (mouse.isActive) {
        const dx = x - mouse.x, dy = y - mouse.y;
        const k = repel(dx, dy, st.mouseRepulsionRadius);
        vx += dx * k;
        vy += dy * k;
      }
      // Other visitors' cursors push the same way, as far as their own radius reaches
      // (the same reach as their glow), fading with their cursor
      for (let r = 0; r < remotes.length; r++) {
        const rc = remotes[r];
        const dx = x - rc.x, dy = y - rc.y;
        const k = repel(dx, dy, rc.radius) * rc.weight;
        vx += dx * k;
        vy += dy * k;
      }

      // DOM element collision avoidance (the colliders already include their padding)
      for (let k = 0; k < colliders.length; k++) {
        const c = colliders[k];
        const ex = Math.max(c.x - c.width / 2 - x, 0, x - (c.x + c.width / 2));
        const ey = Math.max(c.y - c.height / 2 - y, 0, y - (c.y + c.height / 2));
        const toEdge = Math.sqrt(ex * ex + ey * ey);
        if (toEdge < threshold) {
          const cx = x - c.x, cy = y - c.y;
          const toCentre = Math.sqrt(cx * cx + cy * cy);
          if (toCentre > 0) {
            const force = st.domCollisionStrength * ((threshold - toEdge) / threshold);
            vx += (cx / toCentre) * force;
            vy += (cy / toCentre) * force;
          }
        }
      }

      // Return towards the drift target, with damping
      vx += (target[0] - x) * A.RETURN_FORCE;
      vy += (target[1] - y) * A.RETURN_FORCE;
      vx *= A.VELOCITY_DAMPING;
      vy *= A.VELOCITY_DAMPING;
      x += vx * FTS;
      y += vy * FTS;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = target[2];
      vel[i * 2] = vx;
      vel[i * 2 + 1] = vy;
    }
    time += STEP;
    steps++;
    if (steps % PERFORMANCE_CONFIGS[inputs.performanceLevel].UPDATE_INTERVAL === 0) {
      recalcConnections(inputs);
    }
  }

  function writeLinks(inputs: NetworkInputs) {
    const { settings, connectionDistance: maxDistance } = inputs;
    const pos = position!.array as Float32Array;
    const start = iStart.array as Float32Array, end = iEnd.array as Float32Array;
    const alpha = iAlpha.array as Float32Array, width = iWidth.array as Float32Array;
    const seed = iSeed.array as Float32Array;
    for (let k = 0; k < conn.count; k++) {
      const a = conn.a[k] * 3, b = conn.b[k] * 3;
      start[k * 3] = pos[a];
      start[k * 3 + 1] = pos[a + 1];
      start[k * 3 + 2] = pos[a + 2];
      end[k * 3] = pos[b];
      end[k * 3 + 1] = pos[b + 1];
      end[k * 3 + 2] = pos[b + 2];

      // Fade in, hold, fade out; closer connections are more opaque and thicker
      const age = time - conn.birth[k];
      let fade = 1;
      if (age < A.CONNECTION_FADE_IN_TIME) fade = smoothstep(age / A.CONNECTION_FADE_IN_TIME, 0, 1);
      else if (age > conn.life[k] - A.CONNECTION_FADE_OUT_TIME)
        fade = smoothstep((conn.life[k] - age) / A.CONNECTION_FADE_OUT_TIME, 0, 1);
      const nd = Math.min(conn.dist[k] / maxDistance, 1);
      const distanceOpacity = Math.max(A.CONNECTION_MIN_OPACITY, 1 - nd * A.CONNECTION_DISTANCE_FADE);
      alpha[k] = Math.max(0, fade * distanceOpacity * A.CONNECTION_OPACITY_MULTIPLIER);
      width[k] = Math.max(
        A.CONNECTION_MIN_LINE_WIDTH,
        settings.connectionLineWidth * (1 - nd * A.CONNECTION_LINE_WIDTH_SCALE)
      );
      seed[k] = conn.seed[k];
    }
    for (const attr of linkAttributes) {
      attr.clearUpdateRanges();
      attr.addUpdateRange(0, conn.count * attr.itemSize);
      attr.needsUpdate = true;
    }
    linkGeometry.instanceCount = conn.count;
  }

  /** Reduced motion: run the physics briefly so nodes clear the text, then hold still */
  function settle(inputs: NetworkInputs, colliders: DOMCollider[]) {
    if (!position) return;
    for (let i = 0; i < SETTLE_STEPS; i++) physicsStep(inputs, NO_MOUSE, [], colliders);
    recalcConnections(inputs);
    // A still frame shows connections at full strength rather than mid-fade
    for (let k = 0; k < conn.count; k++) conn.birth[k] = time - A.CONNECTION_FADE_IN_TIME;
    intro = 1;
  }

  function frame(delta: number, inputs: NetworkInputs, ctx: FrameContext) {
    if (!position) return;
    const st = inputs.settings;

    if (!inputs.still) {
      acc = Math.min(acc + delta, STEP * MAX_STEPS_PER_FRAME);
      while (acc >= STEP) {
        physicsStep(inputs, ctx.mouse, ctx.remotes, ctx.colliders);
        acc -= STEP;
      }
      intro = Math.min(1, intro + delta / EFFECTS_CONFIG.INTRO_SECONDS);
    }
    position.clearUpdateRanges();
    position.addUpdateRange(0, count * 3);
    position.needsUpdate = true;
    writeLinks(inputs);

    // Halos read heavier on light backgrounds, so they are toned down there
    const glow = (st.glowIntensity ?? EFFECTS_CONFIG.GLOW_INTENSITY) * (additive ? 1 : 0.55);
    const heatTarget = ctx.mouse.isActive && !inputs.still ? 1 : 0;
    mouseHeat += (heatTarget - mouseHeat) * Math.min(1, delta * 4);
    const fadeIn = smoothstep(intro, 0, 1);

    const u = nodeMaterial.uniforms;
    u.uTime.value = time;
    u.uPixelRatio.value = ctx.dpr;
    u.uRadius.value = st.nodeRadius;
    u.uOpacity.value = st.nodeOpacity;
    u.uGlow.value = glow;
    u.uIntro.value = fadeIn;
    u.uMouse.value.set(ctx.mouse.x, ctx.mouse.y);
    u.uMouseActive.value = mouseHeat;
    u.uMouseRadius.value = st.mouseRepulsionRadius * A.MOUSE_GLOW_REACH;

    const l = linkMaterial.uniforms;
    l.uTime.value = time;
    l.uPixelRatio.value = ctx.dpr;
    l.uResolution.value.set(ctx.width * ctx.dpr, ctx.height * ctx.dpr);
    l.uGlow.value = glow;
    l.uPulseDensity.value = inputs.still ? 0 : (st.pulseDensity ?? EFFECTS_CONFIG.PULSE_DENSITY);
    l.uPulseSpeed.value = (st.pulseSpeed ?? EFFECTS_CONFIG.PULSE_SPEED) * ctx.dpr;
    // Longest possible connection on screen (the connection distance swings by up to 1),
    // plus room for a packet to enter and leave the line. Stable while nodes drift.
    l.uTravelPx.value =
      ((inputs.connectionDistance + 1) * PX_PER_UNIT + PACKET_ENTRY_EXIT_PX) * ctx.dpr;
    l.uIntro.value = fadeIn;
    l.uMouse.value.copy(u.uMouse.value);
    l.uMouseActive.value = mouseHeat;
    l.uMouseRadius.value = u.uMouseRadius.value;

    cursorPosition.setXYZ(0, ctx.mouse.x, ctx.mouse.y, 0);
    cursorPosition.needsUpdate = true;
    const cu = cursorMaterial.uniforms;
    cu.uStrength.value = mouseHeat * glow * (additive ? 0.16 : 0.1);
    cu.uSizePx.value = glowSizePx(st.mouseRepulsionRadius) * ctx.dpr;
    cursor.visible = cu.uStrength.value > 0.002;

    const remoteCount = Math.min(ctx.remotes.length, MAX_REMOTE_CURSORS);
    for (let i = 0; i < remoteCount; i++) {
      const rc = ctx.remotes[i];
      remotePosition.setXYZ(i, rc.x, rc.y, 0);
      remoteRgb.set(rc.color);
      remoteColor.setXYZ(i, remoteRgb.r, remoteRgb.g, remoteRgb.b);
      remoteStrength.setX(i, rc.weight * glow * (additive ? 0.16 : 0.1));
      remoteSize.setX(i, glowSizePx(rc.radius) * ctx.dpr);
    }
    remotePosition.needsUpdate = remoteColor.needsUpdate = true;
    remoteStrength.needsUpdate = remoteSize.needsUpdate = true;
    remoteGeometry.setDrawRange(0, remoteCount);
    remoteCursors.visible = remoteCount > 0;
  }

  function dispose() {
    nodeGeometry.dispose();
    nodeMaterial.dispose();
    linkGeometry.dispose();
    linkMaterial.dispose();
    cursorGeometry.dispose();
    cursorMaterial.dispose();
    remoteGeometry.dispose();
    remoteMaterial.dispose();
  }

  return { root, setNodeCount, setPalette, settle, frame, dispose };
}

export type NetworkEngine = ReturnType<typeof createNetworkEngine>;
