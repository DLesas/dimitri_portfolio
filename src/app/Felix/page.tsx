"use client";

import { motion } from "framer-motion";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

// Reusable code block component with theme support
const CodeBlock = ({ children, language = 'typescript' }: { children: string; language?: string }) => {
  const { theme } = useTheme();

  return (
    <SyntaxHighlighter
      language={language}
      style={theme === 'light' ? oneLight : vscDarkPlus}
      customStyle={{
        margin: 0,
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        background: 'transparent'
      }}
    >
      {children}
    </SyntaxHighlighter>
  );
};

export default function FelixCaseStudyPage() {

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.section initial="hidden" animate="visible" variants={staggerContainer}>

        {/* Page Title */}
        <motion.div variants={fadeInUp} className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-2">FelixOne Case Study</h1>
          <div className="h-1 w-48 mx-auto bg-gradient-to-r from-secondary to-primary rounded-full"></div>
        </motion.div>

        <motion.div variants={fadeInUp} className="space-y-8">
          <div>
            <div className="py-6">
              <h2 className="text-2xl font-semibold underline">Introduction</h2>
            </div>
            <div className="space-y-4 text-default-600 leading-relaxed">
              <p>
                For this case study I decided to make a prototype (which can be accessed via the navbar on the left of the screen) as I found the problem interesting and fancied the challenge, however be aware this was done in 4
                evenings as such there are some limitations (discussed below) and the ui might be occasionnaly janky/unfinished.
                The prototype I have made is a document processing system built to demonstrate RAG (Retrieval Augmented Generation)
                capabilities for analyzing financial documents. The system extracts structured data from PDFs, stores semantic
                embeddings in PostgreSQL with pgvector, and enables natural language querying through a chat interface.
              </p>
              <p> This system addresses the following requirements:</p>
              <div>
                <p>
                  Automatically process documents that users upload to extract 
the following information, within a financial context:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-4">
                  <li>
File Metadata (e.g. Type (Transcript, Presentation, News...)</li>
                  <li>Time-Based (TB) Information (e.g. Company is expected to hold a product launch on...)</li>
                  <li>Primary Asset Qualitative (PAQL) Information (Company is engaged in... recently expanded to 3 new locations)</li>
                  <li>PA Quantitative (PAQN) Financial Data (e.g. Size, Revenue, Financials, Product Sales figures)</li>
                </ul>
              </div>
              <p>
                Additionally you will find below that the stack I chosen is different from the one suggested in the case study prompt. After evaluating various options (such as a document/graph DB, because the data we are ingesting is semi-structured),
                I decided to build it using a standard SQL database (PostgreSQL) with vector search capabilities (pgvector extension) whilst still allowing unstrutcuted data (via the JSONB postgres datatype). </p>
                <p>I also concluded that python wasn't needed at least for the time being.</p>
                <p>You will find more information about my choices below.</p>
            </div>
          </div>
        </motion.div>
        

        {/* --- Architectural Overview --- */}
        <motion.div variants={fadeInUp} className="space-y-8">
          <div>
            <div className="py-6">
              <h2 className="text-2xl font-semibold underline">Architectural Overview</h2>
            </div>
            <div className="space-y-6 text-default-600 leading-relaxed">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Single Tech Stack (TypeScript / React / Node.js)
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Unified codebase with shared types enables faster iteration for an early-stage team.</li>
                  <li>Since the system relies on pre-trained LLM APIs, Python’s ML stack isn’t required and can be simplified to one language.</li>
                  <li>Simplifies infrastructure and makes it cheaper, one provider (Vercel) instead of Vercel + Railway.</li>
                  <li>Reduces onboarding complexity, developers only need to know one language.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">
                  PostgreSQL (with pgvector) instead of Convex
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Convex is great for real-time UX, but this product is read-heavy and query-driven hence SQL is needed.</li>
                  <li>Postgres supports fast joins, filters, and analytical queries (timeline, aggregation, semantic search) via SQL.</li>
                  <li><code>pgvector</code> provides vector similarity search across document embeddings.</li>
                  <li>Vendor-neutral, Postgres can be self-hosted or run on any cloud provider as such we won’t be locked in to convex.</li>
                  <li>Real-time capabilities can be added via a Socket.IO instance or a seperate managed provider if needed.</li>
                </ul>
              </div>
            </div>
          </div>
          </motion.div>

          {/* --- Database Architecture --- */}
          <div>
            <div className="py-6">
              <h2 className="text-2xl font-semibold underline">Database Architecture</h2>
            </div>
            <div className="text-default-600 leading-relaxed space-y-3">
              <p>
                The prototype schema focuses on three core entities:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Company</strong> — Represents a company. Has many <em>documents</em>.</li>
                <li><strong>Document</strong> — Represents a report (e.g., Quarterely report). Belongs to a company and contains many <em>chunks</em>.</li>
                <li><strong>DocumentChunk</strong> — Represents a chunk of text extracted from a section (semantic sections like “Funds From Operations”) containing both embeddings and extracted facts from that section.</li>
              </ul>
              <p className="mt-4">Schema definitions and the table indexes are shown below:</p>
            </div>
          </div>

          {/* --- Collapsible Code Viewer --- */}
          <Accordion variant="splitted" selectionMode="multiple">
            <AccordionItem key="companies" title="Companies Table">
              <CodeBlock>
{`export const companies = pgTable('companies', {
  companyId: uuid('company_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  sector: varchar('sector', { length: 100 }),
  ticker: varchar('ticker', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_companies_name').on(table.name),
}));`}
              </CodeBlock>
            </AccordionItem>

            <AccordionItem key="documents" title="Documents Table">
              <CodeBlock>
{`export const documents = pgTable('documents', {
  docId: uuid('doc_id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  documentTitle: varchar('document_title', { length: 500 }),
  documentType: varchar('document_type', { length: 100 }),
  fileType: varchar('file_type', { length: 50 }).notNull(),
  storagePath: text('storage_path').notNull(),
  documentDate: date('document_date'),
  reportingPeriod: varchar('reporting_period', { length: 50 }),
  totalPages: integer('total_pages'),
  totalChunks: integer('total_chunks'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('idx_documents_company').on(table.companyId),
  dateIdx: index('idx_documents_date').on(table.documentDate),
}));`}
              </CodeBlock>
            </AccordionItem>

            <AccordionItem key="chunks" title="Document Chunks Table">
              <CodeBlock>
{`export const documentChunks = pgTable('document_chunks', {
  chunkId: uuid('chunk_id').primaryKey().defaultRandom(),
  docId: uuid('doc_id').notNull().references(() => documents.docId, { onDelete: 'cascade' }),

  chunkIndex: integer('chunk_index').notNull(), // 1, 2, 3...
  chunkText: text('chunk_text').notNull(),

  // Section info
  pageStart: integer('page_start'),
  pageEnd: integer('page_end'),
  sectionTitle: varchar('section_title', { length: 500 }),
  tokenCount: integer('token_count'),

  // Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)
  embedding: vector('embedding', { dimensions: 1536 }),

  // Time-Based (TB) Information - future events, timelines, expected dates
  timeBasedInfo: jsonb('time_based_info').$type<TimeBasedInfo[]>().default([]),
  /* Example:
  [
    {
      "category": "TB",
      "text": "Company is expected to hold a product launch on Q4 2024",
      "eventType": "product_launch",
      "expectedDate": "Q4 2024",
      "description": "New AI product suite launch",
    }
  ]
  */

  // Primary Asset Qualitative (PAQL) Information - business operations, expansions, engagements
  qualitativeInfo: jsonb('qualitative_info').$type<QualitativeInfo[]>().default([]),
  /* Example:
  [
    {
      "category": "PAQL",
      "text": "Recently expanded to 3 new locations in Southeast Asia",
      "topic": "expansion",
      "context": "Geographic expansion into emerging markets",
      "sentiment": "positive",
    }
  ]
  */

  // Primary Asset Quantitative (PAQN) Information - financial metrics, revenue, KPIs
  quantitativeData: jsonb('quantitative_data').$type<QuantitativeData[]>().default([]),
  /* Example:
  [
    {
      "category": "PAQN",
      "metricName": "rental_revenue",
      "value": 90000000,
      "unit": "EUR",
      "period": "Q4 2023",
    }
  ]
  */

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  docIdx: index('idx_chunks_doc').on(table.docId),
  docIndexIdx: index('idx_chunks_doc_index').on(table.docId, table.chunkIndex),
}));`}
              </CodeBlock>
            </AccordionItem>
            <AccordionItem key="sql" title="Custom SQL indexes">
              <CodeBlock language="sql">
{`-- ============================================
-- VECTOR SIMILARITY INDEX
-- ============================================
-- HNSW index for fast cosine similarity search on embeddings
-- This provides nearest-neighbor search for RAG retrieval

CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- JSONB INDEXES FOR CATEGORIZED INFORMATION
-- ============================================
-- GIN indexes for querying categorized JSONB columns (TB, PAQL, PAQN)

CREATE INDEX IF NOT EXISTS idx_chunks_time_based_gin
  ON document_chunks
  USING gin (time_based_info);

CREATE INDEX IF NOT EXISTS idx_chunks_qualitative_gin
  ON document_chunks
  USING gin (qualitative_info);

CREATE INDEX IF NOT EXISTS idx_chunks_quantitative_gin
  ON document_chunks
  USING gin (quantitative_data);`}
              </CodeBlock>
            </AccordionItem>
          </Accordion>

          {/* --- Limitations--- */}
        <motion.div variants={fadeInUp} className="space-y-8">
          <div>
            <div className="py-6">
              <h2 className="text-2xl font-semibold underline">Limittations</h2>
            </div>
            <div className="space-y-6 text-default-600 leading-relaxed">
              <div>
                <ul className="list-disc list-inside space-y-1">
                  <li>This system relies on business' in the same sector reporting on similar metrics (We hint to the A.I. model of the past metrics recorded for the sector to keep data consistent. This is how I address the  Competitor Qualitative (CQL) layer).</li>
                  <li>My prototype doesnt address the Third-Party Quantitative (TPQN) layer, however this information is readily available via api's as such it would be trivial to add. The database would have a new table that we join to the others layers via the date property and other properties when needed (e.g. the sector property in terms of news)</li>
                  <li>Similarly my prototype doesn't address 
Third-Party Qualitative (TPQL) Data (e.g. ratings changes, Macro environment, Political...) layer but this could be address via an api integration (same as above) or by creating web scraper that runs on a schedule on news websites and gather these metrics.</li>
                  <li>This relies heavily on the ai models reasoning however you will see that we have a lot of levers to play with to control this (e.g. schema we enforce the model to reply in, changing the model we choose entirely etc...)</li>
                </ul>
              </div>
            </div>
          </div>
          </motion.div>

          {/* --- Userflow --- */}
        <motion.div variants={fadeInUp} className="space-y-8">
          <div>
            <div className="py-6">
              <h2 className="text-2xl font-semibold underline">Userflow</h2>
            </div>
            <div className="space-y-6 text-default-600 leading-relaxed">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  User uploads a financial document (PDF) via the web interface
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>The document goes through 3 distinct phases (namely: extract document structure, extract all sections and finally generate sections embeddings). One point to pay attention too is we provide hint's to the ai but there is nothing stopping us from enforcing a set of options in the schema if we know the discrete categories we are looking for.</li>
                  <div className="my-4">
                    <Accordion variant="splitted" selectionMode="multiple">
                      <AccordionItem key="phases" title="Document Processing Phases">
                        <CodeBlock>
{`'use server';

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
    const storagePath = \`temp/\${file.name}\`;

    // PHASE 1: Extract document structure (1 API call)
    console.log('Phase 1: Extracting document structure...');
    const structure = await extractDocumentStructure(pdfDataUrl);

    console.log(\`Found \${structure.sections.length} sections\`);
    console.log(\`Company: \${structure.company}\`);
    console.log(\`Sector: \${structure.sector}\`);
    console.log(\`Date: \${structure.documentDate}\`);

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
}`}
                        </CodeBlock>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  <li>In the extract document structure, we seperate the pdf into semantic sections i.e. sections that make sense to us humans, normally found by new titles. We additionally assign a sector to the company (if one doesnt already exist) based on the document. we provide the ai the previous sectors we have in our database as a hint. you can find the working of this in the code below</li>
                  <div className="my-4">
                    <Accordion variant="splitted" selectionMode="multiple">
                      <AccordionItem key="structure" title="Extract Document Structure">
                        <CodeBlock>
{`/**
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
      ? \`\\n\\nExisting sectors in database: \${existingSectors.join(', ')}
If the company's sector is similar to one of these existing sectors, please use the existing sector name for consistency. Otherwise, create a new appropriate sector name.\`
      : '';

    const result = await generateObject({
      model: openai('gpt-5-mini'),
      schema: documentStructureSchema,
      temperature: 0.1,
      maxRetries: 3,
      messages: [
        {
          role: 'system',
          content: \`You are an expert document analyzer. Your task is to:
1. Extract document metadata (title, company, date, reporting period)
2. Identify the company's sector/industry (prefer existing sectors from database if similar)
3. Identify all major sections in the document
4. Determine section boundaries (start and end pages)
5. Classify each section by type

Be precise with page numbers. Focus on identifying section structure.\${sectorHint}\`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: \`Analyze this PDF and extract:
- Document title
- Company name (if mentioned)
- Sector/industry (prefer existing sectors if similar: \${existingSectors.join(', ') || 'none yet'})
- Document date (ISO format if possible)
- Reporting period (e.g., "Q4 2023", "FY 2023")
- Total page count
- All major sections with:
  * Section title
  * Section type
  * Start and end page numbers

Only identify section boundaries.\`,
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
      \`Failed to extract document structure: \${error instanceof Error ? error.message : 'Unknown error'}\`
    );
  }
}`}
                        </CodeBlock>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  <div>
                    The Schema we enforce on the ai for this operation is shown below
                  </div>
                  <div className="my-4">
                    <Accordion variant="splitted" selectionMode="multiple">
                      <AccordionItem key="schema" title="Document Structure Schema">
                        <CodeBlock>
{`export const documentStructureSchema = z.object({
  documentTitle: z.string().describe('The title of the document'),
  documentType: z.enum([
    'financial_report',
    'annual_report',
    'quarterly_report',
    'investor_presentation',
    'regulatory_filing',
    'other'
  ]).describe('The type of document'),
  company: z.string().describe('The company this document is about'),
  sector: z.string().describe('The sector/industry of the company'),
  reportingPeriod: z.string().describe('The reporting period (e.g., Q4 2023, FY 2023)'),
  documentDate: z.string().describe('The date of the document (ISO format: YYYY-MM-DD)'),
  totalPages: z.number().int().positive().describe('Total number of pages'),
  sections: z.array(sectionBoundarySchema).describe('All identified sections with their page boundaries'),
});`}
                        </CodeBlock>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  <li>The next action we do is extract all sections. This is where we extract the actual text of the section and find the metrics we are interested in. Once again we provide hints to the ai of the previous metric names we have for this sector of companies.</li>
                  <div className="my-4">
                    <Accordion variant="splitted" selectionMode="multiple">
                      <AccordionItem key="sections" title="Extract All Sections Content">
                        <CodeBlock>
{`/**
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
      ? \`\\n\\nExisting Time-Based (TB) event types for this sector: \${patterns.timeBasedEventTypes.join(', ')}
When extracting TB information, prefer using these event types if similar. Otherwise, choose the most appropriate event type from the schema.\`
      : '';

    const paqlHint = patterns.qualitativeTopics.length > 0
      ? \`\\n\\nExisting Qualitative (PAQL) topics for this sector: \${patterns.qualitativeTopics.join(', ')}
When extracting PAQL information, prefer using these topics if similar. Otherwise, choose the most appropriate topic from the schema.\`
      : '';

    const paqnHint = patterns.quantitativeMetricNames.length > 0
      ? \`\\n\\nExisting Quantitative (PAQN) metric names for this sector: \${patterns.quantitativeMetricNames.join(', ')}
When extracting PAQN data, prefer using these metric names if similar (e.g., use "revenue" instead of "total_revenue" if "revenue" exists). Use consistent naming for the same metrics.\`
      : '';

    const result = await generateObject({
      model: openai('gpt-5-mini'),
      schema: sectionContentSchema,
      temperature: 0.1,
      maxRetries: 3,
      messages: [
        {
          role: 'system',
          content: \`You are an expert at extracting and analyzing financial document content.
Your task is to:
1. Extract the full text content from the section
2. Summarize the section concisely
3. Identify and extract key financial/operational metrics that fall into these categories:
   - Time-Based (TB) Information: Future events, expected dates, timelines (e.g., "Company is expected to hold a product launch on Q4 2024")
   - Primary Asset Qualitative (PAQL) Information: Business operations, expansions, engagements (e.g., "Company recently expanded to 3 new locations")
   - Primary Asset Quantitative (PAQN) Financial Data: Numeric metrics like revenue, size, product sales figures
4. List main topics discussed

Be thorough and accurate with numbers and units. For consistency, prefer existing naming conventions when they match:\${tbHint}\${paqlHint}\${paqnHint}\`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: \`Extract detailed information from this section:
Section: "\${section.sectionTitle}" (\${section.sectionType})
Original pages: \${section.pageStart} to \${section.pageEnd}
Sector: \${sector}

Please provide:
1. Full text content from this section
2. A 2-3 sentence summary
3. Categorized information:
   - Time-Based (TB): Event types like \${patterns.timeBasedEventTypes.slice(0, 5).join(', ') || 'product_launch, earnings_date, etc.'}
   - Qualitative (PAQL): Topics like \${patterns.qualitativeTopics.slice(0, 5).join(', ') || 'expansion, partnerships, etc.'}
   - Quantitative (PAQN): Metrics like \${patterns.quantitativeMetricNames.slice(0, 5).join(', ') || 'revenue, headcount, etc.'}
4. Main topics discussed\`,
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
    console.error(\`Error extracting content for section "\${section.sectionTitle}":\`, error);
    throw new Error(
      \`Failed to extract section content: \${error instanceof Error ? error.message : 'Unknown error'}\`
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
      \`Failed to extract sections content: \${error instanceof Error ? error.message : 'Unknown error'}\`
    );
  }
}`}
                        </CodeBlock>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  <div>
                    The Schema we enforce on the ai for this operation is shown below
                  </div>
                  <div className="my-4">
                    <Accordion variant="splitted" selectionMode="multiple">
                      <AccordionItem key="sectionSchema" title="Section Content Schema">
                        <CodeBlock>
{`/**
 * Time-Based (TB) Information Schema
 * Captures forward-looking events, expected dates, timelines, and future commitments
 */
export const timeBasedInfoSchema = z.object({
  category: z.literal('TB'),
  text: z.string().describe('The original text describing this time-based information'),
  eventType: z.enum([
    'product_launch',
    'earnings_date',
    'dividend_payment',
    'contract_expiration',
    'project_completion',
    'regulatory_deadline',
    'expansion_timeline',
    'other_future_event'
  ]).describe('The type of future event or timeline'),
  expectedDate: z.string().optional().describe('Expected date or timeframe (ISO format or natural language like "Q4 2024")'),
  description: z.string().describe('Brief description of what is expected to happen'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level based on language used (confirmed vs expected vs might)'),
});

export type TimeBasedInfo = z.infer<typeof timeBasedInfoSchema>;

/**
 * Primary Asset Qualitative (PAQL) Information Schema
 * Captures non-numeric business information: operations, expansions, engagements, strategic initiatives
 */
export const qualitativeInfoSchema = z.object({
  category: z.literal('PAQL'),
  text: z.string().describe('The original text describing this qualitative information'),
  topic: z.enum([
    'business_operations',
    'expansion',
    'partnerships',
    'management_changes',
    'strategic_initiatives',
    'market_position',
    'competitive_advantage',
    'risk_factors',
    'regulatory_compliance',
    'other'
  ]).describe('The topic or theme of this qualitative information'),
  context: z.string().describe('Additional context or implications of this information'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional().describe('Overall sentiment of the information'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence in the extraction accuracy'),
});

export type QualitativeInfo = z.infer<typeof qualitativeInfoSchema>;

/**
 * Primary Asset Quantitative (PAQN) Financial Data Schema
 * Captures numeric financial metrics: revenue, expenses, size, product sales, KPIs
 */
export const quantitativeDataSchema = z.object({
  category: z.literal('PAQN'),
  metricName: z.string().describe('The name/type of the metric (e.g., revenue, expenses, headcount, product_sales)'),
  value: z.number().describe('The numerical value of the metric'),
  unit: z.string().describe('The unit of measurement (e.g., USD, EUR, percentage, count, employees)'),
  period: z.string().optional().describe('The time period this metric refers to (e.g., Q4 2023, FY 2023, 2023-12-31)'),
  changeFromPrevious: z.object({
    value: z.number(),
    unit: z.string(),
    direction: z.enum(['increase', 'decrease', 'unchanged'])
  }).optional().describe('Change from previous period if mentioned'),
  context: z.string().optional().describe('Additional context about this metric'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence in the extraction accuracy'),
});

export type QuantitativeData = z.infer<typeof quantitativeDataSchema>;

/**
 * Schema for Phase 2: Detailed content extraction for a single section
 * This processes each section in parallel with categorized extraction
 */
export const sectionContentSchema = z.object({
  content: z.string().describe('The full text content of this section'),
  summary: z.string().describe('A brief summary of this section (2-3 sentences)'),

  // Categorized extraction (TB, PAQL, PAQN)
  timeBasedInfo: z.array(timeBasedInfoSchema).describe('Time-Based (TB) information: future events, expected dates, timelines'),
  qualitativeInfo: z.array(qualitativeInfoSchema).describe('Primary Asset Qualitative (PAQL) information: business operations, expansions, strategic initiatives'),
  quantitativeData: z.array(quantitativeDataSchema).describe('Primary Asset Quantitative (PAQN) information: financial metrics, revenue, product sales, KPIs'),

  topics: z.array(z.string()).describe('Main topics or themes discussed in this section'),
});

export type SectionContent = z.infer<typeof sectionContentSchema>;`}
                        </CodeBlock>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  <li>The final action we do is generate sections embeddings, this is what allows us to allow user's to 'chat' with our documents via RAG. To do this we grab the text the ai grabbed from the sections and produce embeddings, as shown below.</li>
                  <div className="my-4">
                    <Accordion variant="splitted" selectionMode="multiple">
                      <AccordionItem key="embeddings" title="Generate Section Embeddings">
                        <CodeBlock>
{`import { embedMany } from 'ai';
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
    parts.push(\`Title: \${metadata.title}\`);
  }

  if (metadata?.summary) {
    parts.push(\`Summary: \${metadata.summary}\`);
  }

  if (metadata?.topics && metadata.topics.length > 0) {
    parts.push(\`Topics: \${metadata.topics.join(', ')}\`);
  }

  parts.push(\`Content: \${content}\`);

  return parts.join('\\n\\n');
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
      \`Failed to generate embeddings: \${error instanceof Error ? error.message : 'Unknown error'}\`
    );
  }
}`}
                        </CodeBlock>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  <li> Finally all this data is stored in the database </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">
                  User wants to get information via a chat interface
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>This is pretty simple now that we have all the necessary info in the database we simply pass the messages from the user through the following backend api which generates an embeeding based off of the users messages and compares them to the current embeeddings in our database and finds the relevant info and then <strong>streams</strong> the response back to the ui.</li>
                  <div className="my-4">
                    <Accordion variant="splitted" selectionMode="multiple">
                      <AccordionItem key="chat" title="Chat with Documents API">
                        <CodeBlock>
{`import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { retrieveContext } from '@/app/Felix/lib/ai/rag';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Check if user is authenticated for Felix route
 */
async function checkFelixAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('felix-auth');
  return authCookie?.value === 'authenticated';
}

export async function POST(req: Request) {
  try {
    // Check authentication
    const isAuthenticated = await checkFelixAuth();

    if (!isAuthenticated) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, companyId }: { messages: UIMessage[]; companyId: string } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages are required', { status: 400 });
    }

    if (!companyId) {
      return new Response('Company ID is required', { status: 400 });
    }

    // Convert UIMessages to ModelMessages
    const modelMessages = convertToModelMessages(messages);

    // Get the last user message for RAG context
    const lastUserMessage = modelMessages.filter(m => m.role === 'user').slice(-1)[0];

    if (!lastUserMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Extract text content from the message
    // Content can be a string or an array of content parts
    let queryText = '';
    if (typeof lastUserMessage.content === 'string') {
      queryText = lastUserMessage.content;
    } else if (Array.isArray(lastUserMessage.content)) {
      // Extract text from content parts: { type: 'text', text: 'heelllo' }
      queryText = lastUserMessage.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join(' ');
    }

    if (!queryText.trim()) {
      return new Response('Empty message content', { status: 400 });
    }

    // Retrieve relevant context using RAG
    const { context, numResults } = await retrieveContext(queryText, companyId, {
      limit: 5,
      similarityThreshold: 0.6,
    });
    console.log(context)
    // Build system message with context
    const systemMessage = \`You are an AI assistant helping users understand company documents and financial information.

You have access to relevant information from company documents. Use this context to answer the user's question accurately and concisely.

IMPORTANT RULES:
1. ONLY use information from the provided context
2. If the context doesn't contain relevant information, say "I don't have information about that in the available documents"
3. Always cite which document/section your information comes from
4. Be precise with numbers, dates, and metrics
5. If you're not certain about something, acknowledge the uncertainty
6. Always cite your sources in the following format

Context from documents (\${numResults} relevant sources found):
\${context}

Now answer the user's question based ONLY on the above context.\`;

    // Stream the response using Vercel's pattern
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemMessage,
      messages: modelMessages,
      temperature: 0.1,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}`}
                        </CodeBlock>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
  variants={fadeInUp}
  className="space-y-12 leading-relaxed pt-4"
>
  <div>
    <h2 className="text-2xl font-semibold underline">
      Project Plan
    </h2>
  </div>

  {/* Stage 1 */}
  <section className="space-y-4">
    <h3 className="text-xl font-semibold text-default-900">
      Stage 1: Foundations & MVP
    </h3>
    <p className="text-default-700">
      <span className="font-medium">Goal:</span> Enable upload, processing, and viewing of extracted info for a small subset of formats.
    </p>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Key Deliverables</h4>
      <ul className="list-disc list-inside text-default-600 space-y-1 ml-4">
        <li>File upload and storage working</li>
        <li>Backend service parses text from uploaded documents</li>
        <li>Basic extraction pipeline (metadata + time-based + 1–2 info layers)</li>
        <li>Internal testing only</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Roles Needed</h4>
      <ul className="list-disc list-inside text-default-600 ml-4">
        <li>Founding Engineer</li>
      </ul>
    </div>
  </section>

  {/* Stage 2 */}
  <section className="space-y-4">
    <h3 className="text-xl font-semibold text-default-900">
      Stage 2: AI Workflow Expansion
    </h3>
    <p className="text-default-700">
      <span className="font-medium">Goal:</span> Scale information extraction quality and context depth.
    </p>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Key Deliverables</h4>
      <ul className="list-disc list-inside text-default-600 space-y-1 ml-4">
        <li>Add all data “layers”</li>
        <li>Improve accuracy via prompt chaining or function-calling</li>
        <li>Expand file format support (e.g. images)</li>
        <li>Frontend remains somewhat experimental</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Roles Needed</h4>
      <ul className="list-disc list-inside text-default-600 ml-4">
        <li>Founding Engineer</li>
      </ul>
    </div>
  </section>

  {/* Stage 3 */}
  <section className="space-y-4">
    <h3 className="text-xl font-semibold text-default-900">
      Stage 3: Contextual Enrichment & Real-Time Data
    </h3>
    <p className="text-default-700">
      <span className="font-medium">Goal:</span> Connect extracted data to live market or news signals.
    </p>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Key Deliverables</h4>
      <ul className="list-disc list-inside text-default-600 space-y-1 ml-4">
        <li>Integrate external APIs (financial data providers)</li>
        <li>Real-time enrichment: attach external info to extracted timeline entities</li>
        <li>Introduce background job scheduler or queue system</li>
        <li>Start implementing roles and authorization in the backend</li>
        <li>Frontend starts taking shape and has a general theme</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Roles Needed</h4>
      <ul className="list-disc list-inside text-default-600 ml-4">
        <li>Founding Engineer</li>
        <li>Full-Stack Developer</li>
      </ul>
    </div>
  </section>

  {/* Stage 4 */}
  <section className="space-y-4">
    <h3 className="text-xl font-semibold text-default-900">
      Stage 4: UX Polish & Launch Prep
    </h3>
    <p className="text-default-700">
      <span className="font-medium">Goal:</span> Productionize and harden the system.
    </p>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Key Deliverables</h4>
      <ul className="list-disc list-inside text-default-600 space-y-1 ml-4">
        <li>Error handling, retries, user feedback in UI</li>
        <li>Fully implemented Auth, access control, and multi-project support</li>
        <li>User testing + initial beta</li>
        <li>Ui close to finished and is easy to use</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Roles Needed</h4>
      <ul className="list-disc list-inside text-default-600 ml-4">
        <li>Founding Engineer</li>
        <li>Full-Stack Developer</li>
        <li>QA / Product Tester</li>
      </ul>
    </div>
  </section>

  {/* Stage 5 */}
  <section className="space-y-4">
    <h3 className="text-xl font-semibold text-default-900">
      Stage 5:  Scaling & AI Optimization
    </h3>
    <p className="text-default-700">
      <span className="font-medium">Goal:</span> Optimize performance, monitoring, and AI reliability.
    </p>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Key Deliverables</h4>
      <ul className="list-disc list-inside text-default-600 space-y-1 ml-4">
        <li>Fine-tuned models or caching layer for repeat queries</li>
        <li>Implement full monitoring, logging, and analytics</li>
        <li>UI fully finished</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-lg font-medium text-default-800">Roles Needed</h4>
      <ul className="list-disc list-inside text-default-600 ml-4">
        <li>Founding Engineer</li>
        <li>Full-Stack Developer</li>
        <li>QA / Product Tester</li>
      </ul>
    </div>
  </section>
</motion.div>

      </motion.section>
    </div>
  );
}
