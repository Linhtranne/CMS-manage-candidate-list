export type ReportFilterKey = 'from' | 'to' | 'teamId' | 'ownerId' | 'clientId' | 'orderId' | 'industryId' | 'sourceId' | 'timeZone';

export type ReportFilters = Partial<Record<ReportFilterKey, string>>;

export function normalizeReportFilters(searchParams: URLSearchParams | string | undefined): ReportFilters {
  const params = typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams;
  if (!params) return {};
  const keys: ReportFilterKey[] = ['from', 'to', 'teamId', 'ownerId', 'clientId', 'orderId', 'industryId', 'sourceId', 'timeZone'];
  return Object.fromEntries(keys.flatMap((key) => {
    const value = params.get(key)?.trim();
    return value ? [[key, value]] : [];
  })) as ReportFilters;
}

export function detectReportTimeZone(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!value) return undefined;
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return undefined;
  }
}

export function initialReportFilters(searchParams: URLSearchParams | string | undefined): ReportFilters {
  const filters = normalizeReportFilters(searchParams);
  if (filters.timeZone) return filters;
  const detected = detectReportTimeZone();
  return detected ? { ...filters, timeZone: detected } : filters;
}

export function reportFiltersToSearchParams(filters: ReportFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params;
}
