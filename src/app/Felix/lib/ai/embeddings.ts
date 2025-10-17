import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { SectionBoundary, SectionContent } from './schemas';

/**
 * The embedding model to use (1536 dimensions - matches our DB schema)
 */
const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Prepare text for embedding by combining content and metadata
 * This creates a richer semantic representation for better retrieval
 */
function prepareTextForEmbedding(
  content: string,
  metadata?: {
    title?: string;
    summary?: string;
    topics?: string[];
  }
): string {
  const parts: string[] = [];

  if (metadata?.title) {
    parts.push(`Title: ${metadata.title}`);
  }

  if (metadata?.summary) {
    parts.push(`Summary: ${metadata.summary}`);
  }

  if (metadata?.topics && metadata.topics.length > 0) {
    parts.push(`Topics: ${metadata.topics.join(', ')}`);
  }

  parts.push(`Content: ${content}`);

  return parts.join('\n\n');
}

/**
 * Generate embeddings for all sections in a single batch operation
 * This is the most efficient way - one API call for all sections
 *
 * @param sections - Array of section boundaries
 * @param contents - Array of section contents (must match sections order)
 * @returns Array of embedding vectors (1536 dimensions each)
 */
export async function generateSectionEmbeddings(
  sections: SectionBoundary[],
  contents: SectionContent[]
): Promise<number[][]> {
  try {
    if (sections.length !== contents.length) {
      throw new Error('Sections and contents arrays must have the same length');
    }

    // Prepare all texts for embedding
    const textsToEmbed = sections.map((section, index) => {
      const content = contents[index];
      return prepareTextForEmbedding(content.content, {
        title: section.sectionTitle,
        summary: content.summary,
        topics: content.topics,
      });
    });

    // Generate all embeddings in one batch
    const { embeddings } = await embedMany({
      model: openai.textEmbeddingModel(EMBEDDING_MODEL),
      values: textsToEmbed,
    });

    return embeddings;
  } catch (error) {
    console.error('Error generating section embeddings:', error);
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
