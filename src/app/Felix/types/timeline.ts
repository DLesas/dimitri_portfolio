import type { TimeBasedInfo, QualitativeInfo, QuantitativeData } from '../lib/ai/schemas';

export type DataLayer = 'TB' | 'PAQL' | 'PAQN' | 'DOCUMENT';

export interface TimelineDocument {
  docId: string;
  documentTitle: string;
  documentType: string | null;
  documentDate: Date | null;
  companyId: string;
  companyName: string;
  sector: string | null;
  ticker: string | null;
}

export interface TimelineDataPoint {
  id: string;
  date: Date;
  layer: DataLayer;
  title: string;
  description?: string;

  // Source information
  documentId: string;
  documentTitle: string;
  chunkId?: string;
  sectionTitle?: string;

  // Company information
  companyId: string;
  companyName: string;

  // Layer-specific data
  timeBasedData?: TimeBasedInfo;
  qualitativeData?: QualitativeInfo;
  quantitativeData?: QuantitativeData;
}

export interface TimelineChartData {
  date: Date;
  timestamp: number;
  layer: DataLayer;
  title: string;
  description?: string;
  id: string;

  // For Recharts
  x: number;
  y: number;
}

export interface TimelineFilters {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  layers: Set<DataLayer>;
}

export interface TimelineData {
  documents: TimelineDocument[];
  dataPoints: TimelineDataPoint[];
  dateRange: {
    min: Date | null;
    max: Date | null;
  };
}

export interface FetchTimelineDataOptions {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  layers?: DataLayer[];
}

export interface FetchTimelineDataResult {
  success: boolean;
  data?: TimelineData;
  error?: string;
}
