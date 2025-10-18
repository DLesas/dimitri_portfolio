import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { db } from '@/db';
import { documentChunks, documents, companies } from '@/db/schema';
import { cosineDistance, eq } from 'drizzle-orm';

/**
 * Generate embedding for a query string
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.textEmbeddingModel('text-embedding-3-small'),
    value: query,
  });

  return embedding;
}

/**
 * Search for relevant document chunks using vector similarity for a specific company
 *
 * @param queryEmbedding - The embedding vector for the user's query
 * @param companyId - Filter results to this specific company
 * @param limit - Maximum number of results to return
 * @param similarityThreshold - Minimum cosine similarity score (0-1)
 * @returns Array of relevant chunks with metadata
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  companyId: string,
  limit: number = 5,
  similarityThreshold: number = 0.7
) {
  try {
    console.log('🔍 Searching for chunks:', { companyId, limit, similarityThreshold });

    // Use the cosine distance operator directly
    // Lower distance = more similar, so we use ascending order
    const distance = cosineDistance(documentChunks.embedding, queryEmbedding);

    // First, let's check if there are ANY chunks for this company (without distance filter)
    const allChunksForCompany = await db
      .select({
        chunkId: documentChunks.chunkId,
        distance: distance,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.docId, documents.docId))
      .innerJoin(companies, eq(documents.companyId, companies.companyId))
      .where(eq(companies.companyId, companyId))
      .orderBy(distance)
      .limit(limit);

    console.log(`📊 Found ${allChunksForCompany.length} total chunks for company (top ${limit})`);
    if (allChunksForCompany.length > 0) {
      console.log('📏 Distance range:', {
        min: allChunksForCompany[0]?.distance,
        max: allChunksForCompany[allChunksForCompany.length - 1]?.distance,
      });
    }

    // Now get the full results with all fields including categorized information
    const results = await db
      .select({
        chunkId: documentChunks.chunkId,
        chunkText: documentChunks.chunkText,
        sectionTitle: documentChunks.sectionTitle,
        pageStart: documentChunks.pageStart,
        pageEnd: documentChunks.pageEnd,
        // Categorized extracted information
        timeBasedInfo: documentChunks.timeBasedInfo,
        qualitativeInfo: documentChunks.qualitativeInfo,
        quantitativeData: documentChunks.quantitativeData,
        distance: distance,
        docId: documents.docId,
        documentTitle: documents.documentTitle,
        documentType: documents.documentType,
        documentDate: documents.documentDate,
        reportingPeriod: documents.reportingPeriod,
        companyId: companies.companyId,
        companyName: companies.name,
        companySector: companies.sector,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.docId, documents.docId))
      .innerJoin(companies, eq(documents.companyId, companies.companyId))
      .where(eq(companies.companyId, companyId))
      .orderBy(distance)
      .limit(limit);

    console.log(`✅ Returning ${results.length} chunks`);

    // Convert distance to similarity for the return value
    return results.map(result => ({
      ...result,
      similarity: 1 - (result.distance as number),
      distance: undefined, // Remove distance from output
    }));
  } catch (error) {
    console.error('❌ Error searching similar chunks:', error);
    throw new Error(
      `Failed to search similar chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get all companies that have documents in the database
 */
export async function getAvailableCompanies() {
  try {
    const results = await db
      .select({
        companyId: companies.companyId,
        name: companies.name,
        sector: companies.sector,
        ticker: companies.ticker,
      })
      .from(companies)
      .innerJoin(documents, eq(documents.companyId, companies.companyId))
      .groupBy(companies.companyId, companies.name, companies.sector, companies.ticker);

    return results;
  } catch (error) {
    console.error('Error fetching available companies:', error);
    throw new Error(
      `Failed to fetch available companies: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Format retrieved chunks into context for the LLM
 */
export function formatContextForLLM(
  chunks: Awaited<ReturnType<typeof searchSimilarChunks>>
): string {
  if (chunks.length === 0) {
    return 'No relevant information found in the database.';
  }

  return chunks
    .map((chunk, index) => {
      const metadata = [
        `Document: ${chunk.documentTitle}`,
        `Company: ${chunk.companyName}`,
        chunk.companySector ? `Sector: ${chunk.companySector}` : null,
        `Date: ${chunk.documentDate}`,
        chunk.reportingPeriod ? `Period: ${chunk.reportingPeriod}` : null,
        chunk.sectionTitle ? `Section: ${chunk.sectionTitle}` : null,
        chunk.pageStart ? `Pages: ${chunk.pageStart}-${chunk.pageEnd}` : null,
        `Relevance: ${(chunk.similarity * 100).toFixed(1)}%`,
      ]
        .filter(Boolean)
        .join(' | ');

      // Format categorized extracted information
      const extractedInfo = [];

      // Time-Based (TB) Information
      if (chunk.timeBasedInfo && chunk.timeBasedInfo.length > 0) {
        extractedInfo.push('Time-Based Information:');
        chunk.timeBasedInfo.forEach((info: { description?: string; eventType?: string; expectedDate?: string | null }) => {
          extractedInfo.push(`- [TB] ${info.description || 'N/A'} (${info.eventType || 'N/A'}, ${info.expectedDate || 'TBD'})`);
        });
      }

      // Primary Asset Qualitative (PAQL) Information
      if (chunk.qualitativeInfo && chunk.qualitativeInfo.length > 0) {
        extractedInfo.push('Qualitative Information:');
        chunk.qualitativeInfo.forEach((info: { context?: string; topic?: string }) => {
          extractedInfo.push(`- [PAQL] ${info.context || 'N/A'} (${info.topic || 'N/A'})`);
        });
      }

      // Primary Asset Quantitative (PAQN) Information
      if (chunk.quantitativeData && chunk.quantitativeData.length > 0) {
        extractedInfo.push('Quantitative Data:');
        chunk.quantitativeData.forEach((data: { metricName?: string; value?: number; unit?: string; period?: string | null; context?: string | null }) => {
          extractedInfo.push(`- [PAQN] ${data.metricName || 'N/A'}: ${data.value || 'N/A'} ${data.unit || ''} - Period: ${data.period || 'N/A'}${data.context ? ` - ${data.context}` : ''}`);
        });
      }

      return `[Source ${index + 1}, Document ${chunk.documentTitle}, Pages ${chunk.pageStart}-${chunk.pageEnd}, relevance ${(chunk.similarity * 100).toFixed(1)}%]
${metadata}

${chunk.chunkText}

${extractedInfo.length > 0 ? `\nExtracted Information:\n${extractedInfo.join('\n')}` : ''}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Perform RAG: Retrieve relevant context and format for LLM
 */
export async function retrieveContext(
  query: string,
  companyId: string,
  options: {
    limit?: number;
    similarityThreshold?: number;
  } = {}
) {
  const { limit = 5, similarityThreshold = 0.7 } = options;

  // Generate embedding for the query
  const queryEmbedding = await generateQueryEmbedding(query);
  console.log('Query embedding generated');
  // Search for similar chunks for this specific company
  const chunks = await searchSimilarChunks(queryEmbedding, companyId, limit, similarityThreshold);
  console.log(`Found ${chunks.length} relevant chunks, chunks=${chunks}`);
  // Format context for LLM
  const context = formatContextForLLM(chunks);

  return {
    context,
    chunks,
    numResults: chunks.length,
  };
}
