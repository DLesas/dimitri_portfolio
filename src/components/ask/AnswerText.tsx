import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CITATION, type Passage } from "./answers";
import { PassageLink } from "./PassageLink";

/** The little of Markdown's syntax tree that citing needs */
interface Node {
  type: string;
  value?: string;
  url?: string;
  children?: Node[];
  data?: { hName?: string; hProperties?: Record<string, unknown>; hChildren?: { type: "text"; value: string }[] };
}

/** The caret at the end of an answer being written, and the ellipsis where a stopped one was cut off */
const CARET = "ml-0.5 inline-block h-[1.05em] w-0.5 rounded-[1px] bg-primary align-[-0.15em] motion-safe:animate-blink";
const CUT = "ml-px text-default-500";

/**
 * A remark plugin: each [n] the conversation has a passage for becomes a link to it,
 * marked as a citation (data-cite); numbers it has no passage for stay as written. And
 * `end`, if given, goes at the end of the last paragraph or list item.
 */
function remarkAnswer(passages: Map<number, Passage>, end?: "caret" | "cut") {
  const cite = (node: Node): Node[] => {
    if (node.type !== "text" || !node.value) {
      if (node.children) node.children = node.children.flatMap(cite);
      return [node];
    }
    const text = node.value;
    const nodes: Node[] = [];
    let from = 0;
    for (const match of text.matchAll(CITATION)) {
      const numbers = match[1].split(",").map(Number);
      if (!numbers.some((n) => passages.has(n))) continue;
      nodes.push({ type: "text", value: text.slice(from, match.index) });
      for (const n of numbers) {
        const passage = passages.get(n);
        nodes.push(
          passage
            ? { type: "link", url: passage.url, data: { hProperties: { dataCite: n } }, children: [{ type: "text", value: String(n) }] }
            : { type: "text", value: `[${n}]` },
        );
      }
      from = match.index + match[0].length;
    }
    if (!from) return [node];
    nodes.push({ type: "text", value: text.slice(from) });
    return nodes.filter((n) => n.type !== "text" || n.value);
  };
  return () => (tree: Node) => {
    tree.children = tree.children?.flatMap(cite);
    if (!end) return;
    let last = tree.children?.at(-1);
    while (last && ["list", "listItem", "blockquote"].includes(last.type)) last = last.children?.at(-1);
    if (last?.type !== "paragraph" && last?.type !== "heading") return;
    last.children?.push({
      type: end,
      data: {
        hName: "span",
        hProperties: { className: (end === "caret" ? CARET : CUT).split(" "), ariaHidden: "true" },
        hChildren: end === "cut" ? [{ type: "text", value: "…" }] : [],
      },
    });
  };
}

// Styled once here, as the blog's Markdown is (mdx-components.tsx), at the palette's size.
// Citations link to their passages. The answers are told never to write links, so any
// other is shown as its text, and images not at all.
const components: Components = {
  a({ node, href, children }) {
    const n = node?.properties?.dataCite;
    if (n === undefined || !href) return <>{children}</>;
    return (
      <PassageLink
        href={href}
        data-cite={String(n)}
        aria-label={`Source ${n}`}
        className="mr-px ml-1 inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary/10 px-[5px] align-[2px] text-[11px] leading-none font-semibold text-primary-text tabular-nums no-underline transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary dark:bg-primary/20 [&+&]:ml-0.5"
      >
        {children}
      </PassageLink>
    );
  },
  h1: ({ node: _, ...props }) => <h1 className="font-semibold" {...props} />,
  h2: ({ node: _, ...props }) => <h2 className="font-semibold" {...props} />,
  h3: ({ node: _, ...props }) => <h3 className="font-semibold" {...props} />,
  h4: ({ node: _, ...props }) => <h4 className="font-semibold" {...props} />,
  strong: ({ node: _, ...props }) => <strong className="font-semibold" {...props} />,
  ul: ({ node: _, ...props }) => <ul className="list-disc space-y-1.5 pl-5 marker:text-default-400 [li>&]:mt-1.5" {...props} />,
  ol: ({ node: _, ...props }) => <ol className="list-decimal space-y-1.5 pl-6 marker:text-default-500 [li>&]:mt-1.5" {...props} />,
  blockquote: ({ node: _, ...props }) => <blockquote className="border-l-2 border-foreground/10 pl-3 text-default-600" {...props} />,
  code: ({ node: _, ...props }) => <code className="rounded-[5px] bg-default-100 px-[5px] py-px font-mono text-[0.88em] [pre>&]:bg-transparent [pre>&]:p-0 [pre>&]:text-[1em]" {...props} />,
  pre: ({ node: _, ...props }) => <pre className="overflow-x-auto rounded-[10px] bg-default-100 px-3 py-2.5 text-[13px] leading-normal" {...props} />,
  table: ({ node: _, ...props }) => <table className="block overflow-x-auto text-[13.5px]" {...props} />,
  th: ({ node: _, ...props }) => <th className="border-b border-foreground/10 py-1 pr-3 text-left font-semibold" {...props} />,
  td: ({ node: _, ...props }) => <td className="border-b border-foreground/10 py-1 pr-3" {...props} />,
  hr: () => <hr className="border-foreground/10" />,
};

/**
 * An answer's text, as Markdown, with its citations ([n]) as links to their passages.
 * While it's written, a line break or a bare "- " at the end is held back, so a list
 * item doesn't flash up as a paragraph first.
 */
export function AnswerText({ text, passages, end }: { text: string; passages: Map<number, Passage>; end?: "caret" | "cut" }) {
  const shown = end === "caret" ? text.trimEnd().replace(/\n(-|\d+\.)$/, "").trimEnd() : text;
  return (
    <Markdown remarkPlugins={[remarkGfm, remarkAnswer(passages, end)]} components={components} disallowedElements={["img"]} skipHtml>
      {shown}
    </Markdown>
  );
}
