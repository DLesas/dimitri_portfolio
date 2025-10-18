'use client';

import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, Chip } from '@heroui/react';
import type { TimelineDataPoint, DataLayer } from '../types/timeline';
import { formatDate } from '../lib/utils/date-parser';
import { useTheme } from '@/contexts/ThemeContext';

interface TimelineChartProps {
  dataPoints: TimelineDataPoint[];
  onPointClick?: (point: TimelineDataPoint) => void;
  className?: string;
}

const LAYER_NAMES: Record<DataLayer, string> = {
  TB: 'Time-Based',
  PAQL: 'Qualitative',
  PAQN: 'Quantitative',
  DOCUMENT: 'Document',
};

interface ChartDataPoint {
  timestamp: number;
  date: Date;
  layer: DataLayer;
  title: string;
  description?: string;
  id: string;
  y: number;
  originalData: TimelineDataPoint;
}

export default function TimelineChart({ dataPoints, onPointClick, className }: TimelineChartProps) {
  const { colors } = useTheme();

  // Dynamic layer colors based on theme
  const LAYER_COLORS = useMemo(() => ({
    TB: colors.primary.shades[500].hex,
    PAQL: colors.accent.shades[500].hex,
    PAQN: colors.secondary.shades[600].hex,
    DOCUMENT: colors.secondary.shades[400].hex,
  }), [colors]);

  // Transform data for Recharts
  const chartData = useMemo(() => {
    // Map layers to Y positions
    const layerYPositions: Record<DataLayer, number> = {
      DOCUMENT: 4,
      TB: 3,
      PAQL: 2,
      PAQN: 1,
    };

    return dataPoints.map(point => ({
      timestamp: point.date.getTime(),
      date: point.date,
      layer: point.layer,
      title: point.title,
      description: point.description,
      id: point.id,
      y: layerYPositions[point.layer],
      originalData: point,
    }));
  }, [dataPoints]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ChartDataPoint }[] }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <Card className="p-3 shadow-lg max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Chip
                size="sm"
                style={{ backgroundColor: LAYER_COLORS[data.layer] }}
                className="text-white"
              >
                {LAYER_NAMES[data.layer]}
              </Chip>
              <span className="text-xs text-default-500">{formatDate(data.date)}</span>
            </div>
            <h4 className="font-semibold text-sm">{data.title}</h4>
            {data.description && (
              <p className="text-xs text-default-600 line-clamp-3">{data.description}</p>
            )}
            <p className="text-xs text-default-400">Click for details</p>
          </div>
        </Card>
      );
    }
    return null;
  };

  // Format X axis (dates)
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    return formatDate(date);
  };

  // Format Y axis (layers)
  const formatYAxis = (value: number) => {
    const layerMap: Record<number, string> = {
      1: 'PAQN',
      2: 'PAQL',
      3: 'TB',
      4: 'DOC',
    };
    return layerMap[value] || '';
  };

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center text-default-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-16 h-16 mx-auto mb-4 opacity-50"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            <p className="font-medium">No timeline data</p>
            <p className="text-sm mt-1">Upload documents to see data on the timeline</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
        >
          <XAxis
            type="number"
            dataKey="timestamp"
            name="Date"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxis}
            stroke="#888"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Layer"
            domain={[0.5, 4.5]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={formatYAxis}
            stroke="#888"
            style={{ fontSize: '12px' }}
          />
          <ZAxis range={[100, 100]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter
            data={chartData}
            onClick={(data: ChartDataPoint) => {
              if (onPointClick) {
                onPointClick(data.originalData);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={LAYER_COLORS[entry.layer]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}
