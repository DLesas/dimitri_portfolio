import * as THREE from "three";

/**
 * Additive blending makes glows light up a dark background; on a light one it would wash
 * out to white, so normal blending is used there.
 */
export const blendingFor = (additive: boolean): THREE.Blending =>
  additive ? THREE.AdditiveBlending : THREE.NormalBlending;
