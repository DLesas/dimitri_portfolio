'use server';

import {
  fileToBase64DataUrl,
  extractDocumentStructure,
  extractAllSectionsContent,
  validatePdfSize,
  validatePdfType,
} from '@/app/Felix/lib/ai/pdf-processor';
import { generateSectionEmbeddings } from '@/app/Felix/lib/ai/embeddings';
import { saveDocumentToDatabase } from '@/app/Felix/lib/ai/database';
import { checkAuth as checkFelixAuth } from './actions';

/**
 * Check if user is authenticated for Felix route
 */


/**
 * Server action to process a PDF document upload
 * Called from Felix route pages
 * Requires authentication via Felix auth cookie
 *
 * @param formData - Form data containing the PDF file
 * @returns Processing result
 */
export async function processDocument(formData: FormData) {
  try {
    // Check authentication
    const isAuthenticated = await checkFelixAuth();

    if (!isAuthenticated) {
      return {
        success: false,
        error: 'Unauthorized: Please log in to access this feature',
      };
    }

    const file = formData.get('pdf') as File;

    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      };
    }

    // Validate file
    try {
      validatePdfType(file);
      validatePdfSize(file.size);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid file',
      };
    }

    // Convert to base64 for Phase 1
    const pdfDataUrl = await fileToBase64DataUrl(file);

    // Get original bytes for Phase 2
    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    // TODO: Upload to S3 or file storage and get path
    // For now, use a placeholder
    const storagePath = `temp/${file.name}`;

    // PHASE 1: Extract document structure (1 API call)
    console.log('Phase 1: Extracting document structure...');
    const structure = await extractDocumentStructure(pdfDataUrl);

    console.log(`Found ${structure.sections.length} sections`);
    console.log(`Company: ${structure.company}`);
    console.log(`Sector: ${structure.sector}`);
    console.log(`Date: ${structure.documentDate}`);

    // PHASE 2: Extract section content in parallel (N API calls)
    console.log('Phase 2: Extracting section content with sector-specific patterns...');
    const contents = await extractAllSectionsContent(pdfBytes, structure.sections, structure.sector);

    // PHASE 3: Generate embeddings (1 API call)
    console.log('Phase 3: Generating embeddings...');
    const embeddings = await generateSectionEmbeddings(structure.sections, contents);

    // PHASE 4: Save to database
    console.log('Phase 4: Saving to database...');
    const result = await saveDocumentToDatabase(
      structure,
      structure.sections,
      contents,
      embeddings,
      storagePath
    );

    console.log('Processing complete!');

    return {
      success: true,
      companyId: result.companyId,
      documentId: result.documentId,
      totalChunks: result.totalChunks,
      documentTitle: structure.documentTitle,
      company: structure.company,
      documentDate: structure.documentDate,
      sections: structure.sections.length,
    };
  } catch (error) {
    console.error('Error processing document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
