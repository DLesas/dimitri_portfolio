// Plain data only: this module is imported by app-wide contexts, so it must not pull in three.js.

// Animation constants
export const ANIMATION_CONFIG = {
  // Node movement - Controls how nodes drift organically through space
  ORGANIC_MOVEMENT_SPEED: 0.8, // Speed multiplier for natural node movement (higher = faster drift)
  ORGANIC_MOVEMENT_AMPLITUDE_X: 3.0, // Maximum drift distance on X-axis in world units
  ORGANIC_MOVEMENT_AMPLITUDE_Y: 3.0, // Maximum drift distance on Y-axis in world units
  ORGANIC_MOVEMENT_AMPLITUDE_Z: 5.0, // Maximum drift distance on Z-axis in world units

  // Mouse repulsion - How nodes react when mouse is nearby
  MOUSE_REPULSION_RADIUS: 30, // Distance from mouse where nodes start being pushed away
  MOUSE_REPULSION_RADIUS_MIN: 2, // The settings slider's range; other visitors' radii are held to it too
  MOUSE_REPULSION_RADIUS_MAX: 30,
  MOUSE_GLOW_REACH: 0.35, // Share of the repulsion radius the cursor glow and the nodes' mouse highlight reach
  MOUSE_REPULSION_STRENGTH: 23, // Force strength of mouse repulsion (higher = stronger push)
  FIXED_TIME_STEP: 0.025, // Time step for physics calculations (smaller = more accurate)

  // Physics - Controls how nodes move and settle
  VELOCITY_DAMPING: 0.95, // Friction applied to node movement (0.95 = 5% speed loss per frame)
  RETURN_FORCE: 0.06, // Force pulling nodes back to their original positions

  // DOM collision - How nodes avoid overlapping with HTML text elements
  DOM_COLLISION_PADDING: 0, // Extra space around DOM elements for collision detection
  DOM_COLLISION_THRESHOLD: 0.5, // Distance from DOM elements where collision starts
  DOM_REPULSION_FORCE: 1.0, // Force strength pushing nodes away from DOM elements

  // Connections - Visual behavior of lines between nodes
  CONNECTIONS_PER_NODE: 3, // Most lines one node can have, so they spread across the network rather than fanning out of a few hubs
  CONNECTION_LIFETIME_BASE: 8, // Base time (seconds) a connection stays visible
  CONNECTION_LIFETIME_RANDOM: 3, // Random additional time (0-3 seconds) added to lifetime
  CONNECTION_FADE_IN_TIME: 1.0, // Time (seconds) for connection to fade in when created
  CONNECTION_FADE_OUT_TIME: 1.5, // Time (seconds) for connection to fade out before removal
  CONNECTION_OPACITY_MULTIPLIER: 0.85, // Overall opacity multiplier for all connections (0-1)
  CONNECTION_MIN_OPACITY: 0.2, // Minimum opacity for connections at maximum distance (20%)
  CONNECTION_DISTANCE_FADE: 0.7, // How much opacity fades with distance (0=no fade, 1=full fade)

  // Line width scaling - How connection thickness varies with distance
  CONNECTION_LINE_WIDTH: 2.0, // Line width in pixels for the closest connections (the default setting)
  CONNECTION_MIN_LINE_WIDTH: 0.2, // Minimum line width in pixels for distant connections
  CONNECTION_LINE_WIDTH_SCALE: 0.8, // How much line width scales with distance (0=no scaling, 1=full scaling)

  // Node scaling - How nodes pulse and scale
  SCALE_PULSE_AMPLITUDE: 0.4, // How much nodes grow/shrink during pulse (0.4 = 40% size change)
  SCALE_PULSE_SPEED: 0.5, // Speed of node pulsing animation
} as const;

// Visual effects layered on top of the classic look (0 = classic)
export const EFFECTS_CONFIG = {
  GLOW_INTENSITY: 0.7, // Soft halo around nodes, line glow and colour gradient along lines
  PULSE_DENSITY: 1, // Share of connections carrying a travelling "data packet"
  PULSE_SPEED: 100, // Packet speed in screen pixels per second
  INTRO_SECONDS: 1.2, // Fade-in when the canvas first appears
} as const;

// Mouse tracking performance constants
export const MOUSE_CONFIG = {
  TIMEOUT: 5000, // Auto-disable mouse tracking after 5 seconds of no movement (saves CPU)
  THROTTLE_INTERVAL: 16, // Minimum milliseconds between mouse updates (~60fps throttling)
  MOVEMENT_THRESHOLD: 2, // Minimum pixel movement required to trigger position update
} as const;

// Where new nodes spawn, in world units
export const WORLD_CONFIG = {
  WIDTH: 100, // Minimum width of the spawn area (the visible area when that is wider)
  HEIGHT: 60, // Minimum height of the spawn area (the visible area when that is taller)
  DEPTH: 3, // Depth of the spawn area: nodes start within ±1.5 world units of z = 0
} as const;

// Visual styling - Controls appearance of nodes, and the camera
export const VISUAL_CONFIG = {
  NODE_RADIUS: 0.12, // Radius of node spheres in world units
  NODE_OPACITY: 0.8, // Transparency of nodes (0 = invisible, 1 = opaque)
  CAMERA_POSITION: [0, 0, 10] as const, // 3D position of camera [x, y, z]
  CAMERA_ZOOM: 20, // Orthographic camera zoom: pixels per world unit
} as const;

// Performance configurations for different device types
export const PERFORMANCE_CONFIGS = {
  low: {
    NODE_COUNT: 110, // Minimal nodes for weak devices (phones, old computers)
    CONNECTION_DISTANCE: 5, // Shorter connection range to reduce calculations
    UPDATE_INTERVAL: 6, // Recalculate connections every 6th 60 Hz physics step (10 times a second)
    MAX_CONNECTIONS: 50, // Fewer connections to search for and draw
  },
  medium: {
    NODE_COUNT: 150, // Moderate nodes for average devices (laptops, tablets)
    CONNECTION_DISTANCE: 6, // Medium connection range
    UPDATE_INTERVAL: 4, // Every 4th physics step (15 times a second)
    MAX_CONNECTIONS: 100, // More connections for richer visuals
  },
  high: {
    NODE_COUNT: 200, // Many nodes for powerful devices (gaming PCs, high-end laptops)
    CONNECTION_DISTANCE: 8, // Long connection range for complex network
    UPDATE_INTERVAL: 3, // Every 3rd physics step (20 times a second)
    MAX_CONNECTIONS: 150, // Controlled connections to maintain performance
  },
} as const;

/** A device's tier, as detected by lib/hardware.ts */
export type PerformanceLevel = keyof typeof PERFORMANCE_CONFIGS;
