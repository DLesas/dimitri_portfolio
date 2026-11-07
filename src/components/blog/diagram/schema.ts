import { z } from "zod";

/**
 * What a post's <Diagram3D> is given: its nodes, where they sit, and the flows a reader
 * can follow through them. Checked while the site builds, so a diagram that breaks a
 * rule fails the build with every problem listed.
 */

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lower-case words joined by hyphens");
/** Diagram units: the camera sees about 30 across, centred on the middle of the nodes */
const coordinate = z.number().min(-30).max(30);

const nodeSchema = z.strictObject({
  id,
  label: z.string().trim().min(1).max(24),
  /** x to the right, y up, z towards the reader */
  position: z.tuple([coordinate, coordinate, coordinate]),
  /** Shown under the diagram while the node is pointed at or picked */
  description: z.string().trim().min(10).max(140),
});

const flowSchema = z.strictObject({
  id,
  label: z.string().trim().min(1).max(20),
  /** Shown under the diagram while the flow is picked */
  description: z.string().trim().min(10).max(220),
  /** The hops it takes, in order, each from one node's id to another's */
  path: z.array(z.tuple([id, id])).min(1).max(8),
});

export const diagramSchema = z
  .strictObject({
    /** What the diagram shows, as its accessible name */
    title: z.string().trim().min(10).max(120),
    nodes: z.array(nodeSchema).min(2).max(24),
    /** The first is shown to begin with */
    flows: z.array(flowSchema).min(1).max(6),
  })
  .superRefine(({ nodes, flows }, ctx) => {
    const duplicates = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i);
    for (const dup of duplicates(nodes.map((n) => n.id)))
      ctx.addIssue({ code: "custom", path: ["nodes"], message: `Two nodes have the id "${dup}"` });
    for (const dup of duplicates(flows.map((f) => f.id)))
      ctx.addIssue({ code: "custom", path: ["flows"], message: `Two flows have the id "${dup}"` });

    const known = new Set(nodes.map((n) => n.id));
    flows.forEach((flow, f) =>
      flow.path.forEach(([from, to], h) => {
        const path = ["flows", f, "path", h];
        for (const end of [from, to])
          if (!known.has(end)) ctx.addIssue({ code: "custom", path, message: `No node has the id "${end}"` });
        if (from === to) ctx.addIssue({ code: "custom", path, message: `A hop goes from "${from}" to itself` });
      })
    );
  });

export type DiagramData = z.input<typeof diagramSchema>;
