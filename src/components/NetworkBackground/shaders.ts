/**
 * GLSL for the network background.
 *
 * Nodes are one THREE.Points draw call: each sprite is a small shaded sphere with an
 * optional soft halo. Connections are one instanced draw call: each instance is a
 * screen-space quad between two nodes, anti-aliased in the fragment shader, so line
 * width and opacity can vary per connection without one material per line.
 *
 * Effects scale with `uGlow` (halo, line glow, colour gradient along lines) and
 * `uPulseDensity` (share of lines carrying a travelling packet). With both at 0 the
 * result matches the original flat look.
 */

/** Mouse proximity, in world units, shared by both shaders */
const MOUSE_GLSL = /* glsl */ `
  uniform vec2 uMouse;
  uniform float uMouseActive;
  uniform float uMouseRadius;
  float mouseHeat(vec2 p) {
    return uMouseActive * (1.0 - smoothstep(0.0, uMouseRadius * 1.4, distance(p, uMouse)));
  }
`;

export const NODE_VERTEX = /* glsl */ `
  attribute float aIndex;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uZoom;
  uniform float uRadius;
  uniform float uPulseAmp;
  uniform float uPulseSpeed;
  uniform float uGlow;
  ${MOUSE_GLSL}
  varying float vCore;
  varying float vHot;
  varying float vDepth;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    // Same size pulse the original meshes had: 1 + sin(t * speed + index) * amplitude
    float pulse = 1.0 + sin(uTime * uPulseSpeed + aIndex) * uPulseAmp;
    vHot = mouseHeat(position.xy);
    vDepth = clamp((position.z + 6.5) / 13.0, 0.0, 1.0);

    float corePx = uRadius * uZoom * pulse * uPixelRatio;
    float spritePx = corePx * (1.0 + uGlow * (4.0 + 3.0 * vHot)) + 1.5 * uPixelRatio;
    gl_PointSize = max(2.0, 2.0 * spritePx);
    vCore = corePx / spritePx;
  }
`;

export const NODE_FRAGMENT = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uRim;
  uniform vec3 uHalo;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uIntro;
  varying float vCore;
  varying float vHot;
  varying float vDepth;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = length(p);
    float aa = fwidth(r) * 0.75;

    // Shaded sphere core, lit from the top left
    float core = 1.0 - smoothstep(vCore - aa, vCore + aa, r);
    vec2 q = p / max(vCore, 1e-3);
    float nz = sqrt(max(0.0, 1.0 - dot(q, q)));
    float lit = clamp(dot(normalize(vec3(-0.45, 0.55, 0.7)), vec3(q.x, -q.y, nz)), 0.0, 1.0);
    vec3 col = mix(uRim, uCore, 0.35 + 0.65 * lit);
    col += uHalo * pow(lit, 12.0) * 0.6 * uGlow; // specular glint
    col *= mix(0.78, 1.12, vDepth);
    col += uHalo * vHot * 0.45;

    // Soft halo outside the core
    float t = max(r - vCore, 0.0) / max(1.0 - vCore, 1e-3);
    float halo = exp(-t * 3.2) * (1.0 - smoothstep(0.8, 1.0, r)) * uGlow * (0.55 + 0.6 * vHot);

    float alpha = (core * uOpacity + halo * (1.0 - core)) * uIntro;
    if (alpha < 0.003) discard;
    vec3 rgb = mix(uHalo, col, core);
    gl_FragColor = vec4(rgb, alpha);
    #include <colorspace_fragment>
  }
`;

export const LINK_VERTEX = /* glsl */ `
  attribute vec2 corner; // x: 0 at start, 1 at end; y: -1 / 1 either side
  attribute vec3 iStart;
  attribute vec3 iEnd;
  attribute float iAlpha;
  attribute float iWidth;
  attribute float iSeed;
  uniform vec2 uResolution; // drawing buffer size in device pixels
  uniform float uPixelRatio;
  uniform float uGlow;
  ${MOUSE_GLSL}
  varying float vAlong;
  varying float vSide;
  varying float vHalf;
  varying float vAlpha;
  varying float vSeed;
  varying float vLenPx;

  void main() {
    vec4 a = projectionMatrix * modelViewMatrix * vec4(iStart, 1.0);
    vec4 b = projectionMatrix * modelViewMatrix * vec4(iEnd, 1.0);
    vec2 halfRes = 0.5 * uResolution;
    vec2 sa = a.xy / a.w * halfRes;
    vec2 sb = b.xy / b.w * halfRes;
    vec2 d = sb - sa;
    float len = max(length(d), 1e-4);
    vec2 dir = d / len;
    vec2 nrm = vec2(-dir.y, dir.x);

    float halfW = 0.5 * max(iWidth * uPixelRatio, 1.0);
    float pad = (1.0 + max(uGlow * 3.0, 6.0)) * uPixelRatio;
    float endSign = corner.x * 2.0 - 1.0;
    vec2 s = mix(sa, sb, corner.x) + nrm * corner.y * (halfW + pad) + dir * endSign * pad;

    vec4 clip = mix(a, b, corner.x);
    clip.xy = s / halfRes * clip.w;
    gl_Position = clip;

    float hot = mouseHeat(mix(iStart.xy, iEnd.xy, 0.5));
    vAlong = corner.x + endSign * pad / len;
    vSide = corner.y * (halfW + pad);
    // Lines thinner than a device pixel are drawn one pixel wide but fainter
    vHalf = halfW;
    vAlpha = iAlpha * min(1.0, iWidth * uPixelRatio) * (1.0 + hot * 1.4);
    vSeed = iSeed;
    vLenPx = len;
  }
`;

export const LINK_FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uPacket;
  uniform float uTime;
  uniform float uGlow;
  uniform float uPulseDensity;
  uniform float uPulseSpeed; // device pixels per second
  uniform float uPixelRatio;
  uniform float uIntro;
  uniform float uPacketStrength; // lower on light backgrounds, where packets darken
  uniform float uPacketHaze;
  varying float vAlong;
  varying float vSide;
  varying float vHalf;
  varying float vAlpha;
  varying float vSeed;
  varying float vLenPx;

  void main() {
    float inside = step(0.0, vAlong) * step(vAlong, 1.0);
    float dist = abs(vSide);
    float line = (1.0 - smoothstep(vHalf - 0.5, vHalf + 0.5, dist)) * inside;
    float glowW = (1.6 + vHalf) * uPixelRatio;
    float glow = exp(-dist * dist / (2.0 * glowW * glowW)) * inside * uGlow * 0.55;

    // A packet travelling along some of the lines; period depends on the line's length
    float packet = 0.0;
    if (vSeed < uPulseDensity) {
      float period = vLenPx / uPulseSpeed + 0.6;
      float head = fract(uTime / period + vSeed * 17.0) * 1.3 - 0.15;
      float dp = (vAlong - head) * vLenPx;
      float len = 10.0 * uPixelRatio;
      float core = 1.8 * uPixelRatio, haze = 5.0 * uPixelRatio;
      float along = exp(-dp * dp / (2.0 * len * len));
      packet = along * (exp(-dist * dist / (2.0 * core * core)) * 1.4 + exp(-dist * dist / (2.0 * haze * haze)) * uPacketHaze);
      packet *= uPacketStrength;
      packet *= inside * smoothstep(0.0, 0.25, vAlpha);
    }

    vec3 col = mix(uColorA, uColorB, clamp(vAlong, 0.0, 1.0) * min(uGlow * 1.5, 1.0));
    float a = (line + glow) * vAlpha;
    vec3 rgb = col * a + uPacket * packet;
    float alpha = clamp(a + packet, 0.0, 1.0) * uIntro;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(rgb / max(a + packet, 1e-4), alpha);
    #include <colorspace_fragment>
  }
`;

export const CURSOR_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float a = exp(-dot(p, p) * 3.5) * (1.0 - smoothstep(0.8, 1.0, length(p))) * uStrength;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

export const CURSOR_VERTEX = /* glsl */ `
  uniform float uSizePx;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSizePx;
  }
`;
