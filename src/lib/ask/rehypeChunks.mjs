// @ts-check
/**
 * Splits each blog post into the chunks Deeves searches and cites, and wraps
 * each chunk in a <section> carrying its id, so a citation can link straight to it.
 *
 * A chunk is a ## or ### section, heading included, or the text before the first
 * heading. One under `min` words joins the next if that's in the same ## section, or else
 * the one before. One over `max` words splits between blocks (paragraphs, lists, code,
 * tables, figures), never inside one. A chunk's text starts with the post's title and its
 * headings, and a figure is read as its title.
 *
 * The chunks are also left on `file.data.chunks`, for the tools that compile posts
 * themselves (siteChunks.ts). The last plugin in src/lib/blog/mdxOptions.ts, in plain
 * JavaScript as the MDX loader imports it with Node.
 */
import { NETWORK_FIGURE_TITLES } from "../../components/blog/network/figureTitles.mjs";
import { chunk, countWords } from "./chunkText.mjs";

/**
 * The parts of hast's and MDX's nodes read here
 * @typedef {object} Node
 * @property {string} type
 * @property {string} [tagName]
 * @property {string | null} [name] A JSX element's component
 * @property {string} [value]
 * @property {Record<string, unknown>} [properties]
 * @property {{ type: string, name?: string, value?: unknown }[]} [attributes]
 * @property {Node[]} [children]
 * @property {{ estree?: import("estree").Program }} [data]
 */

/**
 * @typedef {object} Section
 * @property {string[]} path
 * @property {number} h2 Which ## section it's in, counting from 0 (-1 before the first)
 * @property {Node[]} blocks
 */

/** @param {{ min: number, max: number }} words */
export default function rehypeChunks(words) {
  /**
   * @param {{ children: Node[] }} tree
   * @param {{ data: Record<string, unknown>, path?: string }} file
   */
  return (tree, file) => {
    const sections = sizedUp(sectionsOf(tree.children, postTitle(tree, file)), words);
    const chunks = sections.map((s) => chunk(s.path, s.blocks.map(blockText).filter(Boolean).join("\n\n")));
    if (new Set(chunks.map((c) => c.id)).size < chunks.length) {
      throw new Error(`${file.path}: two sections have the same headings and text`);
    }

    // Each section's blocks move into a <section>, which takes the place of its first.
    // ESM (the post's exports) stays at the top level, where MDX needs it.
    const wrapped = new Map(
      sections.map((s, i) => [
        s.blocks[0],
        { type: "element", tagName: "section", properties: { id: chunks[i].id }, children: s.blocks },
      ])
    );
    const inSections = new Set(sections.flatMap((s) => s.blocks));
    tree.children = tree.children.flatMap((node) => wrapped.get(node) ?? (inSections.has(node) || isBlank(node) ? [] : [node]));
    file.data.chunks = chunks;
  };
}

/**
 * The post's blocks, grouped under their headings
 * @param {Node[]} nodes
 * @param {string} title
 * @returns {Section[]}
 */
function sectionsOf(nodes, title) {
  /** @type {Section[]} */
  const sections = [];
  let h2 = -1;
  let h2Text = "";
  for (const node of nodes) {
    if (node.type === "mdxjsEsm" || isBlank(node)) continue;
    const depth = node.tagName === "h2" ? 2 : node.tagName === "h3" ? 3 : 0;
    if (depth === 2) {
      h2++;
      h2Text = inlineText(node);
    }
    if (depth || !sections.length) {
      const path = depth === 3 ? [title, h2Text, inlineText(node)] : depth === 2 ? [title, h2Text] : [title];
      sections.push({ path, h2, blocks: [] });
    }
    sections[sections.length - 1].blocks.push(node);
  }
  return sections;
}

/**
 * The sections, sized for embedding: small ones joined to a neighbour, big ones split
 * @param {Section[]} sections
 * @param {{ min: number, max: number }} words
 * @returns {Section[]}
 */
function sizedUp(sections, { min, max }) {
  /** @param {Node[]} blocks */
  const wordsIn = (blocks) => countWords(blocks.map(blockText).join(" "));

  /** @type {Section[]} */
  const joined = [];
  sections.forEach((s, i) => {
    const next = sections[i + 1];
    if (wordsIn(s.blocks) >= min) joined.push(s);
    else if (next && next.h2 === s.h2) next.blocks.unshift(...s.blocks);
    else if (joined.length) joined[joined.length - 1].blocks.push(...s.blocks);
    else joined.push(s);
  });

  return joined.flatMap((s) => {
    /** @type {Section[]} */
    const parts = [];
    /** @type {Node[]} */
    let part = [];
    let count = 0;
    for (const block of s.blocks) {
      const n = wordsIn([block]);
      if (part.length && count + n > max) {
        parts.push({ ...s, blocks: part });
        part = [];
        count = 0;
      }
      part.push(block);
      count += n;
    }
    parts.push({ ...s, blocks: part });
    return parts;
  });
}

/**
 * A block's text, for its chunk: "" for a heading, which the chunk's path already holds
 * @param {Node} node
 * @returns {string}
 */
function blockText(node) {
  if (node.type === "mdxJsxFlowElement") {
    if (node.name === "NetworkFigure") {
      const title = /** @type {Record<string, string>} */ (NETWORK_FIGURE_TITLES)[attribute(node, "show") ?? ""];
      if (title) return `Figure: ${title}`;
    }
    // A component wrapping text, like <Callout>, reads as that text
    if (node.children?.length) return node.children.map(blockText).filter(Boolean).join("\n\n");
    throw new Error(`<${node.name}> has no text for the site assistant: say how to read it in src/lib/ask/rehypeChunks.mjs`);
  }
  switch (node.tagName) {
    case "h2":
    case "h3":
    case "h4":
    case "hr":
      return "";
    case "ul":
    case "ol":
      return (node.children ?? [])
        .filter((item) => item.tagName === "li")
        .map((item) => `- ${inlineText(item)}`)
        .join("\n");
    case "table":
      return descendants(node, "tr")
        .map((row) => (row.children ?? []).filter((cell) => cell.tagName === "th" || cell.tagName === "td").map(inlineText).join(" | "))
        .join("\n");
    // Code, as written (rehype-pretty-code puts each block in a <figure>)
    case "pre":
    case "figure":
      return rawText(node).trim();
    case "blockquote":
      return (node.children ?? []).map(blockText).filter(Boolean).join("\n\n");
    default:
      return inlineText(node);
  }
}

/**
 * The post's title, from its `metadata` export (which posts.ts checks as the site builds)
 * @param {{ children: Node[] }} tree
 * @param {{ path?: string }} file
 */
function postTitle(tree, file) {
  for (const node of tree.children) {
    for (const statement of node.data?.estree?.body ?? []) {
      if (statement.type !== "ExportNamedDeclaration" || statement.declaration?.type !== "VariableDeclaration") continue;
      for (const { id, init } of statement.declaration.declarations) {
        if (id.type !== "Identifier" || id.name !== "metadata" || init?.type !== "ObjectExpression") continue;
        for (const property of init.properties) {
          if (
            property.type === "Property" &&
            property.key.type === "Identifier" &&
            property.key.name === "title" &&
            property.value.type === "Literal" &&
            typeof property.value.value === "string"
          ) {
            return property.value.value;
          }
        }
      }
    }
  }
  throw new Error(`${file.path}: its metadata export needs a title, written as a string`);
}

/**
 * All the text in a node, as written
 * @param {Node} node
 * @returns {string}
 */
const rawText = (node) =>
  node.type === "text" ? (node.value ?? "") : node.type.startsWith("mdx") && node.type.endsWith("Expression") ? "" : (node.children ?? []).map(rawText).join("");

/**
 * A node's text on one line, as it reads
 * @param {Node} node
 */
const inlineText = (node) => rawText(node).replace(/\s+/g, " ").trim();

/**
 * The elements named `tagName` inside `node`
 * @param {Node} node
 * @param {string} tagName
 * @returns {Node[]}
 */
const descendants = (node, tagName) =>
  (node.children ?? []).flatMap((child) => [...(child.tagName === tagName ? [child] : []), ...descendants(child, tagName)]);

/**
 * A JSX element's attribute, when it's a plain string
 * @param {Node} node
 * @param {string} name
 */
function attribute(node, name) {
  const value = node.attributes?.find((a) => a.type === "mdxJsxAttribute" && a.name === name)?.value;
  return typeof value === "string" ? value : undefined;
}

/** @param {Node} node */
const isBlank = (node) => node.type === "text" && !node.value?.trim();
