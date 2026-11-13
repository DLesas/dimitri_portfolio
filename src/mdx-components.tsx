import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { Callout } from "@/components/blog/Callout";
import { Diagram3D } from "@/components/blog/diagram/Diagram3D";
import { EmbeddingFigure } from "@/components/blog/embeddings/EmbeddingFigure";
import { Stat } from "@/components/blog/embeddings/Stat";
import { NetworkFigure } from "@/components/blog/network/NetworkFigure";

/**
 * How every blog post's text looks: Markdown's elements styled once here, plus the
 * components posts can use without importing them (Callout, Diagram3D, EmbeddingFigure, NetworkFigure, Stat).
 * Required by @next/mdx.
 * Section titles (##) are Playfair italic; sub-section titles (###) stay in the body font.
 */

/** The "#" beside a heading, for linking to that section; shows on hover or focus */
function HeadingLink({ id }: { id?: string }) {
  if (!id) return null;
  return (
    <a
      href={`#${id}`}
      aria-label="Link to this section"
      className="ml-2 font-sans not-italic font-normal text-default-400 no-underline opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      #
    </a>
  );
}

const components = {
  h2: ({ id, children }: ComponentPropsWithoutRef<"h2">) => (
    // The post's first heading sits close to the top. Each section is in its own <section>
    // (src/lib/ask/rehypeChunks.mjs), so that's the first child of the first one.
    <h2 id={id} className="group scroll-mt-8 font-display text-[1.9rem] leading-tight text-foreground text-balance mt-[3.1em] mb-[1em] [section:first-child>&:first-child]:mt-1">
      {children}
      <HeadingLink id={id} />
    </h2>
  ),
  h3: ({ id, children }: ComponentPropsWithoutRef<"h3">) => (
    <h3 id={id} className="group scroll-mt-8 text-[1.08rem] font-semibold leading-snug text-foreground text-balance mt-[2.2em] mb-[0.6em]">
      {children}
      <HeadingLink id={id} />
    </h3>
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => <p className="my-[1.1em]" {...props} />,
  a: ({ href = "", ...props }: ComponentPropsWithoutRef<"a">) => {
    const className = "text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary";
    // Links within the site navigate in place; others open in a new tab
    return href.startsWith("/") || href.startsWith("#") ? (
      <Link href={href} className={className} {...props} />
    ) : (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...props} />
    );
  },
  strong: (props: ComponentPropsWithoutRef<"strong">) => <strong className="font-semibold text-foreground" {...props} />,
  ul: (props: ComponentPropsWithoutRef<"ul">) => <ul className="my-[1.1em] list-disc space-y-1.5 pl-6 marker:text-default-400" {...props} />,
  ol: (props: ComponentPropsWithoutRef<"ol">) => <ol className="my-[1.1em] list-decimal space-y-1.5 pl-6 marker:text-default-400" {...props} />,
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="my-6 border-l-2 border-primary pl-5 text-default-600 [&>p]:my-2" {...props} />
  ),
  hr: () => <hr className="my-12 border-default-200" />,
  // Inline code; code blocks come from rehype-pretty-code, which marks them with data-language
  code: (props: ComponentPropsWithoutRef<"code"> & { "data-language"?: string }) =>
    props["data-language"] ? (
      <code {...props} />
    ) : (
      <code className="rounded-md bg-default-100 px-1.5 py-0.5 font-mono text-[0.88em]" {...props} />
    ),
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="my-6 overflow-x-auto rounded-xl border border-default-200 bg-default-50 p-4 font-mono text-[0.86rem] leading-relaxed dark:bg-[#0c0c0f]"
      {...props}
    />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-default-200">
      <table className="w-full border-collapse text-[0.95rem] tabular-nums" {...props} />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th className="border-b border-default-200 px-3.5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-default-500" {...props} />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="border-b border-default-200 px-3.5 py-2.5 [tr:last-child_&]:border-b-0" {...props} />
  ),
  img: ({ alt, src, ...props }: ComponentPropsWithoutRef<"img">) => {
    // Every image needs alt text: failing here fails the build for the post
    if (!alt?.trim()) throw new Error(`A blog post has an image with no alt text: ${String(src)}`);
    // Markdown images carry no size for next/image, so a plain lazy-loaded img
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={src} loading="lazy" decoding="async" className="my-6 rounded-xl" {...props} />;
  },
  Callout,
  Diagram3D,
  EmbeddingFigure,
  NetworkFigure,
  Stat,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
