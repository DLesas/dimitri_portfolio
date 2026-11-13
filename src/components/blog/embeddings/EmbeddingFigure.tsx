import { ChunksFigure } from "./ChunksFigure";
import { ClosenessFigure } from "./ClosenessFigure";
import { EMBEDDING_FIGURE_TITLES } from "./figureTitles.mjs";
import { FusionFigure } from "./FusionFigure";
import { JourneyFigure } from "./JourneyFigure";
import { MapFigure } from "./MapFigure";
import { NumbersFigure } from "./NumbersFigure";
import { SyncFigure } from "./SyncFigure";

const FIGURES = {
  chunks: ChunksFigure,
  numbers: NumbersFigure,
  map: MapFigure,
  closeness: ClosenessFigure,
  fusion: FusionFigure,
  sync: SyncFigure,
  journey: JourneyFigure,
};

/**
 * A figure in the post about the site assistant's search: <EmbeddingFigure show="map" />
 * in MDX. Each view is drawn from the deployed site's own data (map.json, made by
 * scripts/ask/map.ts); its title is the figure's accessible name.
 */
export function EmbeddingFigure({ show }: { show: keyof typeof FIGURES }) {
  const Figure = FIGURES[show];
  if (!Figure) throw new Error(`A blog post has an <EmbeddingFigure> with an unknown view: ${String(show)}`);
  return <Figure title={EMBEDDING_FIGURE_TITLES[show]} />;
}
