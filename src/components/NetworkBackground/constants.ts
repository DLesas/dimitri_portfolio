// Animation constants
export const ANIMATION_CONFIG = {
  // Node movement - Controls how nodes drift organically through space
  ORGANIC_MOVEMENT_SPEED: 0.3, // Speed multiplier for natural node movement (higher = faster drift)
  ORGANIC_MOVEMENT_AMPLITUDE_X: 1.2, // Maximum drift distance on X-axis in world units
  ORGANIC_MOVEMENT_AMPLITUDE_Y: 0.8, // Maximum drift distance on Y-axis in world units
  ORGANIC_MOVEMENT_AMPLITUDE_Z: 0.4, // Maximum drift distance on Z-axis in world units

  // Mouse repulsion - How nodes react when mouse is nearby
  MOUSE_REPULSION_RADIUS: 10.5, // Distance from mouse where nodes start being pushed away
  MOUSE_REPULSION_STRENGTH: 12, // Force strength of mouse repulsion (higher = stronger push)
  FIXED_TIME_STEP: 0.025, // Time step for physics calculations (smaller = more accurate)

  // Physics - Controls how nodes move and settle
  VELOCITY_DAMPING: 0.95, // Friction applied to node movement (0.95 = 5% speed loss per frame)
  RETURN_FORCE: 0.06, // Force pulling nodes back to their original positions

  // DOM collision - How nodes avoid overlapping with HTML text elements
  DOM_COLLISION_PADDING: 0, // Extra space around DOM elements for collision detection
  DOM_COLLISION_THRESHOLD: 0.5, // Distance from DOM elements where collision starts
  DOM_REPULSION_FORCE: 0.8, // Force strength pushing nodes away from DOM elements

  // Connections - Visual behavior of lines between nodes
  CONNECTION_LIFETIME_BASE: 8, // Base time (seconds) a connection stays visible
  CONNECTION_LIFETIME_RANDOM: 3, // Random additional time (0-3 seconds) added to lifetime
  CONNECTION_FADE_IN_TIME: 1.0, // Time (seconds) for connection to fade in when created
  CONNECTION_FADE_OUT_TIME: 1.5, // Time (seconds) for connection to fade out before removal
  CONNECTION_OPACITY_MULTIPLIER: 0.85, // Overall opacity multiplier for all connections (0-1)
  CONNECTION_MIN_OPACITY: 0.2, // Minimum opacity for connections at maximum distance (20%)
  CONNECTION_DISTANCE_FADE: 0.7, // How much opacity fades with distance (0=no fade, 1=full fade)

  // Node scaling - How nodes pulse and scale
  SCALE_PULSE_AMPLITUDE: 0.4, // How much nodes grow/shrink during pulse (0.4 = 40% size change)
  SCALE_PULSE_SPEED: 0.5, // Speed of node pulsing animation
} as const;

// Mouse tracking performance constants
export const MOUSE_CONFIG = {
  TIMEOUT: 5000, // Auto-disable mouse tracking after 5 seconds of no movement (saves CPU)
  THROTTLE_INTERVAL: 16, // Minimum milliseconds between mouse updates (~60fps throttling)
  MOVEMENT_THRESHOLD: 2, // Minimum pixel movement required to trigger position update
} as const;

// Precomputed trigonometric lookup tables for performance optimization
export const TRIG_CONFIG = {
  TABLE_SIZE: 3600, // Number of precomputed values: 0.1 degree precision (3600 = 360 degrees * 10)
  TWO_PI: 2 * Math.PI, // Full circle in radians (cached for performance)
} as const;

/**
 * PERFORMANCE OPTIMIZATION: Precomputed trigonometric lookup tables
 *
 * Why precompute instead of Math.sin/cos?
 * - Math.sin/cos are expensive operations (~10-20 CPU cycles each)
 * - With 100+ nodes animating at 60fps, that's 12,000+ trig calls per second
 * - Lookup tables reduce this to simple array access (~1 CPU cycle)
 * - Memory trade-off: 28KB of lookup tables vs massive CPU savings
 *
 * Precision: 0.1 degree accuracy (3600 samples over 360 degrees)
 * This is more than sufficient for smooth organic node movement.
 */
const generateTrigTables = () => {
  const sinTable = new Float32Array(TRIG_CONFIG.TABLE_SIZE);
  const cosTable = new Float32Array(TRIG_CONFIG.TABLE_SIZE);

  for (let i = 0; i < TRIG_CONFIG.TABLE_SIZE; i++) {
    const angle = (i * TRIG_CONFIG.TWO_PI) / TRIG_CONFIG.TABLE_SIZE;
    sinTable[i] = Math.sin(angle);
    cosTable[i] = Math.cos(angle);
  }

  return { sinTable, cosTable };
};

const { sinTable, cosTable } = generateTrigTables();

export const PRECOMPUTED_TABLES = {
  SIN: sinTable,
  COS: cosTable,
} as const;

// World coordinate system - Defines the 3D space boundaries
export const WORLD_CONFIG = {
  WIDTH: 40, // Default width of 3D world (used as fallback, now dynamically calculated)
  HEIGHT: 40, // Default height of 3D world (used as fallback, now dynamically calculated)
  DEPTH: 3, // Total depth of 3D world (-1 to +1 world units)
} as const;

// Visual styling - Controls appearance of nodes, connections, and lighting
export const VISUAL_CONFIG = {
  NODE_RADIUS: 0.1, // Radius of node spheres in world units
  NODE_SEGMENTS: 8, // Number of segments for sphere geometry (higher = smoother but slower)
  NODE_COLOR: "#64748b", // Base color of nodes (slate gray)
  NODE_OPACITY: 0.8, // Transparency of nodes (0 = invisible, 1 = opaque)
  NODE_EMISSIVE: "#2563eb", // Glow color of nodes (blue)
  NODE_EMISSIVE_INTENSITY: 0.4, // Strength of node glow effect

  CONNECTION_COLOR: "#3b82f6", // Color of connection lines (blue)

  CAMERA_POSITION: [0, 0, 10] as const, // 3D position of camera [x, y, z]
  CAMERA_ZOOM: 40, // Orthographic camera zoom level (higher = more zoomed in)
  AMBIENT_LIGHT_INTENSITY: 0.6, // Overall brightness of scene lighting
} as const;

// Performance configurations for different device types
export const PERFORMANCE_CONFIGS = {
  low: {
    NODE_COUNT: 12, // Minimal nodes for weak devices (phones, old computers)
    CONNECTION_DISTANCE: 2, // Shorter connection range to reduce calculations
    UPDATE_INTERVAL: 4, // Update every 4th frame (15fps) to save CPU
    MAX_CONNECTIONS: 30, // Limit connections to reduce draw calls
  },
  medium: {
    NODE_COUNT: 180, // Moderate nodes for average devices (laptops, tablets)
    CONNECTION_DISTANCE: 5, // Medium connection range
    UPDATE_INTERVAL: 3, // Update every 3rd frame (20fps)
    MAX_CONNECTIONS: 100, // More connections for richer visuals
  },
  high: {
    NODE_COUNT: 305, // Many nodes for powerful devices (gaming PCs, high-end laptops)
    CONNECTION_DISTANCE: 6, // Long connection range for complex network
    UPDATE_INTERVAL: 1, // Update every frame (60fps) for smooth animation
    MAX_CONNECTIONS: 40, // Controlled connections to maintain performance
  },
} as const;
