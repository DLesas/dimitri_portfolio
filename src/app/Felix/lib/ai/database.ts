import { db, companies, documents, documentChunks } from '@/db';
import type {
  NewCompany,
  NewDocument,
  NewDocumentChunk,
} from '@/db';
import type {
  DocumentStructure,
  SectionBoundary,
  SectionContent,
} from './schemas';
import { sql } from 'drizzle-orm';

/**
 * Save processed document and all its chunks to the database
 *
 * @param structure - Document structure from Phase 1 (must include company and documentDate)
 * @param sections - Section boundaries from Phase 1
 * @param contents - Section contents from Phase 2
 * @param embeddings - Generated embeddings for each section
 * @param storagePath - S3 or file storage path for the original PDF
 * @returns Object containing created company, document, and chunk IDs
 */
export async function saveDocumentToDatabase(
  structure: DocumentStructure,
  sections: SectionBoundary[],
  contents: SectionContent[],
  embeddings: number[][],
  storagePath: string
) {
  try {
    if (sections.length !== contents.length || sections.length !== embeddings.length) {
      throw new Error('Sections, contents, and embeddings arrays must have the same length');
    }

    // Step 1: Create or get company
    // Check if company exists
    const existingCompany = await db
      .select()
      .from(companies)
      .where(sql`${companies.name} ILIKE ${structure.company}`)
      .limit(1);

    let companyId: string;

    if (existingCompany.length > 0) {
      companyId = existingCompany[0].companyId;
    } else {
      // Create new company
      const newCompany: NewCompany = {
        name: structure.company,
        sector: structure.sector,
        ticker: null,
      };

      const [createdCompany] = await db.insert(companies).values(newCompany).returning();
      companyId = createdCompany.companyId;
    }

    // Step 2: Create document
    const newDocument: NewDocument = {
      companyId,
      filename: structure.documentTitle,
      documentTitle: structure.documentTitle,
      documentType: structure.documentType,
      fileType: 'pdf',
      storagePath,
      documentDate: structure.documentDate,
      reportingPeriod: structure.reportingPeriod,
      totalPages: structure.totalPages,
      totalChunks: sections.length,
    };

    const [createdDocument] = await db.insert(documents).values(newDocument).returning();

    // Step 3: Create all document chunks with categorized information
    const chunks: NewDocumentChunk[] = sections.map((section, index) => {
      const content = contents[index];
      const embedding = embeddings[index];

      return {
        docId: createdDocument.docId,
        chunkIndex: index + 1,
        chunkText: content.content,
        pageStart: section.pageStart,
        pageEnd: section.pageEnd,
        sectionTitle: section.sectionTitle,
        tokenCount: null, // Could calculate this if needed
        embedding,
        // Categorized extracted information (TB, PAQL, PAQN)
        timeBasedInfo: content.timeBasedInfo || [],
        qualitativeInfo: content.qualitativeInfo || [],
        quantitativeData: content.quantitativeData || [],
      };
    });

    const createdChunks = await db.insert(documentChunks).values(chunks).returning();

    return {
      companyId,
      documentId: createdDocument.docId,
      chunkIds: createdChunks.map(chunk => chunk.chunkId),
      totalChunks: createdChunks.length,
    };
  } catch (error) {
    console.error('Error saving document to database:', error);
    throw new Error(
      `Failed to save document to database: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
