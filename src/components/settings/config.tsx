import React from "react";
import { BsMouseFill } from "react-icons/bs";
import { FaShareNodes } from "react-icons/fa6";
import { TbCircleDashed } from "react-icons/tb";
import { NetworkSettingsConfig, SettingsCategory } from "./types";

// ============================================================================
// Network Settings Configuration
// ============================================================================

/**
 * Centralized configuration for all network background settings sliders
 *
 * This eliminates repetitive slider definitions and makes adding new settings
 * trivial. Each setting contains metadata for the slider component including
 * range constraints, step size, tooltips, and optional notes.
 *
 * @see SettingsSlider component for usage
 */
export const NETWORK_SETTINGS_CONFIG: NetworkSettingsConfig = {
  // ========================================
  // Node Configuration
  // ========================================

  nodeCount: {
    label: "Node Count",
    min: 30,
    max: 300,
    step: 1,
    tooltip: "Number of nodes in the network",
  },

  organicMovementSpeed: {
    label: "Node Movement Speed",
    min: 0,
    max: 5,
    step: 0.1,
    tooltip: "Speed of natural node drift",
  },

  nodeRadius: {
    label: "Node Radius",
    min: 0.02,
    max: 0.3,
    step: 0.01,
    tooltip: "Size of individual nodes",
  },

  nodeOpacity: {
    label: "Node Opacity",
    min: 0.1,
    max: 1.0,
    step: 0.05,
    tooltip: "Transparency of nodes (0 = invisible, 1 = opaque)",
  },

  // ========================================
  // Connection Configuration
  // ========================================

  connectionDistance: {
    label: "Connection Distance",
    min: 1,
    max: 16,
    step: 0.1,
    tooltip: "Maximum distance for connections between nodes",
  },

  maxConnections: {
    label: "Max Connections",
    min: 20,
    max: 300,
    step: 1,
    tooltip: "Maximum number of simultaneous connections",
  },

  connectionLineWidth: {
    label: "Connection Line Width",
    min: 0.5,
    max: 5.0,
    step: 0.1,
    tooltip: "Thickness of connection lines",
    note: "Line width may not work on all devices due to WebGL limitations",
  },

  // ========================================
  // Mouse Interaction Configuration
  // ========================================

  mouseRepulsionRadius: {
    label: "Mouse Repulsion Radius",
    min: 2,
    max: 30,
    step: 0.1,
    tooltip: "Distance from mouse where nodes start being pushed away",
  },

  mouseRepulsionStrength: {
    label: "Mouse Repulsion Strength",
    min: 2,
    max: 30,
    step: 1,
    tooltip: "Strength of mouse repulsion effect",
  },
};

// ============================================================================
// Settings Categories
// ============================================================================

/**
 * Settings categories for organizing controls into logical groups
 *
 * This structure creates a hierarchical organization of settings that makes
 * the settings panel more navigable and maintainable. Each category has an
 * icon and groups related settings together.
 *
 * The categories correspond to the conceptual areas of the network visualization:
 * - Nodes: Visual properties and behavior of individual nodes
 * - Connections: Properties of lines connecting nodes
 * - Mouse Interaction: How the visualization responds to user interaction
 */
export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    title: "Nodes",
    icon: <TbCircleDashed className="w-4 h-4 text-primary/70" />,
    settings: [
      "nodeCount",
      "organicMovementSpeed",
      "nodeRadius",
      "nodeOpacity",
    ],
  },
  {
    title: "Connections",
    icon: <FaShareNodes className="w-4 h-4 text-primary/70" />,
    settings: ["connectionDistance", "maxConnections", "connectionLineWidth"],
  },
  {
    title: "Mouse Interaction",
    icon: <BsMouseFill className="w-4 h-4 text-primary/70" />,
    settings: ["mouseRepulsionRadius", "mouseRepulsionStrength"],
  },
];
