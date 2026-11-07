/**
 * GLSL for a post's diagram: the background network's look (shaded spheres with soft
 * halos, anti-aliased screen-space links), with a colour and opacity per node and per
 * link so a flow can light up its part of the diagram.
 */
import { CORE } from "./layout";

export const NODE_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  uniform float uScale; // device pixels per diagram unit, one unit from the camera
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
    vColor = aColor;
    vAlpha = aAlpha;
  }
`;

export const NODE_FRAGMENT = /* glsl */ `
  uniform float uHalo;
  uniform float uGlint;
  varying vec3 vColor;
  varying float vAlpha;
  const float CORE = ${CORE.toFixed(3)};

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = length(p);
    float aa = fwidth(r) * 0.75;

    // Shaded sphere, lit from the top left
    float core = 1.0 - smoothstep(CORE - aa, CORE + aa, r);
    vec2 q = p / CORE;
    float nz = sqrt(max(0.0, 1.0 - dot(q, q)));
    float lit = clamp(dot(normalize(vec3(-0.45, 0.55, 0.7)), vec3(q.x, -q.y, nz)), 0.0, 1.0);
    vec3 col = vColor * (0.55 + 0.6 * lit) + vec3(pow(lit, 12.0) * uGlint);

    // Soft halo outside it
    float t = max(r - CORE, 0.0) / (1.0 - CORE);
    float halo = exp(-t * 3.2) * (1.0 - smoothstep(0.8, 1.0, r)) * uHalo;

    float alpha = (core + halo * (1.0 - core)) * vAlpha;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(mix(vColor, col, core), alpha);
    #include <colorspace_fragment>
  }
`;

export const LINK_VERTEX = /* glsl */ `
  attribute vec2 corner; // x: 0 at start, 1 at end; y: -1 / 1 either side
  attribute vec3 iStart;
  attribute vec3 iEnd;
  attribute vec4 iColorA;
  attribute vec4 iColorB;
  attribute float iWidth;
  uniform vec2 uResolution; // drawing buffer size in device pixels
  uniform float uPixelRatio;
  varying vec4 vColor;
  varying float vSide;
  varying float vHalf;

  void main() {
    vec4 a = projectionMatrix * modelViewMatrix * vec4(iStart, 1.0);
    vec4 b = projectionMatrix * modelViewMatrix * vec4(iEnd, 1.0);
    vec2 halfRes = 0.5 * uResolution;
    vec2 d = b.xy / b.w * halfRes - a.xy / a.w * halfRes;
    vec2 nrm = vec2(-d.y, d.x) / max(length(d), 1e-4);

    // A pixel either side for anti-aliasing
    vHalf = 0.5 * iWidth * uPixelRatio;
    float reach = vHalf + uPixelRatio;
    vec4 clip = mix(a, b, corner.x);
    clip.xy += nrm * corner.y * reach / halfRes * clip.w;
    gl_Position = clip;
    vColor = mix(iColorA, iColorB, corner.x);
    vSide = corner.y * reach;
  }
`;

export const LINK_FRAGMENT = /* glsl */ `
  varying vec4 vColor;
  varying float vSide;
  varying float vHalf;

  void main() {
    float alpha = (1.0 - smoothstep(vHalf - 0.5, vHalf + 0.5, abs(vSide))) * vColor.a;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(vColor.rgb, alpha);
    #include <colorspace_fragment>
  }
`;
