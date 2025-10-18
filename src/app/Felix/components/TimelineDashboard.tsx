'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, Chip, Select, SelectItem, Button, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Divider } from '@heroui/react';
import TimelineChart from './TimelineChart';
import { fetchTimelineData } from '../actions/fetch-timeline-data';
import { fetchAvailableCompanies } from '../actions/fetch-companies';
import type { TimelineData, TimelineDataPoint, DataLayer } from '../types/timeline';
import { formatDate, formatDateRange } from '../lib/utils/date-parser';
import { useTheme } from '@/contexts/ThemeContext';

type Company = {
  companyId: string;
  name: string;
  sector: string | null;
  ticker: string | null;
};

interface TimelineDashboardProps {
  defaultCompanyId?: string;
  onCompanyChange?: (companyId: string) => void;
  className?: string;
}

const LAYER_CONFIG: Record<DataLayer, { name: string; color: string; description: string }> = {
  TB: {
    name: 'Time-Based',
    color: 'primary',
    description: 'Future events, timelines, expected dates',
  },
  PAQL: {
    name: 'Qualitative',
    color: 'success',
    description: 'Business operations, expansions, partnerships',
  },
  PAQN: {
    name: 'Quantitative',
    color: 'warning',
    description: 'Financial metrics, revenue, KPIs',
  },
  DOCUMENT: {
    name: 'Documents',
    color: 'secondary',
    description: 'Document placement on timeline',
  },
};

export default function TimelineDashboard({ defaultCompanyId, onCompanyChange, className }: TimelineDashboardProps) {
  const { colors } = useTheme();

  // Dynamic layer colors based on theme - matches TimelineChart
  const LAYER_COLORS = useMemo(() => ({
    TB: colors.primary.shades[500].hex,
    PAQL: colors.accent.shades[500].hex,
    PAQN: colors.secondary.shades[600].hex,
    DOCUMENT: colors.secondary.shades[400].hex,
  }), [colors]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(defaultCompanyId || '');
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<DataLayer>>(new Set(['TB', 'PAQL', 'PAQN', 'DOCUMENT']));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<TimelineDataPoint | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected company if prop changes
  useEffect(() => {
    if (defaultCompanyId && defaultCompanyId !== selectedCompanyId) {
      setSelectedCompanyId(defaultCompanyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCompanyId]);

  // Load timeline data when company or layers change
  useEffect(() => {
    if (selectedCompanyId) {
      loadTimelineData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, activeLayers]);

  async function loadCompanies() {
    try {
      const result = await fetchAvailableCompanies();
      if (result.success) {
        setCompanies(result.companies);
        if (!selectedCompanyId && result.companies.length > 0) {
          setSelectedCompanyId(result.companies[0].companyId);
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  }

  async function loadTimelineData() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchTimelineData({
        companyId: selectedCompanyId,
        layers: Array.from(activeLayers),
      });

      if (result.success && result.data) {
        setTimelineData(result.data);
      } else {
        setError(result.error || 'Failed to load timeline data');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  const handleCompanyChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return;
    const selectedKey = Array.from(keys)[0] as string;
    setSelectedCompanyId(selectedKey);
    if (onCompanyChange) {
      onCompanyChange(selectedKey);
    }
  };

  const toggleLayer = (layer: DataLayer) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const handlePointClick = (point: TimelineDataPoint) => {
    setSelectedPoint(point);
    setIsDetailModalOpen(true);
  };

  const renderDetailModal = () => {
    if (!selectedPoint) return null;

    const layerConfig = LAYER_CONFIG[selectedPoint.layer];

    return (
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Chip
                    color={layerConfig.color as 'primary' | 'success' | 'warning' | 'secondary'}
                    size="sm"
                  >
                    {layerConfig.name}
                  </Chip>
                  <span className="text-sm text-default-500">{formatDate(selectedPoint.date)}</span>
                </div>
                <h3 className="text-xl font-semibold mt-2">{selectedPoint.title}</h3>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {selectedPoint.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-default-600 mb-1">Description</h4>
                      <p className="text-default-700">{selectedPoint.description}</p>
                    </div>
                  )}

                  <Divider />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-default-600 mb-1">Company</h4>
                      <p className="text-default-700">{selectedPoint.companyName}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-default-600 mb-1">Document</h4>
                      <p className="text-default-700 text-sm">{selectedPoint.documentTitle}</p>
                    </div>
                    {selectedPoint.sectionTitle && (
                      <div className="col-span-2">
                        <h4 className="text-sm font-semibold text-default-600 mb-1">Section</h4>
                        <p className="text-default-700 text-sm">{selectedPoint.sectionTitle}</p>
                      </div>
                    )}
                  </div>

                  {/* Layer-specific details */}
                  {selectedPoint.timeBasedData && (
                    <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg border border-primary-200 dark:border-primary-800">
                      <h4 className="text-sm font-semibold text-primary-700 dark:text-primary-400 mb-2">Time-Based Details</h4>
                      <div className="space-y-1 text-sm text-primary-900 dark:text-primary-100">
                        <p><span className="font-medium">Event Type:</span> {selectedPoint.timeBasedData.eventType}</p>
                        {selectedPoint.timeBasedData.text && (
                          <p className="text-xs text-primary-700 dark:text-primary-300 mt-2 italic">&ldquo;{selectedPoint.timeBasedData.text}&rdquo;</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedPoint.qualitativeData && (
                    <div className="bg-success-50 dark:bg-success-900/20 p-3 rounded-lg border border-success-200 dark:border-success-800">
                      <h4 className="text-sm font-semibold text-success-700 dark:text-success-400 mb-2">Qualitative Details</h4>
                      <div className="space-y-1 text-sm text-success-900 dark:text-success-100">
                        <p><span className="font-medium">Topic:</span> {selectedPoint.qualitativeData.topic}</p>
                        {selectedPoint.qualitativeData.sentiment && (
                          <p><span className="font-medium">Sentiment:</span> {selectedPoint.qualitativeData.sentiment}</p>
                        )}
                        {selectedPoint.qualitativeData.text && (
                          <p className="text-xs text-success-700 dark:text-success-300 mt-2 italic">&ldquo;{selectedPoint.qualitativeData.text}&rdquo;</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedPoint.quantitativeData && (
                    <div className="bg-warning-50 dark:bg-warning-900/20 p-3 rounded-lg border border-warning-200 dark:border-warning-800">
                      <h4 className="text-sm font-semibold text-warning-700 dark:text-warning-400 mb-2">Quantitative Details</h4>
                      <div className="space-y-1 text-sm text-warning-900 dark:text-warning-100">
                        <p><span className="font-medium">Metric:</span> {selectedPoint.quantitativeData.metricName}</p>
                        <p><span className="font-medium">Value:</span> {selectedPoint.quantitativeData.value} {selectedPoint.quantitativeData.unit}</p>
                        {selectedPoint.quantitativeData.period && (
                          <p><span className="font-medium">Period:</span> {selectedPoint.quantitativeData.period}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Timeline Dashboard</h2>
                <p className="text-sm text-default-500 mt-1">
                  Visualize document data across time and layers
                </p>
              </div>
              {timelineData && (
                <Chip color="default" variant="flat">
                  {timelineData.dataPoints.length} data points
                </Chip>
              )}
            </div>

            {/* Company Selector */}
            <div className="flex items-center gap-4">
              <Select
                label="Company"
                size="sm"
                className="max-w-xs"
                selectedKeys={new Set([selectedCompanyId])}
                onSelectionChange={handleCompanyChange}
                placeholder="Select a company"
                isDisabled={companies.length === 0}
              >
                {companies.map((company) => (
                  <SelectItem key={company.companyId} textValue={company.name}>
                    {company.name}{company.ticker ? ` (${company.ticker})` : ''}
                  </SelectItem>
                ))}
              </Select>

              {timelineData && timelineData.dateRange.min && timelineData.dateRange.max && (
                <Chip color="default" variant="flat" size="sm">
                  {formatDateRange(timelineData.dateRange.min, timelineData.dateRange.max)}
                </Chip>
              )}
            </div>

            {/* Layer Filters */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-default-600">Data Layers</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(LAYER_CONFIG) as DataLayer[]).map((layer) => {
                  const config = LAYER_CONFIG[layer];
                  const isActive = activeLayers.has(layer);
                  return (
                    <Chip
                      key={layer}
                      variant={isActive ? 'solid' : 'bordered'}
                      className="cursor-pointer"
                      style={isActive ? { backgroundColor: LAYER_COLORS[layer], color: 'white' } : undefined}
                      onClick={() => toggleLayer(layer)}
                    >
                      {config.name}
                    </Chip>
                  );
                })}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline Chart */}
      {isLoading ? (
        <Card className="h-96">
          <div className="h-full flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        </Card>
      ) : error ? (
        <Card className="h-96">
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center text-danger">
              <p className="font-medium">Error loading timeline</p>
              <p className="text-sm mt-2">{error}</p>
              <Button
                color="primary"
                size="sm"
                className="mt-4"
                onPress={loadTimelineData}
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <TimelineChart
          dataPoints={timelineData?.dataPoints || []}
          onPointClick={handlePointClick}
          className="h-96"
        />
      )}

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
}
