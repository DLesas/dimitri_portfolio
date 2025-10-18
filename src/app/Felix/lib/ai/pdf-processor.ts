import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PDFDocument } from 'pdf-lib';
import {
  documentStructureSchema,
  sectionContentSchema,
  type DocumentStructure,
  type SectionContent,
  type SectionBoundary,
} from './schemas';
import { db, companies, documents, documentChunks } from '@/db';
import { eq } from 'drizzle-orm';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Converts a File object to a base64 data URL
 */
export async function fileToBase64DataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const charArray = Array.from(uint8Array, byte => String.fromCharCode(byte));
  const binaryString = charArray.join('');
  const base64Data = btoa(binaryString);
  return `data:${file.type};base64,${base64Data}`;
}

/**
 * Converts a buffer to a base64 data URL
 */
export function bufferToBase64DataUrl(
  buffer: Buffer,
  mimeType: string = 'application/pdf'
): string {
  const base64Data = buffer.toString('base64');
  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Extract specific pages from a PDF
 *
 * @param pdfBytes - Original PDF as Uint8Array
 * @param startPage - Start page (1-indexed)
 * @param endPage - End page (1-indexed, inclusive)
 * @returns New PDF with only the specified pages as base64 data URL
 */
export async function extractPdfPages(
  pdfBytes: Uint8Array,
  startPage: number,
  endPage: number
): Promise<string> {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Create a new PDF with only the selected pages
    const newPdfDoc = await PDFDocument.create();

    // Copy pages (pdf-lib uses 0-indexed, but our schema is 1-indexed)
    const pagesToCopy = [];
    for (let i = startPage - 1; i < endPage; i++) {
      pagesToCopy.push(i);
    }

    const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToCopy);
    copiedPages.forEach(page => newPdfDoc.addPage(page));

    // Save the new PDF
    const newPdfBytes = await newPdfDoc.save();

    // Convert to base64 data URL
    const base64 = Buffer.from(newPdfBytes).toString('base64');
    return `data:application/pdf;base64,${base64}`;
  } catch (error) {
    console.error(`Error extracting pages ${startPage}-${endPage}:`, error);
    throw new Error(
      `Failed to extract PDF pages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validates PDF file size
 */
export function validatePdfSize(sizeInBytes: number, maxSizeInMB: number = 10): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  if (sizeInBytes > maxSizeInBytes) {
    throw new Error(
      `PDF size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds max (${maxSizeInMB}MB)`
    );
  }

  if (sizeInBytes === 0) {
    throw new Error('PDF file is empty');
  }

  return true;
}

/**
 * Validates that file is a PDF
 */
export function validatePdfType(file: File): boolean {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('File must be a PDF');
  }
  return true;
}

/**
 * Fetch existing sectors from the database to help with sector normalization
 */
async function getExistingSectors(): Promise<string[]> {
  try {
    const result = await db
      .selectDistinct({ sector: companies.sector })
      .from(companies);
    return result.map(r => r.sector).filter(Boolean);
  } catch (error) {
    console.error('Error fetching existing sectors:', error);
    return []; // Return empty array if database query fails
  }
}

/**
 * Fetch existing categorized information patterns from the database for a specific sector
 * Returns examples of TB, PAQL, and PAQN data to help with consistency
 */
async function getExistingPatternsForSector(sector: string): Promise<{
  timeBasedEventTypes: string[];
  qualitativeTopics: string[];
  quantitativeMetricNames: string[];
}> {
  try {
    const result = await db
      .select({
        timeBasedInfo: documentChunks.timeBasedInfo,
        qualitativeInfo: documentChunks.qualitativeInfo,
        quantitativeData: documentChunks.quantitativeData,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.docId, documents.docId))
      .innerJoin(companies, eq(documents.companyId, companies.companyId))
      .where(eq(companies.sector, sector))
      .limit(500); // Get more data for better pattern recognition

    // Extract unique patterns from each category
    const timeBasedEventTypes = new Set<string>();
    const qualitativeTopics = new Set<string>();
    const quantitativeMetricNames = new Set<string>();

    result.forEach(row => {
      // Time-Based (TB) event types
      if (Array.isArray(row.timeBasedInfo)) {
        row.timeBasedInfo.forEach((info: { eventType?: string }) => {
          if (info.eventType) {
            timeBasedEventTypes.add(info.eventType);
          }
        });
      }

      // Qualitative (PAQL) topics
      if (Array.isArray(row.qualitativeInfo)) {
        row.qualitativeInfo.forEach((info: { topic?: string }) => {
          if (info.topic) {
            qualitativeTopics.add(info.topic);
          }
        });
      }

      // Quantitative (PAQN) metric names
      if (Array.isArray(row.quantitativeData)) {
        row.quantitativeData.forEach((data: { metricName?: string }) => {
          if (data.metricName) {
            quantitativeMetricNames.add(data.metricName);
          }
        });
      }
    });

    return {
      timeBasedEventTypes: Array.from(timeBasedEventTypes),
      qualitativeTopics: Array.from(qualitativeTopics),
      quantitativeMetricNames: Array.from(quantitativeMetricNames),
    };
  } catch (error) {
    console.error('Error fetching existing patterns:', error);
    return {
      timeBasedEventTypes: [],
      qualitativeTopics: [],
      quantitativeMetricNames: [],
    }; // Return empty arrays if database query fails
  }
}

/**
 * Phase 1: Extract document structure and section boundaries
 * This is a single API call that identifies all sections without extracting full content
 *
 * @param pdfDataUrl - PDF as base64 data URL
 * @returns Document metadata and section boundaries
 */
export async function extractDocumentStructure(
  pdfDataUrl: string
): Promise<DocumentStructure> {
  try {
    // Fetch existing sectors for consistency
    const existingSectors = await getExistingSectors();
    const sectorHint = existingSectors.length > 0
      ? `\n\nExisting sectors in database: ${existingSectors.join(', ')}
If the company's sector is similar to one of these existing sectors, please use the existing sector name for consistency. Otherwise, create a new appropriate sector name.`
      : '';

    const result = await generateObject({
      model: openai('gpt-5-mini'),
      schema: documentStructureSchema,
      temperature: 0.1,
      maxRetries: 3,
      messages: [
        {
          role: 'system',
          content: `You are an expert document analyzer. Your task is to:
1. Extract document metadata (title, company, date, reporting period)
2. Identify the company's sector/industry (prefer existing sectors from database if similar)
3. Identify all major sections in the document
4. Determine section boundaries (start and end pages)
5. Classify each section by type

Be precise with page numbers. Focus on identifying section structure.${sectorHint}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this PDF and extract:
- Document title
- Company name (if mentioned)
- Sector/industry (prefer existing sectors if similar: ${existingSectors.join(', ') || 'none yet'})
- Document date (ISO format if possible)
- Reporting period (e.g., "Q4 2023", "FY 2023")
- Total page count
- All major sections with:
  * Section title
  * Section type
  * Start and end page numbers

Only identify section boundaries.`,
            },
            {
              type: 'file',
              data: pdfDataUrl,
              mediaType: 'application/pdf',
            },
          ],
        },
      ],
    });

    return result.object;
  } catch (error) {
    console.error('Error extracting document structure:', error);
    throw new Error(
      `Failed to extract document structure: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Phase 2: Extract detailed content for a single section
 * This extracts only the relevant pages and processes them
 *
 * @param pdfBytes - Original PDF as Uint8Array
 * @param section - Section boundary from Phase 1
 * @param sector - Company sector to fetch existing patterns for consistency
 * @returns Detailed section content, metrics, and topics
 */
export async function extractSectionContent(
  pdfBytes: Uint8Array,
  section: SectionBoundary,
  sector: string
): Promise<SectionContent> {
  try {
    // Extract only the pages for this section
    const sectionPdfDataUrl = await extractPdfPages(
      pdfBytes,
      section.pageStart,
      section.pageEnd
    );

    // Fetch existing patterns for this sector
    const patterns = await getExistingPatternsForSector(sector);

    // Build hints for each category
    const tbHint = patterns.timeBasedEventTypes.length > 0
      ? `\n\nExisting Time-Based (TB) event types for this sector: ${patterns.timeBasedEventTypes.join(', ')}
When extracting TB information, prefer using these event types if similar. Otherwise, choose the most appropriate event type from the schema.`
      : '';

    const paqlHint = patterns.qualitativeTopics.length > 0
      ? `\n\nExisting Qualitative (PAQL) topics for this sector: ${patterns.qualitativeTopics.join(', ')}
When extracting PAQL information, prefer using these topics if similar. Otherwise, choose the most appropriate topic from the schema.`
      : '';

    const paqnHint = patterns.quantitativeMetricNames.length > 0
      ? `\n\nExisting Quantitative (PAQN) metric names for this sector: ${patterns.quantitativeMetricNames.join(', ')}
When extracting PAQN data, prefer using these metric names if similar (e.g., use "revenue" instead of "total_revenue" if "revenue" exists). Use consistent naming for the same metrics.`
      : '';

    const result = await generateObject({
      model: openai('gpt-5-mini'),
      schema: sectionContentSchema,
      temperature: 0.1,
      maxRetries: 3,
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting and analyzing financial document content.
Extract data from the document and return it in the specified structured format.

IMPORTANT: Return data directly in the JSON schema format. Do NOT explain or describe the schema. Be as brief as possible.

For categorized information:
- Time-Based (TB) Information: Future events, expected dates, timelines (e.g., "Company is expected to hold a product launch on Q4 2024")
- Primary Asset Qualitative (PAQL) Information: Business operations, expansions, engagements (e.g., "Company recently expanded to 3 new locations")
- Primary Asset Quantitative (PAQN) Financial Data: Numeric metrics like revenue, size, product sales figures

Be thorough and accurate with numbers and units. For consistency, prefer existing naming conventions when they match:${tbHint}${paqlHint}${paqnHint}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this section and extract structured data:

Section: "${section.sectionTitle}" (${section.sectionType})
Pages: ${section.pageStart} to ${section.pageEnd}
Company Sector: ${sector}

Extract:
- summary: A concise 5-7 sentence summary
- timeBasedInfo: Array of Time-Based events (use event types: ${patterns.timeBasedEventTypes.slice(0, 5).join(', ') || 'product_launch, earnings_date, etc.'})
- qualitativeInfo: Array of Qualitative insights (use topics: ${patterns.qualitativeTopics.slice(0, 5).join(', ') || 'expansion, partnerships, etc.'})
- quantitativeData: Array of Quantitative metrics (use metric names: ${patterns.quantitativeMetricNames.slice(0, 5).join(', ') || 'revenue, headcount, etc.'})
- topics: Array of main topics/themes discussed

Return the data in the structured JSON format.`,
            },
            {
              type: 'file',
              data: sectionPdfDataUrl,
              mediaType: 'application/pdf',
            },
          ],
        },
      ],
    });

    return result.object;
  } catch (error) {
    console.error(`Error extracting content for section "${section.sectionTitle}":`, error);
    throw new Error(
      `Failed to extract section content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Phase 2: Extract content for all sections in parallel
 *
 * @param pdfBytes - Original PDF as Uint8Array
 * @param sections - Section boundaries from Phase 1
 * @param sector - Company sector for fetching existing patterns
 * @returns Array of section content (in same order as input)
 */
export async function extractAllSectionsContent(
  pdfBytes: Uint8Array,
  sections: SectionBoundary[],
  sector: string
): Promise<SectionContent[]> {
  try {
    // Process all sections in parallel
    const contentPromises = sections.map(section =>
      extractSectionContent(pdfBytes, section, sector)
    );

    const results = await Promise.all(contentPromises);
    console.log(results)
    return results;
  } catch (error) {
    console.error('Error extracting sections content:', error);
    throw new Error(
      `Failed to extract sections content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
