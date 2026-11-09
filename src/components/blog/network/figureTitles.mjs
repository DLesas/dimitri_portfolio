/**
 * Each NetworkFigure view's title: the figure's accessible name, and how the site
 * assistant reads the figure (src/lib/ask/rehypeChunks.mjs). Plain JavaScript, as Node
 * loads that plugin directly.
 */
export const NETWORK_FIGURE_TITLES = {
  draws: "The network drawn one draw call at a time",
  physics: "Nodes pushed by a cursor and pulled back to their drift paths",
  grid: "The grid connections are found with",
};
