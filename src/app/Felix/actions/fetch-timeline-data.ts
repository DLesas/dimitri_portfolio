'use server';

import { db } from '@/db';
import { companies, documents, documentChunks } from '@/db/schema';
import { eq, and, gte, lte, sql, isNotNull } from 'drizzle-orm';
import { parseFlexibleDate, getDateRange } from '../lib/utils/date-parser';
import type {
  FetchTimelineDataOptions,
  FetchTimelineDataResult,
  TimelineDocument,
  TimelineDataPoint,
  DataLayer
} from '../types/timeline';
import { checkAuth } from '../actions';

/**
 * Fetch timeline data for visualization
 * Retrieves documents and extracted data points (TB, PAQL, PAQN) with date information
 */
export async function fetchTimelineData(
  options: FetchTimelineDataOptions = {}
): Promise<FetchTimelineDataResult> {
  try {
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      return {
        success: false,
        error: 'Unauthorized: Please log in to access this feature',
      };
    }

    const { companyId, startDate, endDate, layers } = options;

    // Build where conditions for documents query
    const documentWhere = [];
    if (companyId) {
      documentWhere.push(eq(documents.companyId, companyId));
    }
    if (startDate) {
      documentWhere.push(gte(documents.documentDate, startDate.toISOString().split('T')[0]));
    }
    if (endDate) {
      documentWhere.push(lte(documents.documentDate, endDate.toISOString().split('T')[0]));
    }

    // Fetch documents with company information
    const docsQuery = db
      .select({
        docId: documents.docId,
        documentTitle: documents.documentTitle,
        documentType: documents.documentType,
        documentDate: documents.documentDate,
        companyId: companies.companyId,
        companyName: companies.name,
        sector: companies.sector,
        ticker: companies.ticker,
      })
      .from(documents)
      .innerJoin(companies, eq(documents.companyId, companies.companyId))
      .where(documentWhere.length > 0 ? and(...documentWhere) : undefined)
      .orderBy(documents.documentDate);

    const docs = await docsQuery;

    // Transform documents
    const timelineDocuments: TimelineDocument[] = docs.map(doc => ({
      docId: doc.docId,
      documentTitle: doc.documentTitle || 'Untitled Document',
      documentType: doc.documentType,
      documentDate: doc.documentDate ? new Date(doc.documentDate) : null,
      companyId: doc.companyId,
      companyName: doc.companyName,
      sector: doc.sector,
      ticker: doc.ticker,
    }));

    // Fetch document chunks with extracted data
    const chunksWhere = [];
    if (companyId) {
      chunksWhere.push(eq(documents.companyId, companyId));
    }

    const chunks = await db
      .select({
        chunkId: documentChunks.chunkId,
        docId: documentChunks.docId,
        sectionTitle: documentChunks.sectionTitle,
        timeBasedInfo: documentChunks.timeBasedInfo,
        qualitativeInfo: documentChunks.qualitativeInfo,
        quantitativeData: documentChunks.quantitativeData,
        documentTitle: documents.documentTitle,
        documentDate: documents.documentDate,
        companyId: companies.companyId,
        companyName: companies.name,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.docId, documents.docId))
      .innerJoin(companies, eq(documents.companyId, companies.companyId))
      .where(chunksWhere.length > 0 ? and(...chunksWhere) : undefined);

    // Extract data points from chunks
    const dataPoints: TimelineDataPoint[] = [];
    const includeLayers = layers && layers.length > 0 ? new Set(layers) : new Set(['TB', 'PAQL', 'PAQN', 'DOCUMENT']);

    for (const chunk of chunks) {
      // Process Time-Based Information
      if (includeLayers.has('TB') && chunk.timeBasedInfo && Array.isArray(chunk.timeBasedInfo)) {
        for (const tb of chunk.timeBasedInfo) {
          const date = parseFlexibleDate(tb.expectedDate);
          if (date) {
            dataPoints.push({
              id: `${chunk.chunkId}-tb-${dataPoints.length}`,
              date,
              layer: 'TB',
              title: tb.eventType.replace(/_/g, ' ').toUpperCase(),
              description: tb.description,
              documentId: chunk.docId,
              documentTitle: chunk.documentTitle || 'Untitled',
              chunkId: chunk.chunkId,
              sectionTitle: chunk.sectionTitle || undefined,
              companyId: chunk.companyId,
              companyName: chunk.companyName,
              timeBasedData: tb,
            });
          }
        }
      }

      // Process Qualitative Information
      if (includeLayers.has('PAQL') && chunk.qualitativeInfo && Array.isArray(chunk.qualitativeInfo)) {
        for (const qual of chunk.qualitativeInfo) {
          // Use document date as fallback for qualitative data
          const date = chunk.documentDate ? new Date(chunk.documentDate) : null;
          if (date) {
            dataPoints.push({
              id: `${chunk.chunkId}-paql-${dataPoints.length}`,
              date,
              layer: 'PAQL',
              title: qual.topic.replace(/_/g, ' ').toUpperCase(),
              description: qual.context,
              documentId: chunk.docId,
              documentTitle: chunk.documentTitle || 'Untitled',
              chunkId: chunk.chunkId,
              sectionTitle: chunk.sectionTitle || undefined,
              companyId: chunk.companyId,
              companyName: chunk.companyName,
              qualitativeData: qual,
            });
          }
        }
      }

      // Process Quantitative Data
      if (includeLayers.has('PAQN') && chunk.quantitativeData && Array.isArray(chunk.quantitativeData)) {
        for (const quant of chunk.quantitativeData) {
          const date = parseFlexibleDate(quant.period);
          if (date) {
            dataPoints.push({
              id: `${chunk.chunkId}-paqn-${dataPoints.length}`,
              date,
              layer: 'PAQN',
              title: quant.metricName.replace(/_/g, ' ').toUpperCase(),
              description: `${quant.value} ${quant.unit}${quant.context ? ` - ${quant.context}` : ''}`,
              documentId: chunk.docId,
              documentTitle: chunk.documentTitle || 'Untitled',
              chunkId: chunk.chunkId,
              sectionTitle: chunk.sectionTitle || undefined,
              companyId: chunk.companyId,
              companyName: chunk.companyName,
              quantitativeData: quant,
            });
          }
        }
      }
    }

    // Calculate date range
    const allDates = [
      ...timelineDocuments.map(d => d.documentDate),
      ...dataPoints.map(p => p.date),
    ];
    const dateRange = getDateRange(allDates);

    return {
      success: true,
      data: {
        documents: timelineDocuments,
        dataPoints,
        dateRange,
      },
    };
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch timeline data',
    };
  }
}
