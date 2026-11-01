/** One skill in public/languages_modules.json */
export interface SkillRecord {
  name: string;
  /** Programming Language, Library, Software, Database or Cloud Platform */
  type: string;
  /** Proficiency, 0-100 */
  value: number;
  brief: string;
  full: string;
  link: string;
  tags: string[];
  icon?: string;
  /** Dark mode variant of the icon */
  dark?: string;
  /** The technology this skill is based on */
  parent?: string;
}

/** public/languages_modules.json: skills by name */
export type SkillsData = Record<string, SkillRecord>;
