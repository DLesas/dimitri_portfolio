/**
 * The skills word cloud, kept outside React.
 *
 * Every word is a member of one troika BatchedText, so all 49 words render in one draw
 * call (plus one for the hover glow outline), and one loop per frame handles billboarding,
 * the front/back opacity fade, colour transitions, hover lift and glow, and the staggered
 * pop-in. A faint dotted shell behind the words gives the sphere some depth.
 */
import * as THREE from "three";
import { BatchedText, Text } from "troika-three-text";
import { fibonacciSphere } from "@/utils/3D";
import type { SkillRecord } from "@/hooks/queries/useSkillsData";

export const RADIUS = 22;
export const FOV = 75;
export const BASE_DISTANCE = 42;
/** Half the width of the longest words, so edge words are never clipped */
const WORD_MARGIN = 6;
const ROTATION_LERP = 0.08;
const SHELL_POINTS = 640;
const HOVER_LIFT = 1.18;
const HOVER_GLOW = 0.9;

export interface CloudPalette {
  byType: (type: string) => string;
  hover: string;
  fog: string;
  shell: string;
  additive: boolean;
}

export interface CloudInputs {
  rotationSpeedX: number;
  rotationSpeedY: number;
  palette: CloudPalette;
  /** Reduced motion: no auto-rotation, pop-in or twinkle */
  still: boolean;
}

/** Per-frame rates were tuned at 60 fps; convert them for any frame time */
const rate = (perFrame: number, dt: number) => 1 - Math.pow(1 - perFrame, dt * 60);

/** Overshooting ease, in place of the old per-word spring */
const easeOutBack = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Stable pseudo-random value per index, for the shell's twinkle phases */
const hash = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** Camera distance that keeps the whole sphere in view at this aspect ratio */
export function fitDistance(aspect: number) {
  const vHalf = THREE.MathUtils.degToRad(FOV / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  return Math.max(BASE_DISTANCE, (RADIUS + WORD_MARGIN) / Math.sin(Math.min(vHalf, hHalf)));
}

const SHELL_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uNear;
  uniform float uSpan;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float front = 1.0 - clamp((-mv.z - uNear) / uSpan, 0.0, 1.0);
    float twinkle = 0.6 + 0.4 * sin(uTime * 1.3 + aSeed * 40.0);
    vAlpha = mix(0.1, 0.6, front * front) * twinkle;
    gl_PointSize = uPixelRatio * mix(1.6, 3.0, front);
  }
`;

const SHELL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntro;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord * 2.0 - 1.0);
    float a = (1.0 - smoothstep(0.5, 1.0, r)) * vAlpha * uIntro;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

export function createCloudEngine(skills: SkillRecord[]) {
  // ---- one rotating group: a batched text for all words, a dotted shell behind them ----
  const group = new THREE.Group();
  const batch = new BatchedText();
  group.add(batch);

  const positions = fibonacciSphere(skills.length, { radius: RADIUS, format: "array" }) as number[][];
  const words = skills.map((skill, i) => {
    const text = new Text();
    text.text = skill.name;
    text.font = "/fonts/Inter-Bold.ttf";
    text.letterSpacing = -0.05;
    text.lineHeight = 1;
    text.anchorX = "center";
    text.anchorY = "middle";
    text.outlineWidth = "4%";
    text.outlineBlur = "38%";
    text.outlineOpacity = 0;
    text.matrixAutoUpdate = false;
    const [x, y, z] = positions[i] ?? [0, 0, 0];
    text.position.set(x, y, z);
    batch.addText(text);
    return { skill, text, color: new THREE.Color(), opacity: 0.6, glow: 0, lift: 1, front: 0 };
  });

  const shellGeometry = new THREE.BufferGeometry();
  const shellPoints = fibonacciSphere(SHELL_POINTS, { radius: RADIUS + 2.5, format: "array" }) as number[][];
  shellGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(shellPoints.flat()), 3));
  shellGeometry.setAttribute(
    "aSeed",
    new THREE.BufferAttribute(new Float32Array(SHELL_POINTS).map((_, i) => hash(i)), 1)
  );
  const shellMaterial = new THREE.ShaderMaterial({
    vertexShader: SHELL_VERTEX,
    fragmentShader: SHELL_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uNear: { value: BASE_DISTANCE - RADIUS },
      uSpan: { value: RADIUS * 2 },
      uColor: { value: new THREE.Color() },
      uIntro: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
  });
  const shell = new THREE.Points(shellGeometry, shellMaterial);
  shell.renderOrder = -1;
  group.add(shell);

  // ---- interaction and animation state ----
  const pointer = { x: 0, y: 0, inside: false, downX: 0, downY: 0, dragging: false };
  let hovered = -1;
  let speedX = 0;
  let speedY = 0;
  let time = 0;
  let appear = 0;

  const v = new THREE.Vector3();
  const d = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const billboard = new THREE.Quaternion();
  const hoverColor = new THREE.Color();
  // Parsed theme colours, rebuilt only when the palette changes
  let cachedPalette: CloudPalette | null = null;
  const typeColors = new Map<string, THREE.Color>();
  const colorFor = (palette: CloudPalette, type: string) => {
    let c = typeColors.get(type);
    if (!c) typeColors.set(type, (c = new THREE.Color(palette.byType(type))));
    return c;
  };

  /** Font size compensates for word length */
  function setFontSize(baseFontSize: number, onSynced: () => void) {
    for (const w of words) {
      const lengthFactor = Math.max(0.5, (12 - w.skill.name.length) * 0.1);
      w.text.fontSize = baseFontSize + lengthFactor;
    }
    batch.sync(onSynced);
  }

  function setPalette(palette: CloudPalette) {
    shellMaterial.uniforms.uColor.value.set(palette.shell);
    shellMaterial.blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    shellMaterial.needsUpdate = true;
  }

  /** Frame the sphere for the container; returns the camera distance */
  function fit(camera: THREE.PerspectiveCamera, width: number, height: number) {
    const distance = fitDistance(width / height);
    camera.position.setLength(distance);
    camera.updateProjectionMatrix();
    shellMaterial.uniforms.uNear.value = distance - RADIUS;
  }

  // ---- pointer: hover is resolved in the frame loop, clicks open the skill's link ----
  function pointerMove(x: number, y: number, clientX: number, clientY: number, buttons: number) {
    pointer.x = x;
    pointer.y = y;
    pointer.inside = true;
    if (buttons && Math.hypot(clientX - pointer.downX, clientY - pointer.downY) > 5) pointer.dragging = true;
  }
  function pointerLeave() {
    pointer.inside = false;
  }
  function pointerDown(clientX: number, clientY: number) {
    pointer.downX = clientX;
    pointer.downY = clientY;
    pointer.dragging = false;
  }
  /** Returns the link to open when this was a click on a word */
  function pointerUp(): string | null {
    const link = !pointer.dragging && hovered >= 0 ? (words[hovered].skill.link ?? null) : null;
    pointer.dragging = false;
    return link;
  }

  /**
   * Advance one frame. Returns whether anything is still animating, and the newly
   * hovered skill when hover changed (null for none, undefined for no change).
   */
  function frame(
    delta: number,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    dpr: number,
    inputs: CloudInputs
  ) {
    const dt = Math.min(delta, 0.1);
    const { palette, still } = inputs;
    let busy = false;

    // Auto-rotation eases to a stop while the pointer is over the cloud
    const k = rate(ROTATION_LERP, dt);
    const stop = pointer.inside || still;
    speedY += ((stop ? 0 : inputs.rotationSpeedY) - speedY) * k;
    speedX += ((stop ? 0 : inputs.rotationSpeedX) - speedX) * k;
    group.rotation.y += speedY * dt * 60;
    group.rotation.x += speedX * dt * 60;
    if (Math.abs(speedX) + Math.abs(speedY) > 1e-5) busy = true;
    group.updateMatrixWorld();

    time += still ? 0 : dt;
    appear = still ? 10 : appear + dt;

    // Billboarding: each word's local rotation cancels the group's, then matches the camera
    billboard.copy(group.quaternion).invert().multiply(camera.quaternion);
    camera.getWorldDirection(camDir);
    const pxPerUnit = height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

    // Hover: the front-most word whose on-screen box contains the pointer
    let hit = -1;
    let hitFront = -Infinity;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      v.copy(w.text.position).applyMatrix4(group.matrixWorld);
      const dist = v.distanceTo(camera.position);
      w.front = camDir.dot(d.copy(v).sub(camera.position).normalize());
      const bounds = w.text.textRenderInfo?.blockBounds;
      if (pointer.inside && !pointer.dragging && bounds) {
        const scale = (pxPerUnit / dist) * w.lift;
        v.project(camera);
        const sx = (v.x + 1) * 0.5 * width;
        const sy = (1 - v.y) * 0.5 * height;
        const hw = ((bounds[2] - bounds[0]) / 2) * scale + 4;
        const hh = ((bounds[3] - bounds[1]) / 2) * scale + 4;
        if (Math.abs(pointer.x - sx) < hw && Math.abs(pointer.y - sy) < hh && w.front > hitFront) {
          hit = i;
          hitFront = w.front;
        }
      }
    }
    let hoverChange: SkillRecord | null | undefined;
    if (hit !== hovered) {
      hovered = hit;
      hoverChange = hit >= 0 ? words[hit].skill : null;
    }

    if (palette !== cachedPalette) {
      cachedPalette = palette;
      typeColors.clear();
      hoverColor.set(palette.hover);
    }
    const kOpacity = rate(0.1, dt);
    let glowing = false;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const isHover = i === hovered;

      // Colour eases to the hover colour faster than back to the type colour
      const targetColor = isHover ? hoverColor : colorFor(palette, w.skill.type);
      if (w.color.r + w.color.g + w.color.b === 0) w.color.copy(targetColor);
      w.color.lerp(targetColor, rate(isHover ? 0.1 : 0.05, dt));

      // Front words opaque, back words faint
      const targetOpacity = THREE.MathUtils.mapLinear(w.front, -1, 1, 0.15, 1);
      w.opacity += (targetOpacity - w.opacity) * kOpacity;
      const glowTarget = isHover ? HOVER_GLOW : 0;
      const liftTarget = isHover ? HOVER_LIFT : 1;
      w.glow += (glowTarget - w.glow) * rate(0.15, dt);
      w.lift += (liftTarget - w.lift) * rate(0.18, dt);

      // Staggered pop-in, 10 ms per word
      const pop = easeOutBack(THREE.MathUtils.clamp((appear - i * 0.01) / 0.45, 0, 1));

      w.text.quaternion.copy(billboard);
      w.text.scale.setScalar(Math.max(pop, 1e-3) * w.lift);
      w.text.updateMatrix();
      // The batch packs colours as raw bytes and treats them as linear, so pass linear values
      w.text.color = w.color.getHex(THREE.LinearSRGBColorSpace);
      w.text.fillOpacity = w.opacity;
      w.text.outlineColor = hoverColor.getHex(THREE.LinearSRGBColorSpace);
      w.text.outlineOpacity = w.glow * w.opacity;
      if (w.glow > 0.002) glowing = true;

      if (
        Math.abs(targetOpacity - w.opacity) > 0.002 ||
        Math.abs(glowTarget - w.glow) > 0.002 ||
        Math.abs(liftTarget - w.lift) > 0.002 ||
        pop < 1
      )
        busy = true;
    }

    // The glow is an outline pass over every word, so it only runs while a word glows
    batch.outlineBlur = glowing ? 0.0001 : 0;

    const u = shellMaterial.uniforms;
    u.uTime.value = time;
    u.uPixelRatio.value = dpr;
    u.uIntro.value = Math.min(1, appear / 0.8);

    return { busy, hoverChange, hovering: hovered >= 0 };
  }

  function dispose() {
    words.forEach((w) => w.text.dispose());
    batch.dispose();
    shellGeometry.dispose();
    shellMaterial.dispose();
  }

  return {
    group,
    sync: (onSynced: () => void) => batch.sync(onSynced),
    setFontSize,
    setPalette,
    fit,
    pointerMove,
    pointerLeave,
    pointerDown,
    pointerUp,
    frame,
    dispose,
  };
}

export type CloudEngine = ReturnType<typeof createCloudEngine>;
