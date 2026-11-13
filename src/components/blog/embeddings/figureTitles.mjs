/**
 * Each EmbeddingFigure view's title: the figure's accessible name, and how the site
 * assistant reads the figure (src/lib/ask/rehypeChunks.mjs). Plain JavaScript, as Node
 * loads that plugin directly.
 */
export const EMBEDDING_FIGURE_TITLES = {
  chunks: "A page cut into passages: short sections join a neighbour, long ones split",
  numbers: "Passages from this site as rows of numbers: similar passages make similar patterns",
  map: "Every passage on this site as a point in space, flattened to 3D by PCA or UMAP",
  closeness: "A question's arrow among passages' arrows: the nearer one points the same way, the closer it is",
  fusion: "A question's passages ranked by meaning (embeddings), by words (BM25), and by both merged",
  sync: "Editing one word changes a passage's fingerprint, so only that passage is embedded again",
  journey: "How a page becomes searchable passages, and how a question finds them",
};
