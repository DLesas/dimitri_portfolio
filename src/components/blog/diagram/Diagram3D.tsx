import { z } from "zod";
import { DiagramFigure } from "./DiagramFigure";
import { layOut } from "./layout";
import { diagramSchema, type DiagramData } from "./schema";

/**
 * An interactive 3D diagram in a blog post: nodes in space, the links between them, and
 * flows a reader can follow through them. Posts use it without importing it:
 *
 *   <Diagram3D {...architecture} />
 *
 * with `architecture` exported from the post (see schema.ts for what it holds). Its data
 * is checked while the site builds. The still picture, labels and captions are in the
 * page's HTML; three.js loads once the diagram is nearly on screen, and the scene pauses
 * whenever it's off screen.
 */
export function Diagram3D(props: DiagramData) {
  const parsed = diagramSchema.safeParse(props);
  if (!parsed.success) {
    throw new Error(`A <Diagram3D> in a blog post is invalid:\n${z.prettifyError(parsed.error)}`);
  }
  const { title, nodes, flows } = parsed.data;
  const { graph, picture } = layOut(parsed.data);
  const text = ({ label, description }: { label: string; description: string }) => ({ label, description });

  return <DiagramFigure title={title} nodes={nodes.map(text)} flows={flows.map(text)} graph={graph} picture={picture} />;
}
