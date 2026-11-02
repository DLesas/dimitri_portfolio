/** One skill in public/languages_modules.json */
export interface SkillRecord {
  name: string;
  /** Programming Language, Library, Software, Database or Cloud Platform */
  type: string;
  brief: string;
  full: string;
  link: string;
  tags: string[];
  /** Its logo, an optimised SVG in public/images/skills (sources in LICENSES.txt there) */
  icon?: string;
  /** The technology this skill is based on */
  parent?: string;
}

/** public/languages_modules.json: skills by name */
export type SkillsData = Record<string, SkillRecord>;
