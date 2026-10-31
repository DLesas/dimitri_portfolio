/**
 * The network background's simulation and GPU resources, kept outside React.
 *
 * Nodes follow the original rules exactly (organic drift, mouse repulsion, DOM collider
 * repulsion, return force, damping) but live in typed arrays and are stepped at a fixed
 * 60 Hz. Connections follow the original rules too (dynamic distance, early-terminated
 * candidate search, closest first, lifetimes with fade in / fade out). Everything is drawn
 * with three draw calls: the cursor glow, all connections, all nodes.
 */
import * as THREE from "three";
import {
  ANIMATION_CONFIG as A,
  EFFECTS_CONFIG,
  PERFORMANCE_CONFIGS,
  VISUAL_CONFIG,
  WORLD_CONFIG,
} from "./constants";
import {
  CURSOR_FRAGMENT,
  CURSOR_VERTEX,
  LINK_FRAGMENT,
  LINK_VERTEX,
  NODE_FRAGMENT,
  NODE_VERTEX,
} from "./shaders";
import type { NetworkBackgroundSettings } from "@/contexts/SettingsContext";

export type PerformanceLevel = "low" | "medium" | "high";

export type DOMCollider = {
  x: number;
  y: number;
  width: number;
  height: number;
  element: HTMLElement;
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
  colliders: DOMCollider[];
}

// The physics constants were tuned per 60 Hz frame; stepping at a fixed 60 Hz keeps the
// feel identical on 120 Hz screens and when the browser drops frames.
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 4;
// Sliders top out at 300 nodes / 300 connections
const MAX_CONNECTIONS = 512;
const PAIR_KEY_STRIDE = 4096;
/** Simulated time a reduced-motion network runs before freezing, so nodes clear the text */
const SETTLE_STEPS = 180;

const NO_MOUSE: MousePosition = { x: 0, y: 0, isActive: false };

const smoothstep = (p: number) => {
  const t = p < 0 ? 0 : p > 1 ? 1 : p;
  return t * t * (3 - 2 * t);
};

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
    uZoom: { value: VISUAL_CONFIG.CAMERA_ZOOM },
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
    uSizePx: { value: 360 },
  });
  const cursor = new THREE.Points(cursorGeometry, cursorMaterial);
  cursor.frustumCulled = false;

  const root = new THREE.Group();
  root.add(cursor, links, nodes);

  // ---- simulation state ----
  let cap = 0;
  let count = 0;
  let base = new Float32Array(0);
  let vel = new Float32Array(0);
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
  const candI = new Int32Array(MAX_CONNECTIONS * 2);
  const candJ = new Int32Array(MAX_CONNECTIONS * 2);
  const candD2 = new Float32Array(MAX_CONNECTIONS * 2);
  const order: number[] = [];
  const byDistance = (x: number, y: number) => candD2[x] - candD2[y];
  const target = [0, 0, 0];

  /** Where a node sits on its organic drift path at simulation time t */
  function driftTarget(i: number, t: number, speed: number) {
    const phase = t * speed + i * 0.2;
    target[0] = base[i * 3] + Math.sin(phase) * A.ORGANIC_MOVEMENT_AMPLITUDE_X;
    target[1] = base[i * 3 + 1] + Math.cos(phase * 0.8) * A.ORGANIC_MOVEMENT_AMPLITUDE_Y;
    target[2] = base[i * 3 + 2] + Math.sin(phase * 0.6) * A.ORGANIC_MOVEMENT_AMPLITUDE_Z;
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
      base = newBase;
      vel = newVel;
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
    const blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    for (const m of [nodeMaterial, linkMaterial, cursorMaterial]) {
      m.blending = blending;
      m.needsUpdate = true;
    }
  }

  /** Connections: same rules as before, minus the per-line objects and React state */
  function recalcConnections(inputs: NetworkInputs) {
    const { settings, connectionDistance: maxDistance, performanceLevel } = inputs;
    const pos = position!.array as Float32Array;
    const dynamicDistance = maxDistance + Math.sin(time * 0.4);
    const maxD2 = dynamicDistance * dynamicDistance;
    const max = Math.min(
      settings.maxConnections ?? PERFORMANCE_CONFIGS[performanceLevel].MAX_CONNECTIONS,
      MAX_CONNECTIONS
    );
    const limit = Math.min(max * 2, MAX_CONNECTIONS * 2);

    let found = 0;
    outer: for (let i = 0; i < count; i++) {
      const ax = pos[i * 3], ay = pos[i * 3 + 1], az = pos[i * 3 + 2];
      for (let j = i + 1; j < count; j++) {
        const dx = ax - pos[j * 3], dy = ay - pos[j * 3 + 1], dz = az - pos[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < maxD2) {
          candI[found] = i;
          candJ[found] = j;
          candD2[found] = d2;
          // Early termination once there are enough candidates (as before)
          if (++found >= limit) break outer;
        }
      }
    }

    order.length = found;
    for (let k = 0; k < found; k++) order[k] = k;
    order.sort(byDistance);

    let n = 0;
    const take = Math.min(found, max);
    for (let k = 0; k < take; k++) {
      const c = order[k];
      const i = candI[c], j = candJ[c];
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

  function physicsStep(inputs: NetworkInputs, mouse: MousePosition, colliders: DOMCollider[]) {
    const st = inputs.settings;
    const pos = position!.array as Float32Array;
    const R = st.mouseRepulsionRadius;
    const pad = st.domCollisionPadding;
    const threshold = st.domCollisionThreshold;
    const FTS = A.FIXED_TIME_STEP;

    for (let i = 0; i < count; i++) {
      driftTarget(i, time, st.organicMovementSpeed);
      let x = pos[i * 3], y = pos[i * 3 + 1];
      let vx = vel[i * 2], vy = vel[i * 2 + 1];

      // Mouse repulsion effect with velocity-based movement
      if (mouse.isActive) {
        const dx = x - mouse.x, dy = y - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < R && d > 0) {
          const n = d / R;
          const force = (1 - n * n * (3 - 2 * n)) * st.mouseRepulsionStrength;
          vx += (dx / d) * force * FTS;
          vy += (dy / d) * force * FTS;
        }
      }

      // DOM element collision avoidance
      for (let k = 0; k < colliders.length; k++) {
        const c = colliders[k];
        const ex = Math.max(c.x - c.width / 2 - pad - x, 0, x - (c.x + c.width / 2 + pad));
        const ey = Math.max(c.y - c.height / 2 - pad - y, 0, y - (c.y + c.height / 2 + pad));
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
      if (age < A.CONNECTION_FADE_IN_TIME) fade = smoothstep(age / A.CONNECTION_FADE_IN_TIME);
      else if (age > conn.life[k] - A.CONNECTION_FADE_OUT_TIME)
        fade = smoothstep((conn.life[k] - age) / A.CONNECTION_FADE_OUT_TIME);
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
    for (let i = 0; i < SETTLE_STEPS; i++) physicsStep(inputs, NO_MOUSE, colliders);
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
        physicsStep(inputs, ctx.mouse, ctx.colliders);
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
    const fadeIn = smoothstep(intro);

    const u = nodeMaterial.uniforms;
    u.uTime.value = time;
    u.uPixelRatio.value = ctx.dpr;
    u.uRadius.value = st.nodeRadius;
    u.uOpacity.value = st.nodeOpacity;
    u.uGlow.value = glow;
    u.uIntro.value = fadeIn;
    u.uMouse.value.set(ctx.mouse.x, ctx.mouse.y);
    u.uMouseActive.value = mouseHeat;
    u.uMouseRadius.value = st.mouseRepulsionRadius * 0.35;

    const l = linkMaterial.uniforms;
    l.uTime.value = time;
    l.uPixelRatio.value = ctx.dpr;
    l.uResolution.value.set(ctx.width * ctx.dpr, ctx.height * ctx.dpr);
    l.uGlow.value = glow;
    l.uPulseDensity.value = inputs.still ? 0 : (st.pulseDensity ?? EFFECTS_CONFIG.PULSE_DENSITY);
    l.uPulseSpeed.value = EFFECTS_CONFIG.PULSE_SPEED * ctx.dpr;
    l.uIntro.value = fadeIn;
    l.uMouse.value.copy(u.uMouse.value);
    l.uMouseActive.value = mouseHeat;
    l.uMouseRadius.value = u.uMouseRadius.value;

    cursorPosition.setXYZ(0, ctx.mouse.x, ctx.mouse.y, 0);
    cursorPosition.needsUpdate = true;
    const cu = cursorMaterial.uniforms;
    cu.uStrength.value = mouseHeat * glow * (additive ? 0.16 : 0.1);
    cu.uSizePx.value = 420 * ctx.dpr;
    cursor.visible = cu.uStrength.value > 0.002;
  }

  function dispose() {
    nodeGeometry.dispose();
    nodeMaterial.dispose();
    linkGeometry.dispose();
    linkMaterial.dispose();
    cursorGeometry.dispose();
    cursorMaterial.dispose();
  }

  return { root, setNodeCount, setPalette, settle, frame, dispose };
}

export type NetworkEngine = ReturnType<typeof createNetworkEngine>;
