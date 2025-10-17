import { z } from 'zod';

// ============================================
// CATEGORIZED EXTRACTION SCHEMAS
// ============================================

/**
 * Time-Based (TB) Information Schema
 * Captures forward-looking events, expected dates, timelines, and future commitments
 */
export const timeBasedInfoSchema = z.object({
  category: z.literal('TB'),
  text: z.string().describe('The original text describing this time-based information'),
  eventType: z.string().describe('The type of future event or timeline'),
  expectedDate: z.string().nullable().optional().describe('Expected date or timeframe (ISO format: YYYY-MM-DD)'),
  description: z.string().describe('Brief description of what is expected to happen, max 2-3 sentences'),
});

export type TimeBasedInfo = z.infer<typeof timeBasedInfoSchema>;

/**
 * Primary Asset Qualitative (PAQL) Information Schema
 * Captures non-numeric business information: operations, expansions, engagements, strategic initiatives
 */
export const qualitativeInfoSchema = z.object({
  category: z.literal('PAQL'),
  text: z.string().describe('The original text describing this qualitative information'),
  topic: z.string().describe('The topic or theme of this qualitative information'),
  context: z.string().describe('Additional context or implications of this information, at max 2-3 sentences long'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).nullable().optional().describe('Overall sentiment of the information'),
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
  period: z.string().nullable().optional().describe('The time period this metric refers to (e.g., Q4 2023, FY 2023, 2023-12-31)'),
  context: z.string().nullable().optional().describe('Additional context about this metric, at max 2-3 sentences long'),
});

export type QuantitativeData = z.infer<typeof quantitativeDataSchema>;


/**
 * Schema for a section boundary (Phase 1 output)
 * Only identifies WHERE sections are, not the detailed content
 */
export const sectionBoundarySchema = z.object({
  sectionTitle: z.string().describe('The title or heading of this section'),
  sectionType: z.string().describe('The type/category of this section'),
  pageStart: z.number().int().positive().describe('The starting page number'),
  pageEnd: z.number().int().positive().describe('The ending page number'),
});

export type SectionBoundary = z.infer<typeof sectionBoundarySchema>;


/**
 * Schema for Phase 1: Document structure and metadata
 * This is a lightweight call that identifies sections without extracting full content
 */
export const documentStructureSchema = z.object({
  documentTitle: z.string().describe('The title of the document'),
  documentType: z.string().describe('The type of document'),
  company: z.string().describe('The company this document is about'),
  sector: z.string().describe('The sector/industry of the company'),
  reportingPeriod: z.string().describe('The reporting period (e.g., Q4 2023, FY 2023)'),
  documentDate: z.string().describe('The date of the document (ISO format: YYYY-MM-DD)'),
  totalPages: z.number().int().positive().describe('Total number of pages'),
  sections: z.array(sectionBoundarySchema).describe('All identified sections with their page boundaries'),
});

export type DocumentStructure = z.infer<typeof documentStructureSchema>;


/**
 * Schema for Phase 2: Detailed content extraction for a single section
 * This processes each section in parallel with categorized extraction
 */
export const sectionContentSchema = z.object({
  content: z.string().describe('A brief summary of this section (6-7 sentences)'),
  summary: z.string().describe('A brief summary of this section (6-7 sentences)'),

  // Categorized extraction (TB, PAQL, PAQN)
  timeBasedInfo: z.array(timeBasedInfoSchema).describe('Time-Based (TB) information: future events, expected dates, timelines'),
  qualitativeInfo: z.array(qualitativeInfoSchema).describe('Primary Asset Qualitative (PAQL) information: business operations, expansions, strategic initiatives'),
  quantitativeData: z.array(quantitativeDataSchema).describe('Primary Asset Quantitative (PAQN) information: financial metrics, revenue, product sales, KPIs'),

  topics: z.array(z.string()).describe('Main topics or themes discussed in this section'),
});

export type SectionContent = z.infer<typeof sectionContentSchema>;


/**
 * Combined section data (after both phases complete)
 */
export type ProcessedSection = SectionBoundary & SectionContent & {
  chunkIndex: number;
  embedding?: number[]; // Added after embedding generation
};
