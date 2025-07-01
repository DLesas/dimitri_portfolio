/**
 * Type definitions for languages_modules.json
 *
 * This file provides type-safe access to the skills data structure.
 * The types are automatically inferred from a sample of the actual JSON data.
 */

// Sample data structure representing the actual JSON structure
const sampleSkillData = {
  Python: {
    name: "Python",
    type: "Programming Language" as const,
    icon: "/Languages & Frameworks/python.svg",
    link: "https://en.wikipedia.org/wiki/Python_(programming_language)",
    brief:
      "General Programming Language with specialism in Data Science and Machine Learning",
    full: "",
    value: 93,
    tags: [
      "Data Analysis",
      "Data Visualisation",
      "Back-End Engineering",
      "Machine/Deep Learning",
    ],
  },
  "Micro python": {
    name: "Micro python",
    type: "Programming Language" as const,
    icon: "",
    link: "https://en.wikipedia.org/wiki/MicroPython",
    brief: "Lightweight Python implementation for microcontrollers",
    full: "",
    value: 78,
    parent: "Python", // Optional parent field
    tags: ["Embedded Systems"],
  },
  AWS: {
    name: "AWS",
    type: "Cloud Platform" as const,
    icon: "/Languages & Frameworks/Aws.svg",
    dark: "/Languages & Frameworks/Aws_Dark.svg", // Optional dark mode icon
    link: "https://aws.amazon.com/what-is-aws/?nc1=f_cc",
    brief:
      "Leading Cloud Platform from Amazon, used to build servers/systems and much more",
    full: "",
    value: 54,
    tags: ["Back-End Engineering", "Cloud Computing"],
  },
} as const;

// Extract the type of a single skill record from the sample data
type SampleSkillRecord = (typeof sampleSkillData)[keyof typeof sampleSkillData];

/**
 * Skill record type automatically inferred from the JSON structure.
 *
 * Required fields:
 * - name: The display name of the skill/technology
 * - type: Category (Programming Language, Library, Software, Database, Cloud Platform)
 * - value: Proficiency level (0-100)
 * - brief: Short description
 * - full: Extended description (currently empty strings)
 * - link: Reference URL
 * - tags: Array of skill categories/applications
 *
 * Optional fields:
 * - icon: Path to the icon image
 * - dark: Path to dark mode variant of the icon
 * - parent: Parent technology this skill is based on
 */
export interface SkillRecord {
  name: string;
  type: string;
  value: number;
  brief: string;
  full: string;
  link: string;
  tags: string[];
  icon?: string;
  dark?: string;
  parent?: string;
}

/**
 * Type for the complete skills data structure (object with skill keys)
 */
export type SkillsData = Record<string, SkillRecord>;

// Union type of all possible skill types for type safety
export type SkillType =
  | "Programming Language"
  | "Library"
  | "Software"
  | "Database"
  | "Cloud Platform";

// Union type of all possible tags for type safety
export type SkillTag =
  | "Data Analysis"
  | "Data Visualisation"
  | "Back-End Engineering"
  | "Machine/Deep Learning"
  | "Front-End Development"
  | "Cloud Computing"
  | "Embedded Systems"
  | "Animation"
  | "Automation"
  | "Web Scraping"
  | "Mobile Development"
  | "3D Rendering"
  | "Data engineering";

/**
 * Extended skill record with color information (for UI components)
 */
export interface SkillRecordWithColor extends SkillRecord {
  color: string;
}

// Legacy type aliases for backward compatibility
/** @deprecated Use SkillRecord instead */
export type LanguageModule = SkillRecord;

/** @deprecated Use SkillRecordWithColor instead */
export type LanguageModuleWithColor = SkillRecordWithColor;

/** @deprecated Use SkillsData instead */
export type LanguagesModules = SkillsData;
