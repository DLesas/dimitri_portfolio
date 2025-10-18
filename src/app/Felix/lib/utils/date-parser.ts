/**
 * Parse various date formats into a Date object
 * Handles:
 * - ISO dates (2024-01-15)
 * - Quarter formats (Q1 2024, Q4 2023)
 * - Year formats (FY 2024, 2024)
 * - Month-Year formats (Jan 2024, January 2024)
 * - Natural language (late 2024, early 2025)
 */
export function parseFlexibleDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  const normalized = dateStr.trim();

  // Try ISO date format first (YYYY-MM-DD)
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(normalized);
  }

  // Try full ISO datetime
  if (normalized.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(normalized);
  }

  // Quarter format (Q1 2024, Q4 2023)
  const quarterMatch = normalized.match(/^Q([1-4])\s+(\d{4})$/i);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = parseInt(quarterMatch[2]);
    // Map quarters to months: Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct
    const month = (quarter - 1) * 3;
    return new Date(year, month, 1);
  }

  // Fiscal Year (FY 2024, FY2024)
  const fyMatch = normalized.match(/^FY\s*(\d{4})$/i);
  if (fyMatch) {
    const year = parseInt(fyMatch[1]);
    // Assume fiscal year starts in January (can be adjusted)
    return new Date(year, 0, 1);
  }

  // Just year (2024)
  const yearMatch = normalized.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    return new Date(year, 0, 1);
  }

  // Month Year format (Jan 2024, January 2024)
  const monthYearMatch = normalized.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const monthStr = monthYearMatch[1];
    const year = parseInt(monthYearMatch[2]);
    const monthMap: { [key: string]: number } = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    };
    const month = monthMap[monthStr.toLowerCase()];
    if (month !== undefined) {
      return new Date(year, month, 1);
    }
  }

  // Natural language approximations
  const lateMatch = normalized.match(/^late\s+(\d{4})$/i);
  if (lateMatch) {
    const year = parseInt(lateMatch[1]);
    return new Date(year, 10, 1); // November
  }

  const earlyMatch = normalized.match(/^early\s+(\d{4})$/i);
  if (earlyMatch) {
    const year = parseInt(earlyMatch[1]);
    return new Date(year, 1, 1); // February
  }

  const midMatch = normalized.match(/^mid\s+(\d{4})$/i);
  if (midMatch) {
    const year = parseInt(midMatch[1]);
    return new Date(year, 6, 1); // July
  }

  // Fall back to JavaScript's Date parser
  try {
    const date = new Date(normalized);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';

  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();

  return `${month} ${year}`;
}

/**
 * Format a date range
 */
export function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return 'No dates';
  if (!start) return `Until ${formatDate(end)}`;
  if (!end) return `From ${formatDate(start)}`;

  return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Get the earliest and latest dates from an array
 */
export function getDateRange(dates: (Date | null)[]): { min: Date | null; max: Date | null } {
  const validDates = dates.filter((d): d is Date => d !== null);

  if (validDates.length === 0) {
    return { min: null, max: null };
  }

  const timestamps = validDates.map(d => d.getTime());
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);

  return {
    min: new Date(minTimestamp),
    max: new Date(maxTimestamp),
  };
}
