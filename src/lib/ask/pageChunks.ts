import { isValidElement, type ReactNode } from "react";
import { ABOUT_INTRO, HOME_PITCH } from "@/content/intro";
import { WORK_EXPERIENCE } from "@/content/experience";
import { JOB_TITLE } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";
import type { SkillRecord, SkillsData } from "@/types/skills";
import skillsData from "../../../public/languages_modules.json";
import { chunk, type Chunk } from "./chunkText.mjs";

/**
 * The chunks of Dimitri's assistant outside the blog: the home page's pitch, the About
 * page's introduction, each role and each skill. The pages put the ids on the elements
 * these chunks come from, and the tools index them (siteChunks.ts).
 */

/** A chunk, and where a citation of it links to */
export interface SiteChunk extends Chunk {
  url: string;
}

/** The home page's pitch */
export const homeChunk = (): SiteChunk => withAnchor("/", chunk(["Home"], `${SITE_NAME}, ${JOB_TITLE}. ${HOME_PITCH}`));

/** The About page's introduction */
export const aboutIntroChunk = (): SiteChunk => withAnchor("/about", chunk(["About"], ABOUT_INTRO));

/** Each role on the About page's timeline, in its order */
export const roleChunks = (): SiteChunk[] =>
  WORK_EXPERIENCE.map((role) =>
    withAnchor(
      "/about",
      chunk(
        ["About", "Work experience", `${role.jobTitle}, ${role.company}`],
        [
          `${role.period}${role.clearance ? `, ${role.clearance} cleared` : ""}.`,
          role.bullets.map((bullet) => `- ${textOf(bullet)}`).join("\n"),
          `Skills: ${role.skills.join(", ")}.`,
        ].join("\n\n")
      )
    )
  );

/** Each skill in the About page's word cloud. A citation opens that skill's details (SkillsSection). */
export const skillChunks = (): SiteChunk[] =>
  Object.values(skillsData as SkillsData).map((skill: SkillRecord) => ({
    ...chunk(
      ["About", "Skills", skill.name],
      [`${skill.name} (${skill.type}): ${skill.brief}`, skill.full, skill.tags.length && `Areas: ${skill.tags.join(", ")}.`]
        .filter(Boolean)
        .join("\n\n")
    ),
    url: `/about?skill=${encodeURIComponent(skill.name)}#skills`,
  }));

const withAnchor = (page: string, c: Chunk): SiteChunk => ({ ...c, url: `${page}#${c.id}` });

/** The text in React content, on one line */
const textOf = (node: ReactNode) => rawText(node).replace(/\s+/g, " ").trim();

function rawText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(rawText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return rawText(node.props.children);
  return "";
}
